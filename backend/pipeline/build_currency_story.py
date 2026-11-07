#!/usr/bin/env python3
"""Rebuild egyptian-pound-since-july.html and its two charts from the FX history.

Run by the daily FX refresh (refresh-fx.yml) after fetch_fx.py. Without it the
story would be rebuilt only by the general page build, which does not run on
FX data, and would freeze on the day it was written. build_static_pages.py
also writes it; both produce the same bytes.

Run:  python backend/pipeline/build_currency_story.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pages.currencystory import build_currency_page  # noqa: E402


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError, OSError):
            pass
    written = build_currency_page()
    print(f"currency story: {'written' if written else 'skipped (too little FX history)'}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
