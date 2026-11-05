import sys, json, re, urllib.request, concurrent.futures as cf
TOURS = [
 ("postojna","Postojna","obcina","https://postojna.webvisit360.com",45.7743,14.2153),
 ("nazarje","Nazarje","obcina","https://nazarje-virtualtour.vercel.app",46.3197,14.9469),
 ("luce","Luče","obcina","https://luce.webvisit360.com",46.3547,14.7458),
 ("braslovce","Braslovče","obcina","https://braslovce.webvisit360.com",46.2897,15.0392),
 ("sredisce","Središče ob Dravi","obcina","https://sredisce-virtualtour.vercel.app",46.3956,16.2683),
 ("zalec","Žalec","obcina","https://zalec.webvisit360.com",46.2514,15.1650),
 ("slovenj-gradec","Slovenj Gradec","obcina","https://slovenjgradec.webvisit360.com",46.5103,15.0806),
 ("recica","Rečica ob Savinji","obcina","https://obcina-recica.webvisit360.com",46.3167,14.9167),
 ("solcava","Solčava","obcina","https://solcava-virtualtour.vercel.app",46.4194,14.6928),
 ("trbovlje","Trbovlje","obcina","https://trbovlje.webvisit360.com",46.1550,15.0533),
 ("prebold","Prebold","obcina","https://prebold.webvisit360.com",46.2369,15.0925),
 ("sentilj","Šentilj","obcina","https://sentilj.webvisit360.com",46.6817,15.6481),
 ("kozje","Kozje","obcina","https://kozje-virtualtour.vercel.app",46.0733,15.5517),
 ("tabor","Tabor","obcina","https://obcina-tabor.webvisit360.com",46.2147,15.0167),
 ("polzela","Polzela","obcina","https://polzela.webvisit360.com",46.2806,15.0711),
 ("menges","Mengeš","obcina","https://menges.webvisit360.com",46.1669,14.5750),
 ("mozirje","Mozirje","obcina","https://mozirje.webvisit360.com",46.3394,14.9633),
 ("inotherm","Inotherm","business","https://inotherm.webvisit360.com",None,None),
 ("gszalec","GŠ Žalec","business","https://gszalec.webvisit360.com",46.2514,15.1650),
 ("grand-plaza","Grand Plaza Hotel Ljubljana","business","https://grandplazahotel.webvisit360.com",46.0583,14.5031),
]
UA={"User-Agent":"Mozilla/5.0"}
def fetch(url, n=None):
    req=urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.status, (r.read(n) if n else r.read())
def head_ok(url):
    try:
        req=urllib.request.Request(url, headers=UA, method="HEAD")
        with urllib.request.urlopen(req, timeout=20) as r: return r.status==200
    except Exception: return False
def one(t):
    slug,name,kind,url,lat,lng=t
    res={"slug":slug,"name":name,"kind":kind,"url":url,"lat":lat,"lng":lng}
    try:
        _,html=fetch(url+"/index.htm"); html=html.decode("utf-8","replace")
    except Exception:
        try: _,html=fetch(url+"/"); html=html.decode("utf-8","replace")
        except Exception as e: res["error"]=str(e); return res
    res["title"]=(re.search(r"<title>(.*?)</title>",html) or [None,None])[1]
    pid=re.search(r"media/(panorama_[0-9A-F_]+?)_0/",html)
    loc=re.search(r'href="(locale/[^"?]+)',html)
    labels=[]
    if loc:
        try:
            _,txt=fetch(url+"/"+loc.group(1)); txt=txt.decode("utf-8","replace")
            labels=re.findall(r"^panorama_[0-9A-F_]+\.label = (.+)$",txt,re.M)
            res["links"]=sorted(set(re.findall(r"\.source = (https?://\S+)",txt)))[:10]
        except Exception: pass
    res["scenes"]=len(labels); res["sceneLabels"]=labels[:80]
    if pid:
        p=pid.group(1); res["startPano"]=p
        for suf in ("_hd_t.jpg","_t.jpg","_t.webp"):
            if head_ok(f"{url}/media/{p}{suf}"): res["cover"]=f"{url}/media/{p}{suf}"; break
    return res
with cf.ThreadPoolExecutor(8) as ex: out=list(ex.map(one,TOURS))
json.dump(out,open(sys.argv[1],"w"),ensure_ascii=False,indent=1)
for r in out: print(r["slug"], r.get("title"), r.get("scenes"), r.get("cover","NO COVER")[-40:], r.get("error",""))
