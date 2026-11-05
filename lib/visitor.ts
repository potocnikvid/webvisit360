import { distanceKm } from "./nearby";

/**
 * Where the visitor is: approximate (Vercel's IP geolocation headers) or, once they allow it,
 * precise (the browser's geolocation). Never stored.
 */
export type Visitor = { lat: number; lng: number; city: string | null; country: string | null; precise?: boolean };

/** Slovenia and its neighbours: visitors here get the "near you" fly-in. */
const NEAR_COUNTRIES = new Set(["SI", "HR", "AT", "IT", "HU"]);

export const isNearCountry = (country: string | null) => country != null && NEAR_COUNTRIES.has(country);

const SLOVENIA_CENTRE = { lat: 46.12, lng: 14.82 };

/**
 * Whether to show "near you": in Slovenia or a neighbour by IP, or (when the country is
 * unknown or misleading, e.g. a VPN) within 350 km of Slovenia's centre.
 */
export const isNearby = (v: { lat: number; lng: number; country: string | null }) =>
  isNearCountry(v.country) || distanceKm(v, SLOVENIA_CENTRE) <= 350;

const decode = (s: string | null) => {
  if (!s) return null;
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

const valid = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/**
 * `devFallback` ("lat,lng,City,CC") stands in for the headers locally, where Vercel
 * doesn't add them.
 */
export function parseVisitor(get: (name: string) => string | null, devFallback?: string): Visitor | null {
  const latRaw = get("x-vercel-ip-latitude");
  const lngRaw = get("x-vercel-ip-longitude");
  if (latRaw == null && lngRaw == null && devFallback) {
    const [lat, lng, city, country] = devFallback.split(",");
    return valid(+lat, +lng) ? { lat: +lat, lng: +lng, city: city || null, country: country || null } : null;
  }
  if (!latRaw || !lngRaw) return null;
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!valid(lat, lng)) return null;
  return { lat, lng, city: decode(get("x-vercel-ip-city")), country: get("x-vercel-ip-country") };
}
