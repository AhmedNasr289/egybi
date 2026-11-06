"""egypt-public-holidays.html and charts/egypt-public-holidays.svg.

WHY
---
"Egypt public holidays 2027" and "Ramadan 2027 Egypt" are questions a
traveller asks before booking, and the site already holds a hand-compiled,
row-by-row cited calendar (site/data/calendar.json) that only the planner
and the home page read, inside JavaScript. This writes it out as a page a
search engine can read, and as a chart other sites can embed.

RULES THE PAGE KEEPS (the calendar's own)
-----------------------------------------
* Fixed-date holidays are stated as days. Every Islamic date is a forecast
  until the official moon sighting, so it is shown as a range and marked
  "expected" - never as a firm day.
* Every row links its own source.
* Nothing is said that the data does not hold: no opening hours, no claim
  about which sites close, no guess at a holiday being moved to a Thursday.
  Weekdays are computed from the dates, and only for fixed dates.

The page URL carries no year; the title and heading carry the year the data
covers, so the URL stays put when the calendar is re-read for the next year.
"""
import datetime as _dt
import json
import os

from . import egfmt
from .common import SITE, SITE_URL, breadcrumb, chrome, esc, page, read_text, write_text

PAGE = 'egypt-public-holidays.html'
CHART = 'charts/egypt-public-holidays.svg'
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
          'August', 'September', 'October', 'November', 'December']
WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
WEEKEND = {4, 5}                      # Friday, Saturday: Egypt's weekend
FIXED_FILL, EXPECTED_FILL, INK = '#2C6FAD', '#C9A227', '#1B1B18'
CREDIT_MAX_CHARS = 110                # same measured bound as heat_calendar
# Rows in the calendar that are PERIODS, not days off. Ramadan is a month of
# fasting: the calendar carries it because it changes what a trip is like, but
# counting it as a public holiday would overstate the holidays by one and mark
# February and March as holiday months on its account.
PERIODS = {'ramadan'}


def _d(s):
    return _dt.date.fromisoformat(s) if s else None


def load_calendar():
    return json.loads(read_text(os.path.join(SITE, 'data', 'calendar.json')))


def holidays(cal):
    """The calendar's events, oldest first, with dates parsed. Rows missing a
    start date are dropped rather than guessed."""
    out = []
    for e in cal.get('events', []):
        start = _d(e.get('start'))
        if start is None:
            continue
        row = dict(e)
        row['start_d'] = start
        row['start_latest_d'] = _d(e.get('start_latest'))
        row['end_d'] = _d(e.get('end')) or start
        row['end_latest_d'] = _d(e.get('end_latest'))
        row['expected'] = e.get('status') != 'fixed'
        row['period'] = e.get('key') in PERIODS
        out.append(row)
    return sorted(out, key=lambda r: r['start_d'])


def _day(d):
    return f'{d.day} {MONTHS[d.month - 1]}'


def _either(a, b):
    """'8 or 9 February' for one month, '31 March or 1 April' across two."""
    if not b or b == a:
        return _day(a)
    if a.month == b.month:
        return f'{a.day} or {b.day} {MONTHS[a.month - 1]}'
    return f'{_day(a)} or {_day(b)}'


def when(r):
    """The date phrase for one holiday: a day for a fixed date, a range for
    anything expected. Plain text."""
    first = _either(r['start_d'], r['start_latest_d'])
    last = _either(r['end_d'], r['end_latest_d'])
    single = r['end_d'] == r['start_d'] and not r['start_latest_d'] and not r['end_latest_d']
    return first if single else f'{first} to {last}'


def weekday(r):
    """The weekday of a one-day fixed holiday, else None: an expected date has
    no single weekday to give."""
    if r['expected'] or r['end_d'] != r['start_d']:
        return None
    return WEEKDAYS[r['start_d'].weekday()]


def year_of(rows):
    years = sorted({r['start_d'].year for r in rows})
    return years[0] if len(years) == 1 else f'{years[0]}–{years[-1]}'


