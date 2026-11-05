/** The photo id inside a stored Google Maps embed URL (`…!1s<id>!…`). */
export const panoId = (embed: string): string | null => embed.match(/!1s([^!]+)/)?.[1] ?? null;

/**
 * Google's embed wants a user-uploaded photo's id wrapped in a small protobuf header
 * (field 1 = 10, "user photo"; field 2 = the id), base64-encoded, exactly as Google Maps'
 * own Share → Embed code does. Given the bare id, it finds the photo's links but paints
 * the panorama black.
 */
export function wrapPhotoId(id: string): string {
  const bytes = [0x08, 0x0a, 0x12, id.length, ...Array.from(id, (c) => c.charCodeAt(0))];
  return btoa(String.fromCharCode(...bytes));
}

/** Google's Street View embed for a place's tour, starting at its stored photo. */
export function streetViewEmbedUrl(tour: { url: string }): string {
  const id = panoId(tour.url);
  const pos = tour.url.match(/!1d([-\d.]+)!2d([-\d.]+)/);
  if (!id || !pos) return tour.url;
  const wrapped = id.startsWith("CAoS") ? id : wrapPhotoId(id);
  return `https://www.google.com/maps/embed?pb=!4v1!6m8!1m7!1s${wrapped}!2m2!1d${pos[1]}!2d${pos[2]}!3f0!4f0!5f0.7820865974627469`;
}
