"""heat_calendar: the all-sites weather table and its embeddable SVG.

Each test pins a defect that shipped or nearly shipped on 2026-11-06:
cells coloured against their own legend, sentences that disagreed with the
cells beside them, and a credit line that ran off the image.
"""
from __future__ import annotations

import json
import math
import re
import sys
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

PIPELINE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PIPELINE))

import heat_calendar as hc  # noqa: E402

CLIMATE = PIPELINE.parents[1] / 'site' / 'data' / 'visit-climate.json'


def legend_range(label: str) -> tuple[float, float]:
    """The inclusive whole-degree range a legend label promises."""
    n = [int(x) for x in re.findall(r'\d+', label)]
    if 'or less' in label:
        return -math.inf, n[0]
    if 'or more' in label:
        return n[0], math.inf
    return n[0], n[1]


def synthetic(values_by_month: list[list[int]]) -> list[hc.Row]:
    return [hc.Row(f's{i}', f'Site {i}', 30.0 - i, tuple(v)) for i, v in enumerate(values_by_month)]


class Bands(unittest.TestCase):
    def test_every_whole_degree_lands_inside_its_own_label(self):
        # The defect: 38.6 was banded as 34-38 but printed "39".
        for t in range(-5, 50):
            lo, hi = legend_range(hc.BANDS[hc.band(t)][2])
            self.assertTrue(lo <= t <= hi, f'{t} °C is coloured as {hc.BANDS[hc.band(t)][2]!r}')

    def test_labels_cover_every_degree_without_overlap(self):
        ranges = [legend_range(label) for _, _, label in hc.BANDS]
        for (_, hi), (lo, _) in zip(ranges, ranges[1:]):
            self.assertEqual(hi + 1, lo, f'gap or overlap between bands: {ranges}')

    def test_cell_text_meets_wcag_aa_on_every_band(self):
        for _, fill, label in hc.BANDS:
            ratio = hc._contrast(fill, hc.text_colour(fill))
            self.assertGreaterEqual(ratio, 4.5, f'{label}: {ratio:.2f}:1')


class RowsFromClimate(unittest.TestCase):
    def test_values_are_rounded_once_at_load(self):
        clim = {'sites': [{'key': 'a', 'name': 'A', 'lat': 30,
                           'months': [{'month': m, 't_daily_max': 38.6} for m in range(1, 13)]}]}
        (row,) = hc.rows_from_climate(clim)
        self.assertEqual(row.afternoons, (39,) * 12)
        self.assertTrue(all(isinstance(t, int) for t in row.afternoons))

    def test_a_site_missing_a_month_is_left_out_not_padded(self):
        clim = {'sites': [{'key': 'a', 'name': 'A', 'lat': 30,
                           'months': [{'month': m, 't_daily_max': 20.0} for m in range(1, 12)]}]}
        self.assertEqual(hc.rows_from_climate(clim), [])

    def test_rows_run_north_to_south(self):
        clim = {'sites': [{'key': k, 'name': k, 'lat': lat,
                           'months': [{'month': m, 't_daily_max': 20.0} for m in range(1, 13)]}
                          for k, lat in (('south', 22.0), ('north', 31.0), ('mid', 26.0))]}
        self.assertEqual([r.key for r in hc.rows_from_climate(clim)], ['north', 'mid', 'south'])


class Findings(unittest.TestCase):
    def test_sentences_agree_with_the_cells(self):
        rows = synthetic([
            [20, 21, 27, 30, 35, 39, 42, 41, 37, 31, 25, 21],
            [19, 20, 26, 29, 33, 36, 30, 30, 33, 29, 24, 20],
        ])
        text = ' '.join(re.sub('<[^>]+>', '', s) for s in hc.findings(rows))
        # Both rows are under 28 in Jan, Feb, Mar, Nov and Dec (March: 27 and 26).
        self.assertIn('In January, February, March, November and December, 2 of 2 sites', text)
        self.assertIn('In April, May, June, July, August, September and October, none does', text)
        self.assertIn('hottest normal afternoon in the table is Site 0 in July, about 42 °C', text)
        # July spread: 42 - 30, from the printed values.
        self.assertIn('In July the spread between sites is 12 °C', text)
        self.assertIn('Every site stays under 34 °C in the afternoon in January, February, March, '
                      'April, October, November and December', text)

    def test_no_month_under_34_is_said_plainly(self):
        rows = synthetic([[35] * 12])
        self.assertIn('There is no month', hc.findings(rows)[-1])

    def test_findings_on_the_real_data_match_the_printed_table(self):
        rows = hc.rows_from_climate(json.loads(CLIMATE.read_text(encoding='utf-8')))
        self.assertGreater(len(rows), 1)
        cool = [sum(r.afternoons[i] < hc.COMFORT_BELOW for r in rows) for i in range(12)]
        first = re.sub('<[^>]+>', '', hc.findings(rows)[0])
        self.assertIn(f'{max(cool)} of {len(rows)} sites', first)


class Svg(unittest.TestCase):
    def test_chart_is_well_formed_xml_with_every_cell(self):
        rows = synthetic([[20, 25, 30, 36, 40, 21, 22, 27, 28, 33, 34, 38]] * 3)
        svg = hc.svg_chart(rows, 'Title & more', ('Source line', 'Chart: egybi.com/x.html'))
        root = ET.fromstring(svg)
        texts = [t.text for t in root.iter('{http://www.w3.org/2000/svg}text')]
        self.assertEqual(sum(1 for t in texts if t and t.isdigit()), 3 * 12)
        self.assertIn('Chart: egybi.com/x.html', texts)

    def test_a_credit_line_that_would_overflow_is_refused(self):
        rows = synthetic([[20] * 12])
        with self.assertRaises(ValueError):
            hc.svg_chart(rows, 't', ('x' * (hc.CREDIT_MAX_CHARS + 1),))

    def test_canvas_grows_with_each_credit_line(self):
        rows = synthetic([[20] * 12])
        h1 = int(re.search(r'height="(\d+)"', hc.svg_chart(rows, 't', ('a',))).group(1))
        h2 = int(re.search(r'height="(\d+)"', hc.svg_chart(rows, 't', ('a', 'b'))).group(1))
        self.assertGreater(h2, h1)


class TableHtml(unittest.TestCase):
    def test_every_cell_colour_matches_the_label_of_its_printed_number(self):
        rows = hc.rows_from_climate(json.loads(CLIMATE.read_text(encoding='utf-8')))
        html = hc.table_html(rows) + hc.legend_html()
        legend = {fill: legend_range(label) for fill, label in
                  re.findall(r'<span><i style="background:(#[0-9A-F]{6})"></i>([^<]+)</span>', html)}
        cells = re.findall(r'<td style="background:(#[0-9A-F]{6});color:#[0-9A-F]{6}">(\d+)</td>', html)
        self.assertEqual(len(cells), 12 * len(rows))
        for fill, value in cells:
            lo, hi = legend[fill]
            self.assertTrue(lo <= int(value) <= hi, f'"{value}" drawn in the {legend[fill]} colour')

    def test_site_names_are_escaped(self):
        rows = [hc.Row('k', 'A <b>&</b> B', 30.0, (20,) * 12)]
        self.assertIn('A &lt;b&gt;&amp;&lt;/b&gt; B', hc.table_html(rows))


if __name__ == '__main__':
    unittest.main()
