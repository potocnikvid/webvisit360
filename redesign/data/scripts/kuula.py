import sys, json, re, base64, urllib.request, concurrent.futures as cf
ids = open(sys.argv[1]).read().split()
def get(cid):
    req = urllib.request.Request(f"https://kuula.co/post/n1/collection/{cid}", headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")
    raw = re.search(r'KUULA_COLLECTION=\{id:"[^"]*",data:"([A-Za-z0-9+/=]+)"', html).group(1)
    d = json.loads(base64.b64decode(raw))
    posts = d.get("posts", [])
    return {
        "id": cid, "name": d.get("name"), "description": d.get("description"),
        "created": d.get("created"), "scenes": len(posts),
        "views": sum(int(p.get("views") or 0) for p in posts),
        "cover": f"https://files.kuula.io/{posts[0]['uuid']}/01-cover.jpg" if posts else None,
        "url": f"https://kuula.co/share/collection/{cid}",
        "sceneNames": [p.get("description") for p in posts][:40],
    }
out = []
with cf.ThreadPoolExecutor(8) as ex:
    futs = {ex.submit(get, i): i for i in ids}
    for f in cf.as_completed(futs):
        try: out.append(f.result())
        except Exception as e: print("ERR", futs[f], e, file=sys.stderr)
order = {c: i for i, c in enumerate(ids)}
out.sort(key=lambda x: order[x["id"]])
json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
print(len(out), "collections;", sum(x["scenes"] for x in out), "scenes;", sum(x["views"] for x in out), "views")
