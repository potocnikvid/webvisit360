import { describe, expect, test } from "vitest";
import { isNearCountry, parseVisitor } from "./visitor";

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
