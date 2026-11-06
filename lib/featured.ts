import { distanceKm } from "./nearby";
import type { Tour } from "./types";

/**
 * Hand-picked standout tours, roughly one per region. A visitor is shown the nearest one,
 * ready to open before they start exploring. Edit freely: ids are from public/data/tours.json.
 */
export const FEATURED: readonly string[] = [
  "grand-plaza", // Ljubljana: Grand Plaza Hotel (101 panoramas)
  "7lk8C", // Celje and Savinjska: Hotel A, Žalec
  "7PXhf", // Laško: Hotel Špica
  "79N6P", // Maribor: Outlet Ležišč (1.2 M views)
  "7vbjW", // Slovenska Bistrica: Hotel Zarja
  "7l634", // Ptuj: Muzikafe
  "7qZcn", // Kozjansko: Grad Podsreda
  "7qFQM", // Kamnik and Domžale: Arboretum Volčji Potok
  "7lvsy", // Dolenjska: Posestvo Pule
  "7T32z", // The coast: Panorama Apartments Meli Pu
];

/** Shown when no hand-picked tour is near the visitor, or we don't know where they are. */
export const FLAGSHIP = "grand-plaza";

/** "Near" means within this distance; beyond it the flagship is shown instead. */
const NEAR_KM = 35;

export type Featured = { tour: Tour; km: number | null; near: boolean };

/** The standout tour to offer this visitor: the nearest hand-picked one, else the flagship. */
export function featured(tours: Tour[], from: { lat: number; lng: number } | null, exclude?: string): Featured | null {
  const byId = new Map(tours.map((t) => [t.id, t]));
  const picks = FEATURED.filter((id) => id !== exclude)
    .map((id) => byId.get(id))
    .filter((t): t is Tour => !!t && t.lat != null && t.lng != null);
  if (!picks.length) return null;

  if (from) {
    const ranked = picks
      .map((tour) => ({ tour, km: distanceKm(from, { lat: tour.lat!, lng: tour.lng! }) }))
      .sort((a, b) => a.km - b.km);
    if (ranked[0].km <= NEAR_KM) return { ...ranked[0], near: true };
  }
  const flagship = picks.find((t) => t.id === FLAGSHIP) ?? picks[0];
  return { tour: flagship, km: from ? distanceKm(from, { lat: flagship.lat!, lng: flagship.lng! }) : null, near: false };
}
