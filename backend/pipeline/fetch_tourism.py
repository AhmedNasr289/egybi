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
POWER is a *model reanalysis* (MERRA-2), not a weather station reading, and the
difference matters enough to print: it is excellent for "how hot is Aswan in
July" and wrong to quote as "the temperature on the day you visit". The page
says so.

TWO ENDPOINTS, BECAUSE ONE OF THEM DOES NOT MEAN WHAT IT LOOKS LIKE.

  * temporal/CLIMATOLOGY gives T2M as a genuine long-run monthly mean, and
    T2M_MAX / T2M_MIN as the EXTREMES across the whole record — the hottest and
    coldest hours ever measured in that month. An earlier version of this file
    published those as the "mean daily maximum" and put Giza's August at 45 C
    when a typical afternoon is nearer 35. They are kept, because "how bad can
    it get" is a real question, but they are named t_record_max / t_record_min.

  * temporal/DAILY gives one maximum and one minimum per calendar day.
    Averaging every January day across twenty years is the climatological MEAN
    DAILY MAXIMUM — the figure a visitor deciding between February and August
    actually wants, and the one neither of the other endpoints can provide.
    Published as t_daily_max / t_daily_min. (temporal/MONTHLY was tried in
    between and is also wrong: its T2M_MAX is that single month's hottest hour,
    so averaging twenty of them averages twenty annual peaks.)

So the page can now say all three honestly: what a month averages, what a
normal afternoon reaches, and what the record holds. That needed a better use
of the source already adopted rather than a new vendor — Open-Meteo would have
answered it too, but its free tier is for non-commercial use and this site
carries advertising, which is exactly the kind of ambiguity the open-source
constraint exists to avoid. POWER is US-Government public domain with no such
question attached.

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

# Twenty full years. Long enough that a single hot summer cannot move a monthly
# mean much, recent enough to describe the climate a visitor will actually meet
# rather than the one their grandparents would have. Both ends are inclusive.
NORM_START, NORM_END = 2001, 2020
# The DAILY endpoint, not the monthly one. This is the second wrong turn on the
# same question and the reason for the reference check below.
#
#   climatology T2M_MAX -> the hottest hour in that month across the WHOLE
#                          record. Cairo January: 29.1 C.
#   monthly     T2M_MAX -> the hottest hour in that ONE month and year.
#                          Averaged over 20 years, Cairo January: 24.7 C.
#   daily       T2M_MAX -> that day's maximum. Averaged over every January day
#                          in 20 years: the mean daily maximum, which is what a
#                          visitor is asking for. Cairo January: about 19 C.
#
# The first two both look like a mean daily maximum in a JSON payload and are
# out by 6 to 8 degrees. Only the third is one.
POWER_DAILY = ("https://power.larc.nasa.gov/api/temporal/daily/point"
               "?parameters=T2M_MAX,T2M_MIN&community=RE"
               "&longitude={lon}&latitude={lat}"
               f"&start={NORM_START}0101&end={NORM_END}1231&format=JSON")
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
def true_daily_means(lat: float, lon: float) -> dict[int, dict] | None:
    """The climatological MEAN DAILY maximum and minimum, per calendar month.

    POWER's DAILY endpoint returns one value per day. Averaging every January
    day across NORM_START..NORM_END gives the mean daily maximum for January —
    what a normal afternoon actually reaches, which neither the climatology nor
    the monthly endpoint can provide (see the note beside POWER_DAILY).

    Returns {1..12: {"t_daily_max": x, "t_daily_min": y, "years": n}} or None if
    the endpoint could not be reached. Never invents a month it has no years for.
    """
    d = get(POWER_DAILY.format(lat=lat, lon=lon))
    if not d:
        return None
    try:
        params = d["properties"]["parameter"]
    except (KeyError, TypeError):
        return None

    buckets: dict[int, dict[str, list]] = {m: {"max": [], "min": []} for m in range(1, 13)}
    for key, field in (("T2M_MAX", "max"), ("T2M_MIN", "min")):
        for stamp, v in (params.get(key) or {}).items():
            # Keys are YYYYMMDD in daily mode.
            if len(stamp) != 8:
                continue
            mm = int(stamp[4:6])
            if not 1 <= mm <= 12:
                continue
            if v is None or float(v) <= POWER_FILL + 1:
                continue
            buckets[mm][field].append(float(v))

    out = {}
    for mm in range(1, 13):
        hi, lo = buckets[mm]["max"], buckets[mm]["min"]
        # Roughly 600 daily readings per calendar month over twenty years.
        # Require most of them: a mean over a handful of scattered days is not
        # a climatology and should read as absent rather than as a normal.
        if len(hi) < 300:
            continue
        out[mm] = {
            "t_daily_max": round(sum(hi) / len(hi), 1),
            "t_daily_min": round(sum(lo) / len(lo), 1) if lo else None,
            "days": len(hi),
        }
    return out or None


