#!/usr/bin/env python3
"""Probe Nominatim for district boundary candidates. READ-ONLY — writes nothing.

WHY THIS EXISTS
---------------
Run 3 of refresh-streets dropped Downtown Cairo and 6th of October City because
none of their candidate queries resolved to a plausible polygon. Finding
replacements by editing fetch_streets.py and re-running the real pipeline costs
~20 minutes and a full Cairo street-graph download per guess, which is both slow
and rude to a free shared API.

This probe does only the geocoding — seconds, no Overpass graph downloads — and
prints what Nominatim actually returns for each candidate, so the replacement
queries are chosen from evidence instead of from guessing.

WHAT THE FAILURE MODES MEAN (confirmed against the osmnx 2.1.1 source)
----------------------------------------------------------------------
`geocode_to_gdf(q)` with the default `which_result=None` asks Nominatim for up
to 50 results and returns the first whose geometry is a (Multi)Polygon.

  * TypeError                 none of the 50 results is a polygon. Tuning
                              `which_result` cannot help — the polygon isn't
                              there. Only a different query string will do.
  * InsufficientResponseError Nominatim knows the string not at all.
  * a tiny area               a polygon WAS found, but the wrong one. This is
                              the dangerous case, because it fails silently
                              without the area check: 'Abdeen, Cairo, Egypt'
                              returns ~0.0 km², which is Abdeen Palace, a
                              building — not the Abdeen qism.

Reading the output: prefer a result whose area is in the tens of km² for a
district, whose `class`/`type` is boundary/administrative rather than building
or leisure, and whose display_name names the district rather than a landmark
inside it.

Run via the "Probe district geocodes" workflow. Nothing here is committed.
"""

from __future__ import annotations

import sys

# Generous candidate lists: English, Arabic, and the qism (administrative
# district) names, since Egyptian district naming in OSM is inconsistent about
# all three. Ordering here does not matter — the probe tries every one and
# reports, rather than stopping at the first hit like the real pipeline does.
CANDIDATES = {
    "Downtown Cairo": [
        "Abdeen, Cairo, Egypt",
        "Qasr an-Nil, Cairo, Egypt",
        "Qasr El Nil, Cairo, Egypt",
        "Kasr El Nil, Cairo, Egypt",
        "Azbakeya, Cairo, Egypt",
        "Ezbekeya, Cairo, Egypt",
        "Bab al-Louq, Cairo, Egypt",
        "Downtown Cairo, Egypt",
        "Wust El Balad, Cairo, Egypt",
        "قسم عابدين",
        "قسم قصر النيل",
        "قسم الأزبكية",
        "وسط البلد، القاهرة",
    ],
    "6th of October City": [
        "6th of October City, Giza, Egypt",
        "6th of October City, Egypt",
        "6 October City, Egypt",
        "Sixth of October City, Egypt",
        "6th of October, Giza Governorate, Egypt",
        "October City, Giza, Egypt",
        "مدينة السادس من أكتوبر",
        "مدينة 6 أكتوبر",
        "السادس من أكتوبر، الجيزة",
        "قسم أول السادس من أكتوبر",
        "قسم ثان السادس من أكتوبر",
    ],
    # The four that already work, re-probed so a future regression is visible
    # and so the successful results show what a GOOD answer looks like here.
    "Heliopolis (control)": ["Heliopolis, Cairo, Egypt"],
    "Maadi (control)": ["Maadi, Cairo, Egypt", "El Maadi, Cairo, Egypt"],
    "Nasr City (control)": ["Nasr City, Cairo, Egypt"],
    "New Cairo (control)": ["New Cairo, Cairo, Egypt"],
}


def main() -> None:
    import osmnx as ox

    ox.settings.log_console = False
    ox.settings.use_cache = True
    ox.settings.requests_timeout = 180
    print(f"OSMnx {ox.__version__} — geocode probe, writes nothing\n", flush=True)

    for district, queries in CANDIDATES.items():
        print(f"{district}", flush=True)
        for q in queries:
            try:
                gdf = ox.geocode_to_gdf(q)
            except Exception as e:  # noqa: BLE001 — reporting is the whole point
                reason = {
                    "TypeError": "no polygon in Nominatim's top 50 results",
                    "InsufficientResponseError": "Nominatim returned 0 results",
                }.get(type(e).__name__, str(e)[:80])
                print(f"    ✗  {q!r}: {type(e).__name__} — {reason}", flush=True)
                continue

            row = gdf.iloc[0]
            try:
                area = float(gdf.to_crs(gdf.estimate_utm_crs()).area.iloc[0]) / 1e6
                area_s = f"{area:>9,.2f} km²"
            except Exception as e:  # noqa: BLE001
                area_s = f"area failed ({type(e).__name__})"

            # class/type and the OSM id are what distinguish a real
            # administrative boundary from a palace that shares its name.
            cls = row.get("class", "?")
            typ = row.get("type", "?")
            osm = f"{str(row.get('osm_type', '?'))[:1].upper()}{row.get('osm_id', '?')}"
            print(f"    ✓  {q!r}: {area_s}  [{cls}/{typ}, {osm}]", flush=True)
            print(f"           {str(row.get('display_name', ''))[:150]}", flush=True)
        print(flush=True)

    print("Probe complete. Nothing was written or committed.", flush=True)


if __name__ == "__main__":
    sys.exit(main())
