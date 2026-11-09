#!/usr/bin/env python3
"""
EgyBI — Egyptian street-network report card + 15-minute access score.

Downloads the street network for a set of Egyptian districts chosen to span
distinct planning eras — six in Cairo, plus Luxor, 10th of Ramadan, Sheikh
Zayed and New Alamein — computes real network-geometry metrics, and emits the
JSON the /streets.html page reads.

WHY THESE METRICS. Street-network geometry is one of the few things about urban
form you can measure objectively from open data. Intersection density and the
share of dead-ends describe how connected a place is; orientation entropy
describes how grid-like it is; circuity describes how far you actually travel
versus the straight-line distance. Together they distinguish a khedivial grid
from a desert cul-de-sac subdivision *numerically*, rather than by assertion.

FIVE METHODOLOGICAL TRAPS, ALL HANDLED EXPLICITLY:

  1. Place-name boundaries. OSMnx resolves a district by geocoding a string,
     and Egyptian district names are inconsistent in OSM (English vs Arabic,
     "Nasr City" vs "Madinat Nasr", missing relations). Each district therefore
     carries SEVERAL candidate queries tried in order, and every resolved
     polygon is checked for plausible area AND for actually being in Egypt. A
     district that resolves to something absurd is dropped with a loud reason
     rather than silently poisoning the comparison.

     The country check is not belt-and-braces. The geocode probe returned a
     4.70 km² administrative boundary for 'شبرا' that sits in RIYADH, and a
     1.17 km² one for 'المنشية' in KAIROUAN, Tunisia. Both are inside the
     plausible-area band, so area alone would have accepted a Saudi district
     onto a page about Egypt. Arabic place names are shared across the Arab
     world, which makes this routine for an Arabic-first query strategy.

     What survives that gauntlet is a smaller list than the ambition. Of
     eighteen candidate districts probed, four resolved. Seven returned their
     GOVERNORATE rather than their city — Aswan came back as 57,962 km² — and
     one Arabic name returned a 108,500 km² polygon whose display name is
     LIBERIA. The dropped list is kept in DISTRICTS with the reason for each,
     because a district list showing only its successes misrepresents how
     complete OSM actually is.

  2. Projection. Circuity and any length-based metric are meaningless computed
     on unprojected lat/lon degrees. Every graph is projected to UTM before
     measurement.

  3. Normalisation. Districts differ enormously in size — 6th of October is
     orders of magnitude larger than Downtown. Raw counts are useless; every
     count metric is divided by the district's real projected area in km².

  4. Drive vs walk networks. They answer different questions. The report card
     uses the DRIVE network, because that is what street design produces. The
     access score uses the WALK network, because a 15-minute city is about
     walking. Mixing them would be a category error.

  5. OSM completeness. Everything here is community-mapped. Metrics describe
     *what OSM contains*, which is a good proxy for street geometry (roads are
     well mapped) and a much weaker one for amenities (hospitals and pharmacies
     are patchily mapped). The output labels these differently, and the page
     says so.

Layers fail INDEPENDENTLY, following the house guardrail pattern: a broken
layer keeps its last-good file and the run exits non-zero, while the workflow
still commits whatever did build.
"""
from __future__ import annotations

import json
import math
import os
import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Callable, Optional

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "site" / "data"

