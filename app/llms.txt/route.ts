import { CONTACT, SOCIAL } from "@/lib/contact";
import { ENQUIRY_PATH, abs, catalog, placePath, totals, townPath, typeLabel } from "@/lib/seo";

/** A plain-text guide to the site for AI assistants and agents (https://llmstxt.org). */
export const dynamic = "force-static";

export function GET() {
  const n = totals();
  const municipalities = catalog.places.filter((p) => p.tour.kind === "obcina");
  const businesses = catalog.places.filter((p) => p.tour.kind !== "obcina");
  const lines = [
    `# ${CONTACT.brand}`,
    "",
    `> ${CONTACT.brand} makes 360° virtual tours (Slovenian: "360° virtualni sprehodi") of municipalities, hotels, wineries, restaurants, shops and other places in Slovenia, and publishes them on Google Maps as a Google Street View Trusted partner. Run by ${CONTACT.company}, ${CONTACT.address}, Slovenia, since 2017.`,
    "",
    "Key facts:",
    `- ${n.obcine} municipalities and over ${Math.floor(n.places / 10) * 10} businesses and places in ${n.towns} towns, ${n.panoramas.toLocaleString("en")} panoramas, ${(n.views / 1e6).toFixed(1)} million views.`,
    "- Tours open in any browser, on phone or computer, without an app; many are also on Google Maps / Street View.",
    "- A one-time project, no subscription. The tour can live on the client's own website and domain as well as on Google.",
    "- Languages: Slovenian (main) and English.",
    "",
    "## Main pages",
    `- [Map of all tours](${abs("/")}): interactive globe with every tour; ?tour=<id> opens one.`,
    `- [About us](${abs("/o-nas")}): who we are, how we work, frequently asked questions.`,
    `- [All tours by town](${abs("/sprehodi")}): every municipality and town with its tours.`,
    "",
    "## Contact and requests",
    `- Email: ${CONTACT.email}`,
    `- Phone: ${CONTACT.phone}`,
    `- Request a tour: ${abs(ENQUIRY_PATH)} (opens a short chat that collects the details), or email.`,
    `- Profiles: ${SOCIAL.map((s) => `[${s.name}](${s.url})`).join(", ")}`,
    "",
    "## Data",
    `- [tours.json](${abs("/data/tours.json")}): every tour as JSON (name, type, place, coordinates, panoramas, views, tour link, cover image).`,
    "",
    "## Municipalities",
    ...municipalities.map((p) => `- [${p.tour.name}](${abs(placePath(p))})`),
    "",
    "## Towns",
    ...catalog.townPages.map((t) => `- [${t.name}](${abs(townPath(t))}): ${t.tours.length} tours`),
    "",
    "## Business and place tours",
    ...businesses.map((p) => `- [${p.tour.name}](${abs(placePath(p))}): ${typeLabel(p.tour.type)}${p.town ? `, ${p.town}` : ""}`),
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
