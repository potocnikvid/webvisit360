# webvisit360 redesign — handoff brief

Written 2026-11-04 at the end of a local session, so a cloud session can continue.
Branch: `globe-redesign`. Everything gathered so far is in `redesign/data/`.

## What the owner asked for

Finish (or rebuild from scratch) www.webvisit360.com, the site of a Slovenian
360° virtual-tour studio (Webvisit360 / FPhoto, Agencija Sinhron d.o.o.).

- The whole first screen is an **interactive 3D globe** the visitor can move around
  (three.js or similar).
- Points on it: one per **občina (municipality) tour** they have made, plus
  individual points for **business/location tours** (Kuula, Google Maps).
- "Make it look sleek", pull in as many real projects as possible.
- Audience, in the owner's words: "anyone who would want a virtual tour for their
  business or občina or anything else — we need to **sell the experience**."

## Status of the conversation

- Agreed: start from scratch (the 2023 code in this repo is a half-finished Next 13
  pages-router site with Croatian placeholder copy; only `public/logos/*` and
  `public/logo.png` are worth keeping).
- The owner said **yes to a throwaway clickable globe prototype** to react to.
  The full-site design has *not* been approved yet: build the prototype first,
  deploy it, show it, collect reactions, then write the design and plan.
- Not yet answered by the owner: language (assumed Slovenian first, English
  toggle later), what pages besides the globe (assumed: how it works, pricing/
  enquiry, contact), whether they want a contact form wired to email.

## Data (all in `redesign/data/`)

`tours.json` — built, ready to render. `{ stats, items[] }`, each item:
`id, kind ("obcina" | "business"), source ("3dvista" | "kuula"), name, place,
lat, lng (null = location unknown, list only), approx (true = placed at town
level with jitter), url (open in iframe), cover, pano (true = cover is a
1536×768 equirectangular image with CORS, usable as a three.js sphere texture),
scenes, views (Kuula only), highlights[] (cleaned scene names, 3DVista only)`.

- 17 občina tours + 3 business tours made with **3DVista**, hosted on Vercel
  (project per tour, mostly `<name>.webvisit360.com`): Postojna, Nazarje, Luče,
  Braslovče, Središče ob Dravi, Žalec, Slovenj Gradec, Rečica ob Savinji, Solčava,
  Trbovlje, Prebold, Šentilj, Kozje, Tabor, Polzela, Mengeš, Mozirje; plus
  Inotherm, GŠ Risto Savin Žalec, Grand Plaza Hotel. ~1,800 panoramas total.
  Each cover `media/panorama_<id>_hd_t.jpg` is a full drone 360 panorama and the
  host sends `Access-Control-Allow-Origin: *`. Pages are iframe-able.
- 150 **Kuula** collections from https://kuula.co/profile/WEBVISIT360 (hotels,
  restaurants, wineries, shops, clinics…), 2,600 panoramas, 4.57M views.
  Covers `files.kuula.io/<uuid>/01-cover.jpg` are 640×640 and have **no CORS**
  (fine for `<img>`, not for WebGL). 107 of 167 items have coordinates; the rest
  need a real address. Geocoding = OSM Nominatim + manual town overrides
  (`scripts/build_data.py`, `OVR` dict). Spot-check before launch.
- `geo.json` — GeoJSON: world countries (`k:"c"`) + 212 Slovenian municipalities
  (`k:"m"`, `tour:<slug>` when we have a tour there; all 17 tagged).
- `raw/` — unprocessed scrapes (`kuula.json` includes scene names per collection),
  geocoder output, and the source boundary files (geoBoundaries SVN ADM2,
  Natural Earth 110m countries).
- **Google Maps 360 photos** (contributor profiles "Webvisit360 – FPhoto"
  `116826668001266347582`, Local Guide level 9, and "Frenk Potočnik"
  `105852716857823588227`) are hidden from public view, so they are NOT in the data
  yet. Getting them needs the owner signed in to that Google account, or a Google
  Takeout export (Maps contributions include coordinates). Leave a slot for a
  "Google Maps" layer in the UI and data model.

## Design direction (my proposal, shown to the owner but not yet reacted to)

