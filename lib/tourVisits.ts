import { Redis } from "@upstash/redis";
import { redisConfigured } from "./limits";
import { toursFile } from "./seo";

/**
 * Visits to the 3DVista tours (*.webvisit360.com), counted per month in Upstash Redis.
 * Each tour sends one anonymous ping when it opens: no cookies, no IP stored, only which
 * tour and which site sent the visitor (e.g. "facebook.com", "direct"). Vercel Web Analytics
 * is not used for the tours on purpose: on the Hobby plan its 50,000 monthly events are shared
 * with webvisit360.com, and busy tours would pause the site's own analytics.
 *
 * Read them in the admin app (admin.webvisit360.com, repo potocnikvid/webvisit360-admin) or in the
 * Upstash console:
 *   wv360:tours:<YYYY-MM>            hash: tour id -> visits
 *   wv360:tourrefs:<YYYY-MM>:<id>    hash: referring site -> visits
 *   wv360:tourdays:<YYYY-MM-DD>      hash: tour id -> visits that day (Slovenian time; since 2026-11-24)
 */

/** Tour id by host, for every tour we host ourselves. */
const TOUR_BY_HOST = new Map(
  toursFile.items
    .filter((t) => t.source === "3dvista")
    .map((t) => [new URL(t.url).hostname.replace(/^www\./, ""), t.id] as const),
);

/** The tour a ping came from, from the request's Origin header (browsers set it; pages can't fake it). */
export function tourIdForOrigin(origin: string | null): string | null {
  if (!origin) return null;
  try {
    const u = new URL(origin);
    if (u.protocol !== "https:") return null;
    return TOUR_BY_HOST.get(u.hostname.replace(/^www\./, "")) ?? null;
  } catch {
    return null;
  }
}

/** The site that sent the visitor, as a bare host ("google.com"), or "direct". */
export function referrerHost(referrer: string, tourOrigin: string): string {
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^(www|m|l|lm)\./, "");
    const own = new URL(tourOrigin).hostname.replace(/^www\./, "");
    if (!host || host === own) return "direct";
    return /^[a-z0-9.-]{1,100}$/.test(host) ? host : "other";
  } catch {
    return "direct";
  }
}

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse/i;
export const isBot = (userAgent: string | null) => !userAgent || BOT.test(userAgent);

export const monthKey = (d: Date) => d.toISOString().slice(0, 7);

const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Ljubljana", year: "numeric", month: "2-digit", day: "2-digit" });
/** The day in Slovenia, "YYYY-MM-DD", so daily charts break at local midnight. */
export const dayKey = (d: Date) => DAY.format(d);

let redis: Redis | null | undefined;
let warned = false;
function db(): Redis | null {
  if (redis !== undefined) return redis;
  if (!redisConfigured()) {
    if (!warned) console.warn("Upstash Redis is not configured: tour visits are not counted.");
    warned = true;
    return null;
  }
  return (redis = Redis.fromEnv());
}

/** Count one visit. Never throws: a counting problem must not break anything for the visitor. */
export async function countVisit(id: string, ref: string, now = new Date()): Promise<boolean> {
  const r = db();
  if (!r) return false;
  const month = monthKey(now);
  try {
    const p = r.pipeline();
    p.hincrby(`wv360:tours:${month}`, id, 1);
    p.hincrby(`wv360:tourrefs:${month}:${id}`, ref, 1);
    p.hincrby(`wv360:tourdays:${dayKey(now)}`, id, 1);
    await p.exec();
    return true;
  } catch (err) {
    console.error("Counting a tour visit failed:", err);
    return false;
  }
}
