import type { PlaceType } from "./types";

export type Lang = "sl" | "en";

/** Slovenian for Slovenian browsers and close neighbour languages, English otherwise. */
const SLOVENIAN_READERS = new Set(["sl", "hr", "bs", "sr"]);

export function pickLang(languages: readonly string[]): Lang {
  const first = languages[0]?.toLowerCase().split("-")[0];
  return !first || SLOVENIAN_READERS.has(first) ? "sl" : "en";
}

/** Slovenian dual/plural: 1 panorama, 2 panorami, 3–4 panorame, 5+ panoram. */
const slPlural = (n: number, one: string, two: string, few: string, many: string) => {
  const m = n % 100;
  return m === 1 ? one : m === 2 ? two : m === 3 || m === 4 ? few : many;
};

const sl = {
  brandHome: "Webvisit360 domov",
  wantOwn: "Želim svoj sprehod",
  langSwitch: { label: "EN", aria: "Preklopi v angleščino" },
  hero: {
    title: "Sprehodite se, preden pridete.",
    text: "360° virtualni sprehodi za občine, hotele, vinarje in trgovine. Vsaka lučka na zemljevidu je resničen sprehod, ki ga lahko odprete takoj.",
  },
  stats: { obcine: "občin", places: "podjetij in krajev", panoramas: "panoram", views: "ogledov" },
  filter: { label: "Pokaži primere za", all: "Vse", more: "Več", less: "Manj" },
  types: {
    obcina: "Občine",
    nastanitve: "Nastanitve",
    vino: "Vinarne in pivovarne",
    gostinstvo: "Gostinstvo",
    zdravje: "Zdravje in lepota",
    znamenitosti: "Znamenitosti in narava",
    sport: "Šport in prosti čas",
    kraji: "Kraji in panorame",
    nepremicnine: "Nepremičnine",
    trgovine: "Trgovine in saloni",
    podjetja: "Podjetja in storitve",
    javno: "Javne ustanove",
    drugo: "Drugo",
  } satisfies Record<PlaceType, string>,
  search: {
    placeholder: "Poiščite občino, hotel, kraj…",
    label: "Iskanje sprehodov",
    noLocation: "brez lokacije",
    none: "Ni zadetkov.",
    more: (n: number) => `in še ${n}… zožite iskanje`,
  },
  near: {
    kicker: "Najbližje vam",
    others: (n: number) => `in še ${n} ${slPlural(n, "sprehod", "sprehoda", "sprehodi", "sprehodov")} v 25 km`,
    precise: "Uporabi mojo natančno lokacijo",
    denied: "Lokacije ni bilo mogoče pridobiti.",
  },
  panel: {
    close: "Zapri",
    obcina: "Občina",
    google: "Google Zemljevidi",
    business: "Podjetje",
    approx: "približna lokacija",
    approxTitle: "Lokacija je približna (kraj)",
    views: (n: string) => `${n} ogledov`,
    onGoogle: (p: string) => `+ ${p} na Google Zemljevidih ↗`,
    enter: "Vstopite v sprehod",
    wantThis: "Želim takšen sprehod",
    openInMaps: "Odpri v Google Zemljevidih ↗",
  },
  panoramas: (n: number) => `${n} ${slPlural(n, "panorama", "panorami", "panorame", "panoram")}`,
  tour: { label: (name: string) => `Sprehod: ${name}`, back: "← Nazaj na zemljevid" },
  loading: "Nalagam zemljevid…",
  viewer: {
    preview: "predogled",
    tour: "sprehod",
    loadingPano: "Nalagam panoramo…",
    drag: "Povlecite za razgled",
    loadingTour: "Nalagam sprehod…",
    failed: "Sprehoda trenutno ni mogoče naložiti.",
    prev: "Prejšnja panorama",
    next: "Naslednja panorama",
    panorama: (n: number) => `Panorama ${n}`,
  },
  enquiry: {
    label: "Povpraševanje",
    title: "Pokažite se v 360°.",
    text: "Posnamemo vaš kraj, hotel ali trgovino z dronom in 360° kamero ter pripravimo sprehod, ki ga vgradite na svojo stran in Google Zemljevide.",
  },
};

export type Copy = typeof sl;

const en: Copy = {
  brandHome: "Webvisit360 home",
  wantOwn: "Get your own tour",
  langSwitch: { label: "SL", aria: "Switch to Slovenian" },
  hero: {
    title: "Walk around before you arrive.",
    text: "360° virtual tours for municipalities, hotels, wineries and shops. Every light on the map is a real tour you can open right now.",
  },
  stats: { obcine: "municipalities", places: "businesses & places", panoramas: "panoramas", views: "views" },
  filter: { label: "Show examples for", all: "All", more: "More", less: "Less" },
  types: {
    obcina: "Municipalities",
    nastanitve: "Places to stay",
    vino: "Wineries & breweries",
    gostinstvo: "Food & drink",
    zdravje: "Health & beauty",
    znamenitosti: "Sights & nature",
    sport: "Sport & leisure",
    kraji: "Towns & aerial views",
    nepremicnine: "Real estate",
    trgovine: "Shops & showrooms",
    podjetja: "Companies & services",
    javno: "Public institutions",
    drugo: "Other",
  },
  search: {
    placeholder: "Find a municipality, hotel, town…",
    label: "Search tours",
    noLocation: "no location",
    none: "No results.",
    more: (n: number) => `and ${n} more… narrow your search`,
  },
  near: {
    kicker: "Closest to you",
    others: (n: number) => `and ${n} more ${n === 1 ? "tour" : "tours"} within 25 km`,
    precise: "Use my exact location",
    denied: "Couldn't get your location.",
  },
  panel: {
    close: "Close",
    obcina: "Municipality",
    google: "Google Maps",
    business: "Business",
    approx: "approximate location",
    approxTitle: "Location is approximate (town)",
    views: (n: string) => `${n} views`,
    onGoogle: (p: string) => `+ ${p} on Google Maps ↗`,
    enter: "Enter the tour",
    wantThis: "I want a tour like this",
    openInMaps: "Open in Google Maps ↗",
  },
  panoramas: (n: number) => `${n} ${n === 1 ? "panorama" : "panoramas"}`,
  tour: { label: (name: string) => `Tour: ${name}`, back: "← Back to the map" },
  loading: "Loading the map…",
  viewer: {
    preview: "preview",
    tour: "tour",
    loadingPano: "Loading the panorama…",
    drag: "Drag to look around",
    loadingTour: "Loading the tour…",
    failed: "This tour can't be loaded right now.",
    prev: "Previous panorama",
    next: "Next panorama",
    panorama: (n: number) => `Panorama ${n}`,
  },
  enquiry: {
    label: "Enquiry",
    title: "Show yourself in 360°.",
    text: "We film your town, hotel or shop with a drone and a 360° camera and build a tour you can embed on your site and on Google Maps.",
  },
};

export const copy: Record<Lang, Copy> = { sl, en };
