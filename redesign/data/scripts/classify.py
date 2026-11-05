"""Draft a visitor-facing type for every place in tours.json, for review by the owner.

Input:  tours.json
Output: locations-by-type.csv (one row per place: type, name, town, source, why)

Google places are typed from their Google Maps category, everything else from its
name. Rules are checked in order and the first match wins, so the more specific
types (wineries before food, stays before shops) come first.
Fix a wrong row with an entry in OVERRIDES (item id -> type).
"""
import csv
import json
import re
from collections import Counter
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent

TYPES = {
    "obcina": ("Občine", "Municipalities"),
    "nastanitve": ("Nastanitve", "Places to stay"),
    "vino": ("Vinarne in pivovarne", "Wineries & breweries"),
    "gostinstvo": ("Gostinstvo", "Food & drink"),
    "zdravje": ("Zdravje in lepota", "Health & beauty"),
    "znamenitosti": ("Znamenitosti in narava", "Sights & nature"),
    "sport": ("Šport in prosti čas", "Sport & leisure"),
    "kraji": ("Kraji in panorame", "Towns & aerial views"),
    "nepremicnine": ("Nepremičnine", "Real estate"),
    "trgovine": ("Trgovine in saloni", "Shops & showrooms"),
    "podjetja": ("Podjetja in storitve", "Companies & services"),
    "javno": ("Javne ustanove", "Public institutions"),
    "drugo": ("Drugo", "Other"),
}

RULES = [
    # \b matters here: "zgodovinskega" and "trgovinski" both contain "vinsk".
    ("vino", r"\bvinsk|vinote|\bvinar|winery|wines|\bvin[oa]?\b|pivovarn|brewery"),
    ("nastanitve", r"hotel|apartm|hostel|kamp|camp|glamping|koča|koca|resort|terme|zdravilišč|nastanit|počitniš|"
                   r"prenočišč|na kmetiji|na podeželju|vila |chalet|holiday inn|weekend house|avtodom|"
                   r"postajališče za avtodome|parkirišče za avtodome|nesting"),
    ("gostinstvo", r"restavr|restaurant|gostiln|gostišč|\bbar\b|bistro|kavarn|cafe|café|pica|pizz|pekarn|okrepč|"
                   r"hitra hrana|hrana|kuhinja|sladoled|jogurt|hamburger|zrezki|morski sadeži|pivnica|lokal|"
                   r"gostinsk|kitajsk|azijsk|italijanšč|bližnjevzhod|eklektič|žlica|muzikafe|živa glasba"),
    ("zdravje", r"optik|okulist|očes|oftalm|klinik|zobozdrav|dent|zdravni|kirur|medicin|medico|iatros|veterin|"
                r"frizer|lepot|kozmeti|beauty|wellness|brivnic|tattoo|laborator|obrazno zdravje|missha|lasulj|"
                r"salon lepa"),
    # Shops before sport and sights, so "Športna trgovina" is a shop, not a sports venue.
    ("trgovine", r"trgovin|prodaj|salon|outlet|supermarket|nakupoval|drogerij|cvetličar|avtohiš|avtocenter|"
                 r"avtomobili|avto\b|classic cars|store|shop|razstavni|galerija parketa|natuzzi|lorex|vrtni center|"
                 r"cigar|urar|kea|orodje|hyundai|mesnica"),
    # Sport before sights, so "Športni park" and "Rolkarski park" are sport.
    ("sport", r"šport|sport|golf|bazen|kopališ|plezan|bolder|bovling|telovadnic|fitnes|stadion|nogomet|smučar|"
              r"paintball|igrišč|rolkar|bike park|rekreac|plesni|igralnic|ribnik|ribišk|ribolov|lovsko|akvarij|"
              r"kondicij|osebni trener|coaching|sup store|letališč"),
    ("znamenitosti", r"cerkev|kapela|župnij|samostan|muzej|grad\b|grad |znamenitost|spomenik|\bpark\b|jezero|jama|"
                     r"rezervat|razgled|most\b|arboretum|umetnostna galerija|kulturni center|turistično inform|"
                     r"pohodništ|pokopališ|dvorec|stolp|nasad|kulturn|rojstna hiša|mlin\b"),
    ("nepremicnine", r"\bposest\b|parcela|^stanovanje$|vikend|luxury house|obsešen"),
    ("podjetja", r"proizv|podjetj|avtopralnic|bencinsk|pisarn|gradben|dobavitelj|veleprodaj|storitv|servis|mizarstv|kamnoseš|pogodbenik|"
                 r"izvajalec|uvozno|popravilo|vgradnja|razrez|d\.o\.o|d\.d\.|international|industrij|fanuc|inotherm|"
                 r"internorm|halder|geberit|movia|alpcom|benton|grapak|etis|kosectim|saniker|uniforest|ok led|"
                 r"strle|svetila|dveri|vrata|agroteh|kmetijsk|gozdarsk|prevozn|čistilna|tiskalnik"),
    ("javno", r"^gš |šola|šol\b|občinski urad|izobraž|dom upokojencev|pomoč na domu|kc avelana"),
]

# Non-Google tours that are panoramas of a whole place.
TOWN_PANORAMAS = {"Braslovče", "Trbovlje-Kolonija Njiva"}

# Corrections where the Google category misleads: exact place name -> type key.
# The owner's corrections from reviewing locations-by-type.csv go here too.
OVERRIDES: dict[str, str] = {
    "RESTAVRACIJA MESNINČEK TRNOVLJE- Celjske mesnine d.o.o.": "gostinstvo",
    "Avtohiša Strašek": "trgovine",
    "Brod na Muri - Murfähre (Sladki Vrh)": "znamenitosti",
}


def classify(item: dict) -> tuple[str, str]:
    if item["name"] in OVERRIDES:
        return OVERRIDES[item["name"]], "override"
    if item["kind"] == "obcina":
        return "obcina", "3DVista občina tour"
    # Google places with no category and no street address ("3260 Kozje") are panoramas
    # of a village or area.
    if item["source"] == "google" and not item.get("category") and re.fullmatch(r"(\d{4} .*)?", item.get("address") or ""):
        return "kraji", "Google panorama of a place (no category, no street address)"
    if item["name"] in TOWN_PANORAMAS:
        return "kraji", "town panorama"
    for field in ("category", "name"):
        text = (item.get(field) or "").lower()
        if not text:
            continue
        for key, pattern in RULES:
            m = re.search(pattern, text)
            if m:
                return key, f'{field} "{item.get(field)}" ~ {m.group(0).strip()}'
    return "drugo", f'no rule matched (category: {item.get("category")})'


def main() -> None:
    items = json.loads((DATA / "tours.json").read_text())["items"]
    rows = []
    for it in items:
        key, why = classify(it)
        rows.append({
            "type": key,
            "type_sl": TYPES[key][0],
            "name": it["name"],
            "town": it.get("place") or "",
            "source": it["source"],
            "google_category": it.get("category") or "",
            "id": it["id"],
            "why": why,
        })
    order = list(TYPES)
    rows.sort(key=lambda r: (order.index(r["type"]), r["town"].lower(), r["name"].lower()))
    with open(DATA / "locations-by-type.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    counts = Counter(r["type"] for r in rows)
    for key in order:
        print(f"{counts[key]:4d}  {TYPES[key][0]}")
    print(f"{len(rows):4d}  total")


if __name__ == "__main__":
    main()
