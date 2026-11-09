#!/usr/bin/env python3
"""cache-bump.py: an asset that changed must be asked for under a new version.

The server sends every file in site/assets/ with
`Cache-Control: public, max-age=604800, immutable`, and Hostinger's CDN keeps
its own copies by URL. So a browser, or a CDN edge, that already holds
`account.js?v=1` will go on serving that copy for up to a week, whatever is on
disk. A change reaches readers only when the pages ask for a NEW URL
(`?v=2`).

On 2026-11-09 PR #98 changed account.js and left account.html on `?v=1`. The
same URL then returned the new file from some CDN edges and the old one from
others. Every check passed: static-audit confirms all pages ask for the SAME
version, which they did, but nothing asked whether that version had moved.

This compares the working tree with a base commit (the PR's base, or the
commit before a push):
  * every .js/.css under site/assets/ whose bytes changed and which pages or
    scripts request with `?v=N` must be requested with a different N than at
    the base, everywhere it is requested;
  * a changed asset requested WITHOUT any `?v=` is reported too: under
    `immutable` it cannot reach a returning reader for a week either.
New files are exempt (no cached copy can exist). The working tree, not HEAD,
is compared, so an uncommitted edit counts.

Base: --base, else $CACHE_BASE, else HEAD~1. Exits 1 on any finding.
"""
from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / "site"
REFERRERS = ("*.html", "assets/*.js")       # where assets are requested from
ASSET_RE = re.compile(r"^site/assets/(?!vendor/)[^/]+\.(js|css)$")


def git(*args: str, check: bool = True) -> str:
    out = subprocess.run(["git", "-C", str(ROOT), *args], capture_output=True, text=True,
                         encoding="utf-8", errors="replace")
    if check and out.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)}: {out.stderr.strip()[:200]}")
    return out.stdout


def resolve_base(arg: str | None) -> str:
    base = arg or os.environ.get("CACHE_BASE") or "HEAD~1"
    if set(base) == {"0"}:          # a push that created the branch has before=000...
        base = "HEAD~1"
    if git("rev-parse", "--verify", "--quiet", base + "^{commit}", check=False).strip():
        return base
    # A shallow checkout may not have it yet.
    git("fetch", "--quiet", "--depth=2", "origin", base if base != "HEAD~1" else "HEAD", check=False)
    if base == "HEAD~1":
        git("fetch", "--quiet", "--deepen=1", check=False)
    if not git("rev-parse", "--verify", "--quiet", base + "^{commit}", check=False).strip():
        raise RuntimeError(f"base {base!r} is not available in this checkout")
    return base


def normalise(b: bytes) -> bytes:
    # Line endings are not content: a Windows working copy holds CRLF.
    return b.replace(b"\r\n", b"\n")


def changed_assets(base: str) -> list[str]:
    names = git("diff", "--name-only", base, "--", "site/assets").split()
    out = []
    for n in names:
        if not ASSET_RE.match(n):
            continue
        p = ROOT / n
        if not p.is_file():
            continue                  # deleted: nothing to request
        old = subprocess.run(["git", "-C", str(ROOT), "show", f"{base}:{n}"], capture_output=True)
        if old.returncode != 0:
            continue                  # new file: no cached copy can exist
        if normalise(old.stdout) != normalise(p.read_bytes()):
            out.append(n)
    return out


def requests(text: str, name: str) -> list[str | None]:
    """Every request for assets/<name> in a file: its ?v= value, or None.

    Only a QUOTED reference counts (`src="../assets/x.js?v=2"`,
    `'auth.js?v=3'`): a file name mentioned in a comment ("a rule in
    egybi.css lands...") is prose, not a request, and matching it reported
    three false findings on the first run."""
    pat = re.compile(r"(?<=[\"'/])" + re.escape(name) + r"(\?v=([\w.-]+))?(?=[\"'])")
    return [m.group(2) for m in pat.finditer(text)]


def read_at(base: str, paths: list[str]) -> dict[str, str]:
    """The base commit's text of many files, in one git process.

    One `git show` per file took over two minutes for the 183 pages that
    request egybi.css on this workstation; `cat-file --batch` reads them all
    in one go. A path missing at the base maps to ''."""
    if not paths:
        return {}
    proc = subprocess.run(["git", "-C", str(ROOT), "cat-file", "--batch"],
                          input="".join(f"{base}:{p}\n" for p in paths).encode(), capture_output=True)
    out, data, i = {}, proc.stdout, 0
    for p in paths:
        nl = data.index(b"\n", i)
        header = data[i:nl].decode()
        i = nl + 1
        if header.endswith(" missing"):
            out[p] = ""
            continue
        size = int(header.rsplit(" ", 1)[1])
        out[p] = data[i:i + size].decode("utf-8", "replace")
        i += size + 1                 # the object, then its trailing newline
    return out


def referrers() -> list[Path]:
    seen: list[Path] = []
    for pat in REFERRERS:
        seen += [p for p in SITE.rglob(pat) if "vendor" not in p.parts]
    return sorted(set(seen))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--base")
    a = ap.parse_args(argv)
    try:
        base = resolve_base(a.base)
    except RuntimeError as e:
        print(f"cache-bump: cannot run: {e}")
        return 2
    assets = changed_assets(base)
    print(f"cache-bump: base {git('rev-parse', '--short', base).strip()}, "
          f"{len(assets)} changed asset(s): {', '.join(a.split('/')[-1] for a in assets) or 'none'}")
    findings = []
    texts = {f.relative_to(ROOT).as_posix(): f.read_text(encoding="utf-8", errors="replace") for f in referrers()}
    for asset in assets:
        name = asset.split("/")[-1]
        now, unversioned = {}, []
        for rel, text in texts.items():
            if rel == asset:
                continue
            cur = requests(text, name)
            if cur:
                now[rel] = cur
        before = read_at(base, sorted(now))
        then = {rel: requests(before[rel], name) for rel in now}
        for rel, cur in now.items():
            if None in cur:
                unversioned.append(rel)
        for rel in unversioned:
            findings.append(f"{name} changed, and {rel} requests it with no ?v=: "
                            f"returning readers keep the old copy for up to a week")
        for rel, cur in now.items():
            stale = sorted({v for v in cur if v is not None and v in then.get(rel, [])})
            if stale:
                findings.append(f"{name} changed, and {rel} still requests ?v={stale[0]} as at the base: "
                                f"bump the version")
    for f in findings:
        print("FAIL  " + f)
    print(f"cache-bump: {len(findings)} finding(s)" if findings
          else "cache-bump: every changed asset is requested under a new version")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
