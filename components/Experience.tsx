"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlaceType, Tour, ToursFile } from "@/lib/types";
import { MAIN_TYPES, PLACE_TYPES, compact, fmt } from "@/lib/types";
import { copy, type Lang } from "@/lib/i18n";
import { useLang } from "@/lib/useLang";
import { CONTACT, TRUSTED_BADGE } from "@/lib/contact";
import { isNearby, type Visitor } from "@/lib/visitor";
import { countWithin, frameView, nearest } from "@/lib/nearby";
import type { Focus, GlobeApi, Look } from "./Globe";
import { peakFor, type Pov } from "@/lib/flight";
import { about, STUDIO } from "@/lib/about";
import Story from "./Story";
import PanoPreview from "./PanoPreview";
import GoogleTour from "./GoogleTour";
import NearYou from "./NearYou";
import FeaturedTour from "./FeaturedTour";
import { featured } from "@/lib/featured";
import Chat from "./Chat";
import PrivacyNotice from "./PrivacyNotice";

const Globe = dynamic(() => import("./Globe"), { ssr: false });

const SLOVENIA = { lat: 46.12, lng: 14.82, altitude: 0.085 };

const LOOK_OPTIONS: { id: Look; label: Record<Lang, string>; credit: string }[] = [
  { id: "satellite", label: { sl: "Satelit", en: "Satellite" }, credit: "Posnetki: Esri, Maxar, Earthstar Geographics" },
  { id: "illustrated", label: { sl: "Ilustracija", en: "Illustrated" }, credit: "Meje: geoBoundaries, Natural Earth" },
];
const LOOK_KEY = "wv360-look";

// Strip diacritics so "lasko" finds "Laško".
const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** How many nearest places to ring and frame when a type is chosen. */
const NEAR_COUNT = 5;

/** Wide screens keep a column of cards on the right (see .cards in globals.css). */
const CARDS_MIN_WIDTH = 900;
const CARDS_WIDTH = 340;

/** A view showing the visitor and the places near them, clear of the card column. */
const frame = (from: { lat: number; lng: number }, places: { tour: Tour }[]) => {
  const v = frameView([from, ...places.map((p) => ({ lat: p.tour.lat!, lng: p.tour.lng! }))]);
  if (typeof window === "undefined" || window.innerWidth < CARDS_MIN_WIDTH) return v;
  // Move the view east by half the column's width, so the places sit left of the cards.
  const w = window.innerWidth;
  const halfW = (26.8 * v.altitude * (w / window.innerHeight)) / Math.cos((v.lat * Math.PI) / 180);
  return { ...v, lng: v.lng + halfW * (Math.min(CARDS_WIDTH, w * 0.32) / w) };
};

