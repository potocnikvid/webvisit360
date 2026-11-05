// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import GoogleTour from "./GoogleTour";
import { copy } from "@/lib/i18n";
import type { Tour } from "@/lib/types";

const t = copy.sl;
const tour = {
  id: "g-1", kind: "google", type: "trgovine", source: "google", name: "Super home", place: "Maribor",
  lat: 46.52, lng: 15.65, approx: false, cover: null, pano: true, scenes: 122, views: null, highlights: [],
  url: "https://www.google.com/maps/embed?pb=!4v1!6m8!1m7!1sCIHM0ogKEICAgICLvNmClAE!2m2!1d46.5233!2d15.6502!3f0!4f0!5f0.78",
  mapsUrl: "https://www.google.com/maps/@46.5233,15.6502,3a,75y,90t/data=!3m4!1e1!3m2!1sCIHM0ogKEICAgICLvNmClAE!2e10",
} as Tour;

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test("shows Google's own Street View tour, so its arrows and connections work", () => {
  render(<GoogleTour tour={tour} copy={t} />);
  expect(screen.getByTitle(tour.name).getAttribute("src")).toBe(tour.url);
});

test("nudges the frame's size after loading, because Google paints the first panorama black until a resize", () => {
  render(<GoogleTour tour={tour} copy={t} />);
  const frame = screen.getByTitle(tour.name);
  fireEvent.load(frame);
  act(() => vi.advanceTimersByTime(650));
  expect(frame.style.width).toBe("99%");
  act(() => vi.advanceTimersByTime(300));
  expect(frame.style.width).toBe("100%");
  act(() => vi.advanceTimersByTime(700));
  expect(frame.style.width).toBe("99%");
  act(() => vi.advanceTimersByTime(5000));
  expect(frame.style.width).toBe("100%");
});

test("nudges again when the tab comes back into view", () => {
  render(<GoogleTour tour={tour} copy={t} />);
  const frame = screen.getByTitle(tour.name);
  fireEvent.load(frame);
  act(() => vi.advanceTimersByTime(5000));
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(frame.style.width).toBe("99%");
  act(() => vi.advanceTimersByTime(300));
  expect(frame.style.width).toBe("100%");
});

test("uses Google's official Embed API when a key is configured", () => {
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY", "AIzaTEST");
  render(<GoogleTour tour={tour} copy={t} />);
  const src = screen.getByTitle(tour.name).getAttribute("src")!;
  vi.unstubAllEnvs();
  expect(src).toContain("https://www.google.com/maps/embed/v1/streetview?key=AIzaTEST&pano=F%3ACIHM0ogKEICAgICLvNmClAE");
});

test("offers the same panorama in Google Maps as a fallback", () => {
  render(<GoogleTour tour={tour} copy={t} />);
  expect(screen.getByRole("link", { name: t.panel.openInMaps }).getAttribute("href")).toBe(tour.mapsUrl);
});
