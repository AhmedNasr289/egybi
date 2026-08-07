#!/usr/bin/env python3
"""
EgyBI — visitor layer: climate normals and terrain for Egypt's major sites.

Builds the data behind site/visit.html, which answers the two questions a
foreign visitor actually asks first — *what is there* and *what will it be
like when I go* — from sources that can be cited rather than described.

  1. Climate normals  — NASA POWER climatology API.                → visit-climate.json
  2. Elevation        — NASA SRTM 30 m via the Open-Topo-Data
                        public instance.                           → visit-terrain.json

WHY THESE TWO SOURCES AND NOT THE OBVIOUS ONES
----------------------------------------------
Every branded alternative fails a constraint this project has already
committed to, so the choice was made by elimination rather than preference:

  * Google Maps / Mapbox / ArcGIS / Carto need an API key, a billing account,
    or both, and each map render is a runtime call to a provider. The site is
    tile-free by measurement, so that is disqualifying before cost is even
    discussed.
  * Google Earth imagery is licensed, not open. Deriving assets from it and
    republishing them breaks the licence chain at the source.
  * Most weather APIs need a key. A key is a vendor account and a secret to
    rotate, for climate normals that change on a decadal timescale.

NASA POWER needs no key, no account and no attribution beyond a citation,
and its data is US-Government public domain. SRTM is likewise public domain.
Both are fetched at BUILD time and baked into JSON in this repo, so the
published page still makes zero runtime calls to anything.

WHAT THE CLIMATE FIGURES ARE, EXACTLY
-------------------------------------
POWER's climatology endpoint returns a long-term monthly mean per parameter,
derived from MERRA-2 reanalysis. That is a *model reanalysis*, not a weather
station reading, and the difference matters enough to print: it is excellent
for "how hot is Aswan in July" and wrong to quote as "the temperature on the
day you visit". The page says so. We keep T2M (mean), T2M_MAX, T2M_MIN and
PRECTOTCORR (precipitation), because a visitor deciding between February and
August needs the daily maximum, not the mean.

No descriptive prose about any site is generated here. Where a place has no
sourced description, the page shows what the data has — coordinates, altitude,
climate — rather than inventing atmosphere. That is the whole rule.

Stdlib only — no pip installs.
"""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUT_DIR = REPO / "site" / "data"

POWER = ("https://power.larc.nasa.gov/api/temporal/climatology/point"
         "?parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR&community=RE"
         "&longitude={lon}&latitude={lat}&format=JSON")
ELEV = "https://api.opentopodata.org/v1/srtm30m?locations={pairs}"
UA = "EgyBI-visit/1.0 (egybi.com; hello@egybi.com)"

MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
          "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

# The sites a first-time visitor is actually choosing between. Coordinates are
# the site itself, not the nearest city centre, because a climate normal for
# Cairo is not the climate at Giza's plateau edge and an elevation for "Luxor"
# is not the elevation of the Valley of the Kings.
#
# `unesco` marks the ones on the World Heritage List, which the page cross-
# checks against geo-heritage.json rather than trusting this flag — if the two
# disagree the page shows the UNESCO file, because that one is fetched.
SITES = [
    {"key": "giza",        "name": "The Giza Pyramids",     "name_ar": "أهرامات الجيزة",
     "lat": 29.9773, "lon": 31.1325, "gov": "Giza",         "unesco": True},
    {"key": "saqqara",     "name": "Saqqara",               "name_ar": "سقارة",
     "lat": 29.8712, "lon": 31.2165, "gov": "Giza",         "unesco": True},
    {"key": "karnak",      "name": "Karnak Temple",         "name_ar": "معبد الكرنك",
     "lat": 25.7188, "lon": 32.6573, "gov": "Luxor",        "unesco": True},
    {"key": "valley-kings", "name": "Valley of the Kings",  "name_ar": "وادي الملوك",
     "lat": 25.7402, "lon": 32.6014, "gov": "Luxor",        "unesco": True},
    {"key": "abu-simbel",  "name": "Abu Simbel",            "name_ar": "أبو سمبل",
     "lat": 22.3372, "lon": 31.6258, "gov": "Aswan",        "unesco": True},
    {"key": "philae",      "name": "Philae Temple",         "name_ar": "معبد فيلة",
     "lat": 24.0256, "lon": 32.8843, "gov": "Aswan",        "unesco": True},
    {"key": "abydos",      "name": "Abydos",                "name_ar": "أبيدوس",
     "lat": 26.1847, "lon": 31.9194, "gov": "Sohag",        "unesco": False},
    {"key": "dendera",     "name": "Dendera Temple",        "name_ar": "معبد دندرة",
     "lat": 26.1417, "lon": 32.6700, "gov": "Qena",         "unesco": False},
    {"key": "islamic-cairo", "name": "Historic Cairo",      "name_ar": "القاهرة التاريخية",
     "lat": 30.0444, "lon": 31.2620, "gov": "Cairo",        "unesco": True},
    {"key": "alexandria",  "name": "Alexandria",            "name_ar": "الإسكندرية",
     "lat": 31.2001, "lon": 29.9187, "gov": "Alexandria",   "unesco": False},
    {"key": "siwa",        "name": "Siwa Oasis",            "name_ar": "واحة سيوة",
     "lat": 29.2041, "lon": 25.5195, "gov": "Matrouh",      "unesco": False},
    {"key": "white-desert", "name": "The White Desert",     "name_ar": "الصحراء البيضاء",
     "lat": 27.2000, "lon": 28.1833, "gov": "New Valley",   "unesco": False},
    {"key": "st-catherine", "name": "Saint Catherine's Monastery", "name_ar": "دير سانت كاترين",
     "lat": 28.5559, "lon": 33.9760, "gov": "South Sinai",  "unesco": True},
    {"key": "dahab",       "name": "Dahab",                 "name_ar": "دهب",
     "lat": 28.5091, "lon": 34.5136, "gov": "South Sinai",  "unesco": False},
    {"key": "hurghada",    "name": "Hurghada",              "name_ar": "الغردقة",
     "lat": 27.2579, "lon": 33.8116, "gov": "Red Sea",      "unesco": False},
    {"key": "wadi-al-hitan", "name": "Wadi al-Hitan",       "name_ar": "وادي الحيتان",
     "lat": 29.2694, "lon": 30.0417, "gov": "Faiyum",       "unesco": True},
    {"key": "abu-mena",    "name": "Abu Mena",              "name_ar": "أبو مينا",
     "lat": 30.8419, "lon": 29.6647, "gov": "Alexandria",   "unesco": True},
    {"key": "suez-canal",  "name": "The Suez Canal at Ismailia", "name_ar": "قناة السويس",
     "lat": 30.5852, "lon": 32.2715, "gov": "Ismailia",     "unesco": False},
]

