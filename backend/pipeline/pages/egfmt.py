"""Egyptian formatting: one set of rules for every number, price, date and time
the page generators write. site/assets/egfmt.js implements the same rules for
the browser, and backend/pipeline/tests/egfmt_cases.json holds the cases both
must reproduce byte for byte, so the two cannot drift apart.

The rules (docs/superpowers/specs/2026-11-06-egyptian-formatting-and-papyrus-design.md):

  * English uses Western digits; Arabic uses Arabic-Indic digits, with "٬"
    for thousands and "٫" for decimals.
  * Money: "EGP 1,234" / "١٬٢٣٤ جنيه". No decimals at 100 and above, at most
    two below (trailing zeros dropped). An exchange rate always has two.
  * Dates: "6 Nov 2026" (compact) or "6 November 2026" (prose) in English;
    "٦ نوفمبر ٢٠٢٦" in Arabic, with the Egyptian month names. A timestamp is
    read in Cairo time; a bare YYYY-MM-DD is a calendar date and is not moved.
  * Times: 24-hour in English ("19:05"), 12-hour with ص/م in Arabic ("٧:٠٥ م").
  * Change: an arrow and the unsigned value, "▲ 13.5%" / "▼ ١٨٫٦٪".
  * In Arabic, a number, range or percentage is wrapped in a left-to-right
    isolate (U+2066 ... U+2069). Without it, "+13.5%" displays as "%13.5+" and
    a range's two ends swap places around the dash.

Rounding is half away from zero in both runtimes (Python's round() rounds
halves to even and JavaScript's Math.round rounds them up, so neither is used
on its own), done on the decimal string so 1.005 rounds to 1.01.
"""
from __future__ import annotations

import datetime as _dt
from decimal import ROUND_HALF_UP, Decimal
from typing import Optional, Union
from zoneinfo import ZoneInfo

CAIRO = ZoneInfo('Africa/Cairo')
LRI, PDI = '\u2066', '\u2069'
AR_DIGITS = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')
AR_THOUSANDS, AR_DECIMAL, AR_PERCENT = '٬', '٫', '٪'
MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
             'August', 'September', 'October', 'November', 'December']
MONTHS_EN_SHORT = [m[:3] for m in MONTHS_EN]
MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو',
             'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
POUND_AR = 'جنيه'
AM_AR, PM_AR = 'ص', 'م'
LANGS = ('en', 'ar')

Number = Union[int, float, Decimal]


def _lang(lang: str) -> str:
    if lang not in LANGS:
        raise ValueError(f'lang must be one of {LANGS}, not {lang!r}')
    return lang


def isolate(s: str) -> str:
    """Wrap s in a left-to-right isolate, for a number inside Arabic text."""
    return LRI + s + PDI


def digits(s: str, lang: str) -> str:
    """Western digits to Arabic-Indic when lang is 'ar'; unchanged for 'en'."""
    return s.translate(AR_DIGITS) if _lang(lang) == 'ar' else s


def _round(x: Number, places: int) -> Decimal:
    """Half away from zero, on the decimal string (so 1.005 -> 1.01)."""
    d = Decimal(str(x))
    q = Decimal(1).scaleb(-places)
    return d.copy_abs().quantize(q, rounding=ROUND_HALF_UP).copy_sign(d) if d else d.quantize(q)


def fixed(x: Number, lang: str, places: int) -> str:
    """Exactly `places` decimals, grouped in thousands, in lang's digits."""
    d = _round(x, places)
    neg = d < 0
    s = f'{d.copy_abs():,.{places}f}'
    if lang == 'ar':
        s = s.replace(',', AR_THOUSANDS).replace('.', AR_DECIMAL)
    s = digits(s, lang)
    return ('-' + s) if neg and d != 0 else s


def num(x: Number, lang: str, max_places: int = 2) -> str:
    """At most `max_places` decimals, trailing zeros dropped."""
    s = fixed(x, lang, max_places)
    dec = AR_DECIMAL if lang == 'ar' else '.'
    zero = '٠' if lang == 'ar' else '0'
    if dec in s:
        s = s.rstrip(zero).rstrip(dec)
    return s


def _money_places(egp: Number) -> int:
    return 0 if abs(Decimal(str(egp))) >= 100 else 2


