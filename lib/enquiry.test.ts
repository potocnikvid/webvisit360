import { describe, expect, test } from "vitest";
import { EnquirySchema, ProposalSchema, mailtoHref, priceRange, renderEnquiryEmail, type ChatContext, type Enquiry } from "./enquiry";

const enquiry: Enquiry = {
  placeType: "Hotel",
  placeName: "Hotel Lipa",
  town: "Laško",
  size: "30 sob, restavracija, wellness",
  details: "notranjost in zunanjost, dron",
  timing: "spomladi",
  contactName: "Ana Novak",
  email: "ana@hotel-lipa.si",
  phone: "041 123 456",
  language: "sl",
  estimatedPanoramas: 30,
};

const ctx: ChatContext = { town: "Celje", country: "SI", type: "nastanitve", viewed: ["Hotel A plus", "Apartments Hanny"], lang: "sl" };

describe("EnquirySchema", () => {
  test("accepts name, email and phone", () => expect(EnquirySchema.safeParse(enquiry).success).toBe(true));
  test.each(["contactName", "email", "phone"] as const)("rejects an enquiry without %s", (field) => {
    const { [field]: _gone, ...rest } = enquiry;
    expect(EnquirySchema.safeParse(rest).success).toBe(false);
  });
  test("rejects a blank name or a malformed email or phone", () => {
    expect(EnquirySchema.safeParse({ ...enquiry, contactName: "  " }).success).toBe(false);
    expect(EnquirySchema.safeParse({ ...enquiry, email: "ana@" }).success).toBe(false);
    expect(EnquirySchema.safeParse({ ...enquiry, phone: "abc" }).success).toBe(false);
  });
  test("rejects zero panoramas", () => {
    expect(EnquirySchema.safeParse({ ...enquiry, estimatedPanoramas: 0 }).success).toBe(false);
  });
});

test("a proposal from the chat may still lack contact details (the card asks for them)", () => {
  const { email: _e, phone: _p, ...rest } = enquiry;
  expect(ProposalSchema.safeParse({ ...rest, contactName: "" }).success).toBe(true);
  expect(ProposalSchema.safeParse({ ...rest, placeName: "" }).success).toBe(false);
});

test("priceRange uses 20–70 € per panorama", () => {
  expect(priceRange(30)).toEqual({ low: 600, high: 2100 });
});

test("renderEnquiryEmail has the essentials, transcript last", () => {
  const { subject, text } = renderEnquiryEmail(enquiry, ctx, [
    { role: "visitor", text: "Imamo hotel v Laškem." },
    { role: "assistant", text: "Super! Koliko sob?" },
  ]);
  expect(subject).toContain("Hotel Lipa");
  expect(subject).toContain("Laško");
  for (const s of ["Ana Novak", "ana@hotel-lipa.si", "600–2100 €", "Hotel A plus", "Apartments Hanny"]) expect(text).toContain(s);
  expect(text.trimEnd().endsWith("Super! Koliko sob?")).toBe(true);
});

test("mailtoHref encodes subject and body", () => {
  expect(mailtoHref("a@b.si", "Povpraševanje", "x y")).toBe("mailto:a@b.si?subject=Povpra%C5%A1evanje&body=x%20y");
});
