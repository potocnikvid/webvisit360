"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlaceType, Tour, ToursFile } from "@/lib/types";
import { MAIN_TYPES, PLACE_TYPES, compact, fmt } from "@/lib/types";
import { copy, pickLang, type Lang } from "@/lib/i18n";
import { isNearby, type Visitor } from "@/lib/visitor";
import { countWithin, frameView, nearest } from "@/lib/nearby";
import type { Focus } from "./Globe";
import PanoPreview from "./PanoPreview";
import GoogleTour from "./GoogleTour";
import NearYou from "./NearYou";
import Chat, { ENQUIRY_TO } from "./Chat";
import PrivacyNotice from "./PrivacyNotice";

const Globe = dynamic(() => import("./Globe"), { ssr: false });

const SLOVENIA = { lat: 46.12, lng: 14.82, altitude: 0.085 };

// Strip diacritics so "lasko" finds "Laško".
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** How many nearest places to ring and frame when a type is chosen. */
const NEAR_COUNT = 5;

/** A view showing the visitor and the places near them. */
const frame = (from: { lat: number; lng: number }, places: { tour: Tour }[]) =>
  frameView([from, ...places.map((p) => ({ lat: p.tour.lat!, lng: p.tour.lng! }))]);

const LANG_KEY = "wv360-lang";