# --- districts, chosen to span Cairo's planning eras ------------------------
# Each entry: several candidate geocode queries (OSM naming for Egyptian
# districts is inconsistent), the era, and why the district earns its place.
DISTRICTS = [
    {
        "key": "downtown",
        "name": "Downtown Cairo",
        "name_ar": "وسط البلد",
        "era": "Khedivial, 1860s–1870s",
        "why": "Ismail's Paris-on-the-Nile: deliberate boulevards and midans laid over a dense grid. The oldest planned fabric in the comparison.",
        "queries": ["Abdeen, Cairo, Egypt", "Downtown Cairo, Egypt", "Wust El Balad, Cairo, Egypt"],
        # THE ONE HAND-DRAWN BOUNDARY ON THIS PAGE, and the reason is a finding
        # in its own right: OpenStreetMap has no polygon for Downtown Cairo.
        #
        # That was established by probe_geocodes.py, not assumed. Nineteen name
        # candidates were tried across English, Arabic and qism spellings; every
        # one that returned a polygon at all returned a LANDMARK inside downtown
        # rather than downtown itself — Abdeen Palace, Abdeen Courthouse, Qasr el
        # Nil Theatre, Azbakeya Garden, the Central Bank building, a vegetable
        # market, a hospital. Then both plausible tag families were queried
        # directly over a downtown bounding box: `place=*` returned 25
        # neighbourhood polygons (Zenhom, Bab El Wazir, Al Orman, Mohamed Mazhar
        # …), all of them the areas AROUND khedivial Cairo, and
        # `boundary=administrative` returned nothing between Cairo governorate
        # (3,006 km²) and unlabelled 0.5–5 km² ways. There is no Downtown to
        # fetch.
        #
        # So this extent is drawn by hand. TIGHTENED after run 4 measured it
        # (2026-08-07) — and the first attempt was wrong in a way the numbers
        # caught, which is the whole argument for measuring before publishing.
        #
        # The first extent ran east to Port Said Street and south to Sayyida
        # Zeinab. It returned 324 intersections/km², 45 m mean segments and a
        # 23.2% dead-end share — the signature of dense pre-modern fabric full
        # of alleys, not of a khedivial boulevard plan.
        #
        # Measuring the polygon showed 26.6% of it lay outside khedivial Cairo
        # — 12.4% east of Midan Ataba, where the old Fatimid city begins, and
        # 14.7% south of Bab al-Louq into Sayyida Zeinab. Those quarters carry
        # far more street-kilometres per km², so they dominated every per-km²
        # metric. The extent was measuring the old city and calling it khedivial.
        #
        # It now stops at the khedivial plan's own limits: the Nile west, Ramses
        # and 26th of July north, Midan Ataba east, Bab al-Louq and Falaki
        # south. 3.8 km². Smaller than any other district here, which is honest
        # — khedivial Cairo IS small; the previous figure was borrowed area.
        #
        # WHAT RUN 5 THEN MEASURED (2026-08-07), and where the above was wrong.
        # The tightening moved every metric substantially and in the predicted
        # direction: 324 → 223.4 intersections/km² (-31%), 23.2% → 17.2% dead
        # ends (-26%), 45.3 → 55.2 m mean segment (+22%), 2.68 → 2.86 streets
        # per junction. So the spill was real and it was large.
        #
        # It was NOT the whole story, and one supporting argument has to be
        # withdrawn. The original note ruled out boundary clipping by observing
        # that Heliopolis has a higher perimeter-to-area ratio (1.79 vs 1.40)
        # and far fewer dead ends. That comparison no longer holds: the tightened
        # polygon's ratio is 1.91, which is HIGHER than Heliopolis, so the
        # refutation as stated is invalid against the extent actually shipped.
        #
        # Clipping still does not look like the driver, but on weaker ground: a
        # 7% difference in perimeter-to-area cannot produce a 4x difference in
        # dead-end share (Downtown 17.2% against Heliopolis 4.2%), and across
        # all six districts the correlation between the two is only +0.37.
        #
        # What is left unexplained is that Downtown still has the highest
        # dead-end share on the page, nearly double Nasr City's 9.3%, inside a
        # plan built on through-boulevards. The untested hypothesis is service
        # alleys and courtyard entrances inside khedivial blocks, which OSM maps
        # as highway=service and the drive network therefore includes. That is
        # testable — group dead-end nodes by the highway tag of their incident
        # edge — and it is NOT asserted here until it has been.
        #
        # It is tried ONLY after every query above fails, so the day OSM gains a
        # real Downtown polygon this is silently superseded. Every district
        # carries `boundary_source` in the output and the page prints it, because
        # a hand-drawn extent that isn't labelled as one is just a fabrication
        # with good intentions.
        "polygon": [
            (31.2266, 30.0432),   # Nile at the Garden City / Qasr al-Nil approach
            (31.2272, 30.0570),   # Nile at 26th of July
            (31.2400, 30.0602),   # toward Ramses
            (31.2478, 30.0558),   # Midan Ataba — eastern limit of the khedivial plan
            (31.2482, 30.0452),   # Abdeen
            (31.2402, 30.0402),   # Bab al-Louq / Falaki
            (31.2312, 30.0408),   # back to the Nile at Garden City
        ],
    },
    {
        "key": "heliopolis",
        "name": "Heliopolis",
        "name_ar": "مصر الجديدة",
        "era": "Garden suburb, 1905–1910s",
        "why": "Baron Empain's tram-served desert suburb — radial avenues over a regular grid, built around public transit from day one.",
        "queries": ["Heliopolis, Cairo, Egypt", "Masr El Gedida, Cairo, Egypt", "El Nozha, Cairo, Egypt"],
    },
    {
        "key": "maadi",
        "name": "Maadi",
        "name_ar": "المعادي",
        "era": "Garden suburb, 1900s–1930s",
        "why": "Delta Land Company's low-density villa quarter: numbered streets on a grid, softened by diagonals and greenery.",
        "queries": ["Maadi, Cairo, Egypt", "El Maadi, Cairo, Egypt", "Maadi, Egypt"],
    },
    {
        "key": "nasr-city",
        "name": "Nasr City",
        "name_ar": "مدينة نصر",
        "era": "Nasserist expansion, 1958+",
        "why": "The state's post-revolution answer to Cairo's growth — wide arterials and superblocks, designed for the car era.",
        "queries": ["Nasr City, Cairo, Egypt", "Madinat Nasr, Cairo, Egypt", "Nasr City, Egypt"],
    },
    {
        "key": "6th-october",
        "name": "6th of October City",
        "name_ar": "مدينة السادس من أكتوبر",
        "era": "Desert new town, 1979+",
        "why": "First-generation satellite city, built to pull people off the Nile valley. Master-planned from nothing on open desert.",
        # The Arabic name is the ONLY one that works, confirmed by the geocode
        # probe: every English spelling returns TypeError (no polygon among
        # Nominatim's top 50) or a sports club. The Arabic name resolves to
        # W1103595802, boundary/administrative, 552 km² — comfortably inside
        # MAX_AREA_KM2. Both Arabic forms below return that same object; the
        # second is kept as a spelling fallback, and the English forms are kept
        # last so a future OSM improvement is picked up automatically.
        "queries": ["مدينة السادس من أكتوبر", "مدينة 6 أكتوبر",
                    "6th of October City, Giza, Egypt", "6th of October City, Egypt"],
    },
    # --- ADDED 2026-08-07, each one proved by the geocode probe -------------
    # Only these four of eighteen candidates resolved to a plausible Egyptian
    # polygon. What happened to the other fourteen is recorded below, because a
    # district list that shows only the successes hides how OSM actually is.
    {
        "key": "luxor",
        "name": "Luxor City",
        "name_ar": "الأقصر",
        "era": "Temple town, ancient core + modern grid",
        "why": "A working Egyptian city wrapped around a pharaonic temple complex — the only district here whose street plan has to negotiate 3,000-year-old stone.",
        # 'Luxor, Egypt' returns the GOVERNORATE at 4,286 km², and the Arabic
        # 'الأقصر' returns a 108,500 km² polygon whose display name is LIBERIA.
        # Only 'Luxor City' resolves to the city: 9.77 km², place/suburb.
        "queries": ["Luxor City, Egypt"],
    },
    {
        "key": "10th-ramadan",
        "name": "10th of Ramadan City",
        "name_ar": "مدينة العاشر من رمضان",
        "era": "Industrial new town, 1977+",
        "why": "Egypt's first satellite city, built around factories rather than housing — an industrial-first plan that predates the desert suburbs by two decades.",
        # 71.87 km², place/city. Both the Arabic and English forms resolve to
        # the same object, which is unusual enough here to be worth noting.
        "queries": ["مدينة العاشر من رمضان", "10th of Ramadan City, Egypt"],
    },
    {
        "key": "sheikh-zayed",
        "name": "Sheikh Zayed City",
        "name_ar": "مدينة الشيخ زايد",
        "era": "Desert new town, 1995+",
        "why": "The compound-and-arterial template that New Cairo and 6th of October scaled up, at a size where the pattern is still legible.",
        # 53.45 km², boundary/administrative — Arabic only; the English form
        # returns no polygon at all.
        "queries": ["مدينة الشيخ زايد"],
    },
    {
        "key": "new-alamein",
        "name": "New Alamein",
        "name_ar": "مدينة العلمين الجديدة",
        "era": "Coastal new city, 2018+",
        "why": "The newest fabric in the comparison and the only one on the Mediterranean — a city still being built, which is itself visible in the network.",
        # 17.63 km², landuse/residential. Not an administrative boundary, which
        # is stated here rather than glossed: it is the built extent as OSM
        # records it. 'New Alamein, Egypt' returns a 0.04 km² construction site.
        "queries": ["العلمين الجديدة"],
    },
    # DROPPED, with the reason, rather than quietly omitted:
    #   Zamalek, New Administrative Capital, El Gamaliya, Historic Cairo —
    #     no polygon in OSM under any candidate tried.
    #   Giza (38,239 km²), Alexandria (4,195), Port Said (2,493), Ismailia
    #     (4,553), Suez (10,360), Aswan (57,962), Luxor governorate (4,286) —
    #     every one resolves to the GOVERNORATE, not the city. Rejected by the
    #     area check.
    #   Shubra — 'شبرا' returns an administrative boundary in RIYADH; the
    #     English form returns a bus station.
    #   Alexandria Mansheya — 'المنشية' is in KAIROUAN, Tunisia; the local one
    #     is 0.26 km², under the floor.
    #   Alexandria Smouha — returns a field hockey pitch.
    #   Al-Darb Al-Ahmar (medieval Cairo) — 0.05 km², far under the floor. The
    #     era stays missing, and that is better than measuring a city block and
    #     calling it Islamic Cairo.
    #
    # A hand-drawn extent was NOT created for any of these. That was justified
    # for Downtown because OSM demonstrably has no polygon AND it is the
    # reference the whole comparison is built against. Neither holds here.
    {
        "key": "new-cairo",
        "name": "New Cairo",
        "name_ar": "القاهرة الجديدة",
        "era": "Desert new town, 1990s–2000s",
        "why": "The Fifth Settlement era: compound-led, low-connectivity suburban form — the sharpest contrast with the khedivial grid.",
        "queries": ["New Cairo, Cairo, Egypt", "New Cairo City, Egypt", "Fifth Settlement, New Cairo, Egypt"],
    },
]

