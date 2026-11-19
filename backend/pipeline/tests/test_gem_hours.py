"""The Grand Egyptian Museum's hours on the arrival page (2026-11-18).

The hours come from the museum's own ticketing site, the only official one.
If the row were re-cited to anything else, or lost the late opening on
Wednesday and Saturday, a visitor planning an evening would be misled.
"""
import json
import os
import unittest
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
ROWS = {r['key']: r for g in json.load(open(os.path.join(ROOT, 'site', 'data', 'arrival.json'), encoding='utf-8'))['groups']
        for r in g['rows']}


class GemHours(unittest.TestCase):
    def test_hours_come_from_the_museum_and_name_the_late_days(self):
        r = ROWS.get('gem-hours')
        self.assertIsNotNone(r, 'arrival.json has no gem-hours row')
        self.assertEqual(urlparse(r['source_url']).hostname, 'tickets.gem.eg')
        self.assertIn('Wednesday and Saturday', r['value'])
        self.assertIn('Last entry is one hour before the galleries close', r['detail'])


if __name__ == '__main__':
    unittest.main()
