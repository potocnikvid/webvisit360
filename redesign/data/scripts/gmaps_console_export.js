/*
 * Export all 360 photos from a Google Maps contributor "Photos" tab.
 *
 * Works for any account. Google only shows a profile's photos to the account
 * that owns them, so run it in a browser signed in as that account:
 *   1. Open https://www.google.com/maps signed in as that account, open the menu
 *      (☰ or your profile picture) → "Your contributions" / "Vaši prispevki",
 *      then the "Photos" / "Fotografije" tab. The address must look like
 *      https://www.google.com/maps/contrib/<number>/photos…
 *      (Webvisit360 – FPhoto is contrib/116826668001266347582.)
 *   2. Open DevTools (Cmd+Option+J / Ctrl+Shift+J), Console tab.
 *      Chrome may ask you to type "allow pasting" first.
 *   3. Paste this whole file, press Enter, and leave the tab in front.
 *      It scrolls the list so the page loads every batch. If scrolling stops
 *      bringing more, it asks Google for the next pages itself, the same way the
 *      page does. Progress shows in the console and in the tab title. At the end
 *      a file "google-photos-<number>.json" downloads.
 *   4. Upload that file to the Claude session.
 *
 * It only reads what the page already loads (photo id, place, address,
 * coordinates, thumbnail). Nothing is sent anywhere; the file is saved locally.
 * Run `wv360Done()` in the console to stop early and download what it has.
 */
