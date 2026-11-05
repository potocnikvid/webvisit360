# webvisit360 finished site — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the globe prototype into the finished site: a fly-in to the visitor with the closest examples, filtering by place type, and an AI enquiry chat that emails Vid.

**Architecture:** `app/page.tsx` (server) reads Vercel's IP-location headers and passes a `Visitor` to the client `Experience`. Pure logic lives in small `lib/*` modules with Vitest tests (nearby ranking, visitor parsing, i18n, enquiry schema/email, chat request building, rate limits). Two route handlers: `/api/chat` streams Claude Haiku 5.5 replies as NDJSON and surfaces an enquiry *proposal* (a tool call); `/api/enquiry` validates a visitor-confirmed enquiry and sends it with Resend. Rate limits use Upstash Redis when configured.

**Tech Stack:** Next.js 15.5 App Router, React 19, TypeScript 5.9, globe.gl 2.45, `@anthropic-ai/sdk` 1.5.0, `resend` 6.37.0, `@upstash/ratelimit` 2.2.0, `@upstash/redis` 1.41.0, `zod` 4.6.7, `vitest` 5.1.0.

**Spec:** `docs/superpowers/specs/2026-11-05-webvisit360-site-design.md` (and `redesign/BRIEF.md` for data and brand).

## Global Constraints

