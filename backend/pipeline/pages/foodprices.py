"""egypt-food-prices.html and charts/egypt-food-prices.svg: the third data story.

WHAT IT MEASURES
----------------
The daily price pipeline (fetch_prices.py) has kept every retail price the
government's portal published since mid-July: 132 items, about 90 observation
days. This page asks one question of it: how far did prices move, by category,
and how does that compare with the pound over the same weeks?

HOW, AND WHAT IT REFUSES TO SAY
-------------------------------
* The portal's daily averages are NOISY: on single days a whole category's
  median moves by up to ~18% and comes back (measured 2026-11-06: vegetables
  -17% on 25 August with all 35 items reported, so it is not missing data).
  One day against another would let one noisy day set the headline, so each
  item is compared FIRST WEEK to LAST WEEK (the median of its observations in
  each), and the chart shows WEEKLY medians. The page says so and quotes the
  measured size of the daily swings.
* A category's value is the MEDIAN across its items of price relative to that
  item's first-week price (100), so one item doubling cannot drag a category.
* Only categories with at least CHART_MIN_ITEMS items are drawn; the smaller
  ones appear in the table, marked as small.
* The pound is compared by its own dates (the FX series starts later), and
  nothing here claims one moved the other. "Rose less than the dollar" is a
  comparison of two measured numbers, not a cause.
* These are the portal's retail averages across outlets, not a basket and not
  inflation. The page says so.

Colours: four categorical hues validated with the dataviz palette script
(lightness band, chroma floor, CVD and normal-vision separation, contrast
against the chart surface): all checks pass, worst adjacent CVD dE 8.8.
"""
import datetime as _dt
import json
import os
import statistics

from . import egfmt
from .common import SITE, SITE_URL, breadcrumb, chrome, esc, page, read_text, write_text

PAGE = 'egypt-food-prices.html'
CHART = 'charts/egypt-food-prices.svg'
# Drawn at phone width, not shrunk: the wide chart is 846 px and a phone
# shows it at ~276 px, which put its 12 px labels at about 4 px.
CHART_NARROW = 'charts/egypt-food-prices-narrow.svg'
NARROW_W = 320
MINUS = chr(0x2212)
TOLERANCE_DAYS = 7
CHART_MIN_ITEMS = 15
# Fixed order, never cycled (validated as an adjacent sequence in this order).
CHART_COLOURS = ['#1F5FA6', '#C2410C', '#2E7D4F', '#8A4FB5']
SURFACE, INK, INK_SOFT, GRID = '#FDF9EE', '#1B1B18', '#544C3E', '#D8D0BC'
CREDIT_MAX_CHARS = 110
CATEGORY_NAMES = {'vegetable': 'Vegetables', 'fish': 'Fish', 'fruit': 'Fruit', 'grocery': 'Groceries',
                  'dairy': 'Dairy', 'grain': 'Grain', 'meat': 'Meat', 'building': 'Building materials',
                  'fertiliser': 'Fertiliser'}
# The portal also prices building materials and fertiliser. This is a FOOD
# story, so those are left out rather than averaged in.
NOT_FOOD = {'building', 'fertiliser'}
_BIDI = dict.fromkeys([0x200E, 0x200F, 0x061C, 0x202A, 0x202B, 0x202C, 0x202D, 0x202E, 0x2066, 0x2067,
                       0x2068, 0x2069, 0xFEFF])


def _d(s):
    return _dt.date.fromisoformat(s)


def load():
    h = json.loads(read_text(os.path.join(SITE, 'data', 'prices-history.json')))
    t = json.loads(read_text(os.path.join(SITE, 'data', 'prices-today.json')))
    fx = json.loads(read_text(os.path.join(SITE, 'data', 'fx-history.json')))
    return h, t, fx


def english_name(item):
    """The portal's English name if it is clean, else None (the page then shows
    the Arabic name alone). Mangled names arrive with '?' where letters were lost."""
    n = item.get('name_en')
    if not n:
        return None
    n = ' '.join(str(n).translate(_BIDI).split())
    return None if (not n or '?' in n or chr(0xFFFD) in n) else n


def block_of(d, d0):
    """The 7-day block a date falls in, counted from the window's first day."""
    return (d - d0).days // 7


