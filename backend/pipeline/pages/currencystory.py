"""egyptian-pound-since-july.html and its two charts: the fourth data story.

WHAT IT MEASURES
----------------
fetch_fx.py has kept, every day since 21 July 2026, how many Egyptian pounds
one unit of ten currencies buys (market reference rates from ExchangeRate-API,
not the Central Bank's fixing; the page says so). The page asks what a
visitor's money buys now against the start, currency by currency.

HOW, AND WHAT IT REFUSES TO SAY
-------------------------------
* Same method as the food story: whole weeks counted back from the last day,
  the median of each week, first week against last week. One day against
  another would let a single day set the headline.
* "Moves with the dollar" is MEASURED, not assumed: a currency whose dollar
  price varied by less than PEG_SPREAD across the window is grouped with the
  dollar (the Saudi riyal, UAE dirham and Qatari riyal, measured 2026-11-07:
  0.82% each, against 1.9% for the yuan and 2.4% for the Kuwaiti dinar). It
  stops readers counting one move several times.
* A weekly move that every currency shares is a move of the POUND; the page
  says so only when the measured spread across currencies is small.
* No forecast, no advice on where to change money: nothing here can source it.
"""
import datetime as _dt
import json
import os
import statistics

from . import egfmt, storychart
from .common import SITE, SITE_URL, breadcrumb, chrome, esc, page, read_text, write_text
from .storychart import CHART_COLOURS, NARROW_W

PAGE = 'egyptian-pound-since-july.html'
CHART = 'charts/egyptian-pound.svg'
CHART_NARROW = 'charts/egyptian-pound-narrow.svg'
MINUS = chr(0x2212)
# A currency whose price in dollars moved less than this across the window is
# treated as moving with the dollar.
PEG_SPREAD = 0.01
# The chart's lines, in this order; the first carries the dollar's pegs too.
CHARTED = ['USD', 'EUR', 'GBP', 'TRY']
NAMES = {'USD': 'US dollar', 'EUR': 'Euro', 'GBP': 'Pound sterling', 'SAR': 'Saudi riyal',
         'AED': 'UAE dirham', 'KWD': 'Kuwaiti dinar', 'QAR': 'Qatari riyal', 'CAD': 'Canadian dollar',
         'CNY': 'Chinese yuan', 'TRY': 'Turkish lira'}
SOURCE_URL = 'https://www.exchangerate-api.com'
# Line labels on the phone chart, which has room for 16 characters.
SHORT = {'Dollar & Gulf': '$ & Gulf', 'US dollar': 'US dollar', 'Pound sterling': 'Sterling', 'Turkish lira': 'Lira'}
# The same currencies as they read inside a sentence.
PROSE = {'USD': 'the US dollar', 'EUR': 'the euro', 'GBP': 'sterling', 'SAR': 'the Saudi riyal',
         'AED': 'the UAE dirham', 'KWD': 'the Kuwaiti dinar', 'QAR': 'the Qatari riyal',
         'CAD': 'the Canadian dollar', 'CNY': 'the Chinese yuan', 'TRY': 'the Turkish lira'}


def _d(s):
    return _dt.date.fromisoformat(s)


def load():
    return json.loads(read_text(os.path.join(SITE, 'data', 'fx-history.json')))


def currency_weeks(series):
    """{code: {'weekly': {block: median}, 'first', 'last', 'change'}} over whole
    weeks counted back from the last day, plus (d0, d1, n_blocks). A currency
    missing the first or the last week is left out."""
    dates = sorted({p['as_of'] for pts in series.values() for p in pts})
    window = storychart.whole_weeks(dates)
    if not window:
        return {}, None, None, 0
    d0, d1, n = window
    out = {}
    for code, pts in series.items():
        blocks = {}
        for p in pts:
            d = _d(p['as_of'])
            if p.get('egp') and d0 <= d <= d1:
                blocks.setdefault(storychart.block_of(d, d0), []).append(p['egp'])
        if 0 not in blocks or n - 1 not in blocks:
            continue
        weekly = {k: statistics.median(v) for k, v in blocks.items()}
        out[code] = {'weekly': weekly, 'first': weekly[0], 'last': weekly[n - 1],
                     'change': weekly[n - 1] / weekly[0] - 1}
    return out, d0, d1, n


def dollar_spread(series, code):
    """How far a currency's price in dollars moved across the window, as
    max/min - 1 over the days both were published. None without overlap."""
    usd = {p['as_of']: p['egp'] for p in series.get('USD', []) if p.get('egp')}
    cross = [p['egp'] / usd[p['as_of']] for p in series.get(code, []) if p.get('egp') and p['as_of'] in usd]
    return max(cross) / min(cross) - 1 if len(cross) > 1 else None


