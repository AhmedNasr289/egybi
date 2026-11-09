#!/usr/bin/env python3
"""usage_guard.py: how many GitHub Actions minutes has this repo used this month?

Why this exists. On the Free plan a PRIVATE repo gets about 2,000 Actions
minutes a month (reset on the 1st). In November 2026 the repo used them up in
eight days and GitHub silently stopped starting jobs, so the daily price and
exchange-rate refreshes stopped too. Nothing told anyone. The repo went public
on 2026-11-09 (public repos are not metered) and is meant to go private again
on or after 2026-12-01. This guard runs daily so that, once private, crossing
70% or 90% of the month's allowance opens an issue instead of failing quietly.

How it measures. GitHub bills each job separately, rounded UP to the next whole
minute, multiplied by the runner's rate (Linux 1, Windows 2, macOS 10). The
billing report itself needs the account-level "user" scope, which the
workflow's GITHUB_TOKEN does not have and which would mean storing a personal
token. So this sums job times from the Actions API, which GITHUB_TOKEN with
`actions: read` can list. While the repo is public that sum is what the month
WOULD have cost if private, which is exactly the figure the switch back needs.

Limits, said plainly:
  * It counts this repository only. Minutes used by other private repos on the
    same account come out of the same 2,000 and are invisible here.
  * It counts the runs GitHub still lists. Deleted runs are not counted.
  * A job still in progress counts from its start to now.

Runs locally too: with no GITHUB_TOKEN in the environment it calls `gh api`,
so the token stays in the gh keyring.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import datetime as dt
import json
import math
import os
import subprocess
import sys
import urllib.request
from dataclasses import dataclass, field
from typing import Callable, Iterable

API = "https://api.github.com"
FREE_MINUTES = 2000
THRESHOLDS = (70, 90)
RATES = {"windows": 2, "macos": 10}  # every other runner bills at 1x

Fetch = Callable[[str], dict]


# ---------------------------------------------------------------- fetching
def fetch_with_token(token: str) -> Fetch:
    def fetch(path: str) -> dict:
        req = urllib.request.Request(
            API + path,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "egybi-usage-guard",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    return fetch


def fetch_with_gh(path: str) -> dict:
    # No leading slash: Git Bash on Windows rewrites "/repos/..." into a path.
    out = subprocess.run(["gh", "api", path.lstrip("/")], check=True,
                         capture_output=True, text=True, encoding="utf-8")
    return json.loads(out.stdout)


def paged(fetch: Fetch, path: str, key: str) -> Iterable[dict]:
    sep = "&" if "?" in path else "?"
    page = 1
    while True:
        data = fetch(f"{path}{sep}per_page=100&page={page}")
        items = data.get(key, [])
        yield from items
        if len(items) < 100:
            return
        page += 1


# ---------------------------------------------------------------- arithmetic
def parse_ts(s: str | None) -> dt.datetime | None:
    if not s:
        return None
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def rate_for(labels: list[str]) -> int:
    joined = " ".join(labels).lower()
    for name, rate in RATES.items():
        if name in joined:
            return rate
    return 1


def job_minutes(job: dict, now: dt.datetime) -> int:
    """Billed minutes for one job: whole minutes rounded up, times the rate.

    A skipped job, or one that never started, costs nothing. A job that ran
    for 0 seconds still costs nothing (GitHub bills nothing for it)."""
    if job.get("conclusion") == "skipped":
        return 0
    start = parse_ts(job.get("started_at"))
    if start is None:
        return 0
    end = parse_ts(job.get("completed_at")) or now
    seconds = (end - start).total_seconds()
    if seconds <= 0:
        return 0
    return math.ceil(seconds / 60) * rate_for(job.get("labels") or [])


@dataclass
class Tally:
    month: str
    minutes: int = 0
    runs: int = 0
    jobs: int = 0
    by_workflow: dict[str, int] = field(default_factory=dict)


def month_start(now: dt.datetime) -> dt.datetime:
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def tally(fetch: Fetch, repo: str, now: dt.datetime,
          since: dt.datetime | None = None, until: dt.datetime | None = None,
          workers: int = 8) -> Tally:
    start = since or month_start(now)
    t = Tally(month=start.strftime("%Y-%m"))
    created = f"{start:%Y-%m-%d}..{(until or now):%Y-%m-%d}"
    runs = []
    for run in paged(fetch, f"/repos/{repo}/actions/runs?created={created}", "workflow_runs"):
        made = parse_ts(run.get("created_at"))
        if made is None or made < start or (until and made >= until):
            continue
        runs.append(run)

    # One request per run for its jobs. Read one after another they took
    # 2 min 21 s on GitHub for 227 runs (9 November), three times the minute
    # the plan budgeted, and the count grows through the month. They are
    # independent, so read them side by side; the sums do not depend on order.
    # filter=all includes every attempt of a re-run; each attempt is billed.
    def jobs_of(run: dict) -> list[dict]:
        return list(paged(fetch, f"/repos/{repo}/actions/runs/{run['id']}/jobs?filter=all", "jobs"))

    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
        for run, jobs in zip(runs, pool.map(jobs_of, runs)):
            t.runs += 1
            name = run.get("name") or "?"
            for job in jobs:
                m = job_minutes(job, now)
                if m:
                    t.jobs += 1
                    t.minutes += m
                    t.by_workflow[name] = t.by_workflow.get(name, 0) + m
    return t


def days_in_month(now: dt.datetime) -> int:
    nxt = (now.replace(day=28) + dt.timedelta(days=4)).replace(day=1)
    return (nxt - dt.timedelta(days=1)).day


def projection(minutes: int, now: dt.datetime) -> int:
    """Straight-line month-end estimate from the share of the month elapsed."""
    elapsed = (now - month_start(now)).total_seconds() / 86400
    if elapsed < 1:
        return minutes
    return round(minutes * days_in_month(now) / elapsed)


def crossed(minutes: int, allowance: int = FREE_MINUTES,
            thresholds: Iterable[int] = THRESHOLDS) -> list[int]:
    pct = 100 * minutes / allowance
    return [th for th in thresholds if pct >= th]


def issue_title(threshold: int, month: str) -> str:
    return f"Actions minutes at {threshold}% of the month ({month})"


# ---------------------------------------------------------------- reporting
def report(t: Tally, now: dt.datetime, allowance: int, public: bool | None) -> str:
    pct = 100 * t.minutes / allowance
    proj = projection(t.minutes, now)
    lines = [
        f"## Actions minutes, {t.month} (to {now:%Y-%m-%d %H:%M} UTC)",
        "",
        f"**{t.minutes:,} minutes** from {t.jobs:,} billed jobs in {t.runs:,} runs: "
        f"**{pct:.1f}%** of the {allowance:,} a private repo gets on the Free plan.",
        f"At this pace the month ends near **{proj:,}** ({100 * proj / allowance:.0f}%).",
        "",
    ]
    if public is True:
        lines += ["The repo is **public** now, so none of this is billed. It is what the "
                  "month would cost if the repo were private.", ""]
    lines += ["| Workflow | Minutes |", "|---|---:|"]
    for name, m in sorted(t.by_workflow.items(), key=lambda kv: -kv[1]):
        lines.append(f"| {name} | {m:,} |")
    lines += ["", "_Counts this repository only; other private repos on the account share "
              "the same allowance. Each job is rounded up to a whole minute, as GitHub bills._"]
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY", "AhmedNasr289/egybi"))
    ap.add_argument("--allowance", type=int, default=FREE_MINUTES)
    ap.add_argument("--since", help="UTC date to start from (default: 1st of this month)")
    ap.add_argument("--until", help="UTC date to stop before (default: now)")
    ap.add_argument("--json-out", help="write the figures as JSON here")
    a = ap.parse_args(argv)

    token = os.environ.get("GITHUB_TOKEN")
    fetch = fetch_with_token(token) if token else fetch_with_gh
    now = dt.datetime.now(dt.timezone.utc)
    since = dt.datetime.fromisoformat(a.since).replace(tzinfo=dt.timezone.utc) if a.since else None
    until = dt.datetime.fromisoformat(a.until).replace(tzinfo=dt.timezone.utc) if a.until else None

    t = tally(fetch, a.repo, now, since, until)
    # A bounded window (--until) is reported, and projected, as of its own end.
    if until is not None and until < now:
        now = until
    try:
        public = not fetch(f"/repos/{a.repo}").get("private", True)
    except Exception:  # visibility is context for the report, never a reason to fail
        public = None
    text = report(t, now, a.allowance, public)
    print(text)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(text + "\n")
    hit = crossed(t.minutes, a.allowance)
    if a.json_out:
        with open(a.json_out, "w", encoding="utf-8") as f:
            json.dump({
                "month": t.month, "minutes": t.minutes, "runs": t.runs, "jobs": t.jobs,
                "allowance": a.allowance, "percent": round(100 * t.minutes / a.allowance, 1),
                "projected": projection(t.minutes, now), "public": public,
                "crossed": hit, "titles": [issue_title(th, t.month) for th in hit],
                "report": text,
            }, f, indent=2)
    return 0


if __name__ == "__main__":
    sys.exit(main())
