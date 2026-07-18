#!/usr/bin/env python3
"""
EgyBI — automated data-refresh pipeline (World Bank Indicators API).

Fetches a curated allowlist of World Bank indicators for Egypt, transforms them
into the project's cited seed-SQL format, and writes `sql/seed_auto.sql`. Those
rows are *pipeline-managed*: seed_auto.sql begins by DELETE-ing exactly the codes
this pipeline owns, then re-INSERTs fresh values — so re-running is idempotent and
never touches the hand-curated rows in seed.sql / seed_v2..v5.

Design goals (per the project content rule — every fact real & cited):
  * Only real API values are written. Nulls are skipped, nothing is invented.
  * Each row carries its real source_url (the World Bank indicator page).
  * A --dry-run mode diffs the freshly-fetched values against what's currently
    in the SQLite test DB and prints added/changed/removed years — so a human
    reviews before anything lands.
  * An --offline mode runs the exact same transform against bundled fixtures
    (pipeline/fixtures/*.json) so the plumbing is testable with no network
    (here and in CI). Offline output is written to a *sample* file and is never
    mistaken for real data.

Usage:
  python backend/pipeline/fetch_worldbank.py --dry-run     # fetch + show diff, write nothing
  python backend/pipeline/fetch_worldbank.py               # fetch + write sql/seed_auto.sql
  python backend/pipeline/fetch_worldbank.py --offline     # fixtures only -> _sample_output.sql
"""
import argparse
import json
import os
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SQL_DIR = os.path.join(HERE, "..", "sql")
FIXTURES = os.path.join(HERE, "fixtures")
TEST_DB = os.path.join(HERE, "..", "test", "egybi_test.sqlite")
API = "https://api.worldbank.org/v2/country/EGY/indicator/{code}?format=json&per_page=400"

# --- The managed allowlist. Each indicator maps a World Bank code to how it is
#     stored in the KB. `table` is 'indicators' or 'population'. `scale` divides
#     the raw value (e.g. GDP dollars -> USD billion); `round` sets decimals;
#     `since` clamps to recent years to keep the series focused. -----------------
SOURCES = [
    {"code": "NY.GDP.MKTP.CD",    "table": "indicators", "category": "economy",
     "name": "GDP (current US$)", "unit": "USD billion", "scale": 1e9, "round": 2, "since": 2000,
     "url": "https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=EG"},
    {"code": "NY.GDP.PCAP.CD",    "table": "indicators", "category": "economy",
     "name": "GDP per capita (current US$)", "unit": "USD", "scale": 1, "round": 1, "since": 2000,
     "url": "https://data.worldbank.org/indicator/NY.GDP.PCAP.CD?locations=EG"},
    {"code": "NY.GDP.MKTP.KD.ZG", "table": "indicators", "category": "economy",
     "name": "GDP growth (annual %)", "unit": "% annual", "scale": 1, "round": 2, "since": 2005,
     "url": "https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=EG"},
    {"code": "FP.CPI.TOTL.ZG",    "table": "indicators", "category": "economy",
     "name": "Inflation, consumer prices (annual %)", "unit": "% annual", "scale": 1, "round": 2, "since": 2005,
     "url": "https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=EG"},
    {"code": "SL.UEM.TOTL.ZS",    "table": "indicators", "category": "economy",
     "name": "Unemployment (% of labor force)", "unit": "% of labor force", "scale": 1, "round": 2, "since": 2005,
     "url": "https://data.worldbank.org/indicator/SL.UEM.TOTL.ZS?locations=EG"},
    {"code": "SP.URB.TOTL.IN.ZS", "table": "indicators", "category": "development",
     "name": "Urban population (% of total)", "unit": "% of population", "scale": 1, "round": 2, "since": 2000,
     "url": "https://data.worldbank.org/indicator/SP.URB.TOTL.IN.ZS?locations=EG"},
    {"code": "SP.DYN.LE00.IN",    "table": "indicators", "category": "development",
     "name": "Life expectancy at birth", "unit": "years", "scale": 1, "round": 1, "since": 2000,
     "url": "https://data.worldbank.org/indicator/SP.DYN.LE00.IN?locations=EG"},
    {"code": "SH.DYN.MORT",       "table": "indicators", "category": "development",
     "name": "Mortality rate, under-5", "unit": "per 1,000 live births", "scale": 1, "round": 1, "since": 2000,
     "url": "https://data.worldbank.org/indicator/SH.DYN.MORT?locations=EG"},
    {"code": "EG.ELC.ACCS.ZS",    "table": "indicators", "category": "development",
     "name": "Access to electricity", "unit": "% of population", "scale": 1, "round": 2, "since": 2000,
     "url": "https://data.worldbank.org/indicator/EG.ELC.ACCS.ZS?locations=EG"},
    {"code": "IT.NET.USER.ZS",    "table": "indicators", "category": "digital",
     "name": "Individuals using the Internet", "unit": "% of population", "scale": 1, "round": 2, "since": 2005,
     "url": "https://data.worldbank.org/indicator/IT.NET.USER.ZS?locations=EG"},
    {"code": "SP.POP.TOTL",       "table": "population", "category": None,
     "name": "Population, total", "unit": None, "scale": 1, "round": 0, "since": 1960,
     "url": "https://data.worldbank.org/indicator/SP.POP.TOTL?locations=EG"},
]
MANAGED_INDICATOR_CODES = [s["code"] for s in SOURCES if s["table"] == "indicators"]


