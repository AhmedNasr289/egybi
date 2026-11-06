"""fetch_streets: the run budget and the connection breaker.

The 2026-10-05 refresh lost to a 120-minute job limit because each district
after the first spent ~16 minutes timing out against an unreachable Overpass.
A cancelled job commits nothing and alerts nobody, so the script must stop
starting districts in time to end by itself. These tests pin that logic with
a fake clock; no network and no osmnx are needed.
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import fetch_streets as fs  # noqa: E402


class FakeClock:
    def __init__(self) -> None:
        self.t = 1000.0

    def __call__(self) -> float:
        return self.t

    def advance_min(self, m: float) -> None:
        self.t += m * 60


class Budget(unittest.TestCase):
    def test_spends_by_the_clock(self):
        clock = FakeClock()
        b = fs.RunBudget(80, clock=clock)
        self.assertFalse(b.exhausted())
        clock.advance_min(79.9)
        self.assertFalse(b.exhausted())
        clock.advance_min(0.2)
        self.assertTrue(b.exhausted())
        self.assertIn('80 min', fs.stop_reason(b, None))

    def test_default_budget_leaves_room_for_one_worst_case_district(self):
        # Worst district: 3 walk-graph + 3 amenity attempts at requests_timeout
        # (300 s) plus back-off, ~32 min; job setup ~5 min; limit 120 min.
        self.assertLessEqual(fs.BUDGET_MIN + 32 + 5, 120)


class BreakerLogic(unittest.TestCase):
    def test_opens_after_two_connect_failures_in_a_row(self):
        br = fs.Breaker()
        br.record('ConnectTimeout')
        self.assertFalse(br.open)
        br.record('ConnectionError')
        self.assertTrue(br.open)
        self.assertIn('unreachable', fs.stop_reason(None, br))

    def test_a_success_resets_the_streak(self):
        br = fs.Breaker()
        br.record('ConnectTimeout')
        br.record(None)
        br.record('ConnectTimeout')
        self.assertFalse(br.open)

    def test_slow_is_not_down(self):
        # A read timeout means the endpoint answered slowly (the big districts
        # are slow); it must never trip the breaker.
        br = fs.Breaker()
        for _ in range(5):
            br.record('ReadTimeout')
        self.assertFalse(br.open)

    def test_nothing_to_stop_when_both_are_fine(self):
        self.assertIsNone(fs.stop_reason(fs.RunBudget(80, clock=FakeClock()), fs.Breaker()))
        self.assertIsNone(fs.stop_reason(None, None))


class TheOctoberRun(unittest.TestCase):
    """Replays 2026-10-05: 10 districts, every walk graph after the first
    failing with ConnectTimeout at ~16 minutes each. With the guards the
    access stage must stop after two failures, not run into the job limit."""

    def test_replay(self):
        clock = FakeClock()
        budget, breaker = fs.RunBudget(fs.BUDGET_MIN, clock=clock), fs.Breaker()
        clock.advance_min(25)                     # the report card stage, which succeeded
        attempted, skipped = 0, 0
        for i in range(10):
            if fs.stop_reason(budget, breaker):
                skipped += 1
                continue
            attempted += 1
            if i == 0:
                clock.advance_min(4)              # Downtown Cairo: fine
                breaker.record(None)
            else:
                clock.advance_min(16)             # 3 x 300 s ConnectTimeout + back-off
                breaker.record('ConnectTimeout')
        self.assertEqual(attempted, 3)
        self.assertEqual(skipped, 7)
        self.assertLess(budget.spent_min(), 120 - 5)


if __name__ == '__main__':
    unittest.main()
