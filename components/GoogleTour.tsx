"use client";

import { useState } from "react";
import type { Tour } from "@/lib/types";
import type { Copy } from "@/lib/i18n";
import { streetViewEmbedUrl } from "@/lib/streetview";

/**
 * A place's Google Maps 360 tour in Google's own Street View embed, with its arrows and the
 * connections between panoramas.
 */
export default function GoogleTour({ tour, copy: t }: { tour: Tour; copy: Copy }) {
  const [loaded, setLoaded] = useState(false);
  const src = streetViewEmbedUrl(tour);

  return (
    <div className="gtour">
      <iframe
        key={src}
        src={src}
        title={tour.name}
        allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setLoaded(true)}
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