# Guardrail floors. A real Cairo district's drive network has thousands of
# edges; anything under these means the geocode grabbed the wrong polygon or
# Overpass returned a truncated response.
MIN_NODES = 150
MIN_EDGES = 300
MIN_AREA_KM2 = 1.0        # a district smaller than this is not a district
MAX_AREA_KM2 = 900.0      # 6th of October is genuinely huge; beyond this is a governorate

# Egypt's bounding box, (min_lon, min_lat, max_lon, max_lat), generous at the
# edges. Used to reject a geocode that is the right SIZE but the wrong COUNTRY.
# This is not a hypothetical: the geocode probe returned a 4.70 km²
# administrative boundary for 'شبرا' that is in Riyadh, and a 1.17 km² one for
# 'المنشية' that is in Kairouan, Tunisia. Both pass the area check. Arabic place
# names are shared right across the Arab world, so this is a routine failure
# mode for an Arabic-first query strategy, not an exotic one.
EGYPT_BBOX = (24.5, 21.5, 37.5, 32.0)
MIN_DISTRICTS_OK = 4      # fewer than this and the comparison isn't worth publishing

ORIENTATION_BINS = 36     # 10° bins, the OSMnx convention

# Amenities for the access layer. Deliberately limited to categories OSM maps
# with some consistency in Egypt.
AMENITIES = {"hospital": "hospital", "clinic": "clinic", "school": "school", "pharmacy": "pharmacy"}
WALK_SPEED_M_PER_MIN = 80.0   # ~4.8 km/h, the standard planning walking speed
ACCESS_THRESHOLD_MIN = 15.0


# ------------------------------------------------------------- run budget
# THE 2026-10-05 RUN. The quarterly refresh built the whole report card, then
# Overpass stopped accepting connections. Every walk-graph download after the
# first district failed with ConnectTimeout, and each one waited out
# requests_timeout (300 s) three times plus back-off: about 16 minutes per
# district. The job hit its 120-minute limit in the middle of the eighth
# district and GitHub cancelled it.
#
# A cancellation loses everything: the commit step runs only when the job was
# not cancelled, so the report card that HAD been written was discarded, and
# the failure alert (if: failure()) does not fire on a cancellation either. The
# street pages stayed on 2026-08-07 data for three months and nobody was told.
#
# Two guards, so the script always ends in its own exit path well inside the
# job's limit and the commit and alert steps run:
#   * RunBudget - no district STARTS after the budget is spent. The default
#     (80 min) leaves room for one worst-case district (~32 min: 3 walk-graph
#     and 3 amenity attempts at 300 s each) plus setup, inside 120 minutes.
#   * Breaker   - after two districts in a row could not CONNECT at all, the
#     endpoint is down, not busy; the rest are recorded as not attempted
#     rather than each costing another 16 minutes to learn the same thing.
BUDGET_MIN = float(os.environ.get("STREETS_BUDGET_MIN", "80"))


