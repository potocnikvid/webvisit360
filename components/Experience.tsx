"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Filter, Tour, ToursFile } from "@/lib/types";
import { compact, fmt, panoramas } from "@/lib/types";
import type { Focus } from "./Globe";
import PanoPreview from "./PanoPreview";

const Globe = dynamic(() => import("./Globe"), { ssr: false });

const SLOVENIA = { lat: 46.12, lng: 14.82, altitude: 0.085 };

// Strip diacritics so "lasko" finds "Laško".
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const rankKind = (t: Tour) => (t.kind === "obcina" ? 0 : t.kind === "business" ? 1 : 2);

const uniqueBy = <T,>(xs: T[], key: (x: T) => string) => {
  const seen = new Set<string>();
  return xs.filter((x) => {
    const k = key(x as T);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

export default function Experience() {
  const [data, setData] = useState<ToursFile | null>(null);
  const [geo, setGeo] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [enquiry, setEnquiry] = useState(false);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [ready, setReady] = useState(false);
  const focusKey = useRef(0);

  useEffect(() => {
    fetch("/data/tours.json").then((r) => r.json()).then(setData);
    fetch("/data/geo.json").then((r) => r.json()).then((g) => setGeo(g.features));
  }, []);

  const all = data?.items ?? [];
  const byId = useMemo(() => new Map(all.map((t) => [t.id, t])), [all]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  const visible = useMemo(
    () => all.filter((t) => filter === "all" || t.kind === filter),
    [all, filter],
  );

  const results = useMemo(() => {
    const q = norm(query.trim());
    const list = visible.filter(
      (t) => !q || norm(t.name).includes(q) || (t.place && norm(t.place).includes(q)),
    );
    // Municipalities first, then most-viewed.
    return list.sort(
      (a, b) =>
        rankKind(a) - rankKind(b) ||
        (b.views ?? b.scenes ?? 0) - (a.views ?? a.scenes ?? 0),
    );
  }, [visible, query]);

  const fly = useCallback((lat: number, lng: number, altitude: number, ms?: number, panel?: boolean) => {
    focusKey.current += 1;
    setFocus({ lat, lng, altitude, ms, panel, key: focusKey.current });
  }, []);

  const select = useCallback(
    (id: string) => {
      const t = byId.get(id);
      if (!t) return;
      setSelectedId(id);
      setEnquiry(false);
      setSearchOpen(false);
      if (t.lat != null && t.lng != null) fly(t.lat, t.lng, t.kind === "obcina" ? 0.03 : 0.01, undefined, true);
    },
    [byId, fly],
  );

  const close = useCallback(() => {
    setSelectedId(null);
    setEnquiry(false);
    fly(SLOVENIA.lat, SLOVENIA.lng, SLOVENIA.altitude, 1400);
  }, [fly]);

  // Esc closes the tour overlay first, then the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (tourOpen) setTourOpen(false);
      else if (searchOpen) setSearchOpen(false);
      else if (selectedId) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tourOpen, searchOpen, selectedId, close]);

  const stats = data?.stats;
  const totalViews = stats ? stats.kuulaViews + (stats.googleViews ?? 0) : 0;
  const totalScenes = stats ? stats.scenes + (stats.googlePhotos ?? 0) : 0;
  const totalPlaces = stats ? stats.business + (stats.google ?? 0) : 0;

  return (
    <main className={`app ${selected ? "has-panel" : ""} ${ready ? "is-ready" : ""}`}>
      <div className="sky" aria-hidden />
      {geo && data && (
        <Globe
          tours={visible}
          geo={geo}
          selectedId={selectedId}
          focus={focus}
          paused={tourOpen}
          onSelect={select}
          onReady={() => setReady(true)}
        />
      )}

      <header className="topbar">
        <a className="brand" href="/" aria-label="Webvisit360 domov">
          <img src="/logo.png" alt="" width={36} height={36} />
          <span>
            webvisit<b>360</b>
          </span>
        </a>
        <nav className="nav">
          <a href="#kako">Kako deluje</a>
          <a href="#cenik">Cenik</a>
          <button className="btn btn--ghost" onClick={() => { setSelectedId(null); setEnquiry(true); }}>
            Želim svoj sprehod
          </button>
        </nav>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">Sprehodite se, preden pridete.</h1>
        <p>
          360° virtualni sprehodi za občine, hotele, vinarje in trgovine. Vsaka lučka na zemljevidu
          je resničen sprehod, ki ga lahko odprete takoj.
        </p>
        {stats && (
          <dl className="stats">
            <div>
              <dt>občin</dt>
              <dd>{stats.obcine}</dd>
            </div>
            <div>
              <dt>podjetij in krajev</dt>
              <dd>{fmt(Math.floor(totalPlaces / 10) * 10)}+</dd>
            </div>
            <div>
              <dt>panoram</dt>
              <dd>{fmt(totalScenes)}</dd>
            </div>
            <div>
              <dt>ogledov</dt>
              <dd>{compact(totalViews)}</dd>
            </div>
          </dl>
        )}
      </section>

      <div className="finder">
        <div className="chips" role="radiogroup" aria-label="Prikaži">
          {(
            [
              ["all", "Vse"],
              ["obcina", "Občine"],
              ["business", "Podjetja"],
              ["google", "Google Zemljevidi"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              role="radio"
              aria-checked={filter === k}
              className={`chip ${filter === k ? "is-on" : ""}`}
              onClick={() => setFilter(k)}
            >
              {k !== "all" && <i className={`swatch swatch--${k}`} />}
              {label}
            </button>
          ))}
        </div>

        <div className={`search ${searchOpen ? "is-open" : ""}`}>
          <input
            type="search"
            placeholder="Poiščite občino, hotel, kraj…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            aria-label="Iskanje sprehodov"
          />
          {searchOpen && (
            <ul className="results" role="listbox">
              {results.slice(0, 60).map((t) => (
                <li key={t.id}>
                  <button role="option" aria-selected={t.id === selectedId} onClick={() => select(t.id)}>
                    <i className={`swatch swatch--${t.kind}`} />
                    <span className="results__name">{t.name}</span>
                    <span className="results__place">{t.lat == null ? "brez lokacije" : t.place}</span>
                  </button>
                </li>
              ))}
              {results.length === 0 && <li className="results__empty">Ni zadetkov.</li>}
              {results.length > 60 && (
                <li className="results__empty">in še {results.length - 60}… zožite iskanje</li>
              )}
            </ul>
          )}
        </div>
      </div>

      {searchOpen && <div className="scrim" onClick={() => setSearchOpen(false)} />}

      {selected && (
        <aside className="panel" aria-label={selected.name}>
          <button className="panel__close" onClick={close} aria-label="Zapri">
            ×
          </button>
          <div className="panel__media">
            {selected.pano && selected.cover ? (
              <PanoPreview key={selected.cover} src={selected.cover} alt={selected.name} />
            ) : selected.cover ? (
              <img className="panel__cover" src={selected.cover} alt="" />
            ) : null}
          </div>
          <div className="panel__body">
            <p className="panel__kicker">
              {selected.kind === "obcina" ? "Občina" : selected.kind === "google" ? "Google Zemljevidi" : "Podjetje"}
              {selected.place && selected.kind !== "obcina" ? ` · ${selected.place}` : ""}
              {selected.category ? ` · ${selected.category}` : ""}
              {selected.approx && <span title="Lokacija je približna (kraj)"> · približna lokacija</span>}
            </p>
            <h2>{selected.name}</h2>
            <ul className="panel__meta">
              {selected.scenes != null && <li>{panoramas(selected.scenes)}</li>}
              {selected.views != null && <li>{fmt(selected.views)} ogledov</li>}
              {selected.gmaps && (
                <li>
                  <a className="panel__link" href={selected.gmaps.url} target="_blank" rel="noopener">
                    + {panoramas(selected.gmaps.scenes)} na Google Zemljevidih ↗
                  </a>
                </li>
              )}
            </ul>
            {selected.address && <p className="panel__address">{selected.address}</p>}
            {selected.highlights.length > 0 && (
              <ul className="panel__tags">
                {uniqueBy(selected.highlights, norm).slice(0, 9).map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
            <div className="panel__actions">
              <button className="btn btn--amber" onClick={() => setTourOpen(true)}>
                Vstopite v sprehod
              </button>
              <button className="btn btn--ghost" onClick={() => setEnquiry(true)}>
                Želim takšen sprehod
              </button>
              {selected.mapsUrl && (
                <a className="panel__link panel__link--center" href={selected.mapsUrl} target="_blank" rel="noopener">
                  Odpri v Google Zemljevidih ↗
                </a>
              )}
            </div>
          </div>
        </aside>
      )}

      {enquiry && (
        <div className="enquiry" role="dialog" aria-label="Povpraševanje">
          <button className="panel__close" onClick={() => setEnquiry(false)} aria-label="Zapri">
            ×
          </button>
          <h2>Pokažite se v 360°.</h2>
          <p>
            Posnamemo vaš kraj, hotel ali trgovino z dronom in 360° kamero ter pripravimo sprehod,
            ki ga vgradite na svojo stran in Google Zemljevide.
          </p>
          <p className="enquiry__note">
            Prototip: obrazec za povpraševanje bo dodan v naslednji fazi.
          </p>
        </div>
      )}

      {tourOpen && selected && (
        <div className="tour" role="dialog" aria-label={`Sprehod: ${selected.name}`}>
          <iframe src={selected.url} title={selected.name} allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowFullScreen />
          <div className="tour__bar">
            <button className="btn btn--dark" onClick={() => setTourOpen(false)}>
              ← Nazaj na zemljevid
            </button>
            <span>{selected.name}</span>
          </div>
        </div>
      )}

      {!ready && <div className="loader">Nalagam zemljevid…</div>}
    </main>
  );
}
