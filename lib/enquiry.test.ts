import { describe, expect, test } from "vitest";
import { EnquirySchema, mailtoHref, priceRange, renderEnquiryEmail, type ChatContext, type Enquiry } from "./enquiry";

const enquiry: Enquiry = {
  placeType: "Hotel",
  placeName: "Hotel Lipa",
  town: "Laško",
  size: "30 sob, restavracija, wellness",
  details: "notranjost in zunanjost, dron",
  timing: "spomladi",
  contactName: "Ana Novak",
  email: "ana@hotel-lipa.si",
  language: "sl",
  estimatedPanoramas: 30,
};

const ctx: ChatContext = { town: "Celje", country: "SI", type: "nastanitve", viewed: ["Hotel A plus", "Apartments Hanny"], lang: "sl" };

describe("EnquirySchema", () => {
  test("accepts email only", () => expect(EnquirySchema.safeParse(enquiry).success).toBe(true));
  test("accepts phone only", () => {
    const { email: _email, ...rest } = enquiry;
    expect(EnquirySchema.safeParse({ ...rest, phone: "041 123 456" }).success).toBe(true);
  });
  test("rejects neither email nor phone", () => {
    const { email: _email, ...rest } = enquiry;
    expect(EnquirySchema.safeParse(rest).success).toBe(false);
  });
  test("rejects zero panoramas", () => {
    expect(EnquirySchema.safeParse({ ...enquiry, estimatedPanoramas: 0 }).success).toBe(false);
  });
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