class RunBudget:
    """Wall-clock budget for one run, checked before each district starts."""

    def __init__(self, minutes: float, clock: Callable[[], float] = time.monotonic) -> None:
        self.minutes = minutes
        self._clock = clock
        self._start = clock()

    def spent_min(self) -> float:
        return (self._clock() - self._start) / 60.0

    def exhausted(self) -> bool:
        return self.spent_min() >= self.minutes


class Breaker:
    """Opens after `limit` consecutive districts failed to connect at all.

    Only connection failures count. A read timeout means the endpoint answered
    and was slow (the big districts are slow), and any success resets the
    streak, so a busy endpoint never trips this; an unreachable one does."""

    CONNECT_ERRORS = frozenset({"ConnectTimeout", "ConnectionError", "ConnectTimeoutError",
                                "NewConnectionError", "MaxRetryError"})

    def __init__(self, limit: int = 2) -> None:
        self.limit = limit
        self.streak = 0

    def record(self, error_name: Optional[str]) -> None:
        """Record one district's outcome: None for success, else the exception name."""
        self.streak = self.streak + 1 if error_name in self.CONNECT_ERRORS else 0

    @property
    def open(self) -> bool:
        return self.streak >= self.limit


def stop_reason(budget: Optional[RunBudget], breaker: Optional[Breaker]) -> Optional[str]:
    """Why the next district must not start, or None if it may."""
    if budget is not None and budget.exhausted():
        return f"time budget of {budget.minutes:.0f} min spent ({budget.spent_min():.0f} min elapsed)"
    if breaker is not None and breaker.open:
        return (f"endpoint unreachable ({breaker.streak} districts in a row failed to connect); "
                "last-good data kept")
    return None


def log(msg: str) -> None:
    print(msg, flush=True)


def resolve_boundary(ox, d: dict):
    """Try each candidate query until one geocodes to a plausible polygon.

    Returns (gdf, query, area_km2, source) or (None, None, None, None), where
    source is "OSM" for a geocoded boundary and "hand-drawn" for the one
    district that has no OSM polygon at all. The area check is the real
    defence: a wrong geocode usually resolves to something far too small (a
    single POI) or far too large (a whole governorate), and both would silently
    corrupt every per-km2 metric downstream. It applies to the hand-drawn
    polygon too — nothing here gets to bypass the guardrail for being ours.
    """
    for q in d["queries"]:
        # Two failures wear the same clothes here and mean opposite things.
        # InsufficientResponseError means Nominatim does not know the string and
        # TypeError means it knows it but has no polygon — both are real ANSWERS,
        # and the right move is to try the next candidate immediately. A network
        # error is not an answer, and treating it as one can drop a district as
        # "no candidate resolved", which reads as a fact about OSM rather than
        # about the connection. Those get retried.
        gdf, answered = None, False
        for attempt in range(3):
            try:
                gdf = ox.geocode_to_gdf(q)
                answered = True
                break
            except Exception as e:  # noqa: BLE001
                name = type(e).__name__
                if name in ("InsufficientResponseError", "TypeError", "ValueError"):
                    log(f"    geocode miss  {q!r}: {name}")
                    answered = True          # a real answer: nothing there
                    break
                if attempt < 2:
                    time.sleep(10 * (attempt + 1))
                else:
                    log(f"    geocode UNANSWERED {q!r} after 3 attempts: {name}")
        if gdf is None:
            if not answered:
                # Distinguish it in the log so a run dropped by a flaky network
                # is not mistaken for one dropped by missing OSM data.
                log("    (network, not OSM — this candidate was never answered)")
            continue
        try:
            area_km2 = float(gdf.to_crs(gdf.estimate_utm_crs()).area.iloc[0]) / 1e6
        except Exception as e:  # noqa: BLE001
            log(f"    area failed   {q!r}: {e}")
            continue
        if not (MIN_AREA_KM2 <= area_km2 <= MAX_AREA_KM2):
            log(f"    implausible   {q!r}: {area_km2:,.1f} km² outside [{MIN_AREA_KM2}, {MAX_AREA_KM2}]")
            continue
        # IS IT EVEN IN EGYPT? The area check alone is not enough, and the
        # geocode probe proved it: 'شبرا' returns a 4.70 km² administrative
        # boundary in RIYADH, and 'المنشية' a 1.17 km² one in KAIROUAN,
        # TUNISIA. Both sit comfortably inside the plausible-area band, so both
        # would have been accepted and silently added to a page about Cairo.
        # Arabic place names are widely shared across the Arab world, which
        # makes this failure mode routine rather than exotic.
        c = gdf.geometry.iloc[0].centroid
        if not (EGYPT_BBOX[0] <= c.x <= EGYPT_BBOX[2] and EGYPT_BBOX[1] <= c.y <= EGYPT_BBOX[3]):
            where = str(gdf.iloc[0].get("display_name", ""))[-60:]
            log(f"    NOT IN EGYPT  {q!r}: centroid {c.y:.3f},{c.x:.3f} — {where}")
            continue
        log(f"    resolved      {q!r} → {area_km2:,.1f} km²")
        return gdf, q, area_km2, "OSM"

    # Only now, after every OSM query has failed, fall back to a hand-drawn
    # extent if this district declares one. Ordering matters: the day OSM gains
    # a real polygon for the district, the loop above wins and this is silently
    # superseded without anyone editing the pipeline.
    coords = d.get("polygon")
    if not coords:
        return None, None, None, None
    try:
        import geopandas as gpd
        from shapely.geometry import Polygon
        gdf = gpd.GeoDataFrame(geometry=[Polygon(coords)], crs="EPSG:4326")
        area_km2 = float(gdf.to_crs(gdf.estimate_utm_crs()).area.iloc[0]) / 1e6
    except Exception as e:  # noqa: BLE001
        log(f"    hand-drawn polygon failed: {type(e).__name__}: {e}")
        return None, None, None, None
    # The same area sanity-check the geocodes get. If a bad edit ever makes this
    # polygon absurd, it must fail exactly as loudly as a bad geocode does.
    if not (MIN_AREA_KM2 <= area_km2 <= MAX_AREA_KM2):
        log(f"    hand-drawn    implausible: {area_km2:,.1f} km² outside "
            f"[{MIN_AREA_KM2}, {MAX_AREA_KM2}]")
        return None, None, None, None
    log(f"    HAND-DRAWN    no OSM polygon exists → using declared extent, {area_km2:,.1f} km²")
    return gdf, "hand-drawn extent (no OSM boundary exists)", area_km2, "hand-drawn"


