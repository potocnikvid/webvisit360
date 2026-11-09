import type { PlaceType, Tour } from "./types";

type Marked = Pick<Tour, "id" | "type" | "kind">;

/** Below this altitude municipality names may be labelled; other places below PLACE_LABEL_ALT. */
export const MUNI_LABEL_ALT = 0.5;
export const PLACE_LABEL_ALT = 0.25;

/** With a type chosen, every other place shrinks to a small unnamed dot. */
export const isDimmed = (t: Marked, focus: PlaceType | "all") => focus !== "all" && t.type !== focus;

/** Whether a place may compete for a name label at this altitude (globe radii). */
export function labelEligible(
  t: Marked,
  alt: number,
  focus: PlaceType | "all",
  { selectedId, nearIds, revealAlt }: { selectedId: string | null; nearIds: Set<string>; revealAlt?: number },
): boolean {
  if (t.id === selectedId || nearIds.has(t.id)) return true;
  // Faint dots (another type chosen) get their names once zoomed in enough for their
  // importance (see lib/dots labelAltitude).
  if (isDimmed(t, focus)) return revealAlt != null && alt < revealAlt;
  if (focus !== "all") return alt < MUNI_LABEL_ALT;
  return t.kind === "obcina" ? alt < MUNI_LABEL_ALT : alt < PLACE_LABEL_ALT;
}
