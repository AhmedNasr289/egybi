"""backend/ops/usage_guard.py: the minutes arithmetic, without the network.

The guard exists because the account ran out of Actions minutes in November
2026 without anyone being told. These tests pin the rules that decide whether
it speaks up: how a job is billed, when a threshold is crossed, and that the
API pages are all read.
"""
from __future__ import annotations

import datetime as dt
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'ops'))

import usage_guard as ug  # noqa: E402

UTC = dt.timezone.utc
NOW = dt.datetime(2026, 11, 10, 12, 0, tzinfo=UTC)


def job(start, end, conclusion='success', labels=('ubuntu-latest',)):
    return {'started_at': start, 'completed_at': end, 'conclusion': conclusion, 'labels': list(labels)}


class JobMinutes(unittest.TestCase):
    def test_rounds_each_job_up_to_a_whole_minute(self):
        self.assertEqual(ug.job_minutes(job('2026-11-10T10:00:00Z', '2026-11-10T10:00:05Z'), NOW), 1)
        self.assertEqual(ug.job_minutes(job('2026-11-10T10:00:00Z', '2026-11-10T10:01:00Z'), NOW), 1)
        self.assertEqual(ug.job_minutes(job('2026-11-10T10:00:00Z', '2026-11-10T10:01:01Z'), NOW), 2)
        self.assertEqual(ug.job_minutes(job('2026-11-10T10:00:00Z', '2026-11-10T10:41:46Z'), NOW), 42)

    def test_skipped_and_unstarted_jobs_cost_nothing(self):
        self.assertEqual(ug.job_minutes(job('2026-11-10T10:00:00Z', '2026-11-10T10:00:00Z', 'skipped'), NOW), 0)
        self.assertEqual(ug.job_minutes(job(None, None, None), NOW), 0)
        self.assertEqual(ug.job_minutes(job('2026-11-10T10:00:00Z', '2026-11-10T10:00:00Z'), NOW), 0)

    def test_a_running_job_counts_up_to_now(self):
        self.assertEqual(ug.job_minutes(job('2026-11-10T11:30:00Z', None, None), NOW), 30)

    def test_runner_rates(self):
        self.assertEqual(ug.job_minutes(job('2026-11-10T10:00:00Z', '2026-11-10T10:03:00Z', labels=['windows-latest']), NOW), 6)
        self.assertEqual(ug.job_minutes(job('2026-11-10T10:00:00Z', '2026-11-10T10:03:00Z', labels=['macos-14']), NOW), 30)


class Thresholds(unittest.TestCase):
    def test_nothing_below_seventy_percent(self):
        self.assertEqual(ug.crossed(1399), [])

    def test_seventy_then_ninety(self):
        self.assertEqual(ug.crossed(1400), [70])
        self.assertEqual(ug.crossed(1799), [70])
        self.assertEqual(ug.crossed(1800), [70, 90])
        self.assertEqual(ug.crossed(2052), [70, 90])

    def test_titles_name_the_month_so_each_month_alerts_once(self):
        self.assertEqual(ug.issue_title(70, '2026-12'), 'Actions minutes at 70% of the month (2026-12)')
        self.assertNotEqual(ug.issue_title(70, '2026-12'), ug.issue_title(70, '2027-01'))


class Projection(unittest.TestCase):
    def test_straight_line_to_month_end(self):
        # 9.5 days into a 30-day month
        self.assertEqual(ug.projection(950, NOW), 3000)

    def test_first_day_is_not_extrapolated(self):
        self.assertEqual(ug.projection(40, dt.datetime(2026, 12, 1, 6, tzinfo=UTC)), 40)

    def test_month_lengths(self):
        self.assertEqual(ug.days_in_month(dt.datetime(2026, 2, 3, tzinfo=UTC)), 28)
        self.assertEqual(ug.days_in_month(dt.datetime(2026, 12, 31, tzinfo=UTC)), 31)


class Tally(unittest.TestCase):
    """A fake API: 150 runs (two pages), one of them from last month."""

    def setUp(self):
        self.calls = []
        runs = [{'id': i, 'name': 'Verify (browser)' if i % 2 else 'Refresh prices',
                 'created_at': '2026-11-05T08:00:00Z'} for i in range(149)]
        runs.append({'id': 999, 'name': 'Old', 'created_at': '2026-10-31T23:59:00Z'})
        self.runs = runs

    def fetch(self, path):
        self.calls.append(path)
        page = int(path.rsplit('page=', 1)[1])
        if '/jobs' in path:
            return {'jobs': [job('2026-11-05T08:00:00Z', '2026-11-05T08:02:30Z'),
                             job('2026-11-05T08:00:00Z', '2026-11-05T08:00:00Z', 'skipped')]}
        return {'workflow_runs': self.runs[(page - 1) * 100: page * 100]}

    def test_reads_every_page_and_skips_last_month(self):
        t = ug.tally(self.fetch, 'o/r', NOW)
        self.assertEqual(t.runs, 149)
        self.assertEqual(t.jobs, 149)          # the skipped job in each run is free
        self.assertEqual(t.minutes, 149 * 3)   # 2 min 30 s bills as 3
        self.assertEqual(sum(t.by_workflow.values()), t.minutes)
        self.assertTrue(any('page=2' in c for c in self.calls if '/runs?' in c))
        self.assertTrue(all('filter=all' in c for c in self.calls if '/jobs' in c))

    def test_parallel_reading_gives_the_same_totals(self):
        one = ug.tally(self.fetch, 'o/r', NOW, workers=1)
        many = ug.tally(self.fetch, 'o/r', NOW, workers=8)
        self.assertEqual((one.runs, one.jobs, one.minutes, one.by_workflow),
                         (many.runs, many.jobs, many.minutes, many.by_workflow))

    def test_report_states_the_scope(self):
        t = ug.tally(self.fetch, 'o/r', NOW)
        r = ug.report(t, NOW, 2000, public=True)
        self.assertIn('**447 minutes**', r)
        self.assertIn('22.4%', r)
        self.assertIn('would cost if the repo were private', r)
        self.assertIn('this repository only', r)


if __name__ == '__main__':
    unittest.main()
