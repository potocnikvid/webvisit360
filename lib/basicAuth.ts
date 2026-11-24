/**
 * HTTP Basic Auth check for the few private pages (the visits page, /obiski). Any user name
 * works; only the password counts. Runs in middleware (edge), so no Node APIs.
 */
export function basicAuthOk(header: string | null, password: string): boolean {
  if (!password || !header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    const bin = atob(header.slice(6).trim());
    decoded = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    return false;
  }
  const colon = decoded.indexOf(":");
  if (colon < 0) return false;
  return sameText(decoded.slice(colon + 1), password);
}

/** Compares in time that doesn't depend on where the strings first differ. */
function sameText(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
