#!/usr/bin/env python3
"""
EgyBI — Atlas layer builder (health facilities, schools, heritage sites).

Fetches the three occasionally-refreshed layers the Atlas page
(site/geospatial.html) renders on top of the bundled governorate map
(site/assets/egypt-geo.js — geoBoundaries EGY ADM1, CC-BY 4.0):

  1. Health facilities  — OpenStreetMap via Overpass (amenity=hospital|clinic).
                          Points + per-governorate counts.        → geo-health.json
  2. Schools            — OpenStreetMap via Overpass (amenity=school).
                          Per-governorate counts only (tens of thousands of
                          points would bloat the page for no display value).
                                                                  → geo-schools.json
  3. Heritage sites     — UNESCO World Heritage Centre list (XML feed),
                          filtered to Egypt.                      → geo-heritage.json

This is NOT a daily pipeline. OSM coverage and the World Heritage List change
slowly, so it runs manually (workflow_dispatch) a few times a year. Guardrail
is the same abort-and-keep-last-good pattern as fetch_prices.py / fetch_fx.py,
applied per file: a layer that comes back unreachable or anomalously thin is
skipped (its previous JSON survives untouched) and the run exits non-zero so
the manual run shows red in the Actions UI.

Per-governorate counts are assigned by point-in-polygon against the bundled
SIMPLIFIED boundaries, so counts near governorate borders are approximate —
this is recorded in each file's meta and stated on the page.

Stdlib only — no pip installs.
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date, datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
GEO_BUNDLE = REPO / "site" / "assets" / "egypt-geo.js"
OUT_DIR = REPO / "site" / "data"

OVERPASS = "https://overpass-api.de/api/interpreter"
UNESCO_XML = "https://whc.unesco.org/en/list/xml/"
UA = "EgyBI-atlas/1.0 (egybi.com; hello@egybi.com)"

# Thin-result guardrails: a result under the floor means a broken/partial
# response, not reality. Calibrated against the first real run (2026-07-25),
# which returned 963 health facilities and 1,191 schools — the floors sit well
# under those so ordinary mapping churn can't false-trip, while still catching
# a truncated response. The original MIN_SCHOOLS of 1000 was set blind and sat
# only 16% under the real value, which was too tight to be safe.
MIN_HEALTH = 400      # hospitals + clinics combined (observed: 963)
MIN_SCHOOLS = 700     # observed: 1,191
MIN_HERITAGE = 6      # Egypt has 7 inscribed sites; <6 means a parse failure


def fetch(url: str, data: bytes | None = None, timeout: int = 300) -> bytes:
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def overpass(query: str, tries: int = 3) -> dict:
    for attempt in range(1, tries + 1):
        try:
            raw = fetch(OVERPASS, data=("data=" + urllib.parse.quote(query)).encode())
            return json.loads(raw)
        except Exception as e:  # noqa: BLE001 — retry then re-raise
            if attempt == tries:
                raise
            print(f"  overpass attempt {attempt} failed ({e}); retrying in 30s")
            time.sleep(30)
    raise RuntimeError("unreachable")


# ---------------------------------------------------------------- governorates
def load_governorates() -> list[dict]:
    """Parse the bundled egypt-geo.js into [{name, rings}] for point-in-polygon."""
    src = GEO_BUNDLE.read_text(encoding="utf-8")
    start = src.index("{", src.index("EGYBI_EGYPT_GEO"))
    payload = src[start:src.rindex("}") + 1]
    geo = json.loads(payload)
    govs = []
    for f in geo["features"]:
        rings = []
        g = f["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        for poly in polys:
            rings.append(poly[0])  # outer ring only; these polygons carry no holes
        govs.append({"name": f["properties"]["name"], "rings": rings})
    if len(govs) != 27:
        sys.exit(f"ABORT: expected 27 governorates in {GEO_BUNDLE.name}, got {len(govs)}")
    return govs


def point_in_ring(lon: float, lat: float, ring: list[list[float]]) -> bool:
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def assign(lon: float, lat: float, govs: list[dict]) -> str | None:
    for g in govs:
        for ring in g["rings"]:
            if point_in_ring(lon, lat, ring):
                return g["name"]
    return None


def element_coords(el: dict) -> tuple[float, float] | None:
    if "lat" in el:
        return el["lon"], el["lat"]
    c = el.get("center")
    if c:
        return c["lon"], c["lat"]
    return None


# --------------------------------------------------------------------- layers
def build_health(govs: list[dict]) -> bool:
    print("Health facilities (Overpass, amenity=hospital|clinic)…")
    q = ('[out:json][timeout:300];'
         'area["ISO3166-1"="EG"][boundary=administrative][admin_level=2]->.eg;'
         'nwr["amenity"~"^(hospital|clinic)$"](area.eg);'
         'out center tags;')
    try:
        data = overpass(q)
    except Exception as e:  # noqa: BLE001
        print(f"  SKIP health: Overpass unreachable ({e}) — keeping last-good file")
        return False
    points, by_gov, unassigned = [], {g["name"]: {"hospitals": 0, "clinics": 0} for g in govs}, 0
    for el in data.get("elements", []):
        coords = element_coords(el)
        if not coords:
            continue
        lon, lat = coords
        kind = el.get("tags", {}).get("amenity")
        if kind not in ("hospital", "clinic"):
            continue
        gov = assign(lon, lat, govs)
        if gov:
            by_gov[gov]["hospitals" if kind == "hospital" else "clinics"] += 1
        else:
            unassigned += 1
        name = el.get("tags", {}).get("name") or el.get("tags", {}).get("name:en") or ""
        points.append({"n": name[:80], "lat": round(lat, 4), "lon": round(lon, 4),
                       "k": "h" if kind == "hospital" else "c"})
    total = len(points)
    if total < MIN_HEALTH:
        print(f"  SKIP health: only {total} facilities (<{MIN_HEALTH}) — response looks broken")
        return False
    out = {
        "as_of": date.today().isoformat(),
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "OpenStreetMap via Overpass API",
        "license": "ODbL — © OpenStreetMap contributors",
        "note": ("Facility locations as mapped in OSM — coverage is incomplete and "
                 "community-maintained, and per-governorate counts use simplified "
                 "boundaries, so border-area assignments are approximate."),
        "total": total, "unassigned": unassigned,
        "by_gov": by_gov, "points": points,
    }
    (OUT_DIR / "geo-health.json").write_text(
        json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  wrote geo-health.json — {total} facilities ({unassigned} outside simplified borders)")
    return True


def build_schools(govs: list[dict]) -> bool:
    print("Schools (Overpass, amenity=school — counts only)…")
    q = ('[out:json][timeout:300];'
         'area["ISO3166-1"="EG"][boundary=administrative][admin_level=2]->.eg;'
         'nwr["amenity"="school"](area.eg);'
         'out ids center;')
    try:
        data = overpass(q)
    except Exception as e:  # noqa: BLE001
        print(f"  SKIP schools: Overpass unreachable ({e}) — keeping last-good file")
        return False
    by_gov = {g["name"]: 0 for g in govs}
    total = unassigned = 0
    for el in data.get("elements", []):
        coords = element_coords(el)
        if not coords:
            continue
        total += 1
        gov = assign(coords[0], coords[1], govs)
        if gov:
            by_gov[gov] += 1
        else:
            unassigned += 1
    if total < MIN_SCHOOLS:
        print(f"  SKIP schools: only {total} (<{MIN_SCHOOLS}) — response looks broken")
        return False
    out = {
        "as_of": date.today().isoformat(),
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "OpenStreetMap via Overpass API",
        "license": "ODbL — © OpenStreetMap contributors",
        "note": ("Schools as mapped in OSM — an undercount of Egypt's real school "
                 "network, shown for relative geographic pattern, not absolute totals. "
                 "Counts use simplified boundaries (border areas approximate)."),
        "total": total, "unassigned": unassigned, "by_gov": by_gov,
    }
    (OUT_DIR / "geo-schools.json").write_text(
        json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  wrote geo-schools.json — {total} schools ({unassigned} outside simplified borders)")
    return True


LAT_TAGS = ("latitude", "lat")
LON_TAGS = ("longitude", "longitude_", "lon", "long", "lng")


def build_heritage() -> bool:
    print("World Heritage sites (UNESCO WHC list XML)…")
    try:
        raw = fetch(UNESCO_XML, timeout=120)
    except Exception as e:  # noqa: BLE001
        print(f"  SKIP heritage: UNESCO feed unreachable ({e}) — keeping last-good file")
        return False
    try:
        root = ET.fromstring(raw)
    except ET.ParseError as e:
        print(f"  SKIP heritage: feed did not parse as XML ({e}); first 200 bytes: {raw[:200]!r}")
        return False

    def txt(el, *names: str) -> str:
        for n in names:
            c = el.find(n)
            if c is not None and (c.text or "").strip():
                return c.text.strip()
        return ""

    # Learned from run 2's diagnostics rather than guessed: the feed's root is
    # <query>, and its coordinate-bearing elements are 5,923 nested <poi>
    # points carrying only ('iso2', 'latitude', 'longitude') — so searching by
    # coordinates finds sub-points, not sites, and the country code lives in
    # `iso2`. Anchor on the SITE records instead (elements with a name-ish
    # child), and take coordinates from the record itself or, failing that,
    # from its first nested point.
    NAME_TAGS = ("site", "name", "title")
    ISO_TAGS = ("iso2", "iso_code", "iso", "country_iso")
    WHERE_TAGS = ("states", "state", "country", "region")

    def coords(el):
        """Coordinates from the element itself, else its first nested point."""
        for cand in [el] + list(el.iter()):
            la, lo = txt(cand, *LAT_TAGS), txt(cand, *LON_TAGS)
            if la and lo:
                try:
                    return float(la), float(lo)
                except ValueError:
                    continue
        return None

    def country(el) -> tuple[list[str], str]:
        """ISO codes and place names from the element or any descendant."""
        iso, where = txt(el, *ISO_TAGS), txt(el, *WHERE_TAGS)
        for cand in el.iter():
            iso = iso or txt(cand, *ISO_TAGS)
            where = where or txt(cand, *WHERE_TAGS)
        return [c.strip().lower() for c in iso.split(",")], where.lower()

    records = [el for el in root.iter() if txt(el, *NAME_TAGS)]
    print(f"  feed root <{root.tag}>, {len(records)} named record(s)")
    if records:
        print(f"  record tag <{records[0].tag}>, fields: {sorted({c.tag for c in records[0]})}")
    else:
        print(f"  SKIP heritage: no named records; tags seen: {sorted({c.tag for c in root.iter()})[:30]}")
        return False

    sites = []
    for el in records:
        iso, where = country(el)
        if "eg" not in iso and "egypt" not in where:
            continue
        ll = coords(el)
        if not ll:
            continue
        name = re.sub(r"<[^>]+>", "", txt(el, *NAME_TAGS))
        sites.append({"name": name, "lat": round(ll[0], 4), "lon": round(ll[1], 4),
                      "year": txt(el, "date_inscribed", "year", "inscribed"),
                      "category": txt(el, "category", "type")})
    if len(sites) < MIN_HERITAGE:
        print(f"  SKIP heritage: only {len(sites)} Egyptian sites (<{MIN_HERITAGE}) of "
              f"{len(records)} records — the country field is not where we looked")
        return False
    sites.sort(key=lambda s: s["year"])
    out = {
        "as_of": date.today().isoformat(),
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "UNESCO World Heritage Centre — whc.unesco.org list feed",
        "license": "© UNESCO World Heritage Centre, used with attribution",
        "sites": sites,
    }
    (OUT_DIR / "geo-heritage.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"  wrote geo-heritage.json — {len(sites)} sites")
    return True


def build_places(govs: list[dict]) -> bool:
    """Egypt-wide gazetteer: cities and towns, airports, archaeological sites.

    WHY THIS IS FETCHED RATHER THAN WRITTEN DOWN. A list of Egyptian cities with
    coordinates is the kind of thing that looks harmless to type from memory and
    is exactly the kind of thing this site must not do — every one of those
    numbers would be an unsourced figure wearing a citation's clothes. So the
    gazetteer is queried from OpenStreetMap, dated, and labelled as OSM's view
    of Egypt rather than an official one.

    WHAT IS DELIBERATELY NOT DONE. The obvious next move is to sort these into
    "oases", "canal cities", "Red Sea resorts" and so on. That classification
    would be ours, not the data's, and would quietly become an authored claim
    sitting among sourced ones. Instead each place carries only what OSM
    actually says — its `place` tag, its name, its coordinates — plus the
    governorate computed by point-in-polygon against the bundled boundaries.
    The geographic groupings a reader wants are then visible on the map, which
    is where geography belongs, rather than asserted in a label.

    POPULATION is the one field to treat carefully. OSM's `population` tag is
    community-maintained, patchy and often years stale, so it travels with that
    caveat attached and is never presented as a census figure.
    """
    print("Places gazetteer (OpenStreetMap via Overpass)…")

    # node+way+relation so a city mapped as an area is not missed. `out center`
    # collapses areas to a representative point, which is all a marker needs.
    queries = {
        "settlement": """[out:json][timeout:180];
