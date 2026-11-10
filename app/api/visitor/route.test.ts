import { expect, test } from "vitest";
import { GET } from "./route";

const get = (headers: Record<string, string>) => GET(new Request("http://localhost/api/visitor", { headers }));

test("returns the approximate location from Vercel's headers, never cached", async () => {
  const res = get({ "x-vercel-ip-latitude": "46.25", "x-vercel-ip-longitude": "15.16", "x-vercel-ip-city": "%C5%BDalec", "x-vercel-ip-country": "SI" });
  expect(await res.json()).toEqual({ lat: 46.25, lng: 15.16, city: "Žalec", country: "SI" });
  expect(res.headers.get("cache-control")).toBe("private, no-store");
});

test("null when the location is unknown", async () => {
  expect(await get({}).json()).toBeNull();
});