# Floors. Deliberately expressed as a share of the site list rather than as a
# magic number, so adding a site cannot silently lower the bar. A run that
# resolves fewer than three quarters of the sites is a broken run, not a thin
# one: these coordinates are fixed and known-good, so a miss is the endpoint
# failing, never the data being absent.
MIN_CLIMATE_SITES = int(len(SITES) * 0.75)
MIN_TERRAIN_SITES = int(len(SITES) * 0.75)

# POWER returns this for a cell it has no value for. Writing it through as a
# temperature would put -999 °C on a page about holidays.
POWER_FILL = -999.0


def log(msg: str) -> None:
    print(msg, flush=True)


def get(url: str, tries: int = 3, pause: float = 6.0) -> dict | None:
    """GET JSON with backoff. Returns None rather than raising, because one
    unreachable site must not abort the other seventeen."""
    for attempt in range(1, tries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            why = getattr(e, "code", type(e).__name__)
            if attempt == tries:
                log(f"      giving up after {tries} attempts ({why})")
                return None
            time.sleep(pause * attempt)
    return None


def write(name: str, payload: dict) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / name).write_text(
        json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    log(f"  wrote {name}")


# --------------------------------------------------------------- climate ----
def build_climate() -> bool:
    log("Climate normals (NASA POWER climatology, MERRA-2 reanalysis)…")
    rows, missing = [], []

    for s in SITES:
        d = get(POWER.format(lat=s["lat"], lon=s["lon"]))
        if not d:
            missing.append(s["name"])
            log(f"  {s['name']}: no response")
            continue
        try:
            params = d["properties"]["parameter"]
        except (KeyError, TypeError):
            missing.append(s["name"])
            log(f"  {s['name']}: unexpected payload shape")
            continue

        months = []
        for i, m in enumerate(MONTHS, start=1):
            def val(p):
                # POWER keys months as 'JAN'... in climatology mode. A fill
                # value is an absent reading and must stay null, never 0 and
                # never -999: both would render as a real number on the page.
                v = params.get(p, {}).get(m)
                if v is None or v <= POWER_FILL + 1:
                    return None
                return round(float(v), 1)
            months.append({
                "month": i,
                # NAMING MATTERS HERE, and the first version got it wrong.
                # In POWER's CLIMATOLOGY mode, T2M_MAX and T2M_MIN are the
                # extremes observed in that month across the whole record —
                # the hottest and coldest hours ever measured — NOT the mean
                # daily maximum and minimum. The difference is not academic:
                # Giza's January T2M_MAX is 29.1 °C against a published mean
                # daily max of about 19 °C, and its T2M_MIN of 1.4 °C is
                # Cairo's record low, not a typical January night.
                #
                # Only T2M is a mean, and it is a good one: 12.1 °C in January
                # and 29.9 in August against Cairo's published 14 and 29.
                #
                # The fields are named for what they are so the page cannot
                # mislabel them again.
                "t_mean": val("T2M"),
                "t_record_max": val("T2M_MAX"),
                "t_record_min": val("T2M_MIN"),
                "rain_mm_day": val("PRECTOTCORR"),
            })

        if not any(m["t_mean"] is not None for m in months):
            missing.append(s["name"])
            log(f"  {s['name']}: every month empty — treated as no data")
            continue

        rows.append({"key": s["key"], "name": s["name"], "name_ar": s["name_ar"],
                     "gov": s["gov"], "lat": s["lat"], "lon": s["lon"],
                     "unesco": s["unesco"], "months": months})
        hot = max((m["t_mean"] for m in months if m["t_mean"] is not None), default=None)
        log(f"  {s['name']}: ok (warmest monthly mean {hot} °C)")

    if len(rows) < MIN_CLIMATE_SITES:
        log(f"  SKIP climate: only {len(rows)} sites resolved "
            f"(<{MIN_CLIMATE_SITES}) — keeping last-good")
        return False

    write("visit-climate.json", {
        "as_of": date.today().isoformat(),
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "NASA POWER climatology (MERRA-2 reanalysis)",
        "source_url": "https://power.larc.nasa.gov/",
        "license": "Public domain (US Government) — cite NASA POWER",
        "note": ("Long-term monthly means from NASA's POWER climatology API, which "
                 "derives them from the MERRA-2 reanalysis. These are MODELLED "
                 "long-run averages, not weather-station observations and not a "
                 "forecast: they answer what a month is typically like at this "
                 "spot, and say nothing about any particular day.\n\n"
                 "t_mean is the long-run MEAN temperature for that month and is the "
                 "figure to quote. t_record_max and t_record_min are the EXTREMES "
                 "observed across the whole record — the hottest and coldest hours "
                 "ever measured in that month — not the mean daily high and low. "
                 "They are useful for 'how bad can it get' and wrong for 'what is a "
                 "normal day like'. Temperatures are °C; rainfall is the mean "
                 "millimetres per day for that month."),
        "missing": missing,
        "sites": rows,
    })
    return True


# --------------------------------------------------------------- terrain ----
def build_terrain() -> bool:
    log("Elevation (NASA SRTM 30 m via Open-Topo-Data)…")

    # One request for all sites rather than one each: the endpoint accepts a
    # pipe-separated location list, and a public free instance deserves 1
    # request instead of 18. Same reasoning as the streets amenity query.
    pairs = "|".join(f'{s["lat"]},{s["lon"]}' for s in SITES)
    d = get(ELEV.format(pairs=pairs))
    rows, missing = [], []

    if d and d.get("status") == "OK" and isinstance(d.get("results"), list):
        for s, r in zip(SITES, d["results"]):
            e = r.get("elevation")
            if e is None:
                missing.append(s["name"])
                continue
            rows.append({"key": s["key"], "name": s["name"],
                         "lat": s["lat"], "lon": s["lon"],
                         "elevation_m": round(float(e), 1)})
    else:
        log("  no usable response from the elevation service")
        missing = [s["name"] for s in SITES]

    if len(rows) < MIN_TERRAIN_SITES:
        log(f"  SKIP terrain: only {len(rows)} sites resolved "
            f"(<{MIN_TERRAIN_SITES}) — keeping last-good")
        return False

    lo = min(rows, key=lambda r: r["elevation_m"])
    hi = max(rows, key=lambda r: r["elevation_m"])
    log(f"  ok: {len(rows)} sites, {lo['name']} {lo['elevation_m']} m → "
        f"{hi['name']} {hi['elevation_m']} m")

    write("visit-terrain.json", {
        "as_of": date.today().isoformat(),
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": "NASA SRTM 30 m (SRTMGL1 v003) via Open-Topo-Data",
        "source_url": "https://www.opentopodata.org/datasets/srtm/",
        "license": "Public domain (NASA/USGS)",
        "note": ("Ground elevation sampled from NASA's Shuttle Radar Topography "
                 "Mission 30 m digital elevation model at each site's own "
                 "coordinates. SRTM measures the reflective surface, so in built-up "
                 "or densely vegetated places the figure can sit slightly above bare "
                 "ground. It is a real measurement of the land, not a rendering."),
        "missing": missing,
        "sites": rows,
    })
    return True


def main() -> None:
    log(f"EgyBI visitor layer — {len(SITES)} sites\n")
    ok_climate = build_climate()
    log("")
    ok_terrain = build_terrain()

    failed = [n for n, ok in (("climate", ok_climate), ("terrain", ok_terrain)) if not ok]
    if failed:
        # Same contract as every other pipeline here: layers that built are
        # written and committed, layers that did not keep their last-good file,
        # and the run still exits non-zero so a partial build is never mistaken
        # for a complete one.
        sys.exit("\nFAILED layers (last-good files kept): " + ", ".join(failed))
    log("\nAll visitor layers built.")


if __name__ == "__main__":
    main()
