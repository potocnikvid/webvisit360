import { describe, expect, test } from "vitest";
import { imageryGrade, tileLevel } from "./imagery";

describe("imageryGrade", () => {
  test("the overview keeps its look; the grade is full before the aerial photos load", () => {
    expect(imageryGrade(0.085)).toBe(0); // all of Slovenia
    expect(imageryGrade(0.03)).toBe(0);
    expect(imageryGrade(0.004)).toBe(1);
    expect(imageryGrade(0.0019)).toBe(1); // level 12 territory
  });

  test("it fades in steadily as the camera comes down", () => {
    const a = imageryGrade(0.02);
    const b = imageryGrade(0.01);
    const c = imageryGrade(0.006);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    expect(c).toBeLessThan(1);
  });
});

describe("tileLevel", () => {
  test("reads a tile's level from its width", () => {
    expect(tileLevel((2 * Math.PI) / 2 ** 11)).toBe(11);
    expect(tileLevel((2 * Math.PI) / 2 ** 12)).toBe(12);
    expect(tileLevel((2 * Math.PI) / 8)).toBe(3);
  });
});
