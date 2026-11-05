#!/usr/bin/env python3
"""
Sunrise, sunset and golden light for a place and a date, in Egypt's own clock.

WHY
---
"When is the light good at Karnak in March?" is a question a photographer
asks before booking, and no Egypt page answers it with a method and a source.
Every visit/<site>.html already carries the site's coordinates, so the answer
can be computed rather than copied.

METHOD
------
* Sun position: the NOAA Global Monitoring Laboratory "General Solar Position
  Calculations" (fractional-year form of the equation of time and the solar
  declination). Stated accuracy of that form: about a minute for sunrise and
  sunset; checked against the independent `astral` package before shipping.
* Sunrise/sunset: solar zenith 90.833 deg (the standard allowance for
  atmospheric refraction and the size of the sun's disc).
* Golden light: the sun less than 6 deg above the horizon. Morning golden
  light runs from sunrise until the sun reaches 6 deg; evening golden light
  from 6 deg down to sunset. A convention, stated on the page, not a law.
* Clock: Egypt time from the IANA time-zone database ("Africa/Cairo"), which
  includes summer time, so no clock rule is hand-coded here. On Windows the
  database comes from the `tzdata` package; Linux has it built in.

Terrain is not modelled: a cliff or a temple wall can hide a low sun well
before the computed time. The page says so.

Pure standard library. Run directly for a self-check against fixed values.
"""
from __future__ import annotations

import datetime as dt
import math
from dataclasses import dataclass
from typing import Optional
from zoneinfo import ZoneInfo

CAIRO = ZoneInfo("Africa/Cairo")
SUNRISE_ZENITH = 90.833     # degrees: refraction + solar disc
GOLDEN_ELEVATION = 6.0      # degrees above the horizon


@dataclass(frozen=True)
class DayLight:
    date: dt.date
    sunrise: dt.datetime          # Egypt local time, tz-aware
    golden_morning_end: dt.datetime
    golden_evening_start: dt.datetime
    sunset: dt.datetime
    utc_offset_hours: float

    @property
    def golden_morning_minutes(self) -> int:
        return round((self.golden_morning_end - self.sunrise).total_seconds() / 60)

    @property
    def golden_evening_minutes(self) -> int:
        return round((self.sunset - self.golden_evening_start).total_seconds() / 60)


def _solar_terms(day: dt.date, utc_minutes: float) -> tuple[float, float]:
    """(equation of time in minutes, declination in radians) at a UTC instant of `day`."""
    doy = day.timetuple().tm_yday
    days_in_year = 366 if (day.year % 4 == 0 and (day.year % 100 != 0 or day.year % 400 == 0)) else 365
    g = 2 * math.pi / days_in_year * (doy - 1 + (utc_minutes / 60 - 12) / 24)
    eqtime = 229.18 * (0.000075 + 0.001868 * math.cos(g) - 0.032077 * math.sin(g)
                       - 0.014615 * math.cos(2 * g) - 0.040849 * math.sin(2 * g))
    decl = (0.006918 - 0.399912 * math.cos(g) + 0.070257 * math.sin(g)
            - 0.006758 * math.cos(2 * g) + 0.000907 * math.sin(2 * g)
            - 0.002697 * math.cos(3 * g) + 0.00148 * math.sin(3 * g))
    return eqtime, decl


def _crossing_utc_minutes(day: dt.date, lat: float, lon: float, zenith_deg: float, morning: bool) -> Optional[float]:
    """UTC minutes after midnight when the sun crosses `zenith_deg`, or None if it never does.

    Iterated twice so the equation of time and declination are taken at the
    crossing itself rather than at noon (the refinement NOAA recommends)."""
    t = 720.0
    for _ in range(3):
        eqtime, decl = _solar_terms(day, t)
        lat_r = math.radians(lat)
        cos_ha = (math.cos(math.radians(zenith_deg)) / (math.cos(lat_r) * math.cos(decl))
                  - math.tan(lat_r) * math.tan(decl))
        if not -1.0 <= cos_ha <= 1.0:
            return None
        ha = math.degrees(math.acos(cos_ha))
        t = 720 - 4 * (lon + (ha if morning else -ha)) - eqtime
    return t


def _to_local(day: dt.date, utc_minutes: float) -> dt.datetime:
    base = dt.datetime(day.year, day.month, day.day, tzinfo=dt.timezone.utc)
    return (base + dt.timedelta(minutes=utc_minutes)).astimezone(CAIRO)


def day_light(day: dt.date, lat: float, lon: float) -> DayLight:
    """Sunrise, golden-light edges and sunset for one day at one place, in Egypt time."""
    zen_golden = 90.0 - GOLDEN_ELEVATION
    parts = {
        "sunrise": _crossing_utc_minutes(day, lat, lon, SUNRISE_ZENITH, True),
        "golden_morning_end": _crossing_utc_minutes(day, lat, lon, zen_golden, True),
        "golden_evening_start": _crossing_utc_minutes(day, lat, lon, zen_golden, False),
        "sunset": _crossing_utc_minutes(day, lat, lon, SUNRISE_ZENITH, False),
    }
    missing = [k for k, v in parts.items() if v is None]
    if missing:   # cannot happen at Egypt's latitudes; refuse rather than invent
        raise ValueError(f"sun never crosses the threshold for {missing} at {lat},{lon} on {day}")
    local = {k: _to_local(day, v) for k, v in parts.items()}  # type: ignore[arg-type]
    offset = local["sunrise"].utcoffset() or dt.timedelta(0)
    return DayLight(date=day, utc_offset_hours=offset.total_seconds() / 3600, **local)


def monthly(year: int, lat: float, lon: float, day_of_month: int = 15) -> list[DayLight]:
    """One DayLight per month, on the given day of each month."""
    return [day_light(dt.date(year, m, day_of_month), lat, lon) for m in range(1, 13)]


if __name__ == "__main__":
    # Self-check on fixed inputs (Giza Pyramids). Printed, not asserted: the
    # independent comparison against `astral` lives in the verification note.
    for d in monthly(2026, 29.9773, 31.1325):
        print(d.date, d.sunrise.strftime("%H:%M"), d.golden_morning_end.strftime("%H:%M"),
              d.golden_evening_start.strftime("%H:%M"), d.sunset.strftime("%H:%M"), f"UTC+{d.utc_offset_hours:g}")
