import { describe, expect, test } from "vitest";
import { panoId, streetViewEmbedUrl } from "./streetview";

const tour = {
  url: "https://www.google.com/maps/embed?pb=!4v1!6m8!1m7!1sCIHM0ogKEICAgICLvNmClAE!2m2!1d46.5233!2d15.6502!3f0!4f0!5f0.78",
};

test("panoId reads the panorama id from the stored embed URL", () => {
  expect(panoId(tour.url)).toBe("CIHM0ogKEICAgICLvNmClAE");
  expect(panoId("https://example.com/no-id")).toBeNull();
});

describe("streetViewEmbedUrl", () => {
  test("uses Google's official Embed API when a key is set", () => {
    const u = new URL(streetViewEmbedUrl(tour, "AIzaTEST")!);
    expect(u.origin + u.pathname).toBe("https://www.google.com/maps/embed/v1/streetview");
    expect(u.searchParams.get("key")).toBe("AIzaTEST");
    expect(u.searchParams.get("pano")).toBe("CIHM0ogKEICAgICLvNmClAE");
  });

  test("falls back to the stored embed URL without a key", () => {
    expect(streetViewEmbedUrl(tour, undefined)).toBe(tour.url);
    expect(streetViewEmbedUrl(tour, "")).toBe(tour.url);
  });
});
