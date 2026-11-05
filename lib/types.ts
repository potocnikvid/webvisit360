/** Visitor-facing place types (see redesign/data/scripts/classify.py). */
export const PLACE_TYPES = [
  "obcina",
  "nastanitve",
  "vino",
  "gostinstvo",
  "zdravje",
  "znamenitosti",
  "sport",
  "kraji",
  "nepremicnine",
  "trgovine",
  "podjetja",
  "javno",
  "drugo",
] as const;

export type PlaceType = (typeof PLACE_TYPES)[number];

/** Chips always shown; the rest sit behind "Več". */
export const MAIN_TYPES: readonly PlaceType[] = ["obcina", "nastanitve", "vino", "gostinstvo", "trgovine", "zdravje"];

export type Tour = {
  id: string;
  kind: "obcina" | "business" | "google";
  type: PlaceType;
  source: "3dvista" | "kuula" | "google";
  name: string;
  place: string | null;
  lat: number | null;
  lng: number | null;
  approx: boolean;
  url: string;
  cover: string | null;
  pano: boolean;
  scenes: number | null;
  views: number | null;
  highlights: string[];
  created?: string;
  category?: string | null;
  address?: string | null;
  /** Google Maps place page (google items). */
  mapsUrl?: string;
  /** Same place also published on Google Maps (Kuula/3DVista items). */
  gmaps?: { url: string; embed: string; scenes: number };
};

export type ToursFile = {
  stats: {
    obcine: number;
    business: number;
    placed: number;
    scenes: number;
    kuulaViews: number;
    google?: number;
    googlePhotos?: number;
    googleViews?: number;
  };
  items: Tour[];
};

export type Filter = "all" | "obcina" | "business" | "google";

export const fmt = (n: number) => n.toLocaleString("sl-SI");

export const compact = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(".", ",")} mio.` : n >= 1e3 ? `${Math.round(n / 1e3)} tis.` : `${n}`;

/** Slovenian plural for "panorama". */
export const panoramas = (n: number) => {
  const m = n % 100;
  if (m === 1) return `${n} panorama`;
  if (m === 2) return `${n} panorami`;
  if (m === 3 || m === 4) return `${n} panorame`;
  return `${n} panoram`;
};
