import { expect, test } from "vitest";
import { FEATURED, FLAGSHIP, featured } from "./featured";
import type { Tour } from "./types";
import tours from "../public/data/tours.json";

const all = (tours as { items: Tour[] }).items;
const LJUBLJANA = { lat: 46.0569, lng: 14.5058 };
const CELJE = { lat: 46.2309, lng: 15.2604 };
const MARIBOR = { lat: 46.5547, lng: 15.6459 };
const VIENNA = { lat: 48.2082, lng: 16.3738 };

test("every hand-picked tour exists, has a location and a picture", () => {
  for (const id of FEATURED) {
    const t = all.find((x) => x.id === id);
    expect(t, id).toBeTruthy();
    expect(t!.lat, id).not.toBeNull();
    expect(t!.cover, id).toBeTruthy();
  }
});

test("Ljubljana gets the Grand Plaza", () => {
  expect(featured(all, LJUBLJANA)).toMatchObject({ tour: { id: "grand-plaza" }, near: true });
});

test("Celje gets a standout tour nearby, not the capital's", () => {
  const f = featured(all, CELJE)!;
  expect(f.near).toBe(true);
  expect(f.km!).toBeLessThan(15);
  expect(f.tour.id).not.toBe(FLAGSHIP);
});

test("Maribor gets its own", () => {
  expect(featured(all, MARIBOR)!.km!).toBeLessThan(15);
});

test("far away or unknown: the flagship, marked as not near", () => {
  expect(featured(all, VIENNA)).toMatchObject({ tour: { id: FLAGSHIP }, near: false });
  expect(featured(all, null)).toMatchObject({ tour: { id: FLAGSHIP }, near: false, km: null });
});

test("never repeats the place already shown in the 'closest to you' card", () => {
  expect(featured(all, LJUBLJANA, "grand-plaza")!.tour.id).not.toBe("grand-plaza");
});
