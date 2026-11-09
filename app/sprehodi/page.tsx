import DocShell from "@/components/DocShell";
import JsonLd from "@/components/JsonLd";
import { MIN_TOWN_TOURS } from "@/lib/catalog";
import { slPlural } from "@/lib/i18n";
import { ENQUIRY_PATH, breadcrumbLd, catalog, pageMeta, placePath, totals, townPath } from "@/lib/seo";
import { compact, fmt } from "@/lib/types";

const n = totals();
const tours = (k: number) => `${k} ${slPlural(k, "sprehod", "sprehoda", "sprehodi", "sprehodov")}`;

export const metadata = pageMeta({
  title: "Vsi 360° virtualni sprehodi po Sloveniji",
  description: `Seznam vseh 360° virtualnih sprehodov Webvisit360: ${n.obcine} občin in več kot ${Math.floor(n.places / 10) * 10} podjetij in krajev v ${n.towns} krajih po Sloveniji, ${fmt(n.panoramas)} panoram in ${compact(n.views)} ogledov.`,
  path: "/sprehodi",
});

const crumbs = [
  { name: "Domov", path: "/" },
  { name: "Vsi sprehodi", path: "/sprehodi" },
];

export default function Page() {
  const municipalities = catalog.places.filter((p) => p.tour.kind === "obcina").sort((a, b) => a.tour.name.localeCompare(b.tour.name, "sl"));
  const smallTowns = catalog.towns.filter((t) => t.tours.length < MIN_TOWN_TOURS);
  return (
    <DocShell crumbs={crumbs}>
      <JsonLd data={breadcrumbLd(crumbs)} />
      <h1>Vsi 360° virtualni sprehodi po Sloveniji</h1>
      <p className="doc__lead">
        Od leta 2017 snemamo 360° virtualne sprehode za občine, hotele, vinarje, restavracije in trgovine. Vsak se odpre kar v
        brskalniku, na telefonu ali računalniku, brez aplikacije. Na <a href="/">zemljevidu</a> jih najdete po legi, tukaj pa po krajih.
      </p>
      <dl className="doc__facts">
        <div><dt>občin</dt><dd>{n.obcine}</dd></div>
        <div><dt>podjetij in krajev</dt><dd>{fmt(Math.floor(n.places / 10) * 10)}+</dd></div>
        <div><dt>krajev</dt><dd>{n.towns}</dd></div>
        <div><dt>panoram</dt><dd>{fmt(n.panoramas)}</dd></div>
        <div><dt>ogledov</dt><dd>{compact(n.views)}</dd></div>
      </dl>

      <section>
        <h2>Občine</h2>
        <ul className="doc__chips">
          {municipalities.map((p) => (
            <li key={p.slug}>
              <a href={placePath(p)}>{p.tour.name}</a>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Kraji</h2>
        <ul className="doc__towns">
          {catalog.townPages.map((t) => (
            <li key={t.slug}>
              <a href={townPath(t)}>{t.name}</a> <span>{tours(t.tours.length)}</span>
            </li>
          ))}
        </ul>
      </section>

      {smallTowns.length > 0 && (
        <section>
          <h2>Še več krajev</h2>
          <ul className="doc__towns">
            {smallTowns.map((t) => {
              const tour = t.tours[0];
              const page = catalog.placeById.get(tour.id);
              return (
                <li key={t.slug}>
                  {t.name}:{" "}
                  <a href={page ? placePath(page) : tour.mapsUrl ?? tour.url} {...(!page && { target: "_blank", rel: "noopener" })}>
                    {tour.name}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="doc__cta">
        <h2>Želite svoj sprehod?</h2>
        <p>Povejte nam, kaj bi radi pokazali, in pripravimo vam osebno ponudbo.</p>
        <a className="btn btn--amber" href={ENQUIRY_PATH}>Želim svoj sprehod</a>
      </section>
    </DocShell>
  );
}
