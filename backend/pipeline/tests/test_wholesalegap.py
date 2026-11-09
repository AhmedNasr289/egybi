"""pages/wholesalegap.py: the wholesale-to-shop data story.

What these pin, each a decision forced by a measurement on 2026-11-08:
  * only items priced in the SAME unit on both lists are compared (33 of 83
    shared items, all the fish among them, are priced by the crate, carton or
    sack at wholesale);
  * a wholesale price that never changes is not a measurement (six series held
    one or two values for 17 weeks, two of them among the "widest gaps");
  * the window ends on the last WHOLESALE date, the slower list;
  * each week is a median, so one wild day does not set an item's gap;
  * "moved the same way" counts only weeks in which both prices changed;
  * the sitemap dates this page by its own content, not by the daily price file.
"""
from __future__ import annotations

import datetime as dt
import json
import sys
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pages import wholesalegap as wg  # noqa: E402
import sitemap_lastmod as sl  # noqa: E402

START = dt.date(2026, 7, 1)
WEEKS = 8


def days(n=7 * WEEKS):
    return [(START + dt.timedelta(days=i)).isoformat() for i in range(n)]


def weekly(n=WEEKS, offset=3):
    return [(START + dt.timedelta(days=7 * k + offset)).isoformat() for k in range(n)]


def meta(slug, category='vegetable', unit='كيلو', name='Tomato'):
    return {'slug': slug, 'category': category, 'unit': unit, 'name_ar': 'ط', 'name_en': name}


def build_fixture():
    """Retail daily at 15, wholesale weekly at 10 with small moves: a gap of
    1.5 for 'v*' and 'f*' items; plus one item in another unit, one frozen
    wholesale series and one not-food item."""
    rs, ws, mr, mw = {}, {}, {}, {}
    for i in range(10):
        for cat, p in (('vegetable', 'v'), ('fruit', 'f')):
            s = f'{p}{i}'
            mr[s], mw[s] = meta(s, cat, name=f'{cat} {i}'), meta(s, cat)
            rs[s] = [{'as_of': d, 'avg': 15.0} for d in days()]
            ws[s] = [{'as_of': d, 'avg': 10.0 + (k % 3) * 0.01} for k, d in enumerate(weekly())]
    mr['crate'], mw['crate'] = meta('crate', 'fish', name='Tilapia'), meta('crate', 'fish', unit='طاولة خشب')
    rs['crate'] = [{'as_of': d, 'avg': 90.0} for d in days()]
    ws['crate'] = [{'as_of': d, 'avg': 900.0 + k} for k, d in enumerate(weekly())]
    mr['frozen'], mw['frozen'] = meta('frozen', name='Cauliflower'), meta('frozen')
    rs['frozen'] = [{'as_of': d, 'avg': 30.0} for d in days()]
    ws['frozen'] = [{'as_of': d, 'avg': 10.0} for d in weekly()]
    mr['cement'], mw['cement'] = meta('cement', 'building', name='Cement'), meta('cement', 'building')
    rs['cement'] = [{'as_of': d, 'avg': 4000.0} for d in days()]
    ws['cement'] = [{'as_of': d, 'avg': 3000.0 + k} for k, d in enumerate(weekly())]
    return rs, ws, mr, mw


class Comparable(unittest.TestCase):
    def setUp(self):
        self.rs, self.ws, self.mr, self.mw = build_fixture()
        self.same, self.other = wg.comparable(self.mr, self.mw, self.rs, self.ws)

    def test_a_different_unit_is_left_out_and_counted(self):
        self.assertNotIn('crate', self.same)
        self.assertEqual(self.other, ['crate'])

    def test_not_food_is_never_considered(self):
        self.assertNotIn('cement', self.same + self.other)


class Gaps(unittest.TestCase):
    def setUp(self):
        self.rs, self.ws, self.mr, self.mw = build_fixture()
        same, _ = wg.comparable(self.mr, self.mw, self.rs, self.ws)
        self.d0, self.d1, self.n = wg.window(self.rs, self.ws, same)
        self.rows, self.frozen = wg.item_gaps(self.mr, self.rs, self.ws, same, self.d0, self.d1, self.n)
        self.by = {r['slug']: r for r in self.rows}

    def test_a_frozen_wholesale_price_is_not_a_measurement(self):
        self.assertEqual(self.frozen, ['frozen'])
        self.assertNotIn('frozen', self.by)

    def test_the_window_ends_on_the_last_wholesale_date(self):
        # Retail runs to day 55; the last wholesale quote is day 52.
        self.assertEqual(self.d1.isoformat(), weekly()[-1])

    def test_the_gap_is_shop_over_wholesale_from_weekly_medians(self):
        self.assertAlmostEqual(self.by['v0']['gap'], 15.0 / 10.01, places=3)

    def test_one_wild_day_does_not_set_an_items_gap(self):
        rs = dict(self.rs)
        last_week = {d for d in days() if self.d1 - dt.timedelta(days=6) <= dt.date.fromisoformat(d) <= self.d1}
        rs['v0'] = [{'as_of': p['as_of'], 'avg': 150.0 if p['as_of'] == max(last_week) else p['avg']}
                    for p in self.rs['v0']]
        rows, _ = wg.item_gaps(self.mr, rs, self.ws, ['v0'], self.d0, self.d1, self.n)
        # The week's own value, not only the gap: the four-week median that sets
        # the gap absorbed a wild week, so a test on the gap alone passed even
        # with the week averaged (the first version of this test did).
        self.assertEqual(rows[0]['retail_w'][self.n - 1], 15.0)
        self.assertLess(rows[0]['gap'], 1.6)

    def test_each_charted_category_has_a_weekly_line(self):
        cats = wg.charted_categories(self.rows)
        self.assertEqual(sorted(cats), ['fruit', 'vegetable'])
        line = wg.category_line(self.rows, 'vegetable', self.d0, self.d1, self.n)
        self.assertEqual(len(line), self.n)
        self.assertTrue(all(140 < v < 160 for _, v in line))


