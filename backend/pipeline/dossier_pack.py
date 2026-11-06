#!/usr/bin/env python3
"""
The Papyrus Egypt Dossier - the $12 full pack, as one printable document.

WHAT IT IS
----------
dossier.html promises three things for the full pack, and this builds exactly
those, from the same cited data the site already publishes:

  1. All 18 measured sites, one sheet each: all twelve months of heat and
     rain (visit-climate.json, NASA POWER 2001-2020 normals), the site's
     elevation (visit-terrain.json), and sunrise, golden light and sunset for
     the pack's year (sun_times.py, the same equations as the visit/ pages).
  2. The fair-price pocket card in English and Arabic (fair-prices.json, every
     row with its source), with each price converted at the day's rate
     (fx-today.json, a market reference rate, said so on the card).
  3. The holiday calendar for the year, lunar dates marked as expected
     (calendar.json, through pages/holidays.py, so the rules are the page's).

Nothing here is new information: it is the published data gathered into one
set that prints well and works offline. The listing must say so.

WHERE IT GOES
-------------
build/dossier-pack/, which is git-ignored and outside site/, so the paid pack
is never deployed by accident. With --pdf it also prints a PDF through a local
headless Edge or Chrome (a one-off browser process, no server).

THE ARABIC
----------
fair-prices.json has no Arabic, so the card's Arabic names live in ARABIC
below, keyed by row key. A row without a translation is an error, not a blank:
a pocket card meant to be shown to a driver must not silently lose its Arabic.

Run:  python backend/pipeline/dossier_pack.py [--year 2027] [--pdf]
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import heat_calendar as hc  # noqa: E402
import sun_times  # noqa: E402
from pages import holidays as hol  # noqa: E402
from pages.common import ROOT, SITE, esc, read_text, write_text  # noqa: E402

OUT_DIR = Path(ROOT) / 'build' / 'dossier-pack'
OUT_HTML = 'the-papyrus-egypt-dossier.html'
OUT_PDF = 'the-papyrus-egypt-dossier.pdf'
TITLE = 'The Papyrus Egypt Dossier'

MONTHS = hc.MONTHS
MONTHS_SHORT = [m[:3] for m in MONTHS]

# Arabic names for the card, by fair-prices.json row key: (item, unit).
# Egyptian usage where it differs from Modern Standard Arabic (feluccas have a
# "rayyis", a ride is a "meshwar"), because the card is shown to Egyptians.
ARABIC: dict[str, tuple[str, str]] = {
    'tip-camel': ('بقشيش صاحب الجمل أو الحصان، بعد الركوب', 'لكل جولة'),
    'tip-felucca': ('بقشيش ريّس الفلوكة', 'لكل ساعة إبحار، للمركب كله وليس للفرد'),
    'tip-housekeeping': ('بقشيش عامل نظافة الغرف بالفندق', 'لكل غرفة في اليوم'),
    'tip-cruise': ('بقشيش طاقم الباخرة النيلية (ظرف مشترك)', 'للفرد في الليلة'),
    'tip-guide-flat': ('بقشيش المرشد السياحي، جولة عادية', 'لكل جولة، حسب مدتها'),
    'tip-guide-day': ('بقشيش المرشد السياحي، رحلة عدة أيام', 'في اليوم أو أكثر'),
    'giza-entry': ('تذكرة دخول هضبة الأهرامات بالجيزة، زائر أجنبي بالغ', 'للفرد'),
    'camel-ride': ('ركوب الجمل في الجيزة', 'للجولة'),
    'app-ride': ('مشوار داخل المدينة بالتاكسي أو بالتطبيق', 'للمشوار عادةً'),
}
GROUP_AR = {'tips': 'البقشيش', 'entry': 'الدخول', 'rides': 'الركوب والمواصلات'}
CURRENCY_AR = {'EGP': 'جنيه', 'USD': 'دولار'}


def load(name: str) -> dict:
    return json.loads(read_text(os.path.join(SITE, 'data', name)))


# ---------------------------------------------------------------- fair prices
def usd_rate(fx: dict) -> float:
    """EGP per USD from fx-today.json. Refuses a missing or silly rate rather
    than printing prices converted at nothing."""
    for r in fx.get('rates', []):
        if r.get('code') == 'USD':
            rate = float(r['egp'])
            if not 5 < rate < 1000:
                raise ValueError(f'implausible USD rate {rate}')
            return rate
    raise ValueError('fx-today.json has no USD rate')


def _num(v: float) -> str:
    return f'{v:,.0f}' if v >= 10 else f'{v:,.1f}'.rstrip('0').rstrip('.')


def _ltr(s: str) -> str:
    """Wrap a number or range in a left-to-right isolate (U+2066 ... U+2069).
    Inside right-to-left text "50–100" otherwise displays as "100–50": the
    en dash is a neutral character, so the bidi algorithm reorders the two
    numbers around it. The isolate keeps the range reading low to high."""
    return '\u2066' + s + '\u2069'


def price_text(row: dict) -> tuple[str, str, str]:
    """(English range, Arabic range, the other currency) for one row.

    The other currency is what a reader carries in their head: a USD price is
    shown in pounds and a pound price in dollars. Rounded to the nearest 5 EGP
    or 0.5 USD, because a converted figure is a guide, not a quote."""
    low, high, cur = row.get('low'), row.get('high'), row.get('currency', 'EGP')
    if low is None:
        return 'No sourced price', 'لا يوجد سعر موثّق', ''
    c = CURRENCY_AR.get(cur, cur)
    if high is None:
        en, ar = f'from {_num(low)} {cur}', f'من {_ltr(_num(low))} {c}'
    elif high == low:
        en, ar = f'{_num(low)} {cur}', f'{_ltr(_num(low))} {c}'
    else:
        en, ar = f'{_num(low)}–{_num(high)} {cur}', f'{_ltr(_num(low) + "–" + _num(high))} {c}'
    return en, ar, cur


def converted(row: dict, rate: float) -> str:
    low, high, cur = row.get('low'), row.get('high'), row.get('currency', 'EGP')
    if low is None:
        return ''
    if cur == 'USD':
        f, unit, step = (lambda v: v * rate), 'EGP', 5
    elif cur == 'EGP':
        f, unit, step = (lambda v: v / rate), 'USD', 0.5
    else:
        return ''

    def r(v: float) -> str:
        return _num(round(f(v) / step) * step)
    if high is None:
        return f'≈ from {r(low)} {unit}'
    return f'≈ {r(low)} {unit}' if high == low else f'≈ {r(low)}–{r(high)} {unit}'


def fair_card(fp: dict, fx: dict) -> str:
    rate = usd_rate(fx)
    missing = [r['key'] for g in fp.get('groups', []) for r in g.get('rows', []) if r['key'] not in ARABIC]
    if missing:
        raise KeyError(f'fair-prices rows with no Arabic on the card: {missing}')
    # The card itself stays compact (it is folded and shown); each row's note,
    # source and any disagreement between sources go in numbered notes below
    # it, so nothing the data holds is dropped.
    parts, notes, n = [], [], 0
    for g in fp.get('groups', []):
        rows = []
        for r in g.get('rows', []):
            n += 1
            en, ar, _ = price_text(r)
            item_ar, unit_ar = ARABIC[r['key']]
            bits = [esc(r['note'])] if r.get('note') else []
            if r.get('conflict'):
                bits.append(f'<span class="fp-conflict">Sources disagree: {esc(r["conflict"])}</span>')
            bits.append(f'Source: {esc(r.get("source") or "none")}, {esc(r.get("published") or "undated")}.')
            notes.append(f'<li value="{n}">{" ".join(bits)}</li>')
            rows.append(
                f'<tr><td><strong>{esc(r["item"])}</strong><sup>{n}</sup> <span class="fp-unit">{esc(r.get("unit", ""))}</span></td>'
                f'<td class="num">{esc(en)}<div class="fp-conv">{esc(converted(r, rate))}</div></td>'
                f'<td class="ar" lang="ar" dir="rtl"><strong>{esc(item_ar)}</strong> '
                f'<span class="fp-unit">{esc(unit_ar)}</span><div>{esc(ar)}</div></td></tr>')
        parts.append(f'<h3>{esc(g.get("title", g["key"]))} <span lang="ar" dir="rtl">{esc(GROUP_AR.get(g["key"], ""))}</span></h3>'
                     '<table class="fp"><thead><tr><th>What</th><th class="num">Fair range</th>'
                     '<th class="ar" lang="ar" dir="rtl">بالعربي</th></tr></thead>'
                     f'<tbody>{"".join(rows)}</tbody></table>')
    parts.append(f'<h3>Notes and sources</h3><ol class="fp-notes">{"".join(notes)}</ol>')
    return (f'<section class="sheet card"><h2>The fair-price pocket card</h2>'
            f'<p class="lead">Fold this page and show the right-hand column. Ranges are what the named sources '
            f'report, read {esc(fp.get("as_of", ""))}. Conversions use {rate:.2f} EGP to the dollar, the '
            f'market reference rate of {esc(fx.get("as_of", ""))} (not the Central Bank fixing); check the day\'s rate.</p>'
            + ''.join(parts) + '</section>')


# ---------------------------------------------------------------- site sheets
def comfort_months(maxes: list[int]) -> list[str]:
    return [MONTHS_SHORT[i] for i, t in enumerate(maxes) if t < hc.COMFORT_BELOW]


def site_sheet(site: dict, elevation: Optional[float], year: int) -> str:
    months = sorted(site['months'], key=lambda m: m['month'])
    if [m['month'] for m in months] != list(range(1, 13)):
        raise ValueError(f"{site['key']}: climate does not cover all twelve months")
    maxes = [round(float(m['t_daily_max'])) for m in months]
    rows = []
    for m, tmax in zip(months, maxes):
        fill = hc.BANDS[hc.band(tmax)][1]
        rows.append(
            f'<tr><th scope="row">{MONTHS[m["month"] - 1]}</th>'
            f'<td class="num heat" style="background:{fill};color:{hc.text_colour(fill)}">{tmax}</td>'
            f'<td class="num">{round(float(m["t_daily_min"]))}</td>'
            f'<td class="num">{float(m["rain_mm_day"]):.1f}</td></tr>')
    light = sun_times.monthly(year, site['lat'], site['lon'])
    hm = lambda t: t.strftime('%H:%M')  # noqa: E731
    lrows = ''.join(
        f'<tr><th scope="row">{MONTHS_SHORT[d.date.month - 1]}</th><td class="num">{hm(d.sunrise)}</td>'
        f'<td class="num">{hm(d.golden_morning_end)}</td><td class="num">{hm(d.golden_evening_start)}</td>'
        f'<td class="num">{hm(d.sunset)}</td></tr>' for d in light)
    comfy = comfort_months(maxes)
    hottest = MONTHS[maxes.index(max(maxes))]
    facts = [f'{site.get("gov", "")} governorate', f'{site["lat"]:.4f}, {site["lon"]:.4f}']
    if elevation is not None:
        facts.append(f'{elevation:,.0f} m above sea level')
    if site.get('unesco'):
        facts.append('UNESCO World Heritage')
    comfort = (f'Afternoons under {hc.COMFORT_BELOW} °C: <strong>{", ".join(comfy)}</strong>.' if comfy
               else f'No month averages an afternoon under {hc.COMFORT_BELOW} °C.')
    return f"""<section class="sheet site">