def item_changes(series, meta):
    """Each food item with observations in both the first and the last 7-day
    block of the window: the median of its prices in each block, and the change
    between them. The chart's last point per category is the median of exactly
    these changes, so the table and the chart cannot disagree.
    Returns (rows, first_date, last_date)."""
    dates = sorted({p['as_of'] for pts in series.values() for p in pts})
    if not dates:
        return [], None, None
    d1 = _d(dates[-1])
    # Whole weeks only, anchored on the last day: a block counted forward from
    # the first day can leave the LAST block one day long, which is the
    # one-noisy-day problem again (test_foodprices caught it). Leftover days
    # before the first full week are dropped, and d0 becomes the first day used.
    n_blocks = ((d1 - _d(dates[0])).days + 1) // 7
    if n_blocks < 2:
        return [], None, None
    d0 = d1 - _dt.timedelta(days=7 * n_blocks - 1)
    last_block = n_blocks - 1
    rows = []
    for slug, pts in series.items():
        pts = sorted((p for p in pts if p.get('avg')), key=lambda p: p['as_of'])
        if not pts or slug not in meta:
            continue
        m = meta[slug]
        if m.get('category') in NOT_FOOD:
            continue
        blocks = {}
        for p in pts:
            if _d(p['as_of']) >= d0:
                blocks.setdefault(block_of(_d(p['as_of']), d0), []).append(p['avg'])
        if 0 not in blocks or last_block not in blocks:
            continue
        weekly = {k: statistics.median(v) for k, v in blocks.items()}
        rows.append({'slug': slug, 'category': m.get('category', 'other'), 'name_ar': m.get('name_ar', ''),
                     'name_en': english_name(m), 'unit': m.get('unit') or '',
                     'first': weekly[0], 'last': weekly[last_block],
                     'change': weekly[last_block] / weekly[0] - 1, 'weekly': weekly, 'points': pts})
    return rows, d0, d1


def category_stats(rows):
    by = {}
    for r in rows:
        by.setdefault(r['category'], []).append(r['change'])
    return sorted(({'category': c, 'n': len(v), 'median': statistics.median(v)} for c, v in by.items()),
                  key=lambda x: (-x['n'], x['category']))


def daily_index(rows, category):
    """{date: index}: on each observation day, the median across the category's
    items of price / that item's first-week price x 100."""
    per_day = {}
    for r in rows:
        if r['category'] != category:
            continue
        for p in r['points']:
            per_day.setdefault(p['as_of'], []).append(100 * p['avg'] / r['first'])
    return {_d(k): statistics.median(v) for k, v in per_day.items()}


def category_index(rows, category, d0, d1):
    """[(date, index)]: per 7-day block, the median across the category's items
    of (that item's median price in the block / its first-block median) x 100.
    Placed mid-block; the last point sits on the window's last day."""
    per_block = {}
    for r in rows:
        if r['category'] != category:
            continue
        for k, v in r['weekly'].items():
            per_block.setdefault(k, []).append(100 * v / r['first'])
    out = []
    for k in sorted(per_block):
        mid = min(d0 + _dt.timedelta(days=7 * k + 3), d1)
        out.append((mid, statistics.median(per_block[k])))
    return out


def largest_daily_swing(rows, categories):
    """The biggest single-day distance from 100 in any charted category's daily
    index, with its category and date: how noisy the raw days are."""
    best = (0.0, None, None, None)
    for c in categories:
        daily = daily_index(rows, c)
        days = sorted(daily)
        for i, d in enumerate(days):
            if abs(daily[d] - 100) > best[0]:
                nxt = daily[days[i + 1]] if i + 1 < len(days) else None
                best = (abs(daily[d] - 100), c, d, nxt)
    return best


def usd_change(fx, d0, d1, tol=TOLERANCE_DAYS):
    """The dollar's price in pounds at the nearest observations to the window's
    ends (within tol days), or None."""
    pts = sorted((fx.get('series') or {}).get('USD') or [], key=lambda p: p['as_of'])
    near0 = [p for p in pts if abs((_d(p['as_of']) - d0).days) <= tol]
    near1 = [p for p in pts if abs((_d(p['as_of']) - d1).days) <= tol]
    if not near0 or not near1:
        return None
    a, b = near0[0], near1[-1]
    return {'from_date': a['as_of'], 'to_date': b['as_of'], 'from': a['egp'], 'to': b['egp'],
            'change': b['egp'] / a['egp'] - 1}


