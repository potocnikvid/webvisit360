import { expect, test } from "vitest";
import { arcPov } from "./flight";

const home = { lat: 46.1, lng: 14.8, altitude: 0.08 };
const studio = { lat: 46.39, lng: 15.57, altitude: 0.0016 };

test("starts where the camera is and ends exactly at the target", () => {
  expect(arcPov(home, studio, 0, 0.2)).toEqual(home);
  const end = arcPov(home, studio, 1, 0.2);
  expect(end.lat).toBeCloseTo(studio.lat, 9);
  expect(end.lng).toBeCloseTo(studio.lng, 9);
  expect(end.altitude).toBeCloseTo(studio.altitude, 9);
});

test("pulls back above both ends before diving when the peak is higher", () => {
  const top = Math.max(...Array.from({ length: 101 }, (_, i) => arcPov(home, studio, i / 100, 0.2).altitude));
  expect(top).toBeGreaterThan(home.altitude);
  expect(top).toBeLessThanOrEqual(0.2 + 1e-9);
});

test("on the way down it arrives over the target before landing", () => {
  const p = arcPov(home, studio, 0.75, 0.2);
  expect(p.lat).toBeCloseTo(studio.lat, 6);
  expect(p.altitude).toBeGreaterThan(studio.altitude * 1.5);
});

test("on the way up it climbs before it moves", () => {
  const p = arcPov(studio, home, 0.3, 0.2);
  expect(p.altitude).toBeGreaterThan(studio.altitude * 3);
  expect(p.lat).toBeCloseTo(studio.lat, 6);
});

test("takes the short way across the antimeridian", () => {
  const mid = arcPov({ lat: 0, lng: 170, altitude: 1 }, { lat: 0, lng: -170, altitude: 1 }, 0.5, 1);
  expect(Math.abs(mid.lng)).toBeGreaterThan(170);
});
