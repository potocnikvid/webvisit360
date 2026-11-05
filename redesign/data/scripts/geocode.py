import sys, json, re, html, time, urllib.request, urllib.parse
src, dst = sys.argv[1], sys.argv[2]
data = json.load(open(src))
def fix(s):
    s = html.unescape(s or "")
    try: s = s.encode("latin-1").decode("utf-8")
    except Exception: pass
    return s.strip()
def q(text):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({"q": text, "format": "jsonv2", "limit": 1, "countrycodes": "si,hr,at,it"})
    req = urllib.request.Request(url, headers={"User-Agent": "webvisit360-prototype/0.1 (+https://www.webvisit360.com)"})
    try:
        r = json.load(urllib.request.urlopen(req, timeout=20))
    except Exception as e:
        return None
    time.sleep(1.1)
    return r[0] if r else None
out = []
for x in data:
    name = fix(x["name"])
    clean = re.sub(r"(d\.o\.o\.|s\.p\.|d\.d\.|Sound from Zapsplat\.com|music_zapsplat|-\s*360)", "", name, flags=re.I)
    clean = re.split(r"[|]", clean)[0].strip(" ,-")
    hit = q(clean)
    out.append({"id": x["id"], "name": name, "query": clean,
                "lat": float(hit["lat"]) if hit else None, "lng": float(hit["lon"]) if hit else None,
                "match": hit.get("display_name") if hit else None, "type": hit.get("type") if hit else None})
    print(x["id"], "|", clean[:40], "->", (hit or {}).get("display_name", "—")[:90], flush=True)
json.dump(out, open(dst, "w"), ensure_ascii=False, indent=1)
