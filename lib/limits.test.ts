import { expect, test } from "vitest";
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
