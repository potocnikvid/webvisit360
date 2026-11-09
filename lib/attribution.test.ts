import { describe, expect, test } from "vitest";
import { describeSource, sourceOf } from "./attribution";

const site = "www.webvisit360.com";
const at = (path: string) => `https://www.webvisit360.com${path}`;

describe("sourceOf", () => {
  test("a search engine, with the landing page", () => {
    const s = sourceOf(at("/sprehodi/zalec"), "https://www.google.si/", site)!;
    expect(s).toEqual({ referrer: "google.si", utm: {}, ad: null, landing: "/sprehodi/zalec" });
    expect(describeSource(s)).toBe("Google (iskanje) · začetna stran /sprehodi/zalec");
  });

  test("typed in or bookmarked: direct", () => {
    const s = sourceOf(at("/"), "", site)!;
    expect(describeSource(s)).toBe("neposredno (vpisan naslov, zaznamek ali aplikacija) · začetna stran /");
  });

  test("moving around the site itself is not a new source", () => {
    expect(sourceOf(at("/o-nas"), "https://www.webvisit360.com/", site)).toBeNull();
  });

  test("campaign tags and ads; other parameters are dropped, the site's deep links kept", () => {
    const s = sourceOf(at("/?tour=zalec&utm_source=newsletter&utm_medium=email&utm_campaign=jesen&gclid=abc&email=x@y.si"), "", site)!;
    expect(s.landing).toBe("/?tour=zalec&utm_source=newsletter&utm_medium=email&utm_campaign=jesen");
    expect(describeSource(s)).toBe("kampanja: newsletter / email / jesen · plačan oglas (Google Ads) · začetna stran /?tour=zalec&utm_source=newsletter&utm_medium=email&utm_campaign=jesen");
  });

  test("AI assistants, Facebook's app and our own tour pages get readable names", () => {
    expect(describeSource(sourceOf(at("/"), "https://chatgpt.com/", site)!)).toMatch(/^ChatGPT ·/);
    expect(describeSource(sourceOf(at("/"), "https://gemini.google.com/", site)!)).toMatch(/^Gemini ·/);
    expect(describeSource(sourceOf(at("/?fbclid=123"), "", site)!)).toMatch(/^Facebook ·/);
    expect(describeSource(sourceOf(at("/"), "https://zalec.webvisit360.com/", site)!)).toMatch(/^virtualni sprehod zalec\.webvisit360\.com ·/);
    expect(describeSource(sourceOf(at("/"), "https://www.example.org/blog", site)!)).toMatch(/^example\.org ·/);
  });
});