def pegged(series, codes):
    """The currencies, other than the dollar, that move with it."""
    out = []
    for c in codes:
        if c == 'USD':
            continue
        s = dollar_spread(series, c)
        if s is not None and s < PEG_SPREAD:
            out.append(c)
    return out


def index_line(weeks, code, d0, d1):
    """[(date, index)]: the currency's weekly median over its first week x 100,
    each placed mid-week (the last one three days before the window's last day,
    because it stands for that whole week). Its last value equals the table's
    change exactly, by construction."""
    w = weeks[code]
    return [(min(d0 + _dt.timedelta(days=7 * k + 3), d1), 100 * w['weekly'][k] / w['first'])
            for k in sorted(w['weekly'])]


def shared_week(weeks, n):
    """The week with the largest median move across currencies, and the range
    of the currencies' moves that week: (block, median, lo, hi)."""
    best = None
    for k in range(1, n):
        moves = [w['weekly'][k] / w['weekly'][k - 1] - 1 for w in weeks.values()
                 if k in w['weekly'] and k - 1 in w['weekly']]
        if len(moves) < 3:
            continue
        m = statistics.median(moves)
        if best is None or abs(m) > abs(best[1]):
            best = (k, m, min(moves), max(moves))
    return best


def _pct_signed(x):
    """+8.0% / −2.2% for prose; U+2212 is the width of the plus."""
    v = egfmt.fixed(abs(x) * 100, 'en', 1)
    return ('+' if x > 0 else MINUS if x < 0 else '') + v + '%'


def _each(figures):
    """'+8.4% each' when every figure reads the same, else the list."""
    return f'{figures[0]} each' if len(set(figures)) == 1 and len(figures) > 1 else _list(figures)


def _list(names):
    return names[0] if len(names) == 1 else ', '.join(names[:-1]) + ' and ' + names[-1]


def findings(weeks, pegs, d0, d1, n, series):
    usd = weeks['USD']
    out = [f"From the first week (from {egfmt.date(d0, 'en', 'prose')}) to the last (to "
           f"{egfmt.date(d1, 'en', 'prose')}), one US dollar went from {egfmt.rate(usd['first'], 'en')} to "
           f"{egfmt.rate(usd['last'], 'en')}: <strong>{_pct_signed(usd['change'])}</strong>. Put the other way, "
           f"the pound lost <strong>{egfmt.fixed((1 - 1 / (1 + usd['change'])) * 100, 'en', 1)}%</strong> of its "
           f"dollar value. 100 dollars bought {egfmt.money(100 * usd['first'], 'en')} then and "
           f"{egfmt.money(100 * usd['last'], 'en')} now."]
    if pegs:
        spreads = [dollar_spread(series, c) for c in pegs]
        out.append(f"{_list([PROSE[c] for c in pegs])[0].upper()}{_list([PROSE[c] for c in pegs])[1:]} moved by the same amount "
                   f"({_each([_pct_signed(weeks[c]['change']) for c in pegs])}). Their price in dollars varied by "
                   f"at most {egfmt.fixed(max(spreads) * 100, 'en', 1)}% over these weeks, because they are held to "
                   "the dollar, so for a visitor from the Gulf it is the same move, not a second one.")
    others = sorted((c for c in weeks if c != 'USD' and c not in pegs), key=lambda c: -weeks[c]['change'])
    out.append("The others differ by their own move against the dollar: "
               + '; '.join(f"{PROSE.get(c, c)} {_pct_signed(weeks[c]['change'])}" for c in others) + '.')
    low_k = min(usd['weekly'], key=lambda k: usd['weekly'][k])
    low = usd['weekly'][low_k] / usd['first'] - 1
    if low_k and low < -0.005:
        end = d0 + _dt.timedelta(days=7 * low_k + 6)
        out.append(f"It was not one-way. In the week to {egfmt.date(end, 'en', 'prose')} the dollar bought "
                   f"{egfmt.fixed(-low * 100, 'en', 1)}% fewer pounds than in the first week ({egfmt.rate(usd['weekly'][low_k], 'en')}): "
                   "the pound strengthened before it fell.")
    sw = shared_week(weeks, n)
    if sw and sw[3] - sw[2] < 0.03:
        k, m, lo, hi = sw
        end = d0 + _dt.timedelta(days=7 * k + 6)
        out.append(f"The largest weekly move came in the week to {egfmt.date(end, 'en', 'prose')}: every currency "
                   f"moved {_pct_signed(lo)} to {_pct_signed(hi)} against the pound in the same week, so that was a "
                   "move of the pound itself.")
    return out


