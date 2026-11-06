#!/usr/bin/env python3
"""
Build the bundled Egypt-governorate map asset for the Explore-page choropleth.

Takes the geoBoundaries EGY ADM1 GeoJSON (CC-BY 4.0) + the KB `governorates`
table, joins them by name, bakes population/area/density into each feature's
properties, rounds coordinates to shrink the file, and writes a self-contained
JS asset: `site/assets/egypt-geo.js` -> window.EGYBI_EGYPT_GEO.

Bundling as JS (not a fetched .geojson) keeps the map fully offline and immune
to same-origin/CSP restrictions on the static Hostinger deploy — no runtime
external calls, no fetch. Source boundaries: geoBoundaries.org (CC-BY 4.0).

Run:  python backend/pipeline/build_egypt_map.py
"""
import json
import os
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def _force_utf8_output() -> None:
    """Make stdout/stderr safe for non-ASCII on every platform.

    A Windows console defaults to a legacy code page that cannot encode many
    characters this pipeline handles, so a plain print() can kill an otherwise
    successful run with UnicodeEncodeError. UTF-8 writes correct bytes wherever
    the terminal supports it; errors="replace" degrades to '?' on a genuinely
    legacy console instead of taking the job down. File output is unaffected —
    writers specify their own encoding.
    """
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError, OSError):
            pass          # Python < 3.7, or a stream that cannot be reconfigured


_force_utf8_output()


HERE = os.path.dirname(os.path.abspath(__file__))
# The SIMPLIFIED boundary file, not the raw download.
#
# geoBoundaries ADM1 ships 6,773 coordinate pairs for 27 governorates. Rounding
# to 4 decimal places (~11 m) had already been done and saved nothing in point
# COUNT — the file still carried every vertex, and one screen pixel at
# governorate zoom is about 2 km, so most of them could never be seen.
#
# Simplified with mapshaper, which is an offline tool: its output is committed
# and it is never a build or runtime dependency.
#
#   npx mapshaper egy_raw.geojson -simplify 15% keep-shapes -clean \
#       -o precision=0.0001 egy_adm1_simplified.geojson
#
# 15%, not the 8% the Map & Data Visualisation Toolkit recommends. That figure
# was written for a country-scale choropleth; these maps now zoom to level 18,
# and rendered at Delta zoom 8% turns the coastline into straight segments and
# the Damietta promontory into a triangle. 15% keeps the character and still
# drops 5,377 of the 6,773 pairs. Compared side by side before choosing —
# the byte count alone would have picked 8%.
#
# keep-shapes preserves every polygon, so no small island is simplified out of
# existence, and -clean keeps shared borders topologically identical so
# neighbouring governorates cannot develop gaps between them.
RAW = os.path.join(HERE, "..", "..", "egy_adm1_simplified.geojson")
DB = os.path.join(HERE, "..", "test", "egybi_test.sqlite")
OUT = os.path.join(HERE, "..", "..", "site", "assets", "egypt-geo.js")
PRECISION = 4  # decimal places (~11 m) — plenty for a national choropleth

# The geoBoundaries -> knowledge-base alias table is shared with
# build_invest_map.py from governorates.py (one copy, not two).
from governorates import kb_name as clean_name  # noqa: E402


def round_coords(obj):
    if isinstance(obj, list):
        # a coordinate pair is [lon, lat]; recurse otherwise
        if len(obj) == 2 and all(isinstance(x, (int, float)) for x in obj):
            return [round(obj[0], PRECISION), round(obj[1], PRECISION)]
        return [round_coords(x) for x in obj]
    return obj


def main():
    with open(RAW, "r", encoding="utf-8") as f:
        geo = json.load(f)

    conn = sqlite3.connect(DB)
    kb = {row[0]: row[1:] for row in
          conn.execute("SELECT name, population, area_km2, census_2017, urban_pct FROM governorates")}
    conn.close()

    unmatched = []
    out_features = []
    for feat in geo["features"]:
        raw_name = feat["properties"].get("shapeName", "")
        name = clean_name(raw_name)
        if name not in kb:
            unmatched.append(raw_name)
            continue
        pop, area, census_2017, urban_pct = kb[name]
        density = round(pop / area, 1) if area else None
        # population growth 2017 census -> 2023 KB figure (both CAPMAS resident basis)
        growth = round((pop - census_2017) / census_2017 * 100, 1) if census_2017 else None
        feat["properties"] = {
            "name": name,
            "population": pop,
            "area_km2": area,
            "density": density,
            "urban_pct": urban_pct,
            "growth": growth,
        }
        feat["geometry"]["coordinates"] = round_coords(feat["geometry"]["coordinates"])
        out_features.append(feat)

    if unmatched:
        print("UNMATCHED (fix ALIASES): " + ", ".join(unmatched))
        raise SystemExit(1)

    out = {"type": "FeatureCollection", "features": out_features}
    payload = json.dumps(out, separators=(",", ":"), ensure_ascii=False)
    js = (
        "/* Egypt governorate boundaries + KB data, bundled for offline use.\n"
        "   Boundaries: geoBoundaries.org EGY ADM1 (CC-BY 4.0), simplified.\n"
        "   Data: EgyBI knowledge base `governorates` table (CAPMAS-sourced).\n"
        "   Generated by backend/pipeline/build_egypt_map.py — do not hand-edit. */\n"
        "window.EGYBI_EGYPT_GEO = " + payload + ";\n"
    )
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(js)

    kb_bytes = len(js)
    print(f"Wrote {os.path.relpath(OUT)}  ({kb_bytes/1024:.1f} KB, {len(out_features)} governorates)")
    # quick data sanity
    dens = sorted(((f['properties']['name'], f['properties']['density']) for f in out_features),
                  key=lambda x: -x[1])
    print("Densest:", dens[:3], " Sparsest:", dens[-3:])


if __name__ == "__main__":
    main()
