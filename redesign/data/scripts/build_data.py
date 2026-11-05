import sys, json, re, html, math, hashlib
D = "data/"; OUT = sys.argv[1]
T = {"Ljubljana":(46.0532,14.5072),"Celje":(46.2360,15.2677),"Maribor":(46.5547,15.6459),"Koper":(45.5469,13.7294),
     "Izola":(45.5389,13.6600),"Podčetrtek":(46.1569,15.6018),"Ribnica":(45.7386,14.7275),"Slovenj Gradec":(46.5089,15.0784),
     "Kozje":(46.0733,15.5517),"Vrhnika":(45.9636,14.2953),"Logatec":(45.9172,14.2297),"Brežice":(45.9033,15.5911),
     "Ptuj":(46.4200,15.8700),"Ljutomer":(46.5208,16.1975),"Radeče":(46.0667,15.1833),"Žalec":(46.2514,15.1650),
     "Portorož":(45.5142,13.5900),"Moravci":(46.5167,16.1167),"Rečica ob Savinji":(46.3167,14.9167),"Lipoglav":(46.0050,14.6330),
     "Brda":(45.9733,13.5114),"Volčji Potok":(46.1907,14.6085),"Kamnica":(46.5741,15.6150)}
# id -> town (approximate) ; None = location unknown (list only) ; "keep" = trust OSM match
OVR = {"7d5ZL":"Rečica ob Savinji","7T32z":"Izola","7TwMg":"Izola","71Cdy":"Celje","7bQdv":None,"7ZJF3":None,"7KVjh":"Podčetrtek",
 "7XKvn":None,"7X764":"Ribnica","7Fxyd":"Slovenj Gradec","79n7b":"Celje","79MSp":"=79Z2b","791gc":None,"79cy4":"Koper","79J3s":"Podčetrtek",
 "79JGR":None,"79JGl":"Kozje","79N6P":"Maribor","7v6MD":"Ljubljana","7vJgx":None,"7vvBz":None,"7vqbJ":"Ljubljana","7qwSC":"Ljubljana",
 "7qVnb":"Ljubljana","7qxSV":None,"7qTmZ":None,"7qZyt":None,"7qZgz":None,"7qZYh":"Brda","7qKsT":"Kamnica","7qFBr":"Celje","7qFQM":"Volčji Potok",
 "7qFVg":"Ljubljana","7qFNk":None,"7q9QX":None,"7PYys":None,"7q9CQ":None,"7q9CD":None,"7q9xb":"Maribor","7qvl0":None,"7krvR":None,"7kzj9":None,
 "7ksLF":None,"7kngM":None,"7kdtt":"Celje","7kT96":None,"7kDTy":None,"7kGzB":"Vrhnika","7YVkN":None,"7YZJ6":None,"7YF0t":None,"7YvC3":"Ljubljana",
 "7PDft":"Ljubljana","7YYsw":None,"7YYjv":None,"7YmVd":None,"7PS8J":"Ljubljana","7PHWs":None,"7PDP4":"Logatec","7PXVj":None,"7PJJG":None,
 "7PJFV":None,"7P9th":None,"7P98z":None,"7P98n":None,"7P98h":None,"7P023":"Maribor","7ltzF":None,"7lrSm":None,"7lj4Y":"Celje","7lCTn":"Brežice",
 "7l6zH":None,"7l6wY":None,"7l6sV":None,"7l6s9":"Ljubljana","7l6jQ":None,"7l9sL":None,"7l6C1":None,"7l6Cc":None,"7lTKS":"Ljubljana","7lFBY":None,
 "7l98p":"Maribor","7l962":None,"7l9J9":None,"7lvCY":"Ljubljana","7lvxt":"Moravci","7lv8y":"Portorož","7lv87":"Maribor","7lvZD":None,"7lvZf":None,
 "7lvFN":"Ptuj","7lvY3":"Ljubljana","7lvmR":"Ljutomer","7lqsc":"Radeče","7lq00":None,"7lqLK":"Ljubljana","7lqhD":None,"7lkBS":"Lipoglav",
 "7lkBR":None,"7lkFk":"Žalec","7q9gB":None,"7q9gC":None,"7q9gn":None,"7q9gb":None,"7q9gL":None}
DROP = {"7lqLg","7PHsS","7PHgn","7PHgv","7PHHV","7PHDl","7PHD0","79MSp"}  # fragments / duplicates
RENAME = {"7PHDL":"Agroteh Impodan","7qFVg":"Holiday Inn Express Ljubljana","7qTmZ":"Arona","7lkFk":"Luxury House Žalec",
          "7qQ16":"ETIS Ljubljana (2025)","79Z2b":"Nebo Show Restaurant","7YYsw":"FPL Avtocenter Pušnik","7l6jQ":"Avtodom Rovando",
          "7l9sL":"Avtodom Rovando Carthago C-Tourer","791gc":"Posest (panorama)","7q9gL":"Nesting Resort"}
def fix(s):
    s = html.unescape(s or "")
    try: s = s.encode("latin-1").decode("utf-8")
    except Exception: pass
    return re.sub(r"\s+", " ", s).strip()
def nice(s):
    s = fix(s)
    if s.isupper() and len(s) > 3:
        small = {"IN","Z","ZA","OB","NA","V","PRI","D.O.O.","&"}
        s = " ".join(w.capitalize() if w not in small else w.lower() for w in s.split())
        s = re.sub(r"\b(Bbq|Led|Btc|Ajm|Kc|Slv|Stv|Fpl|Etis|Ace)\b", lambda m: m.group(1).upper(), s)
    return s.replace("d.o.o.", "").replace(" ,", ",").strip(" ,")
