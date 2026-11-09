import type { MetadataRoute } from "next";
import { abs, catalog, placePath, townPath } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: abs("/"), changeFrequency: "weekly", priority: 1 },
    { url: abs("/o-nas"), changeFrequency: "monthly", priority: 0.8 },
    { url: abs("/sprehodi"), changeFrequency: "weekly", priority: 0.8 },
    ...catalog.townPages.map((t) => ({ url: abs(townPath(t)), changeFrequency: "monthly" as const, priority: 0.7 })),
    ...catalog.places.map((p) => ({
      url: abs(placePath(p)),
      changeFrequency: "monthly" as const,
      priority: p.tour.kind === "obcina" ? 0.7 : 0.6,
      ...(p.tour.cover ? { images: [p.tour.cover] } : {}),
    })),
  ];
}