def money(egp: Number, lang: str) -> str:
    """'EGP 1,234' / '١٬٢٣٤ جنيه' (the Arabic number isolated)."""
    v = num(egp, lang, _money_places(egp))
    return f'EGP {v}' if _lang(lang) == 'en' else f'{isolate(v)} {POUND_AR}'


def money_range(lo: Number, hi: Number, lang: str) -> str:
    """'EGP 50–100' / '٥٠–١٠٠ جنيه'. Equal ends collapse to one price."""
    if Decimal(str(lo)) == Decimal(str(hi)):
        return money(lo, lang)
    places = _money_places(max(abs(Decimal(str(lo))), abs(Decimal(str(hi)))))
    r = f'{num(lo, lang, places)}–{num(hi, lang, places)}'
    return f'EGP {r}' if _lang(lang) == 'en' else f'{isolate(r)} {POUND_AR}'


def rate(egp_per_unit: Number, lang: str) -> str:
    """An exchange rate: always two decimals. 'EGP 54.77' / '٥٤٫٧٧ جنيه'."""
    v = fixed(egp_per_unit, lang, 2)
    return f'EGP {v}' if _lang(lang) == 'en' else f'{isolate(v)} {POUND_AR}'


def pct(change: Optional[Number], lang: str, places: int = 1) -> str:
    """A change as an arrow and the unsigned value: '▲ 13.5%' / '▼ ١٨٫٦٪'.
    No change is '0%'; a missing value is ''."""
    if change is None:
        return ''
    d = _round(change, places)
    v = num(d.copy_abs(), lang, places)
    body = f'{v}%' if _lang(lang) == 'en' else isolate(v + AR_PERCENT)
    if d == 0:
        return body
    return ('▲ ' if d > 0 else '▼ ') + body


def _parse(value: Union[str, _dt.date, _dt.datetime]) -> Union[_dt.date, _dt.datetime]:
    """A bare 'YYYY-MM-DD' (or a date) is a calendar date and stays as it is.
    Anything with a time is an instant and is read in Cairo time."""
    if isinstance(value, _dt.datetime):
        dt = value
    elif isinstance(value, _dt.date):
        return value
    else:
        s = str(value).strip()
        if len(s) == 10:
            return _dt.date.fromisoformat(s)
        dt = _dt.datetime.fromisoformat(s.replace('Z', '+00:00'))
    if dt.tzinfo is None:
        raise ValueError(f'a timestamp needs a UTC offset to be put in Cairo time: {value!r}')
    return dt.astimezone(CAIRO)


def date(value: Union[str, _dt.date, _dt.datetime], lang: str, style: str = 'compact') -> str:
    """'6 Nov 2026' (compact) / '6 November 2026' (prose) / '٦ نوفمبر ٢٠٢٦'."""
    if style not in ('compact', 'prose'):
        raise ValueError(f"style must be 'compact' or 'prose', not {style!r}")
    d = _parse(value)
    if _lang(lang) == 'ar':
        return digits(f'{d.day} {MONTHS_AR[d.month - 1]} {d.year}', 'ar')
    months = MONTHS_EN_SHORT if style == 'compact' else MONTHS_EN
    return f'{d.day} {months[d.month - 1]} {d.year}'


def date_or_raw(value, lang: str, style: str = 'compact') -> str:
    """date() for a value read from a data file: '' when it is missing, the
    value as written when it cannot be read as a date. Display code must not
    fail on a stray field; the shared cases pin both fallbacks."""
    if value is None or value == '':
        return ''
    try:
        return date(value, lang, style)
    except (ValueError, TypeError):
        return str(value)


def time(value: Union[str, _dt.datetime], lang: str) -> str:
    """'19:05' / '٧:٠٥ م', in Cairo time."""
    t = _parse(value)
    if not isinstance(t, _dt.datetime):
        raise ValueError(f'a time needs a timestamp, not a date: {value!r}')
    if _lang(lang) == 'en':
        return f'{t.hour:02d}:{t.minute:02d}'
    h12 = t.hour % 12 or 12
    return digits(f'{h12}:{t.minute:02d}', 'ar') + ' ' + (AM_AR if t.hour < 12 else PM_AR)


def time_tag(value: Union[str, _dt.date], lang: str, style: str = 'compact') -> str:
    """A visible formatted date inside a machine-readable <time datetime>."""
    d = _parse(value)
    iso = d.isoformat() if not isinstance(d, _dt.datetime) else d.isoformat(timespec='minutes')
    return f'<time datetime="{iso}">{date(value, lang, style)}</time>'