def jitter(key, lat, lng, r=0.012):
    h = hashlib.md5(key.encode()).digest()
    a = h[0] / 255 * 2 * math.pi; d = (0.35 + h[1] / 255 * 0.65) * r
    return lat + d * math.sin(a), lng + d * math.cos(a) / math.cos(math.radians(lat))
def scene_highlights(labels, drop_words):
    seen, out = set(), []
    for l in labels:
        l = fix(l)
        l = re.sub(r"(?i)\b(copy|new|panorama|virtualni sprehod|360|jpg|dji|street view)\b", " ", l)
        l = re.sub(r"[-_]+", " ", l); l = re.sub(r"\d+", " ", l); l = re.sub(r"\s+", " ", l).strip()
        for w in drop_words: l = re.sub(r"(?i)^" + re.escape(w) + r"\b\s*", "", l).strip()
        if len(l) < 4: continue
        t = l.title() if l.isupper() or l.islower() else l
        k = t.lower()
        if k in seen: continue
        seen.add(k); out.append(t)
    return out[:14]

items = []
for t in json.load(open(D + "tours3dv.json")):
    lat, lng = t["lat"], t["lng"]
    if t["slug"] == "inotherm": lat, lng = 45.8159, 15.8580
    drop = [t["name"].upper(), t["name"], t["slug"].replace("-", " "), "obcina", "občina", "panorama"]
    items.append({"id": t["slug"], "kind": "obcina" if t["kind"] == "obcina" else "business", "source": "3dvista",
        "name": ("Občina " + t["name"]) if t["kind"] == "obcina" else t["name"], "place": t["name"],
        "lat": lat, "lng": lng, "approx": False, "url": t["url"], "cover": t.get("cover"), "pano": True,
        "scenes": t["scenes"], "views": None, "highlights": scene_highlights(t["sceneLabels"], drop)})
geo = {g["id"]: g for g in json.load(open(D + "kuula_geo.json"))}
for k in json.load(open(D + "kuula.json")):
    cid = k["id"]
    if cid in DROP: continue
    g = geo.get(cid, {}); place = None; approx = False
    o = OVR.get(cid, "keep")
    if o == "keep" and g.get("lat"):
        lat, lng = g["lat"], g["lng"]
        m = g.get("match") or ""
        parts = [p.strip() for p in m.split(",")]
        place = next((p for p in reversed(parts) if p in T or p in ("Domžale","Mengeš","Laško","Kranj","Kungota","Ravne na Koroškem","Dravograd","Krško","Kidričevo","Slovenska Bistrica","Rogaška Slatina","Kamnik","Zagreb","Podsreda","Petrovče","Ljubno","Mokronog-Trebelno")), None)
        if "Ljubljana" in m: place = "Ljubljana"
    elif isinstance(o, str) and o.startswith("="):
        continue
    elif o and o != "keep":
        lat, lng = jitter(cid, *T[o]); place = o; approx = True
    else:
        lat = lng = None
    name = RENAME.get(cid) or nice(k["name"])
    items.append({"id": cid, "kind": "business", "source": "kuula", "name": name, "place": place,
        "lat": lat, "lng": lng, "approx": approx, "url": k["url"] + "?logo=1&info=1&fs=1&vr=0&thumbs=1",
        "cover": k["cover"], "pano": False, "scenes": k["scenes"], "views": k["views"],
        "highlights": [], "created": (k.get("created") or "")[:4]})
# spread exact duplicates (same building, e.g. Maros / Natuzzi)
seen = {}
for it in items:
    if it["lat"] is None: continue
    key = (round(it["lat"], 4), round(it["lng"], 4))
    if key in seen: it["lat"], it["lng"] = jitter(it["id"], it["lat"], it["lng"], 0.003)
    seen[key] = 1
stats = {"obcine": sum(i["kind"] == "obcina" for i in items), "business": sum(i["kind"] == "business" for i in items),
         "placed": sum(i["lat"] is not None for i in items), "scenes": sum(i["scenes"] or 0 for i in items),
         "kuulaViews": sum(i["views"] or 0 for i in items)}
json.dump({"stats": stats, "items": items}, open(OUT + "/tours.json", "w"), ensure_ascii=False)
print(stats)

# polygons: countries + Slovenian municipalities, tagged with tour slug
def pip(lat, lng, geom):
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    for poly in polys:
        ring = poly[0]; inside = False; j = len(ring) - 1
        for i in range(len(ring)):
            xi, yi = ring[i]; xj, yj = ring[j]
            if (yi > lat) != (yj > lat) and lng < (xj - xi) * (lat - yi) / (yj - yi) + xi: inside = not inside
            j = i
        if inside: return True
    return False
mun = json.load(open("dl/geo/svn_adm2.geojson"))
obc = [i for i in items if i["kind"] == "obcina"]
feats = []
for f in mun["features"]:
    tour = next((o["id"] for o in obc if pip(o["lat"], o["lng"], f["geometry"])), None)
    feats.append({"type": "Feature", "properties": {"k": "m", "tour": tour}, "geometry": f["geometry"]})
cn = json.load(open("dl/geo/countries.geojson"))
for f in cn["features"]:
    feats.append({"type": "Feature", "properties": {"k": "c", "n": f["properties"]["ADMIN"]}, "geometry": f["geometry"]})
def rnd(c):
    return [rnd(x) for x in c] if isinstance(c[0], list) else [round(c[0], 4), round(c[1], 4)]
for f in feats: f["geometry"]["coordinates"] = rnd(f["geometry"]["coordinates"])
json.dump({"type": "FeatureCollection", "features": feats}, open(OUT + "/geo.json", "w"), separators=(",", ":"))
print("tagged municipalities:", sorted(f["properties"]["tour"] for f in feats if f["properties"].get("tour")))