- Work on branch `globe-redesign`; never touch production domain or `*.webvisit360.com` tour projects.
- Model: `claude-haiku-5-5`, `thinking: { type: "adaptive" }`, `output_config: { effort: "low" }`, streaming, `max_tokens: 1024` per reply.
- Env vars: `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `ENQUIRY_TO` (default `vid.slovenia7@gmail.com`), `ENQUIRY_FROM` (default `Webvisit360 <onboarding@resend.dev>`), `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CHAT_DAILY_CONVERSATIONS` (default 500), `DEV_VISITOR` (dev only, `"lat,lng,City,CC"`).
- Limits: 20 visitor messages per conversation, 1,000 characters per message, 30 chat messages per IP per hour, 5 sends per IP per day, 500 new conversations per day globally.
- Pricing: the chat never states a price or the 20–70 € range; the range is used only in Vid's email (`panoramas × 20` to `panoramas × 70` €).
- Language: chat replies in the visitor's language, Slovenian when `sl` or unknown; page UI is `sl` or `en` (English unless the browser language is `sl`, `hr`, `bs` or `sr`), with an SL/EN toggle.
- Visitor location from `x-vercel-ip-latitude`, `x-vercel-ip-longitude`, `x-vercel-ip-city` (URL-encoded), `x-vercel-ip-country`; never stored or logged.
- "Near you" applies when country is one of `SI, HR, AT, IT, HU`; otherwise the Slovenia fly-in.
- Types (key → sl / en): `obcina` Občine / Municipalities, `nastanitve` Nastanitve / Places to stay, `vino` Vinarne in pivovarne / Wineries & breweries, `gostinstvo` Gostinstvo / Food & drink, `zdravje` Zdravje in lepota / Health & beauty, `znamenitosti` Znamenitosti in narava / Sights & nature, `sport` Šport in prosti čas / Sport & leisure, `kraji` Kraji in panorame / Towns & aerial views, `nepremicnine` Nepremičnine / Real estate, `trgovine` Trgovine in saloni / Shops & showrooms, `podjetja` Podjetja in storitve / Companies & services, `javno` Javne ustanove / Public institutions, `drugo` Drugo / Other.
- Main chips (always visible, in order): `obcina, nastanitve, vino, gostinstvo, trgovine, zdravje`; the rest behind "Več / More". `obcina` pre-selected.
- Keep the close-zoom border fix in `components/Globe.tsx` (`STROKE_LIFT`) intact.
- All visitor-facing copy lives in `lib/i18n.ts`.

## Review Focus

- No location headers (local dev, VPN, bots) or garbage values → Slovenia fly-in, no "near you" card, no crash. (Task 2 test.)
- A type with few places (e.g. `vino`, 15 in all of Slovenia) → still shows and flies to the closest ones however far, with their distance. (Task 2 test.)
- Visitor keeps chatting after a proposal was shown ("actually it's two buildings") → the next request stays valid for the API (tool_use answered by a tool_result). (Task 5 test.)
- Proposal with neither email nor phone, or an honeypot-filled request → send refused, no email. (Task 4 and 6 tests.)
- 21st message or a 5,000-character paste → friendly refusal without calling Claude. (Task 5 test.)

---

### Task 1: Place types in the data and the `Tour` type, plus test runner

**Files:**
- Modify: `redesign/data/scripts/classify.py` (add `--write`)
- Modify: `redesign/data/tours.json`, `public/data/tours.json` (generated)
- Modify: `lib/types.ts`
- Modify: `package.json` (deps + `"test": "vitest run"`)
- Create: `vitest.config.ts`, `lib/types.test.ts`

**Interfaces:**
- Produces: `type PlaceType = "obcina" | "nastanitve" | "vino" | "gostinstvo" | "zdravje" | "znamenitosti" | "sport" | "kraji" | "nepremicnine" | "trgovine" | "podjetja" | "javno" | "drugo"`; `PLACE_TYPES: readonly PlaceType[]` (order as in Global Constraints); `MAIN_TYPES: readonly PlaceType[]`; `Tour.type: PlaceType`.

- [ ] **Step 1: Install deps** — `npm i @anthropic-ai/sdk@1.5.0 resend@6.37.0 @upstash/ratelimit@2.2.0 @upstash/redis@1.41.0 zod@4.6.7 && npm i -D vitest@5.1.0`; add `"test": "vitest run"`; `vitest.config.ts` with the `@/` alias to the repo root and `environment: "node"`.
- [ ] **Step 2: Write the failing test** `lib/types.test.ts`:

```ts
import data from "../public/data/tours.json";
import { PLACE_TYPES, MAIN_TYPES } from "./types";
test("every place has a known type", () => {
  for (const t of data.items) expect(PLACE_TYPES).toContain((t as { type?: string }).type);
});
test("main chips are a subset in spec order", () => {
  expect(MAIN_TYPES).toEqual(["obcina", "nastanitve", "vino", "gostinstvo", "trgovine", "zdravje"]);
});
test("all 17 občine are typed obcina", () => {
  expect(data.items.filter((t) => t.kind === "obcina").every((t) => (t as { type?: string }).type === "obcina")).toBe(true);
});
```

- [ ] **Step 3: Run** `npm test` — Expected: FAIL (no `type` field / exports missing).
- [ ] **Step 4: Implement** `--write` in `classify.py` (adds `"type"` to each item of `tours.json`, writes both `redesign/data/tours.json` and `public/data/tours.json`, still writes the CSV); run `python3 redesign/data/scripts/classify.py --write`; add `PlaceType`, `PLACE_TYPES`, `MAIN_TYPES`, `Tour.type` to `lib/types.ts`. Leave `Filter` in place until Task 3 removes its use.
- [ ] **Step 5: Run** `npm test && npx tsc --noEmit` — Expected: PASS.
- [ ] **Step 6: Commit** `feat: give every place a type`.

### Task 2: Visitor location and nearby ranking

**Files:**
- Create: `lib/visitor.ts`, `lib/visitor.test.ts`, `lib/nearby.ts`, `lib/nearby.test.ts`

**Interfaces:**
- Produces: `type Visitor = { lat: number; lng: number; city: string | null; country: string | null }`; `parseVisitor(get: (name: string) => string | null, devFallback?: string): Visitor | null`; `isNearCountry(country: string | null): boolean`.
- Produces: `distanceKm(a: {lat:number;lng:number}, b: {lat:number;lng:number}): number` (haversine, R = 6371); `nearest(tours: Tour[], from: {lat:number;lng:number}, opts: { type?: PlaceType; limit: number }): { tour: Tour; km: number }[]` (skips `lat == null`; sorts by km, but within 2 km of each other the more prominent first, prominence = `views ?? scenes * 1000`); `countWithin(tours: Tour[], from, km: number, type?: PlaceType): number`.

- [ ] **Step 1: Write failing tests**
  - `parseVisitor` with headers `46.2397`, `15.2677`, `Celje`, `SI` → `{lat:46.2397,lng:15.2677,city:"Celje",country:"SI"}`; city `%C5%BDalec` → `"Žalec"`.
  - missing latitude, `"abc"`, or lat 95 → `null`; with no headers and `devFallback "46.24,15.27,Celje,SI"` → that visitor.
  - `isNearCountry("SI")`, `("AT")` → true; `("DE")`, `(null)` → false.
  - `distanceKm(Celje, Žalec(46.2516,15.1648))` within 7.5–8.5.
  - `nearest(fixture, Celje, {type:"obcina", limit:2})` → Žalec then Prebold (fixture of 4 občine + a `lat:null` one, which never appears).
  - `nearest(fixture, Celje, {type:"vino", limit:3})` with one winery 120 km away → returns it with `km ≈ 120` (no radius cut-off).
  - two places 0.5 km apart: the one with more views ranks first.
  - `countWithin(fixture, Celje, 25)` counts only places with coordinates within 25 km.
- [ ] **Step 2: Run** `npx vitest run lib/visitor.test.ts lib/nearby.test.ts` — FAIL.
- [ ] **Step 3: Implement** both modules.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat: visitor location and nearby ranking`.

