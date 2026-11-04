#!/usr/bin/env python3
"""
Tell IndexNow search engines which EgyBI URLs just changed.

IndexNow is one POST that reaches Bing, Yandex, Seznam, Naver and the other
participating engines at once (they share submissions). Google does not take
part, so this complements the sitemap rather than replacing it.

The key is NOT a secret. The protocol proves ownership by serving the same key
from the site itself, at site/<KEY>.txt, so anyone can read it; committing it
here is how the protocol is meant to be used.

Input: a file of URLs, one per line — what sitemap_lastmod.py reports as
changed. Duplicates, blanks and anything outside https://egybi.com/ are dropped.

A failed ping never fails the job that called it. Announcing a change is a
courtesy to crawlers; the change itself has already been committed and
deployed, and the sitemap still carries the new date. Every non-success is
printed as a GitHub ::warning:: so it is visible rather than silent.

Run:  python backend/pipeline/indexnow_ping.py /tmp/changed-urls.txt
"""
from __future__ import annotations

import io
import json
import os
import sys
import urllib.error
import urllib.request

HOST = 'egybi.com'
SITE_URL = f'https://{HOST}/'
KEY = 'f5095e3d9b094929f94edda79d85f2b7'
KEY_LOCATION = f'{SITE_URL}{KEY}.txt'
ENDPOINT = 'https://api.indexnow.org/indexnow'
MAX_URLS = 10_000           # protocol limit per request

# What each status means, from the IndexNow documentation.
STATUS = {
    200: 'accepted',
    202: 'accepted; key validation pending',
    400: 'bad request',
    403: 'key not valid (key file not found or does not match)',
    422: 'URLs do not belong to the host, or key does not match the schema',
    429: 'too many requests',
}

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def read_urls(path: str) -> list[str]:
    try:
        lines = io.open(path, encoding='utf-8').read().splitlines()
    except OSError:
        return []
    seen, out = set(), []
    for u in (l.strip() for l in lines):
        if u.startswith(SITE_URL) and u not in seen:
            seen.add(u)
            out.append(u)
    return out[:MAX_URLS]


def key_file_ok() -> bool:
    """The committed key file must hold exactly the key, or every ping is a 403."""
    try:
        return io.open(os.path.join(ROOT, 'site', KEY + '.txt'), encoding='utf-8').read().strip() == KEY
    except OSError:
        return False


def ping(urls: list[str]) -> int:
    body = json.dumps({'host': HOST, 'key': KEY, 'keyLocation': KEY_LOCATION,
                       'urlList': urls}).encode('utf-8')
    req = urllib.request.Request(ENDPOINT, data=body, method='POST',
                                 headers={'Content-Type': 'application/json; charset=utf-8'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except (urllib.error.URLError, OSError) as e:
        print(f"::warning::IndexNow unreachable: {e}")
        return 0


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__.strip().splitlines()[-1].strip())
        return 2
    if not key_file_ok():
        print(f"::warning::IndexNow key file site/{KEY}.txt is missing or does not hold the key; not pinging.")
        return 0
    urls = read_urls(argv[1])
    if not urls:
        print("IndexNow: nothing changed, nothing to announce.")
        return 0
    code = ping(urls)
    meaning = STATUS.get(code, 'unexpected response')
    if code in (200, 202):
        print(f"IndexNow: {len(urls)} URL(s) announced - HTTP {code} ({meaning}).")
    elif code:
        print(f"::warning::IndexNow returned HTTP {code} ({meaning}) for {len(urls)} URL(s).")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
