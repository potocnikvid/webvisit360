import { expect, test } from "vitest";
import data from "../public/data/tours.json";
import { MAIN_TYPES, PLACE_TYPES } from "./types";

type Item = { kind: string; type?: string };
const items = data.items as Item[];

test("every place has a known type", () => {
  for (const t of items) expect(PLACE_TYPES).toContain(t.type);
});

test("main chips are a subset in spec order", () => {
  expect(MAIN_TYPES).toEqual(["obcina", "nastanitve", "vino", "gostinstvo", "trgovine", "zdravje"]);
});

test("all 17 občine are typed obcina", () => {
  const obcine = items.filter((t) => t.kind === "obcina");
  expect(obcine).toHaveLength(17);
  expect(obcine.every((t) => t.type === "obcina")).toBe(true);
});
