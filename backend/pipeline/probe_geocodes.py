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
    # Round 2 eliminated six more: Abdin (no polygon), Abdeen District and
    # Qasr El Nil District (no results at all), El Azbakeya (the Central Bank
    # building), Boulaq (a hospital), Garden City (a real neighbourhood, but
    # 0.36 km² — under the 1 km² floor). Nineteen candidates are now ruled out,
    # so round 3 stops guessing names entirely and relies on the tag listings
    # below to say what actually exists.
    "Nasr City (control)": ["Nasr City, Cairo, Egypt"],
}


# Bounding box over khedivial Cairo — Tahrir, Abdeen, Bab al-Louq, Azbakeya,
# Ramses — as (left, bottom, right, top) in lat-lon degrees. Deliberately tight:
# the question is what administrative polygons OSM holds over DOWNTOWN, and a
# wider box would bury the answer in every district of the governorate.
DOWNTOWN_BBOX = (31.22, 30.02, 31.27, 30.07)


def list_polygons(ox, tags: dict, label: str) -> None:
    """Ask Overpass directly what polygons of a given tag family exist downtown.

    Geocoding by name failed for Downtown Cairo in a specific and informative
    way: every candidate that returned a polygon at all returned a LANDMARK —
    Abdeen Courthouse, Qasr el Nil Theatre, Azbakeya Garden, a vegetable
    market. That pattern suggests OSM may hold no administrative polygon for
    these districts under any name, but "suggests" is not "confirms", and the
    difference decides whether the fix is a better query string or a change to
    which districts the page covers.

    So stop guessing names and ask the database what it actually contains.

    Round 2 asked only for `boundary=administrative` and found nothing at qism
    scale — the hierarchy jumps from Cairo governorate (3,006 km²) straight to
    unlabelled neighbourhood ways. That was NOT enough to conclude OSM has no
    Downtown polygon, because none of the four districts that already work is
    an administrative boundary either: Heliopolis is place/quarter, Maadi is
    place/neighbourhood, Nasr City is place/city. The pipeline never needed an
    admin boundary, only a plausible polygon. Checking one tagging scheme and
    declaring the answer would have been an overclaim.
    """
    print(f"\n{label} over downtown Cairo (Overpass, by tag)")
    print(f"  bbox {DOWNTOWN_BBOX} (left, bottom, right, top)\n", flush=True)
    try:
        gdf = ox.features_from_bbox(DOWNTOWN_BBOX, tags=tags)
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

    # Only the district-scale band is interesting. Below ~1 km² is a block or a
    # building; above ~900 km² is a governorate. Both are already rejected by
    # the pipeline's area check, and printing them buries the useful rows.
    shown = 0
    for i, (idx, row) in enumerate(polys.iterrows()):
        area = areas.iloc[i] if areas is not None else None
        if area is not None and not (0.5 <= area <= 900):
            continue
        shown += 1
        area_s = f"{area:>8,.2f} km²" if area is not None else "area n/a"
        lvl = row.get("admin_level", "—")
        place = row.get("place", "—")
        # name:en matters as much as name — an English label is what makes a
        # polygon findable by the English queries the pipeline tries first.
        print(f"    {area_s}  place={place:<14} admin_level={lvl:<5} {idx}", flush=True)
        print(f"        name   : {row.get('name', '—')}", flush=True)
        print(f"        name:en: {row.get('name:en', '—')}", flush=True)
    if not shown:
        print("    Nothing in the 0.5–900 km² district band.", flush=True)


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

    # place=* FIRST, because that is where the four working districts live —
    # Heliopolis is place/quarter, Maadi place/neighbourhood, Nasr City
    # place/city. If Downtown has a usable polygon at all, this is where it is.
    list_polygons(ox, {"place": ["quarter", "suburb", "neighbourhood",
                                 "city_district", "borough", "district"]},
                  "place=* polygons")
    list_polygons(ox, {"boundary": "administrative"}, "Administrative boundaries")

    print("\nProbe complete. Nothing was written or committed.", flush=True)


if __name__ == "__main__":
    sys.exit(main())
