#!/usr/bin/env python3
"""Rebuild egypt-food-prices.html and its chart from the price history.

Run by the daily price refresh (refresh-prices.yml) right after
build_prices_pages.py. Without it the story was rebuilt only by the general
page build, which does not run on price data, so it would have frozen at the
day it was written. build_static_pages.py also writes it; both produce the
same bytes.

Run:  python backend/pipeline/build_food_prices.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pages.foodprices import build_food_prices_page  # noqa: E402


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError, OSError):
            pass
    written = build_food_prices_page()
    print(f"food prices page: {'written' if written else 'skipped (too little price history)'}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
