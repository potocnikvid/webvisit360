import { describe, expect, test } from "vitest";
import { countWithin, distanceKm, nearest } from "./nearby";
import type { PlaceType, Tour } from "./types";

const CELJE = { lat: 46.2397, lng: 15.2677 };

const place = (id: string, type: PlaceType, lat: number | null, lng: number | null, views: number | null = null): Tour => ({
  id, type, lat, lng, views,
  kind: type === "obcina" ? "obcina" : "business",
  source: "kuula", name: id, place: null, approx: false, url: "", cover: null, pano: false, scenes: null, highlights: [],
});

const fixture = [
  place("zalec", "obcina", 46.2516, 15.1648),
  place("prebold", "obcina", 46.237, 15.0925),
  place("polzela", "obcina", 46.2805, 15.0729),
  place("postojna", "obcina", 45.7743, 14.2153),
  place("nowhere", "obcina", null, null),
  place("far-winery", "vino", 45.7, 13.9),
];

test("distanceKm Celje to Žalec is about 8 km", () => {
  const km = distanceKm(CELJE, { lat: 46.2516, lng: 15.1648 });
  expect(km).toBeGreaterThan(7.5);
  expect(km).toBeLessThan(8.5);
});

describe("nearest", () => {
  test("ranks by distance within a type and skips places without coordinates", () => {
    const ids = nearest(fixture, CELJE, { type: "obcina", limit: 10 }).map((r) => r.tour.id);
    expect(ids.slice(0, 2)).toEqual(["zalec", "prebold"]);
    expect(ids).not.toContain("nowhere");
  });

  test("has no radius cut-off for rare types", () => {
    const [first] = nearest(fixture, CELJE, { type: "vino", limit: 3 });
    expect(first.tour.id).toBe("far-winery");
    expect(first.km).toBeGreaterThan(100);
  });

  test("prefers the more prominent of two places within 2 km", () => {
    const close = [place("quiet", "nastanitve", 46.24, 15.268, 10), place("famous", "nastanitve", 46.244, 15.27, 5000)];
    expect(nearest(close, CELJE, { limit: 2 }).map((r) => r.tour.id)).toEqual(["famous", "quiet"]);
  });
});

test("countWithin counts only located places within the radius", () => {
  expect(countWithin(fixture, CELJE, 25)).toBe(3);
  expect(countWithin(fixture, CELJE, 25, "vino")).toBe(0);
});
