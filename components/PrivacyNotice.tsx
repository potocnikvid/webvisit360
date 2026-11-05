"use client";

import type { Copy } from "@/lib/i18n";

/** Short privacy notice for the enquiry chat (GDPR): who, what, why, which processors. */
export default function PrivacyNotice({ copy: t, contact, onClose }: { copy: Copy; contact: string; onClose: () => void }) {
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="privacy-title" onClick={onClose}>
      <div className="modal__box" onClick={(e) => e.stopPropagation()}>
        <h2 id="privacy-title">{t.privacy.title}</h2>
        {t.privacy.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <p>
          <a href={`mailto:${contact}`}>{contact}</a>
        </p>
        <button className="btn btn--ghost" onClick={onClose} autoFocus>
          {t.privacy.close}
        </button>
      </div>
    </div>
  );
}
