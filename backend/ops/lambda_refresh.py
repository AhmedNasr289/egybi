"""EgyBI's daily price and FX refresh, run on AWS Lambda.

Why this exists
---------------
GitHub's scheduler starts the 07:17 UTC refreshes 6 to 9 hours late, and once
the repository is private the daily data would also stop whenever the month's
Actions minutes run out. EventBridge Scheduler starts this function on time,
and it does not use Actions minutes at all.

What one run does (the same steps as refresh-prices.yml / refresh-fx.yml)
-----------------------------------------------------------------------------
1. Read the GitHub token from SSM Parameter Store (SecureString).
2. Download main at its current commit as a tarball into /tmp.
3. Run the workflow's own scripts, unchanged: fetch, the stale-data check,
   static-audit.py, the page builders and sitemap_lastmod.py. They are
   standard-library Python, so the stock Lambda runtime runs them as they are.
4. If none of the job's files changed, stop.
5. Otherwise make one commit through GitHub's Git Data API, with main's current
   commit as its parent, and move main only if it still points there. If main
   moved meanwhile, start again from the new tip: generated files are rebuilt,
   never merged (the rule push-with-regenerate.sh follows).
6. Ping IndexNow with the changed URLs.
7. On failure, open or comment on the same "⚠️ CI failure: <workflow>" issue the
   GitHub workflow's notify-failure action uses. No email is sent.

Event: {"job": "prices" | "fx", "dry_run": bool}. A dry run does steps 1-4 and
reports which files it would commit, writing nothing anywhere.

Standard library only, apart from boto3 for SSM, which the Lambda runtime
provides and which is imported only when the token is read.
"""
from __future__ import annotations

import base64
import datetime as dt
import io
import json
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Callable, Optional

REPO = os.environ.get("EGYBI_REPO", "AhmedNasr289/egybi")
BRANCH = "main"
TOKEN_PARAM = os.environ.get("EGYBI_TOKEN_PARAM", "/egybi/github-token")
AUTHOR = {"name": "egybi-data-bot", "email": "41898282+github-actions[bot]@users.noreply.github.com"}
STALE_DAYS = 5
ATTEMPTS = 3
STEP_TIMEOUT = 600
# Seconds kept back before Lambda's own limit so a run that is running out of
# time can still open the alert issue. Killed by the limit, it would leave no
# trace except a CloudWatch metric, because nothing retries it.
RESERVE = 45

# One entry per GitHub workflow. 'paths' is DATA + DERIVED from that workflow's
# push-with-regenerate.sh call; keep the two lists in step.
JOBS: dict[str, dict[str, Any]] = {
    "prices": {
        "workflow": "Refresh daily prices",
        "message": "Automated daily price refresh — IDSC [skip ci]",
        "fetch": "backend/pipeline/fetch_prices.py",
        "stale_file": "site/data/prices-today.json",
        "stale_label": "Prices",
        "build": ["backend/pipeline/build_prices_pages.py", "backend/pipeline/build_food_prices.py"],
        "paths": [
            "site/data/prices-today.json", "site/data/prices-history.json",
            "site/prices.html", "site/prices-ar.html", "site/egypt-food-prices.html",
            "site/charts/egypt-food-prices.svg", "site/charts/egypt-food-prices-narrow.svg",
            "site/sitemap.xml",
        ],
    },
    "fx": {
        "workflow": "Refresh daily FX rates",
        "message": "Automated daily FX refresh — ExchangeRate-API [skip ci]",
        "fetch": "backend/pipeline/fetch_fx.py",
        "stale_file": "site/data/fx-today.json",
        "stale_label": "FX rates",
        "build": ["backend/pipeline/build_currency_story.py", "backend/pipeline/build_food_prices.py"],
        "paths": [
            "site/data/fx-today.json", "site/data/fx-history.json",
            "site/egyptian-pound-since-july.html", "site/charts/egyptian-pound.svg",
            "site/charts/egyptian-pound-narrow.svg", "site/egypt-food-prices.html",
            "site/charts/egypt-food-prices.svg", "site/charts/egypt-food-prices-narrow.svg",
            "site/sitemap.xml",
        ],
    },
}


class RefreshError(Exception):
    """A step failed; the message is what the alert issue should say."""


