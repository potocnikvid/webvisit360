import { Resend } from "resend";
import { z } from "zod";
import { EnquirySchema, mailtoHref, renderEnquiryEmail, type ChatContext, type TranscriptLine } from "@/lib/enquiry";
import { clientIp, limit } from "@/lib/limits";

export const runtime = "nodejs";

const Body = z.object({
  enquiry: z.unknown(),
  context: z.object({
    town: z.string().nullable(),
    country: z.string().nullable(),
    type: z.string(),
    viewed: z.array(z.string()).max(50),
    lang: z.string(),
  }),
  transcript: z.array(z.object({ role: z.enum(["visitor", "assistant"]), text: z.string().max(4000) })).max(60),
  website: z.string().optional(),
});

const to = () => process.env.ENQUIRY_TO || "vid.slovenia7@gmail.com";

const fail = (status: number, subject: string, body: string) =>
  Response.json({ ok: false, mailto: mailtoHref(to(), subject, body.slice(0, 1500)) }, { status });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, "Povpraševanje", "");
  const { context, transcript, website } = parsed.data;
  const ctx = context as ChatContext;
  const lines = transcript as TranscriptLine[];
  // Bots fill the hidden field; tell them it worked and do nothing.
  if (website) return Response.json({ ok: true });

  const enquiry = EnquirySchema.safeParse(parsed.data.enquiry);
  if (!enquiry.success) {
    return fail(400, "Povpraševanje", lines.map((l) => l.text).join("\n"));
  }
  const { subject, text } = renderEnquiryEmail(enquiry.data, ctx, lines);
  // What the visitor sees in their own fallback email: no internal estimate.
  const summary = renderEnquiryEmail(enquiry.data, ctx, [], { forVisitor: true }).text;

  if (!(await limit("send", clientIp(req)))) return fail(429, subject, summary);
  if (!process.env.RESEND_API_KEY) return fail(503, subject, summary);

  try {
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.ENQUIRY_FROM || "Webvisit360 <onboarding@resend.dev>",
      to: to(),
      replyTo: enquiry.data.email,
      subject,
      text,
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("Enquiry email failed:", err);
    return fail(502, subject, summary);
  }
  return Response.json({ ok: true });
}
