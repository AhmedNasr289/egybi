#!/usr/bin/env python3
"""Rebuild egypt-wholesale-to-shop.html and its two charts from the price history.

Run by the daily price refresh (refresh-prices.yml) after fetch_prices.py. The
page's window ends on the last WHOLESALE date, which moves about weekly, so most
days this writes the same bytes and the commit step finds nothing to add.
build_static_pages.py also writes it; both produce the same bytes.

Run:  python backend/pipeline/build_wholesale_gap.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pages.wholesalegap import build_wholesale_gap_page  # noqa: E402


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError, OSError):
            pass
    written = build_wholesale_gap_page()
    print(f"wholesale-to-shop story: {'written' if written else 'skipped (too few comparable items)'}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
