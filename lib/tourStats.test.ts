import { describe, expect, test } from "vitest";
import { basicAuthOk } from "./basicAuth";
import { buildRows, lastMonths, pickMonth, toCounts } from "./tourStats";

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");

describe("lastMonths", () => {
  test("goes back across the year, newest first", () => {
    expect(lastMonths("2026-02", 4)).toEqual(["2026-02", "2026-01", "2025-12", "2025-11"]);
  });
});

describe("pickMonth", () => {
  const now = new Date("2026-11-24T10:00:00Z");
  test("takes a valid past or current month", () => {
    expect(pickMonth("2026-10", now)).toBe("2026-10");
    expect(pickMonth("2026-11", now)).toBe("2026-11");
  });
  test("falls back to this month for missing, malformed or future months", () => {
    expect(pickMonth(undefined, now)).toBe("2026-11");
    expect(pickMonth("2026-13", now)).toBe("2026-11");
    expect(pickMonth("nov", now)).toBe("2026-11");
    expect(pickMonth("2026-12", now)).toBe("2026-11");
  });
});

describe("toCounts", () => {
  test("turns a Redis hash (numbers or strings, or null) into numbers", () => {
    expect(toCounts({ a: 3, b: "5", c: "x" })).toEqual({ a: 3, b: 5 });
    expect(toCounts(null)).toEqual({});
  });
});

describe("buildRows", () => {
  const tours = [
    { id: "a", name: "Občina A", url: "https://a.webvisit360.com", page: "/sprehod/a" },
    { id: "b", name: "Občina B", url: "https://b.webvisit360.com", page: null },
    { id: "c", name: "Občina C", url: "https://c.webvisit360.com", page: null },
  ];
  const months = ["2026-11", "2026-10", "2026-09"];
  const counts: Record<string, number>[] = [{ a: 2, b: 7 }, { a: 5 }, { a: 1, c: 4 }];
  const refs = { b: { direct: 4, "facebook.com": 2, "google.com": 1 }, a: { direct: 2 } };

  test("this month, last month and the whole span per tour, busiest first", () => {
    const rows = buildRows(tours, months, counts, refs);
    expect(rows.map((r) => [r.id, r.month, r.prev, r.span])).toEqual([
      ["b", 7, 0, 7],
      ["a", 2, 5, 8],
      ["c", 0, 0, 4],
    ]);
  });

  test("referring sites sorted by visits", () => {
    expect(buildRows(tours, months, counts, refs)[0].refs).toEqual([
      ["direct", 4],
      ["facebook.com", 2],
      ["google.com", 1],
    ]);
  });
});

describe("basicAuthOk", () => {
  test("accepts the password with any user name", () => {
    expect(basicAuthOk(`Basic ${b64("vid:geslo-č")}`, "geslo-č")).toBe(true);
    expect(basicAuthOk(`Basic ${b64(":geslo")}`, "geslo")).toBe(true);
  });
  test("rejects a wrong, missing or malformed header", () => {
    expect(basicAuthOk(`Basic ${b64("vid:napak")}`, "geslo")).toBe(false);
    expect(basicAuthOk(null, "geslo")).toBe(false);
    expect(basicAuthOk("Bearer abc", "geslo")).toBe(false);
    expect(basicAuthOk("Basic !!!", "geslo")).toBe(false);
  });
  test("never accepts when no password is set", () => {
    expect(basicAuthOk(`Basic ${b64("vid:")}`, "")).toBe(false);
  });
});
