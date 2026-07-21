#!/usr/bin/env python3
"""
EgyBI — daily RETAIL product-price pipeline (official IDSC / Cabinet source).

Fetches real, daily Egyptian *retail* (consumer) prices and writes two static JSON
files the prices page reads directly:
    site/data/prices-today.json    -- the latest snapshot (one entry per item)
    site/data/prices-history.json  -- append-only per-item history (min/max/avg)

Source: the official **بوابة الأسعار المحلية والعالمية** run by the Information &
Decision Support Center (IDSC) of the Egyptian Cabinet. Its public site
(agriprice.gov.eg) is a React app backed by a JSON API at
`http://app.prices.idsc.gov.eg/api`. We read that API directly — so this is clean
structured data, *not* HTML scraping. It reports **retail** prices (what a consumer
pays), across 9 categories: groceries, vegetables, grains/pulses, meat & poultry,
dairy, fish, fruit, fertilisers, building materials — updated daily, in EGP, with a
daily change % and per-item annual min/max.

Design goals (per the project content rule — every fact real & cited):
  * Only real API values are written; nothing is invented. Each item carries the
    source, its unit, and the API's own insertionDate as `as_of`.
  * A guardrail aborts (keeping the last-good files) if the API is unreachable or
    the item count collapses — bad data never overwrites good data.
  * --offline replays a bundled fixture (fixtures/idsc_sample.json) so the plumbing
    is testable with no network (here and in CI).
  * --dry-run fetches + transforms + prints a summary but writes nothing.

The IDSC hosts are HTTP-only (and sibling gov hosts have expired SSL certs), so the
fetch is deliberately cert-tolerant — which is why this runs as a Python job (ideally
a daily GitHub Action that commits the JSON) rather than in the browser or the
read-only PHP API.

Usage:
  python backend/pipeline/fetch_prices.py --dry-run   # fetch + transform + summary, write nothing
  python backend/pipeline/fetch_prices.py             # fetch live + write site/data/*.json
  python backend/pipeline/fetch_prices.py --offline   # transform the bundled fixture (no network)
"""
import argparse
import datetime
import json
import os
import ssl
import sys
import urllib.request


def _force_utf8_output() -> None:
    """Make stdout/stderr safe for non-ASCII, on every platform.

    This script prints Arabic product names. A Windows console defaults to a
    legacy code page (cp1252 here) which cannot encode them, so `print` raised
    UnicodeEncodeError and killed the process — *after* a successful fetch and
    transform. A working run reported itself as a crash, purely because of the
    terminal it happened to be printing to.

    Reconfiguring to UTF-8 writes correct bytes wherever the terminal supports
    it (Windows Terminal, any modern shell, CI). `errors="replace"` is the
    backstop for a genuinely legacy console: characters degrade to '?' instead
    of taking the whole job down. Data written to disk is unaffected either way
    — the JSON writer already specifies its own encoding.
    """
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError, OSError):
            pass          # Python < 3.7, or a stream that cannot be reconfigured


_force_utf8_output()

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "..", "..", "site", "data")
FIXTURE = os.path.join(HERE, "fixtures", "idsc_sample.json")
API = "http://app.prices.idsc.gov.eg/api"

SOURCE = {
    "name_ar": "بوابة الأسعار المحلية والعالمية — مركز معلومات مجلس الوزراء",
    "name_en": "IDSC Local Prices Portal (Egyptian Cabinet)",
    "url": "http://www.agriprice.gov.eg/",
    "kind": "retail",
    "cadence": "daily",
}
MIN_ITEMS = 40  # guardrail: the portal normally lists ~130 retail items.

# Stable IDSC general-indicator id -> our category key. The first nine are the
# populated food categories; the rest are the extra categories the fuller
# GetGeneralIndicators endpoint exposes. Several are declared-but-empty today
# (Petroleum, gold, mobile phones, …) — mapping them now means they render with
# a proper bilingual label the day IDSC starts populating them, no code change.
CAT_KEY = {5: "grocery", 1: "vegetable", 11: "grain", 7: "meat",
           8: "dairy", 3: "fish", 2: "fruit", 19: "fertiliser", 18: "building",
           20: "farm", 15: "commodity", 28: "crops", 21: "petroleum", 27: "metals",
           24: "livestock", 30: "strategic", 31: "gold", 32: "school",
           33: "ramadan", 34: "baby", 36: "electronics"}


