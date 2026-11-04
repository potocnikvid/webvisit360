export type Tour = {
  id: string;
  kind: "obcina" | "business";
  source: "3dvista" | "kuula";
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
};

export type ToursFile = {
  stats: {
    obcine: number;
    business: number;
    placed: number;
    scenes: number;
    kuulaViews: number;
  };
  items: Tour[];
};

export type Filter = "all" | "obcina" | "business";

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
