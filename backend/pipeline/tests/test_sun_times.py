"""sun_times: sunrise, golden light and sunset in Egypt's own clock.

The 2026-11-04 build was checked against the independent `astral` package
over 18 sites x 12 months (worst 2.4 min). These tests pin that result with
fixed values and the invariants every day must satisfy, so a later edit to
the equations cannot drift silently.
"""
from __future__ import annotations

import datetime as dt
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import sun_times  # noqa: E402

GIZA = (29.9773, 31.1325)
ABU_SIMBEL = (22.3372, 31.6258)


def minutes(t: dt.datetime) -> int:
    return t.hour * 60 + t.minute


class Ordering(unittest.TestCase):
    def test_each_day_runs_sunrise_golden_golden_sunset(self):
        for lat, lon in (GIZA, ABU_SIMBEL):
            for d in sun_times.monthly(2026, lat, lon):
                self.assertLess(d.sunrise, d.golden_morning_end, d.date)
                self.assertLess(d.golden_morning_end, d.golden_evening_start, d.date)
                self.assertLess(d.golden_evening_start, d.sunset, d.date)

    def test_golden_light_lasts_a_plausible_time(self):
        # At 22-30 N the sun takes roughly 25-45 minutes to climb 6.8 degrees.
        for d in sun_times.monthly(2026, *GIZA):
            self.assertTrue(20 <= d.golden_morning_minutes <= 50, (d.date, d.golden_morning_minutes))
            self.assertTrue(20 <= d.golden_evening_minutes <= 50, (d.date, d.golden_evening_minutes))


class EgyptClock(unittest.TestCase):
    def test_winter_is_utc_plus_2_and_summer_utc_plus_3(self):
        # Egypt restored summer time in 2023; the IANA database carries the rule.
        self.assertEqual(sun_times.day_light(dt.date(2026, 1, 15), *GIZA).utc_offset_hours, 2)
        self.assertEqual(sun_times.day_light(dt.date(2026, 7, 15), *GIZA).utc_offset_hours, 3)


class SummerTime(unittest.TestCase):
    def test_the_real_change_dates_not_the_15th_of_a_month(self):
        self.assertEqual(sun_times.summer_time(2026), (dt.date(2026, 4, 24), dt.date(2026, 10, 29)))
        self.assertEqual(sun_times.summer_time(2027), (dt.date(2027, 4, 30), dt.date(2027, 10, 28)))

    def test_a_year_without_summer_time(self):
        self.assertIsNone(sun_times.summer_time(2020))   # Egypt kept no summer time 2015-2022


class KnownValues(unittest.TestCase):
    def test_giza_matches_the_values_checked_against_astral(self):
        # Published on visit/giza.html on 2026-11-05 after the astral check.
        jan = sun_times.day_light(dt.date(2026, 1, 15), *GIZA)
        self.assertAlmostEqual(minutes(jan.sunrise), 6 * 60 + 51, delta=2)
        self.assertAlmostEqual(minutes(jan.sunset), 17 * 60 + 16, delta=2)

    def test_south_has_a_shorter_summer_day_than_north(self):
        north = sun_times.day_light(dt.date(2026, 6, 21), *GIZA)
        south = sun_times.day_light(dt.date(2026, 6, 21), *ABU_SIMBEL)
        self.assertGreater(north.sunset - north.sunrise, south.sunset - south.sunrise)


if __name__ == '__main__':
    unittest.main()