def bearing_graph(ox, G):
    """Undirected copy annotated with edge bearings, on UNPROJECTED coordinates.

    Bearings are compass directions, so they must be computed from lat/lon, not
    from projected metres. Both the histogram and OSMnx's own entropy function
    need this same graph: in OSMnx 2.x `orientation_entropy` does NOT add
    bearings itself and raises KeyError('bearing') if handed a bare graph.
    """
    return ox.bearing.add_edge_bearings(ox.convert.to_undirected(G))


def orientation_histogram(Gb, bins: int = ORIENTATION_BINS) -> list[float]:
    """Share of street length in each compass bin, as a fraction summing to 1.

    This is what the page draws as a polar rose. A perfect grid puts almost all
    of its length in four opposing bins; organic fabric spreads across all of
    them. Expects a graph already carrying bearings (see bearing_graph).
    """
    counts = [0.0] * bins
    width = 360.0 / bins
    for _, _, data in Gb.edges(data=True):
        b = data.get("bearing")
        if b is None or (isinstance(b, float) and math.isnan(b)):
            continue
        w = float(data.get("length", 0.0)) or 0.0
        # fold to [0,360) and weight by length so long avenues count more
        counts[int((b % 360.0) // width)] += w
    total = sum(counts)
    return [round(c / total, 5) for c in counts] if total > 0 else counts


def build_report_card(ox, resolved: dict, skipped: list,
                      budget: Optional[RunBudget] = None, breaker: Optional[Breaker] = None) -> bool:
    """Builds the report card and RECORDS each resolved boundary in `resolved`,
    so the access layer can reuse it instead of geocoding every district a
    second time. Nominatim and Overpass are free shared infrastructure; asking
    them the same question twice per run is rude and slower.

    The return value means only "the file was written". Any district that was
    dropped is appended to `skipped`, which main() turns into a non-zero exit —
    see the note there for why a partial build must not be reported as green."""
    log("Street-network report card (OSMnx drive networks)…")
    rows, boundaries, failures = [], {"type": "FeatureCollection", "features": []}, []

    for d in DISTRICTS:
        log(f"  {d['name']}")
        stop = stop_reason(budget, breaker)
        if stop:
            failures.append(f"{d['name']}: not attempted, {stop}")
            log(f"    not attempted {stop}")
            continue
        gdf, query, area_km2, boundary_source = resolve_boundary(ox, d)
        if gdf is None:
            failures.append(f"{d['name']}: no candidate query resolved to a plausible boundary")
            continue
        # Same retry as the walk graph below, for the same reason: a transient
        # timeout here drops the district from the report card entirely, after
        # its boundary has already been resolved. The guardrails exist to catch
        # bad DATA; a network blip is not data and should not be recorded as a
        # district we could not measure.
        G, why = None, None
        for attempt in range(3):
            try:
                G = ox.graph_from_polygon(gdf.geometry.iloc[0], network_type="drive", simplify=True)
                why = None
                break
            except Exception as e:  # noqa: BLE001
                why = type(e).__name__
                if attempt < 2:
                    log(f"    graph attempt {attempt + 1} failed ({why}); retrying")
                    time.sleep(20 * (attempt + 1))
        if breaker is not None:
            breaker.record(why if G is None else None)
        if G is None:
            failures.append(f"{d['name']}: graph download failed after 3 attempts ({why})")
            log(f"    graph failed  {why}")
            continue

        n, m = G.number_of_nodes(), G.number_of_edges()
        if n < MIN_NODES or m < MIN_EDGES:
            failures.append(f"{d['name']}: thin graph ({n} nodes, {m} edges)")
            log(f"    thin graph    {n} nodes / {m} edges — skipping")
            continue

        # TRAP 2: project before measuring anything length-based.
        Gp = ox.projection.project_graph(G)
        stats = ox.stats.basic_stats(Gp, area=area_km2 * 1e6)

        # dead-end share: nodes of degree 1 on the undirected graph
        Gu = ox.convert.to_undirected(Gp)
        deg = dict(Gu.degree())
        dead_ends = sum(1 for v in deg.values() if v == 1)
        intersections = sum(1 for v in deg.values() if v >= 3)

        # Bearings once, reused for both the histogram and the entropy.
        Gb = bearing_graph(ox, G)
        try:
            entropy = float(ox.bearing.orientation_entropy(Gb, num_bins=ORIENTATION_BINS))
        except Exception as e:  # noqa: BLE001
            log(f"    entropy failed: {e}")
            entropy = None

        rows.append({
            "key": d["key"], "name": d["name"], "name_ar": d["name_ar"],
            "era": d["era"], "why": d["why"], "query": query,
            # The page prints this. A hand-drawn extent that isn't labelled as
            # one is just a fabrication with good intentions.
            "boundary_source": boundary_source,
            "area_km2": round(area_km2, 2),
            "nodes": n, "edges": m,
            # TRAP 3: everything countable is normalised per km².
            "intersection_density_km2": round(intersections / area_km2, 1),
            "dead_end_share_pct": round(100.0 * dead_ends / max(len(deg), 1), 1),
            "street_density_km_km2": round((stats.get("street_length_total", 0.0) / 1000.0) / area_km2, 2),
            "mean_street_length_m": round(float(stats.get("street_length_avg", 0.0)), 1),
            "streets_per_node_avg": round(float(stats.get("streets_per_node_avg", 0.0)), 2),
            "circuity_avg": round(float(stats.get("circuity_avg", 0.0)), 4),
            "orientation_entropy": round(entropy, 4) if entropy is not None else None,
            "orientation_bins": orientation_histogram(Gb),
        })
        log(f"    ok            {intersections} intersections, "
            f"{rows[-1]['intersection_density_km2']}/km², "
            f"{rows[-1]['dead_end_share_pct']}% dead ends, H={rows[-1]['orientation_entropy']}")

        resolved[d["key"]] = (gdf, area_km2)
        geom = json.loads(gdf.to_json())["features"][0]
        geom["properties"] = {"key": d["key"], "name": d["name"], "era": d["era"],
                              "boundary_source": boundary_source}
        boundaries["features"].append(geom)

    if len(rows) < MIN_DISTRICTS_OK:
        log(f"  SKIP report card: only {len(rows)} districts resolved (<{MIN_DISTRICTS_OK}). "
            f"Reasons: {'; '.join(failures) or 'none recorded'}")
        return False

    out = {
        "as_of": date.today().isoformat(),
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "OpenStreetMap street network via OSMnx",
        "license": "ODbL — © OpenStreetMap contributors",
        "method": ("Drive networks per district, projected to UTM before measurement. Counts are "
                   "normalised by the district's projected area. Orientation bins are share of "
                   "street length per 10° compass sector."),
        "caveat": ("Street geometry is among the best-mapped data in OSM, but these figures describe "
                   "what OSM contains rather than an official cadastre, and district boundaries are "
                   "OSM's, not an administrative gazetteer's — mostly mapper-drawn place polygons "
                   "rather than official limits. Downtown Cairo is the exception: OpenStreetMap has "
                   "no polygon for it at all, under any name or tag, so its extent is drawn by hand "
                   "from the district's known edges (the Nile, Ramses, Port Said Street, Sayyida "
                   "Zeinab). Every district carries boundary_source saying which it is. Because "
                   "per-km² figures depend on where the line falls, Downtown's density numbers are "
                   "the ones most sensitive to that choice."),
        "districts": rows,
        "skipped": failures,
    }
    (OUT / "streets-districts.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    # A GeoJSON FeatureCollection has nowhere to say when it was fetched, so
    # these are foreign members — RFC 7946 allows them and every consumer,
    # Leaflet included, ignores what it does not recognise. Without them the
    # boundaries are the one published layer here with no date on it, which is
    # not a standard this project gets to keep for geometry only.
    boundaries["as_of"] = date.today().isoformat()
    boundaries["source"] = ("OpenStreetMap via Nominatim, except Downtown Cairo, "
                            "whose extent is drawn by hand from its known edges "
                            "and marked boundary_source: hand-drawn")
    (OUT / "streets-boundaries.json").write_text(
        json.dumps(boundaries, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    log(f"  wrote streets-districts.json ({len(rows)} districts) + streets-boundaries.json")
    if failures:
        log(f"  note: {len(failures)} district(s) skipped — {'; '.join(failures)}")
    skipped.extend(f"report-card / {f}" for f in failures)
    return True


def carry_forward(fresh: list[dict], prev: Optional[dict], today: str) -> list[dict]:
    """The access rows to publish: this run's measurements, plus the last-good
    row of any district this run could not measure, in DISTRICTS order.

    Until 2026-11-09 a run that measured at least MIN_DISTRICTS_OK districts
    wrote ONLY those, so a partial run deleted good data. The 9 November run
    measured 5 of 10 (Overpass refused the other walk graphs) and the live
    page lost Nasr City, Luxor City, Sheikh Zayed City, New Alamein and New
    Cairo, while the log said "last-good data kept" - true of the file-level
    guard, false of the districts.

    Every row says when it was measured ("measured_on"); a carried row also
    says so ("carried": True), so the page can tell a reader the two dates
    apart. A district with no previous row is simply absent, as before.
    """
    by_key = {r["key"]: r for r in fresh}
    prev_rows = {r["key"]: r for r in (prev or {}).get("districts", [])}
    prev_as_of = (prev or {}).get("as_of")
    out = []
    for d in DISTRICTS:
        k = d["key"]
        if k in by_key:
            row = dict(by_key[k])
            row["measured_on"] = today
            row.pop("carried", None)
            out.append(row)
        elif k in prev_rows:
            row = dict(prev_rows[k])
            row["measured_on"] = row.get("measured_on") or prev_as_of
            row["carried"] = True
            out.append(row)
    return out


def build_access(ox, resolved: dict, skipped: list,
                 budget: Optional[RunBudget] = None, breaker: Optional[Breaker] = None) -> bool:
    """15-minute access: walking time from street nodes to the nearest amenity.

    Uses the WALK network (trap 4) and reports the SHARE of network nodes within
    a 15-minute walk, which is a fairer summary than a mean that one remote
    node can drag around.
    """
    import networkx as nx

    log("15-minute access score (OSMnx walk networks + OSM amenities)…")
    rows, failures = [], []

    for d in DISTRICTS:
        log(f"  {d['name']}")
        stop = stop_reason(budget, breaker)
        if stop:
            failures.append(f"{d['name']}: not attempted, {stop}")
            log(f"    not attempted {stop}")
            continue
        cached = resolved.get(d["key"])
        if cached is None:
            failures.append(f"{d['name']}: no boundary from the report-card pass")
            continue
        poly = cached[0].geometry.iloc[0]

        # RETRY THE WALK GRAPH. It had no retry at all, and one ConnectTimeout
        # was enough to lose a district that the report-card pass had already
        # measured successfully minutes earlier. New Cairo was dropped this way
        # in run 4 and again in run 6 — the same district, the same transient
        # error, twice — while its drive network downloaded fine both times.
        #
        # Losing a district to a network blip is not a finding about the
        # district, and it is the difference between the access layer being
        # complete and the run going red. The backoff is longer than the
        # amenity one because these are the biggest downloads in the pipeline
        # and a timeout usually means the endpoint is busy rather than broken.
        W, why = None, None
        for attempt in range(3):
            try:
                W = ox.projection.project_graph(
                    ox.graph_from_polygon(poly, network_type="walk", simplify=True))
                why = None
                break
            except Exception as e:  # noqa: BLE001
                why = type(e).__name__
                if attempt < 2:
                    log(f"    walk graph attempt {attempt + 1} failed ({why}); retrying")
                    time.sleep(20 * (attempt + 1))
        if breaker is not None:
            breaker.record(why if W is None else None)
        if W is None:
            failures.append(f"{d['name']}: walk graph failed after 3 attempts ({why})")
            continue
        if W.number_of_nodes() < MIN_NODES:
            failures.append(f"{d['name']}: thin walk graph ({W.number_of_nodes()} nodes)")
            continue

        per_amenity, counts, unanswered = {}, {}, []

        # ONE Overpass request per district, not one per amenity type.
        #
        # This used to loop the four categories and query each separately: 4
        # requests per district, 24 per run, on a free public endpoint that is
        # also serving the walk-graph downloads. Run 5's log is what that costs.
        # Heliopolis came back {hospital: 0, clinic: 12, school: 0, pharmacy: 0}
        # and Nasr City {hospital: 26, clinic: 0, school: 0, pharmacy: 0} — two
        # of the best-mapped districts in Cairo reporting no schools and no
        # pharmacies. Those are not zeros, they are refusals; the endpoint was
        # shedding load and every failure was being recorded as a count of none.
        # Three districts produced nothing at all and the layer fell below its
        # floor, after 65 minutes.
        #
        # Overpass accepts a list of values as one regex-matched query, so the
        # four categories cost a single round trip and are split locally. Six
        # requests per run instead of twenty-four, which is both faster and far
        # less likely to be throttled — and it is the politer thing to do to a
        # free service whose usage policy asks for exactly this restraint.
        allf, failed = None, None
        for attempt in range(3):
            try:
                allf = ox.features.features_from_polygon(
                    poly, tags={"amenity": list(AMENITIES.values())})
                failed = None
                break
            except Exception as e:  # noqa: BLE001
                # osmnx raises InsufficientResponseError for a genuinely empty
                # result, so that one IS a real zero across all four categories.
                # Anything else is an unanswered question, never a number.
                if type(e).__name__ == "InsufficientResponseError":
                    allf, failed = None, None
                    break
                failed = type(e).__name__
                if attempt < 2:
                    time.sleep(10 * (attempt + 1))

        if failed:
            log(f"    amenity query unanswered after 3 attempts ({failed})")
            failures.append(f"{d['name']}: amenity query unanswered ({failed}) "
                            f"— no data, not zero access")
            continue

        col = None
        if allf is not None and len(allf) and "amenity" in allf.columns:
            col = allf["amenity"]

        for label, tag in AMENITIES.items():
            feats = None if col is None else allf[col == tag]
            if feats is None or len(feats) == 0:
                counts[label] = 0
                per_amenity[label] = None
                continue
            pts = feats.to_crs(W.graph["crs"]).geometry.centroid
            counts[label] = int(len(pts))
            try:
                targets = set(ox.distance.nearest_nodes(W, X=pts.x.values, Y=pts.y.values))
            except Exception as e:  # noqa: BLE001
                log(f"    nearest_nodes failed for {label}: {e}")
                per_amenity[label] = None
                continue
            # Multi-source shortest path: distance from every node to its
            # nearest amenity, in one pass rather than per-node Dijkstra.
            #
            # The virtual source is added to W IN PLACE and removed again,
            # rather than copying the graph. The copy was costing a full
            # duplicate of the walk network four times per district — once per
            # amenity type — and on a district the size of 6th of October that
            # is tens of megabytes of pointless allocation on a 7 GB runner.
            # remove_node drops the node and every edge incident to it, so W is
            # left byte-for-byte as it was for the next amenity. Results are
            # identical; only the memory and time are not.
            src = "__amenity__"
            W.add_node(src)
            for t in targets:
                W.add_edge(src, t, length=0.0)
            try:
                dist = nx.single_source_dijkstra_path_length(W, src, weight="length")
            finally:
                W.remove_node(src)      # restore W even if the search raises
            mins = [v / WALK_SPEED_M_PER_MIN for k, v in dist.items() if k != src]
            if not mins:
                per_amenity[label] = None
                continue
            mins.sort()
            within = sum(1 for v in mins if v <= ACCESS_THRESHOLD_MIN)
            per_amenity[label] = {
                "median_min": round(mins[len(mins) // 2], 1),
                "within_15min_pct": round(100.0 * within / len(mins), 1),
            }

        got = [v for v in per_amenity.values() if v]
        if not got:
            # Reaching here means the query ANSWERED and the answer was empty —
            # a failed query already returned above with a named failure. So
            # this is a real finding about OSM coverage rather than a broken
            # run, and dropping the district silently would hide exactly the
            # sparseness the layer exists to show. It is published with a null
            # mean and a flag, never as zero access.
            rows.append({
                "key": d["key"], "name": d["name"],
                "walk_nodes": W.number_of_nodes(),
                "amenity_counts": counts,
                "access": per_amenity,
                "unanswered": unanswered,
                "mean_within_15min_pct": None,
                "no_amenities_mapped": True,
            })
            log(f"    ok (empty)    {counts} → nothing of these four kinds is "
                f"mapped inside this boundary; published as a coverage finding")
            continue
        rows.append({
            "key": d["key"], "name": d["name"],
            "walk_nodes": W.number_of_nodes(),
            "amenity_counts": counts,
            "access": per_amenity,
            # Which categories we never got an answer for. The mean below is an
            # average over the categories that ANSWERED, so a reader has to be
            # able to see when that is fewer than four — otherwise two runs print
            # the same-looking number over different denominators.
            "unanswered": unanswered,
            "mean_within_15min_pct": round(sum(v["within_15min_pct"] for v in got) / len(got), 1),
        })
        log(f"    ok            {counts} → mean {rows[-1]['mean_within_15min_pct']}% "
            f"within 15 min (over {len(got)}/{len(AMENITIES)} categories"
            + (f", unanswered: {', '.join(unanswered)}" if unanswered else "") + ")")

    if len(rows) < MIN_DISTRICTS_OK:
        # PRINT WHY, not just how many. Every district that dropped out recorded
        # its reason in `failures` — and this early return discarded all of them,
        # so the guardrail reported "only 3 districts produced results" and threw
        # away the only information that could explain it. On the SUCCESS path
        # those same reasons are published in the file as `skipped`; on the
        # failure path, where they actually matter, they vanished.
        #
        # Three consecutive runs failed this way on 2026-08-07 and the logs say
        # nothing about which districts fell over or how. They do now.
        log(f"  SKIP access: only {len(rows)} districts produced results "
            f"(<{MIN_DISTRICTS_OK})")
        if failures:
            log("  why each district dropped out:")
            for f in failures:
                log(f"    - {f}")
        else:
            log("    no per-district reason was recorded, which means they were "
                "still running when the job ended rather than failing — treat "
                "this as a timeout, not a data problem.")
        return False

    # Keep the last-good row of every district this run could not measure.
    # The floor above still decides whether this run produced enough to write
    # at all; it no longer decides how many districts the page keeps.
    prev_path = OUT / "streets-access.json"
    try:
        prev = json.loads(prev_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        prev = None
    today = date.today().isoformat()
    measured = len(rows)
    rows = carry_forward(rows, prev, today)
    carried = [r["name"] for r in rows if r.get("carried")]

    out = {
        "as_of": today,
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "OpenStreetMap amenities + walk network via OSMnx",
        "license": "ODbL — © OpenStreetMap contributors",
        "method": (f"Walk network per district. Walking time at {WALK_SPEED_M_PER_MIN:.0f} m/min "
                   f"(~4.8 km/h) along the network — not straight-line. 'Within 15 min' is the share "
                   f"of walk-network nodes whose nearest facility of that type is inside "
                   f"{ACCESS_THRESHOLD_MIN:.0f} minutes."),
        "caveat": ("Amenity coverage in OSM is INCOMPLETE and uneven — a low score can mean few "
                   "facilities or simply few mapped facilities, and the two are impossible to "
                   "separate from this data alone. It says nothing about whether a facility is open, "
                   "affordable, staffed or any good. Treat it as a map of what is mapped."),
        "districts": rows,
        "skipped": failures,
    }
    (OUT / "streets-access.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    log(f"  wrote streets-access.json ({measured} measured now"
        + (f", {len(carried)} carried from their last-good run: {', '.join(carried)}" if carried else "")
        + ")")
    skipped.extend(f"access / {f}" for f in failures)
    return True


def main() -> None:
    import osmnx as ox
    ox.settings.log_console = False
    ox.settings.use_cache = True
    ox.settings.requests_timeout = 300
    log(f"OSMnx {ox.__version__}\n")

    OUT.mkdir(parents=True, exist_ok=True)
    resolved: dict = {}                      # key -> (boundary gdf, area km²)
    skipped: list = []                       # every district dropped, either layer
    # One budget and one breaker for the whole run: an endpoint that stopped
    # answering during the report card is not going to answer the access layer.
    budget, breaker = RunBudget(BUDGET_MIN), Breaker()
    log(f"Run budget: {BUDGET_MIN:.0f} min (STREETS_BUDGET_MIN)\n")
    ok_card = build_report_card(ox, resolved, skipped, budget, breaker)
    ok_access = build_access(ox, resolved, skipped, budget, breaker) if ok_card else False
    if not ok_card:
        log("\n(access layer skipped because the report card did not build)")

    failed = [n for n, ok in [("report-card", ok_card), ("access", ok_access)] if not ok]
    if failed:
        sys.exit(f"\nFAILED layers (last-good files kept): {', '.join(failed)}")

    # A PARTIAL build is not a green build. MIN_DISTRICTS_OK only decides
    # whether the file is worth writing at all; it must not double as "this
    # result is complete". Run 3 cleared that floor by exactly one district
    # while silently dropping Downtown Cairo — the khedivial grid every other
    # district is implicitly compared against — and reported success. A page
    # whose premise is six eras cannot quietly become four without anyone
    # being told.
    #
    # Exiting non-zero here costs nothing that matters: the workflow's commit
    # step runs under `if: '!cancelled()'`, so the layers that DID build are
    # still committed. That holds only while the script ends by itself: a job
    # killed at its time limit counts as CANCELLED and commits nothing, which
    # is what RunBudget and Breaker above exist to prevent. All this does is turn a silent degradation into a red
    # run and a failure issue, which is a human's decision to make, not this
    # script's.
    if skipped:
        sys.exit("\nPARTIAL build (files written, run marked failed):\n  "
                 + "\n  ".join(skipped))
    log("\nBoth layers written, all districts resolved.")


if __name__ == "__main__":
    main()
