"use client";

import type Anthropic from "@anthropic-ai/sdk";
import { useEffect, useRef, useState } from "react";
import type { ChatEvent } from "@/lib/chat";
import { MAX_MESSAGE_CHARS, MAX_VISITOR_MESSAGES, firstMessage } from "@/lib/chat";
import { EnquirySchema, mailtoHref, type ChatContext, type Proposal, type TranscriptLine } from "@/lib/enquiry";
import type { Copy } from "@/lib/i18n";
import { readNdjson } from "@/lib/ndjson";

export const ENQUIRY_TO = process.env.NEXT_PUBLIC_ENQUIRY_TO || "vid.slovenia7@gmail.com";

type Props = {
  copy: Copy;
  context: ChatContext;
  /** Name of the tour the visitor came from, for the greeting. */
  from: string | null;
  onClose: () => void;
  onPrivacy: () => void;
  /** Closed but kept mounted, so the conversation survives. */
  hidden?: boolean;
};

type Line = TranscriptLine & { streaming?: boolean };
type Fallback = { text: string; mailto: string };

// Show tap-to-answer chips when the assistant just asked about size or timing.
const ASKS_SIZE = /velik|koliko (sob|prostor)|obseg|prostor|dron|how (big|many)|rooms|size|spaces|drone/i;
const ASKS_TIMING = /kdaj|termin|when|timing|timeline/i;

