import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { MAX_VISITOR_MESSAGES } from "./chat";

type Kind = "chat" | "send" | "conversation" | "message";

/**
 * True when Upstash Redis credentials are set. Accepts both namings: Upstash's own
 * (UPSTASH_REDIS_REST_*) and the KV_REST_API_* names the Vercel Marketplace integration
 * sets; Redis.fromEnv() reads either.
 */
export const redisConfigured = () =>
  !!(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
  !!(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN);

let limiters: Record<Kind, Ratelimit> | null = null;
let warned = false;

function get(): Record<Kind, Ratelimit> | null {
  if (!redisConfigured()) {
    if (!warned) console.warn("Upstash Redis is not configured: chat and enquiry rate limits are off.");
    warned = true;
    return null;
  }
  if (!limiters) {
    const redis = Redis.fromEnv();
    const daily = Number(process.env.CHAT_DAILY_CONVERSATIONS) || 500;
    limiters = {
      chat: new Ratelimit({ redis, prefix: "wv360:chat", limiter: Ratelimit.slidingWindow(30, "1 h") }),
      send: new Ratelimit({ redis, prefix: "wv360:send", limiter: Ratelimit.fixedWindow(5, "1 d") }),
      conversation: new Ratelimit({ redis, prefix: "wv360:conv", limiter: Ratelimit.fixedWindow(daily, "1 d") }),
      message: new Ratelimit({ redis, prefix: "wv360:msg", limiter: Ratelimit.fixedWindow(daily * MAX_VISITOR_MESSAGES, "1 d") }),
    };
  }
  return limiters;
}

/**
 * True when allowed. "conversation" and "message" are global daily caps (use key "global").
 * If Redis itself fails, let the visitor through (as the library does on timeouts) and log it:
 * a broken limiter must not silently turn away every lead.
 */
export async function limit(kind: Kind, key: string): Promise<boolean> {
  const l = get();
  if (!l) return true;
  try {
    return (await l[kind].limit(key)).success;
  } catch (err) {
    console.error(`Rate limit check failed (${kind}), allowing:`, err);
    return true;
  }
}

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
