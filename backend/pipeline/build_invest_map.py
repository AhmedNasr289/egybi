#!/usr/bin/env python3
"""
Place the knowledge base's investment rows on a map — only where they can
honestly be placed.

WHAT THIS IS FOR. The KB carries 40-odd sourced rows across five tables:
megaprojects, renewable_projects, green_hydrogen_deals, logistics_projects and
investment_deals. Every one has a source URL and a published figure. None has a
coordinate. This joins them to geography using only data already committed —
the OSM gazetteer in `site/data/geo-places.json` and the governorate outlines
in `egy_adm1_simplified.geojson` — and writes `site/data/invest-projects.json`.

WHY THE MATCHING IS SO NARROW. The first version matched any gazetteer name
appearing anywhere in a project's text. It resolved 22 of 40 rows and several
were wrong in a way that a map makes invisible:

    Gabal El Zeit Wind        location "Gulf of Suez"   -> Suez     (250 km off)
    Red Sea (RSWE) Wind Farm  location "Gulf of Suez"   -> Suez
    Benban Solar Park         location "Aswan"          -> Aswan city

The first two matched the word "Suez" inside the name of a body of water. The
third is subtler and worse: "Aswan" in that row means the GOVERNORATE, and
Benban is about 40 km from Aswan city. A pin is a claim about a point, and all
three would have been a confident pin in the wrong place with a real citation
attached to it.

So there are exactly three ways a row gets located, and nothing else counts:

  1. `governorate`           — the whole location string equals a governorate
     name. Placed at that governorate's centroid and labelled as a
     governorate, never as a site. This is what "Aswan" honestly means.
  2. `location field exact`  — the whole location string equals a gazetteer
     place name. "Ain Sokhna" is Ain Sokhna.
  3. `name is a place`       — the project's whole name equals a gazetteer
     place name, and it has no location field. Only the New Administrative
     Capital qualifies: the project IS the place.

THE RULE THAT WAS TRIED AND REMOVED. Between those and the substring matching
above sat a middle option that seemed obviously safe: match when the project
NAME BEGINS with a place name, on the reasoning that a project named after the
town it stands in is naming its own location. It resolved eleven rows. Five of
them were wrong:

    Suez Canal Economic Zone      -> Suez city     (the zone is 455 km2 of coast)
    Suez Wind (ACWA/Hassan Allam) -> Suez city     (location field: Gulf of Suez)
    Aswan High Dam                -> Aswan city    (the dam is 13 km south)
    Abydos 1 Solar (AMEA Power)   -> Abydos        (the plant is at Kom Ombo,
                                                    300 km from the temple)

Projects are named after canals, gulfs, dams and mythology at least as often as
after the town they stand in, and nothing in the string says which. The Abydos
row is the one to remember: a solar plant pinned on top of an archaeological
site 300 km away, with a working citation attached. Six correct pins were not
worth five wrong ones, so the rule is gone rather than patched — every patch
would have been a new list of words to distrust.

THE ALIAS TABLE THAT WAS INVESTIGATED AND NOT BUILT (2026-08-10). Eight rows
are unresolved, and the obvious next move is to ask whether the gazetteer holds
those places under a different spelling. It does, for two of them:

    location 'Kom Ombo'    -> gazetteer has "Kawm Ombo" and "Koum Ombo City",
                              both settlements, both computed into Aswan
    location 'Ras Ghareb'  -> gazetteer has "Gharib Cape" in Red Sea
                              ("Ras" is Arabic for cape, so this is a
                              translation, not just a transliteration)

The other six cannot be placed by any spelling, and that is the more useful
half of the finding: 'Gulf of Suez' (three rows) is a body of water touching
Suez, Red Sea and South Sinai; 'SCZONE' and 'SCZONE + North Coast' span several
governorates by definition; 'West Bakr' and 'Gabal El Zeit' are absent from
OSM's place=city|town set entirely. No alias reaches them.

So an alias table buys one row confidently and a second by translating a word,
out of forty. Set against that: it is the same shape as the two rules already
removed from this file for putting projects in the wrong place, and it is worse
in one specific way — a rule is a rule you can reason about, while a list of
hand-written equivalences is a place where a future guess looks exactly like a
verified fact. The Abydos row is the warning: it was WRONG about a location
that also had a plausible-looking string match.

Written down rather than acted on, so the next person spends the ten minutes on
something else. If this is revisited, the constraint that makes it safe is that
an alias may resolve to GOVERNORATE only, never to a site: a wrong governorate
ring is a coarse answer, a wrong pin is a false one.

Everything else is published as unresolved, with the location text that could
not be matched, so the gap is visible on the page instead of being quietly
absent from the map. A row with no location field at all — the IMF facilities,
the national 2030 capacity targets — is marked `national`: those are not
places and no amount of matching would make them into places.

Each record carries the rule that placed it and the text it matched, so any
pin on the page can be traced back to the exact string that put it there.

FRA. This emits locations, published figures, statuses and source URLs. It
computes no return, no projection and no ranking, and `status` travels with
every figure so a stated 2030 target can never be read as an achievement.

Run:  python backend/pipeline/build_invest_map.py
"""
import json
import os
import re
import sqlite3
import sys
import unicodedata
from datetime import date, datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.join(HERE, "..", "..")
DB = os.path.join(REPO, "backend", "test", "egybi_test.sqlite")
PLACES = os.path.join(REPO, "site", "data", "geo-places.json")
# Written by fetch_geo_layers.build_industry(), which needs Overpass and so
# only runs in Actions. Absent locally, and absent is not an error: the join
# reports how many rows it could place with and without it.
INDUSTRY = os.path.join(REPO, "site", "data", "geo-industry.json")
BOUNDS = os.path.join(REPO, "egy_adm1_simplified.geojson")
OUT = os.path.join(REPO, "site", "data", "invest-projects.json")