def table_html(weeks, pegs):
    """Change sits next to the name and the unit lives in the headers: with
    "EGP" in every cell and Change last, a 390 px phone showed three columns
    and hid Change past the edge (CI screenshot, 2026-11-07)."""
    rows = []
    for c in sorted(weeks, key=lambda c: -weeks[c]['change']):
        w = weeks[c]
        note = ' <span class="cur-note">moves with the dollar</span>' if c in pegs else ''
        rows.append(f'<tr><th scope="row">{esc(NAMES.get(c, c))} <span class="cur-code">{esc(c)}</span>{note}</th>'
                    f'<td class="num cur-chg">{esc(_pct_signed(w["change"]))}</td>'
                    f'<td class="num">{egfmt.fixed(w["first"], "en", 2)}</td><td class="num">{egfmt.fixed(w["last"], "en", 2)}</td></tr>')
    return ('<div class="cur-wrap"><table class="cur-table"><caption>Pounds for one unit of each currency, '
            'median of the first and of the last week. A rise means the currency buys more pounds.</caption>'
            '<thead><tr><th scope="col">Currency</th><th scope="col" class="num">Change</th>'
            '<th scope="col" class="num">First week, EGP</th><th scope="col" class="num">Last week, EGP</th></tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table></div>')


CSS = """
.cur-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.cur-table{border-collapse:collapse;width:100%}
.cur-table caption{caption-side:bottom;text-align:left;font-size:.82rem;padding-top:8px;opacity:.85}
.cur-table th,.cur-table td{text-align:left;padding:9px 8px;border-bottom:1px solid rgba(41,36,32,.15);font-size:.92rem}
.cur-table .num{text-align:right;font-variant-numeric:tabular-nums}
.cur-table td.num{white-space:nowrap}
.cur-table .cur-chg{font-weight:700}
@media (max-width:600px){.cur-table th,.cur-table td{padding:8px 5px;font-size:.86rem}}
.cur-code{font-size:.78rem;color:var(--ink-soft);font-weight:500}
.cur-note{display:block;font-size:.78rem;color:var(--ink-soft);font-weight:400}
.cur-chart{display:block;width:100%;height:auto;border-radius:10px}
@media (max-width:600px){.cur-chart-sheet{padding:8px}}
.hc-code{white-space:pre-wrap;word-break:break-all;user-select:all;font:500 .82rem/1.5 ui-monospace,Consolas,monospace;background:var(--papyrus);border:1px solid rgba(41,36,32,.25);border-radius:8px;padding:12px 14px;margin:10px 0 0}
"""


