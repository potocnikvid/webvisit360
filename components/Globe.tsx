"use client";

import { useEffect, useRef } from "react";
import type { GlobeInstance } from "globe.gl";
import type { PlaceType, Tour } from "@/lib/types";
import { isDimmed, labelEligible } from "@/lib/markers";
import { FIRE_SIZE, dotLook, fireHeat, importance, labelAltitude, nearest, pinIds, standing } from "@/lib/dots";
import { GRADED_MAX_LEVEL, GRADE_GLSL, imageryGrade, tileLevel } from "@/lib/imagery";
import { createDots } from "./globeDots";
import { LabelTimeline, chooseLabels, labelBudget, type Candidate } from "@/lib/labels";
import { arcPov, type Pov } from "@/lib/flight";

type Feature = {
  type: "Feature";
  properties: { k: "c" | "m"; tour: string | null; n?: string };
  geometry: unknown;
};

export type Focus = {
  lat: number;
  lng: number;
  altitude: number;
  ms?: number;
  /** Keep the point clear of the side panel / bottom sheet. */
  panel?: boolean;
  /** Frame the point for the full-screen About story: up and to the right of the text. */
  story?: boolean;
  /** Fly in an arc that rises to this altitude on the way (pull back, then dive). */
  arc?: number;
  key: number;
};

/** What the page can ask the globe once it's ready. */
export type GlobeApi = {
  pov: () => Pov;
  /** Slide the ground with the story's scroll (px), so its text reads as written on the map. */
  scrollGround: (px: number) => void;
};

/** Where the studio pin sits on screen during the story (share of width / height). */
const storyPin = (w: number) => (w <= 760 ? { x: 0.5, y: 0.17 } : { x: 0.74, y: 0.3 });
/** Rough visible half-height in degrees for globe.gl's default 50° fov. */
const halfHeightDeg = (altitude: number) => 26.8 * altitude;

export type Look = "satellite" | "illustrated";

type Props = {
  tours: Tour[];
  geo: Feature[];
  selectedId: string | null;
  focus: Focus | null;
  paused: boolean;
  onSelect: (id: string) => void;
  onReady?: (api: GlobeApi) => void;
  /** The visitor started dragging, pinching or zooming the map themselves. */
  onExplore?: () => void;
  /** Where the opening fly-in ends (defaults to all of Slovenia). */
  initialView?: { lat: number; lng: number; altitude: number };
  /** Places to ring as "near you". */
  highlightIds?: string[];
  /** The visitor's own position ("You are here"); approximate ones are drawn wider. */
  you?: { lat: number; lng: number; precise: boolean; label: string } | null;
  /** The type chosen in the chips: its places get big dots and names, the rest small dots. */
  focusType?: PlaceType | "all";
  /** No label placement while the page hides the pins (story flights): it costs a layout read per frame. */
  quiet?: boolean;
  /** Play the opening fly-in (off when the page drives the first flight itself). */
  intro?: boolean;
  /** The studio pin shown during the About story. */
  studio?: { lat: number; lng: number; label: string } | null;
  /** Map style chosen with the switch at the top. */
  look: Look;
};

type You = NonNullable<Props["you"]>;
const YOU_ID = "__you";
const STUDIO_ID = "__studio";

const SLOVENIA = { lat: 46.12, lng: 14.82, altitude: 0.085 };
const START = { lat: 38, lng: 2, altitude: 2.4 };

// Border layers overlap between these altitudes so neither pops in or out at once:
// countries are drawn above COUNTRY_MIN, municipalities below MUNI_MAX.
const COUNTRY_MIN = 0.3;
const MUNI_MAX = 0.9;
// Illustrated look: dotted continents above this altitude, flat land shapes below.
const ILLUS_DOTS_ALT = 0.35;
/** On-screen radius (px) of a place's dot, matching the sizes in globals.css (and lib/dots). */
const dotRadius = (t: Tour, focus: PlaceType | "all") => {
  if (isDimmed(t, focus)) return 2;
  if (focus !== "all") return t.kind === "obcina" ? 8 : 6;
  return t.kind === "obcina" ? 7 : t.kind === "business" ? 3.5 : 3;
};

/** Map label: municipality without "Občina", business up to its first separator, max ~30 chars. */
const shortLabel = (t: Tour) => {
  if (t.kind === "obcina") return t.name.replace(/^Občina /, "");
  let s = t.name.split(/\s+[|–-]\s+|,\s+/)[0].trim();
  if (s.length > 30) s = s.slice(0, 29).trimEnd() + "…";
  return s;
};


