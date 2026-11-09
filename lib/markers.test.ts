import { describe, expect, test } from "vitest";
import { isDimmed, labelEligible } from "./markers";
import type { PlaceType } from "./types";

const place = (id: string, type: PlaceType, kind: "obcina" | "business" | "google" = "business") => ({ id, type, kind });
const hotel = place("hotel", "nastanitve");
const shop = place("shop", "trgovine");
const zalec = place("zalec", "obcina", "obcina");
const none = { selectedId: null, nearIds: new Set<string>() };

describe("isDimmed", () => {
  test("with a type chosen, other types are dimmed", () => {
    expect(isDimmed(shop, "nastanitve")).toBe(true);
    expect(isDimmed(hotel, "nastanitve")).toBe(false);
  });
  test("with All, nothing is dimmed", () => {
    expect(isDimmed(shop, "all")).toBe(false);
  });
});

describe("labelEligible", () => {
  test("dimmed places get no name without a reveal altitude", () => {
    expect(labelEligible(shop, 0.01, "nastanitve", none)).toBe(false);
  });
  test("the chosen type is named from further out than usual", () => {
    expect(labelEligible(hotel, 0.3, "nastanitve", none)).toBe(true);
    expect(labelEligible(hotel, 0.3, "all", none)).toBe(false);
  });
  test("the opened place and the nearest ones are always named", () => {
    expect(labelEligible(shop, 0.4, "nastanitve", { selectedId: "shop", nearIds: new Set() })).toBe(true);
    expect(labelEligible(hotel, 2, "nastanitve", { selectedId: null, nearIds: new Set(["hotel"]) })).toBe(true);
  });
  test("with All, the old altitude rules apply", () => {
    expect(labelEligible(zalec, 0.4, "all", none)).toBe(true);
    expect(labelEligible(shop, 0.2, "all", none)).toBe(true);
    expect(labelEligible(shop, 0.3, "all", none)).toBe(false);
  });
  test("faint dots of other types get names once zoomed in past their reveal altitude", () => {
    expect(labelEligible(shop, 0.02, "nastanitve", { ...none, revealAlt: 0.01 })).toBe(false);
    expect(labelEligible(shop, 0.008, "nastanitve", { ...none, revealAlt: 0.01 })).toBe(true);
  });
});
