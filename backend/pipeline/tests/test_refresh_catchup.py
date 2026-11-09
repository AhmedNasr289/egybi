"""backend/ops/refresh_catchup.py: which daily refreshes get started, without the network.

On 2026-11-09 GitHub never started the daily price and exchange-rate runs.
The catch-up starts a daily workflow only if it has not started at all today;
these tests pin that rule and the two requests it makes.
"""
from __future__ import annotations

import datetime as dt
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'ops'))

import refresh_catchup as rc  # noqa: E402

TODAY = dt.date(2026, 11, 9)


class FakeAPI:
    def __init__(self, counts):
        self.counts = counts            # workflow file -> runs started today
        self.calls = []

    def __call__(self, method, path, body=None):
        self.calls.append((method, path, body))
        if method == 'GET':
            wf = path.split('/workflows/')[1].split('/')[0]
            return {'total_count': self.counts.get(wf, 0), 'workflow_runs': []}
        return {}

    def dispatched(self):
        return [p.split('/workflows/')[1].split('/')[0] for m, p, _ in self.calls if m == 'POST']


class CatchUp(unittest.TestCase):
    def test_starts_only_what_never_started(self):
        api = FakeAPI({'refresh-prices.yml': 0, 'refresh-fx.yml': 1})
        out = dict(rc.catch_up(api, 'o/r', TODAY))
        self.assertEqual(api.dispatched(), ['refresh-prices.yml'])
        self.assertIn('started it now', out['refresh-prices.yml'])
        self.assertIn('already started today (1 run)', out['refresh-fx.yml'])

    def test_nothing_to_do_on_a_normal_day(self):
        api = FakeAPI({'refresh-prices.yml': 1, 'refresh-fx.yml': 2})
        rc.catch_up(api, 'o/r', TODAY)
        self.assertEqual(api.dispatched(), [])

    def test_both_dropped_both_started_on_main(self):
        api = FakeAPI({})
        rc.catch_up(api, 'o/r', TODAY)
        self.assertEqual(api.dispatched(), ['refresh-prices.yml', 'refresh-fx.yml'])
        self.assertTrue(all(b == {'ref': 'main'} for m, _, b in api.calls if m == 'POST'))

    def test_dry_run_starts_nothing(self):
        api = FakeAPI({})
        out = dict(rc.catch_up(api, 'o/r', TODAY, dry_run=True))
        self.assertEqual(api.dispatched(), [])
        self.assertIn('would start it', out['refresh-fx.yml'])

    def test_asks_about_today_utc_by_any_trigger(self):
        api = FakeAPI({})
        rc.catch_up(api, 'o/r', TODAY, dry_run=True)
        gets = [p for m, p, _ in api.calls if m == 'GET']
        self.assertEqual(len(gets), 2)
        self.assertTrue(all('created=>=2026-11-09' in p for p in gets))
        self.assertTrue(all('event=' not in p for p in gets))   # a manual start counts too


if __name__ == '__main__':
    unittest.main()
