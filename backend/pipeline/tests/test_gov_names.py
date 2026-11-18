"""egfmt.gov_name in Arabic and Russian (2026-11-18).

The places, planner, heat and atlas pages show a governorate's name in the
page's language. A governorate in the data with no Arabic or Russian name
would quietly show in English on those pages, so every governorate the data
files carry must have both.
"""
from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pages import egfmt  # noqa: E402

DATA = Path(__file__).resolve().parents[3] / 'site' / 'data'


def governorates():
    out = set()
    places = json.loads((DATA / 'geo-places.json').read_text(encoding='utf-8'))
    out.update(p['gov'] for p in places.get('places', []) if p.get('gov'))
    climate = json.loads((DATA / 'visit-climate.json').read_text(encoding='utf-8'))
    out.update(s['gov'] for s in climate.get('sites', []) if s.get('gov'))
    return sorted(out)


class GovNames(unittest.TestCase):
    def test_the_data_has_the_27_governorates(self):
        self.assertEqual(len({egfmt.gov_name(g) for g in governorates()}), 27)

    def test_every_governorate_has_an_arabic_and_a_russian_name(self):
        for g in governorates():
            en = egfmt.gov_name(g)
            self.assertNotEqual(egfmt.gov_name(g, 'ar'), en, f'{g}: no Arabic name')
            self.assertNotEqual(egfmt.gov_name(g, 'ru'), en, f'{g}: no Russian name')

    def test_the_two_maps_name_the_same_governorates(self):
        self.assertEqual(set(egfmt.GOV_NAMES_AR), set(egfmt.GOV_NAMES_RU))


if __name__ == '__main__':
    unittest.main()
