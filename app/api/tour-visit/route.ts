import { countVisit, isBot, referrerHost, tourIdForOrigin } from "@/lib/tourVisits";

// Runs on Vercel's edge network: a tiny, fast endpoint the tours ping once when they open.
export const runtime = "edge";

const NO_CONTENT = (origin?: string) =>
  new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store", ...(origin ? { "access-control-allow-origin": origin } : {}) },
  });

/**
 * One anonymous visit to one of our 3DVista tours (see lib/tourVisits.ts). The body is the
 * page's document.referrer, as plain text (what navigator.sendBeacon sends). Always answers 204,
 * so a bad or unknown ping tells the sender nothing and costs nothing.
 */
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const id = tourIdForOrigin(origin);
  if (!id || !origin || isBot(req.headers.get("user-agent"))) return NO_CONTENT();
  let referrer = "";
  try {
    referrer = (await req.text()).slice(0, 500);
  } catch {}
  await countVisit(id, referrerHost(referrer, origin));
  return NO_CONTENT(origin);
}
