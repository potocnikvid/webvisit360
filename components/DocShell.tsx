import { CONTACT, SOCIAL } from "@/lib/contact";

type Crumb = { name: string; path?: string };

/**
 * The frame of the plain, crawlable pages (all tours, towns, places): the same header and
 * colours as the map, breadcrumbs, and a footer with the studio's details.
 */
export default function DocShell({ crumbs, children }: { crumbs: Crumb[]; children: React.ReactNode }) {
  return (
    <div className="doc">
      <header className="doc__top">
        <a className="brand" href="/" aria-label="Webvisit360 domov">
          <img src="/logo.png" alt="" width={36} height={36} />
          <span>
            webvisit<b>360</b>
          </span>
        </a>
        <nav className="doc__nav">
          <a href="/">Zemljevid</a>
          <a href="/sprehodi">Vsi sprehodi</a>
          <a href="/o-nas">O nas</a>
        </nav>
      </header>
      <nav className="doc__crumbs" aria-label="Drobtinice">
        <ol>
          {crumbs.map((c, i) => (
            <li key={c.name}>{c.path && i < crumbs.length - 1 ? <a href={c.path}>{c.name}</a> : <span aria-current="page">{c.name}</span>}</li>
          ))}
        </ol>
      </nav>
      <main className="doc__main">{children}</main>
      <footer className="doc__foot">
        <p>
          <b>{CONTACT.brand}</b> · {CONTACT.company} · {CONTACT.address}
        </p>
        <p>
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> · <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
          {SOCIAL.map((s) => (
            <span key={s.name}>
              {" · "}
              <a href={s.url} target="_blank" rel="noopener">
                {s.name}
              </a>
            </span>
          ))}
        </p>
      </footer>
    </div>
  );
}
