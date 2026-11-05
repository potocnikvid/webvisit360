import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Kind = "chat" | "send" | "conversation";

let limiters: Record<Kind, Ratelimit> | null = null;
let warned = false;

function get(): Record<Kind, Ratelimit> | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
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
    };
  }
  return limiters;
}

/** True when allowed. "conversation" is a global daily cap (use key "global"). */
export async function limit(kind: Kind, key: string): Promise<boolean> {
  const l = get();
  if (!l) return true;
  return (await l[kind].limit(key)).success;
}

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
