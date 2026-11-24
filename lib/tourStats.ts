import { Redis } from "@upstash/redis";
import { redisConfigured } from "./limits";
import { catalog, placePath, toursFile } from "./seo";
import { monthKey } from "./tourVisits";

/**
 * Reads the tour visit counts that /api/tour-visit writes (see lib/tourVisits.ts) for the
 * private visits page, /obiski:
 *   wv360:tours:<YYYY-MM>            hash: tour id -> visits
 *   wv360:tourrefs:<YYYY-MM>:<id>    hash: referring site -> visits
 */

export type Counts = Record<string, number>;
export type StatTour = { id: string; name: string; url: string; page: string | null };
export type StatsRow = StatTour & {
  /** Visits in the chosen month, the month before, and over all the months read. */
  month: number;
  prev: number;
  span: number;
  /** Referring sites in the chosen month, busiest first ("direct" = typed in or no referrer). */
  refs: [string, number][];
};
export type Stats = {
  configured: boolean;
  month: string;
  /** Newest first, starting with `month`. */
  months: string[];
  /** Visits to all tours per month, aligned with `months`. */
  totals: number[];
  rows: StatsRow[];
};

export const SPAN_MONTHS = 12;

/** `n` months ending with `month` ("YYYY-MM"), newest first. */
export function lastMonths(month: string, n: number): string[] {
  const [y, m] = month.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => monthKey(new Date(Date.UTC(y, m - 1 - i, 1))));
}

/** The month asked for in the URL, if it's a real month that isn't in the future; else this month. */
export function pickMonth(q: string | undefined, now = new Date()): string {
  const current = monthKey(now);
  if (!q || !/^\d{4}-(0[1-9]|1[0-2])$/.test(q) || q > current) return current;
  return q;
}

/** A Redis hash as numbers (Upstash returns numbers or numeric strings; missing hash = null). */
export function toCounts(hash: Record<string, unknown> | null | undefined): Counts {
  const out: Counts = {};
  for (const [k, v] of Object.entries(hash ?? {})) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

export function buildRows(tours: StatTour[], months: string[], counts: Counts[], refs: Record<string, Counts>): StatsRow[] {
  return tours
    .map((t) => ({
      ...t,
      month: counts[0]?.[t.id] ?? 0,
      prev: counts[1]?.[t.id] ?? 0,
      span: counts.reduce((sum, c) => sum + (c[t.id] ?? 0), 0),
      refs: Object.entries(refs[t.id] ?? {}).sort((a, b) => b[1] - a[1]),
    }))
    .sort((a, b) => b.month - a.month || b.span - a.span || a.name.localeCompare(b.name, "sl"));
}

/** The tours we host ourselves, the ones that send visit pings. */
export function statTours(): StatTour[] {
  return toursFile.items
    .filter((t) => t.source === "3dvista")
    .map((t) => {
      const p = catalog.placeById.get(t.id);
      return { id: t.id, name: t.name, url: t.url, page: p ? placePath(p) : null };
    });
}

export async function readStats(month: string): Promise<Stats> {
  const months = lastMonths(month, SPAN_MONTHS);
  const tours = statTours();
  if (!redisConfigured()) return { configured: false, month, months, totals: months.map(() => 0), rows: buildRows(tours, months, [], {}) };
  const redis = Redis.fromEnv();
  const p = redis.pipeline();
  for (const m of months) p.hgetall(`wv360:tours:${m}`);
  for (const t of tours) p.hgetall(`wv360:tourrefs:${month}:${t.id}`);
  const res = (await p.exec()) as (Record<string, unknown> | null)[];
  const counts = res.slice(0, months.length).map(toCounts);
  const refs = Object.fromEntries(tours.map((t, i) => [t.id, toCounts(res[months.length + i])]));
  const totals = counts.map((c) => Object.values(c).reduce((a, b) => a + b, 0));
  return { configured: true, month, months, totals, rows: buildRows(tours, months, counts, refs) };
}