/** The About story: the camera dives into the studio's streets, then the page inks in over the map. */
type StoryPhase = "closed" | "diving" | "open" | "leaving";
const DIVE_MS = 4200;
/** Share of the dive after which the page starts to appear over the map. */
const REVEAL_AT = 0.86;
const RETURN_MS = 3400;
const LEAVE_MS = 450;
const reducedMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const uniqueBy = <T,>(xs: T[], key: (x: T) => string) => {
  const seen = new Set<string>();
  return xs.filter((x) => {
    const k = key(x as T);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

/** A flat photo for the preview while (or if) the 3D view loads. Google can render a normal
 *  camera view straight from the panorama, which reads better than the stretched 360 image. */
const posterFor = (t: Tour) =>
  t.source === "google" && t.cover ? `${t.cover.split("=")[0]}=w800-h500-k-no-pi-0-ya0-ro0-fo100` : t.cover ?? undefined;

export default function Experience({ visitor: ipVisitor, initialStory = false }: { visitor: Visitor | null; initialStory?: boolean }) {
  const [data, setData] = useState<ToursFile | null>(null);
  const [geo, setGeo] = useState<any[] | null>(null);
  const [type, setType] = useState<PlaceType | "all">("obcina");
  const [moreTypes, setMoreTypes] = useState(false);
  // Phones only: the type chips fold away behind one button next to the search.
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Phones only: once the visitor moves the map, the hero and cards step aside (map mode).
  const [exploring, setExploring] = useState(false);
  const [visitor, setVisitor] = useState(ipVisitor);
  const [locationError, setLocationError] = useState(false);
  const { lang, switchLang } = useLang();
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
  const [look, setLook] = useState<Look>("satellite");
  // Remember the chosen look per browser (storage may be unavailable; that's fine).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOOK_KEY) as Look | null;
      if (saved && LOOK_OPTIONS.some((o) => o.id === saved)) setLook(saved);
    } catch {}
  }, []);
  const chooseLook = (l: Look) => {
    setLook(l);
    try {
      localStorage.setItem(LOOK_KEY, l);
    } catch {}
  };
  const focusKey = useRef(0);
  const [story, setStory] = useState<StoryPhase>(initialStory ? "open" : "closed");
  const storyRef = useRef(story);
  storyRef.current = story;
  const storyTimer = useRef(0);
  // Flying back out of the story: the map stays quiet (no pins or labels) until it lands.
  const [returning, setReturning] = useState(false);
  const returnTimer = useRef(0);
  const flyOut = useCallback(() => {
    window.clearTimeout(returnTimer.current);
    if (reducedMotion()) return setReturning(false);
    setReturning(true);
    returnTimer.current = window.setTimeout(() => setReturning(false), RETURN_MS * 0.8);
  }, []);
  const globeApi = useRef<GlobeApi | null>(null);
  /** Where the camera was before the story, to fly back to. */
  const savedView = useRef<Pov | null>(null);
  /** A reference picked before the tours had loaded. */
  const pendingTour = useRef<string | null>(null);

  const t = copy[lang];
  const [navigatorLang, setNavigatorLang] = useState("");

  useEffect(() => setNavigatorLang(navigator.language), []);

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
  // A standout tour ready to open on arrival, until the visitor opens one themselves.
  const standout = useMemo(
    () => (data && viewed.length === 0 ? featured(all, origin, near[0]?.tour.id) : null),
    [data, all, origin, near, viewed.length],
  );
  // Computed once, when the globe mounts: where the opening fly-in ends.
  const initialView = useMemo(() => (near.length ? frame(origin!, near) : undefined), [data !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const flyTo = useCallback((f: Omit<Focus, "key">) => {
    focusKey.current += 1;
    setFocus({ ...f, key: focusKey.current });
  }, []);
  const fly = useCallback(
    (lat: number, lng: number, altitude: number, ms?: number, panel?: boolean) => flyTo({ lat, lng, altitude, ms, panel }),
    [flyTo],
  );

  /** Close the story at once, without flying back (something else takes the camera). */
  const endStory = useCallback(() => {
    window.clearTimeout(storyTimer.current);
    setStory("closed");
    savedView.current = null;
    if (window.location.pathname === "/o-nas") window.history.replaceState(null, "", "/");
  }, []);

  const select = useCallback(
    (id: string) => {
      const t = byId.get(id);
      if (!t) return;
      const fromStory = storyRef.current !== "closed";
      if (fromStory) endStory();
      setSelectedId(id);
      setEnquiry(false);
      setViewed((v) => (v.includes(t.name) ? v : [...v, t.name]));
      setSearchOpen(false);
      if (t.lat != null && t.lng != null) {
        const altitude = t.kind === "obcina" ? 0.03 : 0.01;
        // Out of the story, rise from the studio and swing over to the place.
        const to = { lat: t.lat, lng: t.lng, altitude };
        if (fromStory) flyOut();
        flyTo({ ...to, panel: true, ...(fromStory && { arc: peakFor(globeApi.current?.pov() ?? STUDIO, to), ms: RETURN_MS }) });
      }
    },
    [byId, flyTo, endStory, flyOut],
  );

  // Deep links from the About page: /?tour=<id> opens a place, /?povprasevanje opens the chat.
  const linked = useRef(false);
  useEffect(() => {
    if (!data || linked.current) return;
    linked.current = true;
    const q = new URLSearchParams(window.location.search);
    const id = pendingTour.current ?? q.get("tour");
    if (id && byId.has(id)) select(id);
    else if (q.has("povprasevanje")) setEnquiry(true);
  }, [data, byId, select]);

  const home = useMemo(() => (near.length ? frame(origin!, near) : SLOVENIA), [near]);

  const openStory = useCallback(() => {
    if (storyRef.current !== "closed") return;
    const here = globeApi.current?.pov() ?? home;
    savedView.current = here;
    setSelectedId(null);
    setEnquiry(false);
    setSearchOpen(false);
    setTourOpen(false);
    window.clearTimeout(returnTimer.current);
    setReturning(false);
    flyTo({ ...STUDIO, story: true, arc: peakFor(here, STUDIO), ms: DIVE_MS });
    if (window.location.pathname !== "/o-nas") window.history.pushState({ story: true }, "", "/o-nas");
    window.clearTimeout(storyTimer.current);
    if (reducedMotion()) return setStory("open");
    setStory("diving");
    storyTimer.current = window.setTimeout(() => setStory("open"), DIVE_MS * REVEAL_AT);
  }, [home, flyTo]);

  const closeStory = useCallback(() => {
    if (storyRef.current === "closed" || storyRef.current === "leaving") return;
    const back = savedView.current ?? home;
    savedView.current = null;
    const from = globeApi.current?.pov() ?? STUDIO;
    flyOut();
    flyTo({ lat: back.lat, lng: back.lng, altitude: back.altitude, arc: peakFor(from, back), ms: RETURN_MS });
    if (window.location.pathname === "/o-nas") window.history.replaceState(null, "", "/");
    window.clearTimeout(storyTimer.current);
    if (reducedMotion()) return setStory("closed");
    setStory("leaving");
    storyTimer.current = window.setTimeout(() => setStory("closed"), LEAVE_MS);
  }, [home, flyTo, flyOut]);

  // The browser's back and forward buttons move between the map and the story.
  useEffect(() => {
    const onPop = () => (window.location.pathname === "/o-nas" ? openStory() : closeStory());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [openStory, closeStory]);

  useEffect(
    () => () => {
      window.clearTimeout(storyTimer.current);
      window.clearTimeout(returnTimer.current);
    },
    [],
  );

  // The tab title follows the URL (/o-nas or /).
  useEffect(() => {
    document.title = story === "closed" ? "Webvisit360 · 360° virtualni sprehodi" : "O nas · Webvisit360";
  }, [story]);

  const showReference = (id: string) => {
    if (byId.has(id)) return select(id);
    pendingTour.current = id;
    endStory();
  };

  const close = useCallback(() => {
    setSelectedId(null);
    setEnquiry(false);
    fly(home.lat, home.lng, home.altitude, 1400);
  }, [fly, home]);

  const chooseType = (next: PlaceType | "all") => {
    setType(next);
    setFiltersOpen(false);
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
  busy.current = !!selectedId || enquiry || searchOpen || story !== "closed";
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
      else if (filtersOpen) setFiltersOpen(false);
      else if (storyRef.current !== "closed" && !enquiry) closeStory();
      else if (selectedId) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [privacyOpen, tourOpen, searchOpen, filtersOpen, selectedId, close, closeStory, enquiry]);

  const stats = data?.stats;
  const totalViews = stats ? stats.kuulaViews + (stats.googleViews ?? 0) : 0;
  const totalScenes = stats ? stats.scenes + (stats.googlePhotos ?? 0) : 0;
  const totalPlaces = stats ? stats.business + (stats.google ?? 0) : 0;
  const a = about[lang];
  const whyText = (
    <>
      <span className="why__text">
        <b>{a.entry.title}</b>
        <span>{a.entry.text}</span>
      </span>
      <span className="why__go" aria-hidden>→</span>
    </>
  );
  const aboutLink = (e: React.MouseEvent) => {
    e.preventDefault();
    openStory();
  };

  return (
    <main className={`app ${selected ? "has-panel" : ""} ${enquiry ? "has-chat" : ""} ${story !== "closed" || returning ? "has-story" : ""} ${story === "open" ? "story-open" : ""} ${ready ? "is-ready" : ""} ${filtersOpen ? "filters-open" : ""} ${exploring ? "exploring" : ""} ${searchOpen ? "searching" : ""}`}>
      <div className="sky" aria-hidden />
      {geo && data && (
        <Globe
          tours={all}
          initialView={initialView}
          you={origin ? { lat: origin.lat, lng: origin.lng, precise: !!origin.precise, label: origin.precise ? t.you.here : t.you.around } : null}
          highlightIds={highlightIds}
          focusType={type}
          geo={geo}
          selectedId={selectedId}
          focus={focus}
          paused={tourOpen}
          onSelect={select}
          onExplore={() => {
            if (storyRef.current !== "closed") return;
            setExploring(true);
            setFiltersOpen(false);
          }}
          studio={story !== "closed" ? { lat: STUDIO.lat, lng: STUDIO.lng, label: a.pin } : null}
          intro={!initialStory}
          quiet={story !== "closed" || returning}
          onReady={(api) => {
            globeApi.current = api;
            setReady(true);
            // Landing on /o-nas: the opening flight goes straight down to the studio, after the
            // same short pause the usual opening has (the tile engine is still starting up).
            if (initialStory)
              window.setTimeout(() => flyTo({ ...STUDIO, story: true, arc: peakFor(api.pov(), STUDIO), ms: 4200 }), 700);
          }}
          look={look}
        />
      )}

      <header className="topbar">
        <a className="brand" href="/" aria-label={t.brandHome}>
          <img src="/logo.png" alt="" width={36} height={36} />
          <span>
            webvisit<b>360</b>
          </span>
        </a>
        <div className="looks" role="radiogroup" aria-label={lang === "sl" ? "Videz zemljevida" : "Map style"}>
          {LOOK_OPTIONS.map((o) => (
            <button
              key={o.id}
              role="radio"
              aria-checked={look === o.id}
              className={look === o.id ? "is-on" : ""}
              onClick={() => chooseLook(o.id)}
            >
              {o.label[lang]}
            </button>
          ))}
        </div>
        <nav className="nav">
          <a className="nav__link" href="/o-nas" onClick={aboutLink}>{t.nav.about}</a>
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
        {/* Right after the numbers: whoever read this far and wants more. On phones it carries a
            small Trusted badge (on wider screens the badge sits in the corner). */}
        <button className="why" onClick={openStory}>
          <img className="why__badge" src={TRUSTED_BADGE.src} alt="" width={128} height={32} />
          {whyText}
        </button>
      </section>

      <div className="finder">
        <div className="chips" id="type-chips" role="radiogroup" aria-label={t.filter.label}>
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

        <div className="search-row">
        <div className={`search ${searchOpen ? "is-open" : ""}`}>
          <input
            type="search"
            placeholder={t.search.placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => {
              setSearchOpen(true);
              setFiltersOpen(false);
            }}
            aria-label={t.search.label}
          />
          {/* Phones: the search fills the screen while open; this closes it. */}
          {searchOpen && (
            <button className="search__cancel" onClick={() => setSearchOpen(false)}>
              {t.search.cancel}
            </button>
          )}
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
          {/* Phones: shows the chosen type and opens the chips (always shown on wider screens). */}
          <button
            className={`filter-toggle ${filtersOpen ? "is-on" : ""}`}
            aria-expanded={filtersOpen}
            aria-controls="type-chips"
            aria-label={`${t.filter.label}: ${type === "all" ? t.filter.all : t.types[type]}`}
            onClick={() => {
              setSearchOpen(false);
              setFiltersOpen((v) => !v);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M2 4h12M4.5 8h7M7 12h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            </svg>
            <span>{type === "all" ? t.filter.all : t.types[type]}</span>
          </button>
        </div>
        {exploring && (
          <button className="explore-back" onClick={() => setExploring(false)}>
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <path d="M2.5 7.5 6 4l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            {t.showIntro}
          </button>
        )}
        {!visitor?.precise && !origin && !selected && !enquiry && (
          <button className="near__precise near__precise--alone" onClick={usePreciseLocation}>
            {locationError ? t.near.denied : t.near.precise}
          </button>
        )}
        {!selected && !enquiry && (near[0] || standout) && (
          <div className="cards">
            {near[0] && (
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
            {standout && (
              <FeaturedTour
                item={standout}
                copy={t}
                onShow={() => select(standout.tour.id)}
                onEnter={() => {
                  select(standout.tour.id);
                  setTourOpen(true);
                }}
              />
            )}
          </div>
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
              <PanoPreview key={selected.cover} copy={t} src={selected.cover} poster={posterFor(selected)} alt={selected.name} />
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

      {(story === "open" || story === "leaving") && (
        <Story
          copy={a}
          leaving={story === "leaving"}
          onBack={closeStory}
          onEnquire={() => {
            setChatFrom(null);
            setEnquiry(true);
          }}
          onReference={showReference}
          onPrivacy={() => setPrivacyOpen(true)}
          privacyLabel={t.footer.privacy}
          onScroll={(px) => globeApi.current?.scrollGround(px)}
        />
      )}

      {tourOpen && selected && (
        <div className={`tour ${selected.source === "google" ? "tour--google" : ""}`} role="dialog" aria-label={t.tour.label(selected.name)}>
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

      {/* Wider screens: the Trusted badge in the bottom-right corner. */}
      <div className="corner">
        <img className="trusted-corner" src={TRUSTED_BADGE.src} alt={TRUSTED_BADGE.alt} width={210} height={53} />
      </div>

      <footer className="footer">
        <span>
          <span className="footer__full">{t.footer.company}</span>
          {/* Phones: the short form keeps the whole footer on one line. */}
          <span className="footer__short">© Sinhron d.o.o.</span>
        </span>
        <a href="/o-nas" onClick={aboutLink}>{t.nav.about}</a>
        <a className="footer__mail" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        <a href="https://www.facebook.com/Webvisit360" target="_blank" rel="noopener">Facebook</a>
        <a href="https://www.instagram.com/webvisit360" target="_blank" rel="noopener">Instagram</a>
        <a href="https://kuula.co/profile/WEBVISIT360" target="_blank" rel="noopener">Kuula</a>
        <button onClick={() => setPrivacyOpen(true)}>{t.footer.privacy}</button>
      </footer>

      {privacyOpen && <PrivacyNotice copy={t} contact={CONTACT.email} onClose={() => setPrivacyOpen(false)} />}

      <p className="credit">{LOOK_OPTIONS.find((o) => o.id === look)?.credit}</p>

      {!ready && <div className="loader">{t.loading}</div>}
    </main>
  );
}