### Task 3: Copy dictionary, near-you fly-in and type chips

**Files:**
- Create: `lib/i18n.ts`, `lib/i18n.test.ts`, `components/NearYou.tsx`
- Modify: `app/page.tsx`, `app/layout.tsx` (`lang` attribute stays `sl`; client updates `document.documentElement.lang`), `components/Experience.tsx`, `components/Globe.tsx` (highlight prop), `app/globals.css`

**Interfaces:**
- Consumes: Task 1 `PlaceType`, `PLACE_TYPES`, `MAIN_TYPES`; Task 2 `Visitor`, `parseVisitor`, `isNearCountry`, `nearest`, `countWithin`, `distanceKm`.
- Produces: `type Lang = "sl" | "en"`; `pickLang(languages: readonly string[]): Lang`; `copy: Record<Lang, Copy>` where `Copy` holds every UI string including `types: Record<PlaceType, string>`; `Experience` props `{ visitor: Visitor | null }`; `Globe` prop `highlightIds: string[]` (adds class `is-near` to those markers).

- [ ] **Step 1: Write failing tests** `lib/i18n.test.ts`: `pickLang(["sl-SI"])`, `(["hr"])`, `(["sr-Latn"])`, `([])` → `"sl"`; `(["de-DE","sl"])` → `"en"` (first preference wins); `(["en-GB"])` → `"en"`; every `PlaceType` has a non-empty label in both languages; `sl` and `en` have identical key sets.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** `lib/i18n.ts`, moving all current Slovenian strings out of `Experience.tsx` and adding English. **Step 4: Run** — PASS.
- [ ] **Step 5: Wire the page.** `app/page.tsx` becomes async, reads `headers()` and renders `<Experience visitor={parseVisitor((n) => h.get(n), process.env.NODE_ENV !== "production" ? process.env.DEV_VISITOR : undefined)} />`.
- [ ] **Step 6: Experience behaviour.**
  - Replace the Vse/Občine/Podjetja/Google chips with type chips: `MAIN_TYPES`, then a "Več" chip that toggles the remaining types inline. State `type: PlaceType | "all"` defaults to `"obcina"`. The globe shows all places always; the selected type drives ranking, highlighting and the search list order (`type` first).
  - When `visitor && isNearCountry(visitor.country)`: after the opening (START) the first fly goes to the closest place of the selected type at `altitude 0.03` instead of `SLOVENIA`; `NearYou` card shows the closest place of the selected type, its km (rounded, `"8 km"`), "Vstopite v sprehod" (selects it), and `countWithin(…, 25)` minus one as "in N drugih sprehodov v 25 km". Otherwise: today's Slovenia fly-in and no card.
  - Tapping a chip: highlight the 5 nearest of that type (`highlightIds`), and fly so they are in view: centre on their mean lat/lng, altitude from the farthest of them (`clamp(maxKm / 2500, 0.012, 0.35)`).
  - "Uporabi mojo natančno lokacijo" → `navigator.geolocation.getCurrentPosition`; on success replace the visitor's lat/lng (keep country) and re-run the chip fly; on error show the `copy.locationDenied` text for 4 s.
  - Language: initial `pickLang(navigator.languages)` on the client, SL/EN toggle in the top bar; persist the choice in `localStorage` (wrapped in try/catch).
  - Every fly (opening, chip, card) uses `ms: 0` when `prefers-reduced-motion: reduce`.
  - Remove "Kako deluje" / "Cenik" links.
