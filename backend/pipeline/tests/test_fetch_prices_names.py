"""fetch_prices.clean_name_en: the portal's English names, made safe to print.

On 2026-11-05/06 the portal sent "Heorotbr?r" for نبق and two names ending in
an invisible right-to-left mark. These pin the cleaning and that the
published data file carries none of them.
"""
from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import fetch_prices as fp  # noqa: E402

DATA = Path(__file__).resolve().parents[3] / 'site' / 'data' / 'prices-today.json'
RLM, LRI, PDI, BOM = chr(0x200F), chr(0x2066), chr(0x2069), chr(0xFEFF)


class CleanNameEn(unittest.TestCase):
    def test_invisible_direction_marks_are_stripped(self):
        self.assertEqual(fp.clean_name_en(239, 'Chili pepper' + RLM), 'Chili pepper')
        self.assertEqual(fp.clean_name_en(1, LRI + 'Bell  pepper' + PDI + BOM), 'Bell pepper')

    def test_a_name_with_lost_characters_is_not_published(self):
        self.assertIsNone(fp.clean_name_en(999, 'Hea?y'))
        self.assertIsNone(fp.clean_name_en(999, 'Bad' + chr(0xFFFD)))
        self.assertIsNone(fp.clean_name_en(999, RLM))
        self.assertIsNone(fp.clean_name_en(999, None))

    def test_the_known_bad_name_is_overridden(self):
        self.assertEqual(fp.clean_name_en(301, 'Heorotbr?r'), "Christ's-thorn jujube (nabq)")

    def test_a_good_name_is_untouched(self):
        self.assertEqual(fp.clean_name_en(5, 'Tomatoes'), 'Tomatoes')

    def test_the_first_letter_is_capitalised_and_nothing_else(self):
        self.assertEqual(fp.clean_name_en(7, 'onions'), 'Onions')
        self.assertEqual(fp.clean_name_en(7, 'aswan Tilapia fish'), 'Aswan Tilapia fish')
        self.assertEqual(fp.clean_name_en(7, 'beets (kg)'), 'Beets (kg)')


class PublishedData(unittest.TestCase):
    def test_no_published_name_carries_a_control_or_a_lost_character(self):
        d = json.loads(DATA.read_text(encoding='utf-8'))
        bad = [(v, i['slug'], i['name_en']) for v in ('retail', 'wholesale')
               for i in d.get(v, {}).get('items', []) if i.get('name_en')
               and (fp.clean_name_en(-1, i['name_en']) != i['name_en'])]
        self.assertEqual(bad, [])


if __name__ == '__main__':
    unittest.main()
