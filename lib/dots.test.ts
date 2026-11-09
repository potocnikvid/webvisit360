import { describe, expect, test } from "vitest";
import { dotLook, nearest, pinIds } from "./dots";

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