(() => {
  const contrib = (location.pathname.match(/\/maps\/contrib\/(\d+)/) || [])[1];
  if (!contrib || !/\/photos/.test(location.pathname)) {
    console.warn("Open the contributor's Photos tab first: google.com/maps/contrib/<number>/photos");
    return;
  }
  const MATCH = /preview\/mas|batchexecute|\/maps\/rpc|photo/i;
  const STALL = 8; // quiet ticks before asking Google for the next page directly
  const GIVE_UP = 40; // quiet ticks before saving what we have
  const STYLE = "color:#f6a93b;font-weight:bold";

  const photos = new Map(); // photoId -> record
  const rawSamples = []; // first few payloads that held no photos, for debugging
  const requests = []; // every matching response: status, photos added, url
  const pages = []; // the last few responses that brought photos: { url, text }
  let total = null;

  const isLatLng = (a) =>
    Array.isArray(a) && a.length >= 4 && a[0] == null && a[1] == null &&
    typeof a[2] === "number" && typeof a[3] === "number";

  // A photo entry looks like [photo[], place[], ...] where photo[0] is the id
  // ("CIABIhC…" / "CIHM…") and place = [[null,null,lat,lng], null, name, address, [category], …].
  const tryEntry = (e) => {
    if (!Array.isArray(e) || !Array.isArray(e[0]) || typeof e[0][0] !== "string") return false;
    const id = e[0][0];
    if (!/^(CI|AF1Q)/.test(id) || id.length < 16) return false;
    const pl = Array.isArray(e[1]) ? e[1] : null;
    const thumb = Array.isArray(e[0][6]) ? e[0][6][0] : null;
    let photoLatLng = null;
    // Photo's own position sits deeper in the photo array; find the first lat/lng.
    (function find(x, depth) {
      if (photoLatLng || depth > 8 || !Array.isArray(x)) return;
      if (isLatLng(x)) { photoLatLng = [x[2], x[3]]; return; }
      for (const y of x) find(y, depth + 1);
    })(e[0], 0);
    const rec = {
      id,
      thumb,
      lat: photoLatLng ? photoLatLng[0] : null,
      lng: photoLatLng ? photoLatLng[1] : null,
      place: pl ? {
        name: typeof pl[2] === "string" ? pl[2] : null,
        address: typeof pl[3] === "string" ? pl[3] : null,
        category: Array.isArray(pl[4]) ? pl[4][0] : null,
        lat: isLatLng(pl[0]) ? pl[0][2] : null,
        lng: isLatLng(pl[0]) ? pl[0][3] : null,
        cid: Array.isArray(pl[14]) && /^0x/.test(pl[14][0]) ? pl[14][0] : null, // "0x…:0x…"
        placeId: typeof pl[18] === "string" ? pl[18] : null, // "ChIJ…"
      } : null,
    };
    if (!photos.has(id)) photos.set(id, rec);
    return true;
  };

  const walk = (x, depth = 0) => {
    if (depth > 40) return 0;
    if (typeof x === "string" && x.length > 50 && (x[0] === "[" || x[0] === "{")) {
      try { return walk(JSON.parse(x), depth + 1); } catch { return 0; }
    }
    if (!Array.isArray(x)) return 0;
    if (tryEntry(x)) return 1;
    let n = 0;
    for (const y of x) n += walk(y, depth + 1);
    return n;
  };

  // Strip the ")]}'" guard; batchexecute adds length-prefixed chunks.
  const parse = (text) => {
    const body = text.replace(/^\)\]\}'\s*/, "");
    const docs = [];
    for (const c of body.split(/\n\d+\n/).concat([body])) {
      try { docs.push(JSON.parse(c.trim())); } catch {}
    }
    return docs;
  };

  // The profile's photo count, from its contribution list:
  // [3, …, "Fotografije", n, ".../photo.png", n, "1.234 fotografij"].
  const findTotal = (x, depth = 0) => {
    if (!Array.isArray(x) || depth > 30) return null;
    if (x[0] === 3 && typeof x[8] === "string" && /\/photo\.png/.test(x[8]) && typeof x[10] === "string") {
      const n = parseInt(x[10].replace(/\D/g, ""), 10);
      if (n > 0) return n;
    }
    for (const y of x) { const n = findTotal(y, depth + 1); if (n) return n; }
    return null;
  };

  const decoded = (u) => { try { return decodeURIComponent(u); } catch { return u; } };

  const ingest = (url, text, status = 200) => {
    if (!MATCH.test(url)) return 0;
    const before = photos.size;
    const docs = text ? parse(text) : [];
    docs.forEach((d) => walk(d));
    // Only trust a count that came with this profile's own id (not the viewer's).
    if (decoded(url).includes("!1s" + contrib)) {
      for (const d of docs) {
        const t = (Array.isArray(d) && Array.isArray(d[22]) && typeof d[22][2] === "number" && d[22][2]) || findTotal(d);
        if (t) total = t;
      }
    }
    const added = photos.size - before;
    requests.push({ at: new Date().toISOString(), status, added, bytes: text ? text.length : 0, url: url.slice(0, 2000) });
    if (requests.length > 300) requests.shift();
    if (added) {
      pages.push({ url, text });
      if (pages.length > 3) pages.shift();
    } else if (rawSamples.length < 3 && text && text.length > 500) {
      rawSamples.push({ url: url.slice(0, 2000), text: text.slice(0, 20000) });
    }
    if (status !== 200) console.warn(`Google answered ${status || "with an error"} for ${url.slice(0, 120)}…`);
    return added;
  };

  // Hook XHR and fetch so every batch the page loads is recorded.
  const XO = XMLHttpRequest.prototype.open;
  const XS = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__wvUrl = String(u); return XO.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    this.addEventListener("loadend", () => {
      try {
        if (!MATCH.test(this.__wvUrl || "")) return;
        let text = "";
        try { text = this.responseText; } catch {}
        ingest(this.__wvUrl, text, this.status);
      } catch {}
    });
    return XS.apply(this, arguments);
  };
  const F = window.fetch;
  window.fetch = async function (input) {
    const res = await F.apply(this, arguments);
    try {
      const url = typeof input === "string" ? input : input.url;
      if (MATCH.test(url)) res.clone().text().then((t) => ingest(url, t, res.status));
    } catch {}
    return res;
  };

  // The first page was loaded before we hooked in: fetch this profile's requests again once.
  performance.getEntriesByType("resource").map((e) => e.name)
    .filter((n) => n.includes("/preview/mas") && decoded(n).includes("!1s" + contrib))
    .forEach((n) => F(n, { credentials: "include" }).then((r) => r.text().then((t) => ingest(n, t, r.status))).catch(() => {}));

  // ---- Continuing the list without scrolling -------------------------------
  // Each page request carries something the previous response handed out (a
  // token) or an offset. Compare the last two requests that brought photos to
  // learn which part changes, then build the next request the same way.
  const pbOf = (u) => { const m = u.match(/[?&]pb=([^&]*)/); return m ? decoded(m[1]).split("!") : null; };
  const pathOf = (x, val, depth = 0) => {
    if (typeof x === "string") return x === val ? [] : null;
    if (!Array.isArray(x) || depth > 30) return null;
    for (let i = 0; i < x.length; i++) {
      const p = pathOf(x[i], val, depth + 1);
      if (p) return [i, ...p];
    }
    return null;
  };
  const at = (x, path) => path.reduce((v, i) => (Array.isArray(v) ? v[i] : undefined), x);

  const nextUrl = () => {
    if (pages.length < 2) return null;
    const [prev, last] = pages.slice(-2);
    const a = pbOf(prev.url), b = pbOf(last.url);
    if (!a || !b || a.length !== b.length) return null;
    const next = [...b];
    let advanced = false;
    for (let i = 0; i < b.length; i++) {
      if (a[i] === b[i]) continue;
      const key = (b[i].match(/^\d+[a-zA-Z]/) || [])[0];
      if (!key || a[i].slice(0, key.length) !== key) return null;
      const va = a[i].slice(key.length), vb = b[i].slice(key.length);
      if (key.endsWith("i") && /^-?\d+$/.test(va) && /^-?\d+$/.test(vb)) {
        next[i] = key + (2 * Number(vb) - Number(va)); // an offset: step it once more
        advanced = true;
      } else if (key.endsWith("s")) {
        // A token: find where the previous response held it, read the same spot in the last one.
        let path = null;
        for (const d of parse(prev.text)) { path = pathOf(d, vb); if (path) break; }
        if (!path) continue;
        for (const d of parse(last.text)) {
          const v = at(d, path);
          if (typeof v === "string" && v && v !== vb) { next[i] = key + v; advanced = true; break; }
        }
      }
    }
    if (!advanced) return null;
    const pb = encodeURIComponent(next.join("!")).replace(/!/g, "%21");
    return last.url.replace(/([?&]pb=)[^&]*/, (_, k) => k + pb);
  };

  let lastCount = -1;
  let idleTicks = 0;
  let stopped = false;
  let direct = "idle"; // "idle" | "running" | "done"

  const report = () => {
    const msg = `${photos.size}${total ? " / " + total : ""} photos`;
    document.title = msg;
    console.log(msg + (idleTicks ? ` (waiting ${idleTicks}/${GIVE_UP})` : ""));
  };

  const continueDirectly = async () => {
    direct = "running";
    console.log("%cScrolling stopped bringing more; asking Google for the next pages directly…", STYLE);
    let url = nextUrl();
    while (url && !stopped) {
      let added = 0;
      try {
        const r = await F(url, { credentials: "include" });
        added = ingest(url, await r.text(), r.status);
      } catch (e) { console.warn("Request failed:", e); }
      report();
      if (!added) break;
      await new Promise((r) => setTimeout(r, 1200)); // keep a polite pace
      url = nextUrl();
    }
    direct = "done";
    idleTicks = 0;
    lastCount = photos.size;
  };

  const scroller = () => {
    let best = null;
    for (const el of document.querySelectorAll("div")) {
      const s = getComputedStyle(el).overflowY;
      if ((s === "auto" || s === "scroll") && el.scrollHeight > el.clientHeight + 100 && el.getBoundingClientRect().left < 600) {
        if (!best || el.scrollHeight > best.scrollHeight) best = el;
      }
    }
    return best;
  };

  const download = () => {
    stopped = true;
    const out = {
      exportedAt: new Date().toISOString(),
      profile: location.pathname,
      contrib,
      totalReported: total,
      count: photos.size,
      photos: [...photos.values()],
      // For debugging an export that stops early.
      requests,
      lastPages: pages.slice(-2).map((p) => ({ url: p.url, head: p.text.slice(0, 4000), tail: p.text.slice(-4000) })),
      rawSamples,
    };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: "application/json" }));
    a.download = `google-photos-${contrib}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`%cDone: ${photos.size}${total ? " of " + total : ""} photos saved to google-photos-${contrib}.json`, STYLE);
    document.title = `✓ ${photos.size} photos exported`;
  };
  window.wv360Done = download;

  const tick = () => {
    if (stopped) return;
    if (direct === "running") { setTimeout(tick, 1500); return; }
    const el = scroller();
    if (el) {
      if (idleTicks > 0 && idleTicks % 4 === 0) {
        // Scroll well up and back down, so the list's "load more" trigger fires again.
        el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight - 3000);
        setTimeout(() => { el.scrollTop = el.scrollHeight; }, 700);
      } else {
        el.scrollTop = el.scrollHeight - el.clientHeight - 400;
        setTimeout(() => { el.scrollTop = el.scrollHeight; }, 200);
      }
    }
    if (photos.size === lastCount) idleTicks++;
    else { idleTicks = 0; lastCount = photos.size; }
    report();
    if (total && photos.size >= total) { download(); return; }
    if (idleTicks >= STALL && direct === "idle" && nextUrl()) continueDirectly();
    else if (idleTicks >= GIVE_UP) { download(); return; }
    setTimeout(tick, 1500);
  };

  console.log("%cWebvisit360 export started. Keep this tab in front.", STYLE);
  setTimeout(tick, 1500);
})();
