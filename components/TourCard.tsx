import { catalog, mapPath, placePath, thumb, typeLabel } from "@/lib/seo";
import { copy } from "@/lib/i18n";
import { fmt, type Tour } from "@/lib/types";

/** One tour in a list: its own page when it has one, else its Google Maps place. */
export default function TourCard({ tour, showType = true }: { tour: Tour; showType?: boolean }) {
  const page = catalog.placeById.get(tour.id);
  const href = page ? placePath(page) : tour.mapsUrl ?? tour.url;
  const external = !page;
  const img = thumb(tour.cover);
  return (
    <li className="doc__card">
      {/* Google's photo server refuses some requests that carry a referrer. */}
      {img && <img src={img} alt="" width={320} height={160} loading="lazy" decoding="async" referrerPolicy="no-referrer" />}
      <div className="doc__card-body">
        {showType && <p className="doc__kicker">{typeLabel(tour.type)}</p>}
        <h3>
          <a href={href} {...(external && { target: "_blank", rel: "noopener" })}>
            {tour.name}
          </a>
        </h3>
        <p className="doc__meta">
          {tour.scenes != null && <span>{copy.sl.panoramas(tour.scenes)}</span>}
          {tour.views != null && <span>{fmt(tour.views)} ogledov</span>}
          {tour.source === "google" && <span>Google Zemljevidi</span>}
        </p>
        <p className="doc__links">
          <a href={mapPath(tour)}>Na zemljevidu</a>
        </p>
      </div>
    </li>
  );
}
