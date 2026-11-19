"""Tricks travellers report, on the visit pages (2026-11-18).

arrival.json's "scams" group holds travellers' reports, each with its source
and the sites it was reported at ("near"). visit.py shows them on those
sites' pages (scam_facts). If a row lost its site, or its source, the Giza
page would say nothing about the camel-ride price switch that seven
travellers describe.
"""
import json
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, os.path.join(ROOT, 'backend', 'pipeline'))
from pages.visit import scam_facts  # noqa: E402

ARRIVAL = json.load(open(os.path.join(ROOT, 'site', 'data', 'arrival.json'), encoding='utf-8'))


class Scams(unittest.TestCase):
    def test_giza_and_saqqara_show_the_tricks_reported_there(self):
        giza = scam_facts('giza', ARRIVAL)
        self.assertEqual(len(giza), 1)
        for label in ('Camel or horse rides at Giza', 'Men who attach themselves to you as guides',
                      'People offering to help with tickets'):
            self.assertIn(label, giza[0])
        saqqara = scam_facts('saqqara', ARRIVAL)
        self.assertEqual(len(saqqara), 1)
        self.assertNotIn('Camel or horse rides at Giza', saqqara[0])
        self.assertIn('Men who attach themselves to you as guides', saqqara[0])

    def test_a_site_with_no_report_gets_nothing(self):
        self.assertEqual(scam_facts('karnak', ARRIVAL), [])

    def test_every_report_names_its_source_and_says_it_is_a_report(self):
        p = scam_facts('giza', ARRIVAL)[0]
        self.assertIn("travellers' reports, not official advice", p)
        self.assertIn('href="https://wheretheroadforks.com/', p)
        self.assertIn('href="https://www.inyourpocket.com/', p)


if __name__ == '__main__':
    unittest.main()