def _ctx():
    c = ssl.create_default_context()
    c.check_hostname = False
    c.verify_mode = ssl.CERT_NONE  # IDSC hosts are HTTP-only / sibling certs expired
    return c


def api_get(path):
    req = urllib.request.Request(API + path,
                                 headers={"User-Agent": "EgyBI-price-bot/1.0 (+https://egybi.com)",
                                          "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30, context=_ctx()) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def fetch_live():
    """Return the same shape as the fixture: {categories, retail{cid:[...]}, names{cid:{id:en}}}."""
    # GetGeneralIndicators returns the full 21 categories (vs 9 for the "Local"
    # endpoint), so newly-populated categories are picked up automatically. Empty
    # ones simply contribute no items; the item guardrail still protects us.
    cats = api_get("/PricesData/GetGeneralIndicators")
    retail, wholesale, names = {}, {}, {}
    for c in cats:
        cid = c["id"]
        d = api_get("/PricesData/GetGeneralIndicatorAllData/%s" % cid)
        retail[cid] = d.get("retail") or []
        wholesale[cid] = d.get("wholesale") or []
        nm = {}
        try:
            mi_d = api_get("/PricesData/GetMainIndicatorsPerGeneralIndicator?generalIndicatorId=%s" % cid)
            for grp in (mi_d if isinstance(mi_d, list) else [mi_d]):
                for mi in grp.get("mainIndicators", []):
                    if mi.get("nameE"):
                        nm[mi["id"]] = mi["nameE"].strip()
        except Exception:
            pass
        names[cid] = nm
    return {"categories": cats, "retail": retail, "wholesale": wholesale, "names": names}


def _cid(k):
    try:
        return int(k)
    except (TypeError, ValueError):
        return k


def transform(bundle, view):
    """Flatten one IDSC price view ('retail' or 'wholesale') into a clean item list + date."""
    data = bundle.get(view) or {}
    names = {_cid(k): v for k, v in bundle.get("names", {}).items()}
    items, as_ofs = [], []
    # The API lists some products in more than one *packaging/measure* under the
    # same indicatorId — e.g. مكرونة sold by كيلو and by 400 جرام, or خس sold
    # واحدة and by ربطة. Those are genuinely different things a shopper buys at
    # different prices, so we keep each distinct UNIT as its own item instead of
    # silently dropping it. A true repeat (same indicator *and* same unit) is
    # still collapsed. Per indicator, the first unit keeps the stable slug
    # `idsc-<id>` (so its history is unbroken); extra units get `idsc-<id>-2`,
    # `-3`, … — ASCII-safe slugs (they become HTML ids and history keys).
    units_seen = {}   # ind_id -> [units emitted, in order]
    for cid_raw, rows in data.items():
        cid = _cid(cid_raw)
        cat = CAT_KEY.get(cid, "other")
        nmap = {int(k): v for k, v in (names.get(cid, {}) or {}).items()} if names.get(cid) else {}
        for it in rows:
            avg = it.get("avgPrice")
            if avg is None:
                continue
            ind_id = it.get("indicatorId")
            unit = (it.get("unit") or "").strip() or None
            emitted = units_seen.setdefault(ind_id, [])
            if unit in emitted:      # same product, same measure already kept — a true duplicate
                continue
            variant_ix = len(emitted)
            emitted.append(unit)
            slug = "idsc-%s" % ind_id if variant_ix == 0 else "idsc-%s-%d" % (ind_id, variant_ix + 1)
            # signed daily change %: magnitude from percent field, direction from the abs change
            chg_abs = it.get("changeRateDaialy") or 0
            chg_pct = it.get("changeRatePercentDaialy") or 0
            signed_pct = round((-chg_pct if chg_abs < 0 else chg_pct), 1)
            as_of = (it.get("insertionDate") or "")[:10] or None
            if as_of:
                as_ofs.append(as_of)
            items.append({
                "slug": slug,
                "name_ar": (it.get("indictorName") or "").strip(),
                "name_en": nmap.get(ind_id),
                "category": cat,
                "unit": unit,
                "min": it.get("minPrice"),
                "max": it.get("maxPrice"),
                "avg": round(avg, 2),
                "change_pct": signed_pct,
            })
    as_of = max(as_ofs) if as_ofs else datetime.date.today().isoformat()
    return as_of, items


def load_json(path, default):
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return default


def main():
    ap = argparse.ArgumentParser(description="Fetch daily Egyptian RETAIL prices (IDSC) -> site/data/*.json")
    ap.add_argument("--offline", action="store_true", help="transform the bundled fixture instead of the network")
    ap.add_argument("--dry-run", action="store_true", help="fetch + transform + summary, write nothing")
    args = ap.parse_args()

    if args.offline:
        with open(FIXTURE, encoding="utf-8") as f:
            bundle = json.load(f)
        print("[offline] transforming fixture:", os.path.relpath(FIXTURE))
    else:
        try:
            bundle = fetch_live()
        except Exception as e:
            print(f"ABORT: could not reach the IDSC prices API -> {type(e).__name__}: {e}", file=sys.stderr)
            print("Keeping the last-good JSON files untouched.", file=sys.stderr)
            return 2

    views = {}
    for v in ("retail", "wholesale"):
        as_of_v, items_v = transform(bundle, v)
        views[v] = {"as_of": as_of_v, "count": len(items_v),
                    "items": sorted(items_v, key=lambda x: (x["category"], x["name_ar"]))}
        cats = {}
        for it in items_v:
            cats[it["category"]] = cats.get(it["category"], 0) + 1
        print(f"{v.upper():<9} {len(items_v):>3} items (as_of {as_of_v}): " +
              ", ".join(f"{k}={n}" for k, n in sorted(cats.items())))

    # guardrail on the primary (retail) view — bad data never overwrites good
    if views["retail"]["count"] < MIN_ITEMS:
        print(f"ABORT: only {views['retail']['count']} retail items (< {MIN_ITEMS}). The API shape likely changed.",
              file=sys.stderr)
        print("Keeping the last-good JSON files untouched.", file=sys.stderr)
        return 3

    if args.dry_run:
        print("[dry-run] not writing. Sample retail rows:")
        for it in views["retail"]["items"][:6]:
            print(f"  {it['name_ar']:<20} {it['min']}-{it['max']} EGP/{it['unit']}  ({it['change_pct']:+}%)")
        return 0

    os.makedirs(DATA_DIR, exist_ok=True)
    today = {
        "source": SOURCE,
        "fetched_at": datetime.date.today().isoformat(),
        "currency": "EGP",
        "retail": views["retail"],
        "wholesale": views["wholesale"],
    }
    today_path = os.path.join(DATA_DIR, "prices-today.json")
    with open(today_path, "w", encoding="utf-8") as f:
        json.dump(today, f, ensure_ascii=False, indent=1)

    # history — one namespace per view, one point per (slug, as_of)
    hist_path = os.path.join(DATA_DIR, "prices-history.json")
    hist = load_json(hist_path, {})
    if "series" in hist and "retail" not in hist:      # migrate the old single-view shape
        hist = {"retail": {"series": hist.get("series", {})}}
    added = {}
    for v in ("retail", "wholesale"):
        node = hist.setdefault(v, {"series": {}})
        series = node.setdefault("series", {})
        as_of_v = views[v]["as_of"]
        n = 0
        for it in views[v]["items"]:
            pts = series.setdefault(it["slug"], [])
            if not any(p["as_of"] == as_of_v for p in pts):
                pts.append({"as_of": as_of_v, "min": it["min"], "max": it["max"], "avg": it["avg"]})
                pts.sort(key=lambda p: p["as_of"])
                n += 1
        added[v] = n
    hist["updated"] = datetime.date.today().isoformat()
    with open(hist_path, "w", encoding="utf-8") as f:
        json.dump(hist, f, ensure_ascii=False, indent=1)

    print(f"Wrote {os.path.relpath(today_path)} (retail {views['retail']['count']} / "
          f"wholesale {views['wholesale']['count']}); new history points: "
          f"retail +{added['retail']}, wholesale +{added['wholesale']}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
