#!/usr/bin/env python3
"""
Honest <lastmod> values for site/sitemap.xml.

WHY THIS EXISTS
---------------
The generator stamped every URL with the day it ran. It only runs when the
challenge or blog sources change, so on 2026-11-04 all 50 URLs claimed
2026-10-09 — including prices.html, whose prices had been refreshed every day
since. A sitemap that says nothing changed for a month while the page changes
daily teaches a crawler to stop trusting the field. A sitemap that says
EVERYTHING changed whenever any one thing did teaches it the same lesson.

So each URL now carries the date its own content last changed:

  * the last commit that touched the page file, or today if the page has
    uncommitted changes (the generator has just rewritten it), and
  * for pages whose visible content lives in data files rather than in the
    HTML (DATA_PAGES), the newest date those files declare about themselves.

The later of the two wins.

SHALLOW CLONES
--------------
In a depth-1 clone the only commit is a grafted root, so `git log -- <file>`
reports that commit for EVERY file and every page would get the same date —
the exact defect this replaces. The git date is therefore skipped when the
repository is shallow, and only the data dates are used. build-pages checks
out full history for this reason; refresh-prices stays shallow and only needs
the data dates anyway.

Two entry points:
  * write_sitemap(entries) — used by build_static_pages.py for a full rebuild.
  * `python backend/pipeline/sitemap_lastmod.py` — refreshes the dates of the
    data-driven pages inside the existing sitemap, without node and without
    regenerating any page. refresh-prices runs this after each price update.

Both report the URLs whose date moved, so they can be announced via IndexNow.
"""
from __future__ import annotations

import argparse
import datetime as dt
import io
import json
import os
import re
import subprocess
import sys
from typing import Iterable, Optional

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE = os.path.join(ROOT, 'site')
SITEMAP = os.path.join(SITE, 'sitemap.xml')
SITE_URL = 'https://egybi.com'

# Pages whose readable content is drawn from data files at view time, so the
# HTML can stay byte-identical while what the reader sees changes daily.
# Paths are relative to site/. Each file must carry an ISO date in
# 'fetched_at' or 'as_of' (prices-today.json and fx-today.json both do).
DATA_PAGES: dict[str, tuple[str, ...]] = {
    'prices.html': ('data/prices-today.json', 'data/fx-today.json'),
    'prices-ar.html': ('data/prices-today.json', 'data/fx-today.json'),
}

_ISO = re.compile(r'^\d{4}-\d{2}-\d{2}$')
_URL_BLOCK = re.compile(r'(<url>\s*<loc>)([^<]+)(</loc>\s*<lastmod>)([^<]+)(</lastmod>)')


def today() -> str:
    return dt.date.today().isoformat()


def url_to_rel(url: str) -> str:
    """'https://egybi.com/visit/giza.html' -> 'visit/giza.html'; the root -> 'index.html'."""
    path = url[len(SITE_URL):] if url.startswith(SITE_URL) else url
    path = path.lstrip('/')
    return path or 'index.html'


def _git(*args: str) -> Optional[str]:
    try:
        r = subprocess.run(['git', '-C', ROOT, *args], capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.TimeoutExpired):
        return None
    return r.stdout.strip() if r.returncode == 0 else None


_SHALLOW: Optional[bool] = None


def _is_shallow() -> bool:
    global _SHALLOW
    if _SHALLOW is None:
        # Unknown (git missing, not a repo) is treated as shallow: no git date
        # is better than a wrong one.
        _SHALLOW = _git('rev-parse', '--is-shallow-repository') != 'false'
    return _SHALLOW


def git_date(rel: str) -> Optional[str]:
    """Date the page's own file last changed, or None when git cannot say reliably."""
    if _is_shallow():
        return None
    path = 'site/' + rel
    if _git('ls-files', '--error-unmatch', '--', path) is None:
        return today()              # new page, never committed
    # Content comparison, not `git status`: with core.autocrlf on Windows a
    # regenerated file differs from the checkout only in line endings, and
    # status reports it modified. That would stamp every generated page with
    # today's date on any local build — the defect this module replaces.
    try:
        r = subprocess.run(['git', '-C', ROOT, 'diff', '--quiet', 'HEAD', '--', path],
                           capture_output=True, timeout=30)
        if r.returncode == 1:       # rewritten by this run, not yet committed
            return today()
    except (OSError, subprocess.TimeoutExpired):
        return None
    d = _git('log', '-1', '--format=%cs', '--', path)
    return d if d and _ISO.match(d) else None


def data_date(rel: str) -> Optional[str]:
    """The date a data file declares about itself, or None if it declares none."""
    try:
        with io.open(os.path.join(SITE, rel), encoding='utf-8') as f:
            d = json.load(f)
    except (OSError, ValueError):
        return None
    for key in ('fetched_at', 'as_of'):
        v = str(d.get(key) or '')[:10]
        if _ISO.match(v):
            return v
    return None


