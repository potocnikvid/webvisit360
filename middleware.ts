import { NextResponse, type NextRequest } from "next/server";
import { basicAuthOk } from "@/lib/basicAuth";

/**
 * The visits page (/obiski) is private: the browser asks for a password (HTTP Basic Auth,
 * any user name). The password is the STATS_PASSWORD environment variable; without it the
 * page doesn't exist.
 */
export function middleware(req: NextRequest) {
  const password = process.env.STATS_PASSWORD ?? "";
  if (!password) return new NextResponse("Not found", { status: 404 });
  if (basicAuthOk(req.headers.get("authorization"), password)) return NextResponse.next();
  return new NextResponse("Prijava je potrebna.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Webvisit360 obiski", charset="UTF-8"', "cache-control": "no-store" },
  });
}

export const config = { matcher: ["/obiski"] };
