"""Ride apps by city on the arrival page (2026-11-18).

Uber's own list has no Luxor, Aswan or Sharm el-Sheikh. The arrival page
says so, and says which app does list them (inDrive, from its own city
pages). If the inDrive row lost a city, or lost its link to inDrive's own
site, a visitor in Luxor would read "not on Uber" and nothing else.
"""
import json
import os
import unittest
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
DATA = os.path.join(ROOT, 'site', 'data', 'arrival.json')


def rows():
    d = json.load(open(DATA, encoding='utf-8'))
    return {r['key']: r for g in d['groups'] for r in g['rows']}


class RideApps(unittest.TestCase):
    def test_every_city_missing_from_uber_is_named_by_another_app_on_its_own_site(self):
        r = rows()
        uber = r['uber-cities']
        indrive = r.get('indrive-cities')
        self.assertIsNotNone(indrive, 'arrival.json has no indrive-cities row')
        self.assertEqual(urlparse(indrive['source_url']).hostname, 'indrive.com')
        for city in ('Luxor', 'Aswan', 'Sharm el-Sheikh'):
            self.assertNotIn(city, uber['value'], f'{city} is now on Uber\'s list: re-read both rows')
            self.assertIn(city, indrive['value'], f'{city} is missing from the inDrive row')


if __name__ == '__main__':
    unittest.main()
