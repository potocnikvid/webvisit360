// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import Chat from "./Chat";
import { copy } from "@/lib/i18n";
import type { ChatContext } from "@/lib/enquiry";

const t = copy.en;
const ctx: ChatContext = { town: "Celje", country: "SI", type: "nastanitve", viewed: [], lang: "en" };
const bodies: { history: { role: string; content: unknown }[] }[] = [];

beforeEach(() => {
  bodies.length = 0;
  Element.prototype.scrollTo = () => {};
  vi.stubGlobal("fetch", vi.fn(async (_url: string, opts: RequestInit) => {
    bodies.push(JSON.parse(String(opts.body)));
    const done = { type: "done", assistant: [{ type: "text", text: "Sure!" }], toolResults: [] };
    return new Response(JSON.stringify({ type: "text", text: "Sure!" }) + "\n" + JSON.stringify(done) + "\n");
  }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const say = async (text: string) => {
  const before = bodies.length;
  fireEvent.change(screen.getByLabelText(t.chat.placeholder), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: t.chat.send }));
  await waitFor(() => expect(bodies).toHaveLength(before + 1));
  await waitFor(() => expect(screen.queryByText("•••")).toBeNull());
};

test("the first message carries the context and never changes afterwards", async () => {
  const { rerender } = render(<Chat copy={t} context={ctx} from={null} onClose={() => {}} onPrivacy={() => {}} />);
  await say("We have a hotel.");
  rerender(<Chat copy={copy.sl} context={{ ...ctx, type: "vino", lang: "sl" }} from={null} onClose={() => {}} onPrivacy={() => {}} />);
  fireEvent.change(screen.getByLabelText(copy.sl.chat.placeholder), { target: { value: "30 rooms." } });
  fireEvent.click(screen.getByRole("button", { name: copy.sl.chat.send }));
  await waitFor(() => expect(bodies).toHaveLength(2));
  expect(JSON.stringify(bodies[0].history[0])).toContain("<context>");
  expect(bodies[1].history[0]).toEqual(bodies[0].history[0]);
});

test("a long paste explains the limit instead of being cut", async () => {
  render(<Chat copy={t} context={ctx} from={null} onClose={() => {}} onPrivacy={() => {}} />);
  // Browsers silently truncate pastes at maxLength, so the field must not have one.
  expect(screen.getByLabelText(t.chat.placeholder).hasAttribute("maxlength")).toBe(false);
  fireEvent.change(screen.getByLabelText(t.chat.placeholder), { target: { value: "x".repeat(1500) } });
  fireEvent.click(screen.getByRole("button", { name: t.chat.send }));
  expect(screen.getByText(t.chat.tooLong)).toBeTruthy();
  expect(bodies).toHaveLength(0);
});

test("after 20 messages the visitor gets the reason and an email way out", async () => {
  render(<Chat copy={t} context={ctx} from={null} onClose={() => {}} onPrivacy={() => {}} />);
  for (let i = 0; i < 20; i++) await say(`message ${i}`);
  expect(screen.getByText(t.chat.tooMany, { exact: false })).toBeTruthy();
  expect(screen.getByRole("link", { name: /Write to/ }).getAttribute("href")).toMatch(/^mailto:/);
});
