"""Rewind geo.json rings to the d3-geo convention used by globe.gl:
exterior rings clockwise, holes counter-clockwise (in lng/lat).
geoBoundaries ships RFC 7946 (counter-clockwise) rings, which d3 reads as
"the whole sphere minus this polygon".  Usage: python3 rewind.py geo.json [...]"""
import json, sys

def signed_area(ring):
    return sum(ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1] for i in range(len(ring) - 1)) / 2

def fix_polygon(rings):
    out = []
    for i, r in enumerate(rings):
        want_cw = i == 0
        is_cw = signed_area(r) < 0
        out.append(r if is_cw == want_cw else r[::-1])
    return out

for path in sys.argv[1:]:
    g = json.load(open(path))
    for f in g["features"]:
        geom = f["geometry"]
        if geom["type"] == "Polygon":
            geom["coordinates"] = fix_polygon(geom["coordinates"])
        elif geom["type"] == "MultiPolygon":
            geom["coordinates"] = [fix_polygon(p) for p in geom["coordinates"]]
    json.dump(g, open(path, "w"), ensure_ascii=False, separators=(",", ":"))
    print("rewound", path)
