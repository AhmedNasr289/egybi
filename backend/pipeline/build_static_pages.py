#!/usr/bin/env python3
"""
EgyBI — static page generator (SEO).

The challenge catalogue and the blog both live inside JavaScript files and are
rendered client-side, which means 135 pieces of real content had exactly zero
indexable URLs. This script renders a real HTML page for every challenge and
every post, so each one can be found, linked and shared on its own.

It writes:
    site/practice/<challenge-title-slug>.html   (one RETIRED-page notice each)
    site/papyrus/<post-id>.html                 (one per newsletter issue)
    site/sitemap.xml                            (regenerated)
    site/feed.xml                               (The Papyrus RSS)

Design notes:
  * The nav and footer are lifted from site/blog.html at build time rather than
    duplicated here, so the generated pages cannot drift from the real site.
    Editing blog.html's nav therefore updates all 135 generated pages.
  * Pages live one directory deep, so relative asset paths are rewritten to ../

THE PRACTICE SECTION IS RETIRED (2026-08-07)
--------------------------------------------
EgyBI is now an encyclopaedia of Egypt built on GIS and data storytelling, not
a SQL practice platform. The 123 challenge URLs are indexed and are the site's
only real search presence, so they are NOT deleted and NOT redirected — each
one keeps its URL and returns 200 with a retirement notice.

Redirects were considered and rejected. 123 pages collapsing onto ~10 section
anchors is a many-to-few redirect that search engines treat as a soft 404 and
drop, which would lose both the explanation and the traffic. A 200 page with
genuinely distinct content keeps ranking for its own long tail while routing
the reader onward.

What each retired page keeps is the part that was always about Egypt rather
than about SQL: the question itself and the sourced "did you know" note. What
it drops is the schema, the starter query and the links to sibling challenges —
tombstones linking to tombstones is a crawl trap with nothing at the end of it.

The onward link is chosen by the challenge's own `sector` field via
SECTOR_DESTINATION in pages/retired.py, so re-pointing a whole sector when new encyclopaedia
sections land is a one-line change.

The Papyrus (site/papyrus/) is NOT part of this retirement. It is the
newsletter archive and the site's only long-form writing about Egypt, which is
precisely what the encyclopaedia is built on.

LAYOUT
------
This file is the entry point and the run order. Each kind of page lives in its
own module under pages/ (split 2026-11-06):

    pages/common.py    paths, escaping, the chrome lifted from blog.html, page(),
                       breadcrumb(), write_index_block()
    pages/retired.py   site/practice/ (the 123 retirement notices)
    pages/papyrus.py   site/papyrus/, feed.xml, blog.html's story index
    pages/visit.py     site/visit/, visit.html's site index, the VISIT-GUIDES
                       block on places.html and geospatial.html,
                       egypt-weather-by-month.html and its chart
    pages/sitemap.py   sitemap.xml
    pages/holidays.py  egypt-public-holidays.html and its chart
    pages/notfound.py  404.html

The split moved code verbatim and was checked byte for byte: every file under
site/ and this script's own output were identical before and after.

Run:  python backend/pipeline/build_static_pages.py
"""
import os
import sys

def _force_utf8_output() -> None:
    """Make stdout/stderr safe for non-ASCII on every platform.

    A Windows console defaults to a legacy code page that cannot encode many
    characters this pipeline handles, so a plain print() can kill an otherwise
    successful run with UnicodeEncodeError. UTF-8 writes correct bytes wherever
    the terminal supports it; errors="replace" degrades to '?' on a genuinely
    legacy console instead of taking the job down. File output is unaffected —
    writers specify their own encoding.
    """
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError, OSError):
            pass          # Python < 3.7, or a stream that cannot be reconfigured


_force_utf8_output()

# Import the sibling modules by path, so this works however the script is run
# (python -I / -P does not put the script's own folder on sys.path).
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pages.common import load_js  # noqa: E402
from pages.holidays import build_holidays_page  # noqa: E402
from pages.notfound import build_404  # noqa: E402
from pages.papyrus import build_feed, build_link_indexes, build_posts  # noqa: E402
from pages.retired import DEFAULT_DESTINATION, SECTOR_DESTINATION, build_challenges  # noqa: E402
from pages.sitemap import build_sitemap  # noqa: E402
from pages.visit import (GUIDE_PAGES, build_guide_links, build_site_months,  # noqa: E402
                         build_visit_index, build_weather_by_month)


def main():
    data = load_js()
    ch, posts, docs = data['c'], data['p'], data.get('docs', {})
    build_challenges(ch, docs)          # returns [] — retired pages stay out of the sitemap
    pu = build_posts(posts)
    vu = build_site_months()
    if vu:
        build_visit_index(vu)
    ng = build_guide_links(vu) if vu else 0
    wu = build_weather_by_month(vu) if vu else []
    hu = build_holidays_page()
    build_link_indexes(ch, posts)
    total = build_sitemap(pu + vu + wu + hu)
    nfeed = build_feed(posts)
    build_404()
    # Report the sector split so a mis-mapped sector is visible in the log
    # rather than discovered by a reader landing on the wrong section.
    counts = {}
    for c in ch:
        dest = SECTOR_DESTINATION.get(c['sector'], DEFAULT_DESTINATION)[0]
        counts[dest] = counts.get(dest, 0) + 1
    print(f"retired pages   : {len(ch)}")
    for dest in sorted(counts, key=lambda d: -counts[d]):
        print(f"    {counts[dest]:>4} -> {dest}")
    print(f"post pages      : {len(pu)}")
    print(f"site month pages: {len(vu)}")
    print(f"guide link pages: {ng} of {len(GUIDE_PAGES)}")
    if vu and ng < len(GUIDE_PAGES):
        # A page lost its markers: its guide links would silently stop
        # updating, and the scripts reading them would show no guide at all.
        print("::warning::VISIT-GUIDES markers missing from "
              f"{len(GUIDE_PAGES) - ng} page(s) in GUIDE_PAGES")
    print(f"holidays page   : {'written' if hu else 'skipped (no calendar data)'}")
    print(f"sitemap URLs    : {total}")
    print(f"RSS feed items  : {nfeed}")
    print("404 page        : written (root-relative, noindex)")


if __name__ == '__main__':
    main()
