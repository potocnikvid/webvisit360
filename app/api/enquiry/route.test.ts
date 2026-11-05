import { beforeEach, describe, expect, test, vi } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({ Resend: vi.fn(function () { return { emails: { send } }; }) }));

const { POST } = await import("./route");

const enquiry = {
  placeType: "Hotel", placeName: "Hotel Lipa", town: "Laško", size: "30 sob", details: "dron", timing: "spomladi",
  contactName: "Ana Novak", email: "ana@hotel-lipa.si", language: "sl", estimatedPanoramas: 30,
};
const context = { town: "Celje", country: "SI", type: "nastanitve", viewed: [], lang: "sl" };
const post = (body: unknown) =>
  POST(new Request("http://localhost/api/enquiry", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));

describe("POST /api/enquiry", () => {
  beforeEach(() => {
    send.mockReset().mockResolvedValue({ data: { id: "1" }, error: null });
    process.env.RESEND_API_KEY = "re_test";
    process.env.ENQUIRY_TO = "vid@example.com";
  });

  test("sends a valid enquiry to ENQUIRY_TO with the visitor as reply-to", async () => {
    const res = await post({ enquiry, context, transcript: [] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toMatchObject({ to: "vid@example.com", replyTo: "ana@hotel-lipa.si" });
  });

  test("pretends success but sends nothing when the honeypot is filled", async () => {
    const res = await post({ enquiry, context, transcript: [], website: "spam.example" });
    expect(await res.json()).toEqual({ ok: true });
    expect(send).not.toHaveBeenCalled();
  });

  test("rejects an invalid enquiry with a mailto fallback", async () => {
    const res = await post({ enquiry: { ...enquiry, email: undefined }, context, transcript: [] });
    expect(res.status).toBe(400);
    expect((await res.json()).mailto).toMatch(/^mailto:vid@example\.com/);
  });

  test("returns a mailto with the summary when Resend fails", async () => {
    send.mockResolvedValue({ data: null, error: { message: "boom" } });
    const res = await post({ enquiry, context, transcript: [] });
    expect(res.status).toBe(502);
    const { mailto } = await res.json();
    expect(decodeURIComponent(mailto)).toContain("Hotel Lipa");
  });

  test("the visitor's fallback email never shows the internal price estimate", async () => {
    send.mockResolvedValue({ data: null, error: { message: "boom" } });
    const { mailto } = await (await post({ enquiry, context, transcript: [] })).json();
    expect(decodeURIComponent(mailto)).not.toMatch(/€|Ocena/);
  });
});
