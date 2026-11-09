import { notFound } from "next/navigation";
import DocShell from "@/components/DocShell";
import JsonLd from "@/components/JsonLd";
import { nearestTo, slugify } from "@/lib/catalog";
import { copy } from "@/lib/i18n";
import { ENQUIRY_PATH, breadcrumbLd, catalog, mapPath, pageMeta, placeLd, placePath, townPath, typeLabel } from "@/lib/seo";
import { CONTACT } from "@/lib/contact";
import { fmt } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => catalog.places.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: Props) {
  const p = catalog.placeBySlug.get((await params).slug);
  if (!p) return {};
  const t = p.tour;
  const where = p.town && !t.name.includes(p.town) ? `, ${p.town}` : "";
  return pageMeta({
    title: `${t.name}${where} – 360° virtualni sprehod`,
    description: `360° virtualni sprehod: ${t.name}${where}.${t.scenes ? ` ${copy.sl.panoramas(t.scenes)},` : ""} ogled v brskalniku brez aplikacije. Posnel in izdelal Webvisit360, Google Street View Trusted partner.`,
    path: placePath(p),
    image: t.cover,
  });
}

export default async function Page({ params }: Props) {
  const p = catalog.placeBySlug.get((await params).slug);
  if (!p) notFound();
  const t = p.tour;
  const town = catalog.towns.find((x) => x.name === p.town);
  const townPage = town && catalog.townBySlug.get(town.slug);
  const nearby =
    t.lat != null && t.lng != null
      ? nearestTo({ lat: t.lat, lng: t.lng }, catalog.places.map((x) => ({ ...x, lat: x.tour.lat, lng: x.tour.lng })), 6, (x) => x.slug === p.slug)
      : [];
  const crumbs = [
    { name: "Domov", path: "/" },
    { name: "Vsi sprehodi", path: "/sprehodi" },
    ...(townPage ? [{ name: townPage.name, path: townPath(townPage) }] : []),
    { name: t.name, path: placePath(p) },
  ];
  return (
    <DocShell crumbs={crumbs}>
      <JsonLd data={placeLd(p)} />
      <JsonLd data={breadcrumbLd(crumbs)} />
      <p className="doc__kicker">
        {typeLabel(t.type)}
        {p.town && ` · ${p.town}`}
      </p>
      <h1>{t.name}</h1>
      {t.cover && <img className="doc__hero" src={t.cover} alt={`${t.name} v 360°`} width={1200} height={600} referrerPolicy="no-referrer" />}
      <p className="doc__lead">
        {t.kind === "obcina" ? `${t.name} v 360° virtualnem sprehodu: ` : `${t.name} si lahko ogledate v 360° virtualnem sprehodu: `}
        premikate se od panorame do panorame, kot bi bili tam, kar v brskalniku, na telefonu ali računalniku. Sprehod je posnel in
        izdelal {CONTACT.brand}, Google Street View Trusted partner.
        {t.gmaps && ` Objavljen je tudi na Google Zemljevidih, s še ${copy.sl.panoramas(t.gmaps.scenes)}.`}
      </p>
      <div className="doc__actions">
        <a className="btn btn--amber" href={t.url} target="_blank" rel="noopener">
          Vstopite v sprehod
        </a>
        <a className="btn btn--ghost" href={mapPath(t)}>
          Pokaži na zemljevidu
        </a>
        {t.gmaps && (
          <a className="btn btn--ghost" href={t.gmaps.url} target="_blank" rel="noopener">
            Na Google Zemljevidih
          </a>
        )}
      </div>
      <dl className="doc__facts">
        <div><dt>vrsta</dt><dd>{typeLabel(t.type)}</dd></div>
        {p.town && (
          <div>
            <dt>kraj</dt>
            <dd>{townPage ? <a href={townPath(townPage)}>{p.town}</a> : p.town}</dd>
          </div>
        )}
        {t.scenes != null && <div><dt>panoram</dt><dd>{fmt(t.scenes)}</dd></div>}
        {t.views != null && <div><dt>ogledov</dt><dd>{fmt(t.views)}</dd></div>}
      </dl>
      {t.highlights.length > 0 && (
        <section>
          <h2>V sprehodu</h2>
          <ul className="doc__tags">
            {/* Same name with and without accents ("Bozje"/"Božje") counts once, like on the map. */}
            {[...new Map(t.highlights.map((h) => [slugify(h), h])).values()].slice(0, 12).map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </section>
      )}

      {nearby.length > 0 && (
        <section>
          <h2>V bližini</h2>
          <ul className="doc__chips">
            {nearby.map((x) => (
              <li key={x.slug}>
                <a href={placePath(x)}>{x.tour.name}</a>
              </li>
            ))}
            {townPage && (
              <li>
                <a href={townPath(townPage)}>Vsi sprehodi: {townPage.name}</a>
              </li>
            )}
          </ul>
        </section>
      )}

      <section className="doc__cta">
        <h2>Želite takšen sprehod?</h2>
        <p>Povejte nam, kaj bi radi pokazali, in pripravimo vam osebno ponudbo.</p>
        <a className="btn btn--amber" href={ENQUIRY_PATH}>Želim svoj sprehod</a>
      </section>
    </DocShell>
  );
}
