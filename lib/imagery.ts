/**
 * ESRI World Imagery is two different pictures of Slovenia: up to tile level 11 a dark,
 * saturated green satellite mosaic, from level 12 bright, neutral aerial photos. Zooming in
 * past level 11 used to swap one for the other in a single step. The far-out tiles are
 * colour graded to look like the aerial photos, fading in as the camera comes down, so the
 * overview keeps its look and the swap no longer shows.
 *
 * The grade (in sRGB) was fitted on ten spots across Slovenia, comparing each level-11 tile
 * with its four level-12 tiles: desaturate, then match each channel's mean and contrast.
 * What it can't fix is season: some aerial photos were taken in autumn.
 */

/** Highest tile level from the satellite mosaic; the aerial photos start one above. */
export const GRADED_MAX_LEVEL = 11;

export const GRADE = {
  saturation: 0.651,
  gain: [1.387, 1.474, 1.461] as const,
  offset: [0, -0.019, 0.032] as const,
};

/** No grade from this altitude up (the overview as it always was)... */
const GRADE_FROM_ALT = 0.03;
/** ...the full grade from here down, before the first aerial tiles (level 12) load. */
const GRADE_FULL_ALT = 0.004;

/** How much of the grade to apply at a camera altitude (0..1), steady on a log scale. */
export function imageryGrade(altitude: number): number {
  if (altitude >= GRADE_FROM_ALT) return 0;
  if (altitude <= GRADE_FULL_ALT) return 1;
  const t = Math.log(GRADE_FROM_ALT / altitude) / Math.log(GRADE_FROM_ALT / GRADE_FULL_ALT);
  return t * t * (3 - 2 * t);
}

/** A tile's level from its sphere segment's width (360° / 2^level, the engine has no margin). */
export const tileLevel = (phiLength: number) => Math.round(Math.log2((2 * Math.PI) / phiLength));

/** GLSL applied after the tile's texture is read (diffuseColor is linear RGB). */
export const GRADE_GLSL = `
{
  vec3 s = pow(max(diffuseColor.rgb, 0.0), vec3(1.0 / 2.2));
  float l = dot(s, vec3(0.2126, 0.7152, 0.0722));
  vec3 g = (vec3(l) + ${GRADE.saturation.toFixed(3)} * (s - vec3(l))) * vec3(${GRADE.gain.map((v) => v.toFixed(3)).join(", ")})
    + vec3(${GRADE.offset.map((v) => v.toFixed(3)).join(", ")});
  s = mix(s, clamp(g, 0.0, 1.0), uGrade);
  diffuseColor.rgb = pow(s, vec3(2.2));
}`;
