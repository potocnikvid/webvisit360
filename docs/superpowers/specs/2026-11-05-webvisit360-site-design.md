# webvisit360.com — finished site design

Date: 2026-11-05. Branch: `globe-redesign`. Builds on the globe prototype described in
`redesign/BRIEF.md` (read that first: data sources, brand tokens, infra).

## Intent

Webvisit360 (FPhoto, Agencija Sinhron d.o.o.) makes 360° virtual tours for
municipalities (občine), hotels, wineries, restaurants, shops and other businesses.
The site has one job: **sell the experience by showing each visitor work like theirs,
close to them, and make asking for an offer effortless.**

The owner's examples:
- A mayor should immediately see the občine closest to theirs that already have a tour.
- A hotel owner should first see the hotels closest to their own.

Everything below serves that. The globe is the wow moment; relevance ("this is near me
and like me") is what converts; the enquiry chat is how a convinced visitor reaches Vid.

## Goals

1. On first load, without any question or permission prompt, the globe flies to the
   visitor and shows the closest občina tour plus the most prominent work nearby.
2. One tap re-tailors everything to the visitor's type (hotels, wineries, …): closest
   examples of that type first, globe flies to them.
3. Every place is filterable by a visitor-facing type (list below).
4. An AI enquiry chat, scoped strictly to virtual-tour enquiries, collects a useful
   enquiry and emails it to Vid.
5. Works on phones as well as desktop.

## Non-goals (for this round)

- Separate "how it works", pricing or about pages. The site is the globe, the tours,
  the chat and a footer. (Owner confirmed the feature list; extra pages were not asked for.)
- A CMS or admin UI. Data stays in `redesign/data/` built by scripts.
- User accounts, saved favourites, analytics dashboards.
- Switching the production domain www.webvisit360.com (owner does this when happy).

## Anti-goals (would make it a failure even if it "works")

- The chat quoting a price for a project, or inventing facts about the service.
- The chat answering anything unrelated to getting a virtual tour.
- A browser location permission pop-up the moment someone lands.
- Bots flooding Vid's inbox or running up the Claude API bill.
- A hotel owner having to dig to find hotels.

## Audience

Decision-makers who might buy a tour: mayors and municipal staff, hotel/apartment
owners, winemakers, restaurateurs, shop and showroom owners, clinics, sports venues,
real-estate sellers. Mostly Slovenian; some foreign.

## 1. First visit: "fly first, then tailor" (owner chose option C)

Mockup: `.superpowers/brainstorm/*/content/onboarding-v2.html`, option C.

1. Globe opens on Europe as today (`START`), then flies in — but the fly-in ends over
   the **visitor's approximate location** instead of Slovenia's centre.
2. Approximate location comes from the request, not the browser: Vercel adds
   `x-vercel-ip-latitude`, `x-vercel-ip-longitude`, `x-vercel-ip-city`,
   `x-vercel-ip-country` headers. Read them server-side (route handler or server
   component) and pass to the client. No prompt, town-level accuracy. Not stored.
3. A card shows the closest občina tour and its distance
   ("Najbližja občina z našim sprehodom · Občina Žalec · 8 km") with
   "Vstopite v sprehod", plus "in N drugih sprehodov v 25 km".
4. Under the globe, a row of type chips (see §2). **Občine** is pre-selected.
   Tapping a type re-sorts by distance for that type, highlights those pins, and flies
   so the closest few are in view.
5. A small "Uporabi mojo natančno lokacijo" link asks the browser for precise
   geolocation on demand only.
6. Visitors may ignore all of it and drag the globe freely; the existing search box
   stays.
7. **Fallback** (my call): location unknown, or outside Slovenia and its neighbours
   (SI, HR, AT, IT, HU) → today's fly-in to all of Slovenia, chips still shown, no
   "near you" card. Within a neighbour country but far away, still show the closest
   examples with their distance.
8. Respect `prefers-reduced-motion` (no fly animation, jump directly).

"Most prominent" = Kuula views, else panorama count × weight (existing `importance()`
in `components/Globe.tsx`). "Nearby" ranking: distance first, prominence breaks ties
within ~2 km.

## 2. Types (the filter list the owner asked for)

Drafted for every one of the 797 places by `redesign/data/scripts/classify.py`
→ `redesign/data/locations-by-type.csv` (columns: type, name, town, source, Google
category, id, why the rule matched). Google places are typed from their Google Maps
category, others from their name. **The owner reviews the CSV**; corrections go into
`OVERRIDES` in the script, then the script is re-run.

| key | Slovenian label | English label | count (draft) |
|---|---|---|---|
| obcina | Občine | Municipalities | 17 |
| nastanitve | Nastanitve | Places to stay | 84 |
| vino | Vinarne in pivovarne | Wineries & breweries | 15 |
| gostinstvo | Gostinstvo | Food & drink | 115 |
| zdravje | Zdravje in lepota | Health & beauty | 101 |
| znamenitosti | Znamenitosti in narava | Sights & nature | 92 |
| sport | Šport in prosti čas | Sport & leisure | 48 |
| kraji | Kraji in panorame | Towns & aerial views | 19 |
| nepremicnine | Nepremičnine | Real estate | 7 |
| trgovine | Trgovine in saloni | Shops & showrooms | 194 |
| podjetja | Podjetja in storitve | Companies & services | 76 |
| javno | Javne ustanove | Public institutions | 6 |
| drugo | Drugo | Other | 23 (owner to sort) |

Build step: extend the classifier (or a small follow-up script) to write `type` into
`redesign/data/tours.json`, copy to `public/data/`, and add `type` to `Tour` in
`lib/types.ts`. Chips on the globe show the main types; the rest sit behind "Več".
Which types are "main" is the builder's call guided by counts and the owner's examples
(občine, hotels/stays, wineries, food, shops at minimum). The old
Občine/Podjetja/Google chips are replaced by types; source (Kuula, 3DVista, Google) is
no longer a filter.

## 3. Enquiry chat (AI)

Opens from "Želim takšen sprehod" on any tour panel and from a persistent button
(corner on desktop, bottom bar on mobile). Friendly, short, playful but professional.

**Model and keys** (owner decided): Claude **Haiku 5.5** (`claude-haiku-5-5`) via the
official `@anthropic-ai/sdk`, called from a Next.js route handler. Owner creates the
API key at platform.claude.com and sets `ANTHROPIC_API_KEY` in Vercel. Never in code
or the client bundle.

**Language** (owner decided: Slovenian by default, otherwise the visitor's language):
detect from `navigator.language` / `Accept-Language`; Slovenian if `sl` or unknown;
otherwise reply in the visitor's language, and always follow the language the visitor
actually writes in.

**Scope** (owner decided): answers only questions about getting a virtual tour —
how it works, what is included, what affects price, timing, next steps, what the
tours on the site are. Politely declines anything else and steers back.

**Context it starts with**: visitor's approximate town, selected type chip, and which
tours they opened (names), so it doesn't re-ask.

**What it collects**, one quick question at a time with tap-to-answer buttons where
possible (my call on the exact list):
1. What they'd like filmed (type of place; skip if known), name of the place.
2. Roughly how big: a few spaces / a whole venue / a whole občina; indoor, outdoor,
   drone.
3. When they'd like it.
4. Name and email or phone (at least one).
Then it shows a short summary to confirm, and only on confirm sends the enquiry.

**Pricing policy** (owner decided): never give fixed values or a project price.
Explain that price depends on the number of panoramas and the size/type of the
project, and that Vid sends a **personal offer**. The internal rough range
(20–70 € per panorama depending on size and other factors) is **never shown to the
visitor** (my call — the owner said "don't give out fixed values"); it is used only
for the estimate in the email to Vid. Promised reply time: "v kratkem" (owner to
confirm a specific promise, e.g. "v 1–2 delovnih dneh").

**Implementation shape** (builder may refine): the model is given one client tool,
e.g. `submit_enquiry`, with a strict schema (type, place name, town, size, scope
notes, timing, contact name, email, phone, language, estimated panoramas). The server
validates and sends the email only after the visitor confirmed the summary in the UI
(the confirm button calls the server; the model doesn't send on its own). Keep the
system prompt stable for prompt caching; put per-visitor context in the first user
turn. Stream replies.

**Email** (owner decided: Resend): route handler sends via Resend
(`RESEND_API_KEY`). Recipient from env `ENQUIRY_TO` = `vid.slovenia7@gmail.com` now,
`webvisit360@gmail.com` in production (owner changes the env var). Contents:
who/what/where/size/timing/contact, the model's estimate of panoramas and the implied
range from the 20–70 € rule, which tours they viewed, approximate location, language,
and the full chat transcript at the bottom. `Reply-To` = visitor's email when given.
Constraint: Resend can only send to arbitrary recipients from a **verified domain**;
until `webvisit360.com` is verified in Resend (DNS records), sending works only to
the Resend account owner's own address. Owner sets this up.

**Abuse protection** (owner wants no spam/bill run-up): honeypot field, cap on turns
per conversation (~20) and characters per message (~1,000), `max_tokens` cap per
reply, per-IP rate limits on both the chat and send endpoints, and a global daily cap.
Limits are kept in **Upstash Redis** added through the Vercel Marketplace (free tier;
my call — in-memory limits don't survive serverless scale-out). Starting numbers (my
calls, one env var each): 30 chat messages per IP per hour, 5 sends per IP per day,
**500 conversations per day** globally. At Haiku 5.5 prices that is a worst case of
a few euros a day. As a second safety net the owner sets a monthly spend limit on the
Anthropic Console. If the Redis env vars are absent (local dev), limits are skipped
with a console warning.

**When the chat can't help** (my call; a lost lead is the costliest failure): if a
limit is hit, the API key is missing, or Claude errors, the chat shows a short
apology and a plain fallback — "Pišite nam na …" with a `mailto:` link to
`ENQUIRY_TO` (subject prefilled, and the conversation so far in the body). If the
Resend send fails after the visitor confirmed, show the same `mailto:` with the
confirmed summary prefilled, so nothing typed is lost. Email is the only record of an
enquiry; no database of enquiries this round.

**Privacy** (my call; GDPR — the visitor's name, email and phone pass through
Anthropic and Resend): one line under the chat input — "Vaše podatke uporabimo samo za
pripravo ponudbe. Več o zasebnosti." — linking to a short privacy notice in a modal
(not a separate page), also linked from the footer. The notice names the controller
(Agencija Sinhron d.o.o.), what is collected (chat text, contact details, town-level
location from IP which is not stored), the processors (Anthropic for the chat, Resend
for email, Vercel hosting), purpose (preparing an offer), retention (in Vid's inbox)
and how to ask for deletion. Owner should have the wording checked; it is copy in the
dictionary file.

## 4. Site language

Chat: as §3. Page UI (my call): Slovenian by default; English when the browser
language isn't Slovenian or a close neighbour language (hr, bs, sr); a small SL/EN
toggle in the top bar. Copy lives in one dictionary file. Place names stay as they are.

## 5. Rest of the page

Keep the prototype's structure: top bar (logo, "Želim svoj sprehod" → opens chat),
hero copy, stats, globe, finder/search, side panel / bottom sheet with live 360 preview,
full-screen tour overlay. Remove the "Kako deluje" / "Cenik" links that lead nowhere
(non-goal), or point them at the chat. Add a footer: Agencija Sinhron d.o.o., contact
email, Facebook / Instagram / Kuula links (from the brief).

## 6. Constraints

- Next.js 15 App Router + TypeScript + globe.gl, as built. Deployed on Vercel project
  `webvisit` from this repo; work stays on `globe-redesign` (preview URL) until the
  owner approves production. Don't touch `*.webvisit360.com` tour projects.
- Map imagery is ESRI World Imagery (fine for a prototype; production needs a licensed
  tile source per the brief — not in scope of this round, flagged for the owner).
- The close-zoom hitbox fix (`6e833af`, stroke lift in `Globe.tsx`) must keep working.

## 7. Owner setup steps (outside the code)

1. platform.claude.com: create an API key, set a monthly spend limit; add
   `ANTHROPIC_API_KEY` to the Vercel project (Preview + Production).
2. Resend: create the account **with vid.slovenia7@gmail.com**, so enquiries can be
   delivered there before the domain is verified; add `RESEND_API_KEY` and
   `ENQUIRY_TO=vid.slovenia7@gmail.com` to Vercel. Later verify `webvisit360.com`
   in Resend (DNS records), then send from e.g. `ponudbe@webvisit360.com` and switch
   `ENQUIRY_TO` to `webvisit360@gmail.com`.
3. Vercel Marketplace: add Upstash Redis to the `webvisit` project (sets its env vars).
4. Note: Vercel's Hobby plan is for non-commercial use; a business site belongs on Pro.
   The owner decides; nothing in the build depends on it.

Until steps 1–3 are done, the builder tests the chat locally against a real key the
owner provides, or with the model call mocked; the send path can be tested against
Resend's test mode. The plan should put an end-to-end check on the preview URL after
the owner's setup.

## 8. Left to the builder

Component structure, styling details within the brand tokens in the brief, which
chips are visible vs. under "Več", the exact chat UI, the rate-limit mechanism, test
strategy, and the order of work.

## Decided by Claude, not yet confirmed by the owner (check these)

- Občine chip pre-selected on first visit.
- Fallback for unknown / far-away visitors (§1.7).
- 20–70 € range never shown to visitors, only used in Vid's email.
- Reply-time wording "v kratkem".
- Page UI in SL + EN only (chat speaks any language).
- Privacy line under the chat plus a short privacy notice in a modal.
- Upstash Redis for rate limits; 500 conversations/day global cap and the per-IP limits.
- `mailto:` fallback whenever the chat or the send fails; no enquiry database.
- The 13 types and their labels; 23 places left as "Drugo" for the owner.
