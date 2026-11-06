"""backend/ops/day42_reading.py: the day-42 report, without the network."""
from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'ops'))

import day42_reading as d42  # noqa: E402

SAMPLE = {
    'generated_utc': '2026-11-20T09:00:00+00:00', 'unit': 'visitor-days (the visitor hash is per day)',
    'plan_events_from': '2026-11-06', 'visitors_7d': 412,
    'day42': {'date': '2026-11-20', 'target_planner_uses': 300, 'planner_uses': 120, 'planner_opens': 640},
    'rows': [{'key': 'plan_stop_added', 'label': 'Added a stop: a planner use', 'week': 70, 'previous': 50, 'since0': 120},
             {'key': 'ask_mail', 'label': 'Opened the e-mail to order the plan check', 'week': None, 'previous': None, 'since0': None}],
}


class Report(unittest.TestCase):
    def test_the_reading_against_the_target(self):
        r = d42.report(SAMPLE)
        self.assertIn('Planner uses since 2026-11-06: 120  (40% of 300)', r)
        self.assertIn('Planner target: NOT MET', r)
        self.assertIn('two weeks of planner events, not six', r)

    def test_met_at_the_target(self):
        s = dict(SAMPLE, day42=dict(SAMPLE['day42'], planner_uses=300))
        self.assertIn('Planner target: MET', d42.report(s))

    def test_unmeasured_is_said_not_zeroed(self):
        s = dict(SAMPLE, day42=dict(SAMPLE['day42'], planner_uses=None))
        r = d42.report(s)
        self.assertIn('(not measured)', r)
        self.assertIn('were not measured', r)
        self.assertNotIn(' 0  (', r)

    def test_missing_rows_show_a_dash(self):
        self.assertIn('—', d42.report(SAMPLE).split('Week by week')[1])

    def test_the_paste_row_has_the_readings_log_columns(self):
        row = d42.report(SAMPLE).splitlines()[-1]
        self.assertEqual(row.count('|'), 7)
        self.assertTrue(row.startswith('| 2026-11-20 09:00 | 412 |'))


class Key(unittest.TestCase):
    def test_no_key_refuses_before_any_request(self):
        with mock.patch.dict(os.environ, {'EGYBI_ANALYTICS_KEY': ''}), mock.patch.object(d42, 'fetch') as f:
            self.assertEqual(d42.main(), 2)
            f.assert_not_called()


if __name__ == '__main__':
    unittest.main()