<h2>{esc(site['name'])} <span lang="ar" dir="rtl">{esc(site.get('name_ar', ''))}</span></h2>
<p class="facts">{' · '.join(esc(f) for f in facts)}</p>
<p>{comfort} Hottest: <strong>{hottest}</strong>, averaging {max(maxes)} °C in the afternoon.</p>
<div class="two">
<table class="clim"><caption>Heat and rain, monthly normals</caption>
<thead><tr><th>Month</th><th class="num">Afternoon °C</th><th class="num">Night °C</th><th class="num">Rain mm/day</th></tr></thead>
<tbody>{''.join(rows)}</tbody></table>
<table class="clim"><caption>Light on the 15th, {year}</caption>
<thead><tr><th></th><th class="num">Sunrise</th><th class="num">Golden until</th><th class="num">Golden from</th><th class="num">Sunset</th></tr></thead>
<tbody>{lrows}</tbody></table>
</div>
<p class="foot">Heat: mean daily maximum and minimum, NASA POWER 2001–2020 normals at these coordinates. Light: NOAA solar equations, Egypt time from the IANA database; golden light is the sun under 6° above the horizon. Cliffs and walls can hide a low sun earlier.</p>
</section>"""


# ---------------------------------------------------------------- holidays
def holiday_sheet(cal: dict) -> str:
    rows = hol.holidays(cal)
    if not rows:
        raise ValueError('calendar.json has no holidays')
    lis = ''.join(f'<li>{s}</li>' for s in hol.findings(rows))
    return (f'<section class="sheet"><h2>Public holidays, {hol.year_of(rows)}</h2>'
            f'<ul class="find">{lis}</ul>{hol.table_html(rows)}'
            f'<p class="foot">{esc(cal.get("note", ""))} Read {esc(cal.get("as_of", ""))}.</p></section>')


# ---------------------------------------------------------------- document
CSS = """
@page { size: A4; margin: 13mm 12mm; }
* { box-sizing: border-box; }
body { font: 10.5pt/1.4 Georgia, 'Times New Roman', serif; color: #1B1B18; margin: 0; }
[lang=ar] { font-family: 'Segoe UI', Tahoma, 'Noto Naskh Arabic', Arial, sans-serif; }
h1 { font-size: 26pt; margin: 0 0 6pt; }
h2 { font-size: 16pt; margin: 0 0 4pt; border-bottom: 1.5pt solid #C9A227; padding-bottom: 3pt; }
h2 span, h3 span { font-weight: normal; margin-left: 8pt; }
h3 { font-size: 11.5pt; margin: 10pt 0 4pt; }
.sheet { page-break-after: always; break-after: page; }
.sheet:last-child { page-break-after: auto; break-after: auto; }
.cover { padding-top: 40mm; }
.lead { font-size: 11pt; }
.facts, .foot, .fp-src, .fp-unit, .fp-note, .fp-conv { color: #55524A; font-size: 8.5pt; }
.foot { margin-top: 8pt; }
table { border-collapse: collapse; width: 100%; font-size: 9pt; }
caption { text-align: left; font-weight: bold; padding: 2pt 0; }
th, td { border-bottom: 0.5pt solid #D8D2C2; padding: 2.5pt 4pt; text-align: left; vertical-align: top; }
.num { text-align: right; font-variant-numeric: tabular-nums; }
.heat { font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.two { display: flex; gap: 10pt; }
.two > table { flex: 1; }
.ar { text-align: right; }
.fp { table-layout: fixed; font-size: 8pt; }
.fp th:nth-child(1) { width: 47%; } .fp th:nth-child(2) { width: 19%; } .fp th:nth-child(3) { width: 34%; }
.fp td { padding: 3pt 4pt; }
.fp tr { break-inside: avoid; }
.card h3 { margin: 6pt 0 2pt; }
.card .lead { font-size: 9.5pt; margin: 0 0 4pt; }
.fp-notes { font-size: 7pt; color: #3A372F; padding-left: 14pt; margin: 2pt 0 0; }
.fp-notes li { margin-bottom: 1.5pt; }
.fp-conflict { color: #8A3A12; font-size: 8.5pt; }
.hol-table { font-size: 8.5pt; }
.hol-exp { color: #8A6D0B; font-weight: bold; }
.hol-note { color: #55524A; font-size: 8pt; }
.find { padding-left: 14pt; }
a { color: inherit; }
"""


def cover(edition: str, year: int, n_sites: int, sources: list[str]) -> str:
    lis = ''.join(f'<li>{esc(s)}</li>' for s in sources)
    return f"""<section class="sheet cover">
<p class="facts">egybi.com · edition of {esc(edition)}</p>
<h1>{TITLE}</h1>
<p class="lead">Every measured site, the prices to expect and the holidays to plan around, for trips in {year}. Printed from the same cited data as egybi.com, gathered into one set that works offline.</p>
<h3>Inside</h3>
<ol><li>{n_sites} site sheets: twelve months of heat and rain, elevation, and the light on the 15th of each month.</li>
<li>The fair-price pocket card, in English and Arabic.</li>
<li>The public-holiday calendar, with the lunar dates marked as expected.</li></ol>
<h3>Where every figure comes from</h3>
<ul>{lis}</ul>
<p class="foot">Normals describe a typical year, not a forecast. Prices are ranges reported by named sources and move with the pound. Islamic holiday dates are forecasts until the official moon sighting. Check anything a trip depends on.</p>
</section>"""


def build(year: int, edition: str) -> str:
    clim, terrain = load('visit-climate.json'), load('visit-terrain.json')
    fp, fx, cal = load('fair-prices.json'), load('fx-today.json'), load('calendar.json')
    elev = {t['key']: t.get('elevation_m') for t in terrain.get('sites', [])}
    sites = sorted(clim.get('sites', []), key=lambda s: -float(s['lat']))   # north to south, as on the site
    sources = [
        f"Heat and rain: {clim.get('source', 'NASA POWER')}, read {clim.get('as_of', '')}.",
        f"Elevation: {terrain.get('source', '')}, read {terrain.get('as_of', '')}.",
        'Light: NOAA Global Monitoring Laboratory solar equations; Egypt time from the IANA time-zone database.',
        f"Fair prices: {fp.get('source', '')}. Each row names its own source.",
        f"Exchange rate: {fx.get('source', {}).get('name_en', '')}, {fx.get('as_of', '')}.",
        f"Holidays: {cal.get('source', '') if isinstance(cal.get('source'), str) else 'calendar.json'}, read {cal.get('as_of', '')}. Each row names its own source.",
    ]
    body = (cover(edition, year, len(sites), sources)
            + ''.join(site_sheet(s, elev.get(s['key']), year) for s in sites)
            + fair_card(fp, fx) + holiday_sheet(cal))
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8">'
            f'<title>{TITLE} · {year}</title><style>{CSS}</style></head><body>{body}</body></html>\n')


# ---------------------------------------------------------------- PDF
BROWSERS = [
    os.environ.get('EGYBI_BROWSER', ''),
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'google-chrome', 'chromium', 'chromium-browser', 'msedge',
]


def find_browser() -> Optional[str]:
    for b in BROWSERS:
        if b and (os.path.isfile(b) or shutil.which(b)):
            return b if os.path.isfile(b) else shutil.which(b)
    return None


def print_pdf(html_path: Path, pdf_path: Path) -> None:
    browser = find_browser()
    if not browser:
        raise SystemExit('no Edge or Chrome found; set EGYBI_BROWSER to one, or print the HTML from a browser')
    if pdf_path.exists():
        pdf_path.unlink()
    subprocess.run([browser, '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
                    '--print-to-pdf-no-header', f'--print-to-pdf={pdf_path}', html_path.resolve().as_uri()],
                   check=True, timeout=180, capture_output=True)
    if not pdf_path.exists() or pdf_path.stat().st_size < 10_000:
        raise SystemExit(f'the browser ran but wrote no usable PDF at {pdf_path}')


def main(argv: Optional[list[str]] = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding='utf-8', errors='replace')
        except (AttributeError, ValueError, OSError):
            pass
    cal_to = load('calendar.json').get('window', {}).get('to', '')
    default_year = int(cal_to[:4]) if cal_to[:4].isdigit() else dt.date.today().year
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--year', type=int, default=default_year,
                    help=f'year for the light tables (default {default_year}, the calendar\'s last year)')
    ap.add_argument('--pdf', action='store_true', help='also print a PDF with local headless Edge/Chrome')
    a = ap.parse_args(argv)
    html = build(a.year, dt.date.today().isoformat())
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / OUT_HTML
    write_text(str(out), html)
    print(f'pack HTML : {out} ({len(html):,} chars, {html.count(chr(60) + "section")} sheets)')
    if a.pdf:
        pdf = OUT_DIR / OUT_PDF
        print_pdf(out, pdf)
        print(f'pack PDF  : {pdf} ({pdf.stat().st_size:,} bytes)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