const ESRI = (x: number, y: number, l: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`;

type LookStyle = {
  tiles: ((x: number, y: number, l: number) => string) | null;
  maxLevel: number;
  /** Closest zoom, as altitude in globe radii. */
  minAlt: number;
  ambient: [string, number];
  sun: [string, number];
  atmosphere: [string, number];
};

const LOOKS: Record<Look, LookStyle> = {
  // Photographic, "blue hour over the Alps".
  satellite: { tiles: ESRI, maxLevel: 19, minAlt: 0.000025, ambient: ["#7f97d8", 2.1], sun: ["#ffc98a", 1.1], atmosphere: ["#6d8de0", 0.16] },
  // Illustrated: no imagery; dotted continents and flat municipality shapes.
  illustrated: { tiles: null, maxLevel: 0, minAlt: 0.0008, ambient: ["#ffffff", 2.4], sun: ["#ffffff", 0.5], atmosphere: ["#4f74d9", 0.22] },
};

export default function Globe({ tours, geo, selectedId, focus, paused, onSelect, onReady, onExplore, initialView, highlightIds, you, focusType = "all", studio, intro = true, quiet = false , look }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const globe = useRef<GlobeInstance | null>(null);
  const markers = useRef(new Map<string, HTMLElement>());
  /** Each place's moment in the opening wave of pins (ms), once it has started. */
  const popDelay = useRef(new Map<string, number>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onExploreRef = useRef(onExplore);
  onExploreRef.current = onExplore;
  const toursRef = useRef(tours);
  const labelsRef = useRef<() => void>(() => {});
  const nearRef = useRef(new Set<string>());
  nearRef.current = new Set(highlightIds);
  const focusRef = useRef(focusType);
  focusRef.current = focusType;
  const youRef = useRef(you);
  youRef.current = you;
  const youEl = useRef<HTMLElement | null>(null);
  const quietRef = useRef(quiet);
  quietRef.current = quiet;
  const studioRef = useRef(studio);
  studioRef.current = studio;
  const studioEl = useRef<HTMLElement | null>(null);
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  /** Keep drawing for a while, or stop now (see "Render only while something changes"). */
  const wakeRef = useRef<(ms?: number) => void>(() => {});
  const sleepRef = useRef<() => void>(() => {});
  /** The places changed (list, type chosen, or the visitor/studio pins): redraw dots and pins. */
  const placesRef = useRef<{ reload: () => void; restyle: () => void; fade: (to: number) => void }>({
    reload: () => {},
    restyle: () => {},
    fade: () => {},
  });
  /** Where the story's flight landed (the ground scrolls from here), and whether we're flying. */
  const storyBase = useRef<Pov | null>(null);
  const flying = useRef(false);

  /** The studio pin: a pulsing beacon with its label always shown. */
  const studioMarker = (label: string) => {
    let m = studioEl.current;
    if (!m) {
      m = document.createElement("div");
      m.className = "studio";
      m.innerHTML = `<span class="studio__ring"></span><span class="studio__dot"></span><span class="studio__label"></span>`;
      studioEl.current = m;
    }
    m.querySelector(".studio__label")!.textContent = label;
    return m;
  };

  /** The visitor's marker: not interactive, label always shown. */
  const youMarker = (me: You) => {
    let m = youEl.current;
    if (!m) {
      m = document.createElement("div");
      m.innerHTML = `<span class="you__halo"></span><span class="you__dot"></span><span class="you__label"></span>`;
      youEl.current = m;
    }
    m.className = `you ${me.precise ? "" : "you--approx"}`;
    m.querySelector(".you__label")!.textContent = me.label;
    return m;
  };

  /** A place's HTML pin, made once and reused whenever the place needs a pin again. */
  const markerEl = (t: Tour) => {
    let m = markers.current.get(t.id);
    if (!m) {
      const b = document.createElement("button");
      b.type = "button";
      m = b;
      m.className = `marker marker--${t.kind}`;
      m.setAttribute("aria-label", t.name);
      m.innerHTML = `<span class="marker__dot"></span><span class="marker__label"></span>`;
      m.querySelector(".marker__label")!.textContent = shortLabel(t);
      m.title = t.name;
      m.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current(t.id);
      });
      // Stop the globe's drag controls from swallowing the click.
      m.addEventListener("pointerdown", (e) => e.stopPropagation());
      m.classList.toggle("is-near", nearRef.current.has(t.id));
      m.classList.toggle("is-dim", isDimmed(t, focusRef.current));
      m.classList.toggle("is-focus", focusRef.current !== "all" && t.type === focusRef.current);
      m.classList.toggle("is-selected", t.id === selectedRef.current);
      const delay = popDelay.current.get(t.id);
      if (delay != null) m.style.setProperty("--pop-delay", `${delay}ms`);
      markers.current.set(t.id, m);
    }
    return m;
  };
  const lookRef = useRef<Look>(look);
  const applyLookRef = useRef<(l: Look) => void>(() => {});
  toursRef.current = tours;

  // ---- create the globe once -------------------------------------------------
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const [{ default: GlobeGL }, THREE] = await Promise.all([import("globe.gl"), import("three")]);
      if (disposed || !host.current) return;
      const el = host.current;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const g = new GlobeGL(el, { animateIn: false })
        .width(el.clientWidth)
        .height(el.clientHeight)
        .backgroundColor("rgba(0,0,0,0)")
        .showAtmosphere(true)
        .pointOfView(START, 0);

      // Phones and tablets: no hover, and a GPU that pays for every pixel. 1.5× keeps the
      // imagery crisp (pins and text are HTML, so they stay sharp at any ratio).
      const touch = !window.matchMedia("(hover: hover)").matches;
      if (touch) g.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

      // Lighting is restyled per look (see LOOKS); the sun sits low for a dusk feel.
      const ambient = new THREE.AmbientLight();
      const sun = new THREE.DirectionalLight();
      sun.position.set(-1, 0.35, 0.6);
      g.lights([ambient, sun]);
      const globeMat = g.globeMaterial() as import("three").MeshPhongMaterial;

      // ---- polygons: country outlines far out, municipality borders up close
      const tourCap = new THREE.MeshBasicMaterial({
        color: "#f6a93b",
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
      const tourCapHover = tourCap.clone();
      tourCapHover.opacity = 0.42;
      // Areas without a tour have no fill at all: not drawn, but still there for the pointer.
      const noCap = new THREE.MeshBasicMaterial({ visible: false });
      // Illustrated look: flat, opaque municipality shapes.
      const flatCap = new THREE.MeshBasicMaterial({ color: "#2c4592" });
      const flatTour = new THREE.MeshBasicMaterial({ color: "#c8862f" });
      const flatTourHover = new THREE.MeshBasicMaterial({ color: "#f6a93b" });
      const flatLand = new THREE.MeshBasicMaterial({ color: "#22397f" });
      const countries = geo.filter((f) => f.properties.k === "c");
      const munis = geo.filter((f) => f.properties.k === "m");
      let hovered: Feature | null = null;
      let dotPickedAt = 0;
      let showingCountries: boolean | null = null;

      // Keep borders hugging the ground (~40-50 m) so they don't float when zoomed in close.
      g.polygonAltitude((f) => {
        const p = (f as Feature).properties;
        return p.tour ? 0.000008 : p.k === "m" ? 0.000006 : 0.000003;
      })
        .polygonCapMaterial((f) => {
          const illus = lookRef.current === "illustrated";
          if (illus && (f as Feature).properties.k === "c") return flatLand;
          const flat = illus && (f as Feature).properties.k === "m";
          if ((f as Feature).properties.tour) return f === hovered ? (flat ? flatTourHover : tourCapHover) : flat ? flatTour : tourCap;
          return flat ? flatCap : noCap;
        })
        // No side walls: they'd be invisible anyway, and three.js redraws a transparent
        // double-sided material twice per frame, re-checking its shader both times.
        .polygonSideColor(() => null as unknown as string)
        .polygonStrokeColor((f) => {
          const p = (f as Feature).properties;
          if (p.k === "c") return lookRef.current === "illustrated" ? "rgba(147,163,196,0.4)" : "rgba(214,224,245,0.32)";
          if (lookRef.current === "illustrated") return p.tour ? "#ffd27a" : "rgba(8,18,54,0.7)";
          return p.tour ? "rgba(255,210,122,0.9)" : "rgba(214,224,245,0.28)";
        })
        .polygonsTransitionDuration(0)
        // Only the filled areas should react to the pointer. globe.gl's default line
        // threshold (0.2 units ≈ 13 km) let border lines - often a neighbour's - catch
        // the pointer from far away once zoomed in.
        .lineHoverPrecision(0)
        .onPolygonHover((f) => {
          if (touch) return; // a tap would leave its area lit up
          const next = f && (f as Feature).properties.tour ? (f as Feature) : null;
          if (next === hovered) return;
          hovered = next;
          el.style.cursor = next ? "pointer" : "";
          g.polygonCapMaterial(g.polygonCapMaterial());
        })
        .onPolygonClick((f) => {
          // A dot inside the area was tapped: that place wins over its municipality.
          if (performance.now() - dotPickedAt < 400) return;
          const id = (f as Feature).properties.tour;
          if (id) onSelectRef.current(id);
        });

      // three-globe draws every border line 1e-4 globe radii (~640 m) above its filled area.
      // Zoomed in close, that parallax moves the lines hundreds of metres off the areas that
      // react to the pointer, so hover/click seemed to pick a neighbour. Before each frame,
      // pull the lines back down to just above their fill.
      const STROKE_LIFT = 0.000002; // ~13 m
      let polygonLayer: import("three").Object3D | null = null;
      g.scene().onBeforeRender = () => {
        if (!polygonLayer)
          g.scene().traverse((o) => {
            if (!polygonLayer && (o as { __globeObjType?: string }).__globeObjType === "polygon") polygonLayer = o.parent;
          });
        for (const o of polygonLayer?.children ?? []) {
          const [fill, stroke] = o.children;
          if (!stroke) continue;
          const s = fill.scale.x + STROKE_LIFT;
          if (stroke.scale.x !== s) {
            stroke.scale.setScalar(s);
            stroke.updateMatrixWorld();
          }
        }
      };

      const countriesOutsideSlovenia = countries.filter((f) => f.properties.n !== "Slovenia");
      // Land as dots for the illustrated look: ~11k precomputed points (public/data/land-dots.json,
      // built by redesign/data/scripts/build_dots.mjs) drawn as ONE THREE.Points object - one draw
      // call and one vertex per dot. (globe.gl's hexPolygons layer built ~250k triangles in ~180
      // meshes and froze the page for over a second while computing them.)
      let dots: import("three").Points | null = null;
      // Dots sit ~1.7 globe units (~110 km) apart. Keep each about half that spacing on screen,
      // so the continents read as a solid dot pattern at every distance, like a printed map.
      const dotSize = (alt: number) => {
        const unitsToPx = el.clientHeight / 2 / (Math.max(alt, 0.01) * R * Math.tan((25 * Math.PI) / 180));
        return Math.min(12, Math.max(2.5, 0.55 * 1.7 * unitsToPx)) * g.renderer().getPixelRatio();
      };
      let dotsLoading = false;
      const showDots = (on: boolean) => {
        if (dots) dots.visible = on;
        if (!on || dots || dotsLoading) return;
        dotsLoading = true;
        fetch("/data/land-dots.json")
          .then((r) => r.json() as Promise<number[]>)
          .then((flat) => {
            if (disposed) return;
            const pos = new Float32Array((flat.length / 2) * 3);
            for (let i = 0, j = 0; i < flat.length; i += 2, j += 3) {
              const c = g.getCoords(flat[i] / 100, flat[i + 1] / 100, 0.0004);
              pos[j] = c.x;
              pos[j + 1] = c.y;
              pos[j + 2] = c.z;
            }
            const geom = new THREE.BufferGeometry();
            geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
            // Round dot sprite.
            const cv = document.createElement("canvas");
            cv.width = cv.height = 32;
            const cx = cv.getContext("2d")!;
            cx.fillStyle = "#fff";
            cx.beginPath();
            cx.arc(16, 16, 14, 0, Math.PI * 2);
            cx.fill();
            const mat = new THREE.PointsMaterial({
              color: "#93a3c4",
              size: dotSize(g.pointOfView().altitude),
              sizeAttenuation: false,
              map: new THREE.CanvasTexture(cv),
              transparent: true,
              opacity: 0.6,
              alphaTest: 0.3,
              depthWrite: false,
            });
            dots = new THREE.Points(geom, mat);
            dots.visible = lookRef.current === "illustrated" && borderMode === "dots";
            g.scene().add(dots);
            wakeRef.current();
          })
          .catch(() => {
            dotsLoading = false;
          });
      };
      // Up close the illustrated look draws neighbouring countries as land; only the ones
      // around Slovenia can be on screen then, so skip the rest of the world (fewer draw calls).
      const nearCountries = countriesOutsideSlovenia.filter((f) => {
        const c = JSON.stringify(f.geometry).match(/-?\d+\.?\d*/g)!.map(Number);
        let near = false;
        for (let i = 0; i < c.length - 1 && !near; i += 2) near = c[i] > -5 && c[i] < 35 && c[i + 1] > 30 && c[i + 1] < 60;
        return near;
      });

      let borderMode = "";
      const applyZoom = (alt: number) => {
        // Illustrated: dotted continents from far away; up close (where the fixed-size dots
        // would turn into huge discs) neighbouring countries become flat land shapes.
        const illus = lookRef.current === "illustrated";
        const mode = illus ? (alt > ILLUS_DOTS_ALT ? "dots" : "land") : alt > MUNI_MAX ? "c" : alt > COUNTRY_MIN ? "cm" : "m";
        if (mode === borderMode) return;
        borderMode = mode;
        if (illus) showDots(mode === "dots");
        g.polygonsData(
          mode === "c" ? countries : mode === "m" || mode === "dots" ? munis : mode === "land" ? [...nearCountries, ...munis] : [...countriesOutsideSlovenia, ...munis],
        );
      };

      // ---- Labels: greedy placement by importance, using projected screen positions
      // (no DOM measuring), so it can run every frame while the globe moves.
      const LABEL_H = 24;
      const labelW = new Map<string, number>();
      const labels = new LabelTimeline();
      let labelTimer = 0;
      let lastAlt = Infinity;
      let zoomedOutAt = -Infinity;
      type Box = { l: number; r: number; t: number; b: number };
      // Where the page's own text and controls are. Measuring forces a layout, so while the
      // camera moves this is reused; any change on the page (scheduleDeclutter(true)) or a
      // short wait measures again.
      let ui: { at: number; W: number; H: number; boxes: Box[] } | null = null;
      const pageBoxes = () => {
        const now = performance.now();
        if (ui && now - ui.at < 400) return ui;
        const host = el.getBoundingClientRect();
        const boxes: Box[] = [];
        document.querySelectorAll(".hero h1, .hero p, .hero .stats, .hero .why, .topbar > *, .finder, .cards > *, .panel, .chat, .footer, .corner").forEach((n) => {
          const r = n.getBoundingClientRect();
          if (r.width && r.height && getComputedStyle(n).opacity !== "0")
            boxes.push({ l: r.left - host.left, r: r.right - host.left, t: r.top - host.top, b: r.bottom - host.top });
        });
        ui = { at: now, W: host.width, H: host.height, boxes };
        return ui;
      };
      // Pins tucked away because they'd overlap a more important one (see declutter).
      const tucked = new Set<string>();
      let order: number[] = [];
      let orderFor = "";
      const declutter = () => {
        const alt = g.pointOfView().altitude;
        const { W, H, boxes } = pageBoxes();
        project();
        const near = nearRef.current;
        const selected = selectedRef.current ?? undefined;

        // ---- Dots: never draw one pin on top of another. Walk the places from most to least
        // important and tuck away any whose dot would overlap a dot already placed on screen.
        // A coarse screen grid keeps this cheap enough to run every frame (~800 places); the
        // order only changes with the selection, nearby places, the chosen type or the list.
        const focus = focusRef.current;
        const key = `${selected}|${[...near].join(",")}|${focus}|${places.length}`;
        if (key !== orderFor) {
          orderFor = key;
          const rank = (t: Tour) =>
            (t.id === selected ? 4e12 : 0) + (near.has(t.id) ? 2e12 : 0) +
            (focus !== "all" && t.type === focus ? 1e12 : 0) + importance(t);
          order = places.map((_, i) => i).sort((a, b) => rank(places[b]) - rank(places[a]));
        }
        const CELL = 20;
        const grid = new Map<number, { x: number; y: number; r: number; i: number }[]>();
        const nextTucked = new Set<string>();
        const onScreen: number[] = [];
        // Places whose names are showing go first, so a less important dot never tucks away
        // a name that's already on screen.
        const named = labels.pinned;
        const tuckOrder = [...order.filter((i) => named.has(places[i].id)), ...order.filter((i) => !named.has(places[i].id))];
        for (const i of tuckOrder) {
          const t = places[i];
          const x = px[i];
          const y = py[i];
          // Off screen, or on the far side of the globe (NaN).
          if (!(x >= -20 && y >= -20 && x <= W + 20 && y <= H + 20)) continue;
          const r = dotRadius(t, focus);
          const gx = Math.floor(x / CELL);
          const gy = Math.floor(y / CELL);
          let hit = false;
          for (let dx = -1; dx <= 1 && !hit; dx++)
            for (let dy = -1; dy <= 1 && !hit; dy++)
              for (const q of grid.get((gx + dx) * 100003 + (gy + dy)) ?? [])
                if (Math.hypot(q.x - x, q.y - y) < q.r + r + 1.5) {
                  hit = true;
                  break;
                }
          if (hit && t.id !== selected) {
            nextTucked.add(t.id);
            continue;
          }
          const cell = gx * 100003 + gy;
          (grid.get(cell) ?? grid.set(cell, []).get(cell)!).push({ x, y, r, i });
          onScreen.push(i);
        }
        const tuckChanged: string[] = [];
        for (const id of tucked) if (!nextTucked.has(id)) {
          markers.current.get(id)?.classList.remove("is-tucked");
          tuckChanged.push(id);
        }
        for (const id of nextTucked) if (!tucked.has(id)) {
          markers.current.get(id)?.classList.add("is-tucked");
          tuckChanged.push(id);
        }
        tucked.clear();
        nextTucked.forEach((id) => tucked.add(id));
        if (tuckChanged.length) {
          for (const id of tuckChanged) placeDots.setLook(index.get(id)!, lookOf(index.get(id)!));
          placeDots.commit();
          wake();
        }

        // ---- Zoomed in, dots fire up: they grow and warm to a soft orange, the most important
        // places first, then gradually all of them. Each grows only as far as its nearest
        // neighbour on screen leaves room, eased over a few frames so nothing pops.
        let fireChanged = false;
        let easing = false;
        const roomNow = new Float32Array(places.length).fill(MAX_ROOM);
        for (const i of onScreen) {
          if (fireHeat(stand[i], alt) <= 0) continue;
          const x = px[i];
          const y = py[i];
          const gx = Math.floor(x / CELL);
          const gy = Math.floor(y / CELL);
          let d = Infinity;
          for (let dx = -1; dx <= 1; dx++)
            for (let dy = -1; dy <= 1; dy++)
              for (const q of grid.get((gx + dx) * 100003 + (gy + dy)) ?? [])
                if (q.i !== i) d = Math.min(d, Math.hypot(q.x - x, q.y - y));
          roomNow[i] = Math.min(MAX_ROOM, d / 2 - 1.5);
        }
        for (let i = 0; i < places.length; i++) {
          const h = places[i].kind === "obcina" ? 0 : fireHeat(stand[i], alt);
          let r = room[i] + (roomNow[i] - room[i]) * 0.35;
          if (Math.abs(roomNow[i] - r) < 0.15) r = roomNow[i];
          else easing = true;
          if (h !== heat[i] || r !== room[i]) {
            heat[i] = h;
            room[i] = r;
            placeDots.setFire(i, h, r);
            fireChanged = true;
          }
        }
        if (fireChanged) {
          placeDots.commitFire();
          wake();
        }
        if (easing && !declutterRaf) declutterRaf = requestAnimationFrame(() => { declutterRaf = 0; declutter(); });

        // ---- Names (see lib/labels): the ones showing keep their place; new ones appear where
        // they fit, once they've kept fitting for a moment; leaving ones fade out.
        const boxOf = (t: Tour, i: number): Box | null => {
          // NaN: on the far side of the globe.
          const x = px[i];
          const y = py[i];
          if (!(x >= 0 && y >= 0 && x <= W && y <= H)) return null;
          let w = labelW.get(t.id);
          if (w == null) {
            w = shortLabel(t).length * 6.9 + 18;
            labelW.set(t.id, w);
          }
          // Above the dot as drawn now (fired-up dots are larger).
          const lift = t.kind === "obcina" ? 15 : Math.max(11, shownRadius(i) + 8);
          return { l: x - w / 2 - 4, r: x + w / 2 + 4, t: y - lift - LABEL_H - 3, b: y - lift + 3 };
        };
        // Most important first: the selected and nearby places, the chosen type, then by
        // importance (the same cached order the dots use).
        const incumbents: Candidate[] = [];
        const newcomers: Candidate[] = [];
        const showing = labels.shown;
        for (const i of order) {
          const t = places[i];
          if (tucked.has(t.id)) continue;
          const revealAlt = t.kind !== "obcina" ? labelAltitude(stand[i]) : undefined;
          // A name that's showing stays until you zoom out a good bit past where it appeared.
          const at = showing.has(t.id) ? alt / 1.25 : alt;
          if (!labelEligible(t, at, focus, { selectedId: selected ?? null, nearIds: near, revealAlt })) continue;
          const box = boxOf(t, i);
          if (box) (showing.has(t.id) ? incumbents : newcomers).push({ id: t.id, box });
        }
        // Keep names clear of the page's own text and controls, the visitor's own label, and
        // names still fading out.
        const blocked: Box[] = [...boxes];
        const me = youRef.current;
        if (me) {
          const sc = g.getScreenCoords(me.lat, me.lng, 0);
          const w = me.label.length * 6.9 + 30;
          blocked.push({ l: sc.x - w / 2, r: sc.x + w / 2, t: sc.y - 44, b: sc.y + 10 });
        }
        for (const id of labels.leaving.keys()) {
          const i = index.get(id);
          const box = i != null ? boxOf(places[i], i) : null;
          if (box) blocked.push(box);
        }
        // Zooming out squeezes everything together: names that appear now would only collide a
        // moment later, so while that goes on only the selected and nearby places may gain one.
        const now = performance.now();
        if (alt > lastAlt * 1.0005) zoomedOutAt = now;
        lastAlt = alt;
        const settling = now - zoomedOutAt < 300;
        const { keep, fresh } = chooseLabels(
          incumbents,
          settling ? newcomers.filter((c) => c.id === selected || near.has(c.id)) : newcomers,
          blocked,
          labelBudget(alt),
        );
        const step = labels.update(keep, fresh, now, (id) => id === selected || near.has(id));
        // Done zooming out: look once more so new names can come in.
        if (settling && step.again == null) step.again = 320;
        for (const id of step.removed) markers.current.get(id)?.classList.remove("has-label");
        for (const id of step.added) markerEl(places[index.get(id)!]).classList.add("has-label");
        // Something is still waiting to appear or fading out: look again then.
        window.clearTimeout(labelTimer);
        if (step.again != null) labelTimer = window.setTimeout(declutter, step.again);
        setPins();
        sizePins();
      };
      let declutterRaf = 0;
      let declutterTimer = 0;
      const scheduleDeclutter = (pageChanged = false) => {
        if (pageChanged) ui = null;
        if (quietRef.current) return;
        // At most once per frame while moving, plus once more when the motion settles.
        if (!declutterRaf) declutterRaf = requestAnimationFrame(() => { declutterRaf = 0; declutter(); });
        window.clearTimeout(declutterTimer);
        declutterTimer = window.setTimeout(declutter, 200);
      };
      labelsRef.current = () => scheduleDeclutter(true);

      // The far-out satellite tiles are graded to match the aerial photos that replace them
      // up close, fading in with the zoom (see lib/imagery). One shared program and uniform.
      const grade = { value: 0 };
      const gradeShader = (shader: { uniforms: Record<string, unknown>; fragmentShader: string }) => {
        shader.uniforms.uGrade = grade;
        shader.fragmentShader = `uniform float uGrade;\n${shader.fragmentShader}`.replace(
          "#include <map_fragment>",
          `#include <map_fragment>\n${GRADE_GLSL}`,
        );
      };
      const gradeTile = (o: unknown) => {
        const mesh = o as { geometry?: { parameters?: { phiLength?: number } }; material?: import("three").MeshLambertMaterial };
        const phi = mesh.geometry?.parameters?.phiLength;
        const mat = mesh.material;
        if (!phi || !mat || !(mat as { isMeshLambertMaterial?: boolean }).isMeshLambertMaterial) return;
        if (tileLevel(phi) > GRADED_MAX_LEVEL || mat.onBeforeCompile === gradeShader) return;
        mat.onBeforeCompile = gradeShader;
        mat.customProgramCacheKey = () => "esri-grade";
        mat.needsUpdate = true;
      };
      const setGrade = (alt: number) => {
        const v = imageryGrade(alt);
        if (v !== grade.value) grade.value = v;
      };

      // Load one tile level sharper than three-slippy-map-globe's default at every
      // altitude (its thresholds are 8 / 2^level globe radii). Never use levels 0-2:
      // ESRI's lowest levels are a lighter, hazier mosaic, so the whole globe would
      // visibly change tone when level 3 loads.
      let sharpened = false;
      const sharpenTiles = () => {
        if (sharpened) return;
        g.scene().traverse((o) => {
          const tiles = o as unknown as { thresholds?: number[] };
          if (Array.isArray(tiles.thresholds)) {
            tiles.thresholds = tiles.thresholds.map((_, i) => 8 / 2 ** (i + 1));
            (tiles as unknown as { minLevel: number }).minLevel = 3;
            // A tile arriving is the one change nobody asks for: draw it.
            const engine = o as unknown as { add: (...x: unknown[]) => unknown };
            const add = engine.add.bind(engine);
            engine.add = (...x) => {
              x.forEach(gradeTile);
              wakeRef.current();
              return add(...x);
            };
            sharpened = true;
          }
        });
      };
      sharpenTiles();

      // globe.gl fixes the camera near plane at 0.05 (~3 km), which clips the ground when
      // zoomed in close. Scale near/far with the distance to the surface instead.
      const R = g.getGlobeRadius();
      const fitClipping = (alt: number) => {
        const cam = g.camera() as import("three").PerspectiveCamera;
        const d = alt * R;
        cam.near = Math.min(5, Math.max(0.0004, d * 0.25));
        cam.far = (R + d) * 4;
        cam.updateProjectionMatrix();
      };

      g.onZoom((pov) => {
        sharpenTiles();
        setGrade(pov.altitude);
        fitClipping(pov.altitude);
        if (dots?.visible) (dots.material as import("three").PointsMaterial).size = dotSize(pov.altitude);
        applyZoom(pov.altitude);
        scheduleDeclutter();
      });
      applyZoom(START.altitude);

      // ---- HTML markers
      g.htmlElementsData([])
        .htmlLat((d) => (d as Tour).lat!)
        .htmlLng((d) => (d as Tour).lng!)
        .htmlAltitude(0)
        .htmlTransitionDuration(0)
        .htmlElement((d) => {
          if ((d as { id: string }).id === YOU_ID) return youMarker(youRef.current!);
          if ((d as { id: string }).id === STUDIO_ID) return studioMarker(studioRef.current!.label);
          return markerEl(d as Tour);
        });

      // ---- Places: every dot drawn on the map in one go; HTML pins only where needed
      const placeDots = createDots(THREE, FIRE_SIZE);
      placeDots.setPixelRatio(g.renderer().getPixelRatio());
      g.scene().add(placeDots.object);
      let places: Tour[] = [];
      let index = new Map<string, number>();
      let xyz = new Float32Array(0);
      let px = new Float32Array(0);
      let py = new Float32Array(0);
      let pins = new Set<string>();
      let hoveredId: string | null = null;
      // Zoomed-in look per place (see declutter): standing (0 = most important), heat, room.
      const MAX_ROOM = FIRE_SIZE / 2 + 1;
      let stand = new Float32Array(0);
      let heat = new Float32Array(0);
      let room = new Float32Array(0);
      /** Radius (px) a place's dot is drawn at right now, matching the shader. */
      const shownRadius = (i: number) => {
        const base = dotRadius(places[i], focusRef.current) * 2;
        const grown = Math.max(base, base + (FIRE_SIZE - base) * heat[i]);
        return Math.min(grown, Math.max(base, 2 * room[i])) / 2;
      };
      // Places pinned only for their name: their dot stays on the map.
      let labelOnly = new Set<string>();
      // A place the mouse just left keeps its pin a moment, so its dot eases back and its name
      // fades out instead of vanishing (HOVER_OUT_MS matches the label's fade in globals.css).
      const HOVER_OUT_MS = 340;
      let leavingId: string | null = null;
      let leaveTimer = 0;
      const named = () => (leavingId && !labels.pinned.has(leavingId) ? new Set([...labels.pinned, leavingId]) : labels.pinned);
      const dotPx = new Map<string, number>();
      let size = { W: el.clientWidth, H: el.clientHeight };
      const v = new THREE.Vector3();

      /** Screen position of every place (px, py); NaN for the far side of the globe. */
      const project = () => {
        const cam = g.camera();
        cam.updateMatrixWorld();
        const c = cam.position;
        for (let i = 0; i < places.length; i++) {
          const x = xyz[i * 3], y = xyz[i * 3 + 1], z = xyz[i * 3 + 2];
          if (x * (c.x - x) + y * (c.y - y) + z * (c.z - z) <= 0) {
            px[i] = py[i] = NaN;
            continue;
          }
          v.set(x, y, z).project(cam);
          px[i] = ((v.x + 1) / 2) * size.W;
          py[i] = ((1 - v.y) / 2) * size.H;
        }
      };

      /** A place's dot, unless an HTML pin stands in for it or it's tucked away. */
      const lookOf = (i: number) => {
        const id = places[i].id;
        return tucked.has(id) || (pins.has(id) && !labelOnly.has(id)) ? null : dotLook(places[i], focusRef.current);
      };

      const htmlData = () => [
        ...places.filter((t) => pins.has(t.id)),
        ...(youRef.current ? [{ id: YOU_ID, lat: youRef.current.lat, lng: youRef.current.lng }] : []),
        ...(studioRef.current ? [{ id: STUDIO_ID, lat: studioRef.current.lat, lng: studioRef.current.lng }] : []),
      ];

      /** Give HTML pins to the places that need them (see pinIds); the rest stay dots. */
      const setPins = (force = false) => {
        const next = pinIds(places, { selectedId: selectedRef.current, nearIds: nearRef.current, hoveredId, labelled: named() });
        const nextLabelOnly = new Set(
          [...named()].filter((id) => {
            const i = index.get(id);
            return i != null && places[i].kind !== "obcina" && id !== selectedRef.current && !nearRef.current.has(id) && id !== hoveredId && id !== leavingId;
          }),
        );
        const diff = (a: Set<string>, b: Set<string>) => [...a].filter((id) => !b.has(id)).concat([...b].filter((id) => !a.has(id)));
        const pinsChanged = diff(next, pins);
        const labelOnlyChanged = diff(nextLabelOnly, labelOnly);
        if (!pinsChanged.length && !labelOnlyChanged.length && !force) return;
        for (const id of labelOnlyChanged) {
          const on = nextLabelOnly.has(id);
          const m = on ? markerEl(places[index.get(id)!]) : markers.current.get(id);
          m?.classList.toggle("is-label-only", on);
        }
        for (const id of pinsChanged) if (!next.has(id)) unsize(id);
        pins = next;
        labelOnly = nextLabelOnly;
        for (const id of new Set([...pinsChanged, ...labelOnlyChanged])) {
          const i = index.get(id);
          if (i != null) placeDots.setLook(i, lookOf(i));
        }
        placeDots.commit();
        if (pinsChanged.length || force) g.htmlElementsData(htmlData());
        sizePins();
        wake();
      };

      /** Back to the pin's own size from globals.css. */
      const unsize = (id: string) => {
        if (!dotPx.delete(id)) return;
        const dot = markers.current.get(id)?.querySelector<HTMLElement>(".marker__dot");
        if (dot) dot.style.width = dot.style.height = "";
      };
      /**
       * Pins that stand in for a dot drawn on the map (named, hovered or selected places) take
       * that dot's size, so swapping one for the other never moves the dot or its name.
       * Municipalities and nearby places keep their own pin look.
       */
      const sizePins = () => {
        for (const id of pins) {
          const i = index.get(id);
          if (i == null || places[i].kind === "obcina" || nearRef.current.has(id)) {
            unsize(id);
            continue;
          }
          const d = Math.round(shownRadius(i) * 4) / 2;
          if (dotPx.get(id) === d) continue;
          dotPx.set(id, d);
          const dot = markerEl(places[i]).querySelector<HTMLElement>(".marker__dot");
          if (dot) dot.style.width = dot.style.height = `${d}px`;
        }
      };

      const restyle = () => {
        places.forEach((_, i) => placeDots.setLook(i, lookOf(i)));
        placeDots.commit();
        wake();
      };

      const reload = () => {
        places = toursRef.current.filter((t) => t.lat != null);
        index = new Map(places.map((t, i) => [t.id, i]));
        xyz = new Float32Array(places.length * 3);
        places.forEach((t, i) => {
          const c = g.getCoords(t.lat!, t.lng!, 0);
          xyz[i * 3] = c.x;
          xyz[i * 3 + 1] = c.y;
          xyz[i * 3 + 2] = c.z;
        });
        px = new Float32Array(places.length);
        py = new Float32Array(places.length);
        const st = standing(places);
        stand = Float32Array.from(places, (t) => st.get(t.id) ?? 0);
        heat = new Float32Array(places.length);
        room = new Float32Array(places.length).fill(MAX_ROOM);
        placeDots.setPositions(xyz);
        pins = pinIds(places, { selectedId: selectedRef.current, nearIds: nearRef.current, hoveredId, labelled: named() });
        restyle();
        setPins(true);
      };

      // The story fades the pins out (CSS); the dots follow.
      let fadeRaf = 0;
      let opacity = 1;
      const fade = (to: number) => {
        cancelAnimationFrame(fadeRaf);
        const from = opacity;
        const start = performance.now();
        const step = (now: number) => {
          const k = Math.min(1, (now - start) / 300);
          opacity = from + (to - from) * k;
          placeDots.setOpacity(opacity);
          wake(100);
          if (k < 1) fadeRaf = requestAnimationFrame(step);
        };
        fadeRaf = requestAnimationFrame(step);
      };
      placesRef.current = { reload, restyle, fade };

      const controls = g.controls();
      controls.autoRotate = false;
      // Fired only by the visitor's own gestures, never by our camera flights.
      controls.addEventListener("start", () => onExploreRef.current?.());
      // Pinch zoom on touch screens. OrbitControls scales the camera's distance from the
      // globe's CENTRE by (finger spread ratio)^zoomSpeed, and globe.gl sets zoomSpeed to
      // sqrt(altitude)/2, so near the ground a small pinch dived far (over Slovenia a 1.5x pinch
      // zoomed ~3.7x, lower down it hit the closest zoom at once). With zoomSpeed =
      // alt / (1 + alt) the height above the ground follows the fingers 1:1: spread them twice
      // as far apart and you are twice as close, at any height. This listener runs after
      // globe.gl's own, so it has the last word. Desktop wheel zoom keeps globe.gl's feel.
      if (touch) {
        const pinchSpeed = () => {
          const alt = g.pointOfView().altitude;
          controls.zoomSpeed = alt / (1 + alt);
        };
        controls.addEventListener("change", pinchSpeed);
        pinchSpeed();
      }
      fitClipping(START.altitude);

      // ---- Render only while something changes ------------------------------------
      // globe.gl redraws the scene and repositions every HTML pin on every frame, even when
      // nothing moves; on a phone that alone keeps the CPU busy. Draw while the camera
      // moves, the visitor touches the map, tiles arrive or the page changes something,
      // then pause. A slow heartbeat catches anything else.
      const IDLE_MS = 700;
      let awakeUntil = 0;
      let running = true;
      let watchRaf = 0;
      const lastCam = [0, 0, 0, 0, 0, 0, 0];
      const cameraMoved = () => {
        const c = g.camera();
        const now = [c.position.x, c.position.y, c.position.z, c.quaternion.x, c.quaternion.y, c.quaternion.z, c.quaternion.w];
        // About a quarter of a pixel at the current height: the controls' easing tails off
        // forever, but nobody sees it once it's below that.
        const height = Math.max(c.position.length() - R, 1e-6);
        let moved = false;
        now.forEach((v, i) => {
          if (Math.abs(v - lastCam[i]) > (i < 3 ? height * 3e-4 : 1e-6)) moved = true;
          lastCam[i] = v;
        });
        return moved;
      };
      const watch = () => {
        watchRaf = 0;
        if (!running) return;
        const now = performance.now();
        if (cameraMoved()) awakeUntil = Math.max(awakeUntil, now + IDLE_MS);
        if (now > awakeUntil) {
          running = false;
          g.pauseAnimation();
          return;
        }
        watchRaf = requestAnimationFrame(watch);
      };
      const wake = (ms = IDLE_MS) => {
        awakeUntil = Math.max(awakeUntil, performance.now() + ms);
        if (pausedRef.current) return;
        if (!running) {
          running = true;
          g.resumeAnimation();
        }
        if (!watchRaf) watchRaf = requestAnimationFrame(watch);
      };
      wakeRef.current = wake;
      sleepRef.current = () => {
        running = false;
        g.pauseAnimation();
      };
      const heartbeat = window.setInterval(() => !running && wake(50), 1000);
      // Camera moves we ask for (flights, the story's scrolling) keep it drawing until they land.
      const pov = g.pointOfView.bind(g);
      (g as unknown as { pointOfView: (p?: Partial<Pov>, ms?: number) => unknown }).pointOfView = (p, ms) => {
        if (!p) return pov();
        wake((ms ?? 0) + IDLE_MS);
        return pov(p, ms);
      };
      controls.addEventListener("change", () => wake());

      // Touch screens have no hover, so skip globe.gl's pointer raycasting (every 50 ms,
      // against every tile and border) except around a tap, which still needs it to pick an
      // area.
      let tapTimer = 0;
      if (touch) g.enablePointerInteraction(false);
      // Dots aren't elements: a tap or click picks the nearest one on screen, and on desktop
      // the dot under the mouse becomes a real pin (hover look, name and pointer cursor).
      let down: { x: number; y: number; at: number } | null = null;
      let hoverRaf = 0;
      const local = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      /** Screen positions of the dots that can be picked: tucked ones are hidden. */
      const pickable = () => {
        project();
        for (const id of tucked) {
          const i = index.get(id);
          if (i != null) px[i] = NaN;
        }
      };
      const onPin = (e: Event) => !!(e.target as Element | null)?.closest?.(".marker, .you, .studio");
      const hover = (id: string | null) => {
        if (id === hoveredId) return;
        const prev = hoveredId;
        if (prev) markers.current.get(prev)?.classList.remove("is-hover");
        hoveredId = id;
        window.clearTimeout(leaveTimer);
        leavingId = prev;
        if (prev) leaveTimer = window.setTimeout(() => { leavingId = null; setPins(); }, HOVER_OUT_MS);
        setPins();
        if (!id) return;
        const m = markerEl(places[index.get(id)!]);
        // A pin that was just put on the page has no "before" to transition from: let it be
        // drawn once in its resting look (the dot's own size and colour), then light it up.
        if (m.isConnected) m.classList.add("is-hover");
        else requestAnimationFrame(() => requestAnimationFrame(() => { if (hoveredId === id) m.classList.add("is-hover"); }));
      };
      const onPointer = (ev: Event) => {
        wake();
        const e = ev as PointerEvent;
        if (e.type === "pointerdown") down = onPin(e) ? null : { ...local(e), at: performance.now() };
        if (e.type === "pointerup" && down) {
          const p = local(e);
          if (Math.hypot(p.x - down.x, p.y - down.y) < 8 && performance.now() - down.at < 600 && !quietRef.current) {
            pickable();
            const i = nearest(px, py, p.x, p.y, e.pointerType === "mouse" ? 9 : 18);
            if (i >= 0) {
              dotPickedAt = performance.now();
              onSelectRef.current(places[i].id);
            }
          }
          down = null;
        }
        if (!touch && e.type === "pointermove" && !e.buttons && !hoverRaf) {
          const inPin = onPin(e);
          const p = local(e);
          hoverRaf = requestAnimationFrame(() => {
            hoverRaf = 0;
            if (inPin || quietRef.current) return;
            pickable();
            const i = nearest(px, py, p.x, p.y, 9);
            hover(i >= 0 ? places[i].id : null);
          });
        }
        if (!touch) return;
        window.clearTimeout(tapTimer);
        if (e.type === "pointerdown") g.enablePointerInteraction(true);
        else if (e.type === "pointerup" || e.type === "pointercancel")
          tapTimer = window.setTimeout(() => g.enablePointerInteraction(false), 400);
      };
      const pointerEvents = ["pointerdown", "pointermove", "pointerup", "pointercancel", "wheel"];
      pointerEvents.forEach((t) => el.addEventListener(t, onPointer, { capture: true, passive: true }));

      const applyLook = (l: Look) => {
        lookRef.current = l;
        const st = LOOKS[l];
        ambient.color.set(st.ambient[0]);
        ambient.intensity = st.ambient[1];
        sun.color.set(st.sun[0]);
        sun.intensity = st.sun[1];
        g.atmosphereColor(st.atmosphere[0]).atmosphereAltitude(st.atmosphere[1]);
        // Swap imagery: drop the old tiles, then point the engine at the new source (or none).
        g.globeTileEngineClearCache();
        g.globeTileEngineUrl(st.tiles as unknown as (x: number, y: number, l: number) => string);
        if (st.tiles) g.globeTileEngineMaxLevel(st.maxLevel);
        // Ocean colour for the illustrated look; black (hidden under tiles) otherwise.
        globeMat.color.set(l === "illustrated" ? "#081236" : "#000000");
        globeMat.emissive?.set(l === "illustrated" ? "#060f2e" : "#000000");
        globeMat.shininess = l === "illustrated" ? 0 : 30;
        if (l !== "illustrated") showDots(false);
        // Respect the look's closest zoom; nudge the camera out if it's already closer.
        controls.minDistance = R * (1 + st.minAlt);
        const pov = g.pointOfView();
        if (pov.altitude < st.minAlt) g.pointOfView({ ...pov, altitude: st.minAlt * 1.5 }, 400);
        borderMode = "";
        applyZoom(pov.altitude);
        g.polygonCapMaterial(g.polygonCapMaterial()).polygonStrokeColor(g.polygonStrokeColor());
        el.dataset.look = l;
        wake();
      };
      applyLookRef.current = applyLook;
      applyLook(lookRef.current);


      const onResize = () => {
        g.width(el.clientWidth).height(el.clientHeight);
        size = { W: el.clientWidth, H: el.clientHeight };
        ui = null;
        wake();
      };
      window.addEventListener("resize", onResize);

      globe.current = g;
      // Handy for automated visual checks in development.
      if (process.env.NODE_ENV !== "production") Object.assign(window, { __globe: g, __grade: grade });
      reload();
      let groundRaf = 0;
      let groundPx = 0;
      onReady?.({
        pov: () => g.pointOfView(),
        scrollGround: (px) => {
          groundPx = px;
          if (groundRaf) return;
          groundRaf = requestAnimationFrame(() => {
            groundRaf = 0;
            const base = storyBase.current;
            if (!base || flying.current) return;
            // Scrolling down moves the text up; move the camera south so the ground follows.
            const degPerPx = (2 * halfHeightDeg(base.altitude)) / window.innerHeight;
            g.pointOfView({ ...base, lat: base.lat - groundPx * degPerPx }, 0);
          });
        },
      });

      // Orchestrated fly-in to the visitor, or to all of Slovenia.
      const t = intro ? window.setTimeout(() => g.pointOfView(initialView ?? SLOVENIA, reduced ? 0 : 3800), reduced ? 0 : 700) : 0;

      // ---- Pins appear only as the opening flight lands: a wave of pops spreading out from
      // where the camera lands, municipalities first. (Hidden until then; see globals.css.)
      // The dots on the map pop in the same way, in the shader (see globeDots).
      let revealTimer = 0;
      let revealDone = 0;
      let waveRaf = 0;
      const revealPins = () => {
        if (el.dataset.pins !== "hidden") return;
        window.clearTimeout(revealTimer);
        const c = initialView ?? SLOVENIA;
        const cosLat = Math.cos((c.lat * Math.PI) / 180);
        let last = 0;
        places.forEach((tour, i) => {
          const d = Math.hypot((tour.lng! - c.lng) * cosLat, tour.lat! - c.lat); // degrees
          const delay = Math.round(
            Math.min(d, 2.5) * 480 + (tour.kind === "obcina" ? 0 : 260) + Math.random() * 140,
          );
          popDelay.current.set(tour.id, delay);
          markers.current.get(tour.id)?.style.setProperty("--pop-delay", `${delay}ms`);
          placeDots.setDelay(i, delay);
          last = Math.max(last, delay);
        });
        placeDots.commit();
        el.dataset.pins = "in";
        const start = performance.now();
        const wave = (now: number) => {
          placeDots.setReveal(now - start);
          wake(100);
          waveRaf = now - start < last + 600 ? requestAnimationFrame(wave) : 0;
        };
        waveRaf = requestAnimationFrame(wave);
        // Once every pin has popped, drop the animation so later class changes don't replay it,
        // and let the names in.
        revealDone = window.setTimeout(() => {
          el.dataset.pins = "shown";
          placeDots.setReveal(Infinity);
          wake();
          scheduleDeclutter();
        }, last + 650);
      };
      if (intro && !reduced) {
        el.dataset.pins = "hidden";
        placeDots.setReveal(-1);
        // Start the wave just before the camera settles.
        revealTimer = window.setTimeout(revealPins, 700 + 3800 - 450);
        // If the visitor grabs the globe first, don't keep them waiting.
        controls.addEventListener("start", revealPins);
      } else {
        el.dataset.pins = "shown";
      }

      cleanup = () => {
        window.clearTimeout(t);
        window.clearTimeout(revealTimer);
        window.clearTimeout(revealDone);
        cancelAnimationFrame(waveRaf);
        window.clearTimeout(declutterTimer);
        window.clearTimeout(labelTimer);
        cancelAnimationFrame(declutterRaf);
        window.removeEventListener("resize", onResize);
        window.clearInterval(heartbeat);
        window.clearTimeout(tapTimer);
        cancelAnimationFrame(watchRaf);
        cancelAnimationFrame(fadeRaf);
        cancelAnimationFrame(hoverRaf);
        window.clearTimeout(leaveTimer);
        placesRef.current = { reload: () => {}, restyle: () => {}, fade: () => {} };
        pointerEvents.forEach((t) => el.removeEventListener(t, onPointer, { capture: true }));
        wakeRef.current = () => {};
        sleepRef.current = () => {};
        g._destructor?.();
        el.innerHTML = "";
      };
    })();

    return () => {
      disposed = true;
      cleanup();
      globe.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- data updates
  useEffect(() => {
    placesRef.current.reload();
    labelsRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tours, you?.lat, you?.lng, you?.precise, you?.label, studio?.lat, studio?.lng, studio?.label]);

  // Pins come back after a quiet flight: place their labels for where the camera is now.
  useEffect(() => {
    placesRef.current.fade(quiet ? 0 : 1);
    if (!quiet) labelsRef.current();
  }, [quiet]);

  useEffect(() => {
    markers.current.forEach((m, id) => m.classList.toggle("is-selected", id === selectedId));
    labelsRef.current();
  }, [selectedId, tours]);

  useEffect(() => {
    markers.current.forEach((m, id) => m.classList.toggle("is-near", nearRef.current.has(id)));
    labelsRef.current();
  }, [highlightIds, tours]);

  useEffect(() => {
    const byId = new Map(tours.map((t) => [t.id, t]));
    markers.current.forEach((m, id) => {
      const t = byId.get(id);
      if (!t) return;
      m.classList.toggle("is-dim", isDimmed(t, focusType));
      m.classList.toggle("is-focus", focusType !== "all" && t.type === focusType);
    });
    placesRef.current.restyle();
    labelsRef.current();
  }, [focusType, tours]);

  useEffect(() => {
    const g = globe.current;
    if (!focus || !g) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const halfH = halfHeightDeg(focus.altitude);
    const w = window.innerWidth;
    const h = window.innerHeight;
    const halfW = (halfH * (w / h)) / Math.cos((focus.lat * Math.PI) / 180);
    let { lat, lng } = focus;
    if (focus.story) {
      const pin = storyPin(w);
      lat -= (0.5 - pin.y) * 2 * halfH;
      lng -= (pin.x - 0.5) * 2 * halfW;
    } else if (focus.panel && w <= 760) {
      lat -= halfH * 0.55; // keep the point in the strip above the bottom sheet
    } else if (focus.panel) {
      lng += halfW * (Math.min(460, w * 0.4) / w); // nudge left of the side panel
    }
    const to = { lat, lng, altitude: focus.altitude };
    storyBase.current = focus.story ? to : null;
    const ms = reduced ? 0 : focus.ms ?? 1600;
    if (!focus.arc || ms === 0) {
      g.pointOfView(to, ms);
      return;
    }
    // An arc: drive the camera frame by frame (globe.gl's own tween only flies straight).
    const from = g.pointOfView();
    const start = performance.now();
    let raf = 0;
    let timer = 0;
    flying.current = true;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      g.pointOfView(arcPov(from, to, t, focus.arc!), 0);
      if (t < 1) raf = requestAnimationFrame(step);
      else {
        flying.current = false;
        // Land once more a moment later: the tile engine can miss a camera that moved while it
        // was still starting up, and a fresh position makes it load the sharp tiles.
        // (Re-applies wherever the camera is now, in case the visitor already scrolled.)
        timer = window.setTimeout(() => g.pointOfView(g.pointOfView(), 0), 250);
      }
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      flying.current = false;
    };
  }, [focus]);

  useEffect(() => {
    if (look !== lookRef.current) applyLookRef.current(look);
  }, [look]);

  useEffect(() => {
    const g = globe.current;
    if (!g) return;
    if (paused) sleepRef.current();
    else wakeRef.current();
  }, [paused]);

  return <div ref={host} className="globe" data-labels="off" />;
}

export { SLOVENIA };
