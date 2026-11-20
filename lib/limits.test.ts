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

test("Redis counts as configured with either Upstash's or Vercel's variable names", async () => {
  const { redisConfigured } = await import("./limits");
  const keys = ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  keys.forEach((k) => delete process.env[k]);
  expect(redisConfigured()).toBe(false);
  process.env.KV_REST_API_URL = "https://x.upstash.io";
  process.env.KV_REST_API_TOKEN = "t";
  expect(redisConfigured()).toBe(true);
  delete process.env.KV_REST_API_TOKEN;
  expect(redisConfigured()).toBe(false);
  process.env.UPSTASH_REDIS_REST_TOKEN = "t";
  expect(redisConfigured()).toBe(true);
  keys.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])));
});
