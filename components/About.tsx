"use client";

import { useState } from "react";
import { about, REFERENCES } from "@/lib/about";
import { CONTACT, TRUSTED_BADGE } from "@/lib/contact";
import { copy } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";
import PrivacyNotice from "./PrivacyNotice";

const ENQUIRE = "/?povprasevanje";

export default function About() {
  const { lang, switchLang } = useLang();
  const a = about[lang];
  const t = copy[lang];
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const company: [keyof typeof a.company.labels, React.ReactNode][] = [
    ["company", CONTACT.company],
    ["brand", CONTACT.brand],
    ["address", CONTACT.address],
    ["registration", CONTACT.registration],
    ["vat", CONTACT.vat],
    ["director", CONTACT.director],
    ["email", <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>],
    ["phone", <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>],
    ["status", a.company.status],
  ];

  return (
    <div className="about-page">
      <header className="about__top">
        <a className="brand" href="/" aria-label={t.brandHome}>
          <img src="/logo.png" alt="" width={36} height={36} />
          <span>
            webvisit<b>360</b>
          </span>
        </a>
        <nav className="nav">
          <a className="nav__link" href="/">{a.back}</a>
          <button className="lang" onClick={switchLang} aria-label={t.langSwitch.aria}>
            {t.langSwitch.label}
          </button>
          <a className="btn btn--ghost" href={ENQUIRE}>{a.cta.button}</a>
        </nav>
      </header>

      <main className="about">
        <section className="about__hero">
          <p className="about__kicker">{a.hero.kicker}</p>
          <h1>{a.hero.title}</h1>
          <p className="about__lead">{a.hero.lead}</p>
          <div className="about__facts">
            <dl className="stats">
              {a.hero.facts.map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
            <img className="trusted trusted--large" src={TRUSTED_BADGE.src} alt={TRUSTED_BADGE.alt} width={220} height={55} />
          </div>
        </section>

        <section className="about__problem">
          <h2>{a.problem.title}</h2>
          {a.problem.text.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>

        <section>
          <h2>{a.why.title}</h2>
          <ul className="about__grid">
            {a.why.items.map((x) => (
              <li key={x.t} className="about__card">
                <h3>{x.t}</h3>
                <p>{x.d}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2>{a.services.title}</h2>
          <div className="about__services">
            {a.services.items.map((s) => (
              <article key={s.title} className="about__card about__card--big">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <p className="about__for">
                  <b>{a.services.forLabel}:</b> {s.for}
                </p>
              </article>
            ))}
          </div>
          <aside className="about__note">
            <h3>{a.services.obcina.title}</h3>
            <p>{a.services.obcina.text}</p>
          </aside>
        </section>

        <section>
          <h2>{a.included.title}</h2>
          <ul className="about__checks">
            {a.included.items.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className="about__extras">
            <b>{a.included.extrasTitle}:</b> {a.included.extras.join(" · ")}
          </p>
          <p className="about__price">{a.included.price}</p>
        </section>

        <section>
          <h2 id="process-title">{a.process.title}</h2>
          <p>{a.process.lead}</p>
          <ol className="about__steps" aria-label={a.process.title}>
            {a.process.steps.map((s) => (
              <li key={s.t}>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2>{a.references.title}</h2>
          <h3 className="about__sub">{a.references.obcine}</h3>
          <p className="about__hint">{a.references.hint}</p>
          <ul className="about__refs">
            {REFERENCES.map((r) => (
              <li key={r.id}>
                <a className="chip" href={`/?tour=${r.id}`}>{r.name}</a>
              </li>
            ))}
          </ul>
          <h3 className="about__sub">{a.references.industriesTitle}</h3>
          <p>{a.references.industries.join(" · ")}</p>
        </section>

        <section className="about__person">
          <h2>{a.person.title}</h2>
          <p>{a.person.text}</p>
        </section>

        <section>
          <h2>{a.faq.title}</h2>
          <div className="about__faq">
            {a.faq.items.map((x) => (
              <details key={x.q}>
                <summary>{x.q}</summary>
                <p>{x.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="about__cta">
          <h2>{a.cta.title}</h2>
          <p>{a.cta.text}</p>
          <a className="btn btn--amber" href={ENQUIRE}>{a.cta.button}</a>
        </section>

        <section>
          <h2>{a.company.title}</h2>
          <dl className="about__company">
            {company.map(([k, v]) => (
              <div key={k}>
                <dt>{a.company.labels[k]}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="about__footer">
        <span>{t.footer.company}</span>
        <a href="https://www.facebook.com/Webvisit360" target="_blank" rel="noopener">Facebook</a>
        <a href="https://www.instagram.com/webvisit360" target="_blank" rel="noopener">Instagram</a>
        <a href="https://kuula.co/profile/WEBVISIT360" target="_blank" rel="noopener">Kuula</a>
        <button onClick={() => setPrivacyOpen(true)}>{t.footer.privacy}</button>
      </footer>

      {privacyOpen && <PrivacyNotice copy={t} contact={CONTACT.email} onClose={() => setPrivacyOpen(false)} />}
    </div>
  );
}