def _pct_signed(x):
    """+6.0% / −8.8% for prose (a sign reads better than an arrow mid-sentence).
    The minus is U+2212, not a hyphen: a hyphen is narrower than the plus, so a
    column of signed changes did not line up, and it can break the line after it."""
    v = egfmt.fixed(abs(x) * 100, 'en', 1)
    return ('+' if x > 0 else MINUS if x < 0 else '') + v + '%'


def findings(rows, stats, usd, d0, d1, n_days, swing=None):
    out = []
    med = statistics.median(r['change'] for r in rows)
    rose = sum(1 for r in rows if r['change'] > 0.0005)
    fell = sum(1 for r in rows if r['change'] < -0.0005)
    out.append(f"Across <strong>{len(rows)}</strong> food items, the median retail price moved "
               f"<strong>{_pct_signed(med)}</strong> from the first week (from {egfmt.date(d0, 'en', 'prose')}) "
               f"to the last (to {egfmt.date(d1, 'en', 'prose')}): {rose} items rose, {fell} fell and "
               f"{len(rows) - rose - fell} ended where they started.")
    if usd:
        verdict = ('less than' if abs(med) < abs(usd['change']) else 'more than' if abs(med) > abs(usd['change'])
                   else 'as much as')
        out.append(f"Over nearly the same weeks ({egfmt.date(usd['from_date'], 'en', 'prose')} to "
                   f"{egfmt.date(usd['to_date'], 'en', 'prose')}) the dollar went from "
                   f"{egfmt.rate(usd['from'], 'en')} to {egfmt.rate(usd['to'], 'en')}, "
                   f"<strong>{_pct_signed(usd['change'])}</strong>. The median food price moved {verdict} the dollar's price in pounds did. "
                   "That compares two measured numbers; it does not say one caused the other.")
    big = [s for s in stats if s['n'] >= CHART_MIN_ITEMS]
    if len(big) >= 2:
        hi = max(big, key=lambda s: s['median'])
        lo = min(big, key=lambda s: s['median'])
        out.append(f"Of the larger categories, {CATEGORY_NAMES.get(hi['category'], hi['category']).lower()} rose most "
                   f"(median {_pct_signed(hi['median'])} across {hi['n']} items) and "
                   f"{CATEGORY_NAMES.get(lo['category'], lo['category']).lower()} least "
                   f"({_pct_signed(lo['median'])} across {lo['n']}).")
    span = (d1 - d0).days + 1
    noisy = ''
    if swing and swing[1]:
        noisy = (f" Single days are noisy: on {egfmt.date(swing[2], 'en', 'prose')} the median "
                 f"{CATEGORY_NAMES.get(swing[1], swing[1]).lower()} price stood {egfmt.fixed(swing[0], 'en', 1)}% from "
                 "its starting level with every item reported"
                 + (f", and {egfmt.fixed(abs(swing[3] - 100), 'en', 1)}% from it on the next day the portal published"
                    if swing[3] is not None else "")
                 + ". So items are compared first week to last week, and the chart shows weekly medians.")
    out.append(f"The portal published prices on {n_days} of the {span} days in this window.{noisy}")
    return out


def table_html(stats):
    rows = []
    for s in stats:
        small = '' if s['n'] >= CHART_MIN_ITEMS else ' <span class="fpx-note">few items: not charted</span>'
        rows.append(f"<tr><th scope=\"row\">{esc(CATEGORY_NAMES.get(s['category'], s['category']))}{small}</th>"
                    f"<td class=\"num\">{s['n']}</td><td class=\"num\">{esc(_pct_signed(s['median']))}</td></tr>")
    return ('<div class="fpx-wrap"><table class="fpx-table"><caption>Median change per category, first week to last '
            'week. Each item is compared with itself.</caption><thead><tr><th scope="col">Category</th>'
            '<th scope="col" class="num">Items</th><th scope="col" class="num">Median change</th></tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table></div>')


