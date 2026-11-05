"use client";

import type { Copy } from "@/lib/i18n";
import type { Tour } from "@/lib/types";

type Props = {
  place: Tour;
  km: number;
  others: number;
  copy: Copy;
  locationError: boolean;
  onOpen: () => void;
  /** Absent once the exact location is known. */
  onPrecise?: () => void;
};

/** "Closest to you" card shown after the fly-in to the visitor. */
export default function NearYou({ place, km, others, copy: t, locationError, onOpen, onPrecise }: Props) {
  return (
    <section className="near" aria-label={t.near.kicker}>
      <p className="near__kicker">
        {t.near.kicker} · {km < 1 ? "< 1" : Math.round(km)} km
      </p>
      <h2 className="near__title">{place.name}</h2>
      {others > 0 && <p className="near__others">{t.near.others(others)}</p>}
      <div className="near__actions">
        <button className="btn btn--amber" onClick={onOpen}>
          {t.panel.enter}
        </button>
        {onPrecise && (
          <button className="near__precise" onClick={onPrecise}>
            {locationError ? t.near.denied : t.near.precise}
          </button>
        )}
      </div>
    </section>
  );
}
