"""pages/visit.py leg_facts: the visit pages' "Between here and ..." lines.

They come from the same getting-around.json the planner's leg cards read, so
a site and the planner cannot give different routes. These tests run on the
real data files: a renamed site, a radius that stops reaching a site, or a leg
that loses its rows must fail here, not quietly drop a line from a page.
"""
from __future__ import annotations

import json
import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pages import visit  # noqa: E402

DATA = Path(__file__).resolve().parents[3] / 'site' / 'data'


def load(name):
    return json.loads((DATA / name).read_text(encoding='utf-8'))


SITES = load('visit-climate.json')['sites']
GUIDE = load('getting-around.json')
ARRIVAL = load('arrival.json')


def facts(key):
    site = next(s for s in SITES if s['key'] == key)
    return [re.sub('<[^>]+>', '', f) for f in visit.leg_facts(site, SITES, GUIDE, ARRIVAL)]


class LegFacts(unittest.TestCase):
    def test_luxor_sites_get_the_cairo_sleeper_rows(self):
        for key in ('karnak', 'valley-kings'):
            f = facts(key)
            self.assertEqual(len(f), 1, f)
            self.assertTrue(f[0].startswith('Between here and Cairo:'), f)
            self.assertIn('Bashtil', f[0])
            self.assertIn('Seat61', f[0])

    def test_cairo_legs_with_the_same_rows_are_said_once(self):
        f = facts('giza')
        self.assertEqual(len(f), 1, f)
        self.assertTrue(f[0].startswith('Between here and Luxor or Aswan:'), f)

    def test_aswan_gets_both_legs_and_abu_simbel_its_road(self):
        f = facts('philae')
        self.assertEqual([x.split(':')[0] for x in f],
                         ['Between here and Cairo', 'Between here and Abu Simbel'])
        g = facts('abu-simbel')
        self.assertEqual(len(g), 1, g)
        self.assertIn('275 km by desert road', g[0])
        self.assertIn('08:00', g[0])

    def test_sites_no_cited_leg_covers_get_nothing(self):
        for key in ('alexandria', 'siwa', 'dahab', 'abydos', 'dendera'):
            self.assertEqual(facts(key), [], key)

    def test_every_line_cites_a_source_and_its_check_date(self):
        for s in SITES:
            for f in visit.leg_facts(s, SITES, GUIDE, ARRIVAL):
                self.assertRegex(f, r'Source: <a href="https://', s['key'])
                self.assertRegex(f, r'checked <time datetime="\d{4}-\d\d-\d\d">', s['key'])


if __name__ == '__main__':
    unittest.main()
