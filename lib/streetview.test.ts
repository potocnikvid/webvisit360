import { describe, expect, test } from "vitest";
import { panoId, streetViewEmbedUrl, wrapPhotoId } from "./streetview";

const tour = {
  url: "https://www.google.com/maps/embed?pb=!4v1!6m8!1m7!1sCIHM0ogKEICAgICLvNmClAE!2m2!1d46.52332427227591!2d15.65022418795703!3f0!4f0!5f0.78",
};

test("panoId reads the photo id from the stored embed URL", () => {
  expect(panoId(tour.url)).toBe("CIHM0ogKEICAgICLvNmClAE");
  expect(panoId("https://example.com/no-id")).toBeNull();
});

test("wrapPhotoId matches the id Google's own Share → Embed code uses", () => {
  expect(wrapPhotoId("CIHM0ogKEICAgICLvNmClAE")).toBe("CAoSF0NJSE0wb2dLRUlDQWdJQ0x2Tm1DbEFF");
});

describe("streetViewEmbedUrl", () => {
  test("builds Google's embed with the wrapped photo id and the photo's position", () => {
    const u = streetViewEmbedUrl(tour);
    expect(u.startsWith("https://www.google.com/maps/embed?pb=")).toBe(true);
    expect(u).toContain("!6m8!1m7!1sCAoSF0NJSE0wb2dLRUlDQWdJQ0x2Tm1DbEFF!2m2!1d46.52332427227591!2d15.65022418795703!");
  });

  test("leaves an id that is already wrapped alone", () => {
    const wrapped = { url: tour.url.replace("CIHM0ogKEICAgICLvNmClAE", "CAoSF0NJSE0wb2dLRUlDQWdJQ0x2Tm1DbEFF") };
    expect(streetViewEmbedUrl(wrapped)).toContain("!1sCAoSF0NJSE0wb2dLRUlDQWdJQ0x2Tm1DbEFF!");
  });

  test("returns an URL it can't parse unchanged", () => {
    expect(streetViewEmbedUrl({ url: "https://example.com/x" })).toBe("https://example.com/x");
  });
});
