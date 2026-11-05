import { beforeEach, describe, expect, test, vi } from "vitest";

const stream = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({ default: vi.fn(function () { return { messages: { stream } }; }) }));
const limit = vi.fn();
vi.mock("@/lib/limits", () => ({ limit, clientIp: () => "1.2.3.4" }));

const route = await import("./route");
const { POST } = route;

const context = { town: "Celje", country: "SI", type: "nastanitve", viewed: [], lang: "sl" };
const enquiryInput = {
  placeType: "Hotel", placeName: "Hotel Lipa", town: "Laško", size: "30 sob", details: "", timing: "spomladi",
  contactName: "Ana", email: "ana@lipa.si", phone: null, language: "sl", estimatedPanoramas: 30,
};

/** A fake SDK stream: yields events, then resolves finalMessage(). */
function fakeStream(texts: string[], final: { content: unknown[]; stop_reason: string }) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const text of texts) yield { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } };
    },
    finalMessage: async () => final,
  };
}

async function events(body: unknown) {
  const res = await POST(new Request("http://localhost/api/chat", { method: "POST", body: JSON.stringify(body) }));
  const text = await res.text();
  return text.trim().split("\n").map((l) => JSON.parse(l));
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    stream.mockReset();
    limit.mockReset().mockResolvedValue(true);
    process.env.ANTHROPIC_API_KEY = "sk-test";
  });

  test("the honeypot gets a limit error and no model call", async () => {
    expect(await events({ history: [{ role: "user", content: "hi" }], context, website: "x" })).toEqual([{ type: "error", reason: "limit" }]);
    expect(stream).not.toHaveBeenCalled();
  });

  test("an over-long message is refused without a model call", async () => {
    expect(await events({ history: [{ role: "user", content: "x".repeat(1001) }], context })).toEqual([{ type: "error", reason: "too_long" }]);
    expect(stream).not.toHaveBeenCalled();
  });

  test("without an API key the chat is unavailable", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(await events({ history: [{ role: "user", content: "hi" }], context })).toEqual([{ type: "error", reason: "unavailable" }]);
  });

  test("the first message counts against the global daily cap", async () => {
    stream.mockReturnValue(fakeStream(["Živjo"], { content: [{ type: "text", text: "Živjo" }], stop_reason: "end_turn" }));
    await events({ history: [{ role: "user", content: "hi" }], context });
    expect(limit).toHaveBeenCalledWith("conversation", "global");
  });

  test("a hit daily cap is reported as a limit error", async () => {
    limit.mockImplementation(async (kind: string) => kind !== "conversation");
    expect(await events({ history: [{ role: "user", content: "hi" }], context })).toEqual([{ type: "error", reason: "limit" }]);
    expect(stream).not.toHaveBeenCalled();
  });

  test("streams text, then the proposal, then done", async () => {
    const toolUse = { type: "tool_use", id: "tu_1", name: "propose_enquiry", input: enquiryInput };
    stream.mockReturnValue(fakeStream(["Hvala, ", "Ana!"], { content: [{ type: "text", text: "Hvala, Ana!" }, toolUse], stop_reason: "tool_use" }));
    const out = await events({ history: [{ role: "user", content: "hi" }], context });
    expect(out.map((e) => e.type)).toEqual(["text", "text", "proposal", "done"]);
    expect(out[2]).toMatchObject({ toolUseId: "tu_1", enquiry: { placeName: "Hotel Lipa", email: "ana@lipa.si" } });
    expect(out[2].enquiry).not.toHaveProperty("phone");
    expect(out[3].assistant).toHaveLength(2);
    expect(out[3].toolResults).toEqual([{ type: "tool_result", tool_use_id: "tu_1", content: "Shown to the visitor for confirmation." }]);
  });

  test("a proposal without contact details still shows the card, so the visitor can fill them in", async () => {
    const toolUse = { type: "tool_use", id: "tu_4", name: "propose_enquiry", input: { ...enquiryInput, contactName: "", email: null, phone: null } };
    stream.mockReturnValue(fakeStream([], { content: [toolUse], stop_reason: "tool_use" }));
    const out = await events({ history: [{ role: "user", content: "hi" }], context });
    expect(out.map((e) => e.type)).toEqual(["proposal", "done"]);
  });

  test("an invalid proposal shows no card and tells the model what was missing", async () => {
    const toolUse = { type: "tool_use", id: "tu_2", name: "propose_enquiry", input: { ...enquiryInput, placeName: "" } };
    stream.mockReturnValue(fakeStream([], { content: [toolUse], stop_reason: "tool_use" }));
    const out = await events({ history: [{ role: "user", content: "hi" }], context });
    expect(out.map((e) => e.type)).toEqual(["done"]);
    expect(out[0].toolResults[0]).toMatchObject({ tool_use_id: "tu_2", is_error: true });
  });

  test("message 0 is sent exactly as the client stored it, whatever the current context", async () => {
    const ok = () => fakeStream([], { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" });
    stream.mockImplementation(ok);
    const history = [
      { role: "user", content: [{ type: "text", text: "<context>…</context>" }, { type: "text", text: "hi" }] },
      { role: "assistant", content: [{ type: "text", text: "Živjo" }] },
      { role: "user", content: "Imamo hotel." },
    ];
    await events({ history, context });
    await events({ history, context: { ...context, type: "vino", lang: "en" } });
    const [a, b] = stream.mock.calls.map((c) => c[0].messages);
    expect(a[0]).toEqual(history[0]);
    expect(b[0]).toEqual(history[0]);
  });

  test("every request counts against a global daily message cap, not only first turns", async () => {
    stream.mockReturnValue(fakeStream([], { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" }));
    const history = [{ role: "user", content: "a" }, { role: "assistant", content: [{ type: "text", text: "b" }] }, { role: "user", content: "c" }];
    await events({ history, context });
    expect(limit).toHaveBeenCalledWith("message", "global");
  });

  test("a proposal cut off by max_tokens is not shown and the model is told to retry", async () => {
    const toolUse = { type: "tool_use", id: "tu_3", name: "propose_enquiry", input: enquiryInput };
    stream.mockReturnValue(fakeStream([], { content: [toolUse], stop_reason: "max_tokens" }));
    const out = await events({ history: [{ role: "user", content: "hi" }], context });
    expect(out.map((e) => e.type)).toEqual(["done"]);
    expect(out[0].toolResults[0]).toMatchObject({ tool_use_id: "tu_3", is_error: true });
  });

  test("asks for room to think and keeps server-side validation of the tool input", async () => {
    stream.mockReturnValue(fakeStream([], { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" }));
    await events({ history: [{ role: "user", content: "hi" }], context });
    const params = stream.mock.calls[0][0];
    expect(params.max_tokens).toBeGreaterThanOrEqual(2048);
    expect(params.tools[0]).not.toHaveProperty("eager_input_streaming");
  });

  test("a long browsing session (many viewed tours) still chats", async () => {
    stream.mockReturnValue(fakeStream(["ok"], { content: [{ type: "text", text: "ok" }], stop_reason: "end_turn" }));
    const viewed = Array.from({ length: 80 }, (_, i) => `Tour ${i}`);
    const out = await events({ history: [{ role: "user", content: "hi" }], context: { ...context, viewed } });
    expect(out.at(-1).type).toBe("done");
  });

  test("allows a minute for a streamed reply", () => {
    expect(route.maxDuration).toBe(60);
  });

  test("a refusal makes the chat unavailable", async () => {
    stream.mockReturnValue(fakeStream([], { content: [], stop_reason: "refusal" }));
    expect((await events({ history: [{ role: "user", content: "hi" }], context })).at(-1)).toEqual({ type: "error", reason: "unavailable" });
  });
});
