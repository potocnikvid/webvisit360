import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MODEL, PROPOSE_TOOL, SYSTEM_PROMPT, checkHistory, type ChatEvent } from "@/lib/chat";
import { ProposalSchema } from "@/lib/enquiry";
import { clientIp, limit } from "@/lib/limits";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.unknown() })).max(60),
  // The visitor's context travels inside the first message (see firstMessage in lib/chat.ts).
  website: z.string().optional(),
});

const ndjson = (run: (send: (e: ChatEvent) => void) => Promise<void>) =>
  new Response(
    new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        await run((e) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n")));
        controller.close();
      },
    }),
    { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } },
  );

/** The tool schema uses null for "not given"; the enquiry schema uses absent fields. */
const dropNulls = (o: unknown) =>
  Object.fromEntries(Object.entries((o ?? {}) as Record<string, unknown>).filter(([, v]) => v !== null));

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  return ndjson(async (send) => {
    if (!parsed.success) return send({ type: "error", reason: "unavailable" });
    const { website } = parsed.data;
    const history = parsed.data.history as Anthropic.MessageParam[];
    if (website) return send({ type: "error", reason: "limit" });

    const check = checkHistory(history);
    if (!check.ok) return send({ type: "error", reason: check.reason === "bad_shape" ? "unavailable" : check.reason });
    if (!(await limit("chat", clientIp(req)))) return send({ type: "error", reason: "limit" });
    // Two global daily caps: new conversations, and every message however the history looks.
    if (history.length === 1 && !(await limit("conversation", "global"))) return send({ type: "error", reason: "limit" });
    if (!(await limit("message", "global"))) return send({ type: "error", reason: "limit" });
    if (!process.env.ANTHROPIC_API_KEY) return send({ type: "error", reason: "unavailable" });

    try {
      const stream = new Anthropic().messages.stream({
        model: MODEL,
        // Includes thinking; the model's brevity, not this cap, keeps replies short.
        max_tokens: 2048,
        thinking: { type: "adaptive" },
        output_config: { effort: "low" },
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        tools: [PROPOSE_TOOL],
        messages: history,
      });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") send({ type: "text", text: event.delta.text });
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") return send({ type: "error", reason: "unavailable" });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of final.content) {
        if (block.type !== "tool_use") continue;
        // A reply cut off by max_tokens may carry a plausible but truncated proposal.
        const complete = final.stop_reason !== "max_tokens";
        const enquiry = complete && block.name === PROPOSE_TOOL.name ? ProposalSchema.safeParse(dropNulls(block.input)) : null;
        if (enquiry?.success) {
          send({ type: "proposal", enquiry: enquiry.data, toolUseId: block.id });
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Shown to the visitor for confirmation." });
        } else {
          const issues = !complete
            ? "the reply was cut off"
            : enquiry?.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") ?? "unknown tool";
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            is_error: true,
            content: `The summary could not be shown (${issues}). Ask the visitor for what is missing, then try again.`,
          });
        }
      }
      send({ type: "done", assistant: final.content, toolResults });
    } catch (err) {
      console.error("Chat request failed:", err);
      send({ type: "error", reason: "unavailable" });
    }
  });
}
