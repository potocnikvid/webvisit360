"use client";

import { useEffect, useRef } from "react";
import type { GlobeInstance } from "globe.gl";
import type { PlaceType, Tour } from "@/lib/types";
import { isDimmed, labelEligible } from "@/lib/markers";
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
// Rough Google views per photo (profile total 28.5M / 10.6k photos), to rank Google places.
const GOOGLE_VIEWS_PER_PHOTO = 2700;

/** How important a place is when competing for label space. */
const importance = (t: Tour) =>
  t.kind === "obcina"
    ? 1e12 + (t.scenes ?? 0)
    : t.views ?? (t.scenes ?? 0) * (t.source === "google" ? GOOGLE_VIEWS_PER_PHOTO : 1000);

/** Map label: municipality without "Občina", business up to its first separator, max ~30 chars. */
const shortLabel = (t: Tour) => {
  if (t.kind === "obcina") return t.name.replace(/^Občina /, "");
  let s = t.name.split(/\s+[|–-]\s+|,\s+/)[0].trim();
  if (s.length > 30) s = s.slice(0, 29).trimEnd() + "…";
  return s;
};

/** Most labels on screen at once, growing as you zoom in. */
const labelBudget = (alt: number) => (alt > 0.15 ? 18 : alt > 0.05 ? 28 : alt > 0.015 ? 40 : 60);