- [ ] **Step 7: Verify in the browser** with `DEV_VISITOR="46.2397,15.2677,Celje,SI"` in `.env.local`: fly-in ends near Celje, card says Občina Žalec · 8 km; tap "Nastanitve" → card and fly switch to the nearest stay; toggle EN → all UI strings English; unset `DEV_VISITOR` → Slovenia fly-in, no card. `npm test && npx tsc --noEmit` pass.
- [ ] **Step 8: Commit** `feat: near-you fly-in, type chips and SL/EN copy`.

### Task 4: Enquiry schema, email and send route

**Files:**
- Create: `lib/enquiry.ts`, `lib/enquiry.test.ts`, `lib/limits.ts`, `lib/limits.test.ts`, `app/api/enquiry/route.ts`, `app/api/enquiry/route.test.ts`

**Interfaces:**
- Produces: `EnquirySchema` (zod): `{ placeType: string; placeName: string; town: string; size: string; details: string; timing: string; contactName: string; email?: string; phone?: string; language: string; estimatedPanoramas: number (int 1–2000) }` refined to require `email` or `phone`; `type Enquiry`.
- Produces: `type ChatContext = { town: string | null; country: string | null; type: PlaceType | "all"; viewed: string[]; lang: string }`; `type TranscriptLine = { role: "visitor" | "assistant"; text: string }`.
- Produces: `priceRange(panoramas: number): { low: number; high: number }` (×20, ×70); `renderEnquiryEmail(e: Enquiry, ctx: ChatContext, transcript: TranscriptLine[]): { subject: string; text: string }`; `mailtoHref(to: string, subject: string, body: string): string`.
- Produces: `limit(kind: "chat" | "send" | "conversation", key: string): Promise<boolean>` (true = allowed; `chat` 30/h per IP, `send` 5/day per IP, `conversation` `CHAT_DAILY_CONVERSATIONS`/day on key `"global"`; always true with a single `console.warn` when Upstash env vars are missing); `clientIp(req: Request): string` (first of `x-forwarded-for`, else `"unknown"`).
- Produces: `POST /api/enquiry` body `{ enquiry: Enquiry; context: ChatContext; transcript: TranscriptLine[]; website?: string }` → `200 {ok:true}` | `4xx/5xx {ok:false, mailto: string}`.

