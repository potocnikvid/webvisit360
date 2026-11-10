import { parseVisitor } from "@/lib/visitor";

// Runs on Vercel's edge network, next to the visitor: no cold start, and Vercel's IP
// geolocation headers are there. The pages themselves stay static (served from the cache).
export const runtime = "edge";

/** The visitor's approximate location from their IP, for the "near you" fly-in. Never stored. */
export function GET(req: Request) {
  const visitor = parseVisitor(
    (name) => req.headers.get(name),
    process.env.NODE_ENV !== "production" ? process.env.DEV_VISITOR : undefined,
  );
  return Response.json(visitor, { headers: { "cache-control": "private, no-store" } });
}
