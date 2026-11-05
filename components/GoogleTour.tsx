"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Tour } from "@/lib/types";
import type { Copy } from "@/lib/i18n";

/** When to nudge the frame after it loads (ms). */
const NUDGES = [600, 1600, 3200];

/**
 * A place's Google Maps 360 tour in Google's own Street View viewer, with its arrows and
 * connections between panoramas.
 *
 * Google's embed paints the first panorama black until its frame is resized, so after
 * loading (and whenever the tab comes back into view) the frame is briefly narrowed and
 * restored, which makes it repaint.
 */
export default function GoogleTour({ tour, copy: t }: { tour: Tour; copy: Copy }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const timers = useRef<number[]>([]);

  const nudge = useCallback(() => {
    const f = frame.current;
    if (!f) return;
    f.style.width = "99%";
    timers.current.push(window.setTimeout(() => (f.style.width = "100%"), 250));
  }, []);

  const onLoad = () => {
    setLoaded(true);
    for (const ms of NUDGES) timers.current.push(window.setTimeout(nudge, ms));
  };

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "hidden") nudge();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const pending = timers.current;
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      pending.forEach(clearTimeout);
    };
  }, [nudge]);

  return (
    <div className="gtour">
      <iframe
        ref={frame}
        key={tour.url}
        src={tour.url}
        title={tour.name}
        style={{ width: "100%" }}
        allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        onLoad={onLoad}
      />
      {!loaded && <div className="gtour__empty">{t.viewer.loadingTour}</div>}
      {tour.mapsUrl && (
        <a className="gtour__maps" href={tour.mapsUrl} target="_blank" rel="noopener">
          {t.panel.openInMaps}
        </a>
      )}
    </div>
  );
}
