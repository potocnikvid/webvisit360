# Visit channel on click events

**Why:** Vercel's dashboard shows where visits come from and which buttons are clicked, but not the two
together, so "how many ChatGPT visitors sent an enquiry?" can only be answered by reading enquiry emails.

**What:** every custom event (Place opened, Tour entered, Enquiry opened, Enquiry sent) carries a
`channel` property: the visit's first source as one short English label, from the same detection the
enquiry emails use (`lib/attribution.ts`).

Channel labels, first match wins: `Google Ads` / `Microsoft Ads` (ad click ids) · `Campaign: <utm_source>` ·
a known referrer (`Google search`, `Bing search`, `DuckDuckGo search`, `Gemini`, `ChatGPT`, `Perplexity`,
`Copilot`, `Claude`, `Facebook`, `Instagram`, `LinkedIn`) · `Webvisit360 tour` (a *.webvisit360.com tour
page) · any other referrer host · `Direct` · `Unknown` (no source remembered).

**Constraint:** Vercel Pro keeps 2 properties per custom event (8 with Web Analytics Plus). Place opened
and Tour entered used `kind` and `type`; they now send one `place` property (`<kind>/<type>`, e.g.
`google/trgovine`) plus `channel`. My call: the combinations are few (24 today) and still read clearly.

**Approaches considered:** (1) channel on each event (picked: one dashboard, no new tool, no cookies);
(2) a separate "Visit started" event per channel (can't be tied to clicks in Vercel); (3) a product
analytics tool with sessions/funnels (needs consent banner; out of proportion).

**Non-goals:** no new storage, identifiers or cookies; the email "Od kod" line stays as it is.
Privacy notice: one sentence that clicks are counted together with where the visit came from.
