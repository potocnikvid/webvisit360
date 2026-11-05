import { expect, test } from "vitest";
import { copy, pickLang } from "./i18n";
import { PLACE_TYPES } from "./types";

test.each([[["sl-SI"]], [["hr"]], [["sr-Latn"]], [["bs"]], [[]]])("pickLang(%j) is Slovenian", (langs) => {
  expect(pickLang(langs)).toBe("sl");
});

test("the first preferred language wins", () => {
  expect(pickLang(["de-DE", "sl"])).toBe("en");
  expect(pickLang(["en-GB"])).toBe("en");
});

test("every place type has a label in both languages", () => {
  for (const t of PLACE_TYPES) {
    expect(copy.sl.types[t]).toBeTruthy();
    expect(copy.en.types[t]).toBeTruthy();
  }
});

const keys = (o: object, prefix = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );

test("Slovenian and English have the same keys", () => {
  expect(keys(copy.en).sort()).toEqual(keys(copy.sl).sort());
});
