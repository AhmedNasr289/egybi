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

# Thin-result guardrails. OSM Egypt already maps far more than these floors;
# a result under the floor means a broken/partial response, not reality.
MIN_HEALTH = 150      # hospitals + clinics combined
MIN_SCHOOLS = 1000
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


def build_heritage() -> bool:
    print("World Heritage sites (UNESCO WHC list XML)…")
    try:
        raw = fetch(UNESCO_XML, timeout=120)
        root = ET.fromstring(raw)
    except Exception as e:  # noqa: BLE001
        print(f"  SKIP heritage: UNESCO feed unreachable/unparseable ({e}) — keeping last-good file")
        return False
    sites = []
    for row in root.iter("row"):
        def txt(tag: str) -> str:
            el = row.find(tag)
            return (el.text or "").strip() if el is not None else ""
        iso = [c.strip().lower() for c in txt("iso_code").split(",")]
        if "eg" not in iso:
            continue
        try:
            lat, lon = float(txt("latitude")), float(txt("longitude"))
        except ValueError:
            continue
        name = re.sub(r"<[^>]+>", "", txt("site"))
        sites.append({"name": name, "lat": round(lat, 4), "lon": round(lon, 4),
                      "year": txt("date_inscribed"), "category": txt("category")})
    if len(sites) < MIN_HERITAGE:
        print(f"  SKIP heritage: only {len(sites)} Egyptian sites (<{MIN_HERITAGE}) — parse looks broken")
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


def main() -> None:
    govs = load_governorates()
    print(f"Loaded {len(govs)} governorate outlines from {GEO_BUNDLE.name}\n")
    ok_health = build_health(govs)
    ok_schools = build_schools(govs)
    ok_heritage = build_heritage()
    failed = [n for n, ok in [("health", ok_health), ("schools", ok_schools),
                              ("heritage", ok_heritage)] if not ok]
    if failed:
        sys.exit(f"\nFAILED layers (last-good files kept): {', '.join(failed)}")
    print("\nAll three layers written.")


if __name__ == "__main__":
    main()
