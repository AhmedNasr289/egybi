"""What every workflow actually declares, read from the YAML rather than memory.

checks.py already asks whether a workflow has a gap. This asks a different
question: what does the whole fleet look like at once — triggers, path filters,
timeouts, concurrency, whether it writes back to the repo, and whether anyone
is told when it fails.

The reason it is worth having is that this repo has already shipped a trigger
narrower than the inputs its generator reads: build-pages.yml watched three
paths while build_static_pages.py also read site/blog.html for the shared nav,
so editing the nav updated the live pages and left all 135 generated ones on
the old markup — the exact drift the design existed to prevent. A per-file
reading never shows that. A fleet-wide one does.

Read-only: reports, changes nothing, exits 0 unless a workflow is unparseable.
"""
import re
import sys
from pathlib import Path

import yaml

for _s in (sys.stdout, sys.stderr):
    if hasattr(_s, "reconfigure"):
        _s.reconfigure(encoding="utf-8", errors="replace")

WF = Path(".github/workflows")


def triggers(on):
    """`on:` is a string, a list or a dict depending on how it was written, and
    PyYAML parses the bare word `on` as the BOOLEAN True — so d['on'] misses it
    on every file that uses the unquoted form. Handle both keys."""
    if isinstance(on, str):
        return [on]
    if isinstance(on, list):
        return list(on)
    if isinstance(on, dict):
        return list(on)
    return []


rows, problems = [], []
for f in sorted(WF.glob("*.yml")):
    try:
        d = yaml.safe_load(f.read_text(encoding="utf-8"))
    except Exception as e:                                    # noqa: BLE001
        problems.append(f"{f.name}: unparseable — {e}")
        continue
    on = d.get("on", d.get(True, {}))
    trig = triggers(on)

    paths, cron = [], []
    if isinstance(on, dict):
        for k, v in on.items():
            if isinstance(v, dict):
                paths += v.get("paths", []) or []
                for s in (v.get("schedules") or v.get("schedule") or []):
                    if isinstance(s, dict) and s.get("cron"):
                        cron.append(s["cron"])
        sched = on.get("schedule")
        if isinstance(sched, list):
            cron += [s.get("cron") for s in sched if isinstance(s, dict) and s.get("cron")]

    jobs = d.get("jobs", {}) or {}
    timeout = next((j.get("timeout-minutes") for j in jobs.values()
                    if isinstance(j, dict) and j.get("timeout-minutes")), None)
    conc = "yes" if d.get("concurrency") else "NO"

    raw = f.read_text(encoding="utf-8")
    # `git push` is the honest marker for a workflow that writes back — a
    # commit that is never pushed changes nothing and triggers no deploy.
    writes = "yes" if re.search(r"git push", raw) else "no"
    alerts = "yes" if re.search(r"notify-failure|if:\s*failure\(\)", raw) else "NO"

    rows.append(dict(name=f.name.replace(".yml", ""), trig=",".join(sorted(trig)),
                     paths=len(paths), cron=";".join(cron) or "-",
                     timeout=timeout or "NONE", conc=conc, writes=writes, alerts=alerts))

w = max(len(r["name"]) for r in rows)
print(f"{'workflow':<{w}}  {'triggers':<34} {'paths':>5} {'timeout':>7}  {'conc':<5} {'push':<5} {'alert':<5} cron")
print("-" * (w + 88))
for r in rows:
    print(f"{r['name']:<{w}}  {r['trig']:<34} {r['paths']:>5} {str(r['timeout']):>7}  "
          f"{r['conc']:<5} {r['writes']:<5} {r['alerts']:<5} {r['cron']}")

print(f"\n{len(rows)} workflow(s).")
gaps = []
for r in rows:
    if r["timeout"] == "NONE":
        gaps.append(f"{r['name']}: no timeout — a hung step runs for GitHub's default six hours")
    if r["alerts"] == "NO":
        gaps.append(f"{r['name']}: no failure alerting — it can fail silently forever")
if gaps:
    print("\nGaps:")
    for g in gaps:
        print("  -", g)
if problems:
    print("\nUNPARSEABLE:")
    for p in problems:
        print("  -", p)
    sys.exit(1)
