import { describe, expect, test } from "vitest";
import { buildCatalog, km, nearestTo, slugify } from "./catalog";
import type { Tour } from "./types";

const tour = (o: Partial<Tour> & Pick<Tour, "id" | "name">): Tour => ({
  kind: "google",
  type: "trgovine",
  source: "google",
  place: null,
  lat: 46.05,
  lng: 14.5,
  approx: false,
  url: `https://example.com/${o.id}`,
  cover: null,
  pano: true,
  scenes: 10,
  views: null,
  highlights: [],
  ...o,
});

describe("slugify", () => {
  test("drops Slovenian accents and punctuation", () => {
    expect(slugify("Rogaška Slatina")).toBe("rogaska-slatina");
    expect(slugify("GŠ Žalec")).toBe("gs-zalec");
    expect(slugify("Đurđa & Co., d.o.o.")).toBe("durda-co-d-o-o");
  });
});

describe("buildCatalog", () => {
  const items = [
    tour({ id: "o1", name: "Občina Žalec", kind: "obcina", type: "obcina", source: "3dvista", place: "Žalec", lat: 46.25, lng: 15.16 }),
    tour({ id: "g1", name: "Pekarna", place: "Žalec", lat: 46.252, lng: 15.165 }),
    tour({ id: "g2", name: "Trgovina", place: "Celje", lat: 46.23, lng: 15.26 }),
    // A business whose `place` is its own name: it goes to the nearest real town.
    tour({ id: "b1", name: "GŠ Žalec", kind: "business", source: "kuula", place: "GŠ Žalec", lat: 46.251, lng: 15.17 }),
    // Far from every town: no town.
    tour({ id: "b2", name: "Koča", kind: "business", source: "kuula", place: "Koča", lat: 46.5, lng: 13.6 }),
    // Same name twice.
    tour({ id: "b3", name: "Inotherm", kind: "business", source: "3dvista", place: "Inotherm", lat: 46.24, lng: 15.27 }),
    tour({ id: "b4", name: "Inotherm", kind: "business", source: "3dvista", place: "Inotherm", lat: 46.252, lng: 15.16 }),
  ];
  const c = buildCatalog(items);

  test("businesses named after themselves are placed in the nearest town; far ones in none", () => {
    expect(c.townOf.get("b1")).toBe("Žalec");
    expect(c.townOf.get("b2")).toBeNull();
    expect(c.townOf.get("g2")).toBe("Celje");
  });

  test("towns with at least two tours get a page; one-tour towns are only listed", () => {
    expect(c.townPages.map((t) => t.slug).sort()).toEqual(["celje", "zalec"]);
    expect(c.townBySlug.get("zalec")!.tours.map((t) => t.id).sort()).toEqual(["b1", "b4", "g1", "o1"]);
  });

  test("own tours (not Google photo spots) get a page each, with unique addresses", () => {
    expect(c.places.map((p) => p.tour.id).sort()).toEqual(["b1", "b2", "b3", "b4", "o1"]);
    const slugs = c.places.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(c.placeById.get("b3")!.slug).toBe("inotherm");
    expect(c.placeById.get("b4")!.slug).toBe("inotherm-zalec");
  });
});

describe("distances", () => {
  test("Ljubljana–Maribor is about 100 km; nearest first", () => {
    expect(km({ lat: 46.051, lng: 14.506 }, { lat: 46.554, lng: 15.646 })).toBeGreaterThan(95);
    expect(km({ lat: 46.051, lng: 14.506 }, { lat: 46.554, lng: 15.646 })).toBeLessThan(110);
    const near = nearestTo({ lat: 46.05, lng: 14.5 }, [{ id: "far", lat: 46.5, lng: 15.6 }, { id: "near", lat: 46.06, lng: 14.51 }], 1);
    expect(near.map((x) => x.id)).toEqual(["near"]);
  });
});
