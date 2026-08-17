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
# ALERTING IS REQUIRED OF ANYTHING THAT CAN FIRE UNATTENDED, and only of that.
#
# The rule used to ask it of every workflow, which flagged probe-geocodes and
# probe-idsc — both workflow_dispatch-only. A human presses the button on those
# and watches the result; an alert would be telling them what they are already
# looking at. Two findings nobody could act on is how a report becomes
# background noise, and this one had been printing them for days.
#
# A schedule, a push or a pull_request can all fire with nobody watching, and
# those are exactly the runs whose failure has to reach someone.
UNATTENDED = ("schedule", "push", "pull_request")

gaps = []
for r in rows:
    if r["timeout"] == "NONE":
        gaps.append(f"{r['name']}: no timeout — a hung step runs for GitHub's default six hours")
    fires = [t for t in UNATTENDED if t in r["trig"].split(",")]
    if r["alerts"] == "NO" and fires:
        gaps.append(f"{r['name']}: fires unattended ({', '.join(fires)}) "
                    "with no failure alerting — it can fail silently forever")
if gaps:
    print("\nGaps:")
    for g in gaps:
        print("  -", g)
if problems:
    print("\nUNPARSEABLE:")
    for p in problems:
        print("  -", p)
    sys.exit(1)

# A GAP HAS TO FAIL, or naming it changes nothing.
#
# This printed its findings and exited 0, so it could report that two workflows
# might fail silently forever and still let every build pass — a checker whose
# own verdict is advisory. sys.exit(1) fired only on YAML this file could not
# parse, which is the one thing that is not a gap in the workflows at all.
if gaps:
    sys.exit(1)
