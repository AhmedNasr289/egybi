#!/usr/bin/env python3
"""Probe each Overpass endpoint fetch_streets.py may use. READ-ONLY.

WHY THIS EXISTS
---------------
The 2026-11-09 and 2026-11-11 street refreshes lost most districts because the
default Overpass server stopped accepting connections from the GitHub runner.
fetch_streets.py now fails over to public mirrors (OVERPASS_URLS), but which
of them answer depends on where the job runs: the work laptop reaches none of
them, so only a run on the same kind of runner tells the truth.

For each endpoint this asks the /status page and one tiny query (a count of
the nodes in a 200 m box in Downtown Cairo) and prints the HTTP status, the
seconds taken and the count. Every endpoint should return a similar count; one
that answers with a very different number is serving a stale or partial copy.
It sends two small requests per endpoint and nothing else.

Run: python backend/pipeline/probe_overpass.py   (exit 1 if none answered)
"""
from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

# The same list, with the same env override, as the pipeline uses. Imported
# rather than restated so the probe can never test a different set.
from fetch_streets import OVERPASS_URLS  # noqa: E402

QUERY = "[out:json][timeout:25];node(30.044,31.235,30.046,31.237);out count;"
UA = {"User-Agent": "egybi-probe/1.0 (+https://egybi.com)"}


def get(url: str, data: bytes | None = None, timeout: float = 60) -> tuple[str, float, bytes]:
    t = time.monotonic()
    try:
        with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=UA),
                                    timeout=timeout) as r:
            return str(r.status), time.monotonic() - t, r.read()
    except urllib.error.HTTPError as e:
        return str(e.code), time.monotonic() - t, b""
    except Exception as e:  # noqa: BLE001 - the name IS the finding
        return type(e).__name__, time.monotonic() - t, b""


def count(body: bytes) -> str:
    try:
        return str(json.loads(body)["elements"][0]["tags"]["nodes"])
    except (ValueError, KeyError, IndexError, TypeError):
        return "?"


def main() -> int:
    answered = 0
    for base in OVERPASS_URLS:
        base = base.rstrip("/")
        s_code, s_sec, s_body = get(base + "/status", timeout=30)
        q_code, q_sec, q_body = get(base + "/interpreter",
                                    urllib.parse.urlencode({"data": QUERY}).encode())
        n = count(q_body)
        ok = q_code == "200" and n != "?"
        answered += ok
        first = s_body.decode("utf-8", "replace").splitlines()[3:5] if s_body else []
        print(f"{'OK  ' if ok else 'FAIL'} {base}\n"
              f"     query  {q_code} in {q_sec:.1f}s, nodes={n}\n"
              f"     status {s_code} in {s_sec:.1f}s {' | '.join(first)}", flush=True)
    print(f"\n{answered} of {len(OVERPASS_URLS)} endpoints answered the query.")
    return 0 if answered else 1


if __name__ == "__main__":
    sys.exit(main())