def findings(rows):
    """Sentences computed from the rows. HTML-safe."""
    days_off = [r for r in rows if not r['period']]
    if not days_off:
        return []
    fixed = [r for r in days_off if not r['expected']]
    expected = [r for r in days_off if r['expected']]
    out = [f"<strong>{len(days_off)}</strong> public holidays: <strong>{len(fixed)}</strong> on fixed dates "
           f"and <strong>{len(expected)}</strong> that follow the Islamic calendar. Those {len(expected)} "
           "are forecasts until the official moon sighting, so each is shown as a range."]
    ramadan = next((r for r in rows if r.get('key') == 'ramadan'), None)
    if ramadan:
        out.append(f"Ramadan, the month of fasting, is expected from <strong>{esc(when(ramadan))}</strong>. "
                   "It is not a public holiday itself; Eid al-Fitr at its end is.")
    on_weekend = [r for r in fixed if weekday(r) and r['start_d'].weekday() in WEEKEND]
    if fixed:
        if on_weekend:
            names = ', '.join(f"{esc(r['name'])} ({weekday(r)})" for r in on_weekend)
            out.append(f"{len(on_weekend)} of the {len(fixed)} fixed dates fall on a Friday or Saturday, "
                       f"Egypt's weekend: {names}.")
        else:
            out.append(f"None of the {len(fixed)} fixed dates falls on a Friday or Saturday, Egypt's weekend.")
    busy = {m for r in days_off for m in range(r['start_d'].month,
                                                (r['end_latest_d'] or r['end_d']).month + 1)}
    quiet = [MONTHS[m - 1] for m in range(1, 13) if m not in busy]
    if quiet:
        out.append('Months with no public holiday: ' + ', '.join(quiet) + '.')
    return out


def table_html(rows):
    body = []
    for r in rows:
        wd = weekday(r)
        status = ('<span class="hol-exp">expected</span>' if r['expected'] else 'fixed')
        if r['period']:
            status += '<br><span class="hol-note">a month of fasting, not a day off</span>'
        src = (f'<a href="{esc(r["source_url"])}" rel="noopener">{esc(r.get("source", "source"))}</a>'
               if r.get('source_url') else esc(r.get('source', '')))
        note = f'<br><span class="hol-note">{esc(r["note"])}</span>' if r.get('note') else ''
        body.append(
            f'<tr><th scope="row">{esc(r["name"])}'
            + (f' <span lang="ar" dir="rtl" class="hol-ar">{esc(r["name_ar"])}</span>' if r.get('name_ar') else '')
            + f'</th><td>{esc(when(r))}{" · " + wd if wd else ""}{note}</td><td>{status}</td><td>{src}</td></tr>')
    return ('<div class="hol-wrap"><table class="hol-table">'
            '<caption>Egypt\'s public holidays, oldest first. Expected dates are ranges until confirmed.</caption>'
            '<thead><tr><th scope="col">Holiday</th><th scope="col">Date</th>'
            '<th scope="col">Status</th><th scope="col">Source</th></tr></thead>'
            f'<tbody>{"".join(body)}</tbody></table></div>')


