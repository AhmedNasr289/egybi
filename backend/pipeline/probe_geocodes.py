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
# Round 1 (2026-08-07) settled 6th of October City and eliminated thirteen
# candidates for Downtown Cairo. Re-asking Nominatim questions whose answers
# are already recorded is pointless load on a free service, so this list is now
# trimmed to what is still genuinely unknown, plus the confirmed winner as a
# regression check. Round 1's full results live in the vault note.
CANDIDATES = {
    # SOLVED in round 1: the Arabic name is the only one that resolves, to
    # W1103595802, boundary/administrative, 552 km². Kept as a regression check
    # because the whole district depends on this one string.
    "6th of October City (solved — confirming)": ["مدينة السادس من أكتوبر"],
    # Round 1 eliminated: Abdeen / Qasr an-Nil / Qasr El Nil / Kasr El Nil /
    # Azbakeya / Ezbekeya / Bab al-Louq / Downtown Cairo / Wust El Balad, and
    # the Arabic قسم عابدين, قسم قصر النيل, قسم الأزبكية, وسط البلد. Every one
    # returned a landmark polygon, no polygon, or nothing. The remaining
    # name-based guesses worth a try are the qism spellings Nominatim is most
    # likely to hold in transliteration.
    "Downtown Cairo (still unresolved)": [
        "Abdin, Cairo, Egypt",
        "Abdeen District, Cairo, Egypt",
        "Qasr El Nil District, Cairo, Egypt",
        "El Azbakeya, Cairo, Egypt",
        "Boulaq, Cairo, Egypt",
        "Garden City, Cairo, Egypt",
    ],
    # A working district, kept so the output always shows what a GOOD answer
    # looks like in the same run rather than from memory.
    "Nasr City (control)": ["Nasr City, Cairo, Egypt"],
}


# Bounding box over khedivial Cairo — Tahrir, Abdeen, Bab al-Louq, Azbakeya,
# Ramses — as (left, bottom, right, top) in lat-lon degrees. Deliberately tight:
# the question is what administrative polygons OSM holds over DOWNTOWN, and a
# wider box would bury the answer in every district of the governorate.
DOWNTOWN_BBOX = (31.22, 30.02, 31.27, 30.07)


def list_admin_boundaries(ox) -> None:
    """Ask Overpass directly what administrative boundaries exist downtown.

    Geocoding by name failed for Downtown Cairo in a specific and informative
    way: every candidate that returned a polygon at all returned a LANDMARK —
    Abdeen Courthouse, Qasr el Nil Theatre, Azbakeya Garden, a vegetable
    market. That pattern suggests OSM may hold no administrative polygon for
    these districts under any name, but "suggests" is not "confirms", and the
    difference decides whether the fix is a better query string or a change to
    which districts the page covers.

    So stop guessing names and ask the database what it actually contains.
    """
    print("\nAdministrative boundaries over downtown Cairo (Overpass, by tag)")
    print(f"  bbox {DOWNTOWN_BBOX} (left, bottom, right, top)\n", flush=True)
    try:
        gdf = ox.features_from_bbox(DOWNTOWN_BBOX, tags={"boundary": "administrative"})
    except Exception as e:  # noqa: BLE001
        print(f"  query failed: {type(e).__name__}: {e}", flush=True)
        return

    polys = gdf[gdf.geometry.geom_type.isin(["Polygon", "MultiPolygon"])]
    print(f"  {len(gdf)} features, {len(polys)} of them polygons\n", flush=True)
    if polys.empty:
        print("  No administrative polygons here at all — that is the answer.", flush=True)
        return

    try:
        areas = polys.to_crs(polys.estimate_utm_crs()).area / 1e6
    except Exception:  # noqa: BLE001
        areas = None

    for i, (idx, row) in enumerate(polys.iterrows()):
        area_s = f"{areas.iloc[i]:>8,.2f} km²" if areas is not None else "area n/a"
        lvl = row.get("admin_level", "?")
        # name:en matters as much as name — an English label is what makes a
        # boundary findable by the English queries the pipeline tries first.
        print(f"    {area_s}  admin_level={lvl:<4} {idx}", flush=True)
        print(f"        name   : {row.get('name', '—')}", flush=True)
        print(f"        name:en: {row.get('name:en', '—')}", flush=True)


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

    list_admin_boundaries(ox)

    print("\nProbe complete. Nothing was written or committed.", flush=True)


if __name__ == "__main__":
    sys.exit(main())
