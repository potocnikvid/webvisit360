"use client";

import { Fragment, useEffect, useRef, type MouseEvent } from "react";
import { REFERENCES, type AboutCopy } from "@/lib/about";
import { CONTACT, TRUSTED_BADGE } from "@/lib/contact";

type Props = {
  copy: AboutCopy;
  /** "leaving" plays the exit animation before the sheet unmounts. */
  leaving?: boolean;
  onBack: () => void;
  onEnquire: () => void;
  /** A reference municipality was picked: show it on the globe. */
  onReference: (id: string) => void;
  onPrivacy: () => void;
  privacyLabel: string;
  /** The story scrolled (px from the top): the globe slides the ground along. */
  onScroll?: (px: number) => void;
};

/** Plain links still work without JavaScript; with it, they act in place. */
const inPlace = (fn: () => void) => (e: MouseEvent) => {
  e.preventDefault();
  fn();
};

/** Words of the title, each inked in a little after the one before. */
const Ink = ({ text, delay = 0.25, step = 0.09 }: { text: string; delay?: number; step?: number }) => (
  <>
    {text.split(" ").map((w, i) => (
      <Fragment key={i}>
        {i > 0 && " "}
        <span className="ink" style={{ animationDelay: `${delay + i * step}s` }}>
          {w}
        </span>
      </Fragment>
    ))}
  </>
);

/**
 * The About story, full screen over the globe zoomed into the studio's streets. The text is
 * "written on the map": it inks in as it comes into view, and the ground scrolls with it.
 */
export default function Story({ copy: a, leaving = false, onBack, onEnquire, onReference, onPrivacy, privacyLabel, onScroll }: Props) {
  const root = useRef<HTMLElement>(null);

  // Each section inks in the first time it scrolls into view.
  useEffect(() => {
    const sections = root.current?.querySelectorAll<HTMLElement>("[data-ink]") ?? [];
    if (typeof IntersectionObserver === "undefined") {
      sections.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const seen = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-in");
          seen.unobserve(e.target);
        }),
      { root: root.current, threshold: 0.12 },
    );
    sections.forEach((el) => seen.observe(el));
    return () => seen.disconnect();
  }, []);

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
    <article
      ref={root}
      className={`story ${leaving ? "is-leaving" : ""}`}
      aria-labelledby="story-title"
      onScroll={(e) => onScroll?.(e.currentTarget.scrollTop)}
    >
      <a className="btn btn--dark story__back" href="/" onClick={inPlace(onBack)}>
        ← {a.back}
      </a>

      <div className="about">
        <section className="about__hero">
          <p className="about__kicker">{a.hero.kicker}</p>
          <h1 id="story-title">
            <Ink text={a.hero.title} />
          </h1>
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

        <section className="about__problem" data-ink>
          <h2>{a.problem.title}</h2>
          {a.problem.text.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>

        <section data-ink>
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

        <section data-ink>
          <h2>{a.services.title}</h2>
          <div className="about__services">
            {a.services.items.map((s) => (
              <div key={s.title} className="about__card about__card--big">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <p className="about__for">
                  <b>{a.services.forLabel}:</b> {s.for}
                </p>
              </div>
            ))}
          </div>
          <aside className="about__note">
            <h3>{a.services.obcina.title}</h3>
            <p>{a.services.obcina.text}</p>
          </aside>
        </section>

        <section data-ink>
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

        <section data-ink>
          <h2>{a.process.title}</h2>
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

        <section data-ink>
          <h2>{a.references.title}</h2>
          <h3 className="about__sub">{a.references.obcine}</h3>
          <p className="about__hint">{a.references.hint}</p>
          <ul className="about__refs">
            {REFERENCES.map((r) => (
              <li key={r.id}>
                <a className="chip" href={`/?tour=${r.id}`} onClick={inPlace(() => onReference(r.id))}>
                  {r.name}
                </a>
              </li>
            ))}
          </ul>
          <h3 className="about__sub">{a.references.industriesTitle}</h3>
          <p>{a.references.industries.join(" · ")}</p>
        </section>

        <section className="about__person" data-ink>
          <h2>{a.person.title}</h2>
          <p>{a.person.text}</p>
        </section>

        <section data-ink>
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

        <section className="about__cta" data-ink>
          <h2>{a.cta.title}</h2>
          <p>{a.cta.text}</p>
          <a className="btn btn--amber" href="/?povprasevanje" onClick={inPlace(onEnquire)}>
            {a.cta.button}
          </a>
        </section>

        <section data-ink>
          <h2>{a.company.title}</h2>
          <dl className="about__company">
            {company.map(([k, v]) => (
              <div key={k}>
                <dt>{a.company.labels[k]}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="about__legal">
            <button onClick={onPrivacy}>{privacyLabel}</button>
          </p>
        </section>
      </div>
    </article>
  );
}
