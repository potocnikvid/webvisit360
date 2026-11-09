import { describe, expect, test } from "vitest";
import { dotLook, fireHeat, labelAltitude, nearest, pinIds, standing } from "./dots";

const hotel = { id: "hotel", kind: "business", type: "nastanitve" } as const;
const photo = { id: "photo", kind: "google", type: "gostinstvo" } as const;
const zalec = { id: "zalec", kind: "obcina", type: "obcina" } as const;

describe("dotLook", () => {
  test("matches the pins' CSS: amber business dots, smaller blue Google dots", () => {
    expect(dotLook(hotel, "all")).toMatchObject({ size: 7, ring: 2, blur: 14, spread: 3 });
    expect(dotLook(photo, "all")).toMatchObject({ size: 6, ring: 1.5, blur: 10, spread: 2 });
    expect(dotLook(photo, "all").color[2]).toBeCloseTo(1);
  });

  test("with a type chosen, its places grow and the rest become faint unglowing dots", () => {
    expect(dotLook(hotel, "nastanitve")).toMatchObject({ size: 12, blur: 16 });
    expect(dotLook(photo, "nastanitve")).toMatchObject({ size: 4, ring: 0, blur: 0 });
  });
});

describe("pinIds", () => {
  const none = { selectedId: null, nearIds: new Set<string>(), hoveredId: null, labelled: new Set<string>() };

  test("municipalities always get a pin; plain places stay dots", () => {
    expect([...pinIds([hotel, photo, zalec], none)]).toEqual(["zalec"]);
  });

  test("selected, nearby, hovered and labelled places get pins", () => {
    const ids = pinIds([hotel, photo, zalec, { id: "x", kind: "google" }, { id: "y", kind: "google" }], {
      selectedId: "hotel",
      nearIds: new Set(["photo"]),
      hoveredId: "x",
      labelled: new Set(["y"]),
    });
    expect([...ids].sort()).toEqual(["hotel", "photo", "x", "y", "zalec"]);
  });
});

describe("nearest", () => {
  const xs = new Float32Array([10, 50, NaN]);
  const ys = new Float32Array([10, 50, 12]);

  test("picks the closest point within the radius", () => {
    expect(nearest(xs, ys, 14, 12, 9)).toBe(0);
    expect(nearest(xs, ys, 46, 47, 9)).toBe(1);
  });

  test("nothing within the radius, and points on the far side (NaN) never count", () => {
    expect(nearest(xs, ys, 30, 30, 9)).toBe(-1);
    expect(nearest(new Float32Array([NaN]), new Float32Array([12]), 10, 12, 9)).toBe(-1);
  });
});

describe("standing", () => {
  test("ranks places by views (Google photos by photos), most important first; municipalities aside", () => {
    const s = standing([
      { id: "small", kind: "business", source: "kuula", views: 100, scenes: 3 },
      { id: "big", kind: "business", source: "kuula", views: 90_000, scenes: 40 },
      { id: "photo", kind: "google", source: "google", views: null, scenes: 10 },
      { id: "zalec", kind: "obcina", source: "3dvista", views: null, scenes: 99 },
    ]);
    expect(s.get("big")).toBe(0);
    expect(s.get("photo")).toBe(0.5);
    expect(s.get("small")).toBe(1);
    expect(s.has("zalec")).toBe(false);
  });
});

describe("zooming in", () => {
  test("the most important places get names first (from higher up), the rest closer in", () => {
    expect(labelAltitude(0)).toBeGreaterThan(labelAltitude(0.5));
    expect(labelAltitude(0.5)).toBeGreaterThan(labelAltitude(1));
    expect(labelAltitude(1)).toBeGreaterThan(0.003); // still a town-level view
  });

  test("dots fire up smoothly, important ones first, and every one is fully fired in a town", () => {
    expect(fireHeat(0, 0.05)).toBe(0); // all of Slovenia: plain dots
    const top = fireHeat(0, 0.008);
    const low = fireHeat(1, 0.008);
    expect(top).toBeGreaterThan(low);
    expect(fireHeat(0, 0.006)).toBeGreaterThan(fireHeat(0, 0.009)); // grows as you zoom in
    expect(fireHeat(1, 0.0004)).toBe(1);
  });
});