def lastmod_for(rel: str, fallback: Optional[str] = None, data_only: bool = False) -> str:
    dates = [] if data_only else [git_date(rel)]
    dates += [data_date(x) for x in DATA_PAGES.get(rel, ())]
    dates = [d for d in dates if d]
    if dates:
        return max(dates)
    return fallback or today()


def read_lastmods(path: str = SITEMAP) -> dict[str, str]:
    try:
        xml = io.open(path, encoding='utf-8').read()
    except OSError:
        return {}
    return {m.group(2).strip(): m.group(4).strip() for m in _URL_BLOCK.finditer(xml)}


def write_sitemap(entries: Iterable[tuple[str, str, str]], path: str = SITEMAP) -> tuple[int, list[str]]:
    """Write the sitemap from (url, changefreq, priority) entries.

    Returns (url count, urls whose lastmod is new or different from the
    sitemap being replaced)."""
    old = read_lastmods(path)
    rows, changed = [], []
    for url, freq, prio in entries:
        lm = lastmod_for(url_to_rel(url), fallback=old.get(url))
        if old.get(url) != lm:
            changed.append(url)
        rows.append(f"  <url>\n    <loc>{url}</loc>\n    <lastmod>{lm}</lastmod>\n"
                    f"    <changefreq>{freq}</changefreq>\n    <priority>{prio}</priority>\n  </url>")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + "\n".join(rows) + "\n</urlset>\n")
    io.open(path, 'w', encoding='utf-8', newline='\n').write(xml)
    return len(rows), changed


def refresh_data_pages(path: str = SITEMAP) -> list[str]:
    """Move the lastmod of DATA_PAGES inside an existing sitemap; touch nothing else."""
    xml = io.open(path, encoding='utf-8').read()
    changed: list[str] = []

    def sub(m: re.Match) -> str:
        url, current = m.group(2).strip(), m.group(4).strip()
        rel = url_to_rel(url)
        if rel not in DATA_PAGES:
            return m.group(0)
        # data_only: a refresh job runs in a shallow clone, and the page file
        # itself does not change on a data refresh. Never move a date backwards.
        lm = max(current, lastmod_for(rel, fallback=current, data_only=True))
        if lm != current:
            changed.append(url)
        return f"{m.group(1)}{m.group(2)}{m.group(3)}{lm}{m.group(5)}"

    new = _URL_BLOCK.sub(sub, xml)
    if new != xml:
        io.open(path, 'w', encoding='utf-8', newline='\n').write(new)
    return changed


def write_changed(urls: list[str], out: Optional[str]) -> None:
    if out:
        with io.open(out, 'a', encoding='utf-8', newline='\n') as f:
            for u in urls:
                f.write(u + '\n')


_SHA = re.compile(r'^[0-9a-f]{40}$')


def pushed_urls(before: str, after: str, path: str = SITEMAP) -> Optional[list[str]]:
    """Sitemap URLs whose page file changed between two commits.

    The build only announces what IT changed, so a pull request that ships
    pages already regenerated (the normal case: CI rebuilds them on the
    branch) reached main with nothing for the build to change, and nothing was
    announced — the 18 visit pages on 2026-11-05 were sent by hand. Diffing
    the push itself catches those. Only URLs already in the sitemap are
    returned, so a retired or noindex page is never announced.

    None when the range cannot be read (a new branch has an all-zero
    `before`; a force push can leave `before` outside the history)."""
    if not (_SHA.match(before) and _SHA.match(after)) or set(before) == {'0'}:
        return None
    out = _git('diff', '--name-only', f'{before}..{after}', '--', 'site')
    if out is None:
        return None
    files = {f[len('site/'):] for f in out.splitlines() if f.startswith('site/')}
    return [u for u in read_lastmods(path) if url_to_rel(u) in files]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--changed-out', help='append the URLs whose lastmod moved to this file')
    ap.add_argument('--pushed', nargs=2, metavar=('BEFORE', 'AFTER'),
                    help='instead of refreshing dates, list the sitemap URLs whose page '
                         'changed between these two commits')
    args = ap.parse_args()
    if not os.path.isfile(SITEMAP):
        print(f"::error::{SITEMAP} not found", file=sys.stderr)
        return 1
    if args.pushed:
        urls = pushed_urls(*args.pushed)
        if urls is None:
            # Not an error: the build's own changes are still announced.
            print(f"::notice::push range {args.pushed[0][:7]}..{args.pushed[1][:7]} "
                  "not readable; announcing only what the build changed")
            return 0
        write_changed(urls, args.changed_out)
        print(f"pages changed by the push: {len(urls)}"
              + (': ' + ', '.join(urls) if urls else ''))
        return 0
    changed = refresh_data_pages()
    write_changed(changed, args.changed_out)
    print(f"data pages refreshed: {len(changed)} lastmod change(s)"
          + (': ' + ', '.join(changed) if changed else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main())