def movers_html(rows, n=5):
    def li(r):
        name = (f"<strong>{esc(r['name_en'])}</strong> <span lang=\"ar\" dir=\"rtl\">{esc(r['name_ar'])}</span>"
                if r['name_en'] else f"<strong lang=\"ar\" dir=\"rtl\">{esc(r['name_ar'])}</strong>")
        unit = f" <span class=\"fpx-note\" lang=\"ar\" dir=\"rtl\">{esc(r['unit'])}</span>" if r['unit'] else ''
        return (f"<li>{name}{unit}: {egfmt.money(r['first'], 'en')} &rarr; {egfmt.money(r['last'], 'en')} "
                f"<span class=\"fpx-chg\">{esc(_pct_signed(r['change']))}</span></li>")
    up = sorted(rows, key=lambda r: (-r['change'], r['slug']))[:n]
    down = sorted(rows, key=lambda r: (r['change'], r['slug']))[:n]
    return ('<div class="fpx-movers"><div><h3>Rose most</h3><ul class="plain-list">'
            + ''.join(li(r) for r in up) + '</ul></div><div><h3>Fell most</h3><ul class="plain-list">'
            + ''.join(li(r) for r in down) + '</ul></div></div>')


def svg_chart(lines, d0, d1, title, credit_lines):
    """One line per category on a shared index scale (100 = first observation),
    one y-axis, labels at the line ends, a legend, and the credit inside the
    image. lines: [(name, colour, [(date, index)])]."""
    for c in credit_lines:
        if len(c) > CREDIT_MAX_CHARS:
            raise ValueError(f'credit line too long ({len(c)} > {CREDIT_MAX_CHARS}): {c}')
    W, H = 846, 500
    left, right, top, bottom = 58, 130, 78, 100
    pw, ph = W - left - right, H - top - bottom
    vals = [v for _, _, pts in lines for _, v in pts] + [100]
    lo = 5 * int(min(vals) // 5) - (5 if min(vals) % 5 == 0 else 0)
    hi = 5 * int(-(-max(vals) // 5))
    if hi - lo < 10:
        hi = lo + 10
    span_days = max(1, (d1 - d0).days)

    def x(d):
        return left + pw * (d - d0).days / span_days

    def y(v):
        return top + ph * (hi - v) / (hi - lo)

    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
           f'role="img" aria-labelledby="t d" font-family="Inter, Segoe UI, Arial, sans-serif">',
           f'<title id="t">{esc(title)}</title>',
           f'<desc id="d">Median retail price index per category, 100 = first observation, '
           f'{egfmt.date(d0, "en", "prose")} to {egfmt.date(d1, "en", "prose")}.</desc>',
           f'<rect width="{W}" height="{H}" fill="{SURFACE}"/>',
           f'<text x="{left}" y="34" font-size="19" font-weight="700" fill="{INK}">{esc(title)}</text>',
           f'<text x="{left}" y="56" font-size="12.5" fill="{INK_SOFT}">Weekly median price per category, '
           f'100 = each item&#8217;s own first-week price</text>']
    step = 5 if hi - lo <= 40 else 10
    for v in range(lo, hi + 1, step):
        yy = y(v)
        w = '1.5' if v == 100 else '1'
        col = INK_SOFT if v == 100 else GRID
        out.append(f'<line x1="{left}" y1="{yy:.1f}" x2="{left + pw}" y2="{yy:.1f}" stroke="{col}" stroke-width="{w}"/>')
        out.append(f'<text x="{left - 8}" y="{yy + 4:.1f}" font-size="12" text-anchor="end" fill="{INK_SOFT}">{v}</text>')
    # Month ticks on the first of each month inside the window.
    m = _dt.date(d0.year, d0.month, 1)
    while m <= d1:
        if m >= d0:
            xx = x(m)
            out.append(f'<line x1="{xx:.1f}" y1="{top + ph}" x2="{xx:.1f}" y2="{top + ph + 5}" stroke="{INK_SOFT}"/>')
            out.append(f'<text x="{xx:.1f}" y="{top + ph + 20}" font-size="12" text-anchor="middle" '
                       f'fill="{INK_SOFT}">{egfmt.MONTHS_EN_SHORT[m.month - 1]}</text>')
        m = _dt.date(m.year + (m.month == 12), m.month % 12 + 1, 1)
    # Lines, then end labels nudged apart so they never overlap.
    ends = []
    for name, colour, pts in lines:
        path = ' '.join(f'{"M" if i == 0 else "L"}{x(d):.1f},{y(v):.1f}' for i, (d, v) in enumerate(pts))
        out.append(f'<path d="{path}" fill="none" stroke="{colour}" stroke-width="2" '
                   'stroke-linejoin="round" stroke-linecap="round"/>')
        d_last, v_last = pts[-1]
        out.append(f'<circle cx="{x(d_last):.1f}" cy="{y(v_last):.1f}" r="4" fill="{colour}" '
                   f'stroke="{SURFACE}" stroke-width="2"/>')
        ends.append([y(v_last), name, v_last])
    ends.sort()
    for i in range(1, len(ends)):
        if ends[i][0] - ends[i - 1][0] < 16:
            ends[i][0] = ends[i - 1][0] + 16
    for yy, name, v in ends:
        out.append(f'<text x="{left + pw + 10}" y="{yy + 4:.1f}" font-size="12.5" font-weight="600" fill="{INK}">'
                   f'{esc(name)} {egfmt.fixed(v, "en", 1)}</text>')
    # Legend row (identity never by colour alone: the end labels name each line too).
    lx = left
    for name, colour, _ in lines:
        out.append(f'<rect x="{lx}" y="{H - 58}" width="14" height="4" rx="2" fill="{colour}"/>')
        out.append(f'<text x="{lx + 20}" y="{H - 53}" font-size="12" fill="{INK}">{esc(name)}</text>')
        lx += 30 + 8 * len(name)
    for i, c in enumerate(credit_lines):
        out.append(f'<text x="{left}" y="{H - 30 + i * 14}" font-size="11.5" fill="{INK_SOFT}">{esc(c)}</text>')
    out.append('</svg>')
    return '\n'.join(out) + '\n'


def _wrap(text, width):
    """Greedy word wrap to at most `width` characters a line."""
    lines, cur = [], ''
    for word in text.split():
        if cur and len(cur) + 1 + len(word) > width:
            lines.append(cur)
            cur = word
        else:
            cur = f'{cur} {word}' if cur else word
    if cur:
        lines.append(cur)
    return lines


def svg_chart_narrow(lines, d0, d1, title, credit_lines):
    """The same lines as svg_chart, drawn 320 px wide for a phone, where the
    page shows it at close to its own size. No legend: the end labels name
    every line, so identity never rests on colour alone. Same scale rules."""
    W = NARROW_W
    left, right, top = 34, 104, 112
    pw, ph = W - left - right, 230
    vals = [v for _, _, pts in lines for _, v in pts] + [100]
    lo = 5 * int(min(vals) // 5) - (5 if min(vals) % 5 == 0 else 0)
    hi = 5 * int(-(-max(vals) // 5))
    if hi - lo < 10:
        hi = lo + 10
    span_days = max(1, (d1 - d0).days)

    def x(d):
        return left + pw * (d - d0).days / span_days

    def y(v):
        return top + ph * (hi - v) / (hi - lo)

    credit = [ln for c in credit_lines for ln in _wrap(c, 46)]
    H = top + ph + 52 + 15 * len(credit)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
           f'role="img" aria-labelledby="tn dn" font-family="Inter, Segoe UI, Arial, sans-serif">',
           f'<title id="tn">{esc(title)}</title>',
           f'<desc id="dn">Median retail price index per category, 100 = first observation, '
           f'{egfmt.date(d0, "en", "prose")} to {egfmt.date(d1, "en", "prose")}.</desc>',
           f'<rect width="{W}" height="{H}" fill="{SURFACE}"/>']
    for i, ln in enumerate(_wrap(title, 30)):
        out.append(f'<text x="12" y="{28 + i * 22}" font-size="17" font-weight="700" fill="{INK}">{esc(ln)}</text>')
    for i, ln in enumerate(('Weekly median price per category,', '100 = each item&#8217;s own first-week price')):
        out.append(f'<text x="12" y="{76 + i * 16}" font-size="12.5" fill="{INK_SOFT}">{ln}</text>')
    step = 5 if hi - lo <= 40 else 10
    for v in range(lo, hi + 1, step):
        yy = y(v)
        w = '1.5' if v == 100 else '1'
        col = INK_SOFT if v == 100 else GRID
        out.append(f'<line x1="{left}" y1="{yy:.1f}" x2="{left + pw}" y2="{yy:.1f}" stroke="{col}" stroke-width="{w}"/>')
        out.append(f'<text x="{left - 6}" y="{yy + 4:.1f}" font-size="12" text-anchor="end" fill="{INK_SOFT}">{v}</text>')
    m = _dt.date(d0.year, d0.month, 1)
    while m <= d1:
        if m >= d0:
            xx = x(m)
            out.append(f'<line x1="{xx:.1f}" y1="{top + ph}" x2="{xx:.1f}" y2="{top + ph + 5}" stroke="{INK_SOFT}"/>')
            out.append(f'<text x="{xx:.1f}" y="{top + ph + 20}" font-size="12" text-anchor="middle" '
                       f'fill="{INK_SOFT}">{egfmt.MONTHS_EN_SHORT[m.month - 1]}</text>')
        m = _dt.date(m.year + (m.month == 12), m.month % 12 + 1, 1)
    ends = []
    for name, colour, pts in lines:
        path = ' '.join(f'{"M" if i == 0 else "L"}{x(d):.1f},{y(v):.1f}' for i, (d, v) in enumerate(pts))
        out.append(f'<path d="{path}" fill="none" stroke="{colour}" stroke-width="2" '
                   'stroke-linejoin="round" stroke-linecap="round"/>')
        d_last, v_last = pts[-1]
        out.append(f'<circle cx="{x(d_last):.1f}" cy="{y(v_last):.1f}" r="3.5" fill="{colour}" '
                   f'stroke="{SURFACE}" stroke-width="2"/>')
        ends.append([y(v_last), name, v_last, colour])
    ends.sort()
    for i in range(1, len(ends)):
        if ends[i][0] - ends[i - 1][0] < 16:
            ends[i][0] = ends[i - 1][0] + 16
    for yy, name, v, colour in ends:
        out.append(f'<text x="{left + pw + 8}" y="{yy + 4:.1f}" font-size="12" font-weight="600" fill="{INK}">'
                   f'{esc(name)} {egfmt.fixed(v, "en", 1)}</text>')
    for i, c in enumerate(credit):
        out.append(f'<text x="12" y="{top + ph + 50 + i * 15}" font-size="11.5" fill="{INK_SOFT}">{esc(c)}</text>')
    out.append('</svg>')
    return '\n'.join(out) + '\n'


CSS = """
.fpx-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.fpx-table{border-collapse:collapse;width:100%}
.fpx-table caption{caption-side:bottom;text-align:left;font-size:.82rem;padding-top:8px;opacity:.85}
.fpx-table th,.fpx-table td{text-align:left;padding:9px 8px;border-bottom:1px solid rgba(41,36,32,.15);font-size:.92rem}
.fpx-table .num{text-align:right;font-variant-numeric:tabular-nums}
.fpx-note{font-size:.8rem;color:var(--ink-soft);font-weight:400}
.fpx-movers{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px}
.fpx-movers h3{font-size:1rem;margin:0 0 4px}
.fpx-chg{font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.fpx-chart{display:block;width:100%;height:auto;border-radius:10px}
@media (max-width:600px){.fpx-chart-sheet{padding:8px}}
.hc-code{white-space:pre-wrap;word-break:break-all;user-select:all;font:500 .82rem/1.5 ui-monospace,Consolas,monospace;background:var(--papyrus);border:1px solid rgba(41,36,32,.25);border-radius:8px;padding:12px 14px;margin:10px 0 0}
"""


def build_food_prices_page():
    """Write the page and the chart; [] (nothing published) if the data is missing."""
    try:
        h, t, fx = load()
    except (OSError, ValueError):
        return []
    series = (h.get('retail') or {}).get('series') or {}
    meta = {i['slug']: i for i in (t.get('retail') or {}).get('items', [])}
    rows, d0, d1 = item_changes(series, meta)
    if len(rows) < 20:
        return []
    stats = category_stats(rows)
    usd = usd_change(fx, d0, d1)
    n_days = len({p['as_of'] for pts in series.values() for p in pts})
    charted = [s['category'] for s in stats if s['n'] >= CHART_MIN_ITEMS][:len(CHART_COLOURS)]
    lines = [(CATEGORY_NAMES.get(c, c), CHART_COLOURS[i], category_index(rows, c, d0, d1))
             for i, c in enumerate(charted)]
    swing = largest_daily_swing(rows, charted)
    url, chart_url = f'{SITE_URL}/{PAGE}', f'{SITE_URL}/{CHART}'
    title = "Egypt's food prices, measured since July · EgyBI"
    desc = (f"How far Egypt's retail food prices moved from {egfmt.date(d0, 'en', 'compact')} to "
            f"{egfmt.date(d1, 'en', 'compact')}, by category and against the pound: {len(rows)} items, "
            "from the official price portal.")
    chart_title = "Egypt's retail food prices since July"
    credit = (f"egybi.com/{PAGE} · IDSC price portal, retail averages, {len(rows)} items.",
              "Weekly median per category, first week = 100. Not a basket, not inflation.")
    alt = f"{chart_title}: median price index by category (EgyBI)"
    narrow_svg = svg_chart_narrow(lines, d0, d1, chart_title, credit)
    narrow_h = int(narrow_svg.split('height="', 1)[1].split('"', 1)[0])
    snippet = (f'<a href="{url}"><img src="{chart_url}" alt="{alt}" width="846" '
               'style="max-width:100%;height:auto" loading="lazy"></a>')
    facts = ''.join(f'<p style="margin:0 0 10px;">{x}</p>' for x in findings(rows, stats, usd, d0, d1, n_days, swing))
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "name": "Egypt's food prices, measured since July", "url": url, "description": desc,
         "isPartOf": {"@id": SITE_URL + "/#site"}},
        breadcrumb("Food prices since July", url, "Daily prices", SITE_URL + "/prices.html")]}
    body = f"""
<section class="surface-hero" style="padding-top:64px;padding-bottom:44px;">
  <div class="wrap" style="max-width:960px;">
    <p class="hero-eyebrow"><span data-glyph="ra"></span> <a href="prices.html">Daily prices</a> &middot; {egfmt.time_tag(d0, 'en', 'compact')} to {egfmt.time_tag(d1, 'en', 'compact')} &middot; measured, not estimated</p>
    <h1 style="font-size:clamp(1.6rem,5vw,2.6rem);margin:0 0 12px;">Egypt&rsquo;s food prices, measured since July.</h1>
    <p class="lead" style="margin:0;max-width:68ch;">Every retail price the government&rsquo;s portal published,
    kept day by day since mid-July. How far each category moved, and how that compares with the pound.</p>
  </div>
</section>

<section class="surface-light" id="findings" data-nav="What moved">
  <div class="wrap" style="max-width:960px;">
    <div class="sheet">
      <span class="seal" aria-hidden="true"><span data-glyph="ankh"></span></span>
      {facts}
    </div>
    <div class="sheet fpx-chart-sheet" style="margin-top:18px;">
      <picture>
        <source media="(max-width: 600px)" srcset="{CHART_NARROW}" width="{NARROW_W}" height="{narrow_h}">
        <img class="fpx-chart" src="{CHART}" alt="{esc(alt)}" width="846" height="500">
      </picture>
    </div>
    <p class="chart-cap" style="margin-top:14px;">Source: the IDSC local prices portal (Egyptian Cabinet), retail
    averages across outlets, kept daily by EgyBI since July. Each item is compared by the median of its prices in
    the first week and in the last week of the window; the chart shows weekly medians. These are price averages for
    items, not a household basket and not an inflation rate.</p>
  </div>
</section>

<section class="surface-light-2" id="categories" data-nav="By category">
  <div class="wrap" style="max-width:960px;">
    <h2 style="font-size:1.2rem;margin:0 0 12px;">By category</h2>
    <div class="sheet">{table_html(stats)}</div>
  </div>
</section>

<section class="surface-light" id="movers" data-nav="Biggest moves">
  <div class="wrap" style="max-width:960px;">
    <h2 style="font-size:1.2rem;margin:0 0 12px;">The biggest moves</h2>
    <div class="sheet">{movers_html(rows)}</div>
    <div class="cta-row" style="margin-top:18px;"><a class="btn btn-primary" href="prices.html">Today&rsquo;s prices &rarr;</a>
    <a class="btn btn-ghost" href="fair-prices.html">What things should cost a visitor &rarr;</a></div>
  </div>
</section>

<section class="surface-light-2" id="embed" data-nav="Use this chart">
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
    write_text(os.path.join(SITE, CHART), svg_chart(lines, d0, d1, chart_title, credit))
    write_text(os.path.join(SITE, CHART_NARROW), narrow_svg)
    return [(url, '0.8')]
