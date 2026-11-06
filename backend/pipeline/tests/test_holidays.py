"""pages/holidays.py: the public-holidays page and its chart.

The first draft counted Ramadan as a public holiday ("13 holidays") and so
also marked February as a holiday month. Ramadan is a month of fasting; the
holidays are the days off. These tests pin that, the date phrasing, and the
rule that a weekday is only ever given for a fixed one-day date.
"""
from __future__ import annotations

import json
import re
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pages import holidays as hol  # noqa: E402

CAL = Path(__file__).resolve().parents[3] / 'site' / 'data' / 'calendar.json'


def ev(key, start, end=None, status='fixed', start_latest=None, end_latest=None, name=None):
    e = {'key': key, 'name': name or key.title(), 'start': start, 'end': end or start, 'status': status}
    if start_latest:
        e['start_latest'] = start_latest
    if end_latest:
        e['end_latest'] = end_latest
    return e


def plain(fragments):
    return ' '.join(re.sub('<[^>]+>', '', f) for f in fragments)


class Phrasing(unittest.TestCase):
    def rows(self, *events):
        return hol.holidays({'events': list(events)})

    def test_a_fixed_day_is_a_day_with_its_weekday(self):
        (r,) = self.rows(ev('xmas', '2027-01-07'))
        self.assertEqual(hol.when(r), '7 January')
        self.assertEqual(hol.weekday(r), 'Thursday')        # 2027-01-07 was a Thursday

    def test_an_expected_date_is_a_range_and_has_no_weekday(self):
        (r,) = self.rows(ev('eid', '2027-03-09', '2027-03-12', 'expected', start_latest='2027-03-10'))
        self.assertEqual(hol.when(r), '9 or 10 March to 12 March')
        self.assertIsNone(hol.weekday(r))

    def test_either_across_two_months(self):
        (r,) = self.rows(ev('x', '2027-03-31', status='expected', start_latest='2027-04-01'))
        self.assertTrue(hol.when(r).startswith('31 March or 1 April'))

    def test_rows_without_a_start_are_dropped_not_guessed(self):
        self.assertEqual(hol.holidays({'events': [{'key': 'x', 'name': 'X'}]}), [])


class Counting(unittest.TestCase):
    def test_ramadan_is_not_counted_as_a_holiday(self):
        rows = hol.holidays({'events': [
            ev('ramadan', '2027-02-08', '2027-03-08', 'expected', name='Ramadan'),
            ev('eid-fitr', '2027-03-09', '2027-03-12', 'expected', name='Eid al-Fitr'),
            ev('labour', '2027-05-01', name='Labour Day'),
        ]})
        text = plain(hol.findings(rows))
        self.assertIn('2 public holidays: 1 on fixed dates and 1 that follow', text)
        self.assertIn('Ramadan, the month of fasting', text)
        self.assertIn('February', text.split('Months with no public holiday:')[1])

    def test_weekend_dates_are_named(self):
        rows = hol.holidays({'events': [ev('labour', '2027-05-01', name='Labour Day'),
                                        ev('july', '2027-07-23', name='23 July'),
                                        ev('xmas', '2027-01-07', name='Christmas')]})
        text = plain(hol.findings(rows))
        self.assertIn('2 of the 3 fixed dates fall on a Friday or Saturday', text)
        self.assertNotIn('Christmas (', text)

    def test_the_real_calendar(self):
        rows = hol.holidays(json.loads(CAL.read_text(encoding='utf-8')))
        days_off = [r for r in rows if not r['period']]
        text = plain(hol.findings(rows))
        self.assertIn(f'{len(days_off)} public holidays', text)
        for r in days_off:      # every weekday the page states is the date's real weekday
            if hol.weekday(r):
                self.assertEqual(hol.weekday(r), r['start_d'].strftime('%A'))


class Output(unittest.TestCase):
    def test_table_escapes_and_links_sources(self):
        rows = hol.holidays({'events': [dict(ev('x', '2027-05-01', name='A <b>&</b>'),
                                             source='S', source_url='https://example.org/a?b=1&c=2')]})
        html = hol.table_html(rows)
        self.assertIn('A &lt;b&gt;&amp;&lt;/b&gt;', html)
        self.assertIn('href="https://example.org/a?b=1&amp;c=2"', html)

    def test_chart_is_valid_svg_with_a_bar_per_row(self):
        rows = hol.holidays({'events': [ev('a', '2027-01-07'), ev('b', '2027-03-09', '2027-03-12', 'expected')]})
        svg = hol.svg_chart(rows, 'T & t', ('credit',))
        root = ET.fromstring(svg)
        rects = [r for r in root.iter('{http://www.w3.org/2000/svg}rect') if r.get('rx') == '3']
        self.assertEqual(len(rects), 2)
        self.assertEqual(rects[1].get('fill'), hol.EXPECTED_FILL)

    def test_overlong_credit_is_refused(self):
        rows = hol.holidays({'events': [ev('a', '2027-01-07')]})
        with self.assertRaises(ValueError):
            hol.svg_chart(rows, 't', ('x' * (hol.CREDIT_MAX_CHARS + 1),))

    def test_no_calendar_publishes_nothing(self):
        with tempfile.TemporaryDirectory() as d, mock.patch.object(hol, 'SITE', d):
            self.assertEqual(hol.build_holidays_page(), [])
            self.assertFalse(Path(d, hol.PAGE).exists())


if __name__ == '__main__':
    unittest.main()
