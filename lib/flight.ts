export type Pov = { lat: number; lng: number; altitude: number };

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
/** Sine ease in-out: a gentle start and landing, and a lower top speed than cubic. */
const ease = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;
const wrap = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180;

/** Share of the flight in which the camera moves sideways; the rest is climbing or diving. */
const MOVE_SHARE = 0.7;

/**
 * Camera at time t (0..1) on a flight that rises towards `peak` and comes down again.
 * Altitude moves on a log scale, so zooming feels steady. Going down, the camera reaches
 * the target first and then dives; going up, it climbs first and then moves.
 */
export function arcPov(from: Pov, to: Pov, t: number, peak: number): Pov {
  t = clamp01(t);
  if (t === 0) return from;
  const down = to.altitude < from.altitude;
  const move = ease(clamp01(down ? t / MOVE_SHARE : (t - (1 - MOVE_SHARE)) / MOVE_SHARE));
  const e = ease(t);

  const dLng = ((to.lng - from.lng + 540) % 360) - 180;
  // log(altitude) follows l0 + d·e + k·e(1-e): k is chosen so the curve tops out at the peak.
  const l0 = Math.log(from.altitude);
  const d = Math.log(to.altitude) - l0;
  const h = Math.log(peak) - l0;
  const k = h > Math.max(0, d) ? 2 * h - d + 2 * Math.sqrt(h * (h - d)) : 0;
  return {
    lat: from.lat + (to.lat - from.lat) * move,
    lng: wrap(from.lng + dLng * move),
    altitude: Math.exp(l0 + d * e + k * e * (1 - e)),
  };
}

/**
 * How high a flight between two views should rise: just enough to keep both ends roughly in
 * sight at the top (half the screen spans ~27° per unit of altitude), never above the higher
 * end for short hops. So a nearby dive barely lifts, and a flight back never overshoots.
 */
export function peakFor(a: Pov, b: Pov): number {
  const lat = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dLng = ((b.lng - a.lng + 540) % 360) - 180;
  const dist = Math.hypot(b.lat - a.lat, dLng * Math.cos(lat)); // degrees
  return Math.min(2.5, Math.max(a.altitude, b.altitude, dist / 30));
}

/** How close a click on a place brings the camera: towns stay in view, other places closer. */
export const SELECT_ALTITUDE = { obcina: 0.03, place: 0.01 } as const;

/**
 * The flight to a place picked on the map or in search. From further out it dives to the
 * place's usual view; from closer in it keeps the zoom and only glides the place into view,
 * so picking a dot in a town never throws the visitor back out of it.
 */
export function selectFlight(kind: string, from?: Pov): { altitude: number; ms?: number } {
  const target = kind === "obcina" ? SELECT_ALTITUDE.obcina : SELECT_ALTITUDE.place;
  if (!from || from.altitude > target) return { altitude: target };
  return { altitude: from.altitude, ms: 900 };
}
