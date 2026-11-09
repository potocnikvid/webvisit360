import { describe, expect, test } from "vitest";
import { arcPov, peakFor, selectFlight } from "./flight";

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

const zalec = { lat: 46.22, lng: 15.15, altitude: 0.012 };
const street = { lat: 46.39, lng: 15.57, altitude: 0.0001 };

test("a nearby dive barely lifts, and the flight back never climbs above where it lands", () => {
  expect(peakFor(zalec, street)).toBeLessThan(zalec.altitude * 1.5);
  const back = peakFor(street, zalec);
  const top = Math.max(...Array.from({ length: 101 }, (_, i) => arcPov(street, zalec, i / 100, back).altitude));
  expect(top).toBeLessThan(zalec.altitude * 1.5);
});

test("a long flight rises enough to see where it's going", () => {
  expect(peakFor({ lat: 46, lng: 15, altitude: 0.01 }, { lat: 40, lng: -3, altitude: 0.01 })).toBeGreaterThan(0.4);
});

test("altitude changes smoothly: no frame jumps more than a few percent of the zoom", () => {
  const steps = Array.from({ length: 241 }, (_, i) => Math.log(arcPov(zalec, street, i / 240, peakFor(zalec, street)).altitude));
  const jumps = steps.slice(1).map((l, i) => Math.abs(l - steps[i]));
  // 240 frames at 60 fps = 4 s; the log zoom spans ~4.8, so an even pace would be 0.02 per frame.
  expect(Math.max(...jumps)).toBeLessThan(0.04);
});

describe("selectFlight", () => {
  test("from further out it dives to the place's usual view", () => {
    expect(selectFlight("business", { lat: 46, lng: 15, altitude: 0.085 })).toEqual({ altitude: 0.01 });
    expect(selectFlight("obcina", { lat: 46, lng: 15, altitude: 0.2 })).toEqual({ altitude: 0.03 });
    expect(selectFlight("google")).toEqual({ altitude: 0.01 });
  });

  test("from closer in it keeps the zoom and only glides over, quicker", () => {
    expect(selectFlight("business", { lat: 46, lng: 15, altitude: 0.002 })).toEqual({ altitude: 0.002, ms: 900 });
    expect(selectFlight("obcina", { lat: 46, lng: 15, altitude: 0.01 })).toEqual({ altitude: 0.01, ms: 900 });
  });
});
