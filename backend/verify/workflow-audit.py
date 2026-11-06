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

    # Does the alert actually SAY anything? Read the step rather than grepping
    # the file: "reason" appears in prose comments all over these workflows, and
    # a rule satisfied by a comment is not a rule.
    alert_steps, reasoned, blind_to_timeout = 0, 0, 0
    # A workflow that cancels its own superseded runs (cancel-in-progress) sees
    # routine cancellations; one that never does sees a cancellation only when
    # a person cancels it or the job hits timeout-minutes.
    conc_cfg = d.get("concurrency")
    self_cancels = isinstance(conc_cfg, dict) and conc_cfg.get("cancel-in-progress") is True
    for j in jobs.values():
        if not isinstance(j, dict):
            continue
        for s in (j.get("steps") or []):
            if not isinstance(s, dict):
                continue
            if "notify-failure" in str(s.get("uses", "")):
                alert_steps += 1
                if str(((s.get("with") or {}).get("reason") or "")).strip():
                    reasoned += 1
                cond = str(s.get("if", ""))
                if not self_cancels and not re.search(r"cancelled\(\)|always\(\)", cond):
                    blind_to_timeout += 1

    raw = f.read_text(encoding="utf-8")
    # `git push` is the honest marker for a workflow that writes back — a
    # commit that is never pushed changes nothing and triggers no deploy.
    # The shared helper (.github/scripts/push-with-regenerate.sh) does the
    # push for build-pages and refresh-prices, so naming it counts too.
    writes = "yes" if re.search(r"git push|push-with-regenerate\.sh", raw) else "no"
    alerts = "yes" if re.search(r"notify-failure|if:\s*failure\(\)", raw) else "NO"

    rows.append(dict(name=f.name.replace(".yml", ""), trig=",".join(sorted(trig)),
                     paths=len(paths), cron=";".join(cron) or "-",
                     timeout=timeout or "NONE", conc=conc, writes=writes, alerts=alerts,
                     alert_steps=alert_steps, reasoned=reasoned, blind_to_timeout=blind_to_timeout))

w = max(len(r["name"]) for r in rows)
print(f"{'workflow':<{w}}  {'triggers':<34} {'paths':>5} {'timeout':>7}  {'conc':<5} {'push':<5} {'alert':<5} {'why':<4} cron")
print("-" * (w + 88))
for r in rows:
    why = "-" if not r["alert_steps"] else ("yes" if r["reasoned"] == r["alert_steps"] else "NO")
    print(f"{r['name']:<{w}}  {r['trig']:<34} {r['paths']:>5} {str(r['timeout']):>7}  "
          f"{r['conc']:<5} {r['writes']:<5} {r['alerts']:<5} {why:<4} {r['cron']}")

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
    # AN ALERT THAT CANNOT SAY WHAT BROKE IS BARELY AN ALERT.
    #
    # refresh-data failed on 2026-08-17 because the World Bank returned HTTP 502
    # for 9 of 11 indicators. fetch_worldbank.py named all nine and explained
    # that it was refusing to write seed_auto.sql rather than delete their rows.
    # Issue #42 got "The Refresh Egypt data workflow failed" and a link, because
    # the alert step was passed no reason — the diagnosis was printed and thrown
    # away. Alerting had been ticked off as done since 2026-07-21; the half that
    # makes it useful had not.
    #
    # Asked only of workflows that fire unattended, for the same reason the rule
    # above is: someone watching a run they started can read the log.
    if fires and r["alert_steps"] and r["reasoned"] < r["alert_steps"]:
        gaps.append(f"{r['name']}: fires unattended ({', '.join(fires)}) and alerts "
                    "without a reason — the issue it opens cannot name what broke")
    # A TIMEOUT IS A CANCELLATION, NOT A FAILURE.
    #
    # refresh-streets hit its 120-minute limit on 2026-10-05. GitHub records
    # that as CANCELLED, every alert here ran `if: failure()`, and so the run
    # that left the street pages on three-month-old data alerted nobody. In a
    # workflow that never cancels itself, the alert must fire on cancelled()
    # too; in one that cancels superseded runs it must not, or every new push
    # would open an issue.
    if fires and r["blind_to_timeout"]:
        gaps.append(f"{r['name']}: fires unattended ({', '.join(fires)}) and its alert runs "
                    "only on failure() — a job killed at timeout-minutes is CANCELLED and "
                    "would alert nobody (use `if: failure() || cancelled()`)")
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
