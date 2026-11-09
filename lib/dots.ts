import type { PlaceType, Tour } from "./types";
import { isDimmed } from "./markers";

/** Colour as 0–1 sRGB components plus alpha. */
export type Rgba = [number, number, number, number];

/**
 * How a plain map dot is drawn, in CSS pixels. It mirrors the HTML pin's CSS
 * (`.marker__dot` with its two box-shadows: a dark outline ring and a soft glow), so a dot
 * drawn on the map and an HTML pin look the same.
 */
export type DotLook = {
  size: number;
  color: Rgba;
  ring: number;
  ringColor: Rgba;
  /** Box-shadow blur and spread of the glow. */
  blur: number;
  spread: number;
  glowColor: Rgba;
};

const rgba = (r: number, g: number, b: number, a = 1): Rgba => [r / 255, g / 255, b / 255, a];
const NONE: Rgba = [0, 0, 0, 0];
const AMBER = rgba(246, 169, 59);
const SKY = rgba(124, 196, 255);
const INK = (a: number) => rgba(8, 18, 48, a);

/** Matches .marker--business / --google / .is-focus / .is-dim in globals.css. */
export function dotLook(t: Pick<Tour, "id" | "kind" | "type">, focus: PlaceType | "all"): DotLook {
  if (isDimmed(t, focus))
    return { size: 4, color: rgba(214, 224, 245, 0.55), ring: 0, ringColor: NONE, blur: 0, spread: 0, glowColor: NONE };
  if (focus !== "all")
    return { size: 12, color: AMBER, ring: 2, ringColor: INK(0.6), blur: 16, spread: 4, glowColor: rgba(246, 169, 59, 0.65) };
  if (t.kind === "google")
    return { size: 6, color: SKY, ring: 1.5, ringColor: INK(0.6), blur: 10, spread: 2, glowColor: rgba(124, 196, 255, 0.45) };
  return { size: 7, color: AMBER, ring: 2, ringColor: INK(0.55), blur: 14, spread: 3, glowColor: rgba(246, 169, 59, 0.55) };
}

/**
 * Which places get a real HTML pin; every other place is a dot drawn on the map, which costs
 * nothing per frame. Pins are the ones that need more than a dot: municipalities (their
 * beacon), the selected and nearby places (rings), the one under the mouse, and any with a
 * name label showing.
 */
export function pinIds(
  tours: Pick<Tour, "id" | "kind">[],
  { selectedId, nearIds, hoveredId, labelled }: { selectedId: string | null; nearIds: Set<string>; hoveredId: string | null; labelled: Set<string> },
): Set<string> {
  const ids = new Set<string>(labelled);
  for (const t of tours) if (t.kind === "obcina" || nearIds.has(t.id)) ids.add(t.id);
  if (selectedId) ids.add(selectedId);
  if (hoveredId) ids.add(hoveredId);
  return ids;
}

/** Index of the screen point nearest to (x, y) within `radius` px, or -1. NaN points are skipped. */
export function nearest(xs: Float32Array, ys: Float32Array, x: number, y: number, radius: number): number {
  let best = -1;
  let bestD = radius * radius;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - x;
    const dy = ys[i] - y;
    const d = dx * dx + dy * dy;
    if (d <= bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