def svg_chart(rows, title, credit_lines):
    """One row per holiday on a January-December axis: a bar from the earliest
    possible start to the latest possible end, gold when expected. An image,
    for the same reason as the weather chart: no framing exception needed."""
    for line in credit_lines:
        if len(line) > CREDIT_MAX_CHARS:
            raise ValueError(f'credit line of {len(line)} chars exceeds {CREDIT_MAX_CHARS}: {line!r}')
    year = rows[0]['start_d'].year
    jan1 = _dt.date(year, 1, 1)
    days = (_dt.date(year, 12, 31) - jan1).days + 1
    pad, label_w, top, row_h, line_h = 16, 250, 84, 26, 16
    axis_w = 846 - 2 * pad - label_w
    width = 846
    bottom = top + len(rows) * row_h
    height = bottom + 48 + line_h * len(credit_lines)
    x0 = pad + label_w

    def x(d):
        return x0 + axis_w * ((d - jan1).days / days)

    font = "font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif"
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
           f'viewBox="0 0 {width} {height}" role="img" aria-label="{esc(title)}">',
           f'<title>{esc(title)}</title>',
           f'<rect width="{width}" height="{height}" fill="#F6EEDC"/>',
           f'<g style="{font}" fill="{INK}">',
           f'<text x="{pad}" y="30" font-size="19" font-weight="700">{esc(title)}</text>',
           f'<text x="{pad}" y="50" font-size="12.5">Blue: fixed date. Gold: expected, a forecast until the '
           f'moon sighting, drawn across its whole possible range.</text>']
    for m in range(12):
        mx = x(_dt.date(year, m + 1, 1))
        out.append(f'<line x1="{mx:.1f}" y1="{top - 14}" x2="{mx:.1f}" y2="{bottom}" stroke="#D9CDB2" stroke-width="1"/>'
                   f'<text x="{mx + 3:.1f}" y="{top - 18}" font-size="11.5" font-weight="600">{MONTHS[m][:3]}</text>')
    for i, r in enumerate(rows):
        y = top + i * row_h
        a = r['start_d']
        b = r['end_latest_d'] or r['end_d']
        x1, x2 = x(a), x(b + _dt.timedelta(days=1))
        fill = EXPECTED_FILL if r['expected'] else FIXED_FILL
        out.append(f'<text x="{x0 - 10}" y="{y + 16}" font-size="12.5" font-weight="600" '
                   f'text-anchor="end">{esc(r["name"])}</text>'
                   f'<rect x="{x1:.1f}" y="{y + 5}" width="{max(x2 - x1, 4):.1f}" height="15" rx="3" fill="{fill}"/>')
    for k, line in enumerate(credit_lines):
        out.append(f'<text x="{pad}" y="{bottom + 30 + k * line_h}" font-size="11.5">{esc(line)}</text>')
    out.append('</g></svg>')
    return '\n'.join(out) + '\n'


CSS = """
.hol-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.hol-table{border-collapse:collapse;width:100%;min-width:620px}
.hol-table caption{caption-side:bottom;text-align:left;font-size:.82rem;padding-top:8px;opacity:.85}
.hol-table th,.hol-table td{text-align:left;vertical-align:top;padding:10px 8px;border-bottom:1px solid rgba(41,36,32,.15);font-size:.92rem}
.hol-table thead th{font-size:.8rem;text-transform:uppercase;letter-spacing:.04em}
.hol-ar{font-weight:500;margin-left:6px}
.hol-note{font-size:.82rem;opacity:.85}
.hol-exp{display:inline-block;padding:2px 8px;border-radius:999px;background:#C9A227;color:#1B1B18;font-size:.78rem;font-weight:700}
.hc-code{white-space:pre-wrap;word-break:break-all;user-select:all;font:500 .82rem/1.5 ui-monospace,Consolas,monospace;background:var(--papyrus);border:1px solid rgba(41,36,32,.25);border-radius:8px;padding:12px 14px;margin:10px 0 0}
"""