const uniqueBy = <T,>(xs: T[], key: (x: T) => string) => {
  const seen = new Set<string>();
  return xs.filter((x) => {
    const k = key(x as T);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

export default function Experience({ visitor: ipVisitor }: { visitor: Visitor | null }) {
  const [data, setData] = useState<ToursFile | null>(null);
  const [geo, setGeo] = useState<any[] | null>(null);
  const [type, setType] = useState<PlaceType | "all">("obcina");
  const [moreTypes, setMoreTypes] = useState(false);
  const [visitor, setVisitor] = useState(ipVisitor);
  const [locationError, setLocationError] = useState(false);
  const [lang, setLang] = useState<Lang>("sl");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [enquiry, setEnquiry] = useState(false);
  // Tour the chat was opened from (for its greeting), and every tour opened so far.
  const [chatFrom, setChatFrom] = useState<string | null>(null);
  const [viewed, setViewed] = useState<string[]>([]);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  // Once opened, the chat stays mounted (hidden when closed) so the conversation survives
  // looking at tours.
  const [chatStarted, setChatStarted] = useState(false);
  useEffect(() => {
    if (enquiry) setChatStarted(true);
  }, [enquiry]);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [ready, setReady] = useState(false);
  const focusKey = useRef(0);

  const t = copy[lang];
  const [navigatorLang, setNavigatorLang] = useState("");

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LANG_KEY);
    } catch {}
    setLang(saved === "sl" || saved === "en" ? saved : pickLang(navigator.languages ?? [navigator.language]));
    setNavigatorLang(navigator.language);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const switchLang = () => {
    const next = lang === "sl" ? "en" : "sl";
    setLang(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {}
  };

  useEffect(() => {
    fetch("/data/tours.json").then((r) => r.json()).then(setData);
    fetch("/data/geo.json").then((r) => r.json()).then((g) => setGeo(g.features));
  }, []);

  const all = data?.items ?? [];
  const byId = useMemo(() => new Map(all.map((t) => [t.id, t])), [all]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  const results = useMemo(() => {
    const q = norm(query.trim());
    const list = all.filter(
      (x) => !q || norm(x.name).includes(q) || (x.place && norm(x.place).includes(q)),
    );
    // The chosen type first, then most-viewed.
    return list.sort(
      (a, b) =>
        Number(b.type === type) - Number(a.type === type) ||
        (b.views ?? b.scenes ?? 0) - (a.views ?? a.scenes ?? 0),
    );
  }, [all, query, type]);

  // "Near you" only for visitors in or around Slovenia.
  const origin = visitor && isNearby(visitor) ? visitor : null;
  const near = useMemo(
    () => (origin ? nearest(all, origin, { type: type === "all" ? undefined : type, limit: NEAR_COUNT }) : []),
    [all, origin, type],
  );
  const nearOthers = useMemo(
    () => (origin && near.length ? countWithin(all, origin, 25, type === "all" ? undefined : type) - 1 : 0),
    [all, origin, near, type],
  );
  const highlightIds = useMemo(() => near.map((n) => n.tour.id), [near]);
  // Computed once, when the globe mounts: where the opening fly-in ends.
  const initialView = useMemo(() => (near.length ? frame(origin!, near) : undefined), [data !== null]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setViewed((v) => (v.includes(t.name) ? v : [...v, t.name]));
      setSearchOpen(false);
      if (t.lat != null && t.lng != null) fly(t.lat, t.lng, t.kind === "obcina" ? 0.03 : 0.01, undefined, true);
    },
    [byId, fly],
  );

  const home = useMemo(() => (near.length ? frame(origin!, near) : SLOVENIA), [near]);

  const close = useCallback(() => {
    setSelectedId(null);
    setEnquiry(false);
    fly(home.lat, home.lng, home.altitude, 1400);
  }, [fly, home]);

  const chooseType = (next: PlaceType | "all") => {
    setType(next);
    setSelectedId(null);
    if (!origin) return;
    const places = nearest(all, origin, { type: next === "all" ? undefined : next, limit: NEAR_COUNT });
    if (places.length) {
      const v = frame(origin, places);
      fly(v.lat, v.lng, v.altitude, 1600);
    }
  };

  // Ask the browser for the exact position. On arrival this is quiet: if the visitor says no
  // (or never answers) we simply keep the approximate, IP-based location.
  const requestPrecise = useCallback((quiet: boolean) => {
    navigator.geolocation?.getCurrentPosition(
      (pos) =>
        // No country: a precise position counts as "near" by distance (see isNearby).
        setVisitor({ lat: pos.coords.latitude, lng: pos.coords.longitude, city: null, country: null, precise: true }),
      () => {
        if (quiet) return;
        setLocationError(true);
        window.setTimeout(() => setLocationError(false), 4000);
      },
      { maximumAge: 10 * 60_000, timeout: 20_000 },
    );
  }, []);
  const usePreciseLocation = () => requestPrecise(false);

  useEffect(() => requestPrecise(true), [requestPrecise]);

  // Re-centre when the exact position arrives, unless the visitor is already busy looking at
  // a tour, searching or chatting.
  const busy = useRef(false);
  busy.current = !!selectedId || enquiry || searchOpen;
  useEffect(() => {
    if (!visitor?.precise || !data || busy.current) return;
    const places = nearest(data.items, visitor, { type: type === "all" ? undefined : type, limit: NEAR_COUNT });
    if (places.length) {
      const v = frame(visitor, places);
      fly(v.lat, v.lng, v.altitude, 1600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitor, data]);

  // Esc closes the tour overlay first, then the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (privacyOpen) setPrivacyOpen(false);
      else if (tourOpen) setTourOpen(false);
      else if (searchOpen) setSearchOpen(false);
      else if (selectedId) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [privacyOpen, tourOpen, searchOpen, selectedId, close]);

  const stats = data?.stats;
  const totalViews = stats ? stats.kuulaViews + (stats.googleViews ?? 0) : 0;
  const totalScenes = stats ? stats.scenes + (stats.googlePhotos ?? 0) : 0;
  const totalPlaces = stats ? stats.business + (stats.google ?? 0) : 0;

  return (
    <main className={`app ${selected ? "has-panel" : ""} ${enquiry ? "has-chat" : ""} ${ready ? "is-ready" : ""}`}>
      <div className="sky" aria-hidden />
      {geo && data && (
        <Globe
          tours={all}
          initialView={initialView}
          you={origin ? { lat: origin.lat, lng: origin.lng, precise: !!origin.precise, label: origin.precise ? t.you.here : t.you.around } : null}
          highlightIds={highlightIds}
          geo={geo}
          selectedId={selectedId}
          focus={focus}
          paused={tourOpen}
          onSelect={select}
          onReady={() => setReady(true)}
        />
      )}

      <header className="topbar">
        <a className="brand" href="/" aria-label={t.brandHome}>
          <img src="/logo.png" alt="" width={36} height={36} />
          <span>
            webvisit<b>360</b>
          </span>
        </a>
        <nav className="nav">
          <button className="lang" onClick={switchLang} aria-label={t.langSwitch.aria}>
            {t.langSwitch.label}
          </button>
          <button className="btn btn--ghost" onClick={() => { setSelectedId(null); setChatFrom(null); setEnquiry(true); }}>
            {t.wantOwn}
          </button>
        </nav>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">{t.hero.title}</h1>
        <p>{t.hero.text}</p>
        {stats && (
          <dl className="stats">
            <div>
              <dt>{t.stats.obcine}</dt>
              <dd>{stats.obcine}</dd>
            </div>
            <div>
              <dt>{t.stats.places}</dt>
              <dd>{fmt(Math.floor(totalPlaces / 10) * 10)}+</dd>
            </div>
            <div>
              <dt>{t.stats.panoramas}</dt>
              <dd>{fmt(totalScenes)}</dd>
            </div>
            <div>
              <dt>{t.stats.views}</dt>
              <dd>{compact(totalViews)}</dd>
            </div>
          </dl>
        )}
      </section>

      <div className="finder">
        <div className="chips" role="radiogroup" aria-label={t.filter.label}>
          {[...MAIN_TYPES, ...(moreTypes ? PLACE_TYPES.filter((x) => !MAIN_TYPES.includes(x)) : []), "all" as const].map((k) => (
            <button
              key={k}
              role="radio"
              aria-checked={type === k}
              className={`chip ${type === k ? "is-on" : ""}`}
              onClick={() => chooseType(k)}
            >
              {k === "all" ? t.filter.all : t.types[k]}
            </button>
          ))}
          <button className="chip chip--more" aria-expanded={moreTypes} onClick={() => setMoreTypes((v) => !v)}>
            {moreTypes ? t.filter.less : t.filter.more}
          </button>
        </div>

        <div className={`search ${searchOpen ? "is-open" : ""}`}>
          <input
            type="search"
            placeholder={t.search.placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            aria-label={t.search.label}
          />
          {searchOpen && (
            <ul className="results" role="listbox">
              {results.slice(0, 60).map((x) => (
                <li key={x.id}>
                  <button role="option" aria-selected={x.id === selectedId} onClick={() => select(x.id)}>
                    <i className={`swatch swatch--${x.kind}`} />
                    <span className="results__name">{x.name}</span>
                    <span className="results__place">{x.lat == null ? t.search.noLocation : x.place}</span>
                  </button>
                </li>
              ))}
              {results.length === 0 && <li className="results__empty">{t.search.none}</li>}
              {results.length > 60 && <li className="results__empty">{t.search.more(results.length - 60)}</li>}
            </ul>
          )}
        </div>
        {!visitor?.precise && !origin && !selected && !enquiry && (
          <button className="near__precise near__precise--alone" onClick={usePreciseLocation}>
            {locationError ? t.near.denied : t.near.precise}
          </button>
        )}
        {!selected && !enquiry && near[0] && (
          <NearYou
            place={near[0].tour}
            km={near[0].km}
            others={nearOthers}
            copy={t}
            locationError={locationError}
            onOpen={() => select(near[0].tour.id)}
            onPrecise={visitor?.precise ? undefined : usePreciseLocation}
          />
        )}
      </div>

      {searchOpen && <div className="scrim" onClick={() => setSearchOpen(false)} />}


      {selected && (
        <aside className="panel" aria-label={selected.name}>
          <button className="panel__close" onClick={close} aria-label={t.panel.close}>
            ×
          </button>
          <div className="panel__media">
            {selected.pano && selected.cover ? (
              <PanoPreview key={selected.cover} copy={t} src={selected.cover} alt={selected.name} />
            ) : selected.cover ? (
              <img className="panel__cover" src={selected.cover} alt="" />
            ) : null}
          </div>
          <div className="panel__body">
            <p className="panel__kicker">
              {selected.kind === "obcina" ? t.panel.obcina : t.types[selected.type]}
              {selected.place && selected.kind !== "obcina" ? ` · ${selected.place}` : ""}
              {selected.source === "google" ? ` · ${t.panel.google}` : ""}
              {selected.approx && <span title={t.panel.approxTitle}> · {t.panel.approx}</span>}
            </p>
            <h2>{selected.name}</h2>
            <ul className="panel__meta">
              {selected.scenes != null && <li>{t.panoramas(selected.scenes)}</li>}
              {selected.views != null && <li>{t.panel.views(fmt(selected.views))}</li>}
              {selected.gmaps && (
                <li>
                  <a className="panel__link" href={selected.gmaps.url} target="_blank" rel="noopener">
                    {t.panel.onGoogle(t.panoramas(selected.gmaps.scenes))}
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
                {t.panel.enter}
              </button>
              <button className="btn btn--ghost" onClick={() => { setChatFrom(selected.name); setSelectedId(null); setEnquiry(true); }}>
                {t.panel.wantThis}
              </button>
              {selected.mapsUrl && (
                <a className="panel__link panel__link--center" href={selected.mapsUrl} target="_blank" rel="noopener">
                  {t.panel.openInMaps}
                </a>
              )}
            </div>
          </div>
        </aside>
      )}

      {(enquiry || chatStarted) && (
        <Chat
          hidden={!enquiry}
          copy={t}
          from={chatFrom}
          context={{ town: visitor?.city ?? ipVisitor?.city ?? null, country: visitor?.country ?? ipVisitor?.country ?? null, type, viewed, lang: `${navigatorLang || "unknown"} (site shown in ${lang})` }}
          onClose={() => setEnquiry(false)}
          onPrivacy={() => setPrivacyOpen(true)}
        />
      )}

      {tourOpen && selected && (
        <div className="tour" role="dialog" aria-label={t.tour.label(selected.name)}>
          {selected.source === "google" ? (
            <GoogleTour tour={selected} copy={t} />
          ) : (
            <iframe src={selected.url} title={selected.name} allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowFullScreen />
          )}
          <div className="tour__bar">
            <button className="btn btn--dark" onClick={() => setTourOpen(false)}>
              {t.tour.back}
            </button>
            <span>{selected.name}</span>
          </div>
        </div>
      )}

      <footer className="footer">
        <span>{t.footer.company}</span>
        <a className="footer__mail" href={`mailto:${ENQUIRY_TO}`}>{ENQUIRY_TO}</a>
        <a href="https://www.facebook.com/Webvisit360" target="_blank" rel="noopener">Facebook</a>
        <a href="https://www.instagram.com/webvisit360" target="_blank" rel="noopener">Instagram</a>
        <a href="https://kuula.co/profile/WEBVISIT360" target="_blank" rel="noopener">Kuula</a>
        <button onClick={() => setPrivacyOpen(true)}>{t.footer.privacy}</button>
      </footer>

      {privacyOpen && <PrivacyNotice copy={t} contact={ENQUIRY_TO} onClose={() => setPrivacyOpen(false)} />}

      {!ready && <div className="loader">{t.loading}</div>}
    </main>
  );
}
