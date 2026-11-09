import { describe, expect, test } from "vitest";
import { APPEAR_DELAY, FADE_MS, LabelTimeline, chooseLabels, labelBudget, type Box } from "./labels";

const box = (l: number, t = 0, w = 40): Box => ({ l, r: l + w, t, b: t + 20 });

describe("chooseLabels", () => {
  test("a name already showing keeps its place against a more important newcomer", () => {
    const { keep, fresh } = chooseLabels([{ id: "shown", box: box(0) }], [{ id: "important", box: box(20) }], [], 10);
    expect([...keep]).toEqual(["shown"]);
    expect(fresh).toEqual([]);
  });

  test("newcomers fill the gaps, most important first, up to the budget", () => {
    const { fresh } = chooseLabels([], [{ id: "a", box: box(0) }, { id: "b", box: box(10) }, { id: "c", box: box(100) }, { id: "d", box: box(200) }], [], 2);
    expect(fresh).toEqual(["a", "c"]);
  });

  test("showing names may stay a little past the budget; the page's own text still wins", () => {
    const incumbents = [0, 100, 200].map((l, i) => ({ id: `s${i}`, box: box(l) }));
    expect(chooseLabels(incumbents, [], [], 2).keep.size).toBe(3);
    expect([...chooseLabels(incumbents, [], [box(95, 0, 20)], 10).keep]).toEqual(["s0", "s2"]);
  });
});

describe("labelBudget", () => {
  test("grows smoothly from 18 far away to 60 up close", () => {
    expect(labelBudget(0.3)).toBe(18);
    expect(labelBudget(0.005)).toBe(60);
    const mid = [0.1, 0.08, 0.06, 0.05].map(labelBudget);
    expect(mid).toEqual([...mid].sort((a, b) => a - b));
    expect(Math.max(...mid.slice(1).map((v, i) => v - mid[i]))).toBeLessThan(8);
  });
});

describe("LabelTimeline", () => {
  test("a new name appears only after it has kept fitting for a moment", () => {
    const tl = new LabelTimeline();
    expect(tl.update(new Set(), ["a"], 0).added).toEqual([]);
    expect(tl.update(new Set(), ["a"], APPEAR_DELAY - 1).added).toEqual([]);
    expect(tl.update(new Set(), ["a"], APPEAR_DELAY).added).toEqual(["a"]);
  });

  test("a name that only flickers into place while zooming never appears", () => {
    const tl = new LabelTimeline();
    tl.update(new Set(), ["a"], 0);
    tl.update(new Set(), [], 100);
    expect(tl.update(new Set(), ["a"], APPEAR_DELAY + 10).added).toEqual([]);
  });

  test("the selected and nearby places get their names at once", () => {
    const tl = new LabelTimeline();
    expect(tl.update(new Set(), ["sel"], 0, (id) => id === "sel").added).toEqual(["sel"]);
  });

  test("a name that goes keeps its pin while it fades out", () => {
    const tl = new LabelTimeline();
    tl.update(new Set(), ["a"], 0, () => true);
    const out = tl.update(new Set(), [], 1000);
    expect(out.removed).toEqual(["a"]);
    expect(tl.pinned.has("a")).toBe(true);
    expect(out.again).toBe(FADE_MS);
    expect(tl.update(new Set(), [], 1000 + FADE_MS).expired).toEqual(["a"]);
    expect(tl.pinned.has("a")).toBe(false);
  });
});