class GitHub:
    """The few GitHub REST calls a run needs. Tests replace request()."""

    def __init__(self, token: str, repo: str = REPO) -> None:
        self.token, self.repo = token, repo

    def request(self, method: str, path: str, body: Optional[dict] = None, raw: bool = False) -> Any:
        url = path if path.startswith("https://") else f"https://api.github.com{path}"
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(url, data=data, method=method, headers={
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "egybi-daily-refresh",
            **({"Content-Type": "application/json"} if data else {}),
        })
        with urllib.request.urlopen(req, timeout=60) as r:
            payload = r.read()
        return payload if raw else (json.loads(payload) if payload else None)

    # --- the calls -----------------------------------------------------------
    def head(self) -> str:
        return self.request("GET", f"/repos/{self.repo}/git/ref/heads/{BRANCH}")["object"]["sha"]

    def tarball(self, sha: str) -> bytes:
        return self.request("GET", f"/repos/{self.repo}/tarball/{sha}", raw=True)

    def commit_files(self, parent: str, files: dict[str, Optional[bytes]], message: str) -> str:
        base_tree = self.request("GET", f"/repos/{self.repo}/git/commits/{parent}")["tree"]["sha"]
        tree = []
        for path, content in sorted(files.items()):
            if content is None:
                tree.append({"path": path, "mode": "100644", "type": "blob", "sha": None})
                continue
            blob = self.request("POST", f"/repos/{self.repo}/git/blobs",
                                {"content": base64.b64encode(content).decode(), "encoding": "base64"})
            tree.append({"path": path, "mode": "100644", "type": "blob", "sha": blob["sha"]})
        t = self.request("POST", f"/repos/{self.repo}/git/trees", {"base_tree": base_tree, "tree": tree})
        now = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        c = self.request("POST", f"/repos/{self.repo}/git/commits", {
            "message": message, "tree": t["sha"], "parents": [parent],
            "author": {**AUTHOR, "date": now}, "committer": {**AUTHOR, "date": now}})
        return c["sha"]

    def move_branch(self, sha: str) -> bool:
        """Fast-forward main to sha. False when main moved (GitHub says 422)."""
        try:
            self.request("PATCH", f"/repos/{self.repo}/git/refs/heads/{BRANCH}", {"sha": sha, "force": False})
            return True
        except urllib.error.HTTPError as e:
            moved = e.code == 422
            e.close()          # the error carries an open response; close it either way
            if moved:
                return False
            raise

    def alert(self, workflow: str, body: str) -> None:
        title = f"⚠️ CI failure: {workflow}"
        found = self.request("GET", f"/repos/{self.repo}/issues?state=open&per_page=100")
        for issue in found or []:
            if issue.get("title") == title and "pull_request" not in issue:
                self.request("POST", f"/repos/{self.repo}/issues/{issue['number']}/comments", {"body": body})
                return
        self.request("POST", f"/repos/{self.repo}/issues", {"title": title, "body": body})


def ssm_token() -> str:
    import boto3  # provided by the Lambda runtime; imported only here
    p = boto3.client("ssm").get_parameter(Name=TOKEN_PARAM, WithDecryption=True)
    return p["Parameter"]["Value"]


def unpack(tar_bytes: bytes, into: Path) -> Path:
    """Extract a GitHub tarball and return the repository root inside it."""
    with tarfile.open(fileobj=io.BytesIO(tar_bytes), mode="r:gz") as tf:
        tf.extractall(into, filter="data")
    roots = [p for p in into.iterdir() if p.is_dir()]
    if len(roots) != 1:
        raise RefreshError(f"tarball has {len(roots)} top-level folders, expected 1")
    return roots[0]


def run(root: Path, log: list[str], *argv: str, deadline: Optional[float] = None) -> None:
    """Run one repo script. Its time limit is STEP_TIMEOUT or whatever is left
    before the deadline (a time.monotonic() value), whichever is shorter."""
    limit = float(STEP_TIMEOUT)
    if deadline is not None:
        left = deadline - time.monotonic()
        if left < 5:
            raise RefreshError(f"out of time before {argv[0]} ({max(left, 0):.0f} s left before Lambda's limit)")
        limit = min(limit, left)
    env = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1", "HOME": str(root.parent)}
    try:
        p = subprocess.run([sys.executable, *argv], cwd=root, env=env, capture_output=True,
                           text=True, timeout=limit)
    except subprocess.TimeoutExpired:
        raise RefreshError(f"{argv[0]} ran past its {limit:.0f} s limit")
    out = (p.stdout + p.stderr).strip()
    log.append(f"$ python {' '.join(argv)}  (exit {p.returncode})")
    if out:
        log.extend(out.splitlines()[-40:])
    if p.returncode != 0:
        raise RefreshError(f"{argv[0]} exited {p.returncode}")


def stale_check(root: Path, job: dict, log: list[str], today: dt.date) -> None:
    d = json.loads((root / job["stale_file"]).read_text(encoding="utf-8"))
    as_of = (d.get("retail") or {}).get("as_of") if job["stale_label"] == "Prices" else d.get("as_of")
    as_of = as_of or d.get("fetched_at")
    age = (today - dt.date.fromisoformat(as_of)).days
    log.append(f"{job['stale_label']} as_of {as_of} — {age} day(s) old")
    if age > STALE_DAYS:
        raise RefreshError(f"{job['stale_label']} are {age} days stale (as_of {as_of}).")


