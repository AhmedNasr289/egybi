"""fetch_fx: a currency that moves alone is held back for the day.

On 2026-08-22 the API returned the Kuwaiti dinar at EGP 114.43 (165.07 the day
before, 164.88 the day after) while nine other currencies moved 0.1% or less.
The page published "-30.68%", and the point stayed in the history, so the
dinar's sparkline on the prices page drew a false dip for months after. These
pin the guard, the behaviour of a run that meets such a value, and that the
published history carries no such point.
"""
from __future__ import annotations

import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import fetch_fx  # noqa: E402

HISTORY = Path(__file__).resolve().parents[3] / 'site' / 'data' / 'fx-history.json'

# The real changes of 2026-08-22, in %.
AUG_22 = {'USD': -0.02, 'EUR': -0.05, 'GBP': 0.03, 'SAR': -0.02, 'AED': -0.02,
          'KWD': -30.68, 'QAR': -0.03, 'CAD': 0.1, 'CNY': 0.0, 'TRY': -0.1}


class OutOfLine(unittest.TestCase):
    def test_the_dinar_of_22_august_is_held_back_and_nothing_else(self):
        self.assertEqual(fetch_fx.out_of_line(AUG_22), {'KWD'})

    def test_a_real_devaluation_moves_every_currency_and_is_kept(self):
        # March 2024: the pound lost about 38% in a day, so each currency rose ~60% in EGP.
        self.assertEqual(fetch_fx.out_of_line({c: 60.0 + i * 0.3 for i, c in enumerate(AUG_22)}), set())

    def test_ordinary_days_hold_nothing_back(self):
        self.assertEqual(fetch_fx.out_of_line({'USD': 1.2, 'EUR': 0.4, 'TRY': -2.5, 'KWD': 1.1}), set())

    def test_too_few_currencies_to_judge(self):
        self.assertEqual(fetch_fx.out_of_line({'USD': 0.0, 'KWD': -30.0}), set())


def bundle(rates_egp):
    """An API response for {code: EGP per unit}."""
    return {'result': 'success', 'time_last_update_utc': 'Sat, 22 Aug 2026 00:02:31 +0000',
            'rates': {c: 1.0 / v for c, v in rates_egp.items()}}


class Run(unittest.TestCase):
    def test_a_run_that_meets_a_lone_jump_publishes_and_keeps_the_others_only(self):
        prev = {'USD': 50.89, 'EUR': 59.48, 'GBP': 69.40, 'SAR': 13.57, 'AED': 13.86,
                'KWD': 165.071, 'QAR': 13.98, 'CAD': 36.94, 'CNY': 7.55, 'TRY': 1.06}
        today = dict(prev, KWD=114.4296)
        with tempfile.TemporaryDirectory() as d:
            hist = {'series': {c: [{'as_of': '2026-08-21', 'egp': v}] for c, v in prev.items()}, 'updated': None}
            Path(d, 'fx-history.json').write_text(json.dumps(hist), encoding='utf-8')
            out = io.StringIO()
            with mock.patch.object(fetch_fx, 'DATA_DIR', d), \
                    mock.patch.object(fetch_fx, 'fetch_live', return_value=bundle(today)), \
                    mock.patch.object(sys, 'argv', ['fetch_fx.py']), contextlib.redirect_stdout(out):
                self.assertEqual(fetch_fx.main(), 0)
            published = json.loads(Path(d, 'fx-today.json').read_text(encoding='utf-8'))
            kept = json.loads(Path(d, 'fx-history.json').read_text(encoding='utf-8'))['series']
        self.assertNotIn('KWD', [r['code'] for r in published['rates']])
        self.assertEqual(len(published['rates']), len(prev) - 1)
        self.assertEqual([p['as_of'] for p in kept['KWD']], ['2026-08-21'])
        self.assertEqual([p['as_of'] for p in kept['USD']], ['2026-08-21', '2026-08-22'])
        self.assertIn('::warning::FX KWD held back for 2026-08-22', out.getvalue())


class PublishedHistory(unittest.TestCase):
    def test_no_stored_point_is_out_of_line_with_the_other_currencies_that_day(self):
        series = json.loads(HISTORY.read_text(encoding='utf-8'))['series']
        dates = sorted({p['as_of'] for pts in series.values() for p in pts})
        last, found = {}, []
        for d in dates:
            today = {c: next((p['egp'] for p in pts if p['as_of'] == d), None) for c, pts in series.items()}
            changes = {c: (v / last[c] - 1) * 100 for c, v in today.items() if v and c in last}
            found += [(c, d) for c in fetch_fx.out_of_line(changes)]
            last.update({c: v for c, v in today.items() if v})
        self.assertEqual(found, [])


if __name__ == '__main__':
    unittest.main()
