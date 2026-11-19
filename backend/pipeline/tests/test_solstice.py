"""The 21 December sunrise alignments in calendar.json (2026-11-19, maps plan stage 7).

Karnak and Qasr Qarun each have a row on 21 December for every year of the
calendar's window, citing the page that reports it (Africanews with AP for
Karnak, Explore Fayoum for Qasr Qarun) and saying it is not a public holiday.
A row moved off the solstice, or re-cited to nothing, would tell a visitor to
be at the temple on the wrong morning.
"""
import json
import os
import unittest
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
CAL = json.load(open(os.path.join(ROOT, 'site', 'data', 'calendar.json'), encoding='utf-8'))
WANT = {'karnak-solstice': 'www.africanews.com', 'qasr-qarun-solstice': 'fayoumegypt.com'}


class Solstice(unittest.TestCase):
    def test_each_year_in_the_window_has_both_rows_on_21_december(self):
        first, last = int(CAL['window']['from'][:4]), int(CAL['window']['to'][:4])
        by_key = {e['key']: e for e in CAL['events']}
        for y in range(first, last + 1):
            for stem, host in WANT.items():
                e = by_key.get(f'{stem}-{y}')
                self.assertIsNotNone(e, f'calendar.json has no {stem}-{y} row')
                self.assertEqual((e['start'], e['end']), (f'{y}-12-21', f'{y}-12-21'), f'{stem}-{y} is not on 21 December')
                self.assertEqual(urlparse(e['source_url']).hostname, host, f'{stem}-{y} is not cited to {host}')
                self.assertTrue(e.get('not_holiday') and e['note'].startswith('Not a public holiday.'))


if __name__ == '__main__':
    unittest.main()
