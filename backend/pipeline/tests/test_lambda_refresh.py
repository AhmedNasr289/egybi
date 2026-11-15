"""backend/ops/lambda_refresh.py: the AWS daily refresh, end to end, without the network.

A fake GitHub holds blobs, trees, commits and the branch in memory, and serves
a tarball of a tiny repo whose scripts are stand-ins for the real ones (each
writes the files the real script writes). So every test runs the handler's
real flow: download, run the steps, diff, commit, move the branch, alert.
"""
from __future__ import annotations

import base64
import datetime as dt
import io
import json
import sys
import tarfile
import unittest
import urllib.error
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "ops"))

import lambda_refresh as lr  # noqa: E402

TODAY = dt.date(2026, 11, 15)

# Stand-in scripts. MODE files in the repo steer them, so one tarball builder
# covers every case.
FETCH_PRICES = '''
import json, pathlib
mode = pathlib.Path("MODE").read_text().strip()
if mode == "fail-fetch":
    raise SystemExit("fetch_prices: source unreachable")
as_of = {"stale": "2026-11-01"}.get(mode, "2026-11-14")
if mode == "same":
    raise SystemExit(0)
p = pathlib.Path("site/data/prices-today.json")
p.write_text(json.dumps({"fetched_at": "2026-11-15", "retail": {"as_of": as_of}}))
pathlib.Path("site/data/prices-history.json").write_text('{"n": 2}')
'''
BUILD = '''
import json, pathlib
d = json.loads(pathlib.Path("site/data/prices-today.json").read_text())
pathlib.Path("site/prices.html").write_text("prices " + d["retail"]["as_of"])
'''
SITEMAP = '''
import sys, pathlib
out = sys.argv[sys.argv.index("--changed-out") + 1]
pathlib.Path(out).write_text("https://egybi.com/prices.html\\n")
'''
PING = '''
import sys, pathlib
pathlib.Path(sys.argv[1]).with_name("PINGED").write_text("yes")
'''
OK = "raise SystemExit(0)\n"


def repo_tar(sha: str, mode: str) -> bytes:
    files = {
        "MODE": mode,
        "backend/pipeline/fetch_prices.py": FETCH_PRICES,
        "backend/pipeline/build_prices_pages.py": BUILD,
        "backend/pipeline/build_food_prices.py": OK,
        "backend/pipeline/sitemap_lastmod.py": SITEMAP,
        "backend/pipeline/indexnow_ping.py": PING,
        "backend/verify/static-audit.py": OK,
        "site/data/prices-today.json": json.dumps({"fetched_at": "2026-11-14", "retail": {"as_of": "2026-11-13"}}),
        "site/data/prices-history.json": '{"n": 1}',
        "site/prices.html": "prices 2026-11-13",
    }
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tf:
        for path, text in files.items():
            data = text.encode()
            info = tarfile.TarInfo(f"AhmedNasr289-egybi-{sha[:7]}/{path}")
            info.size = len(data)
            tf.addfile(info, io.BytesIO(data))
    return buf.getvalue()


class FakeGitHub(lr.GitHub):
    def __init__(self, mode: str = "change", moves: int = 0) -> None:
        super().__init__("fake-token")
        self.mode, self.moves = mode, moves      # moves: how many PATCHes to refuse
        self.tip = "a" * 40
        self.blobs: dict[str, bytes] = {}
        self.commits: dict[str, dict] = {}
        self.trees: list[dict] = []
        self.issues: list[dict] = []
        self.comments: list[dict] = []
        self.tarballs: list[str] = []
        self.writes = 0
        self.n = 0

    def _id(self) -> str:
        self.n += 1
        return f"{self.n:040x}"

    def request(self, method, path, body=None, raw=False):
        if method != "GET":
            self.writes += 1
        if path.endswith("/git/ref/heads/main"):
            return {"object": {"sha": self.tip}}
        if "/tarball/" in path:
            sha = path.rsplit("/", 1)[1]
            self.tarballs.append(sha)
            return repo_tar(sha, self.mode)
        if "/git/commits/" in path and method == "GET":
            return {"tree": {"sha": "tree-of-" + path.rsplit("/", 1)[1][:7]}}
        if path.endswith("/git/blobs"):
            sha = self._id(); self.blobs[sha] = base64.b64decode(body["content"]); return {"sha": sha}
        if path.endswith("/git/trees"):
            self.trees.append(body); return {"sha": self._id()}
        if path.endswith("/git/commits"):
            sha = self._id(); self.commits[sha] = body; return {"sha": sha}
        if path.endswith("/git/refs/heads/main") and method == "PATCH":
            if self.moves > 0:
                self.moves -= 1
                self.tip = "b" * 40           # someone else pushed meanwhile
                raise urllib.error.HTTPError(path, 422, "not fast-forward", None, io.BytesIO(b"{}"))
            assert body["force"] is False
            self.tip = body["sha"]; return {}
        if "/issues?" in path:
            return [dict(i, number=k + 1) for k, i in enumerate(self.issues)]
        if path.endswith("/comments"):
            self.comments.append(body); return {}
        if path.endswith("/issues"):
            self.issues.append(body); return {}
        raise AssertionError(f"unexpected call {method} {path}")


