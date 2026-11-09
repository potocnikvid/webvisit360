import type { Metadata } from "next";
import data from "@/public/data/tours.json";
import { about } from "./about";
import { buildCatalog, type PlacePage, type Town } from "./catalog";
import { CONTACT, SOCIAL } from "./contact";
import { copy } from "./i18n";
import type { PlaceType, Tour, ToursFile } from "./types";

/** The live address: canonical links, sitemap, structured data. */
export const SITE_URL = "https://www.webvisit360.com";
export const abs = (path: string) => new URL(path, SITE_URL).toString();

export const toursFile = data as unknown as ToursFile;
export const catalog = buildCatalog(toursFile.items);

export const placePath = (p: PlacePage) => `/sprehod/${p.slug}`;
export const townPath = (t: Town) => `/sprehodi/${t.slug}`;
/** The globe, opened at this place (Experience's ?tour= deep link). */
export const mapPath = (t: Pick<Tour, "id">) => `/?tour=${encodeURIComponent(t.id)}`;
/** The globe with the enquiry chat open. */
export const ENQUIRY_PATH = "/?povprasevanje";

/** A smaller Google photo for lists (their covers are 2048 px wide). */
export const thumb = (url: string | null) => (url ? url.replace(/=w\d+-h\d+-k-no$/, "=w640-h320-k-no") : null);

export const typeLabel = (t: PlaceType) => copy.sl.types[t];

/** The studio, as one entity every page refers to (by @id). */
export const ORG_ID = `${SITE_URL}/#organizacija`;
export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": ORG_ID,
    name: CONTACT.brand,
    legalName: CONTACT.company,
    url: SITE_URL,
    logo: abs("/logo.png"),
    image: abs("/logo.png"),
    description:
      "Webvisit360 od leta 2017 izdeluje 360° virtualne sprehode za občine, hotele, vinarje, restavracije in trgovine ter jih kot Google Street View Trusted partner objavlja na Google Zemljevidih.",
    email: CONTACT.email,
    telephone: CONTACT.phone,
    vatID: CONTACT.vat,
    foundingDate: "2017",
    address: {
      "@type": "PostalAddress",
      streetAddress: CONTACT.street,
      postalCode: CONTACT.postalCode,
      addressLocality: CONTACT.city,
      addressCountry: "SI",
    },
    areaServed: { "@type": "Country", name: "Slovenija" },
    knowsAbout: ["360° virtualni sprehodi", "virtualni ogledi", "Google Street View", "3D panorame", "fotografija z dronom"],
    sameAs: SOCIAL.map((s) => s.url),
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#splet`,
    url: SITE_URL,
    name: CONTACT.brand,
    inLanguage: "sl",
    publisher: { "@id": ORG_ID },
  };
}

/** The About page's questions and answers. */
export function faqLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: about.sl.faq.items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function breadcrumbLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: abs(c.path) })),
  };
}

const SCHEMA_TYPE: Record<PlaceType, string> = {
  obcina: "AdministrativeArea",
  nastanitve: "LodgingBusiness",
  vino: "Winery",
  gostinstvo: "FoodEstablishment",
  zdravje: "HealthAndBeautyBusiness",
  znamenitosti: "TouristAttraction",
  sport: "SportsActivityLocation",
  kraji: "Place",
  nepremicnine: "Place",
  trgovine: "Store",
  podjetja: "LocalBusiness",
  javno: "CivicStructure",
  drugo: "Place",
};

/** A place with its 360° tour (made by the studio) as a CreativeWork about it. */
export function placeLd(p: PlacePage) {
  const t = p.tour;
  return {
    "@context": "https://schema.org",
    "@type": SCHEMA_TYPE[t.type],
    name: t.name,
    url: abs(placePath(p)),
    ...(t.cover ? { image: t.cover } : {}),
    ...(p.town ? { address: { "@type": "PostalAddress", addressLocality: p.town, addressCountry: "SI" } } : {}),
    ...(t.lat != null && t.lng != null ? { geo: { "@type": "GeoCoordinates", latitude: t.lat, longitude: t.lng } } : {}),
    subjectOf: {
      "@type": "CreativeWork",
      name: `360° virtualni sprehod: ${t.name}`,
      url: t.url,
      inLanguage: "sl",
      creator: { "@id": ORG_ID },
    },
  };
}

/** A town page: the list of its tours. */
export function townLd(town: Town) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `360° virtualni sprehodi – ${town.name}`,
    url: abs(townPath(town)),
    about: { "@type": "Place", name: town.name, geo: { "@type": "GeoCoordinates", latitude: town.lat, longitude: town.lng } },
    publisher: { "@id": ORG_ID },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: town.tours.length,
      itemListElement: town.tours.map((t, i) => {
        const page = catalog.placeById.get(t.id);
        return { "@type": "ListItem", position: i + 1, name: t.name, url: page ? abs(placePath(page)) : t.mapsUrl ?? t.url };
      }),
    },
  };
}

/** Safe inline JSON for a <script type="application/ld+json">. */
export const ldJson = (d: unknown) => JSON.stringify(d).replace(/</g, "\\u003c");

/** The totals the map shows (hero numbers), for page text. */
export function totals() {
  const s = toursFile.stats;
  return {
    obcine: s.obcine,
    places: s.business + (s.google ?? 0),
    panoramas: s.scenes + (s.googlePhotos ?? 0),
    views: s.kuulaViews + (s.googleViews ?? 0),
    towns: catalog.towns.length,
  };
}

/** Title, description, canonical address and link previews for a page. */
export function pageMeta({ title, description, path, image }: { title: string; description: string; path: string; image?: string | null }): Metadata {
  const full = `${title} · ${CONTACT.brand}`;
  const images = image ? [{ url: image, alt: title }] : [{ url: "/og.png", width: 1200, height: 630, alt: `${CONTACT.brand} – 360° virtualni sprehodi` }];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: CONTACT.brand, locale: "sl_SI", url: path, title: full, description, images },
    twitter: { card: "summary_large_image", title: full, description, images: images.map((i) => i.url) },
  };
}

/** Order within lists: municipalities, then by views (Google photo spots by their photos). */
export const prominence = (t: Pick<Tour, "kind" | "views" | "scenes" | "source">) =>
  t.kind === "obcina" ? 1e12 + (t.scenes ?? 0) : t.views ?? (t.scenes ?? 0) * (t.source === "google" ? 2700 : 1000);