# geoBoundaries shapeName -> KB governorates.name: the table shared with
# build_egypt_map.py, kept once in governorates.py. (It was copied here
# "by duplication rather than by import" until 2026-11-06.)
from governorates import ALIASES  # noqa: E402


def norm(s):
    """Casefold, strip the Arabic definite article, and flatten punctuation.

    Deliberately does NOT strip words like "city" or "port": "Port Said" would
    become "Said" and match nothing, and "New Damietta" must stay distinct from
    "Damietta" because they are two different towns.
    """
    s = unicodedata.normalize("NFKD", s or "").lower().replace("-", " ")
    s = re.sub(r"^(el|al)\s+", "", s)
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def ring_centroid(ring):
    """Area-weighted centroid of a closed ring (the shoelace formula)."""
    a = cx = cy = 0.0
    for i in range(len(ring) - 1):
        x0, y0 = ring[i]
        x1, y1 = ring[i + 1]
        cross = x0 * y1 - x1 * y0
        a += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    if a == 0:
        return None
    return cx / (3 * a), cy / (3 * a)


def point_in_ring(x, y, ring):
    inside = False
    n = len(ring)
    for i in range(n - 1):
        x0, y0 = ring[i]
        x1, y1 = ring[i + 1]
        if (y0 > y) != (y1 > y):
            xh = (x1 - x0) * (y - y0) / (y1 - y0) + x0
            if x < xh:
                inside = not inside
    return inside


def load_governorate_points():
    """Centroid per governorate, from the largest ring of each feature.

    A centroid can fall outside a concave shape, and Egypt has several long
    coastal governorates where that is a real risk. Any that lands outside its
    own polygon is reported rather than silently shipped, because a
    governorate marker sitting in the neighbouring governorate is exactly the
    kind of error a map makes look deliberate.
    """
    with open(BOUNDS, "r", encoding="utf-8") as f:
        geo = json.load(f)
    out, outside = {}, []
    for feat in geo["features"]:
        raw = feat["properties"].get("shapeName", "")
        name = raw.replace(" Governorate", "").replace(" Governate", "").strip()
        name = ALIASES.get(name, name)
        g = feat["geometry"]
        rings = ([g["coordinates"][0]] if g["type"] == "Polygon"
                 else [p[0] for p in g["coordinates"]])
        biggest = max(rings, key=lambda r: abs(sum(
            r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]
            for i in range(len(r) - 1))))
        c = ring_centroid(biggest)
        if not c:
            continue
        if not point_in_ring(c[0], c[1], biggest):
            outside.append(name)
        out[norm(name)] = {"name": name, "lon": round(c[0], 5), "lat": round(c[1], 5)}
    return out, outside