def build_currency_page():
    """Write the page and both charts; [] (nothing published) if the data is too thin."""
    try:
        series = load().get('series') or {}
    except (OSError, ValueError):
        return []
    weeks, d0, d1, n = currency_weeks(series)
    if 'USD' not in weeks or len(weeks) < 5:
        return []
    pegs = pegged(series, weeks)
    names = {c: NAMES.get(c, c) for c in CHARTED}
    if pegs:
        names['USD'] = 'Dollar & Gulf'
    lines = [(names[c], CHART_COLOURS[i], index_line(weeks, c, d0, d1))
             for i, c in enumerate(c for c in CHARTED if c in weeks)]
    url, chart_url = f'{SITE_URL}/{PAGE}', f'{SITE_URL}/{CHART}'
    title = "The Egyptian pound since July: what your money buys · EgyBI"
    desc = (f"How many pounds the dollar, euro, sterling, Gulf and other currencies bought from "
            f"{egfmt.date(d0, 'en', 'compact')} to {egfmt.date(d1, 'en', 'compact')}, measured week by week.")
    chart_title = "What your money buys in Egypt since July"
    subtitle = 'Pounds for one unit, weekly median, first week = 100'
    chart_desc = 'Pounds per unit of each currency as an index, 100 = first week'
    credit = (f"egybi.com/{PAGE} · ExchangeRate-API market reference rates.",
              "Weekly median, first week = 100. Not the Central Bank fixing; not a forecast.")
    wide_svg = storychart.wide(lines, d0, d1, chart_title, subtitle, chart_desc, credit)
    narrow_svg = storychart.narrow(lines, d0, d1, chart_title, ('Pounds for one unit, weekly median,', 'first week = 100'),
                                   chart_desc, credit, short=SHORT)
    narrow_h = int(narrow_svg.split('height="', 1)[1].split('"', 1)[0])
    alt = f"{chart_title}: pounds per unit of the dollar, euro, sterling and lira as an index (EgyBI)"
    snippet = (f'<a href="{url}"><img src="{chart_url}" alt="{alt}" width="846" '
               'style="max-width:100%;height:auto" loading="lazy"></a>')
    facts = ''.join(f'<p style="margin:0 0 10px;">{x}</p>' for x in findings(weeks, pegs, d0, d1, n, series))
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "name": "The Egyptian pound since July: what your money buys", "url": url,
         "description": desc, "isPartOf": {"@id": SITE_URL + "/#site"}},
        breadcrumb("The pound since July", url, "Daily prices", SITE_URL + "/prices.html")]}
    body = f"""
<section class="surface-hero" style="padding-top:64px;padding-bottom:44px;">
  <div class="wrap" style="max-width:960px;">
    <p class="hero-eyebrow"><span data-glyph="ra"></span> <a href="prices.html">Daily prices</a> &middot; {egfmt.time_tag(d0, 'en', 'compact')} to {egfmt.time_tag(d1, 'en', 'compact')} &middot; measured, not a forecast</p>
    <h1 style="font-size:clamp(1.6rem,5vw,2.6rem);margin:0 0 12px;">The Egyptian pound since July: what your money buys.</h1>
    <p class="lead" style="margin:0;max-width:68ch;">How many pounds ten currencies bought, kept day by day since
    late July. One move, seen through ten windows.</p>
  </div>
</section>

<section class="surface-light" id="findings" data-nav="What moved">
  <div class="wrap" style="max-width:960px;">
    <div class="sheet">
      <span class="seal" aria-hidden="true"><span data-glyph="ankh"></span></span>
      {facts}
      <p style="margin:0;">How prices in pounds moved over the same weeks:
      <a href="egypt-food-prices.html">Egypt&rsquo;s food prices, measured since July</a>.</p>
    </div>
    <div class="sheet cur-chart-sheet" style="margin-top:18px;">
      <picture>
        <source media="(max-width: 600px)" srcset="{CHART_NARROW}" width="{NARROW_W}" height="{narrow_h}">
        <img class="cur-chart" src="{CHART}" alt="{esc(alt)}" width="846" height="500">
      </picture>
    </div>
    <p class="chart-cap" style="margin-top:14px;">Source: <a href="{SOURCE_URL}" rel="noopener">ExchangeRate-API</a>
    market reference rates, kept daily by EgyBI since July. These are not the Central Bank of Egypt&rsquo;s official
    fixing, and banks and exchange offices quote their own buying and selling rates. Each currency is compared by
    the median of its rates in the first week and in the last week of the window.</p>
  </div>
</section>

<section class="surface-light-2" id="currencies" data-nav="All ten">
  <div class="wrap" style="max-width:960px;">
    <h2 style="font-size:1.2rem;margin:0 0 12px;">All ten currencies</h2>
    <div class="sheet">{table_html(weeks, pegs)}</div>
    <div class="cta-row" style="margin-top:18px;"><a class="btn btn-primary" href="prices.html">Today&rsquo;s rates and prices &rarr;</a>
    <a class="btn btn-ghost" href="fair-prices.html">What things should cost a visitor &rarr;</a></div>
  </div>
</section>

<section class="surface-light" id="embed" data-nav="Use this chart">
  <div class="wrap" style="max-width:960px;">
    <div class="kicker"><span data-glyph="scroll"></span>Free to use</div>
    <h2>Put this chart on your own site.</h2>
    <p class="lead" style="max-width:68ch;">An image that links back here and is rebuilt with the data. Please keep
    the credit line inside the image.</p>
    <pre class="hc-code"><code>{esc(snippet)}</code></pre>
    <p class="chart-cap" style="margin-top:12px;">Or <a href="{CHART}">open the chart on its own</a> to save it.</p>
  </div>
</section>
"""
    nav, foot = chrome('')
    write_text(os.path.join(SITE, PAGE),
               page(title, desc, url, body, ld, extra_head=f'<style>{CSS}</style>', prefix='',
                    nav=nav, foot=foot, og_image=f"{SITE_URL}/og-visit.png?v=3"))
    os.makedirs(os.path.join(SITE, 'charts'), exist_ok=True)
    write_text(os.path.join(SITE, CHART), wide_svg)
    write_text(os.path.join(SITE, CHART_NARROW), narrow_svg)
    return [(url, '0.8')]
