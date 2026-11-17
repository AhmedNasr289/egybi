#!/usr/bin/env python3
"""Did the mutation shards, together, run every case? (2026-11-17)

mutate.py runs in n parallel CI jobs (SHARD=k/n), because the whole suite
outgrew one 60-minute job: #154 and #156 were cancelled at the cap, and a
cancelled run proves nothing. Splitting it opens a new way to prove nothing:
a shard that never started, or a dealing rule that skips cases, would leave
the other shards green while some checkers went untested. This closes that.

Each shard writes "k n ran seen" to its logs (mutate-shard.txt). Given the
directory holding every shard's downloaded logs, this fails unless:
  - exactly n shard files are present, one per k = 1..n, all with the same n;
  - every shard counted the same `seen` (the cases in the file);
  - the shards' `ran` add up to `seen`, so no case was dropped or run twice.

  mutate-shards.py DIR        check the shards under DIR
  mutate-shards.py --selftest show the check failing on each kind of fault

Exits 1 on any failure.
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path


def check(root: Path) -> list[str]:
    rows = []
    for f in sorted(root.rglob("mutate-shard.txt")):
        parts = f.read_text(encoding="utf-8").split()
        if len(parts) != 4 or not all(p.isdigit() for p in parts):
            return [f"{f}: unreadable shard record {' '.join(parts)!r}"]
        rows.append(tuple(int(p) for p in parts))
    if not rows:
        return [f"no mutate-shard.txt under {root}: no shard reported"]
    ns = {n for _, n, _, _ in rows}
    if len(ns) != 1:
        return [f"shards disagree on how many shards there are: {sorted(ns)}"]
    n = ns.pop()
    ks = sorted(k for k, _, _, _ in rows)
    errs = []
    if ks != list(range(1, n + 1)):
        missing = sorted(set(range(1, n + 1)) - set(ks))
        extra = [k for k in ks if ks.count(k) > 1 or not 1 <= k <= n]
        errs.append(f"expected shards 1..{n}, got {ks}"
                    + (f" - missing {missing}" if missing else "")
                    + (f" - duplicated/out of range {sorted(set(extra))}" if extra else ""))
    seens = {s for _, _, _, s in rows}
    if len(seens) != 1:
        errs.append(f"shards counted different case totals: {sorted(seens)}")
    ran = sum(r for _, _, r, _ in rows)
    total = max(seens)
    if total == 0:
        errs.append("the shards counted 0 cases: nothing was proven")
    elif ran != total:
        errs.append(f"the shards ran {ran} case(s) between them, the suite has {total}")
    if not errs:
        print(f"mutation shards: {n} of {n} reported, {ran} of {total} case(s) run between them")
    return errs


def selftest() -> bool:
    """Each fault must be reported, and a correct set must pass."""
    cases = {
        "all three shards, all cases": (["1 3 5 14", "2 3 5 14", "3 3 4 14"], True),
        "a shard that never reported": (["1 3 5 14", "3 3 4 14"], False),
        "a shard that ran too few": (["1 3 5 14", "2 3 4 14", "3 3 4 14"], False),
        "shards counting different totals": (["1 3 5 14", "2 3 5 15", "3 3 4 14"], False),
        "the same shard twice": (["1 3 5 14", "1 3 5 14", "3 3 4 14"], False),
        "nothing reported at all": ([], False),
        "every shard counted zero cases": (["1 3 0 0", "2 3 0 0", "3 3 0 0"], False),
    }
    ok = True
    for name, (records, want_pass) in cases.items():
        with tempfile.TemporaryDirectory() as d:
            for i, rec in enumerate(records):
                p = Path(d) / f"verify-logs-mutation-{i}"
                p.mkdir()
                (p / "mutate-shard.txt").write_text(rec + "\n", encoding="utf-8")
            errs = check(Path(d))
        passed = not errs
        good = passed == want_pass
        ok &= good
        print(f"  selftest {'ok  ' if good else 'BAD '} {name}: "
              f"{'passes' if passed else 'fails - ' + errs[0]}")
    return ok


if __name__ == "__main__":
    if sys.argv[1:] == ["--selftest"]:
        sys.exit(0 if selftest() else 1)
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    problems = check(Path(sys.argv[1]))
    for p in problems:
        print("FAIL " + p)
    sys.exit(1 if problems else 0)