# --------------------------------------------------------------- yardstick --
# The mean daily maximum was got wrong TWICE here, the same way both times: a
# POWER parameter was assumed to mean what its name suggests instead of being
# checked against something known. The climatology endpoint's T2M_MAX put
# Cairo's August at 45 °C; the monthly endpoint's, averaged, put it at 41. A
# normal August afternoon in Cairo is about 35. Both shipped under the words
# "mean daily maximum" before a human caught them.
#
# So the pipeline now checks itself against an INDEPENDENT source — one that
# cannot be fooled by the same misreading, because it is not POWER.
#
# THE THIRD MISTAKE THIS AVOIDS. The first version of this guard hardcoded a
# handful of published normals written down from memory. That is the same sin
# in a smaller font: an unsourced number used to validate a sourced one. If the
# remembered figure is wrong, the guard either passes bad data or blocks good
# data, and there is no way to tell which. So the yardstick is FETCHED and
# CITED like everything else on this site.
#
# The source is the World Meteorological Organization's World Weather
# Information Service, which publishes official climatological normals supplied
# by each country's own national weather service — for Egypt, the Egyptian
# Meteorological Authority. Its maxTemp / minTemp fields are explicitly the mean
# daily maximum and minimum, which is exactly the quantity under test. No key,
# no account, free to fetch, and every figure attributable to a named authority
# with a stated normal period.
#
# It is fetched at build time and cached into the repo, so a later run whose
# network cannot reach WWIS still validates against real fetched data rather
# than against nothing. The cache records where each number came from.
WWIS_LIST = "https://worldweather.wmo.int/en/json/full_city_list.txt"
WWIS_CITY = "https://worldweather.wmo.int/en/json/{cid}_en.json"
STATION_FILE = "visit-station-normals.json"

# How far a station may sit from a site and still be a fair yardstick for it.
# Egypt's climate changes fast with distance from the coast and slowly along the
# valley, so this is deliberately tight: Alexandria's normals describe Giza
# badly, and that is the point of a distance cap rather than a nearest-match.
MAX_STATION_KM = 120.0

# --- the two gates, and why they are shaped like this ------------------------
#
# A single per-cell tolerance cannot do this job, because it conflates two
# completely different things:
#
#   * READING THE WRONG VARIABLE — which is what happened, twice. It biases
#     EVERY cell, in the SAME direction, by a large amount. The climatology
#     mistake ran about +10 °C across the board; the monthly one +2 to +7.6.
#   * A REANALYSIS DISAGREEING WITH A STATION — which is not an error at all.
#     MERRA-2 resolves roughly half a degree of latitude, so one cell can cover
#     coast and desert together, and it carries no irrigation, so over the
#     watered Delta in summer it runs warm. Those residuals are real, signed
#     both ways, and must not be smoothed away or silently absorbed.
#
# So the gates test for the SHAPE of the first, not the SIZE of the second:
#
#   Gate A — mean signed bias. A wrong variable shifts the whole set one way.
#            A model-versus-station difference does not: it goes both ways and
#            largely cancels. Set at 2.0, comfortably under both observed
#            mistakes and comfortably over published reanalysis-vs-station
#            residuals for 2 m temperature.
#   Gate B — hit rate. A wrong variable misses almost every cell. The right one
#            lands most of them close. Requiring a third of pairs within 2 °C
#            catches a mistake that happens to average out by cancelling.
#
# Neither number was chosen to make a particular run pass; both are stated in
# terms of the failure they exclude, and the run prints every pair either way so
# the judgement is auditable rather than a verdict.
MAX_MEAN_BIAS = 2.0
NEAR_C = 2.0
MIN_NEAR_SHARE = 0.33


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    from math import asin, cos, radians, sin, sqrt
    dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
    a = (sin(dlat / 2) ** 2
         + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2)
    return 2 * 6371.0088 * asin(sqrt(a))


