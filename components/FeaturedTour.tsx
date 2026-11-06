"use client";

import type { Featured } from "@/lib/featured";
import type { Copy } from "@/lib/i18n";

type Props = {
  item: Featured;
  copy: Copy;
  /** Open the tour itself. */
  onEnter: () => void;
  /** Fly to it and show its panel. */
  onShow: () => void;
};

/** A standout tour near the visitor, ready to open before they start exploring. */
export default function FeaturedTour({ item: { tour, km, near }, copy: t, onEnter, onShow }: Props) {
  const kicker = near && km != null ? t.featured.near(km < 1 ? "< 1 km" : `${Math.round(km)} km`) : t.featured.flagship;
  const meta = [tour.place && tour.place !== tour.name ? tour.place : null, tour.scenes ? t.panoramas(tour.scenes) : null].filter(Boolean).join(" · ");
  return (
    <section className="near featured" aria-label={kicker}>
      <button className="featured__media" onClick={onShow} aria-label={`${t.featured.show}: ${tour.name}`}>
        <span
          className={`featured__img ${tour.pano ? "is-pano" : ""}`}
          style={{ backgroundImage: `url(${JSON.stringify(tour.cover)})` }}
          aria-hidden
        />
        <span className="featured__360" aria-hidden>
          360°
        </span>
      </button>
      <p className="near__kicker">{kicker}</p>
      <h2 className="near__title">{tour.name}</h2>
      {meta && <p className="near__others">{meta}</p>}
      <div className="near__actions">
        <button className="btn btn--amber" onClick={onEnter}>
          {t.panel.enter}
        </button>
        <button className="near__precise" onClick={onShow}>
          {t.featured.show}
        </button>
      </div>
    </section>
  );
}
