import { notFound } from "next/navigation";
import DocShell from "@/components/DocShell";
import JsonLd from "@/components/JsonLd";
import TourCard from "@/components/TourCard";
import { nearestTo } from "@/lib/catalog";
import { copy, slPlural } from "@/lib/i18n";
import { ENQUIRY_PATH, breadcrumbLd, catalog, pageMeta, prominence, townLd, townPath, typeLabel } from "@/lib/seo";
import { PLACE_TYPES, fmt } from "@/lib/types";

type Props = { params: Promise<{ kraj: string }> };

export const dynamicParams = false;
export const generateStaticParams = () => catalog.townPages.map((t) => ({ kraj: t.slug }));

const tours = (k: number) => `${k} ${slPlural(k, "sprehod", "sprehoda", "sprehodi", "sprehodov")}`;

export async function generateMetadata({ params }: Props) {
  const town = catalog.townBySlug.get((await params).kraj);
  if (!town) return {};
  const top = [...town.tours].sort((a, b) => prominence(b) - prominence(a)).slice(0, 3).map((t) => t.name);
  return pageMeta({
    title: `${town.name} – 360° virtualni sprehodi`,
    description: `${town.name}: ${tours(town.tours.length)} v 360°, med njimi ${top.join(", ")}. Sprehodite se, preden pridete – v brskalniku ali na Google Zemljevidih.`,
    path: townPath(town),
  });
}

export default async function Page({ params }: Props) {
  const town = catalog.townBySlug.get((await params).kraj);
  if (!town) notFound();
  const panoramas = town.tours.reduce((s, t) => s + (t.scenes ?? 0), 0);
  const groups = PLACE_TYPES.map((type) => ({
    type,
    tours: town.tours.filter((t) => t.type === type).sort((a, b) => prominence(b) - prominence(a)),
  })).filter((g) => g.tours.length);
  const nearby = nearestTo(town, catalog.townPages, 6, (t) => t.slug === town.slug);
  const crumbs = [
    { name: "Domov", path: "/" },
    { name: "Vsi sprehodi", path: "/sprehodi" },
    { name: town.name, path: townPath(town) },
  ];
  return (
    <DocShell crumbs={crumbs}>
      <JsonLd data={townLd(town)} />
      <JsonLd data={breadcrumbLd(crumbs)} />
      <p className="doc__kicker">Kraj</p>
      <h1>360° virtualni sprehodi – {town.name}</h1>
      <p className="doc__lead">
        Vsi 360° virtualni sprehodi in panorame, ki smo jih posneli v kraju {town.name}. Vsakega odprete kar v brskalniku,
        brez aplikacije, ali ga poiščete na <a href={`/?tour=${encodeURIComponent(town.tours[0].id)}`}>našem zemljevidu</a>.
      </p>
      <dl className="doc__facts">
        <div><dt>sprehodov</dt><dd>{town.tours.length}</dd></div>
        <div><dt>panoram</dt><dd>{fmt(panoramas)}</dd></div>
      </dl>

      {groups.map((g) => (
        <section key={g.type}>
          <h2>{typeLabel(g.type)}</h2>
          <ul className="doc__cards">
            {g.tours.map((t) => (
              <TourCard key={t.id} tour={t} showType={false} />
            ))}
          </ul>
        </section>
      ))}

      {nearby.length > 0 && (
        <section>
          <h2>V bližini</h2>
          <ul className="doc__chips">
            {nearby.map((t) => (
              <li key={t.slug}>
                <a href={townPath(t)}>{t.name}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="doc__cta">
        <h2>Želite sprehod tudi za svoj prostor v kraju {town.name}?</h2>
        <p>{copy.sl.hero.text}</p>
        <a className="btn btn--amber" href={ENQUIRY_PATH}>Želim svoj sprehod</a>
      </section>
    </DocShell>
  );
}
