"use client";

import { useEffect, useRef } from "react";
import type { GlobeInstance } from "globe.gl";
import type { Tour } from "@/lib/types";

type Feature = {
  type: "Feature";
  properties: { k: "c" | "m"; tour: string | null; name?: string };
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

// Above this altitude we draw country outlines; below it, municipalities.
const COUNTRY_ALT = 0.55;
// Below this altitude marker labels become visible.
const LABEL_ALT = 0.5;

const ESRI = (x: number, y: number, l: number) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${l}/${y}/${x}`;

export default function Globe({ tours, geo, selectedId, focus, paused, onSelect, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const globe = useRef<GlobeInstance | null>(null);
  const markers = useRef(new Map<string, HTMLElement>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const toursRef = useRef(tours);
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
        .globeTileEngineMaxLevel(18)
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

      g.polygonAltitude((f) => ((f as Feature).properties.tour ? 0.0012 : 0.0006))
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

      const applyZoom = (alt: number) => {
        const wantCountries = alt > COUNTRY_ALT;
        if (wantCountries !== showingCountries) {
          showingCountries = wantCountries;
          g.polygonsData(wantCountries ? countries : munis);
        }
        el.dataset.labels = alt < LABEL_ALT ? "on" : "off";
        el.dataset.near = alt < 0.03 ? "on" : "off";
      };
      // Greedy label de-cluttering: bigger tours keep their label, overlapping ones hide.
      let declutterTimer = 0;
      const declutter = () => {
        const near = el.dataset.near === "on";
        const labelsOn = el.dataset.labels === "on";
        const rank = (t: Tour) =>
          (t.kind === "obcina" ? 1e9 : t.kind === "business" ? 1e8 : 0) + (t.views ?? 0) + (t.scenes ?? 0);
        const byId = new Map(toursRef.current.map((t) => [t.id, t]));
        const list = [...markers.current.entries()]
          .map(([id, m]) => ({ m, t: byId.get(id) }))
          .filter((x) => x.t && x.m.isConnected && (x.t.kind === "obcina" ? labelsOn : near))
          // The selected marker always wins.
          .sort((a, b) =>
            Number(b.m.classList.contains("is-selected")) - Number(a.m.classList.contains("is-selected")) ||
            rank(b.t!) - rank(a.t!),
          );
        const placed: DOMRect[] = [];
        markers.current.forEach((m) => m.classList.remove("is-crowded"));
        for (const { m } of list) {
          const r = m.querySelector(".marker__label")!.getBoundingClientRect();
          const hit = placed.some(
            (p) => r.left < p.right + 4 && r.right > p.left - 4 && r.top < p.bottom + 2 && r.bottom > p.top - 2,
          );
          m.classList.toggle("is-crowded", hit);
          if (!hit) placed.push(r);
        }
      };
      const scheduleDeclutter = () => {
        window.clearTimeout(declutterTimer);
        declutterTimer = window.setTimeout(declutter, 120);
      };
      g.onZoom((pov) => {
        applyZoom(pov.altitude);
        scheduleDeclutter();
      });
      applyZoom(START.altitude);

      // ---- HTML markers
      g.htmlElementsData([])
        .htmlLat((d) => (d as Tour).lat!)
        .htmlLng((d) => (d as Tour).lng!)
        .htmlAltitude((d) => ((d as Tour).kind === "obcina" ? 0.002 : (d as Tour).kind === "business" ? 0.0012 : 0.001))
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
            m.querySelector(".marker__label")!.textContent =
              t.kind === "obcina" ? t.name.replace(/^Občina /, "") : t.name;
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
      controls.zoomSpeed = 1.4;
      controls.minDistance = 100.4;

      const onResize = () => g.width(el.clientWidth).height(el.clientHeight);
      window.addEventListener("resize", onResize);

      globe.current = g;
      g.htmlElementsData(toursRef.current.filter((t) => t.lat != null));
      onReady?.();

      // Orchestrated fly-in to Slovenia.
      const t = window.setTimeout(() => g.pointOfView(SLOVENIA, reduced ? 0 : 3800), reduced ? 0 : 700);

      cleanup = () => {
        window.clearTimeout(t);
        window.clearTimeout(declutterTimer);
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