def _num(v):
    """WWIS reports temperatures as strings, and uses an empty string for a
    month it has no normal for. Anything that is not a number is absent."""
    try:
        f = float(str(v).strip())
    except (TypeError, ValueError):
        return None
    return None if f < -90 or f > 70 else round(f, 1)


def _find_climate_months(payload) -> list | None:
    """WWIS nests the monthly normals a couple of levels down and has moved
    them before. Walk the structure for the first list whose members carry a
    month and a maxTemp, rather than hardcoding a path that can shift."""
    stack = [payload]
    while stack:
        node = stack.pop()
        if isinstance(node, dict):
            stack.extend(node.values())
        elif isinstance(node, list):
            if node and isinstance(node[0], dict) and "month" in node[0] \
                    and any(k in node[0] for k in ("maxTemp", "maxTempF")):
                return node
            stack.extend(node)
    return None


def fetch_station_normals() -> dict | None:
    """Egypt's published station normals from WMO/WWIS, or None if unreachable.

    Returns {"fetched_at":…, "source":…, "stations":[{name, lat, lon, period,
    months:{1..12:{max,min}}}]}. Only stations with at least six months of mean
    daily maxima are kept; a station with two months is not a normal.
    """
    raw = None
    for attempt in range(1, 4):
        try:
            req = urllib.request.Request(WWIS_LIST, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read().decode("utf-8", errors="replace")
            break
        except Exception as e:  # noqa: BLE001
            log(f"    WWIS city list attempt {attempt}: {type(e).__name__}")
            if attempt < 3:
                time.sleep(5 * attempt)
    if not raw:
        return None

    egypt = []
    for line in raw.splitlines():
        parts = [p.strip() for p in line.split(";")]
        if len(parts) < 5 or parts[0].lower() != "egypt":
            continue
        try:
            egypt.append({"name": parts[1], "cid": parts[2],
                          "lat": float(parts[3]), "lon": float(parts[4])})
        except ValueError:
            continue
    if not egypt:
        log("    WWIS city list carried no Egyptian stations — shape changed?")
        return None
    log(f"    WWIS lists {len(egypt)} Egyptian stations")

    stations = []
    for st in egypt:
        d = get(WWIS_CITY.format(cid=st["cid"]), tries=2, pause=3.0)
        if not d:
            continue
        months = _find_climate_months(d)
        if not months:
            continue
        got = {}
        for m in months:
            try:
                mm = int(str(m.get("month")).strip())
            except (TypeError, ValueError):
                continue
            if not 1 <= mm <= 12:
                continue
            hi, lo = _num(m.get("maxTemp")), _num(m.get("minTemp"))
            if hi is not None:
                got[mm] = {"max": hi, "min": lo}
        if len(got) < 6:
            continue
        # The normal period is stated in the payload; carry it, because "the
        # 1961–1990 normal" and "the 1991–2020 normal" are different numbers
        # and a comparison that hides which one it used is not a citation.
        period = ""
        for k in ("climateFrom", "climate_from", "from"):
            v = _walk_first(d, k)
            if v:
                period = str(v)
                break
        for k in ("climateTo", "climate_to", "to"):
            v = _walk_first(d, k)
            if v:
                period = f"{period}–{v}" if period else str(v)
                break
        stations.append({"name": st["name"], "lat": st["lat"], "lon": st["lon"],
                         "period": period,
                         "months": {str(k): v for k, v in sorted(got.items())}})
        log(f"    {st['name']}: {len(got)} monthly normals"
            + (f" ({period})" if period else ""))

    if not stations:
        return None
    return {
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": ("World Meteorological Organization — World Weather Information "
                   "Service; normals supplied by the Egyptian Meteorological "
                   "Authority"),
        "source_url": "https://worldweather.wmo.int/",
        "quantity": "Mean daily maximum and minimum temperature, °C",
        "stations": stations,
    }