def go(gh: FakeGitHub, **event) -> dict:
    return lr.handler({"job": "prices", **event}, gh=gh, today=TODAY)


class LambdaRefresh(unittest.TestCase):
    def test_changed_data_makes_one_commit_on_the_tip(self):
        gh = FakeGitHub("change")
        r = go(gh)
        self.assertTrue(r["ok"], r)
        self.assertEqual(r["changed"], ["site/data/prices-history.json", "site/data/prices-today.json", "site/prices.html"])
        (sha, c), = gh.commits.items()
        self.assertEqual(c["parents"], ["a" * 40])
        self.assertEqual(c["message"], "Automated daily price refresh — IDSC [skip ci]")
        self.assertEqual(c["author"]["name"], "egybi-data-bot")
        self.assertEqual(gh.tip, sha)                       # main moved to it
        paths = sorted(e["path"] for e in gh.trees[0]["tree"])
        self.assertEqual(paths, r["changed"])
        self.assertIn(b"2026-11-14", b"".join(gh.blobs.values()))
        self.assertEqual(gh.issues, [])

    def test_nothing_changed_commits_nothing(self):
        gh = FakeGitHub("same")
        r = go(gh)
        self.assertTrue(r["ok"], r)
        self.assertEqual(r["changed"], [])
        self.assertEqual(gh.writes, 0)

    def test_dry_run_writes_nothing(self):
        gh = FakeGitHub("change")
        r = go(gh, dry_run=True)
        self.assertTrue(r["ok"], r)
        self.assertEqual(len(r["changed"]), 3)
        self.assertEqual(gh.writes, 0)
        self.assertEqual(gh.tip, "a" * 40)

    def test_stale_data_alerts_and_does_not_commit(self):
        gh = FakeGitHub("stale")
        r = go(gh)
        self.assertFalse(r["ok"])
        self.assertIn("14 days stale", r["error"])
        self.assertEqual(gh.commits, {})
        self.assertEqual(gh.issues[0]["title"], "⚠️ CI failure: Refresh daily prices")
        self.assertIn("AWS Lambda", gh.issues[0]["body"])

    def test_a_failing_script_alerts_with_its_own_words(self):
        gh = FakeGitHub("fail-fetch")
        r = go(gh)
        self.assertFalse(r["ok"])
        self.assertEqual(gh.commits, {})
        self.assertIn("source unreachable", gh.issues[0]["body"])

    def test_a_second_failure_comments_on_the_open_issue(self):
        gh = FakeGitHub("fail-fetch")
        go(gh); go(gh)
        self.assertEqual(len(gh.issues), 1)
        self.assertEqual(len(gh.comments), 1)

    def test_main_moving_rebuilds_on_the_new_tip(self):
        gh = FakeGitHub("change", moves=1)
        r = go(gh)
        self.assertTrue(r["ok"], r)
        self.assertEqual(gh.tarballs, ["a" * 40, "b" * 40])  # downloaded again
        self.assertEqual(gh.commits[r["committed"]]["parents"], ["b" * 40])
        self.assertEqual(gh.tip, r["committed"])

    def test_main_that_never_settles_gives_up_and_alerts(self):
        gh = FakeGitHub("change", moves=99)
        r = go(gh)
        self.assertFalse(r["ok"])
        self.assertIn("kept moving", r["error"])
        self.assertEqual(len(gh.issues), 1)

    def test_unknown_job_is_refused(self):
        r = lr.handler({"job": "weather"}, gh=FakeGitHub(), today=TODAY)
        self.assertFalse(r["ok"])

    def test_job_paths_match_the_workflows(self):
        """The file lists must stay in step with push-with-regenerate.sh's DATA + DERIVED."""
        root = Path(__file__).resolve().parents[3] / ".github" / "workflows"
        for name, wf in (("prices", "refresh-prices.yml"), ("fx", "refresh-fx.yml")):
            text = (root / wf).read_text(encoding="utf-8")
            call = text.split("push-with-regenerate.sh", 1)[1]
            quoted = [q for q in call.split('"')[1::2]][:3]   # msg, data, derived
            want = quoted[1].split() + quoted[2].split()
            self.assertEqual(lr.JOBS[name]["message"], quoted[0], wf)
            self.assertEqual(lr.JOBS[name]["paths"], want, wf)


if __name__ == "__main__":
    unittest.main()
