#!/usr/bin/env python3
"""
EgyBI — daily Egyptian-pound EXCHANGE-RATE pipeline.

Fetches how many Egyptian pounds (EGP) one unit of each major currency buys, and
writes two static JSON files the Prices page's currency band reads directly:
    site/data/fx-today.json    -- the latest snapshot (one entry per currency)
    site/data/fx-history.json  -- append-only per-currency history (EGP value)

Source: **ExchangeRate-API's free open endpoint** (open.er-api.com) — no key, no
signup, updated daily, and free to use with attribution (which the UI shows).
These are **market reference rates**, not the Central Bank of Egypt's official
fixing — the page says so plainly. (If you later confirm a clean CBE official
endpoint, this same pipeline can be pointed at it.)

Design goals (same rules as the price pipeline — every figure real & cited):
  * Only real API values are written; nothing is invented. Each currency carries
    the source, the API's update timestamp, and a day-on-day change computed from
    our own append-only history (not fabricated).
  * A guardrail aborts (keeping the last-good files) if the API is unreachable or
    returns fewer than a handful of the currencies we expect — bad data never
    overwrites good data.
  * --offline replays a bundled fixture (fixtures/fx_sample.json) so the plumbing
    is testable with no network (here and in CI).
  * --dry-run fetches + transforms + prints a summary but writes nothing.

Usage:
  python backend/pipeline/fetch_fx.py --dry-run   # fetch + transform + summary, write nothing
  python backend/pipeline/fetch_fx.py             # fetch live + write site/data/fx-*.json
  python backend/pipeline/fetch_fx.py --offline   # transform the bundled fixture (no network)
"""
import argparse
import datetime
import json
import os
import sys
import urllib.request
import urllib.error


def _force_utf8_output():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError, OSError):
            pass


_force_utf8_output()

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "..", "..", "site", "data")
FIXTURE = os.path.join(HERE, "fixtures", "fx_sample.json")
API = "https://open.er-api.com/v6/latest/EGP"   # base = EGP; rates[X] = X per 1 EGP

SOURCE = {
    "name_en": "ExchangeRate-API (open access)",
    "name_ar": "أسعار السوق عبر ExchangeRate-API",
    "url": "https://www.exchangerate-api.com",
    "kind": "fx",
    "cadence": "daily",
    "note_en": "Market reference rates, not the Central Bank of Egypt official fixing.",
    "note_ar": "أسعار استرشادية من السوق، وليست السعر الرسمي للبنك المركزي المصري.",
}

# Currencies to show, in display order, with bilingual names. (Codes must exist
# in the API's rates map; any missing one is simply skipped.)
CURRENCIES = [
    ("USD", "دولار أمريكي", "US Dollar"),
    ("EUR", "يورو", "Euro"),
    ("GBP", "جنيه إسترليني", "British Pound"),
    ("SAR", "ريال سعودي", "Saudi Riyal"),
    ("AED", "درهم إماراتي", "UAE Dirham"),
    ("KWD", "دينار كويتي", "Kuwaiti Dinar"),
    ("QAR", "ريال قطري", "Qatari Riyal"),
    ("CAD", "دولار كندي", "Canadian Dollar"),
    ("CNY", "يوان صيني", "Chinese Yuan"),
    ("TRY", "ليرة تركية", "Turkish Lira"),
]
MIN_CURRENCIES = 5  # guardrail: expect most of the above; far fewer = bad response


