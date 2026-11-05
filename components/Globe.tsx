"use client";

import { useEffect, useRef } from "react";
import type { GlobeInstance } from "globe.gl";
import type { PlaceType, Tour } from "@/lib/types";
import { isDimmed, labelEligible } from "@/lib/markers";

type Feature = {
  type: "Feature";
  properties: { k: "c" | "m"; tour: string | null; n?: string };
  geometry: unknown;
};

export type Look = "satellite" | "soft" | "illustrated";

export type Focus = { lat: number; lng: number; altitude: number; ms?: number; panel?: boolean; key: number };

type Props = {
  tours: Tour[];
  geo: Feature[];
  selectedId: string | null;
  focus: Focus | null;
  paused: boolean;
  onSelect: (id: string) => void;
  onReady?: () => void;
  /** Where the opening fly-in ends (defaults to all of Slovenia). */
  initialView?: { lat: number; lng: number; altitude: number };
  /** Places to ring as "near you". */
  highlightIds?: string[];
  /** The visitor's own position ("You are here"); approximate ones are drawn wider. */
  you?: { lat: number; lng: number; precise: boolean; label: string } | null;
  /** The type chosen in the chips: its places get big dots and names, the rest small dots. */
  focusType?: PlaceType | "all";
  look: Look;
};

type You = NonNullable<Props["you"]>;
const YOU_ID = "__you";

const SLOVENIA = { lat: 46.12, lng: 14.82, altitude: 0.085 };
const START = { lat: 38, lng: 2, altitude: 2.4 };

// Border layers overlap between these altitudes so neither pops in or out at once:
// countries are drawn above COUNTRY_MIN, municipalities below MUNI_MAX.
const COUNTRY_MIN = 0.3;
const MUNI_MAX = 0.9;
// Illustrated look: dotted continents above this altitude, flat land shapes below.
const ILLUS_DOTS_ALT = 0.35;
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
// Sentinel-2 cloudless 2016 by EOX (CC BY 4.0, commercial use allowed with attribution).
// The 2018+ mosaics are CC BY-NC-SA, so they can't be used on a commercial site.
const EOX = (x: number, y: number, l: number) =>
  `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/${l}/${y}/${x}.jpg`;

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
  // Realistic but calmer: even-toned 10 m mosaic, soft daylight, no deep zoom.
  soft: { tiles: EOX, maxLevel: 13, minAlt: 0.0006, ambient: ["#e3e9f6", 1.85], sun: ["#fff0d8", 0.55], atmosphere: ["#a9c1f2", 0.2] },
  // Illustrated: no imagery; dotted continents and flat municipality shapes.
  illustrated: { tiles: null, maxLevel: 0, minAlt: 0.0008, ambient: ["#ffffff", 2.4], sun: ["#ffffff", 0.5], atmosphere: ["#4f74d9", 0.22] },
};

export default function Globe({ tours, geo, selectedId, focus, paused, onSelect, onReady, initialView, highlightIds, you, focusType = "all", look }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const globe = useRef<GlobeInstance | null>(null);
  const markers = useRef(new Map<string, HTMLElement>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const toursRef = useRef(tours);
  const labelsRef = useRef<() => void>(() => {});
  const nearRef = useRef(new Set<string>());
  nearRef.current = new Set(highlightIds);
  const focusRef = useRef(focusType);
  focusRef.current = focusType;
  const youRef = useRef(you);
  youRef.current = you;
  const youEl = useRef<HTMLElement | null>(null);

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
  ];
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
      const noCap = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      // Illustrated look: flat, opaque municipality shapes.
      const flatCap = new THREE.MeshBasicMaterial({ color: "#2c4592" });
      const flatTour = new THREE.MeshBasicMaterial({ color: "#c8862f" });
      const flatTourHover = new THREE.MeshBasicMaterial({ color: "#f6a93b" });
      const flatLand = new THREE.MeshBasicMaterial({ color: "#22397f" });
      const countries = geo.filter((f) => f.properties.k === "c");
      const munis = geo.filter((f) => f.properties.k === "m");
      let hovered: Feature | null = null;
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
        .polygonSideColor(() => "rgba(0,0,0,0)")
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
      // h3 (used for the illustrated dots) rejects Natural Earth's North Korea outline.
      const dotCountries = countriesOutsideSlovenia.filter((f) => f.properties.n !== "North Korea");
      // Building the dots takes a moment, so do it once and afterwards only toggle visibility.
      let dotsBuilt = false;
      const showDots = (on: boolean) => {
        if (on && !dotsBuilt) {
          dotsBuilt = true;
          g.hexPolygonsData(dotCountries);
          // The layer builds its meshes on the next update; re-apply visibility then.
          window.setTimeout(() => showDots(lookRef.current === "illustrated" && borderMode === "dots"), 300);
        }
        g.scene().traverse((o) => {
          if ((o as unknown as { __globeObjType?: string }).__globeObjType === "hexPolygon") o.visible = on;
        });
      };
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
          mode === "c" ? countries : mode === "m" || mode === "dots" ? munis : [...countriesOutsideSlovenia, ...munis],
        );
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
        document.querySelectorAll(".hero h1, .hero p, .hero .stats, .topbar > *, .finder, .panel, .chat, .footer").forEach((n) => {
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
      fitClipping(START.altitude);

      // Dotted continents for the illustrated look (Slovenia itself is drawn as municipalities).
      g.hexPolygonResolution(3)
        .hexPolygonMargin(0.42)
        .hexPolygonUseDots(true)
        .hexPolygonDotResolution(6)
        .hexPolygonAltitude(0.0004)
        .hexPolygonColor(() => "rgba(147,163,196,0.55)")
        .hexPolygonsTransitionDuration(0);

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
      };
      applyLookRef.current = applyLook;
      applyLook(lookRef.current);

      const onResize = () => g.width(el.clientWidth).height(el.clientHeight);
      window.addEventListener("resize", onResize);

      globe.current = g;
      // Handy for automated visual checks in development.
      if (process.env.NODE_ENV !== "production") (window as unknown as { __globe: GlobeInstance }).__globe = g;
      g.htmlElementsData(markerData());
      onReady?.();

      // Orchestrated fly-in to the visitor, or to all of Slovenia.
      const t = window.setTimeout(() => g.pointOfView(initialView ?? SLOVENIA, reduced ? 0 : 3800), reduced ? 0 : 700);

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
  }, [tours, you?.lat, you?.lng, you?.precise, you?.label]);

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
    if (!focus || !globe.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Rough visible half-extent in degrees for globe.gl's default 50° fov.
    const halfH = 26.8 * focus.altitude;
    const w = window.innerWidth;
    const h = window.innerHeight;
    let { lat, lng } = focus;
    if (focus.panel && w <= 760) {
      lat -= halfH * 0.55; // keep the point in the strip above the bottom sheet
    } else if (focus.panel) {
      const halfW = (halfH * (w / h)) / Math.cos((lat * Math.PI) / 180);
      lng += halfW * (Math.min(460, w * 0.4) / w); // nudge left of the side panel
    }
    globe.current.pointOfView(
      { lat, lng, altitude: focus.altitude },
      reduced ? 0 : focus.ms ?? 1600,
    );
  }, [focus]);

  useEffect(() => {
    if (look !== lookRef.current) applyLookRef.current(look);
  }, [look]);

  useEffect(() => {
    const g = globe.current;
    if (!g) return;
    if (paused) g.pauseAnimation();
    else g.resumeAnimation();
  }, [paused]);

  return <div ref={host} className="globe" data-labels="off" />;
}

export { SLOVENIA };
