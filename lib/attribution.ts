import { z } from "zod";

/**
 * Where a visitor came from, so each enquiry email says which channel brought the lead
 * (Google, Facebook, ChatGPT, a campaign link...). Kept for the visit only (sessionStorage);
 * sent in full only with an enquiry the visitor chooses to send, and as a short channel label with
 * the cookieless click events.
 */

const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

export const SourceSchema = z.object({
  /** Host of the page that linked here (null when typed in, bookmarked or from an app). */
  referrer: z.string().max(200).nullable(),
  /** Campaign tags from the landing address. */
  utm: z.record(z.string().max(40), z.string().max(200)),
  /** Ad click ids say "paid", even without campaign tags. */
  ad: z.enum(["google", "microsoft"]).nullable(),
  /** The first page of the visit, path and query. */
  landing: z.string().max(300),
});
export type Source = z.infer<typeof SourceSchema>;

/** Where this page view came from, or null when it came from the site itself. */
export function sourceOf(url: string, referrer: string, ownHost: string): Source | null {
  const u = new URL(url);
  let ref: string | null = null;
  try {
    ref = referrer ? new URL(referrer).hostname.replace(/^www\./, "") : null;
  } catch {}
  const own = ownHost.replace(/^www\./, "");
  if (ref === own) ref = null;
  const utm: Record<string, string> = {};
  for (const k of UTM) {
    const v = u.searchParams.get(k);
    if (v) utm[k] = v.slice(0, 200);
  }
  const ad = u.searchParams.has("gclid") || u.searchParams.has("gbraid") || u.searchParams.has("wbraid")
    ? "google"
    : u.searchParams.has("msclkid")
      ? "microsoft"
      : null;
  // Facebook and Instagram apps often hide where a click came from but tag the link.
  if (!ref && u.searchParams.has("fbclid")) ref = "facebook.com";
  const internal = referrer && !ref && !Object.keys(utm).length && !ad;
  if (internal) return null;
  // From the address keep only the site's own deep links and campaign tags; other parameters
  // (click ids, anything a link added) aren't needed and could be personal.
  const keep = new URLSearchParams();
  for (const k of ["tour", "povprasevanje"]) if (u.searchParams.has(k)) keep.set(k, u.searchParams.get(k)!.slice(0, 80));
  for (const k of UTM) if (utm[k]) keep.set(k, utm[k]);
  const q = keep.toString();
  return { referrer: ref, utm, ad, landing: (u.pathname + (q ? `?${q}` : "")).slice(0, 300) };
}

/** Readable names for the usual sources; `search` marks search engines. */
const KNOWN: { re: RegExp; name: string; search?: true }[] = [
  { re: /^gemini\.google\.com$/, name: "Gemini" },
  { re: /(^|\.)google\.[a-z.]+$/, name: "Google", search: true },
  { re: /(^|\.)bing\.com$/, name: "Bing", search: true },
  { re: /(^|\.)duckduckgo\.com$/, name: "DuckDuckGo", search: true },
  { re: /(^|\.)(facebook\.com|fb\.com|fb\.me)$/, name: "Facebook" },
  { re: /(^|\.)instagram\.com$/, name: "Instagram" },
  { re: /(^|\.)linkedin\.com$|^lnkd\.in$/, name: "LinkedIn" },
  { re: /(^|\.)(chatgpt\.com|openai\.com)$/, name: "ChatGPT" },
  { re: /(^|\.)perplexity\.ai$/, name: "Perplexity" },
  { re: /^copilot\.microsoft\.com$/, name: "Copilot" },
  { re: /(^|\.)claude\.ai$/, name: "Claude" },
];
const known = (host: string) => KNOWN.find((k) => k.re.test(host));
const ownTour = (host: string) => /(^|\.)webvisit360\.com$/.test(host);
const adName = (ad: NonNullable<Source["ad"]>) => (ad === "google" ? "Google Ads" : "Microsoft Ads");

/** One line for the enquiry email (Slovenian), e.g. "Google (iskanje) · začetna stran /sprehodi/zalec". */
export function describeSource(s: Source): string {
  const parts: string[] = [];
  if (s.utm.utm_source) parts.push(`kampanja: ${[s.utm.utm_source, s.utm.utm_medium, s.utm.utm_campaign].filter(Boolean).join(" / ")}`);
  if (s.ad) parts.push(`plačan oglas (${adName(s.ad)})`);
  if (s.referrer) {
    const k = known(s.referrer);
    // After an ad click the search engine is the ad's host, not a search result.
    const label = k ? (k.search && !s.ad ? `${k.name} (iskanje)` : k.name) : ownTour(s.referrer) ? `virtualni sprehod ${s.referrer}` : s.referrer;
    parts.push(label);
  }
  if (!parts.length) parts.push("neposredno (vpisan naslov, zaznamek ali aplikacija)");
  return `${parts.join(" · ")} · začetna stran ${s.landing}`;
}

/**
 * The visit's channel as one short label for the analytics events, so clicks and enquiries can be
 * broken down by where the visit came from. Ads win, then campaign tags, then the referrer.
 */
export function channelOf(s: Source | null): string {
  if (!s) return "Unknown";
  if (s.ad) return adName(s.ad);
  if (s.utm.utm_source) return `Campaign: ${s.utm.utm_source}`.slice(0, 100);
  if (!s.referrer) return "Direct";
  const k = known(s.referrer);
  if (k) return k.search ? `${k.name} search` : k.name;
  return ownTour(s.referrer) ? "Webvisit360 tour" : s.referrer;
}

const KEY = "wv360-source";

/** Remember the visit's first source (once per visit); safe when storage is unavailable. */
export function rememberSource(): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(KEY)) return;
    const s = sourceOf(window.location.href, document.referrer, window.location.hostname);
    if (s) sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

/** The visit's first source, if known. */
export function visitSource(): Source | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = SourceSchema.safeParse(JSON.parse(sessionStorage.getItem(KEY) ?? "null"));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The visit's channel for an analytics event (see channelOf). */
export function visitChannel(): string {
  return channelOf(visitSource());
}
