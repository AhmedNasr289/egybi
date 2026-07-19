#!/usr/bin/env python3
"""Rebuild the local SQLite test DB from schema + all seed files, then verify.

Local testing only — production deploys to MySQL on Hostinger. Run:
    python backend/test/build_test_db.py
"""
import os
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SQL = os.path.join(HERE, "..", "sql")
DB = os.path.join(HERE, "egybi_test.sqlite")

FILES = [
    "schema_sqlite.sql",
    "seed.sql",
    "seed_v2.sql",
    "seed_v3.sql",
    "seed_v4.sql",
    "seed_v5.sql",
    "seed_v6.sql",
    "seed_v7.sql",
    "seed_v8.sql",
    "seed_v9.sql",
    "seed_auto.sql",  # optional: written by the fetch pipeline; skipped if absent
]


def read(name):
    with open(os.path.join(SQL, name), "r", encoding="utf-8") as f:
        return f.read()


def main():
    if os.path.exists(DB):
        os.remove(DB)
    conn = sqlite3.connect(DB)
    conn.execute("PRAGMA foreign_keys = ON;")
    for name in FILES:
        path = os.path.join(SQL, name)
        if not os.path.exists(path):
            print(f"(skip {name} — not present)")
            continue
        try:
            conn.executescript(read(name))
        except sqlite3.Error as e:
            print(f"ERROR in {name}: {e}")
            sys.exit(1)
    conn.commit()

    # Foreign-key integrity check
    bad = conn.execute("PRAGMA foreign_key_check;").fetchall()
    if bad:
        print(f"FK VIOLATIONS: {bad}")
        sys.exit(1)

    # Row counts for every table
    tables = [r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
    ).fetchall()]
    total = 0
    print(f"{'table':<26} rows")
    print("-" * 34)
    for t in tables:
        n = conn.execute(f"SELECT COUNT(*) FROM {t};").fetchone()[0]
        total += n
        print(f"{t:<26} {n}")
    print("-" * 34)
    print(f"{'TOTAL tables':<26} {len(tables)}")
    print(f"{'TOTAL rows':<26} {total}")
    conn.close()
    print("\nOK: built cleanly, zero FK violations.")


if __name__ == "__main__":
    main()
