#!/usr/bin/env python3
"""
The day-42 reading of the "Egypt, honestly" pivot, from the live dashboard.

The Growth Plan judges the pivot on 2026-11-20 (day 42 after day 0,
2026-10-09) against two targets:
  * 300 planner uses (a planner use is a visit that adds a stop; the event
    exists only from 2026-11-06, so this reading covers two weeks, not six);
  * at least one sale (the $12 dossier or the $49 plan check).

The dashboard (site/api/insights.php?format=json) needs the analytics key,
which lives only on the server and with Ahmed. This script reads it from the
EGYBI_ANALYTICS_KEY environment variable, never prints it, and prints:
  * the reading against both targets, with the share of the target reached;
  * the week-by-week planner funnel;
  * one row to paste into "Traffic Baseline & Analytics".
Sales are not in the dashboard: they come from the shop and the plan-check
inbox, so the script asks for them to be counted by hand.

Run (Windows PowerShell 5.1):
    $env:EGYBI_ANALYTICS_KEY = "the key"; python backend/ops/day42_reading.py
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Optional

URL = 'https://egybi.com/api/insights.php'
SALES_TARGET = 1


def fetch(key: str, timeout: float = 30) -> dict:
    q = urllib.parse.urlencode({'format': 'json', 'key': key})
    req = urllib.request.Request(f'{URL}?{q}', headers={'User-Agent': 'egybi-day42-reading'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        # 403 is a wrong key; 404 is "no key on the server yet". Neither should
        # be shown with the key in it, so only the status is reported.
        raise SystemExit(f'the dashboard answered HTTP {e.code}: check EGYBI_ANALYTICS_KEY') from None
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
        raise SystemExit(f'could not read the dashboard: {type(e).__name__}') from None


def pct_of(value: Optional[int], target: int) -> str:
    if value is None:
        return 'not measured'
    return f'{100 * value / target:.0f}% of {target}'


def report(d: dict) -> str:
    """The reading as plain text. Pure, so it is tested without the network."""
    day42 = d.get('day42') or {}
    uses = day42.get('planner_uses')
    target = int(day42.get('target_planner_uses') or 300)
    opens = day42.get('planner_opens')
    since = d.get('plan_events_from', '2026-11-06')
    lines = [
        f"Day-42 reading, generated {d.get('generated_utc', '?')} (counts are {d.get('unit', 'visitor-days')})",
        '',
        f"Planner uses since {since}: {'—' if uses is None else uses}  ({pct_of(uses, target)})",
        f"Planner opened since day 0: {'—' if opens is None else opens}",
        f"Sales (count by hand from the shop and the plan-check inbox): ____  (target {SALES_TARGET})",
        '',
        'Week by week (this week / previous week / since day 0):',
    ]
    for r in d.get('rows', []):
        def show(v):
            return '—' if v is None else str(v)
        lines.append(f"  {r.get('label', r.get('key', '?')):<52} {show(r.get('week')):>6} {show(r.get('previous')):>6} {show(r.get('since0')):>7}")
    met = uses is not None and uses >= target
    lines += [
        '',
        f"Planner target: {'MET' if met else 'NOT MET'}"
        + ('' if uses is not None else ' (planner uses were not measured; the events start ' + since + ')'),
        'Remember: this reading covers two weeks of planner events, not six. Say so beside the number.',
        '',
        'Row for "Traffic Baseline & Analytics" (readings log):',
        f"| {str(d.get('generated_utc', ''))[:16].replace('T', ' ')} | {d.get('visitors_7d', '—')} | — | — | — | "
        f"**Day-42 reading.** Planner uses since {since}: {'—' if uses is None else uses} of {target}; sales: ____. |",
    ]
    return '\n'.join(lines)


def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError, OSError):
            pass
    key = os.environ.get('EGYBI_ANALYTICS_KEY', '').strip()
    if len(key) < 16:
        print('Set EGYBI_ANALYTICS_KEY to the analytics key first (it is at least 16 characters).', file=sys.stderr)
        return 2
    print(report(fetch(key)))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
