"""pages/foodprices.py: the food-price data story.

What these pin, each a defect found while building it on 2026-11-06:
  * one noisy day must not set the headline: items are compared first 7-day
    block to last (a single-day comparison put vegetables at +6.0%; the
    weekly one at -0.4%);
  * the chart's last point and the table's change are the SAME statistic
    (they disagreed: Fruit 103 in the chart, +1.1% in the table);
  * building materials and fertiliser are not food and are left out;
  * a mangled English name is not published.
"""
from __future__ import annotations

import statistics
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pages import foodprices as fp  # noqa: E402


def series_for(prices_by_day):
    """{slug: [(iso_day, avg)]} -> the history file's series shape."""
    return {s: [{'as_of': d, 'avg': a} for d, a in pts] for s, pts in prices_by_day.items()}


META = {
    'a': {'slug': 'a', 'category': 'vegetable', 'name_ar': 'أ', 'name_en': 'Tomato'},
    'b': {'slug': 'b', 'category': 'vegetable', 'name_ar': 'ب', 'name_en': 'Heorotbr?r'},
    'c': {'slug': 'c', 'category': 'building', 'name_ar': 'ج', 'name_en': 'Cement'},
    'd': {'slug': 'd', 'category': 'fruit', 'name_ar': 'د', 'name_en': 'Late starter'},
}
DAYS = ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-15', '2026-07-22', '2026-07-28', '2026-07-29']


class ItemChanges(unittest.TestCase):
    def setUp(self):
        s = series_for({
            # a: one wild day in the last week must not decide its change.
            'a': [(DAYS[0], 10), (DAYS[1], 10), (DAYS[2], 10), (DAYS[3], 11), (DAYS[4], 11), (DAYS[5], 12), (DAYS[6], 30)],
            'b': [(d, 20) for d in DAYS],
            'c': [(d, 100) for d in DAYS],
            'd': [(DAYS[3], 5), (DAYS[6], 6)],          # not seen in the first block
        })
        self.rows, self.d0, self.d1 = fp.item_changes(s, META)
        self.by = {r['slug']: r for r in self.rows}

    def test_first_and_last_block_medians_not_single_days(self):
        # last block (days 28..34 from 1 Jul) holds 12 and 30: median 21, not 30.
        self.assertEqual(self.by['a']['first'], 10)
        self.assertEqual(self.by['a']['last'], 21)

    def test_not_food_is_left_out(self):
        self.assertNotIn('c', self.by)

    def test_an_item_missing_the_first_block_is_left_out(self):
        self.assertNotIn('d', self.by)

    def test_a_mangled_english_name_is_not_published(self):
        self.assertIsNone(self.by['b']['name_en'])
        self.assertEqual(self.by['a']['name_en'], 'Tomato')

    def test_chart_last_point_equals_the_table_change(self):
        last = fp.category_index(self.rows, 'vegetable', self.d0, self.d1)[-1][1]
        table = 100 * (1 + statistics.median(r['change'] for r in self.rows if r['category'] == 'vegetable'))
        self.assertAlmostEqual(last, table, places=9)

    def test_every_line_starts_at_100(self):
        self.assertEqual(fp.category_index(self.rows, 'vegetable', self.d0, self.d1)[0][1], 100)


class Usd(unittest.TestCase):
    def test_matches_the_nearest_dates_within_a_week(self):
        import datetime as dt
        fx = {'series': {'USD': [{'as_of': '2026-07-04', 'egp': 50.0}, {'as_of': '2026-07-28', 'egp': 55.0}]}}
        u = fp.usd_change(fx, dt.date(2026, 7, 1), dt.date(2026, 7, 29))
        self.assertAlmostEqual(u['change'], 0.1)
        self.assertIsNone(fp.usd_change(fx, dt.date(2026, 6, 1), dt.date(2026, 7, 29)))


class Chart(unittest.TestCase):
    def test_valid_svg_with_one_line_per_category_and_one_axis(self):
        import datetime as dt
        lines = [('Vegetables', fp.CHART_COLOURS[0], [(dt.date(2026, 7, 4), 100), (dt.date(2026, 7, 29), 97.5)]),
                 ('Fruit', fp.CHART_COLOURS[1], [(dt.date(2026, 7, 4), 100), (dt.date(2026, 7, 29), 103.2)])]
        svg = fp.svg_chart(lines, dt.date(2026, 7, 1), dt.date(2026, 7, 29), 'T & t', ('credit',))
        root = ET.fromstring(svg)
        paths = list(root.iter('{http://www.w3.org/2000/svg}path'))
        self.assertEqual(len(paths), 2)
        self.assertIn('Vegetables 97.5', svg)
        self.assertIn('Fruit 103.2', svg)

    def test_an_overlong_credit_is_refused(self):
        import datetime as dt
        with self.assertRaises(ValueError):
            fp.svg_chart([], dt.date(2026, 7, 1), dt.date(2026, 7, 29), 't', ('x' * (fp.CREDIT_MAX_CHARS + 1),))


class Build(unittest.TestCase):
    def test_no_data_publishes_nothing(self):
        with tempfile.TemporaryDirectory() as d, mock.patch.object(fp, 'SITE', d):
            self.assertEqual(fp.build_food_prices_page(), [])
            self.assertFalse(Path(d, fp.PAGE).exists())


if __name__ == '__main__':
    unittest.main()
