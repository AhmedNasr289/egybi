"""dossier_pack.py: the $12 full pack.

What these pin:
  * every fair-price row has its Arabic on the card, and a new row without it
    stops the build instead of printing a card with a blank Arabic column;
  * prices print honestly: a missing price says so, an open range says "from",
    and the conversion rounds to a guide value;
  * an Arabic range is wrapped in a left-to-right isolate, because "50–100"
    inside right-to-left text otherwise displays as "100–50";
  * the document has one sheet per measured site, plus cover, card and
    holidays, and loads nothing from the network (it is sold to work offline).
"""
from __future__ import annotations

import json
import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import dossier_pack as dp  # noqa: E402

DATA = Path(__file__).resolve().parents[3] / 'site' / 'data'
FX = {'as_of': '2026-11-05', 'rates': [{'code': 'USD', 'egp': 50.0}]}


def rows(fp):
    return [r for g in fp['groups'] for r in g['rows']]


class Arabic(unittest.TestCase):
    def test_every_real_row_has_its_arabic(self):
        fp = json.loads((DATA / 'fair-prices.json').read_text(encoding='utf-8'))
        self.assertEqual(sorted(r['key'] for r in rows(fp)), sorted(dp.ARABIC))

    def test_a_row_without_arabic_stops_the_build(self):
        fp = {'groups': [{'key': 'tips', 'title': 'Tipping',
                          'rows': [{'key': 'tip-new', 'item': 'New', 'low': 1, 'high': 2, 'currency': 'EGP'}]}]}
        with self.assertRaises(KeyError):
            dp.fair_card(fp, FX)

    def test_ranges_are_isolated_left_to_right(self):
        _, ar, _ = dp.price_text({'low': 50, 'high': 100, 'currency': 'EGP'})
        self.assertEqual(ar, '⁦50–100⁩ جنيه')


class Prices(unittest.TestCase):
    def test_missing_price_says_so(self):
        en, ar, _ = dp.price_text({'low': None, 'high': None, 'currency': 'EGP'})
        self.assertEqual(en, 'No sourced price')
        self.assertNotIn('None', ar)
        self.assertEqual(dp.converted({'low': None, 'high': None, 'currency': 'EGP'}, 50), '')

    def test_open_range_says_from(self):
        self.assertEqual(dp.price_text({'low': 25, 'high': None, 'currency': 'USD'})[0], 'from 25 USD')
        self.assertEqual(dp.converted({'low': 25, 'high': None, 'currency': 'USD'}, 50), '≈ from 1,250 EGP')

    def test_conversion_rounds_to_a_guide_value(self):
        self.assertEqual(dp.converted({'low': 50, 'high': 100, 'currency': 'EGP'}, 54.77), '≈ 1–2 USD')
        self.assertEqual(dp.converted({'low': 10, 'high': 15, 'currency': 'USD'}, 54.77), '≈ 550–820 EGP')

    def test_a_silly_rate_is_refused(self):
        with self.assertRaises(ValueError):
            dp.usd_rate({'rates': [{'code': 'USD', 'egp': 0.02}]})
        with self.assertRaises(ValueError):
            dp.usd_rate({'rates': []})


class Document(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = dp.build(2027, '2026-11-06')
        cls.n_sites = len(json.loads((DATA / 'visit-climate.json').read_text(encoding='utf-8'))['sites'])

    def test_one_sheet_per_site_plus_cover_card_and_holidays(self):
        self.assertEqual(self.html.count('<section class="sheet site">'), self.n_sites)
        self.assertEqual(self.html.count('<section'), self.n_sites + 3)

    def test_loads_nothing_from_the_network(self):
        self.assertIsNone(re.search(r'<(script|link|img|iframe)\b', self.html))
        self.assertNotIn('@import', self.html)

    def test_light_tables_are_for_the_requested_year(self):
        self.assertIn('Light on the 15th, 2027', self.html)

    def test_no_python_none_leaks_into_the_page(self):
        text = re.sub(r'<[^>]+>', ' ', self.html)
        self.assertNotIn('None', text)

    def test_a_site_missing_a_month_is_refused(self):
        site = {'key': 'x', 'name': 'X', 'lat': 30, 'lon': 31, 'months': [
            {'month': m, 't_daily_max': 20, 't_daily_min': 10, 'rain_mm_day': 0} for m in range(1, 12)]}
        with self.assertRaises(ValueError):
            dp.site_sheet(site, None, 2027)


if __name__ == '__main__':
    unittest.main()
