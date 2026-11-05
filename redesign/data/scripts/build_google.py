"""Merge the Google Maps contributor export into tours.json.

Input:  raw/google_photos.json  (from gmaps_console_export.js, run in the owner's browser)
Output: tours.json gains items with source "google", kind "google" (one per place),
        plus stats.google*; places that already have a Kuula/3DVista tour are not
        duplicated (the existing item gets a `gmaps` link instead).

Run from anywhere:  python3 -I build_google.py
"""
import json, math, re, unicodedata
from collections import defaultdict
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent
RAW = DATA / "raw" / "google_photos.json"
TOURS = DATA / "tours.json"
# Per-place panorama lists for the in-site viewer, loaded on demand by the site.
SCENES = DATA.parent.parent / "public" / "data" / "google-scenes.json"

# Reported on the public profile (Fotografije tab); the export doesn't carry it.
PROFILE_VIEWS = 28_465_975


def norm(s):
    s = unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9 ]+", " ", s)


STOP = set("doo d o o sp s p hotel restavracija gostilna trgovina salon obcina center ljubljana maribor celje the and in na za pri".split())


def tokens(s):
    return {t for t in norm(s).split() if len(t) >= 4 and t not in STOP}


def dist_m(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def town(address):
    """'Slovenska cesta 16, 1000 Ljubljana, Slovenija' -> 'Ljubljana'."""
    if not address:
        return None
    parts = [p.strip() for p in address.split(",")]
    parts = [p for p in parts if p not in ("Slovenija", "Hrvaška", "Avstrija", "Italija")]
    for p in reversed(parts):
        m = re.match(r"^(?:SI-)?\d{4,5}\s+(.+)$", p)
        if m:
            return m.group(1)
    return parts[-1] if parts else None


def base(url):
    return url.split("=")[0] if url else None


def main():
    raw = json.load(open(RAW))
    tours = json.load(open(TOURS))
    items = [t for t in tours["items"] if t["source"] != "google"]
    for t in items:
        t.pop("gmaps", None)

    groups = defaultdict(list)
    for p in raw["photos"]:
        pl = p.get("place") or {}
        if not pl.get("name"):
            continue
        groups[pl.get("placeId") or pl["name"]].append(p)

    added, merged, scenes = [], 0, {}
    for key, photos in groups.items():
        pl = photos[0]["place"]
        lat, lng = pl.get("lat"), pl.get("lng")
        if lat is None:
            pts = [(p["lat"], p["lng"]) for p in photos if p["lat"] is not None]
            if not pts:
                continue
            lat, lng = sum(a for a, _ in pts) / len(pts), sum(b for _, b in pts) / len(pts)

        # Representative photo: the first one with its own coordinates.
        rep = next((p for p in photos if p["lat"] is not None and p.get("thumb")), photos[0])
        embed = (
            "https://www.google.com/maps/embed?pb=!4v1!6m8!1m7!1s" + rep["id"]
            + f"!2m2!1d{rep['lat'] or lat}!2d{rep['lng'] or lng}!3f0!4f0!5f0.78"
        )
        # Opens Google Maps straight in the 360 view of the representative photo.
        plat, plng = rep["lat"] or lat, rep["lng"] or lng
        maps = f"https://www.google.com/maps/@{plat},{plng},3a,75y,90t/data=!3m4!1e1!3m2!1s{rep['id']}!2e10"

        # Already shown as a Kuula/3DVista tour? Link it instead of adding a duplicate.
        tk = tokens(pl["name"])
        dup = None
        for t in items:
            if t["lat"] is None:
                continue
            if dist_m((lat, lng), (t["lat"], t["lng"])) < 400 and tk & tokens(t["name"]):
                dup = t
                break
        if dup:
            dup["gmaps"] = {"url": maps, "embed": embed, "scenes": len(photos)}
            merged += 1
            continue

        gid = "g-" + re.sub(r"[^A-Za-z0-9_-]", "", key)[-24:]
        # [photoId, image base url (append "=w…-h…-k-no"), lat, lng]; representative first.
        ordered = [rep] + [p for p in photos if p is not rep]
        scenes[gid] = [[p["id"], base(p["thumb"]),
                        round(p["lat"], 6) if p["lat"] is not None else None,
                        round(p["lng"], 6) if p["lng"] is not None else None]
                       for p in ordered if p.get("thumb")]
        added.append({
            "id": gid,
            "kind": "google",
            "source": "google",
            "name": pl["name"],
            "place": town(pl.get("address")),
            "category": pl.get("category"),
            "address": pl.get("address"),
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "approx": False,
            "url": embed,
            "mapsUrl": maps,
            "cover": base(rep.get("thumb")) + "=w2048-h1024-k-no" if rep.get("thumb") else None,
            "pano": bool(rep.get("thumb")),
            "scenes": len(photos),
            "views": None,
            "highlights": [],
        })

    added.sort(key=lambda t: -t["scenes"])
    tours["items"] = items + added
    st = tours["stats"]
    st["google"] = len(added)
    st["googlePhotos"] = len(raw["photos"])
    st["googleViews"] = PROFILE_VIEWS
    st["placed"] = sum(1 for t in tours["items"] if t["lat"] is not None)
    json.dump(tours, open(TOURS, "w"), ensure_ascii=False, indent=1)
    json.dump(scenes, open(SCENES, "w"), separators=(",", ":"))
    print(f"google places: {len(groups)} -> added {len(added)}, linked to existing {merged}")


if __name__ == "__main__":
    main()