export default function Chat({ copy: t, context, from, onClose, onPrivacy, hidden = false }: Props) {
  const greeting = from ? t.chat.greetingFrom(from) : t.chat.greeting;
  const [lines, setLines] = useState<Line[]>([{ role: "assistant", text: greeting }]);
  const [history, setHistory] = useState<Anthropic.MessageParam[]>([]);
  const [toolResults, setToolResults] = useState<Anthropic.ToolResultBlockParam[]>([]);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  // The card's contact fields, pre-filled from the proposal and editable by the visitor.
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [status, setStatus] = useState<"idle" | "streaming" | "sending" | "sent">("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [fallback, setFallback] = useState<Fallback | null>(null);
  const [input, setInput] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // The greeting follows the language toggle until the conversation starts.
  useEffect(() => {
    if (history.length === 0) setLines([{ role: "assistant", text: greeting }]);
  }, [greeting, history.length]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [lines, proposal, fallback, status]);

  const transcript = (ls: Line[]) => ls.slice(1).map(({ role, text }) => ({ role, text }));
  const transcriptText = (ls: Line[]) =>
    transcript(ls).map((l) => `${l.role === "visitor" ? "Jaz" : "Webvisit360"}: ${l.text}`).join("\n\n");

  const showFallback = (text: string, body: string, href?: string) =>
    setFallback({ text, mailto: href ?? mailtoHref(ENQUIRY_TO, "Povpraševanje za 360° sprehod", body.slice(0, 1500)) });

  const visitorCount = lines.filter((l) => l.role === "visitor").length;
  const lastAssistant = [...lines].reverse().find((l) => l.role === "assistant" && !l.streaming)?.text ?? "";
  const quickReplies =
    status !== "idle" || proposal || fallback || visitorCount === 0
      ? []
      : ASKS_SIZE.test(lastAssistant)
        ? t.chat.sizes
        : ASKS_TIMING.test(lastAssistant)
          ? t.chat.timings
          : [];

  async function send(text: string) {
    text = text.trim();
    if (!text || status !== "idle") return;
    if (text.length > MAX_MESSAGE_CHARS) return setNotice(t.chat.tooLong);
    setNotice(null);
    setProposal(null);
    // The first message carries the context once; earlier messages are never rewritten.
    const message: Anthropic.MessageParam =
      history.length === 0
        ? firstMessage(text, context)
        : { role: "user", content: toolResults.length ? [...toolResults, { type: "text", text }] : text };
    const next: Anthropic.MessageParam[] = [...history, message];
    let shown: Line[] = [...lines, { role: "visitor", text }, { role: "assistant", text: "", streaming: true }];
    setLines(shown);
    setInput("");
    setStatus("streaming");

    const update = (fn: (l: Line) => Line) => {
      shown = [...shown.slice(0, -1), fn(shown[shown.length - 1])];
      setLines(shown);
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ history: next, website: honeypot || undefined }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      let finished = false;
      await readNdjson(res, (raw) => {
        const e = raw as ChatEvent;
        if (e.type === "text") update((l) => ({ ...l, text: l.text + e.text }));
        else if (e.type === "proposal") {
          setProposal(e.enquiry);
          setContact({ name: e.enquiry.contactName ?? "", email: e.enquiry.email ?? "", phone: e.enquiry.phone ?? "" });
        }
        else if (e.type === "done") {
          finished = true;
          update((l) => ({ ...l, streaming: false }));
          setHistory([...next, { role: "assistant", content: e.assistant }]);
          setToolResults(e.toolResults);
          if (shown.filter((l) => l.role === "visitor").length >= MAX_VISITOR_MESSAGES)
            showFallback(t.chat.tooMany, transcriptText(shown));
        } else if (e.type === "error") {
          finished = true;
          // Drop the empty reply bubble; keep what the visitor wrote in the email.
          shown = shown.filter((l) => !(l.streaming && !l.text));
          setLines(shown);
          const message = e.reason === "limit" ? t.chat.limit : e.reason === "too_many" ? t.chat.tooMany : e.reason === "too_long" ? t.chat.tooLong : t.chat.unavailable;
          if (e.reason === "too_long") setNotice(message);
          else showFallback(message, transcriptText(shown));
        }
      });
      if (!finished) throw new Error("stream ended early");
    } catch (err) {
      console.error(err);
      shown = shown.filter((l) => !(l.streaming && !l.text));
      setLines(shown);
      showFallback(t.chat.unavailable, transcriptText(shown));
    } finally {
      setStatus((s) => (s === "streaming" ? "idle" : s));
    }
  }

  async function confirm() {
    if (!proposal || !enquiry.success) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enquiry: enquiry.data, context, transcript: transcript(lines), website: honeypot || undefined }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; mailto?: string };
      if (json.ok) {
        setStatus("sent");
        setProposal(null);
        return;
      }
      setStatus("idle");
      showFallback(t.chat.unavailable, transcriptText(lines), json.mailto);
    } catch {
      setStatus("idle");
      showFallback(t.chat.unavailable, transcriptText(lines));
    }
  }

  // Name, email and phone are all required before the enquiry can be sent.
  const enquiry = EnquirySchema.safeParse({ ...proposal, contactName: contact.name, email: contact.email, phone: contact.phone });

  const locked = status !== "idle" || !!fallback || visitorCount >= MAX_VISITOR_MESSAGES;

  return (
    <div className="chat" role="dialog" aria-label={t.chat.label} hidden={hidden}>
      <button className="panel__close" onClick={onClose} aria-label={t.panel.close}>
        ×
      </button>
      <h2 className="chat__title">{t.chat.title}</h2>
      <div className="chat__log" ref={logRef} aria-live="polite">
        {lines.map((l, i) => (
          <p key={i} className={`chat__msg chat__msg--${l.role}`}>
            {l.text || (l.streaming ? <span className="chat__typing" aria-hidden>•••</span> : null)}
          </p>
        ))}
        {proposal && (
          <div className="chat__card">
            <h3>{t.chat.summary}</h3>
            <dl>
              <dt>{t.chat.fields.place}</dt>
              <dd>{[proposal.placeName, proposal.town].filter(Boolean).join(", ")} ({proposal.placeType})</dd>
              <dt>{t.chat.fields.size}</dt>
              <dd>{[proposal.size, proposal.details].filter(Boolean).join(" · ")}</dd>
              <dt>{t.chat.fields.timing}</dt>
              <dd>{proposal.timing}</dd>
            </dl>
            <div className="chat__contact">
              {(
                [
                  ["name", "text", "name"],
                  ["email", "email", "email"],
                  ["phone", "tel", "tel"],
                ] as const
              ).map(([key, type, autoComplete]) => (
                <label key={key}>
                  <span>{t.chat.fields[key]}</span>
                  <input
                    type={type}
                    autoComplete={autoComplete}
                    value={contact[key]}
                    onChange={(e) => setContact((c) => ({ ...c, [key]: e.target.value }))}
                    disabled={status === "sending"}
                    required
                  />
                </label>
              ))}
            </div>
            {!enquiry.success && <p className="chat__card-hint">{t.chat.contactMissing}</p>}
            <div className="chat__card-actions">
              <button className="btn btn--amber" onClick={confirm} disabled={status === "sending" || !enquiry.success}>
                {status === "sending" ? t.chat.sending : t.chat.confirm}
              </button>
              <button className="btn btn--ghost" onClick={() => { setProposal(null); inputRef.current?.focus(); }} disabled={status === "sending"}>
                {t.chat.edit}
              </button>
            </div>
          </div>
        )}
        {status === "sent" && <p className="chat__msg chat__msg--assistant chat__msg--done">{t.chat.sent}</p>}
        {fallback && (
          <p className="chat__msg chat__msg--assistant chat__fallback">
            {fallback.text} <a href={fallback.mailto}>{t.chat.emailUs(ENQUIRY_TO)}</a>
          </p>
        )}
      </div>

      {quickReplies.length > 0 && (
        <div className="chat__quick">
          {quickReplies.map((q) => (
            <button key={q} className="chip" onClick={() => send(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      {status !== "sent" && (
        <form
          className="chat__form"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          {/* Hidden from people; bots fill it in. */}
          <input className="chat__hp" tabIndex={-1} autoComplete="off" aria-hidden value={honeypot} onChange={(e) => setHoneypot(e.target.value)} name="website" />
          <textarea
            ref={inputRef}
            rows={2}
            value={input}
            placeholder={t.chat.placeholder}
            disabled={locked}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            aria-label={t.chat.placeholder}
          />
          <button className="btn btn--amber" type="submit" disabled={locked || !input.trim()}>
            {t.chat.send}
          </button>
        </form>
      )}
      {notice && <p className="chat__notice">{notice}</p>}
      <p className="chat__privacy">
        {t.chat.privacyLine}{" "}
        <button onClick={onPrivacy}>{t.chat.privacyMore}</button>
      </p>
    </div>
  );
}
