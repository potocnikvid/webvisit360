import { z } from "zod";
import { copy } from "./i18n";
import type { PlaceType } from "./types";
import { describeSource, type Source } from "./attribution";

const Project = z.object({
  placeType: z.string().min(1).max(100),
  placeName: z.string().min(1).max(200),
  town: z.string().max(100),
  size: z.string().max(500),
  details: z.string().max(1000),
  timing: z.string().max(200),
  language: z.string().max(20),
  estimatedPanoramas: z.number().int().min(1).max(2000),
});

/** What the chat proposes: the contact details may still be missing; the summary card asks for them. */
export const ProposalSchema = Project.extend({
  contactName: z.string().max(200),
  email: z.string().max(200).optional(),
  phone: z.string().max(40).optional(),
});

/** Digits, spaces and + ( ) / . - only, with at least 6 digits. */
const PHONE = /^\+?[\d\s()\/.-]{6,25}$/;

/** What the visitor confirms and is emailed to Vid: name, email and phone all required. */
export const EnquirySchema = Project.extend({
  contactName: z.string().trim().min(1).max(200),
  email: z.email().max(200),
  phone: z
    .string()
    .trim()
    .regex(PHONE)
    .refine((p) => p.replace(/\D/g, "").length >= 6),
});

export type Proposal = z.infer<typeof ProposalSchema>;
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

/**
 * The email to Vid. With `forVisitor`, only what the visitor told us: it becomes the body of
 * the visitor's own fallback email, so the internal estimate and site context stay out.
 */
export function renderEnquiryEmail(
  e: Enquiry,
  ctx: ChatContext,
  transcript: TranscriptLine[],
  { forVisitor = false, source }: { forVisitor?: boolean; source?: Source | null } = {},
) {
  const { low, high } = priceRange(e.estimatedPanoramas);
  const internal = !forVisitor;
  const lines = [
    internal ? "Novo povpraševanje z webvisit360.com" : "Povpraševanje za 360° virtualni sprehod",
    "",
    `Kdo: ${e.contactName}`,
    e.email && `E-pošta: ${e.email}`,
    e.phone && `Telefon: ${e.phone}`,
    `Kaj: ${e.placeName}${e.town ? `, ${e.town}` : ""} (${e.placeType})`,
    e.size && `Obseg: ${e.size}`,
    e.details && `Podrobnosti: ${e.details}`,
    e.timing && `Kdaj: ${e.timing}`,
    internal && `Ocena: ~${e.estimatedPanoramas} panoram → ${low}–${high} € (20–70 € / panoramo)`,
    internal && `Jezik: ${e.language}`,
    internal && (ctx.town || ctx.country) ? `Obiskovalec približno iz: ${[ctx.town, ctx.country].filter(Boolean).join(", ")}` : null,
    internal && `Izbrana vrsta na strani: ${ctx.type === "all" ? copy.sl.filter.all : copy.sl.types[ctx.type]}`,
    internal && ctx.viewed.length ? `Ogledani sprehodi: ${ctx.viewed.join(", ")}` : null,
    internal && source ? `Od kod: ${describeSource(source)}` : null,
  ].filter((l): l is string => typeof l === "string");
  if (transcript.length) {
    lines.push("", "— Pogovor —");
    for (const t of transcript) lines.push(`${t.role === "visitor" ? "Obiskovalec" : "Asistent"}: ${t.text}`);
  }
  return { subject: `Povpraševanje: ${e.placeName}${e.town ? `, ${e.town}` : ""}`, text: lines.join("\n") + "\n" };
}

export const mailtoHref = (to: string, subject: string, body: string) =>
  `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