def _walk_first(payload, key):
    stack = [payload]
    while stack:
        node = stack.pop()
        if isinstance(node, dict):
            if key in node and node[key] not in (None, ""):
                return node[key]
            stack.extend(node.values())
        elif isinstance(node, list):
            stack.extend(node)
    return None


def load_station_normals() -> tuple[dict | None, str]:
    """Fetch the yardstick, falling back to the copy committed in this repo.

    The fallback is real fetched data from an earlier run, not a remembered
    number, so validating against it is honest. Which one was used is returned
    and printed, because "checked against a cached yardstick" and "checked
    against a live one" are different claims.
    """
    live = fetch_station_normals()
    if live:
        write(STATION_FILE, live)
        return live, "fetched live"
    cached = OUT_DIR / STATION_FILE
    if cached.exists():
        try:
            d = json.loads(cached.read_text(encoding="utf-8"))
            if d.get("stations"):
                return d, f"cached copy fetched {d.get('fetched_at', 'unknown')}"
        except Exception:  # noqa: BLE001
            pass
    return None, "unavailable"


def reference_check(rows: list, normals: dict) -> tuple[bool, list, list]:
    """Compare every computed mean daily maximum against the nearest published
    station normal within MAX_STATION_KM.

    Returns (ok, notes, pairs). `pairs` is the full comparison, which is written
    into the published JSON: a validation the reader cannot see is a validation
    they have to take on trust, and this project does not ask for that.
    """
    stations = normals["stations"]
    pairs, notes = [], []

    for r in rows:
        near = [(haversine_km(r["lat"], r["lon"], s["lat"], s["lon"]), s)
                for s in stations]
        near.sort(key=lambda t: t[0])
        if not near or near[0][0] > MAX_STATION_KM:
            continue
        km, st = near[0]
        for m in r["months"]:
            got = m.get("t_daily_max")
            ref = (st["months"].get(str(m["month"])) or {}).get("max")
            if got is None or ref is None:
                continue
            pairs.append({"site": r["key"], "month": m["month"],
                          "station": st["name"], "station_km": round(km, 1),
                          "period": st.get("period", ""),
                          "model_c": got, "station_c": ref,
                          "delta_c": round(got - ref, 1)})

    if not pairs:
        notes.append("no site fell within "
                     f"{MAX_STATION_KM:.0f} km of a published station — "
                     "nothing could be checked")
        return False, notes, pairs

    deltas = [p["delta_c"] for p in pairs]
    mean_bias = sum(deltas) / len(deltas)
    near_n = sum(1 for d in deltas if abs(d) <= NEAR_C)
    near_share = near_n / len(deltas)

    by_site: dict[str, list] = {}
    for p in pairs:
        by_site.setdefault(f'{p["site"]} vs {p["station"]} ({p["station_km"]:.0f} km)',
                           []).append(p["delta_c"])
    for label, ds in sorted(by_site.items()):
        notes.append(f"{label}: mean {sum(ds)/len(ds):+.1f} °C over {len(ds)} months "
                     f"(worst {max(ds, key=abs):+.1f})")

    ok_a = abs(mean_bias) <= MAX_MEAN_BIAS
    ok_b = near_share >= MIN_NEAR_SHARE
    notes.append(f"GATE A  mean signed bias {mean_bias:+.2f} °C over {len(pairs)} "
                 f"site-months (limit ±{MAX_MEAN_BIAS}) — "
                 + ("pass" if ok_a else "FAIL"))
    notes.append(f"GATE B  within {NEAR_C:.0f} °C: {near_n}/{len(pairs)} = "
                 f"{near_share*100:.0f}% (floor {MIN_NEAR_SHARE*100:.0f}%) — "
                 + ("pass" if ok_b else "FAIL"))
    return ok_a and ok_b, notes, pairs


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

        # Second request: the true mean daily max/min. If it fails the site
        # still publishes with its climatology figures and the daily means read
        # as absent, because a missing normal is not a reason to drop a site.
        daily = true_daily_means(s["lat"], s["lon"])

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
                # From the DAILY endpoint, averaged across the normal window.
                # Null rather than absent-key so the page can tell "we have no
                # normal for this month" from "this field does not exist".
                "t_daily_max": (daily or {}).get(i, {}).get("t_daily_max"),
                "t_daily_min": (daily or {}).get(i, {}).get("t_daily_min"),
            })

        if not any(m["t_mean"] is not None for m in months):
            missing.append(s["name"])
            log(f"  {s['name']}: every month empty — treated as no data")
            continue

        rows.append({"key": s["key"], "name": s["name"], "name_ar": s["name_ar"],
                     "gov": s["gov"], "lat": s["lat"], "lon": s["lon"],
                     "unesco": s["unesco"], "months": months})
        hot = max((m["t_daily_max"] for m in months if m.get("t_daily_max") is not None),
                  default=None)
        if hot is None:
            hot = max((m["t_mean"] for m in months if m["t_mean"] is not None), default=None)
        log(f"  {s['name']}: ok (hottest month averages {hot} °C by day)")

    if len(rows) < MIN_CLIMATE_SITES:
        log(f"  SKIP climate: only {len(rows)} sites resolved "
            f"(<{MIN_CLIMATE_SITES}) — keeping last-good")
        return False

    log("\n  yardstick — published station normals (WMO / World Weather "
        "Information Service):")
    normals, provenance = load_station_normals()
    if not normals:
        log("  SKIP climate: no independent yardstick could be fetched or "
            "loaded, so the computed normals cannot be checked. Publishing an "
            "unchecked figure is exactly how this went wrong twice. "
            "Keeping last-good.")
        return False
    log(f"    using {len(normals['stations'])} stations ({provenance})")

    log("\n  reference check — computed mean daily max vs station normals:")
    ok, notes, pairs = reference_check(rows, normals)
    for n in notes:
        log(f"    {n}")
    if not ok:
        log("  SKIP climate: the computed daily normals fail their own "
            "reference check. That is the signature of a wrong POWER "
            "parameter, and it has happened twice. Keeping last-good.")
        return False
    log("  reference check passed")

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
                 "Three temperature figures per month, and they answer three "
                 "different questions. t_daily_max and t_daily_min are the "
                 f"CLIMATOLOGICAL MEAN DAILY high and low, averaged over {NORM_START}"
                 f"\u2013{NORM_END} from POWER's daily series — what a normal "
                 "afternoon and night actually reach, and the figures to quote to a "
                 "visitor. t_mean is the long-run mean across the whole day. "
                 "t_record_max and t_record_min are the EXTREMES across the entire "
                 "record, the hottest and coldest hours ever measured in that month; "
                 "they answer 'how bad can it get' and are wrong for 'what is a "
                 "normal day like'. Temperatures are °C; rainfall is the mean "
                 "millimetres per day for that month."),
        "normal_window": f"{NORM_START}-{NORM_END}",
        # The validation, published rather than merely performed. Every pair the
        # gate looked at is here — including the ones where the model and the
        # station disagree most — so a reader can judge the figures instead of
        # trusting them. Smoothing these away would be the dishonest move.
        "validation": {
            "method": ("Every computed mean daily maximum is compared against the "
                       "nearest published station normal within "
                       f"{MAX_STATION_KM:.0f} km. The build is refused if the mean "
                       f"signed bias exceeds ±{MAX_MEAN_BIAS} °C, or if fewer than "
                       f"{MIN_NEAR_SHARE * 100:.0f}% of site-months land within "
                       f"{NEAR_C:.0f} °C. Those two gates test for a wrongly-read "
                       "variable, which shifts every cell the same way; they are "
                       "not a claim that the model equals the station."),
            "reference_source": normals.get("source"),
            "reference_source_url": normals.get("source_url"),
            "reference_provenance": provenance,
            "known_divergence": ("MERRA-2, which POWER derives these from, resolves "
                                 "about half a degree of latitude and carries no "
                                 "irrigation. Over the watered Delta in summer it "
                                 "therefore runs warmer than a coastal or city "
                                 "station — the residuals below are largest exactly "
                                 "there, and smallest over the desert reaches where "
                                 "the model's dry land matches the real one."),
            "pairs": pairs,
        },
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
