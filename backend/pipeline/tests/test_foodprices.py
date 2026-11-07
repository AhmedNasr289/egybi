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
from pages import storychart  # noqa: E402


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
    def test_first_week_against_last_week_not_single_days(self):
        # The window's last day dipped (the pound recovered); a single-day
        # comparison printed +5.5% where the weekly medians said +8.4%.
        import datetime as dt
        first = [{'as_of': f'2026-07-{d:02d}', 'egp': 50.0} for d in range(1, 8)]
        last = [{'as_of': f'2026-07-{d:02d}', 'egp': 55.0} for d in range(23, 29)] + [{'as_of': '2026-07-29', 'egp': 53.0}]
        u = fp.usd_change({'series': {'USD': first + last}}, dt.date(2026, 7, 1), dt.date(2026, 7, 29))
        self.assertAlmostEqual(u['change'], 0.1)

    def test_no_rate_in_a_week_gives_none(self):
        import datetime as dt
        fx = {'series': {'USD': [{'as_of': '2026-07-28', 'egp': 55.0}]}}
        self.assertIsNone(fp.usd_change(fx, dt.date(2026, 7, 1), dt.date(2026, 7, 29)))


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

    def test_the_phone_chart_is_drawn_at_phone_width_and_names_every_line(self):
        # The wide chart reached a phone at ~276 px, its 12 px labels at ~4 px.
        import datetime as dt
        import re
        lines = [('Vegetables', fp.CHART_COLOURS[0], [(dt.date(2026, 7, 4), 100), (dt.date(2026, 7, 29), 97.5)]),
                 ('Groceries', fp.CHART_COLOURS[1], [(dt.date(2026, 7, 4), 100), (dt.date(2026, 7, 29), 103.2)])]
        credit = ('egybi.com/egypt-food-prices.html · IDSC price portal, retail averages, 128 items.',
                  'Weekly median per category, first week = 100. Not a basket, not inflation.')
        svg = fp.svg_chart_narrow(lines, dt.date(2026, 7, 1), dt.date(2026, 7, 29), "Egypt's retail food prices since July", credit)
        root = ET.fromstring(svg)
        self.assertEqual(root.get('viewBox').split()[2], str(fp.NARROW_W))
        self.assertIn('Vegetables 97.5', svg)
        self.assertIn('Groceries 103.2', svg)
        sizes = [float(s) for s in re.findall(r'font-size="([0-9.]+)"', svg)]
        self.assertGreaterEqual(min(sizes), 11.5)
        # Every credit word survives the wrapping, and no wrapped line is wider than the frame allows.
        credit_lines = [t.text for t in root.iter('{http://www.w3.org/2000/svg}text') if t.get('font-size') == '11.5']
        self.assertEqual(' '.join(credit_lines).split(), ' '.join(credit).split())
        self.assertTrue(all(len(t) <= 46 for t in credit_lines), credit_lines)

    def test_a_falling_change_uses_a_true_minus(self):
        self.assertEqual(fp._pct_signed(-0.004), chr(0x2212) + '0.4%')
        self.assertEqual(fp._pct_signed(0.028), '+2.8%')

    def test_an_overlong_credit_is_refused(self):
        import datetime as dt
        with self.assertRaises(ValueError):
            fp.svg_chart([], dt.date(2026, 7, 1), dt.date(2026, 7, 29), 't', ('x' * (storychart.CREDIT_MAX_CHARS + 1),))


class Build(unittest.TestCase):
    def test_no_data_publishes_nothing(self):
        with tempfile.TemporaryDirectory() as d, mock.patch.object(fp, 'SITE', d):
            self.assertEqual(fp.build_food_prices_page(), [])
            self.assertFalse(Path(d, fp.PAGE).exists())


if __name__ == '__main__':
    unittest.main()
