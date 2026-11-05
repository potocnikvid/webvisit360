// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
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

afterEach(cleanup);

test("shows the place in Google's own Street View embed, with the wrapped photo id", () => {
  render(<GoogleTour tour={tour} copy={t} />);
  expect(screen.getByTitle(tour.name).getAttribute("src")).toContain("!1sCAoSF0NJSE0wb2dLRUlDQWdJQ0x2Tm1DbEFF!");
});

test("offers the same panorama in Google Maps as a fallback", () => {
  render(<GoogleTour tour={tour} copy={t} />);
  expect(screen.getByRole("link", { name: t.panel.openInMaps }).getAttribute("href")).toBe(tour.mapsUrl);
});
