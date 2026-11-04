"use client";

import { useEffect, useRef } from "react";
import type { GlobeInstance } from "globe.gl";
import type { Tour } from "@/lib/types";

type Feature = {
  type: "Feature";
  properties: { k: "c" | "m"; tour: string | null; n?: string };
  geometry: unknown;
};

export type Focus = { lat: number; lng: number; altitude: number; ms?: number; panel?: boolean; key: number };

type Props = {
  tours: Tour[];
  geo: Feature[];
  selectedId: string | null;
  focus: Focus | null;
  paused: boolean;
  onSelect: (id: string) => void;
  onReady?: () => void;
};

const SLOVENIA = { lat: 46.12, lng: 14.82, altitude: 0.085 };
const START = { lat: 38, lng: 2, altitude: 2.4 };

// Border layers overlap between these altitudes so neither pops in or out at once:
// countries are drawn above COUNTRY_MIN, municipalities below MUNI_MAX.
const COUNTRY_MIN = 0.3;
const MUNI_MAX = 0.9;
// Below this altitude municipality names may be labelled; other places below PLACE_ALT.
const MUNI_LABEL_ALT = 0.5;
const PLACE_LABEL_ALT = 0.25;
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

export default function Globe({ tours, geo, selectedId, focus, paused, onSelect, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const globe = useRef<GlobeInstance | null>(null);
  const markers = useRef(new Map<string, HTMLElement>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const toursRef = useRef(tours);
  const labelsRef = useRef<() => void>(() => {});
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
        const selected = [...markers.current.entries()].find(([, m]) => m.classList.contains("is-selected"))?.[0];

        const candidates = toursRef.current
          .filter((t) => t.lat != null && (t.kind === "obcina" ? alt < MUNI_LABEL_ALT : alt < PLACE_LABEL_ALT) || t.id === selected)
          .sort((a, b) => Number(b.id === selected) - Number(a.id === selected) || importance(b) - importance(a));

        // Keep labels clear of the page's own text and controls.
        const host = el.getBoundingClientRect();
        const placed: { l: number; r: number; t: number; b: number }[] = [];
        document.querySelectorAll(".hero h1, .hero p, .hero .stats, .topbar > *, .finder, .panel, .enquiry").forEach((n) => {
          const r = n.getBoundingClientRect();
          if (r.width && r.height && getComputedStyle(n).opacity !== "0")
            placed.push({ l: r.left - host.left, r: r.right - host.left, t: r.top - host.top, b: r.bottom - host.top });
        });
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
            markers.current.set(t.id, m);
          }
          return m;
        });

      const controls = g.controls();
      controls.autoRotate = false;
      // Allow zooming down to ~160 m above the ground (globe radius = 6371 km).
      controls.minDistance = R * (1 + 0.000025);
      fitClipping(START.altitude);

      const onResize = () => g.width(el.clientWidth).height(el.clientHeight);
      window.addEventListener("resize", onResize);

      globe.current = g;
      // Handy for automated visual checks in development.
      if (process.env.NODE_ENV !== "production") (window as unknown as { __globe: GlobeInstance }).__globe = g;
      g.htmlElementsData(toursRef.current.filter((t) => t.lat != null));
      onReady?.();

      // Orchestrated fly-in to Slovenia.
      const t = window.setTimeout(() => g.pointOfView(SLOVENIA, reduced ? 0 : 3800), reduced ? 0 : 700);

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
    globe.current?.htmlElementsData(tours.filter((t) => t.lat != null));
  }, [tours]);

  useEffect(() => {
    markers.current.forEach((m, id) => m.classList.toggle("is-selected", id === selectedId));
    labelsRef.current();
  }, [selectedId, tours]);

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
    const g = globe.current;
    if (!g) return;
    if (paused) g.pauseAnimation();
    else g.resumeAnimation();
  }, [paused]);

  return <div ref={host} className="globe" data-labels="off" />;
}

export { SLOVENIA };
