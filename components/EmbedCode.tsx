"use client";

import { useRef, useState } from "react";

/** The ready-to-paste embed HTML with a copy button (falls back to selecting the text). */
export default function EmbedCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const done = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      return done();
    } catch {}
    // No clipboard permission (older browsers, some in-app browsers): select the code, try the
    // old copy command, and otherwise leave it selected for Ctrl/Cmd+C.
    const el = area.current;
    if (!el) return;
    el.focus();
    el.select();
    try {
      if (document.execCommand("copy")) done();
    } catch {}
  };
  return (
    <div className="embed">
      <textarea
        ref={area}
        className="embed__code"
        readOnly
        rows={5}
        value={code}
        aria-label="Koda za vdelavo sprehoda"
        onFocus={(e) => e.currentTarget.select()}
      />
      <button type="button" className="btn btn--ghost" onClick={copy}>
        {copied ? "Kopirano ✓" : "Kopiraj kodo"}
      </button>
    </div>
  );
}
