# webvisit360.com

The Webvisit360 site: a 3D globe of every 360° tour Webvisit360 has made, a fly-in to the
closest examples near the visitor, filtering by place type, an AI enquiry chat ("Pano")
that emails the team, and an About page (`/o-nas`). Next.js 15 (App Router) + globe.gl, deployed on Vercel.

- Design: `docs/superpowers/specs/2026-11-05-webvisit360-site-design.md`
- Data and history: `redesign/BRIEF.md`

## Run locally

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # unit and route tests (Vitest)
```

Node.js 22. Locally there are no IP-location headers; set `DEV_VISITOR` in `.env.local`
to pretend to be somewhere, e.g. `DEV_VISITOR=46.2397,15.2677,Celje,SI`.

## Environment variables

| Variable | Needed for | Value |
|---|---|---|
| `ANTHROPIC_API_KEY` | the enquiry chat (Claude Haiku 5.5) | from platform.claude.com |
| `RESEND_API_KEY` | emailing enquiries | from resend.com |
| `ENQUIRY_TO` | where enquiries are delivered (server-only, never shown on the site) | defaults to the owner's inbox |
| `ENQUIRY_FROM` | sender | default `Webvisit360 <onboarding@resend.dev>`; after verifying the domain e.g. `Webvisit360 <ponudbe@webvisit360.com>` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | rate limits | set by the Upstash integration on Vercel |
| `CHAT_DAILY_CONVERSATIONS` | global daily chat cap | default `500` |
| `DEV_VISITOR` | local testing only | `lat,lng,City,CC` |

Without `ANTHROPIC_API_KEY` or `RESEND_API_KEY` the site still works; the chat then offers a
prepared email to the public address instead. Without Upstash the rate limits are off (a warning
is logged).

## Owner setup

1. platform.claude.com: create an API key and set a monthly spend limit; add
   `ANTHROPIC_API_KEY` to the Vercel project (Preview and Production).
2. resend.com: create the account with vid.slovenia7@gmail.com (until a domain is
   verified, Resend only delivers to the account's own address); add `RESEND_API_KEY`,
   and optionally `ENQUIRY_TO`. Later verify `webvisit360.com` in Resend and set `ENQUIRY_FROM`.
3. Vercel Marketplace: add Upstash Redis to the `webvisit` project.

The only contact the site shows is in `lib/contact.ts` (info@webvisit360.com and the company
details). Visitors' fallback emails go there too; personal addresses never reach the browser.

## Place types

Every place has a type (`obcina`, `nastanitve`, `vino`, …) drafted by
`redesign/data/scripts/classify.py`. Review `redesign/data/locations-by-type.csv`, put
corrections in `OVERRIDES` in that script, then run
`python3 redesign/data/scripts/classify.py --write` to update both `tours.json` files.
