export type Pov = { lat: number; lng: number; altitude: number };

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const ease = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
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
