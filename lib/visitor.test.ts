import { describe, expect, test } from "vitest";
import { asVisitor, isNearCountry, isNearby, parseVisitor } from "./visitor";

const headers = (h: Record<string, string>) => (name: string) => h[name] ?? null;

describe("parseVisitor", () => {
  test("reads Vercel's IP location headers", () => {
    const get = headers({
      "x-vercel-ip-latitude": "46.2397",
      "x-vercel-ip-longitude": "15.2677",
      "x-vercel-ip-city": "Celje",
      "x-vercel-ip-country": "SI",
    });
    expect(parseVisitor(get)).toEqual({ lat: 46.2397, lng: 15.2677, city: "Celje", country: "SI" });
  });

  test("decodes URL-encoded city names", () => {
    const get = headers({ "x-vercel-ip-latitude": "46.25", "x-vercel-ip-longitude": "15.16", "x-vercel-ip-city": "%C5%BDalec" });
    expect(parseVisitor(get)?.city).toBe("Žalec");
  });

  test.each([
    [{ "x-vercel-ip-longitude": "15.2" }],
    [{ "x-vercel-ip-latitude": "abc", "x-vercel-ip-longitude": "15.2" }],
    [{ "x-vercel-ip-latitude": "95", "x-vercel-ip-longitude": "15.2" }],
  ])("returns null for missing or invalid coordinates %#", (h) => {
    expect(parseVisitor(headers(h))).toBeNull();
  });

  test("falls back to the dev visitor when there are no headers", () => {
    expect(parseVisitor(headers({}), "46.24,15.27,Celje,SI")).toEqual({ lat: 46.24, lng: 15.27, city: "Celje", country: "SI" });
  });
});

test("isNearCountry covers Slovenia and its neighbours only", () => {
  expect(isNearCountry("SI")).toBe(true);
  expect(isNearCountry("AT")).toBe(true);
  expect(isNearCountry("DE")).toBe(false);
  expect(isNearCountry(null)).toBe(false);
});

describe("isNearby", () => {
  test("trusts the IP country when it is Slovenia or a neighbour", () => {
    expect(isNearby({ lat: 48.2, lng: 16.37, country: "AT" })).toBe(true);
  });
  test("a precise position near Slovenia counts even with no country (VPN, browser location)", () => {
    expect(isNearby({ lat: 46.24, lng: 15.27, country: null })).toBe(true);
  });
  test("far away with no near country does not count", () => {
    expect(isNearby({ lat: 52.52, lng: 13.4, country: "DE" })).toBe(false);
    expect(isNearby({ lat: 52.52, lng: 13.4, country: null })).toBe(false);
  });
});

describe("asVisitor", () => {
  test("accepts a location from /api/visitor and ignores anything else", () => {
    expect(asVisitor({ lat: 46.25, lng: 15.16, city: "Žalec", country: "SI" })).toEqual({ lat: 46.25, lng: 15.16, city: "Žalec", country: "SI" });
    expect(asVisitor({ lat: 46.25, lng: 15.16 })).toEqual({ lat: 46.25, lng: 15.16, city: null, country: null });
    expect(asVisitor(null)).toBeNull();
    expect(asVisitor({ lat: "46", lng: 15 })).toBeNull();
    expect(asVisitor({ lat: 146, lng: 15 })).toBeNull();
  });
});
