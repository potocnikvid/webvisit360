// Precompute the illustrated globe's land dots: the centre of every H3 cell (resolution 3,
// ~12,000 km² each) that covers land outside Slovenia. Doing this at build time keeps the
// browser from running h3 over every country when the illustrated look is chosen.
// Output: public/data/land-dots.json = flat [lat*100, lng*100, lat*100, lng*100, ...].
// Run: node redesign/data/scripts/build_dots.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { polygonToCells, cellToLatLng } from "h3-js";

const geo = JSON.parse(readFileSync(new URL("../../../public/data/geo.json", import.meta.url)));
const cells = new Set();
for (const f of geo.features) {
  if (f.properties.k !== "c" || f.properties.n === "Slovenia") continue;
  const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const p of polys) {
    try {
      for (const c of polygonToCells(p, 3, true)) cells.add(c);
    } catch {
      // h3 rejects a few malformed outlines (e.g. Natural Earth's North Korea); skip them.
    }
  }
}
const out = [];
for (const c of cells) {
  const [lat, lng] = cellToLatLng(c);
  out.push(Math.round(lat * 100), Math.round(lng * 100));
}
writeFileSync(new URL("../../../public/data/land-dots.json", import.meta.url), JSON.stringify(out));
console.log(`${cells.size} dots`);