class SameDirection(unittest.TestCase):
    def test_only_weeks_where_both_prices_changed_count(self):
        row = {'category': 'vegetable', 'ratio': {0: 1, 1: 1, 2: 1, 3: 1},
               'retail_w': {0: 10, 1: 11, 2: 11, 3: 10}, 'wholesale_w': {0: 5, 1: 6, 2: 7, 3: 8}}
        # week 0->1 both up (agree); 1->2 retail flat (not counted); 2->3 opposite.
        self.assertEqual(wg.same_direction([row]), (0.5, 2))


class Findings(unittest.TestCase):
    def test_the_fish_note_appears_only_when_every_fish_was_left_out(self):
        rs, ws, mr, mw = build_fixture()
        same, other = wg.comparable(mr, mw, rs, ws)
        d0, d1, n = wg.window(rs, ws, same)
        rows, frozen = wg.item_gaps(mr, rs, ws, same, d0, d1, n)
        text = ' '.join(wg.findings(rows, wg.charted_categories(rows), d0, d1, n, other, frozen, mr))
        self.assertIn('all the fish among them', text)
        self.assertIn('1 whose wholesale price did not change', text)
        self.assertNotIn('profit', text.replace('not a profit', ''))


class Build(unittest.TestCase):
    def test_no_data_publishes_nothing(self):
        with tempfile.TemporaryDirectory() as d, mock.patch.object(wg, 'SITE', d):
            self.assertEqual(wg.build_wholesale_gap_page(), [])
            self.assertFalse(Path(d, wg.PAGE).exists())

    def test_a_full_build_writes_valid_charts_that_fit_a_phone(self):
        rs, ws, mr, mw = build_fixture()
        for i in range(10, 25):   # enough items to publish
            s = f'v{i}'
            mr[s], mw[s] = mr['v0'] | {'slug': s}, mw['v0'] | {'slug': s}
            rs[s], ws[s] = rs['v0'], ws['v0']
        with tempfile.TemporaryDirectory() as d, mock.patch.object(wg, 'SITE', d):
            Path(d, 'data').mkdir()
            Path(d, 'data', 'prices-history.json').write_text(json.dumps(
                {'retail': {'series': rs}, 'wholesale': {'series': ws}}), encoding='utf-8')
            Path(d, 'data', 'prices-today.json').write_text(json.dumps(
                {'retail': {'items': list(mr.values())}, 'wholesale': {'items': list(mw.values())}}),
                encoding='utf-8')
            self.assertEqual(len(wg.build_wholesale_gap_page()), 1)
            for c in (wg.CHART, wg.CHART_NARROW):
                ET.fromstring(Path(d, c).read_text(encoding='utf-8'))
            narrow = ET.fromstring(Path(d, wg.CHART_NARROW).read_text(encoding='utf-8'))
            self.assertEqual(narrow.get('viewBox').split()[2], str(wg.NARROW_W))
            self.assertIn('Gap', Path(d, wg.PAGE).read_text(encoding='utf-8'))


class SitemapSelfDated(unittest.TestCase):
    """The daily job must move this page's date only when its content changed."""

    SITEMAP = ('<urlset><url><loc>https://egybi.com/egypt-wholesale-to-shop.html</loc>'
               '<lastmod>2026-11-01</lastmod></url></urlset>\n')

    def run_refresh(self, head, working):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d, 'sitemap.xml')
            p.write_text(self.SITEMAP, encoding='utf-8')
            with mock.patch.object(sl, '_show', return_value=head), \
                    mock.patch.object(sl, '_read', side_effect=lambda path: (
                        working if path.endswith(wg.PAGE) else Path(path).read_text(encoding='utf-8'))), \
                    mock.patch.object(sl, 'today', return_value='2026-11-08'):
                changed = sl.refresh_data_pages(str(p))
            return changed, p.read_text(encoding='utf-8')

    def test_an_unchanged_page_keeps_its_date(self):
        changed, xml = self.run_refresh('<p>same</p>', '<p>same</p>')
        self.assertEqual(changed, [])
        self.assertIn('<lastmod>2026-11-01</lastmod>', xml)

    def test_a_rebuilt_page_with_new_content_is_dated_today(self):
        changed, xml = self.run_refresh('<p>old</p>', '<p>new</p>')
        self.assertEqual(changed, ['https://egybi.com/egypt-wholesale-to-shop.html'])
        self.assertIn('<lastmod>2026-11-08</lastmod>', xml)

    def test_it_is_not_dated_by_the_daily_price_file(self):
        self.assertNotIn(wg.PAGE, sl.DATA_PAGES)
        self.assertIn(wg.PAGE, sl.SELF_DATED)


if __name__ == '__main__':
    unittest.main()
