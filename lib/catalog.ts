import type { Tour } from "./types";

/**
 * The tours as crawlable pages: one page per municipality and business tour, one per town
 * with at least MIN_TOWN_TOURS tours, and an index of everything. Pure functions over the
 * tour list (public/data/tours.json), so the pages are generated at build time.
 */

/** A town gets its own page from this many tours; with fewer it would be a thin page. */
export const MIN_TOWN_TOURS = 2;
/** A business without a real town name is placed in the nearest town within this distance. */
const NEAREST_TOWN_KM = 20;

/** URL-safe, readable slug: "Rogaška Slatina" → "rogaska-slatina". */
export function slugify(s: string): string {
  return s
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Approximate distance in km (equirectangular; plenty for Slovenia). */
export function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const x = ((b.lng - a.lng) * Math.PI) / 180 * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180);
  const y = ((b.lat - a.lat) * Math.PI) / 180;
  return Math.hypot(x, y) * 6371;
}

export type Town = { slug: string; name: string; lat: number; lng: number; tours: Tour[] };
export type PlacePage = { slug: string; tour: Tour; town: string | null };

export type Catalog = {
  /** Every tour with its town (null when it can't be placed). */
  townOf: Map<string, string | null>;
  /** All towns with at least one tour, by name. */
  towns: Town[];
  /** Towns big enough for their own page. */
  townPages: Town[];
  townBySlug: Map<string, Town>;
  /** Municipality and business tours: each has its own page. */
  places: PlacePage[];
  placeBySlug: Map<string, PlacePage>;
  placeById: Map<string, PlacePage>;
};

/** Pages are for tours we made ourselves; Google photo spots are listed on their town's page. */
export const hasOwnPage = (t: Pick<Tour, "kind">) => t.kind !== "google";

export function buildCatalog(items: Tour[]): Catalog {
  // Real town names: municipalities and Google places carry the town from their address.
  // Businesses sometimes carry their own name in `place`; those go to the nearest town.
  const named = new Map<string, { lat: number; lng: number; n: number }>();
  for (const t of items) {
    if (t.kind === "business" || !t.place || t.lat == null || t.lng == null) continue;
    const c = named.get(t.place) ?? { lat: 0, lng: 0, n: 0 };
    c.lat += t.lat;
    c.lng += t.lng;
    c.n += 1;
    named.set(t.place, c);
  }
  const centres = [...named].map(([name, c]) => ({ name, lat: c.lat / c.n, lng: c.lng / c.n }));

  const townOf = new Map<string, string | null>();
  for (const t of items) {
    if (t.place && named.has(t.place)) {
      townOf.set(t.id, t.place);
      continue;
    }
    if (t.lat == null || t.lng == null) {
      townOf.set(t.id, null);
      continue;
    }
    let best: string | null = null;
    let bestKm = NEAREST_TOWN_KM;
    for (const c of centres) {
      const d = km({ lat: t.lat, lng: t.lng }, c);
      if (d < bestKm) {
        bestKm = d;
        best = c.name;
      }
    }
    townOf.set(t.id, best);
  }

  const byTown = new Map<string, Tour[]>();
  for (const t of items) {
    const town = townOf.get(t.id);
    if (town) byTown.set(town, [...(byTown.get(town) ?? []), t]);
  }
  const towns: Town[] = [...byTown]
    .map(([name, tours]) => {
      const c = named.get(name)!;
      return { slug: slugify(name), name, lat: c.lat / c.n, lng: c.lng / c.n, tours };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "sl"));
  const townPages = towns.filter((t) => t.tours.length >= MIN_TOWN_TOURS);

  // One page per own tour; a repeated name gets its town (or a number) added.
  const used = new Set<string>();
  const places: PlacePage[] = items
    .filter(hasOwnPage)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((tour) => {
      const town = townOf.get(tour.id) ?? null;
      let slug = slugify(tour.name) || tour.id;
      if (used.has(slug) && town) slug = `${slug}-${slugify(town)}`;
      for (let i = 2; used.has(slug); i++) slug = `${slugify(tour.name)}-${i}`;
      used.add(slug);
      return { slug, tour, town };
    });

  return {
    townOf,
    towns,
    townPages,
    townBySlug: new Map(townPages.map((t) => [t.slug, t])),
    places,
    placeBySlug: new Map(places.map((p) => [p.slug, p])),
    placeById: new Map(places.map((p) => [p.tour.id, p])),
  };
}

/** The nearest other entries to a point, closest first. */
export function nearestTo<T extends { lat: number | null; lng: number | null }>(
  from: { lat: number; lng: number },
  list: T[],
  n: number,
  skip?: (t: T) => boolean,
): T[] {
  return list
    .filter((t) => t.lat != null && t.lng != null && !skip?.(t))
    .map((t) => ({ t, d: km(from, { lat: t.lat!, lng: t.lng! }) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.t);
}