def load_places():
    with open(PLACES, "r", encoding="utf-8") as f:
        data = json.load(f)
    idx = {}
    for p in data["places"]:
        # First wins: the gazetteer is sorted by (kind, name), so a settlement
        # beats an airport of the same name, which is the right precedence for
        # "where is this project".
        idx.setdefault(norm(p["name"]), p)
    return idx, data.get("as_of", "")


def load_industry():
    """Power plants, ports and industrial zones, if the layer has been built.

    Returns ({} , "") when the file is absent so a local run degrades to the
    gazetteer-only join instead of failing. The count that got placed is
    printed either way, which is what makes the difference visible.
    """
    if not os.path.exists(INDUSTRY):
        return {}, ""
    with open(INDUSTRY, "r", encoding="utf-8") as f:
        data = json.load(f)
    idx = {}
    for s in data.get("sites", []):
        idx.setdefault(norm(s["name"]), s)
    return idx, data.get("as_of", "")


def locate(name, location, places, govs, industry):
    """Return (resolution, rule, matched_text, lat, lon). See the module note.

    GOVERNORATE IS TESTED BEFORE PLACE, and that order is the whole point. Ten
    of Egypt's governorates share a name with their capital city, so "Aswan" in
    a location field matches both. Testing places first put Benban Solar Park —
    whose location field says "Aswan", meaning the governorate — on a pin in
    Aswan city, about 40 km from the solar park. Resolving the tie towards the
    governorate gives a coarser answer that is true, instead of a precise one
    that is wrong; a marker labelled "governorate" cannot mislead, a pin can.
    """
    # The strongest join available, so it is tried first: the project's whole
    # name equals the name of a power plant, port or industrial zone in OSM.
    # That is not two strings sharing a word — it is the same physical object
    # described twice, once by the knowledge base and once by OSM, which is why
    # this is allowed to beat even an explicit location field. "Benban Solar
    # Park" the KB row and "Benban Solar Park" the OSM `power=plant` are the
    # same solar park, and OSM knows where it is.
    name_n = norm(name)
    if name_n in industry:
        s = industry[name_n]
        return ("site", "name matches an OpenStreetMap %s exactly" % s["kind"].replace("_", " "),
                s["name"], s["lat"], s["lon"])

    # A location field often qualifies a locality with a zone or a region:
    # "Ain Sokhna, SCZONE", "Zafarana, Red Sea". The FIRST fragment is the
    # specific one, so it is the only fragment tried. Trying them all would
    # mean picking whichever happened to match, which is guesswork about which
    # part of the string the source meant.
    first = (location or "").split(",")[0]
    for candidate in (location, first):
        loc_n = norm(candidate)
        if not loc_n:
            continue
        if loc_n in govs:
            g = govs[loc_n]
            return "governorate", "location field is a governorate", g["name"], g["lat"], g["lon"]
        if loc_n in places:
            p = places[loc_n]
            return "site", "location field exact", p["name"], p["lat"], p["lon"]
    loc_n = norm(location)

    # The project's whole name IS a place. Not a prefix, not a substring —
    # equality. "New Administrative Capital" is the only row that qualifies,
    # and it qualifies because the project and the place are the same thing.
    if not loc_n and name_n in places:
        p = places[name_n]
        return "site", "project name is a gazetteer place", p["name"], p["lat"], p["lon"]

    if loc_n:
        return "unresolved", "location text matched no place or governorate", location, None, None
    return "national", "no location field — not a place", "", None, None


