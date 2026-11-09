#!/usr/bin/env python3
"""refresh_catchup.py: start today's daily refresh if GitHub never did.

Why this exists. On 2026-11-09 GitHub's scheduler never started the daily
price and exchange-rate refreshes at all. The weekly data job, due 03:41 UTC,
started 8 h 20 min late, and the two daily ones simply never appeared. Nothing
was broken, so nothing failed and no alert fired: the site would have shown
the day before's prices all day. They were started by hand at 15:47 UTC.

GitHub documents that scheduled runs can be delayed or dropped when its
scheduler is busy. So this runs once, late in the afternoon (UTC), and for each
daily workflow asks one question: has it STARTED today, by any trigger? If
not, it starts it (workflow_dispatch). It does not judge whether a run that
did start succeeded: a failed refresh already opens an issue of its own.

A run started late by GitHub after the catch-up has fired just refreshes
again: both workflows queue rather than overlap (concurrency groups), and a
second fetch on the same day rewrites the same day's data.

Runs locally too: with no GITHUB_TOKEN it calls `gh api`, so the token stays
in the gh keyring. Pass --dry-run to only say what it would start.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import subprocess
import sys
import urllib.request
from typing import Callable

API = "https://api.github.com"
DAILY = ("refresh-prices.yml", "refresh-fx.yml")

# (method, path, body or None) -> parsed JSON (or {} for an empty reply)
Call = Callable[[str, str, "dict | None"], dict]


def call_with_token(token: str) -> Call:
    def call(method: str, path: str, body: dict | None = None) -> dict:
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(API + path, data=data, method=method, headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "egybi-refresh-catchup",
        })
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
        return json.loads(raw) if raw else {}
    return call


def call_with_gh(method: str, path: str, body: dict | None = None) -> dict:
    args = ["gh", "api", "-X", method, path.lstrip("/")]
    if body is not None:
        args += ["--input", "-"]
    out = subprocess.run(args, input=json.dumps(body) if body is not None else None,
                         check=True, capture_output=True, text=True, encoding="utf-8")
    return json.loads(out.stdout) if out.stdout.strip() else {}


def started_today(call: Call, repo: str, workflow: str, today: dt.date) -> int:
    """How many runs of `workflow` were created on `today` (UTC), any trigger."""
    d = call("GET", f"/repos/{repo}/actions/workflows/{workflow}/runs?created=>={today:%Y-%m-%d}&per_page=1", None)
    return int(d.get("total_count", 0))


def catch_up(call: Call, repo: str, today: dt.date, workflows=DAILY, dry_run: bool = False,
             ref: str = "main") -> list[tuple[str, str]]:
    """Returns (workflow, what happened) for each daily workflow."""
    out = []
    for wf in workflows:
        n = started_today(call, repo, wf, today)
        if n:
            out.append((wf, f"already started today ({n} run{'s' if n != 1 else ''})"))
        elif dry_run:
            out.append((wf, "NOT started today: would start it (dry run)"))
        else:
            call("POST", f"/repos/{repo}/actions/workflows/{wf}/dispatches", {"ref": ref})
            out.append((wf, "NOT started today: started it now"))
    return out


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", "AhmedNasr289/egybi"))
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args(argv)
    token = os.environ.get("GITHUB_TOKEN")
    call = call_with_token(token) if token else call_with_gh
    today = dt.datetime.now(dt.timezone.utc).date()
    lines = [f"Daily refresh catch-up, {today} (UTC):"]
    for wf, what in catch_up(call, a.repo, today, dry_run=a.dry_run):
        lines.append(f"  {wf}: {what}")
    text = "\n".join(lines)
    print(text)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write("```\n" + text + "\n```\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