def build_holidays_page():
    """Write the page and the chart. Returns sitemap entries ([] if the calendar
    is missing or empty, so a broken data file never publishes an empty page)."""
    path = os.path.join(SITE, 'data', 'calendar.json')
    if not os.path.isfile(path):
        return []
    cal = load_calendar()
    rows = holidays(cal)
    if not rows:
        return []
    year = year_of(rows)
    url = f'{SITE_URL}/{PAGE}'
    chart_url = f'{SITE_URL}/{CHART}'
    title = f'Egypt public holidays {year}, with Ramadan and Eid dates · EgyBI'
    n_days_off = sum(1 for r in rows if not r['period'])
    desc = (f'All {n_days_off} public holidays in Egypt for {year}, and Ramadan: fixed dates as days, the '
            'Islamic ones as expected ranges until the moon sighting, each with its source.')
    alt = f'Egypt public holidays {year} on a January to December timeline (EgyBI)'
    snippet = (f'<a href="{url}"><img src="{chart_url}" alt="{alt}" width="846" '
               'style="max-width:100%;height:auto" loading="lazy"></a>')
    facts = ''.join(f'<p style="margin:0 0 10px;">{x}</p>' for x in findings(rows))
    source_line = (f"Compiled by hand from the source named on each row; read {egfmt.time_tag(cal['as_of'], 'en', 'prose') if cal.get('as_of') else 'undated'}. "
                   "Islamic dates are forecasts from astronomical calculation, confirmed only by the official "
                   "moon sighting.")
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "name": f"Egypt public holidays {year}", "url": url, "description": desc,
         "isPartOf": {"@id": SITE_URL + "/#site"}},
        breadcrumb(f"Public holidays {year}", url, "When to go", SITE_URL + "/visit.html")]}
    body = f"""
<section class="surface-hero" style="padding-top:64px;padding-bottom:44px;">
  <div class="wrap" style="max-width:960px;">
    <p class="hero-eyebrow"><span data-glyph="ra"></span> <a href="visit.html">When to go</a> &middot; {esc(year)} &middot; sourced, row by row</p>
    <h1 style="font-size:clamp(1.6rem,5vw,2.6rem);margin:0 0 12px;">Egypt&rsquo;s public holidays in {esc(year)}.</h1>
    <p class="lead" style="margin:0;max-width:68ch;">Every public holiday, with Ramadan and the two Eids. Fixed dates
    are given as days; the Islamic ones move every year and are given as the range they can fall in, until the
    moon is sighted.</p>
  </div>
</section>

<section class="surface-light" id="holidays" data-nav="The holidays">
  <div class="wrap" style="max-width:960px;">
    <div class="sheet">
      <span class="seal" aria-hidden="true"><span data-glyph="ankh"></span></span>
      {facts}
    </div>
    <div class="sheet" style="margin-top:18px;">
      {table_html(rows)}
    </div>
    <p class="chart-cap" style="margin-top:14px;">{source_line} This page says nothing about which sites or
    shops close on a given day: the calendar does not record it.</p>
    <div class="cta-row" style="margin-top:18px;"><a class="btn btn-primary" href="plan.html">See which fall inside your dates &rarr;</a>
    <a class="btn btn-ghost" href="egypt-weather-by-month.html">The heat, month by month &rarr;</a></div>
  </div>
</section>

<section class="surface-light-2" id="embed" data-nav="Use this chart">
  <div class="wrap" style="max-width:960px;">
    <div class="kicker"><span data-glyph="scroll"></span>Free to use</div>
    <h2>Put this calendar on your own site.</h2>
    <p class="lead" style="max-width:68ch;">An image that links back here. When the calendar is re-read, copies on
    other sites follow within a week. Please keep the credit line inside the image.</p>
    <pre class="hc-code"><code>{esc(snippet)}</code></pre>
    <p class="chart-cap" style="margin-top:12px;">Or <a href="{CHART}">open the chart on its own</a> to save it.</p>
  </div>
</section>
"""
    nav, foot = chrome('')
    write_text(os.path.join(SITE, PAGE),
               page(title, desc, url, body, ld, extra_head=f'<style>{CSS}</style>', prefix='',
                    nav=nav, foot=foot, og_image=f"{SITE_URL}/og-visit.png?v=3"))
    credit = (f"Sources named row by row on egybi.com/{PAGE}; calendar read {egfmt.date(cal['as_of'], 'en') if cal.get('as_of') else 'undated'}.",
              "Islamic dates are expected until the moon sighting.")
    os.makedirs(os.path.join(SITE, 'charts'), exist_ok=True)
    write_text(os.path.join(SITE, CHART),
               svg_chart(rows, f"Egypt's public holidays in {year}", credit))
    return [(url, '0.9')]