area["ISO3166-1"="EG"][admin_level=2]->.eg;
(node["place"~"^(city|town)$"]["name"](area.eg);
 way["place"~"^(city|town)$"]["name"](area.eg);
 relation["place"~"^(city|town)$"]["name"](area.eg););
out center tags;""",
        # iata filter keeps this to airports a traveller can actually fly into,
        # rather than every airstrip and military field in the desert.
        "airport": """[out:json][timeout:180];
area["ISO3166-1"="EG"][admin_level=2]->.eg;
(node["aeroway"="aerodrome"]["iata"]["name"](area.eg);
 way["aeroway"="aerodrome"]["iata"]["name"](area.eg);
 relation["aeroway"="aerodrome"]["iata"]["name"](area.eg););
out center tags;""",
        "antiquity": """[out:json][timeout:180];
area["ISO3166-1"="EG"][admin_level=2]->.eg;
(node["historic"="archaeological_site"]["name"](area.eg);
 way["historic"="archaeological_site"]["name"](area.eg);
 relation["historic"="archaeological_site"]["name"](area.eg););
out center tags;""",
    }

    places, counts, unassigned = [], {}, 0
    for kind, q in queries.items():
        try:
            data = overpass(q)
        except Exception as e:  # noqa: BLE001
            print(f"  SKIP places: overpass failed for {kind} ({type(e).__name__}: {e})")
            return False
        n = 0
        for el in data.get("elements", []):
            c = element_coords(el)
            if not c:
                continue
            lon, lat = c
            tags = el.get("tags", {})
            name = tags.get("name:en") or tags.get("name")
            if not name:
                continue
            gov = assign(lon, lat, govs)
            if gov is None:
                unassigned += 1        # just offshore, or outside the bundled outlines
            rec = {
                "name": name,
                "name_ar": tags.get("name:ar", ""),
                "kind": kind,
                "lat": round(lat, 5),
                "lon": round(lon, 5),
                "gov": gov or "",
            }
            if kind == "settlement":
                rec["place"] = tags.get("place", "")
                pop = tags.get("population", "")
                # Keep only clean integers; OSM population values include
                # ranges, footnotes and stray text often enough to matter.
                if pop.isdigit():
                    rec["population_osm"] = int(pop)
            if kind == "airport":
                rec["iata"] = tags.get("iata", "")
            places.append(rec)
            n += 1
        counts[kind] = n
        print(f"    {kind:<11} {n:>5}")

    if unassigned:
        print(f"    (unassigned to a governorate: {unassigned} — coastal or outside the outlines)")

    # CALIBRATED against the first real build (2026-08-07), which returned
    # settlement 335, airport 29, antiquity 393. Set to roughly 65% of observed:
    # high enough that a collapse or a truncated Overpass response trips them,
    # low enough that ordinary mapping churn does not turn a healthy run red.
    # The provisional 120/8/40 were guesses and are now retired.
    floors = {"settlement": 220, "airport": 18, "antiquity": 250}
    thin = [f"{k} {counts.get(k, 0)} < {v}" for k, v in floors.items() if counts.get(k, 0) < v]
    if thin:
        print(f"  SKIP places: thin result ({'; '.join(thin)}) — keeping last-good file")
        return False

    # COVERAGE SELF-CHECK. Spot-checking the first build against major Egyptian
    # cities found three genuinely absent from a place=city|town query —
    # Mansoura, Sohag and Sharm el-Sheikh — each a significant city. That is
    # what an incomplete gazetteer looks like in practice, and it is far more
    # useful to a reader than a generic "coverage may vary". Rather than write
    # that observation down once and let it rot, the check runs every build and
    # ships its result, so the page always states the CURRENT gap rather than a
    # remembered one. Absence here is reported, never treated as an error: OSM
    # improving is the expected outcome and would simply shorten the list.
    BENCHMARK = ["Cairo", "Alexandria", "Giza", "Port Said", "Suez", "Luxor",
                 "Aswan", "Hurghada", "Sharm", "Ismail", "Mansoura", "Tanta",
                 "Asyut", "Sohag", "Minya", "Zagazig", "Damanhur", "Faiyum",
                 "Qena", "Damietta", "Marsa Matruh", "Siwa"]
    settle_names = " | ".join(p["name"].lower() for p in places if p["kind"] == "settlement")
    absent = [b for b in BENCHMARK if b.lower() not in settle_names]
    print(f"    coverage check: {len(BENCHMARK) - len(absent)}/{len(BENCHMARK)} "
          f"benchmark cities present" + (f"; absent: {', '.join(absent)}" if absent else ""))

    with_pop = sum(1 for p in places if "population_osm" in p)
    out = {
        "as_of": date.today().isoformat(),
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "OpenStreetMap via Overpass API",
        "license": "ODbL — © OpenStreetMap contributors",
        "counts": counts,
        "note": ("Cities, towns, airports with an IATA code, and archaeological sites AS MAPPED "
                 "IN OPENSTREETMAP. This is the geographic pattern of what the OSM community has "
                 "recorded, not an official gazetteer: places are missing, and the set is richer "
                 "in well-mapped areas. Governorate is computed by point-in-polygon against the "
                 "bundled boundaries, so a place just offshore may come back unassigned."),
        "coverage_check": {
            "benchmark_n": len(BENCHMARK),
            "present_n": len(BENCHMARK) - len(absent),
            "absent": absent,
            "note": ("A fixed list of major Egyptian cities is checked against this "
                     "gazetteer on every build. Any named below is genuinely missing "
                     "from OpenStreetMap's place=city|town data at this date — not "
                     "missing from Egypt. It is published because a gazetteer that "
                     "hides its gaps invites you to mistake it for complete."),
        },
        "population_note": (f"{with_pop} of {counts.get('settlement', 0)} settlements carry a "
                            "population tag in OSM. That tag is community-maintained and often "
                            "years out of date — it is not a census figure and is shown only "
                            "where OSM has one."),
        "places": sorted(places, key=lambda p: (p["kind"], p["name"])),
    }
    (OUT_DIR / "geo-places.json").write_text(
        json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  wrote geo-places.json ({len(places)} places, {with_pop} with a population tag)")
    return True


def main() -> None:
    govs = load_governorates()
    print(f"Loaded {len(govs)} governorate outlines from {GEO_BUNDLE.name}\n")
    ok_health = build_health(govs)
    ok_schools = build_schools(govs)
    ok_heritage = build_heritage()
    ok_places = build_places(govs)
    failed = [n for n, ok in [("health", ok_health), ("schools", ok_schools),
                              ("heritage", ok_heritage), ("places", ok_places)] if not ok]
    if failed:
        sys.exit(f"\nFAILED layers (last-good files kept): {', '.join(failed)}")
    print("\nAll four layers written.")


if __name__ == "__main__":
    main()
