/** The panorama id inside a stored Google Maps embed URL (`…!1s<id>!…`). */
export const panoId = (embed: string): string | null => embed.match(/!1s([^!]+)/)?.[1] ?? null;

/**
 * Where to load a Google place's 360 tour from: Google's official Maps Embed API when a key
 * is configured (it loads user-uploaded panoramas reliably), otherwise the stored keyless
 * embed URL.
 */
export function streetViewEmbedUrl(tour: { url: string }, key: string | undefined): string {
  const id = panoId(tour.url);
  if (!key || !id) return tour.url;
  const u = new URL("https://www.google.com/maps/embed/v1/streetview");
  u.searchParams.set("key", key);
  // "F:" marks a user-uploaded photo; without it the API rejects the id as an invalid pano.
  u.searchParams.set("pano", `F:${id}`);
  return u.toString();
}