def fetch(code, offline):
    """Return the raw World Bank JSON payload for one indicator (list form)."""
    if offline:
        path = os.path.join(FIXTURES, code + ".json")
        if not os.path.exists(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    url = API.format(code=code)
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def transform(src, payload):
    """World Bank JSON -> list of {year, value} rows, nulls skipped, scaled/rounded."""
    if not payload or len(payload) < 2 or not isinstance(payload[1], list):
        return []
    rows = []
    for item in payload[1]:
        v, y = item.get("value"), item.get("date")
        if v is None or y is None:
            continue
        try:
            year = int(y)
        except (TypeError, ValueError):
            continue
        if year < src["since"]:
            continue
        val = v / src["scale"]
        val = round(val, src["round"])
        if src["round"] == 0:
            val = int(val)
        rows.append({"year": year, "value": val})
    rows.sort(key=lambda r: r["year"])
    return rows


def sql_escape(s):
    """Escape a value for a single-quoted SQL literal (SQL-style '' doubling)."""
    return str(s).replace("'", "''")


def emit_sql(fetched):
    """Build the full seed_auto.sql text from {src_code: (src, rows)} data."""
    out = [
        "-- ============================================================================",
        "-- EgyBI - seed_auto.sql  (PIPELINE-MANAGED - do not hand-edit)",
        "-- ============================================================================",
        "-- Generated by backend/pipeline/fetch_worldbank.py from the World Bank",
        "-- Indicators API. Import LAST (after seed_v5.sql). Idempotent: it deletes the",
        "-- indicator codes it owns, then re-inserts fresh values. Every row is a real",
        "-- API value with its World Bank source_url. Re-run the pipeline to refresh.",
        "-- ============================================================================",
        "",
        "DELETE FROM indicators WHERE indicator_code IN ("
        + ", ".join("'%s'" % c for c in MANAGED_INDICATOR_CODES) + ");",
        "",
    ]
    for code, (src, rows) in fetched.items():
        if not rows:
            continue
        if src["table"] == "indicators":
            out.append("-- %s (%s), %d points" % (src["name"], code, len(rows)))
            out.append("INSERT INTO indicators (category, indicator_name, indicator_code, year, value, unit, source, source_url, note) VALUES")
            vals = []
            for r in rows:
                note = "Pipeline-refreshed from the World Bank Indicators API"
                vals.append("('%s','%s','%s',%d,%s,'%s','World Bank','%s','%s')" % (
                    sql_escape(src["category"]), sql_escape(src["name"]), code,
                    r["year"], r["value"], sql_escape(src["unit"] or ""),
                    src["url"], note))
            out.append(",\n".join(vals) + ";")
            out.append("")
        elif src["table"] == "population":
            # population table is UNIQUE(year); use upserts so hand-seeded years survive.
            out.append("-- %s (%s) -> population upsert, %d points" % (src["name"], code, len(rows)))
            for r in rows:
                out.append(
                    "INSERT INTO population (year, population, source, source_url, note) "
                    "VALUES (%d,%d,'World Bank','%s','Pipeline-refreshed') "
                    "ON CONFLICT(year) DO UPDATE SET population=excluded.population, "
                    "source=excluded.source, source_url=excluded.source_url, note=excluded.note;"
                    % (r["year"], r["value"], src["url"]))
            out.append("")
    out.append("-- End of seed_auto.sql")
    out.append("")
    return "\n".join(out)


def load_current_indicator_values():
    """Read current {(code,year): value} from the SQLite test DB for diffing."""
    try:
        import sqlite3
    except ImportError:
        return {}
    if not os.path.exists(TEST_DB):
        return {}
    conn = sqlite3.connect(TEST_DB)
    cur = {}
    try:
        for code, year, value in conn.execute(
            "SELECT indicator_code, year, value FROM indicators "
            "WHERE indicator_code IN (%s)" % ",".join("?" * len(MANAGED_INDICATOR_CODES)),
            MANAGED_INDICATOR_CODES,
        ):
            cur[(code, year)] = value
    except sqlite3.Error:
        pass
    conn.close()
    return cur


def print_diff(fetched, current):
    """Show added / changed / (kept) points vs the current DB — the review gate."""
    added = changed = kept = 0
    for code, (src, rows) in fetched.items():
        if src["table"] != "indicators":
            continue
        for r in rows:
            key = (code, r["year"])
            if key not in current:
                added += 1
                print("  + %-22s %d = %s %s" % (code, r["year"], r["value"], src["unit"] or ""))
            elif abs((current[key] or 0) - r["value"]) > 1e-6:
                changed += 1
                print("  ~ %-22s %d : %s -> %s" % (code, r["year"], current[key], r["value"]))
            else:
                kept += 1
    print("\nDiff summary: %d new, %d changed, %d unchanged." % (added, changed, kept))
    return added, changed


def main():
    ap = argparse.ArgumentParser(description="Refresh World Bank indicators into cited seed SQL.")
    ap.add_argument("--dry-run", action="store_true", help="Fetch + diff, write nothing.")
    ap.add_argument("--offline", action="store_true", help="Use bundled fixtures (no network).")
    args = ap.parse_args()

    fetched = {}
    print("Fetching %d World Bank indicators for Egypt%s...\n"
          % (len(SOURCES), " (offline fixtures)" if args.offline else ""))
    for src in SOURCES:
        try:
            payload = fetch(src["code"], args.offline)
        except Exception as e:  # noqa: BLE001 - report and continue
            print("  ! %s fetch failed: %s" % (src["code"], type(e).__name__))
            continue
        if payload is None:
            print("  . %s skipped (no fixture)" % src["code"])
            continue
        rows = transform(src, payload)
        fetched[src["code"]] = (src, rows)
        print("  [%s] %-22s %d points" % ("ok" if rows else "--", src["code"], len(rows)))

    if not fetched:
        print("\nNothing fetched. In offline mode add fixtures under pipeline/fixtures/.")
        return 1

    print("\n--- Review diff vs current DB ---")
    current = load_current_indicator_values()
    print_diff(fetched, current)

    text = emit_sql(fetched)
    if args.dry_run:
        print("\n[dry-run] Would write %s (%d lines). Nothing changed."
              % (os.path.join("sql", "seed_auto.sql"), text.count(chr(10))))
        return 0
    if args.offline:
        sample = os.path.join(HERE, "_sample_output.sql")
        with open(sample, "w", encoding="utf-8") as f:
            f.write(text)
        print("\n[offline] Wrote SAMPLE output to %s (fixtures only - not real data, do not import)."
              % os.path.relpath(sample, os.path.join(HERE, "..", "..")))
        return 0
    out_path = os.path.join(SQL_DIR, "seed_auto.sql")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(text)
    print("\nWrote %s. Rebuild the DB (test/build_test_db.py) to load it." % out_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
