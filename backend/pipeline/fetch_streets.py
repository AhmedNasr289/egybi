#!/usr/bin/env python3
"""
EgyBI — Cairo street-network report card + 15-minute access score.

Downloads the street network for a set of Cairo districts chosen to span
distinct planning eras, computes real network-geometry metrics, and emits the
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
     polygon is sanity-checked for plausible area before it is used. A district
     that resolves to something absurd is dropped with a loud reason rather
     than silently poisoning the comparison.

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
import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path

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
        "queries": ["Abdeen, Cairo, Egypt", "Downtown, Cairo, Egypt", "Wust el-Balad, Cairo, Egypt"],
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
        "queries": ["6th of October City, Giza, Egypt", "6th of October, Giza, Egypt", "Madinat Sitta Uktubar, Egypt"],
    },
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
MIN_DISTRICTS_OK = 4      # fewer than this and the comparison isn't worth publishing

ORIENTATION_BINS = 36     # 10° bins, the OSMnx convention

# Amenities for the access layer. Deliberately limited to categories OSM maps
# with some consistency in Egypt.
AMENITIES = {"hospital": "hospital", "clinic": "clinic", "school": "school", "pharmacy": "pharmacy"}
WALK_SPEED_M_PER_MIN = 80.0   # ~4.8 km/h, the standard planning walking speed
ACCESS_THRESHOLD_MIN = 15.0


def log(msg: str) -> None:
    print(msg, flush=True)


def resolve_boundary(ox, d: dict):
    """Try each candidate query until one geocodes to a plausible polygon.

    Returns (gdf, query, area_km2) or (None, None, None). The area check is the
    real defence: a wrong geocode usually resolves to something far too small
    (a single POI) or far too large (a whole governorate), and both would
    silently corrupt every per-km2 metric downstream.
    """
    for q in d["queries"]:
        try:
            gdf = ox.geocode_to_gdf(q)
        except Exception as e:  # noqa: BLE001 — try the next candidate
            log(f"    geocode miss  {q!r}: {type(e).__name__}")
            continue
        try:
            area_km2 = float(gdf.to_crs(gdf.estimate_utm_crs()).area.iloc[0]) / 1e6
        except Exception as e:  # noqa: BLE001
            log(f"    area failed   {q!r}: {e}")
            continue
        if not (MIN_AREA_KM2 <= area_km2 <= MAX_AREA_KM2):
            log(f"    implausible   {q!r}: {area_km2:,.1f} km² outside [{MIN_AREA_KM2}, {MAX_AREA_KM2}]")
            continue
        log(f"    resolved      {q!r} → {area_km2:,.1f} km²")
        return gdf, q, area_km2
    return None, None, None


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


def build_report_card(ox, resolved: dict, skipped: list) -> bool:
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
        gdf, query, area_km2 = resolve_boundary(ox, d)
        if gdf is None:
            failures.append(f"{d['name']}: no candidate query resolved to a plausible boundary")
            continue
        try:
            G = ox.graph_from_polygon(gdf.geometry.iloc[0], network_type="drive", simplify=True)
        except Exception as e:  # noqa: BLE001
            failures.append(f"{d['name']}: graph download failed ({type(e).__name__})")
            log(f"    graph failed  {e}")
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
        geom["properties"] = {"key": d["key"], "name": d["name"], "era": d["era"]}
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
                   "OSM's, not an administrative gazetteer's."),
        "districts": rows,
        "skipped": failures,
    }
    (OUT / "streets-districts.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "streets-boundaries.json").write_text(
        json.dumps(boundaries, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    log(f"  wrote streets-districts.json ({len(rows)} districts) + streets-boundaries.json")
    if failures:
        log(f"  note: {len(failures)} district(s) skipped — {'; '.join(failures)}")
    skipped.extend(f"report-card / {f}" for f in failures)
    return True


def build_access(ox, resolved: dict, skipped: list) -> bool:
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
        cached = resolved.get(d["key"])
        if cached is None:
            failures.append(f"{d['name']}: no boundary from the report-card pass")
            continue
        poly = cached[0].geometry.iloc[0]
        try:
            W = ox.projection.project_graph(
                ox.graph_from_polygon(poly, network_type="walk", simplify=True))
        except Exception as e:  # noqa: BLE001
            failures.append(f"{d['name']}: walk graph failed ({type(e).__name__})")
            continue
        if W.number_of_nodes() < MIN_NODES:
            failures.append(f"{d['name']}: thin walk graph ({W.number_of_nodes()} nodes)")
            continue

        per_amenity, counts = {}, {}
        for label, tag in AMENITIES.items():
            try:
                feats = ox.features.features_from_polygon(poly, tags={"amenity": tag})
            except Exception:  # noqa: BLE001 — an empty/erroring category is not fatal
                feats = None
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
            # multi-source shortest path: distance from every node to its
            # nearest amenity, in one pass rather than per-node Dijkstra.
            src = "__amenity__"
            Wt = W.copy()
            Wt.add_node(src)
            for t in targets:
                Wt.add_edge(src, t, length=0.0)
            dist = nx.single_source_dijkstra_path_length(Wt, src, weight="length")
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
            failures.append(f"{d['name']}: no amenity category produced a result")
            continue
        rows.append({
            "key": d["key"], "name": d["name"],
            "walk_nodes": W.number_of_nodes(),
            "amenity_counts": counts,
            "access": per_amenity,
            "mean_within_15min_pct": round(sum(v["within_15min_pct"] for v in got) / len(got), 1),
        })
        log(f"    ok            {counts} → mean {rows[-1]['mean_within_15min_pct']}% within 15 min")

    if len(rows) < MIN_DISTRICTS_OK:
        log(f"  SKIP access: only {len(rows)} districts produced results (<{MIN_DISTRICTS_OK})")
        return False

    out = {
        "as_of": date.today().isoformat(),
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
    log(f"  wrote streets-access.json ({len(rows)} districts)")
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
    ok_card = build_report_card(ox, resolved, skipped)
    ok_access = build_access(ox, resolved, skipped) if ok_card else False
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
    # still committed. All this does is turn a silent degradation into a red
    # run and a failure issue, which is a human's decision to make, not this
    # script's.
    if skipped:
        sys.exit("\nPARTIAL build (files written, run marked failed):\n  "
                 + "\n  ".join(skipped))
    log("\nBoth layers written, all districts resolved.")


if __name__ == "__main__":
    main()