- [ ] **Step 1: Write failing tests**
  - schema: valid with email only, valid with phone only, invalid with neither, invalid `estimatedPanoramas: 0`.
  - `priceRange(30)` → `{low:600, high:2100}`.
  - `renderEnquiryEmail`: subject contains place name and town; text contains contact details, `600–2100 €`, the viewed tour names, and the transcript lines last.
  - `mailtoHref("a@b.si","Povpraševanje","x y")` starts with `mailto:a@b.si?subject=Povpra%C5%A1evanje&body=x%20y`.
  - `limit` with no Upstash env → `true`.
  - route (with `vi.mock("resend")`): valid body → `200`, Resend `emails.send` called once with `to: ENQUIRY_TO`, `replyTo` = visitor email; body with `website: "x"` (honeypot) → `200 {ok:true}` but no send; invalid enquiry → `400` with a `mailto`; Resend throws → `502` with a `mailto` whose body contains the summary.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** the three modules and the route (`export const runtime = "nodejs"`). **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat: enquiry email and send route`.

### Task 5: Chat route (Claude Haiku 5.5)

**Files:**
- Create: `lib/chat.ts`, `lib/chat.test.ts`, `app/api/chat/route.ts`, `app/api/chat/route.test.ts`

**Interfaces:**
- Consumes: Task 4 `ChatContext`, `limit`, `clientIp`, `EnquirySchema`.
- Produces: `SYSTEM_PROMPT: string` (stable; no per-visitor data); `PROPOSE_TOOL: Anthropic.Tool` named `propose_enquiry`, `strict: true`, input schema = the `Enquiry` fields; `buildMessages(history: Anthropic.MessageParam[], ctx: ChatContext): Anthropic.MessageParam[]` (prepends a `<context>` text block to the first user message: town, country, selected type label, viewed tours, browser language); `checkHistory(history): { ok: true } | { ok: false; reason: "too_long" | "too_many" | "bad_shape" }`.
- Produces: `POST /api/chat` body `{ history: Anthropic.MessageParam[]; context: ChatContext; website?: string }` → `application/x-ndjson` stream of `{type:"text", text}` | `{type:"proposal", enquiry: Enquiry, toolUseId: string}` | `{type:"done", assistant: Anthropic.ContentBlock[]}` | `{type:"error", reason: "limit" | "unavailable" | "too_long" | "too_many"}`.
- History contract for the client: append `{role:"assistant", content: done.assistant}` unchanged; if it contained a proposal, the next user message must start with a `tool_result` block for `toolUseId` (content `"Shown to the visitor for confirmation."`) followed by the visitor's text.

- [ ] **Step 1: Write failing tests** (`lib/chat.test.ts`)
  - `checkHistory` → `too_long` for a 1,001-char user text; `too_many` for 21 user turns; `bad_shape` when the last message isn't `user`; ok otherwise.
  - `buildMessages` puts `<context>` only in the first user message and leaves later messages byte-identical; with `type:"nastanitve"` the block names "Nastanitve".
  - a history where the assistant's last content has a `tool_use` and the next user message starts with the matching `tool_result` passes `checkHistory`; a user message without it → `bad_shape`.
  - `SYSTEM_PROMPT` contains no digits followed by `€` (no prices) and mentions `propose_enquiry`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** `lib/chat.ts`. System prompt content (write in English, the model replies in the visitor's language): who Webvisit360 is (360° drone and ground panoramas for občine, hotels, wineries, restaurants, shops…, embeddable on the client's site and Google Maps); the visitor-facing goal (collect place type and name, size incl. indoor/outdoor/drone, timing, name and email or phone — one short question at a time, skip what the context already says); only discuss virtual-tour enquiries and politely steer back otherwise; never state a price, a range, or a per-panorama figure — explain price depends on number of panoramas and project size and that Vid sends a personal offer "v kratkem"; when everything is known, call `propose_enquiry` with a summary and your estimate of panoramas; reply in the visitor's language (Slovenian if unsure), short, warm, a little playful, no markdown headings. **Step 4: Run** — PASS.
- [ ] **Step 5: Route test** (`vi.mock("@anthropic-ai/sdk")`): honeypot → `{type:"error",reason:"limit"}` with no SDK call; `too_long` history → that error, no SDK call; missing `ANTHROPIC_API_KEY` → `unavailable`; first user turn calls `limit("conversation","global")`; a mocked stream emitting text then a `propose_enquiry` tool_use yields `text…`, `proposal`, `done` in that order; `stop_reason: "refusal"` → `unavailable`.
- [ ] **Step 6: Implement** the route: honeypot, `checkHistory`, `limit("chat", clientIp(req))`, and on the first user turn `limit("conversation", "global")` — any refusal emits the matching `error` without calling Claude; then `client.messages.stream({ model: "claude-haiku-5-5", max_tokens: 1024, thinking: {type:"adaptive"}, output_config: {effort:"low"}, system: [{type:"text", text: SYSTEM_PROMPT, cache_control:{type:"ephemeral"}}], tools: [PROPOSE_TOOL], messages: buildMessages(history, context) })`; forward `text` deltas; after `finalMessage()`, validate any `propose_enquiry` input with `EnquirySchema` (invalid → treat as text-only turn), emit `proposal` then `done`. Catch SDK errors → `unavailable`. **Step 7: Run** — PASS.
- [ ] **Step 8: Commit** `feat: Claude Haiku enquiry chat route`.

### Task 6: Chat UI, fallback, privacy notice, footer

**Files:**
- Create: `components/Chat.tsx`, `components/PrivacyNotice.tsx`, `lib/ndjson.ts`, `lib/ndjson.test.ts`
- Modify: `components/Experience.tsx`, `app/globals.css`, `lib/i18n.ts`

**Interfaces:**
- Consumes: Task 3 `copy`, `Lang`; Task 4 `Enquiry`, `ChatContext`, `TranscriptLine`, `mailtoHref`, `POST /api/enquiry`; Task 5 `POST /api/chat` stream contract and history contract.
- Produces: `readNdjson(res: Response, onEvent: (e: unknown) => void): Promise<void>`; `<Chat open onClose context lang />`.

- [ ] **Step 1: Failing test** `lib/ndjson.test.ts`: events split across chunk boundaries and a trailing line without `\n` are each delivered once, in order.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement**. **Step 4: Run** — PASS.
- [ ] **Step 5: Build `Chat`**: replaces the prototype's enquiry stub; opens from "Želim takšen sprehod" (panel) and "Želim svoj sprehod" (top bar) and a persistent corner/bottom button; static greeting from `copy` (not a model call); streams replies; quick-reply buttons for size (`copy.sizes`) and timing (`copy.timings`) send their label as the visitor's message; hidden honeypot input `website`; disables input at 20 messages; a `proposal` renders a summary card with "Pošlji" and "Popravi" — "Pošlji" posts to `/api/enquiry` and shows `copy.sent` on success; "Popravi" focuses the input (next message follows the history contract). Any `error` event or failed send shows `copy.chatUnavailable` with a link from `mailtoHref(ENQUIRY_TO, …)` whose body is the transcript or the confirmed summary (the address comes from a `NEXT_PUBLIC_ENQUIRY_TO` env var with the same default). Under the input: `copy.privacyLine` with a button opening `PrivacyNotice`.
- [ ] **Step 6: `PrivacyNotice` and footer**: modal with the copy listed in the spec §3 Privacy (controller Agencija Sinhron d.o.o., data collected, processors Anthropic / Resend / Vercel, purpose, retention, deletion via the contact email), SL and EN. Slim footer line bottom-left: "© Agencija Sinhron d.o.o.", contact email, Facebook, Instagram, Kuula links, "Zasebnost" (opens the modal). Hidden behind open panels on mobile.
- [ ] **Step 7: Verify in the browser** (with a real `ANTHROPIC_API_KEY` in `.env.local` if the owner provided one, otherwise with the route returning `unavailable`): greeting shows; a Slovenian and an English conversation each reach a proposal card; asking "koliko stane?" gets no number; asking an off-topic question gets steered back; without a key, the fallback mailto appears; privacy modal opens; at 375 px width chat, card and footer fit with no horizontal scroll. `npm test && npx tsc --noEmit && npm run build` pass.
- [ ] **Step 8: Commit** `feat: enquiry chat UI, privacy notice and footer`.

### Task 7: Docs, push, preview

**Files:**
- Modify: `redesign/BRIEF.md` (status section), `README.md` (env vars and owner setup from spec §7)

- [ ] **Step 1:** Add a "Finished site (2026-11-05)" section to `BRIEF.md` and an env/setup section to `README.md`.
- [ ] **Step 2:** `npm test && npx tsc --noEmit && npm run build` — all pass.
- [ ] **Step 3: Commit** `docs: env vars and setup for the finished site`; push `globe-redesign` (with the `potocnikvid` GitHub login) and report the Vercel preview URL if one is created.
