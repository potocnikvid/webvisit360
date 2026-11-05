import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, test } from "vitest";
import { SYSTEM_PROMPT, checkHistory, firstMessage } from "./chat";
import type { ChatContext } from "./enquiry";

const ctx: ChatContext = { town: "Celje", country: "SI", type: "nastanitve", viewed: ["Hotel A plus"], lang: "sl-SI" };
const user = (text: string): Anthropic.MessageParam => ({ role: "user", content: text });
const assistant = (text: string): Anthropic.MessageParam => ({ role: "assistant", content: [{ type: "text", text }] });

describe("checkHistory", () => {
  test("accepts a normal conversation", () => {
    expect(checkHistory([user("Pozdravljeni"), assistant("Živijo!"), user("Imamo hotel.")])).toEqual({ ok: true });
  });
  test("refuses a message over 1,000 characters", () => {
    expect(checkHistory([user("x".repeat(1001))])).toEqual({ ok: false, reason: "too_long" });
  });
  test("refuses a 21st visitor message", () => {
    const h: Anthropic.MessageParam[] = [];
    for (let i = 0; i < 21; i++) h.push(user(`m${i}`), assistant("ok"));
    h.pop();
    expect(checkHistory(h)).toEqual({ ok: false, reason: "too_many" });
  });
  test("refuses a history that doesn't end with the visitor", () => {
    expect(checkHistory([user("a"), assistant("b")])).toEqual({ ok: false, reason: "bad_shape" });
  });
  test("accepts a reply to a proposal that starts with the matching tool_result", () => {
    const h: Anthropic.MessageParam[] = [
      user("a"),
      { role: "assistant", content: [{ type: "tool_use", id: "tu_1", name: "propose_enquiry", input: {} }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "tu_1", content: "Shown to the visitor for confirmation." }, { type: "text", text: "Dve stavbi." }] },
    ];
    expect(checkHistory(h)).toEqual({ ok: true });
  });
  test("refuses a reply to a proposal without the tool_result", () => {
    const h: Anthropic.MessageParam[] = [
      user("a"),
      { role: "assistant", content: [{ type: "tool_use", id: "tu_1", name: "propose_enquiry", input: {} }] },
      user("Dve stavbi."),
    ];
    expect(checkHistory(h)).toEqual({ ok: false, reason: "bad_shape" });
  });
});

describe("firstMessage", () => {
  const first = firstMessage("Pozdravljeni", ctx).content as Anthropic.TextBlockParam[];

  test("puts the context in front of the visitor's text", () => {
    expect(first[0].text).toContain("<context>");
    expect(first[0].text).toContain("Nastanitve");
    expect(first[0].text).toContain("Celje");
    expect(first.at(-1)).toEqual({ type: "text", text: "Pozdravljeni" });
  });

  test("sends only the 15 most recently opened tours", () => {
    const many = firstMessage("x", { ...ctx, viewed: Array.from({ length: 30 }, (_, i) => `T${i}`) }).content as Anthropic.TextBlockParam[];
    expect(many[0].text).toContain("T29");
    expect(many[0].text).not.toContain("T14,");
  });

  test("a long context doesn't count as an over-long visitor message", () => {
    const big = firstMessage("x", { ...ctx, viewed: Array.from({ length: 15 }, () => "y".repeat(90)) });
    expect(checkHistory([big])).toEqual({ ok: true });
  });
});

test("the system prompt states no prices and names the proposal tool", () => {
  expect(SYSTEM_PROMPT).not.toMatch(/\d\s*€|€\s*\d|EUR/);
  expect(SYSTEM_PROMPT).toContain("propose_enquiry");
});
