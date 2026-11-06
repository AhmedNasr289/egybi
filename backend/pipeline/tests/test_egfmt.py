"""pages/egfmt.py against the shared cases, plus the errors it must raise.

The same egfmt_cases.json runs against site/assets/egfmt.js through
backend/verify/egfmt-cases.js, so the browser and the generators keep one set
of Egyptian formatting rules.
"""
from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pages import egfmt  # noqa: E402

CASES = json.loads((Path(__file__).with_name('egfmt_cases.json')).read_text(encoding='utf-8'))['cases']


class SharedCases(unittest.TestCase):
    def test_every_case(self):
        self.assertGreaterEqual(len(CASES), 40)
        for c in CASES:
            with self.subTest(fn=c['fn'], args=c['args']):
                self.assertEqual(getattr(egfmt, c['fn'])(*c['args']), c['out'])


class Refusals(unittest.TestCase):
    def test_unknown_language(self):
        with self.assertRaises(ValueError):
            egfmt.money(10, 'fr')

    def test_a_naive_timestamp_cannot_be_put_in_cairo_time(self):
        with self.assertRaises(ValueError):
            egfmt.date('2026-11-06T10:00:00', 'en')

    def test_a_date_has_no_time(self):
        with self.assertRaises(ValueError):
            egfmt.time('2026-11-06', 'en')

    def test_unknown_style(self):
        with self.assertRaises(ValueError):
            egfmt.date('2026-11-06', 'en', 'long')


class Markup(unittest.TestCase):
    def test_time_tag_keeps_iso_out_of_the_visible_text(self):
        self.assertEqual(egfmt.time_tag('2026-07-19', 'en', 'prose'),
                         '<time datetime="2026-07-19">19 July 2026</time>')

    def test_arabic_numbers_are_isolated_in_money_but_not_in_plain_digits(self):
        self.assertTrue(egfmt.money(5, 'ar').startswith(egfmt.LRI))
        self.assertNotIn(egfmt.LRI, egfmt.num(5, 'ar'))


if __name__ == '__main__':
    unittest.main()
