import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DocShell from "@/components/DocShell";
import { lastMonths, pickMonth, readStats } from "@/lib/tourStats";
import { fmt } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Obiski sprehodov", robots: { index: false, follow: false } };

const monthName = (m: string) =>
  new Intl.DateTimeFormat("sl-SI", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));
const shortMonth = (m: string) =>
  new Intl.DateTimeFormat("sl-SI", { month: "short", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));
const refName = (r: string) => (r === "direct" ? "neposredno" : r === "other" ? "drugo" : r);

/**
 * Private (password in middleware.ts): visits to the tours we host, from the anonymous ping
 * each tour sends when it opens (lib/tourVisits.ts). Per month, per tour, and where visitors came from.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  if (!process.env.STATS_PASSWORD) notFound();
  const now = new Date();
  const month = pickMonth((await searchParams).m, now);
  const s = await readStats(month);
  const [prevMonth] = lastMonths(month, 2).slice(1);
  const nextMonth = lastMonths(pickMonth(undefined, now), 24).find((m, i, all) => all[i + 1] === month);
  const max = Math.max(1, ...s.totals);
  const spanTotal = s.totals.reduce((a, b) => a + b, 0);

  return (
    <DocShell crumbs={[{ name: "Domov", path: "/" }, { name: "Obiski sprehodov" }]}>
      <h1>Obiski sprehodov</h1>
      <p className="doc__lead">
        Vsako odprtje sprehoda na *.webvisit360.com šteje kot en obisk (brez robotov, brez piškotkov in IP-naslovov).
        Štetje teče od 20. novembra 2026.
      </p>
      {!s.configured && <p className="visits__warn">Upstash Redis ni povezan, zato obiskov ni mogoče prebrati.</p>}

      <nav className="visits__months" aria-label="Mesec">
        <a href={`/obiski?m=${prevMonth}`}>‹ {monthName(prevMonth)}</a>
        <b>{monthName(month)}</b>
        {nextMonth ? <a href={`/obiski?m=${nextMonth}`}>{monthName(nextMonth)} ›</a> : <span />}
      </nav>

      <dl className="doc__facts">
        <div><dt>{monthName(month)}</dt><dd>{fmt(s.totals[0])}</dd></div>
        <div><dt>{monthName(prevMonth)}</dt><dd>{fmt(s.totals[1])}</dd></div>
        <div><dt>zadnjih {s.months.length} mesecev</dt><dd>{fmt(spanTotal)}</dd></div>
      </dl>

      <section>
        <h2>Po mesecih</h2>
        <ol className="visits__bars">
          {[...s.months].reverse().map((m, i) => {
            const v = s.totals[s.months.length - 1 - i];
            return (
              <li key={m} aria-current={m === month ? "true" : undefined}>
                <a href={`/obiski?m=${m}`} title={`${monthName(m)}: ${fmt(v)}`}>
                  <span className="visits__bar" style={{ height: `${(v / max) * 100}%` }} />
                  <span className="visits__bar-n">{v ? fmt(v) : ""}</span>
                  <span className="visits__bar-m">{shortMonth(m)}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h2>Po sprehodih</h2>
        <div className="visits__scroll">
          <table className="visits__table">
            <thead>
              <tr>
                <th scope="col">Sprehod</th>
                <th scope="col">{monthName(month)}</th>
                <th scope="col">{monthName(prevMonth)}</th>
                <th scope="col">{s.months.length} mesecev</th>
                <th scope="col">Od kod ({monthName(month)})</th>
              </tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={r.id}>
                  <th scope="row">
                    <a href={r.url} target="_blank" rel="noopener">{r.name}</a>
                    {r.page && (
                      <>
                        {" "}
                        <a className="visits__page" href={r.page}>stran</a>
                      </>
                    )}
                  </th>
                  <td>{fmt(r.month)}</td>
                  <td>{fmt(r.prev)}</td>
                  <td>{fmt(r.span)}</td>
                  <td className="visits__refs">
                    {r.refs.length
                      ? r.refs.slice(0, 4).map(([ref, n]) => `${refName(ref)} ${fmt(n)}`).join(" · ") + (r.refs.length > 4 ? " · …" : "")
                      : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DocShell>
  );
}