def main():
    if not os.path.exists(DB):
        sys.exit("Missing %s — build it with backend/test/build_test_db.py first." % DB)
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    places, places_as_of = load_places()
    industry, industry_as_of = load_industry()
    govs, outside = load_governorate_points()
    if not industry:
        print("NOTE: %s is absent, so no project can be matched to a power plant "
              "or port. It is built by fetch_geo_layers.py, which needs Overpass."
              % os.path.relpath(INDUSTRY))
    if outside:
        print("NOTE: centroid fell outside its own polygon for: %s" % ", ".join(outside))

    # (table, category label, figure column, figure unit, figure label)
    SPECS = [
        ("megaprojects", "category", "cost_usd_bn", "US$bn", "Announced cost"),
        ("renewable_projects", "type", "capacity_mw", "MW", "Capacity"),
        ("green_hydrogen_deals", None, None, None, None),
        ("logistics_projects", None, None, None, None),
        ("investment_deals", "category", "value_usd_bn", "US$bn", "Deal value"),
    ]

    rows = []
    for table, cat_col, fig_col, unit, fig_label in SPECS:
        cols = {r[1] for r in conn.execute("PRAGMA table_info(%s)" % table)}
        for r in conn.execute("SELECT * FROM %s" % table):
            d = dict(r)
            location = d.get("location") or ""
            resolution, rule, matched, lat, lon = locate(
                d["name"], location, places, govs, industry)
            rec = {
                "name": d["name"],
                "table": table,
                "category": (d.get(cat_col) or "") if cat_col else (d.get("product") or d.get("detail") or ""),
                "status": d.get("status") or "",
                "location_text": location,
                "resolution": resolution,
                "match_rule": rule,
                "matched": matched,
                "source_url": d.get("source_url") or "",
            }
            if lat is not None:
                rec["lat"], rec["lon"] = lat, lon
            if fig_col and fig_col in cols and d.get(fig_col) is not None:
                rec["figure"] = d[fig_col]
                rec["figure_unit"] = unit
                rec["figure_label"] = fig_label
            # logistics_projects keeps its headline number as free text
            # ("108.7 Mt cargo (FY2025/26)"), so it travels as a string with no
            # unit rather than being parsed into a number this script would
            # then be asserting.
            if table == "logistics_projects" and d.get("value"):
                rec["figure_text"] = d["value"]
                rec["figure_label"] = "Published figure"
            for extra in ("year", "start_year", "completion_year", "partner", "counterparty", "note"):
                if d.get(extra):
                    rec[extra] = d[extra]
            rows.append(rec)

    by_res = {}
    for r in rows:
        by_res[r["resolution"]] = by_res.get(r["resolution"], 0) + 1

    unresolved = sorted(
        {(r["name"], r["location_text"]) for r in rows if r["resolution"] == "unresolved"})

    out = {
        # THE DAY THIS JOIN RAN, and nothing more. No row in the knowledge
        # base carries a date of its own, so there is no better date to give —
        # but this one re-stamps itself on every rebuild whether or not a
        # figure changed, which is exactly how the page came to tell readers
        # the investment data was refreshed today when it was not. The page
        # labels it as a rebuild date for that reason; do not relabel it as a
        # data date without first giving the rows real dates to draw on.
        "as_of": date.today().isoformat(),
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "generated_by": "backend/pipeline/build_invest_map.py",
        "source": ("EgyBI knowledge base tables megaprojects, renewable_projects, "
                   "green_hydrogen_deals, logistics_projects and investment_deals. "
                   "Every row carries its own source URL."),
        "geography_source": ("Placed against the OpenStreetMap gazetteer "
                             "(site/data/geo-places.json, as of %s) and geoBoundaries "
                             "EGY ADM1 governorate outlines, CC BY 4.0." % places_as_of),
        "industry_layer_as_of": industry_as_of,
        "counts": by_res,
        "placement_note": ("A project is put on the map only when its own location field "
                           "names a place or a governorate exactly, or when its name begins "
                           "with a place name. Nothing is placed by matching a word found "
                           "somewhere inside a longer phrase: that rule put a wind farm on "
                           "the Gulf of Suez 250 km away in the city of Suez. Markers at "
                           "governorate resolution are shown as governorates, not as sites."),
        "compliance_note": ("Information and education only. This is not investment advice. "
                            "Figures are as published by the source cited on each row, and "
                            "each row's status says whether a number is operational, under "
                            "construction, or a stated target."),
        "unresolved": [{"name": n, "location_text": t} for n, t in unresolved],
        "projects": sorted(rows, key=lambda r: (r["resolution"], r["table"], r["name"])),
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    payload = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(payload)

    print("Wrote %s (%d bytes, %d projects)"
          % (os.path.relpath(OUT), len(payload.encode("utf-8")), len(rows)))
    for k in sorted(by_res):
        print("  %-12s %d" % (k, by_res[k]))
    if unresolved:
        print("  unresolved rows (published on the page, not hidden):")
        for n, t in unresolved:
            print("    %-42s location=%r" % (n[:42], t))


if __name__ == "__main__":
    main()