def fetch_live():
    req = urllib.request.Request(API, headers={
        "User-Agent": "EgyBI-fx-bot/1.0 (+https://egybi.com)",
        "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def transform(bundle):
    """Turn the API's {rates:{CUR: per-EGP}} into a list of 1-unit-in-EGP items."""
    if not isinstance(bundle, dict) or bundle.get("result") != "success":
        return None, []
    rates = bundle.get("rates") or {}
    updated = bundle.get("time_last_update_utc") or ""
    as_of = datetime.date.today().isoformat()
    # Prefer the API's own update date if present (RFC 1123 -> YYYY-MM-DD)
    try:
        if updated:
            dt = datetime.datetime.strptime(updated[:25].strip(), "%a, %d %b %Y %H:%M:%S")
            as_of = dt.date().isoformat()
    except (ValueError, TypeError):
        pass
    items = []
    for code, name_ar, name_en in CURRENCIES:
        r = rates.get(code)
        if not r:            # missing or zero -> skip, don't invent
            continue
        egp = round(1.0 / r, 4)   # 1 unit of the currency, in EGP
        items.append({
            "code": code,
            "name_ar": name_ar,
            "name_en": name_en,
            "egp": egp,
            "change_pct": 0.0,   # filled from history below
        })
    return as_of, items


# A currency whose day-on-day change is this many percentage points away from
# the median change of all the currencies that day is held back for the day.
# On 2026-08-22 the API returned the Kuwaiti dinar at EGP 114.43 (165.07 the day
# before, 164.88 the day after) while every other currency moved 0.1% or less;
# the page published "-30.68%" and the history kept the point. A real move of
# the pound shifts every currency together, so the median moves with it and
# nothing is held back: a flat cap on daily moves would have refused the
# genuine 2024 devaluation (about +60% in one day).
OUT_OF_LINE_PP = 10.0


def out_of_line(changes):
    """Codes whose change (in %) is more than OUT_OF_LINE_PP from the median
    change of all of them. Needs at least three currencies to judge."""
    vals = sorted(changes.values())
    if len(vals) < 3:
        return set()
    n = len(vals)
    med = vals[n // 2] if n % 2 else (vals[n // 2 - 1] + vals[n // 2]) / 2
    return {c for c, v in changes.items() if abs(v - med) > OUT_OF_LINE_PP}


def load_json(path, default):
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return default


def main():
    ap = argparse.ArgumentParser(description="Fetch daily EGP exchange rates -> site/data/fx-*.json")
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
            print(f"ABORT: could not reach the FX API -> {type(e).__name__}: {e}", file=sys.stderr)
            print("Keeping the last-good JSON files untouched.", file=sys.stderr)
            return 2

    as_of, items = transform(bundle)
    if len(items) < MIN_CURRENCIES:
        print(f"ABORT: only {len(items)} currencies (< {MIN_CURRENCIES}). Bad API response — keeping last-good.",
              file=sys.stderr)
        return 3

    # day-on-day change from our own append-only history (never fabricated)
    hist_path = os.path.join(DATA_DIR, "fx-history.json")
    hist = load_json(hist_path, {"series": {}, "updated": None})
    series = hist.setdefault("series", {})
    for it in items:
        pts = series.get(it["code"]) or []
        prev = None
        for p in reversed(pts):
            if p.get("as_of") != as_of and p.get("egp"):
                prev = p["egp"]; break
        if prev:
            it["change_pct"] = round(((it["egp"] - prev) / prev) * 100, 2)
            it["_has_prev"] = True

    held = out_of_line({it["code"]: it["change_pct"] for it in items if it.get("_has_prev")})
    for it in items:
        it.pop("_has_prev", None)
    if held:
        for it in items:
            if it["code"] in held:
                # GitHub renders ::warning:: in the run summary; the day's value
                # is neither shown nor kept, and tomorrow is compared with the
                # last good point instead.
                print(f"::warning::FX {it['code']} held back for {as_of}: {it['egp']} EGP is "
                      f"{it['change_pct']:+.2f}% in a day, out of line with the other currencies")
        items = [it for it in items if it["code"] not in held]
        if len(items) < MIN_CURRENCIES:
            print(f"ABORT: only {len(items)} plausible currencies (< {MIN_CURRENCIES}) — keeping last-good.",
                  file=sys.stderr)
            return 3

    print(f"FX {len(items)} currencies (as_of {as_of}): " +
          ", ".join(f"{it['code']}={it['egp']}" for it in items))

    if args.dry_run:
        print("[dry-run] not writing.")
        return 0

    os.makedirs(DATA_DIR, exist_ok=True)
    today = {
        "source": SOURCE,
        "fetched_at": datetime.date.today().isoformat(),
        "as_of": as_of,
        "base": "EGP",
        "count": len(items),
        "rates": items,
    }
    with open(os.path.join(DATA_DIR, "fx-today.json"), "w", encoding="utf-8") as f:
        json.dump(today, f, ensure_ascii=False, indent=1)

    # append one point per (code, as_of)
    added = 0
    for it in items:
        pts = series.setdefault(it["code"], [])
        if not any(p["as_of"] == as_of for p in pts):
            pts.append({"as_of": as_of, "egp": it["egp"]})
            pts.sort(key=lambda p: p["as_of"])
            added += 1
    hist["updated"] = datetime.date.today().isoformat()
    with open(hist_path, "w", encoding="utf-8") as f:
        json.dump(hist, f, ensure_ascii=False, indent=1)

    print(f"Wrote fx-today.json ({len(items)} currencies); new history points: +{added}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
