"use client";

import { useEffect, useRef, useState } from "react";
import PanoPreview from "./PanoPreview";
import type { Tour } from "@/lib/types";
import type { Copy } from "@/lib/i18n";

/** [photoId, image base url, lat, lng] */
type Scene = [string, string, number | null, number | null];

let scenesCache: Promise<Record<string, Scene[]>> | null = null;
const loadScenes = () =>
  (scenesCache ??= fetch("/data/google-scenes.json").then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  }));

const img = (base: string, w: number) => `${base}=w${w}-h${w / 2}-k-no`;

/** Full-screen in-site viewer for a place's Google Maps 360 photos. */
export default function GoogleTour({ tour, copy: t }: { tour: Tour; copy: Copy }) {
  const [scenes, setScenes] = useState<Scene[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [i, setI] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  // Phones get 2048 px; desktops 4096 px (Google serves up to the original resolution).
  const hi = typeof window !== "undefined" && Math.max(screen.width, screen.height) * devicePixelRatio > 1600 ? 4096 : 2048;

  useEffect(() => {
    setI(0);
    loadScenes()
      .then((all) => setScenes(all[tour.id] ?? []))
      .catch(() => setFailed(true));
  }, [tour.id]);

  const n = scenes?.length ?? 0;
  const go = (d: number) => n && setI((x) => (x + d + n) % n);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Keep the active thumbnail in view.
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>(`[data-i="${i}"]`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [i]);

  // Warm the cache for the next panorama.
  useEffect(() => {
    if (!scenes || n < 2) return;
    const next = new Image();
    next.crossOrigin = "anonymous";
    next.src = img(scenes[(i + 1) % n][1], 2048);
  }, [i, scenes, n]);

  if (failed || (scenes && n === 0)) {
    return (
      <div className="gtour__empty">
        <p>{t.viewer.failed}</p>
        {tour.mapsUrl && (
          <a className="btn btn--amber" href={tour.mapsUrl} target="_blank" rel="noopener">
            {t.panel.openInMaps}
          </a>
        )}
      </div>
    );
  }
  if (!scenes) return <div className="gtour__empty">{t.viewer.loadingTour}</div>;

  const cur = scenes[i];
  return (
    <div className="gtour">
      <PanoPreview full copy={t} src={[img(cur[1], 1024), img(cur[1], hi)]} alt={`${tour.name}, ${t.viewer.panorama(i + 1)}`} />
      {n > 1 && (
        <>
          <button className="gtour__arrow gtour__arrow--prev" onClick={() => go(-1)} aria-label={t.viewer.prev}>
            ‹
          </button>
          <button className="gtour__arrow gtour__arrow--next" onClick={() => go(1)} aria-label={t.viewer.next}>
            ›
          </button>
        </>
      )}
      <div className="gtour__bottom">
        <span className="gtour__count">
          {i + 1} / {n}
        </span>
        {n > 1 && (
          <div className="gtour__strip" ref={strip}>
            {scenes.map((s, k) => (
              <button key={s[0]} data-i={k} className={k === i ? "is-on" : ""} onClick={() => setI(k)} aria-label={t.viewer.panorama(k + 1)}>
                <img src={`${s[1]}=w160-h90-k-no`} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}
        {tour.mapsUrl && (
          <a className="gtour__maps" href={`https://www.google.com/maps/@${cur[2] ?? tour.lat},${cur[3] ?? tour.lng},3a,75y,90t/data=!3m4!1e1!3m2!1s${cur[0]}!2e10`} target="_blank" rel="noopener">
            Google Zemljevidi ↗
          </a>
        )}
      </div>
    </div>
  );
}
