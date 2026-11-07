"""pages/currencystory.py: the pound since July.

What these pin:
  * first whole week against last whole week, counted back from the last day,
    never one day against another;
  * "moves with the dollar" is measured from the data (a currency whose dollar
    price drifts 2% is NOT grouped, one held within 1% is);
  * the chart's last point equals the table's change, by construction;
  * a week every currency moved together is called a move of the pound only
    when their moves agree;
  * no data publishes nothing.
"""
from __future__ import annotations

import datetime as dt
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pages import currencystory as cs  # noqa: E402
from pages import storychart  # noqa: E402

D0 = dt.date(2026, 7, 1)


def daily(values, start=D0):
    """[{'as_of', 'egp'}] for consecutive days."""
    return [{'as_of': (start + dt.timedelta(days=i)).isoformat(), 'egp': v} for i, v in enumerate(values)]


def flat_then(level0, level1, days=28, last_day=None):
    """A week at level0, two in between, a last week at level1; optional odd last day."""
    v = [level0] * 7 + [(level0 + level1) / 2] * 14 + [level1] * 7
    if last_day is not None:
        v[-1] = last_day
    return daily(v[:days])


class Weeks(unittest.TestCase):
    def test_first_week_against_last_week_not_the_last_day(self):
        # The last day dips; the weekly median ignores it.
        series = {'USD': flat_then(50.0, 55.0, last_day=53.0)}
        weeks, d0, d1, n = cs.currency_weeks(series)
        self.assertEqual((d0, d1, n), (D0, D0 + dt.timedelta(days=27), 4))
        self.assertAlmostEqual(weeks['USD']['change'], 0.1)

    def test_a_currency_missing_the_first_week_is_left_out(self):
        series = {'USD': flat_then(50.0, 55.0), 'EUR': daily([60.0] * 14, start=D0 + dt.timedelta(days=14))}
        weeks, *_ = cs.currency_weeks(series)
        self.assertNotIn('EUR', weeks)

    def test_the_chart_ends_where_the_table_does(self):
        series = {'USD': flat_then(50.0, 55.0, last_day=53.0)}
        weeks, d0, d1, _ = cs.currency_weeks(series)
        line = cs.index_line(weeks, 'USD', d0, d1)
        self.assertAlmostEqual(line[-1][1], 100 * (1 + weeks['USD']['change']))
        # Mid-week: it stands for the whole last week, not its last day.
        self.assertEqual(line[-1][0], d1 - dt.timedelta(days=3))


class Pegs(unittest.TestCase):
    def test_a_currency_held_to_the_dollar_is_grouped_and_a_drifting_one_is_not(self):
        usd = [50.0 + i * 0.1 for i in range(28)]
        held = [v * 0.2666 for v in usd]                            # constant dollar price
        drifts = [v * 1.10 * (1 + 0.02 * i / 27) for i, v in enumerate(usd)]   # 2% drift
        series = {'USD': daily(usd), 'SAR': daily(held), 'EUR': daily(drifts)}
        self.assertEqual(cs.pegged(series, ['USD', 'SAR', 'EUR']), ['SAR'])


class SharedWeek(unittest.TestCase):
    def _weeks(self, jumps):
        out = {}
        for code, j in jumps.items():
            out[code] = {'weekly': {0: 100.0, 1: 100.0, 2: 100.0 * (1 + j)}}
        return out

    def test_a_week_all_currencies_share_is_found_with_its_range(self):
        k, med, lo, hi = cs.shared_week(self._weeks({'USD': 0.04, 'EUR': 0.033, 'GBP': 0.039}), 3)
        self.assertEqual(k, 2)
        self.assertAlmostEqual(lo, 0.033)
        self.assertAlmostEqual(hi, 0.04)

    def test_findings_name_a_shared_week_and_not_a_scattered_one(self):
        def weeks_with(jumps):
            w = self._weeks(jumps)
            for v in w.values():
                v.update(first=v['weekly'][0], last=v['weekly'][2], change=v['weekly'][2] / v['weekly'][0] - 1)
            return w
        d0, d1 = D0, D0 + dt.timedelta(days=20)
        shared = ' '.join(cs.findings(weeks_with({'USD': 0.04, 'EUR': 0.033, 'GBP': 0.039}), [], d0, d1, 3, {}))
        scattered = ' '.join(cs.findings(weeks_with({'USD': 0.04, 'EUR': 0.10, 'GBP': -0.02}), [], d0, d1, 3, {}))
        self.assertIn('move of the pound itself', shared)
        self.assertNotIn('move of the pound itself', scattered)


class PhoneChart(unittest.TestCase):
    def test_every_label_fits_and_a_long_one_is_refused(self):
        series = {c: flat_then(50.0, 55.0) for c in ('USD', 'GBP')}
        weeks, d0, d1, _ = cs.currency_weeks(series)
        lines = [('Pound sterling', '#000', cs.index_line(weeks, 'GBP', d0, d1))]
        svg = storychart.narrow(lines, d0, d1, 't', ('a', 'b'), 'd', ('c',), short=cs.SHORT)
        self.assertIn('Sterling 110.0', svg)
        with self.assertRaises(ValueError):
            storychart.narrow(lines, d0, d1, 't', ('a', 'b'), 'd', ('c',))


class Table(unittest.TestCase):
    def test_change_comes_second_and_cells_carry_no_unit(self):
        # On a 390 px phone the old order (Change last, "EGP" in every cell)
        # pushed Change past the edge of the sheet (CI screenshot, 2026-11-07).
        import re
        series = {c: flat_then(50.0, 55.0) for c in ('USD', 'EUR')}
        weeks, *_ = cs.currency_weeks(series)
        html = cs.table_html(weeks, [])
        heads = re.findall(r'<th scope="col"[^>]*>([^<]+)</th>', html)
        self.assertEqual(heads[:2], ['Currency', 'Change'])
        self.assertNotIn('<td class="num">EGP', html)


class Text(unittest.TestCase):
    def test_a_fall_uses_a_true_minus(self):
        self.assertEqual(cs._pct_signed(-0.022), chr(0x2212) + '2.2%')


class Build(unittest.TestCase):
    def test_no_data_publishes_nothing(self):
        with tempfile.TemporaryDirectory() as d, mock.patch.object(cs, 'SITE', d):
            self.assertEqual(cs.build_currency_page(), [])
            self.assertFalse(Path(d, cs.PAGE).exists())

    def test_the_shared_week_window_matches_the_food_story(self):
        # Both stories count whole weeks back from the last day.
        dates = [(D0 + dt.timedelta(days=i)).isoformat() for i in range(30)]
        self.assertEqual(storychart.whole_weeks(dates), (D0 + dt.timedelta(days=2), D0 + dt.timedelta(days=29), 4))


if __name__ == '__main__':
    unittest.main()