def refresh_once(gh: GitHub, job: dict, log: list[str], today: dt.date, work: Path,
                 deadline: Optional[float] = None):
    """One attempt. Returns (parent sha, changed files, changed-urls path)."""
    sha = gh.head()
    log.append(f"main is {sha[:7]}")
    root = unpack(gh.tarball(sha), work)
    before = {p: ((root / p).read_bytes() if (root / p).exists() else None) for p in job["paths"]}
    changed_urls = work / "changed-urls.txt"
    run(root, log, job["fetch"], deadline=deadline)
    stale_check(root, job, log, today)
    run(root, log, "backend/verify/static-audit.py", deadline=deadline)
    for script in job["build"]:
        run(root, log, script, deadline=deadline)
    run(root, log, "backend/pipeline/sitemap_lastmod.py", "--changed-out", str(changed_urls), deadline=deadline)
    after = {p: ((root / p).read_bytes() if (root / p).exists() else None) for p in job["paths"]}
    changed = {p: after[p] for p in job["paths"] if after[p] != before[p]}
    return sha, changed, root, changed_urls


def handler(event: dict, context: Any = None, *, gh: Optional[GitHub] = None,
            token: Optional[Callable[[], str]] = None, today: Optional[dt.date] = None) -> dict:
    name = (event or {}).get("job", "")
    if name not in JOBS:
        return {"ok": False, "error": f"unknown job {name!r}; use one of {sorted(JOBS)}"}
    job, dry = JOBS[name], bool((event or {}).get("dry_run"))
    today = today or dt.datetime.now(dt.timezone.utc).date()
    gh = gh or GitHub((token or ssm_token)())
    log: list[str] = [f"{name}: {'dry run' if dry else 'live'} on {today.isoformat()}"]
    # Lambda says how long it has left; stop with RESERVE seconds to spare.
    left_ms = getattr(context, "get_remaining_time_in_millis", None)
    deadline = (time.monotonic() + left_ms() / 1000 - RESERVE) if callable(left_ms) else None
    try:
        for attempt in range(1, ATTEMPTS + 1):
            work = Path(tempfile.mkdtemp(prefix="egybi-"))
            try:
                sha, changed, root, urls = refresh_once(gh, job, log, today, work, deadline)
                if not changed:
                    log.append("nothing changed: main already holds this content")
                    return {"ok": True, "job": name, "committed": None, "changed": [], "log": log}
                if dry:
                    log.append(f"would commit {len(changed)} file(s): {', '.join(sorted(changed))}")
                    return {"ok": True, "job": name, "dry_run": True, "committed": None,
                            "changed": sorted(changed), "log": log}
                new = gh.commit_files(sha, changed, job["message"])
                if gh.move_branch(new):
                    log.append(f"committed {new[:7]} on {sha[:7]} ({len(changed)} file(s))")
                    if urls.exists() and urls.stat().st_size > 0:
                        try:   # a failed ping must not turn a good refresh into an alert
                            run(root, log, "backend/pipeline/indexnow_ping.py", str(urls), deadline=deadline)
                        except RefreshError as ping_error:
                            log.append(f"IndexNow ping skipped: {ping_error}")
                    return {"ok": True, "job": name, "committed": new, "changed": sorted(changed), "log": log}
                log.append(f"attempt {attempt}: main moved past {sha[:7]}; rebuilding on the new tip")
            finally:
                shutil.rmtree(work, ignore_errors=True)
        raise RefreshError(f"main kept moving; gave up after {ATTEMPTS} attempts")
    except Exception as e:  # every failure is reported, never swallowed
        reason = f"{type(e).__name__}: {e}"
        log.append(f"FAILED {reason}")
        if not dry:
            try:
                gh.alert(job["workflow"], "\n".join([
                    f"The **{job['workflow']}** run on AWS Lambda failed on {today.isoformat()}.", "",
                    "What the run said about itself:", "", "```", "\n".join(log[-30:])[:4000], "```"]))
            except Exception as alert_error:  # the alert failing must not hide the first failure
                log.append(f"alert failed too: {type(alert_error).__name__}: {alert_error}")
        return {"ok": False, "job": name, "error": reason, "log": log}


def lambda_handler(event: dict, context: Any) -> dict:
    """The AWS entry point. Prints the log so CloudWatch keeps it."""
    result = handler(event, context)
    print("\n".join(result.get("log", [])))
    if not result.get("ok"):
        raise RuntimeError(result.get("error", "refresh failed"))  # marks the invocation as an error
    return {k: v for k, v in result.items() if k != "log"}