const ESRI = (x: number, y: number, l: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`;

export default function Globe({ tours, geo, selectedId, focus, paused, onSelect, onReady, onExplore, initialView, highlightIds, you, focusType = "all", studio, intro = true, quiet = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const globe = useRef<GlobeInstance | null>(null);
  const markers = useRef(new Map<string, HTMLElement>());
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

  /** Tours with a location, plus the visitor's own marker. */
  const markerData = () => [
    ...toursRef.current.filter((t) => t.lat != null),
    ...(youRef.current ? [{ id: YOU_ID, lat: youRef.current.lat, lng: youRef.current.lng }] : []),
    ...(studioRef.current ? [{ id: STUDIO_ID, lat: studioRef.current.lat, lng: studioRef.current.lng }] : []),
  ];
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
        .atmosphereColor("#6d8de0")
        .atmosphereAltitude(0.16)
        .globeTileEngineUrl(ESRI)
        // ESRI has real imagery to level 19 over Slovenia; 20 is just upscaled.
        .globeTileEngineMaxLevel(19)
        .pointOfView(START, 0);

      // Blue-hour lighting: a cool, dim ambient and a low warm "sunset" key light.
      const ambient = new THREE.AmbientLight("#7f97d8", 2.1);
      const sun = new THREE.DirectionalLight("#ffc98a", 1.1);
      sun.position.set(-1, 0.35, 0.6);
      g.lights([ambient, sun]);

      // ---- polygons: country outlines far out, municipality borders up close
      const tourCap = new THREE.MeshBasicMaterial({
        color: "#f6a93b",
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
      const tourCapHover = tourCap.clone();
      tourCapHover.opacity = 0.42;
      const noCap = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const countries = geo.filter((f) => f.properties.k === "c");
      const munis = geo.filter((f) => f.properties.k === "m");
      let hovered: Feature | null = null;
      let showingCountries: boolean | null = null;

      // Keep borders hugging the ground (~40-50 m) so they don't float when zoomed in close.
      g.polygonAltitude((f) => ((f as Feature).properties.tour ? 0.000008 : 0.000006))
        .polygonCapMaterial((f) =>
          (f as Feature).properties.tour ? (f === hovered ? tourCapHover : tourCap) : noCap,
        )
        .polygonSideColor(() => "rgba(0,0,0,0)")
        .polygonStrokeColor((f) => {
          const p = (f as Feature).properties;
          if (p.k === "c") return "rgba(214,224,245,0.32)";
          return p.tour ? "rgba(255,210,122,0.9)" : "rgba(214,224,245,0.28)";
        })
        .polygonsTransitionDuration(0)
        // Only the filled areas should react to the pointer. globe.gl's default line
        // threshold (0.2 units ≈ 13 km) let border lines - often a neighbour's - catch
        // the pointer from far away once zoomed in.
        .lineHoverPrecision(0)
        .onPolygonHover((f) => {
          const next = f && (f as Feature).properties.tour ? (f as Feature) : null;
          if (next === hovered) return;
          hovered = next;
          el.style.cursor = next ? "pointer" : "";
          g.polygonCapMaterial(g.polygonCapMaterial());
        })
        .onPolygonClick((f) => {
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
      let borderMode = "";
      const applyZoom = (alt: number) => {
        const mode = alt > MUNI_MAX ? "c" : alt > COUNTRY_MIN ? "cm" : "m";
        if (mode === borderMode) return;
        borderMode = mode;
        g.polygonsData(mode === "c" ? countries : mode === "m" ? munis : [...countriesOutsideSlovenia, ...munis]);
      };

      // ---- Labels: greedy placement by importance, using projected screen positions
      // (no DOM measuring), so it can run every frame while the globe moves.
      const LABEL_H = 24;
      const labelW = new Map<string, number>();
      const shown = new Set<string>();
      const declutter = () => {
        const alt = g.pointOfView().altitude;
        const cam = g.camera().position;
        const camLen2 = cam.x * cam.x + cam.y * cam.y + cam.z * cam.z;
        const W = el.clientWidth;
        const H = el.clientHeight;
        const budget = labelBudget(alt);
        const near = nearRef.current;
        const selected = [...markers.current.entries()].find(([, m]) => m.classList.contains("is-selected"))?.[0];

        const candidates = toursRef.current
          .filter((t) => t.lat != null && labelEligible(t, alt, focusRef.current, { selectedId: selected ?? null, nearIds: near }))
          .sort((a, b) =>
            Number(b.id === selected) - Number(a.id === selected) ||
            Number(near.has(b.id)) - Number(near.has(a.id)) ||
            importance(b) - importance(a),
          );

        // Keep labels clear of the page's own text and controls.
        const host = el.getBoundingClientRect();
        const placed: { l: number; r: number; t: number; b: number }[] = [];
        document.querySelectorAll(".hero h1, .hero p, .hero .stats, .hero .why, .topbar > *, .finder, .cards > *, .panel, .chat, .footer, .corner").forEach((n) => {
          const r = n.getBoundingClientRect();
          if (r.width && r.height && getComputedStyle(n).opacity !== "0")
            placed.push({ l: r.left - host.left, r: r.right - host.left, t: r.top - host.top, b: r.bottom - host.top });
        });
        // The "You are here" label always shows; other labels make room for it.
        const me = youRef.current;
        if (me) {
          const sc = g.getScreenCoords(me.lat, me.lng, 0);
          const w = me.label.length * 6.9 + 30;
          placed.push({ l: sc.x - w / 2, r: sc.x + w / 2, t: sc.y - 44, b: sc.y + 10 });
        }
        const next = new Set<string>();
        for (const t of candidates) {
          if (next.size >= budget && t.id !== selected) break;
          const m = markers.current.get(t.id);
          if (!m || !m.isConnected) continue;
          // Skip points on the far side of the globe (p·c must exceed R² to be in view).
          const p = g.getCoords(t.lat!, t.lng!, 0);
          if (p.x * cam.x + p.y * cam.y + p.z * cam.z <= R * R * (1 + 1e-9) && camLen2 > R * R) continue;
          const sc = g.getScreenCoords(t.lat!, t.lng!, 0);
          if (sc.x < 0 || sc.y < 0 || sc.x > W || sc.y > H) continue;
          let w = labelW.get(t.id);
          if (w == null) {
            w = (m.querySelector(".marker__label")!.textContent ?? "").length * 6.9 + 18;
            labelW.set(t.id, w);
          }
          const lift = t.kind === "obcina" ? 15 : 11;
          const box = { l: sc.x - w / 2 - 4, r: sc.x + w / 2 + 4, t: sc.y - lift - LABEL_H - 3, b: sc.y - lift + 3 };
          if (placed.some((q) => box.l < q.r && box.r > q.l && box.t < q.b && box.b > q.t)) continue;
          placed.push(box);
          next.add(t.id);
        }
        for (const id of shown) if (!next.has(id)) markers.current.get(id)?.classList.remove("has-label");
        for (const id of next) if (!shown.has(id)) markers.current.get(id)?.classList.add("has-label");
        shown.clear();
        next.forEach((id) => shown.add(id));
      };
      let declutterRaf = 0;
      let declutterTimer = 0;
      const scheduleDeclutter = () => {
        if (quietRef.current) return;
        // At most once per frame while moving, plus once more when the motion settles.
        if (!declutterRaf) declutterRaf = requestAnimationFrame(() => { declutterRaf = 0; declutter(); });
        window.clearTimeout(declutterTimer);
        declutterTimer = window.setTimeout(declutter, 200);
      };
      labelsRef.current = scheduleDeclutter;

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
        fitClipping(pov.altitude);
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
          const t = d as Tour;
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
            markers.current.set(t.id, m);
          }
          return m;
        });

      const controls = g.controls();
      controls.autoRotate = false;
      // Allow zooming down to ~160 m above the ground (globe radius = 6371 km).
      controls.minDistance = R * (1 + 0.000025);
      // Fired only by the visitor's own gestures, never by our camera flights.
      controls.addEventListener("start", () => onExploreRef.current?.());
      fitClipping(START.altitude);

      const onResize = () => g.width(el.clientWidth).height(el.clientHeight);
      window.addEventListener("resize", onResize);

      globe.current = g;
      // Handy for automated visual checks in development.
      if (process.env.NODE_ENV !== "production") (window as unknown as { __globe: GlobeInstance }).__globe = g;
      g.htmlElementsData(markerData());
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

      cleanup = () => {
        window.clearTimeout(t);
        window.clearTimeout(declutterTimer);
        cancelAnimationFrame(declutterRaf);
        window.removeEventListener("resize", onResize);
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
    globe.current?.htmlElementsData(markerData());
    labelsRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tours, you?.lat, you?.lng, you?.precise, you?.label, studio?.lat, studio?.lng, studio?.label]);

  // Pins come back after a quiet flight: place their labels for where the camera is now.
  useEffect(() => {
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
    const g = globe.current;
    if (!g) return;
    if (paused) g.pauseAnimation();
    else g.resumeAnimation();
  }, [paused]);

  return <div ref={host} className="globe" data-labels="off" />;
}

export { SLOVENIA };
