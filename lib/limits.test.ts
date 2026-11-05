import { expect, test, vi } from "vitest";
import { clientIp, limit } from "./limits";

test("limits are skipped without Upstash configuration", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  expect(await limit("chat", "1.2.3.4")).toBe(true);
});

test("clientIp takes the first forwarded address", () => {
  expect(clientIp(new Request("http://x", { headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" } }))).toBe("9.9.9.9");
  expect(clientIp(new Request("http://x"))).toBe("unknown");
});

test("an Upstash failure lets the visitor through and is logged", async () => {
  vi.resetModules();
  vi.doMock("@upstash/redis", () => ({ Redis: { fromEnv: () => ({}) } }));
  vi.doMock("@upstash/ratelimit", () => {
    class Ratelimit {
      static slidingWindow() { return {}; }
      static fixedWindow() { return {}; }
      async limit() { throw new Error("401 Unauthorized"); }
    }
    return { Ratelimit };
  });
  process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "bad";
  const err = vi.spyOn(console, "error").mockImplementation(() => {});
  const { limit: fresh } = await import("./limits");
  expect(await fresh("chat", "1.2.3.4")).toBe(true);
  expect(err).toHaveBeenCalled();
  err.mockRestore();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});
