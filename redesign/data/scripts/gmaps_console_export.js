/*
 * Export all 360 photos from a Google Maps contributor "Photos" tab.
 *
 * Google only lists the first 10 photos to signed-out visitors, so this runs in
 * the OWNER's signed-in browser:
 *   1. Open https://www.google.com/maps/contrib/116826668001266347582/photos
 *      signed in as Webvisit360 – FPhoto (the "Fotografije" tab must be open).
 *   2. Open DevTools (Cmd+Option+J / Ctrl+Shift+J), Console tab.
 *      Chrome may ask you to type "allow pasting" first.
 *   3. Paste this whole file, press Enter, and leave the tab in front.
 *      Progress shows in the console and in the tab title. When the list stops
 *      growing, a file "webvisit360-google-photos.json" downloads.
 *   4. Upload that file to the Claude session.
 *
 * It only reads what the page already loads (photo id, place, address,
 * coordinates, thumbnail). Nothing is sent anywhere; the file is saved locally.
 * Run `wv360Done()` in the console to stop early and download what it has.
 */
(() => {
  const photos = new Map(); // photoId -> record
  const rawSamples = []; // first few unparsed payloads, for debugging
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

  const ingest = (url, text) => {
    if (!/preview\/mas|batchexecute|\/maps\/rpc|photo/i.test(url) || !text) return;
    const before = photos.size;
    // Strip the ")]}'" guard; batchexecute adds length-prefixed chunks.
    const body = text.replace(/^\)\]\}'\s*/, "");
    const chunks = body.split(/\n\d+\n/).concat([body]);
    for (const c of chunks) {
      try { walk(JSON.parse(c.trim())); } catch {}
    }
    try {
      const d = JSON.parse(body);
      if (Array.isArray(d) && Array.isArray(d[22]) && typeof d[22][2] === "number") total = d[22][2];
    } catch {}
    if (photos.size === before && rawSamples.length < 3 && text.length > 500) {
      rawSamples.push({ url: url.slice(0, 500), text: text.slice(0, 20000) });
    }
  };

  // Hook XHR and fetch so every batch the page loads is recorded.
  const XO = XMLHttpRequest.prototype.open;
  const XS = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__wvUrl = String(u); return XO.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    this.addEventListener("load", () => { try { ingest(this.__wvUrl, this.responseText); } catch {} });
    return XS.apply(this, arguments);
  };
  const F = window.fetch;
  window.fetch = async function (input) {
    const res = await F.apply(this, arguments);
    try {
      const url = typeof input === "string" ? input : input.url;
      if (/preview\/mas|batchexecute|photo/i.test(url)) res.clone().text().then((t) => ingest(url, t));
    } catch {}
    return res;
  };

  // The first page was loaded before we hooked in: fetch it again once.
  const firstMas = performance.getEntriesByType("resource").map((e) => e.name).find((n) => n.includes("/preview/mas"));
  if (firstMas) F(firstMas, { credentials: "include" }).then((r) => r.text()).then((t) => ingest(firstMas, t));

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

  let lastCount = -1;
  let idleTicks = 0;
  let stopped = false;

  const download = () => {
    stopped = true;
    const out = {
      exportedAt: new Date().toISOString(),
      profile: location.pathname,
      totalReported: total,
      count: photos.size,
      photos: [...photos.values()],
      rawSamples,
    };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: "application/json" }));
    a.download = "webvisit360-google-photos.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`%cDone: ${photos.size} photos saved to webvisit360-google-photos.json`, "color:#f6a93b;font-weight:bold");
    document.title = `✓ ${photos.size} photos exported`;
  };
  window.wv360Done = download;

  const tick = () => {
    if (stopped) return;
    const el = scroller();
    if (el) {
      // Nudge up a little first so "load more" observers fire again.
      el.scrollTop = el.scrollHeight - el.clientHeight - 400;
      setTimeout(() => { el.scrollTop = el.scrollHeight; }, 200);
    }
    if (photos.size === lastCount) idleTicks++;
    else { idleTicks = 0; lastCount = photos.size; }
    const msg = `${photos.size}${total ? " / " + total : ""} photos`;
    document.title = msg;
    console.log(msg + (idleTicks ? ` (waiting ${idleTicks}/25)` : ""));
    if (idleTicks >= 25 || (total && photos.size >= total)) download();
    else setTimeout(tick, 1500);
  };

  console.log("%cWebvisit360 export started. Keep this tab in front.", "color:#f6a93b;font-weight:bold");
  setTimeout(tick, 1500);
})();