- Concept "blue hour over the Alps": deep alpine-blue night background, the
  brand amber from the logo (#F6A93B, logo is amber/black "WEBVISIT 360 FPhoto")
  for tour points, like town lights at dusk.
- Tokens: night `#081230`, dusk `#14244f`, horizon `#2a3f7a`, amber `#f6a93b`,
  ember `#ffd27a`, snow `#eef2f8`, mist `#93a3c4`.
- Type: Unbounded (display, wide like the "360" in the logo) + Schibsted Grotesk
  (text). Sentence case, no all-caps labels.
- Globe: globe.gl 2.46 (or react-globe.gl / R3F in the real build). Open on
  Europe from space, one orchestrated fly-in to Slovenia (~altitude 0.07).
  Satellite tiles via `globeTileEngineUrl` so the zoom into Slovenia is crisp
  (ESRI World Imagery works with CORS for a prototype; production needs a
  licensed tile source such as MapTiler/Mapbox). Municipality borders as thin
  vector lines; tour municipalities filled amber, translucent.
- Points: občine = labelled amber markers; businesses = small dots, name on hover.
  Hide labels when zoomed out. Respect `prefers-reduced-motion`.
- Click a point → side panel (bottom sheet on mobile) with a **live draggable 360
  preview** of the cover (3DVista items), title ("Občina Postojna"), panorama
  count, highlights, and two actions: "Vstopite v sprehod" (opens the real tour
  fullscreen in an iframe overlay, "Nazaj na zemljevid" to close) and
  "Želim takšen sprehod" (enquiry).
- Hero copy idea (Slovenian): "Sprehodite se, preden pridete." with a line about
  360° tours for municipalities, hotels, wineries and shops, and the real numbers
  (17 občin, 150+ podjetij, 4.5M+ ogledov).
- Filters: Občine / Podjetja / Google Zemljevidi (later). Search by name or place.

## Infra

- GitHub: `potocnikvid/webvisit360`. Vercel team `potocnikvids-projects`,
  project `webvisit` (https://webvisit.vercel.app) builds this repo; the custom
  domain www.webvisit360.com currently shows the old "work in progress" site.
  Tour subdomains `*.webvisit360.com` are separate Vercel projects — don't touch.
- Contact on old site: Agencija Sinhron d.o.o.; social: facebook.com/Webvisit360,
  instagram.com/webvisit360, kuula.co/profile/WEBVISIT360.

## Next steps for the cloud session

1. Build the globe prototype on this branch (Next.js App Router + TypeScript is
   fine; replace the old app), using `redesign/data/tours.json` and `geo.json`.
2. Push; if the Vercel Git integration is on, the branch gets a preview URL —
   report it to the owner. If not, say so.
3. Get the owner's reaction, then write the design doc and plan for the full
   site. Do not merge to `main` or touch production without the owner's OK.

## Prototype status (cloud session, 2026-11-04)

Built on this branch, replacing the 2023 pages-router app (old `public/` assets kept):

- `app/` Next.js 15 App Router, `components/Experience.tsx` (UI state, hero, finder,
  panel, enquiry stub, tour overlay), `components/Globe.tsx` (globe.gl: ESRI imagery
  tiles, blue-hour lighting, country outlines far out / municipality borders up close,
  tour municipalities filled amber, HTML markers with label de-cluttering, fly-in),
  `components/PanoPreview.tsx` (draggable three.js 360 preview of 3DVista covers).
- Data is served from `public/data/` (copies of `redesign/data/tours.json`, `geo.json`).
- `geo.json` municipality rings were counter-clockwise (RFC 7946); globe.gl/d3 needs
  clockwise exteriors or each polygon fills the whole globe. Fixed with
  `redesign/data/scripts/rewind.py`; re-run it after regenerating geo.json.
- Not done on purpose (prototype): enquiry form, "Kako deluje"/"Cenik" pages, English,
  Google Maps layer (chip shown as "kmalu"), licensed tile source.

## Google Maps layer (added 2026-11-04)

- Source: the "Webvisit360 – FPhoto" contributor profile (10,607 photos, 28.5M views).
  Google lists only 10 photos to signed-out visitors, so the owner ran
  `scripts/gmaps_console_export.js` in their signed-in browser; the result is
  `raw/google_photos.json`. The profile setting "show photos on profile" was turned on
  for this and can be turned off again.
- `scripts/build_google.py` groups photos by place (680 places) and merges them into
  `tours.json`: 630 new items (`kind`/`source` = "google"); 50 places that already have a
  Kuula/3DVista tour get a `gmaps` link instead of a duplicate point. Copy tours.json to
  `public/data/` after rebuilding.
- Google items: `url` = Street View embed (iframe-able), `mapsUrl` = place page,
  `cover` = full 2048×1024 equirectangular from lh3 (CORS ok) for the live preview.
- The Street View Publish API returned 0 photos for the account that signed in; the photos
  are tagged as API uploads, so the right account would probably work too. Not needed now.

## Finished site (2026-11-05)

Built from `docs/superpowers/specs/2026-11-05-webvisit360-site-design.md` and the plan in
`docs/superpowers/plans/2026-11-05-webvisit360-site.md`:

- Fly-in to the visitor's approximate location (Vercel IP headers, SI/HR/AT/IT/HU only),
  "closest to you" card, type chips (13 types from `scripts/classify.py`), exact-location button.
- SL/EN page copy in `lib/i18n.ts` with a toggle; the chat answers in the visitor's language.
- Enquiry chat on Claude Haiku 5.5 (`/api/chat`), confirm card, email via Resend
  (`/api/enquiry`), mailto fallback, Upstash rate limits, privacy notice, footer.
- Env vars and owner setup steps: `README.md`.
