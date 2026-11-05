import type { PlaceType, Tour } from "./types";

type Point = { lat: number; lng: number };

const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in km. */
export function distanceKm(a: Point, b: Point): number {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const prominence = (t: Tour) => t.views ?? (t.scenes ?? 0) * 1000;

/**
 * Closest places (optionally of one type), however far. Places within the same 2 km
 * band are ordered by prominence, so a famous hotel beats a quiet one next door.
 */
export function nearest(tours: Tour[], from: Point, opts: { type?: PlaceType; limit: number }): { tour: Tour; km: number }[] {
  return tours
    .filter((t) => t.lat != null && t.lng != null && (!opts.type || t.type === opts.type))
    .map((tour) => ({ tour, km: distanceKm(from, { lat: tour.lat!, lng: tour.lng! }) }))
    .sort((a, b) => Math.floor(a.km / 2) - Math.floor(b.km / 2) || prominence(b.tour) - prominence(a.tour) || a.km - b.km)
    .slice(0, opts.limit);
}

export function countWithin(tours: Tour[], from: Point, km: number, type?: PlaceType): number {
  return tours.filter(
    (t) => t.lat != null && t.lng != null && (!type || t.type === type) && distanceKm(from, { lat: t.lat, lng: t.lng }) <= km,
  ).length;
}

/**
 * A globe view showing all the points: centred on their bounding box, zoomed out so the
 * farthest one fits (altitude in globe radii, 0.012–0.35).
 */
export function frameView(points: Point[]): Point & { altitude: number } {
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const centre = { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 };
  const radiusKm = Math.max(...points.map((p) => distanceKm(centre, p)));
  return { ...centre, altitude: Math.min(0.35, Math.max(0.012, (radiusKm * 2) / 2500)) };
}
