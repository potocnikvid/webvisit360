import type Anthropic from "@anthropic-ai/sdk";
import { copy } from "./i18n";
import type { ChatContext, Proposal } from "./enquiry";

export const MODEL = "claude-haiku-5-5";

/**
 * One line of the /api/chat NDJSON stream. After "done", the client appends
 * { role: "assistant", content: assistant } unchanged, and starts the visitor's next
 * message with the toolResults blocks (if any).
 */
export type ChatEvent =
  | { type: "text"; text: string }
  | { type: "proposal"; enquiry: Proposal; toolUseId: string }
  | { type: "done"; assistant: Anthropic.ContentBlock[]; toolResults: Anthropic.ToolResultBlockParam[] }
  | { type: "error"; reason: "limit" | "unavailable" | "too_long" | "too_many" };
export const MAX_VISITOR_MESSAGES = 20;
export const MAX_MESSAGE_CHARS = 1000;
/** Whole-conversation ceiling, so a forged history can't inflate the bill. */
const MAX_TOTAL_CHARS = 40_000;

/** Stable across visitors so it can be prompt-cached; per-visitor facts go in <context>. */
export const SYSTEM_PROMPT = `You are the enquiry assistant on webvisit360.com, the website of Webvisit360 (FPhoto, Agencija Sinhron d.o.o.), a Slovenian studio run by Vid that makes 360° virtual tours.

What Webvisit360 does: drone and ground 360° panoramas joined into a virtual tour that visitors can walk through. Clients are municipalities (občine), hotels and apartments, wineries, restaurants, shops and showrooms, clinics, sports venues, real-estate sellers and other businesses. A finished tour can be embedded on the client's own website and published on Google Maps. The globe on this site shows real tours Webvisit360 has made; the visitor may have opened some of them.

Your job: help the visitor ask for a virtual tour, and collect what Vid needs to prepare a personal offer:
1. what they would like filmed: the type of place and its name (skip if the context already says),
2. roughly how big it is: how many rooms or spaces, indoor and/or outdoor, whether aerial drone views are wanted,
3. when they would like it,
4. their name, email address and phone number (Vid needs all three).
Ask one short question at a time. Do not ask for something the visitor or the context already told you.

Questions you may answer: anything about getting a virtual tour with Webvisit360 — how it works, what is included, what affects the price, how long filming takes, what happens next, and what the tours on this site are. If asked about anything else, say briefly and kindly that you can only help with virtual-tour enquiries, and steer back. Never invent facts about Webvisit360 beyond what is written here; if you don't know, say Vid will answer that personally.

Price: never state a price, a price range, or a price per panorama, even if pressed. Explain that the price depends on the number of panoramas and on the size and type of the project, and that Vid will send a personal offer shortly ("v kratkem").

When you know the place, its size and the timing, and have asked for their contact details, call the propose_enquiry tool with a short summary and your estimate of how many panoramas the project needs. Pass any contact detail they did not give as null: the visitor then sees a summary card with name, email and phone fields to complete or correct, and confirms it themselves; nothing is sent until they do. If they want to change something after that, update the details and call propose_enquiry again.

Style: reply in the visitor's language (Slovenian if you are unsure), short and warm, a little playful, professional. Plain sentences, no headings, no lists unless asked.`;

export const PROPOSE_TOOL: Anthropic.Tool = {
  name: "propose_enquiry",
  description:
    "Show the visitor a summary of their virtual-tour enquiry, with name, email and phone fields they complete or correct before confirming. Call once the place, its size and the timing are known and you have asked for their contact details.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "placeType", "placeName", "town", "size", "details", "timing",
      "contactName", "email", "phone", "language", "estimatedPanoramas",
    ],
    properties: {
      placeType: { type: "string", description: "Kind of place, e.g. hotel, winery, municipality." },
      placeName: { type: "string", description: "Name of the place or business." },
      town: { type: "string", description: "Town or municipality; empty string if unknown." },
      size: { type: "string", description: "Rooms/spaces, indoor/outdoor, drone." },
      details: { type: "string", description: "Anything else useful for the offer; empty string if none." },
      timing: { type: "string", description: "When they would like it." },
      contactName: { type: "string" },
      email: { type: ["string", "null"] },
      phone: { type: ["string", "null"] },
      language: { type: "string", description: "Language code the visitor writes in, e.g. sl, en, de." },
      estimatedPanoramas: { type: "integer", description: "Your estimate of panoramas needed." },
    },
  },
};

const textOf = (m: Anthropic.MessageParam) =>
  typeof m.content === "string"
    ? [m.content]
    : m.content.flatMap((b) => (b.type === "text" ? [b.text] : []));

const toolUseIds = (m: Anthropic.MessageParam) =>
  typeof m.content === "string" ? [] : m.content.flatMap((b) => (b.type === "tool_use" ? [b.id] : []));

export function checkHistory(
  history: Anthropic.MessageParam[],
): { ok: true } | { ok: false; reason: "too_long" | "too_many" | "bad_shape" } {
  if (!Array.isArray(history) || history.length === 0 || history.at(-1)!.role !== "user") return { ok: false, reason: "bad_shape" };
  let total = 0;
  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    if (m.role !== (i % 2 === 0 ? "user" : "assistant")) return { ok: false, reason: "bad_shape" };
    if (m.role === "user") {
      if (typeof m.content !== "string" && m.content.some((b) => b.type !== "text" && b.type !== "tool_result"))
        return { ok: false, reason: "bad_shape" };
      if (textOf(m).some((t) => t.length > MAX_MESSAGE_CHARS && !t.startsWith(CONTEXT_OPEN)))
        return { ok: false, reason: "too_long" };
    }
    total += JSON.stringify(m.content).length;
    // A proposal (tool_use) must be answered by tool_result blocks at the start of the next turn.
    const ids = m.role === "assistant" ? toolUseIds(m) : [];
    if (ids.length && i + 1 < history.length) {
      const next = history[i + 1].content;
      const answered = typeof next === "string" ? [] : next.slice(0, ids.length);
      if (!ids.every((id, k) => answered[k]?.type === "tool_result" && answered[k].tool_use_id === id))
        return { ok: false, reason: "bad_shape" };
    }
  }
  if (total > MAX_TOTAL_CHARS) return { ok: false, reason: "too_long" };
  if (history.filter((m) => m.role === "user").length > MAX_VISITOR_MESSAGES) return { ok: false, reason: "too_many" };
  return { ok: true };
}

const CONTEXT_OPEN = "<context>";
/** Most recent opened tours sent to the model. */
const MAX_VIEWED = 15;

function contextBlock(ctx: ChatContext): string {
  const where = [ctx.town, ctx.country].filter(Boolean).join(", ");
  return [
    CONTEXT_OPEN,
    `Visitor's approximate location: ${where || "unknown"}`,
    `Type of place selected on the site: ${ctx.type === "all" ? copy.sl.filter.all : copy.sl.types[ctx.type]}`,
    `Tours the visitor opened: ${ctx.viewed.length ? ctx.viewed.slice(-MAX_VIEWED).join(", ") : "none yet"}`,
    `Browser language: ${ctx.lang || "unknown"}`,
    "</context>",
  ].join("\n");
}

/**
 * The visitor's first message, with what the site knows about them in front. The client builds
 * it once and keeps it in the history unchanged: editing an earlier message later (say, after a
 * language toggle) would invalidate the model's thinking blocks and the prompt cache.
 */
export function firstMessage(text: string, ctx: ChatContext): Anthropic.MessageParam {
  return { role: "user", content: [{ type: "text", text: contextBlock(ctx) }, { type: "text", text }] };
}
