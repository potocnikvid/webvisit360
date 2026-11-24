import { beforeEach, describe, expect, test, vi } from "vitest";

const hincrby = vi.fn();
const exec = vi.fn();
vi.mock("@upstash/redis", () => ({
  Redis: { fromEnv: () => ({ pipeline: () => ({ hincrby, exec }) }) },
}));

process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test";
const { POST } = await import("./route");
const { dayKey, referrerHost, tourIdForOrigin } = await import("@/lib/tourVisits");

const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0 Safari/537.36";
const ping = (origin: string | null, body = "", ua: string | null = CHROME) =>
  POST(
    new Request("https://www.webvisit360.com/api/tour-visit", {
      method: "POST",
      body,
      headers: { "content-type": "text/plain", ...(origin ? { origin } : {}), ...(ua ? { "user-agent": ua } : {}) },
    }),
  );
const month = new Date().toISOString().slice(0, 7);

describe("tour visit pings", () => {
  beforeEach(() => {
    hincrby.mockReset();
    exec.mockReset().mockResolvedValue([1, 1]);
  });

  test("knows our tours by host, and nothing else", () => {
    expect(tourIdForOrigin("https://solcava.webvisit360.com")).toBe("solcava");
    expect(tourIdForOrigin("https://gssol.webvisit360.com")).toBe("gssol");
    expect(tourIdForOrigin("https://gs-sentjur.webvisit360.com")).toBe("gs-sentjur");
    expect(tourIdForOrigin("http://solcava.webvisit360.com")).toBeNull();
    expect(tourIdForOrigin("https://evil.example")).toBeNull();
    expect(tourIdForOrigin(null)).toBeNull();
  });

  test("keeps only the referring site's host, and calls the tour itself direct", () => {
    expect(referrerHost("https://www.facebook.com/some/post?x=1", "https://solcava.webvisit360.com")).toBe("facebook.com");
    expect(referrerHost("https://l.facebook.com/l.php?u=x", "https://solcava.webvisit360.com")).toBe("facebook.com");
    expect(referrerHost("", "https://solcava.webvisit360.com")).toBe("direct");
    expect(referrerHost("https://solcava.webvisit360.com/#x", "https://solcava.webvisit360.com")).toBe("direct");
  });

  test("counts a visit per tour and per referring site", async () => {
    const res = await ping("https://solcava.webvisit360.com", "https://www.google.com/");
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://solcava.webvisit360.com");
    expect(hincrby).toHaveBeenCalledWith(`wv360:tours:${month}`, "solcava", 1);
    expect(hincrby).toHaveBeenCalledWith(`wv360:tourrefs:${month}:solcava`, "google.com", 1);
    expect(hincrby).toHaveBeenCalledWith(`wv360:tourdays:${dayKey(new Date())}`, "solcava", 1);
  });

  test("days follow Slovenian time", () => {
    expect(dayKey(new Date("2026-11-24T22:30:00Z"))).toBe("2026-11-24");
    expect(dayKey(new Date("2026-11-24T23:30:00Z"))).toBe("2026-11-25");
    expect(dayKey(new Date("2026-07-01T21:59:00Z"))).toBe("2026-07-01");
    expect(dayKey(new Date("2026-07-01T22:01:00Z"))).toBe("2026-07-02");
  });

  test("ignores other sites, missing origins and bots", async () => {
    for (const r of [await ping("https://evil.example"), await ping(null), await ping("https://solcava.webvisit360.com", "", "Googlebot/2.1")]) {
      expect(r.status).toBe(204);
    }
    expect(hincrby).not.toHaveBeenCalled();
  });

  test("a Redis failure still answers 204", async () => {
    exec.mockRejectedValue(new Error("down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await ping("https://solcava.webvisit360.com")).status).toBe(204);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });
});
