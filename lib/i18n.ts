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
  you: { here: "Vi ste tukaj", around: "Vi ste približno tukaj" },
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
  },
  chat: {
    label: "Povpraševanje",
    title: "Pokažite se v 360°.",
    greeting:
      "Živjo! Sem Vidov pomočnik za 360° sprehode. Povejte mi, kaj bi radi pokazali obiskovalcem, in pripravimo vam osebno ponudbo.",
    greetingFrom: (name: string) =>
      `Vam je všeč ${name}? Takšen sprehod lahko posnamemo tudi za vas. Kaj bi radi pokazali obiskovalcem?`,
    placeholder: "Napišite sporočilo…",
    send: "Pošlji",
    sizes: ["Nekaj prostorov", "Cel objekt", "Cela občina", "Z dronom"],
    timings: ["Čim prej", "V naslednjih mesecih", "Še ne vem"],
    summary: "Povzetek povpraševanja",
    fields: { place: "Kaj", size: "Obseg", timing: "Kdaj", name: "Ime in priimek", email: "E-pošta", phone: "Telefon" },
    contactMissing: "Za pošiljanje vpišite ime, e-pošto in telefon.",
    confirm: "Pošlji povpraševanje",
    edit: "Popravi",
    sending: "Pošiljam…",
    sent: "Hvala! Vid vam v kratkem pošlje osebno ponudbo.",
    unavailable: "Klepet trenutno ne deluje. Pišite nam po e-pošti, sporočilo je že pripravljeno:",
    limit: "Danes je pogovorov res veliko. Pišite nam po e-pošti, sporočilo je že pripravljeno:",
    tooMany: "Pogovor je že kar dolg. Pošljite nam ga po e-pošti:",
    tooLong: "Sporočilo je predolgo, skrajšajte ga, prosim.",
    emailUs: (to: string) => `Pišite na ${to}`,
    privacyLine: "Vaše podatke uporabimo samo za pripravo ponudbe.",
    privacyMore: "Več o zasebnosti",
  },
  privacy: {
    title: "Zasebnost",
    body: [
      "Upravljavec podatkov je Agencija Sinhron d.o.o. (Webvisit360).",
      "Ko nam pišete prek klepeta, zberemo vsebino pogovora, vaše ime in e-pošto ali telefon ter približen kraj, ki ga brskalnik razkrije prek naslova IP. Kraja ne shranjujemo.",
      "Podatke uporabimo samo za pripravo ponudbe za virtualni sprehod. Pogovor obdela Anthropic (model Claude), e-pošto nam dostavi Resend, stran gostuje Vercel. Povpraševanje hranimo v našem e-poštnem predalu.",
      "Za vpogled ali izbris svojih podatkov nam pišite na e-poštni naslov spodaj.",
    ],
    close: "Zapri",
  },
  footer: { company: "© Agencija Sinhron d.o.o.", privacy: "Zasebnost" },
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
  you: { here: "You are here", around: "You're around here" },
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
  },
  chat: {
    label: "Enquiry",
    title: "Show yourself in 360°.",
    greeting: "Hi! I'm Vid's assistant for 360° tours. Tell me what you'd like to show your visitors and we'll prepare a personal offer.",
    greetingFrom: (name: string) => `Like ${name}? We can film a tour like that for you too. What would you like to show your visitors?`,
    placeholder: "Write a message…",
    send: "Send",
    sizes: ["A few rooms", "A whole venue", "A whole municipality", "With drone views"],
    timings: ["As soon as possible", "In the next few months", "Not sure yet"],
    summary: "Your enquiry",
    fields: { place: "What", size: "Size", timing: "When", name: "Full name", email: "Email", phone: "Phone" },
    contactMissing: "To send, fill in your name, email and phone.",
    confirm: "Send enquiry",
    edit: "Change",
    sending: "Sending…",
    sent: "Thank you! Vid will send you a personal offer shortly.",
    unavailable: "The chat isn't working right now. Email us instead, your message is ready:",
    limit: "We've had a lot of chats today. Email us instead, your message is ready:",
    tooMany: "This chat is getting long. Send it to us by email:",
    tooLong: "That message is too long, please shorten it.",
    emailUs: (to: string) => `Write to ${to}`,
    privacyLine: "We use your details only to prepare an offer.",
    privacyMore: "Privacy",
  },
  privacy: {
    title: "Privacy",
    body: [
      "The data controller is Agencija Sinhron d.o.o. (Webvisit360).",
      "When you write to us in the chat, we collect the conversation, your name and email or phone, and the approximate town your browser reveals through its IP address. We don't store the town.",
      "We use this only to prepare an offer for a virtual tour. The chat is processed by Anthropic (the Claude model), email is delivered to us by Resend, and the site is hosted by Vercel. Enquiries are kept in our email inbox.",
      "To see or delete your data, email us at the address below.",
    ],
    close: "Close",
  },
  footer: { company: "© Agencija Sinhron d.o.o.", privacy: "Privacy" },
};

export const copy: Record<Lang, Copy> = { sl, en };
