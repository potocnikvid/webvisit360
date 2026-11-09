/**
 * Which place names show on the map, and calm transitions between them.
 *
 * Names that are showing keep their place: each frame they are placed first, and a new name
 * only appears where it fits around them. A new name also has to keep fitting for a moment
 * before it appears (so names you only pass through while zooming never flash), and a name
 * that goes fades out before its pin is dropped.
 */

export type Box = { l: number; r: number; t: number; b: number };

export const overlaps = (a: Box, b: Box) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;

/** How long a new name has to keep fitting before it appears (ms). */
export const APPEAR_DELAY = 220;
/** How long a name takes to fade out (matches .marker__label in globals.css). */
export const FADE_MS = 340;

/** Most names on screen at once: 18 seen from far away, growing smoothly to 60 up close. */
export function labelBudget(alt: number): number {
  const far = 0.15;
  const near = 0.015;
  const k = Math.min(1, Math.max(0, Math.log(far / alt) / Math.log(far / near)));
  return Math.round(18 + (60 - 18) * k);
}

/** Names already showing may stay a little past the budget, so a small zoom doesn't drop them. */
export const keepBudget = (budget: number) => Math.ceil(budget * 1.25);

export type Candidate = { id: string; box: Box };

/** Room a new name needs around it (px), so a little drift doesn't knock it out right away. */
export const NEW_MARGIN = { x: 10, y: 5 };
const grow = (b: Box): Box => ({ l: b.l - NEW_MARGIN.x, r: b.r + NEW_MARGIN.x, t: b.t - NEW_MARGIN.y, b: b.b + NEW_MARGIN.y });

/**
 * Place names: first the ones showing (`incumbents`, most important first), each kept if it
 * still fits; then new ones (`newcomers`, most important first) only where they fit around
 * everything placed with some room to spare (NEW_MARGIN). `blocked` holds the page's own text and controls, the visitor's label
 * and names still fading out.
 */
export function chooseLabels(
  incumbents: Candidate[],
  newcomers: Candidate[],
  blocked: Box[],
  budget: number,
): { keep: Set<string>; fresh: string[] } {
  const placed = [...blocked];
  const keep = new Set<string>();
  const fresh: string[] = [];
  const limit = keepBudget(budget);
  for (const c of incumbents) {
    if (keep.size >= limit) break;
    if (placed.some((q) => overlaps(c.box, q))) continue;
    placed.push(c.box);
    keep.add(c.id);
  }
  for (const c of newcomers) {
    if (keep.size + fresh.length >= budget) break;
    const roomy = grow(c.box);
    if (placed.some((q) => overlaps(roomy, q))) continue;
    placed.push(c.box);
    fresh.push(c.id);
  }
  return { keep, fresh };
}

/**
 * Timing for names: a new name appears once it has fit for APPEAR_DELAY (at once for the
 * selected and nearby places), and a name that goes stays "leaving" for FADE_MS.
 */
export class LabelTimeline {
  shown = new Set<string>();
  /** New names waiting to appear: since when they've fit. */
  pending = new Map<string, number>();
  /** Names fading out: until when. */
  leaving = new Map<string, number>();

  /**
   * One step. Returns what changed, and when to look again (ms from now) if something is
   * still waiting or fading even though nothing moves.
   */
  update(
    keep: Set<string>,
    fresh: string[],
    now: number,
    instant: (id: string) => boolean = () => false,
  ): { added: string[]; removed: string[]; expired: string[]; again: number | null } {
    const next = new Set(keep);
    const freshSet = new Set(fresh);
    for (const id of [...this.pending.keys()]) if (!freshSet.has(id)) this.pending.delete(id);
    for (const id of fresh) {
      const since = this.pending.get(id) ?? now;
      if (instant(id) || now - since >= APPEAR_DELAY) {
        next.add(id);
        this.pending.delete(id);
      } else this.pending.set(id, since);
    }
    const added = [...next].filter((id) => !this.shown.has(id));
    const removed = [...this.shown].filter((id) => !next.has(id));
    for (const id of added) this.leaving.delete(id);
    for (const id of removed) this.leaving.set(id, now + FADE_MS);
    const expired: string[] = [];
    for (const [id, until] of this.leaving) if (until <= now) {
      this.leaving.delete(id);
      expired.push(id);
    }
    this.shown = next;
    const waits = [
      ...[...this.pending.values()].map((since) => since + APPEAR_DELAY - now),
      ...[...this.leaving.values()].map((until) => until - now),
    ];
    return { added, removed, expired, again: waits.length ? Math.max(16, Math.min(...waits)) : null };
  }

  /** Names with a pin right now: showing or still fading out. */
  get pinned(): Set<string> {
    return new Set([...this.shown, ...this.leaving.keys()]);
  }
}
