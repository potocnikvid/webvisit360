import { z } from "zod";
import { copy } from "./i18n";
import type { PlaceType } from "./types";

/** What the chat proposes and the visitor confirms before it is emailed to Vid. */
export const EnquirySchema = z
  .object({
    placeType: z.string().min(1).max(100),
    placeName: z.string().min(1).max(200),
    town: z.string().max(100),
    size: z.string().max(500),
    details: z.string().max(1000),
    timing: z.string().max(200),
    contactName: z.string().min(1).max(200),
    email: z.email().max(200).optional(),
    phone: z.string().min(5).max(40).optional(),
    language: z.string().max(20),
    estimatedPanoramas: z.number().int().min(1).max(2000),
  })
  .refine((e) => e.email || e.phone, { message: "email or phone required", path: ["email"] });

export type Enquiry = z.infer<typeof EnquirySchema>;

/** What the site knows about the visitor when they chat; sent along with the enquiry. */
export type ChatContext = {
  town: string | null;
  country: string | null;
  type: PlaceType | "all";
  viewed: string[];
  lang: string;
};

export type TranscriptLine = { role: "visitor" | "assistant"; text: string };

/** Internal rule of thumb, never shown to visitors: 20–70 € per panorama. */
export const priceRange = (panoramas: number) => ({ low: panoramas * 20, high: panoramas * 70 });

export function renderEnquiryEmail(e: Enquiry, ctx: ChatContext, transcript: TranscriptLine[]) {
  const { low, high } = priceRange(e.estimatedPanoramas);
  const lines = [
    "Novo povpraševanje z webvisit360.com",
    "",
    `Kdo: ${e.contactName}`,
    e.email && `E-pošta: ${e.email}`,
    e.phone && `Telefon: ${e.phone}`,
    `Kaj: ${e.placeName}${e.town ? `, ${e.town}` : ""} (${e.placeType})`,
    e.size && `Obseg: ${e.size}`,
    e.details && `Podrobnosti: ${e.details}`,
    e.timing && `Kdaj: ${e.timing}`,
    `Ocena: ~${e.estimatedPanoramas} panoram → ${low}–${high} € (20–70 € / panoramo)`,
    `Jezik: ${e.language}`,
    ctx.town || ctx.country ? `Obiskovalec približno iz: ${[ctx.town, ctx.country].filter(Boolean).join(", ")}` : null,
    `Izbrana vrsta na strani: ${ctx.type === "all" ? copy.sl.filter.all : copy.sl.types[ctx.type]}`,
    ctx.viewed.length ? `Ogledani sprehodi: ${ctx.viewed.join(", ")}` : null,
  ].filter((l): l is string => typeof l === "string");
  if (transcript.length) {
    lines.push("", "— Pogovor —");
    for (const t of transcript) lines.push(`${t.role === "visitor" ? "Obiskovalec" : "Asistent"}: ${t.text}`);
  }
  return { subject: `Povpraševanje: ${e.placeName}${e.town ? `, ${e.town}` : ""}`, text: lines.join("\n") + "\n" };
}

export const mailtoHref = (to: string, subject: string, body: string) =>
  `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
