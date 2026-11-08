"""egypt-wholesale-to-shop.html and its two charts: the fifth data story.

WHAT IT MEASURES
----------------
The IDSC price portal publishes two lists for the same items: retail (shop)
prices, daily, and wholesale prices, about weekly. fetch_prices.py has kept
both since July. For every item priced in the SAME unit on both lists, the
page compares the two: shop price divided by wholesale price, week by week.

HOW, AND WHAT IT REFUSES TO SAY
-------------------------------
* Whole weeks counted back from the last WHOLESALE date (the slower list sets
  the end, so the last week always has both), the median of each list in each
  week, then the ratio.
* Only the same unit. The wholesale list prices all the fish, some fruit and
  some groceries by the crate, carton or sack with no stated weight, so those
  cannot be compared per kilo and are left out, and the page says how many.
* A wholesale price that never changes is not a measurement. Six series held
  one or two values for all seventeen weeks (measured 2026-11-08), two of them
  among the "widest gaps" until they were excluded. FROZEN_MAX_DISTINCT drops
  them, and the page says how many.
* The gap is NOT the shop's profit: the retail figure is an average across
  outlets and regions, the wholesale figure a market quote the portal does not
  locate, so the gap also holds transport, handling and quality. The page says
  "gap", never "markup" or "profit".
* Week to week the two lists move together only about half the time
  (measured: 55% of moves for vegetables), so the page reports a gap in LEVEL
  and never says shops follow the market.
"""
import datetime as _dt
import json
import os
import statistics

from . import egfmt, storychart
from .common import SITE, SITE_URL, breadcrumb, chrome, esc, page, read_text, write_text
from .foodprices import CATEGORY_NAMES, NOT_FOOD, english_name
from .storychart import CHART_COLOURS, NARROW_W

PAGE = 'egypt-wholesale-to-shop.html'
CHART = 'charts/egypt-wholesale-to-shop.svg'
CHART_NARROW = 'charts/egypt-wholesale-to-shop-narrow.svg'
TIMES = chr(0xD7)
KILO = 'كيلو'
# A wholesale series with this many distinct prices or fewer across the window
# has not been re-measured, and is left out.
FROZEN_MAX_DISTINCT = 2
# The headline and the table use the median of each item's last four weeks:
# one week of a weekly list is one quote.
LAST_WEEKS = 4
# A category is charted and named in the headline only with this many items.
CHART_MIN_ITEMS = 8
# The page is published only with this many comparable items.
MIN_ITEMS = 20
# "Narrowed" and "widened" need a move larger than this, first four weeks to last.
MOVE = 0.05


def _d(s):
    return _dt.date.fromisoformat(s)


def load():
    h = json.loads(read_text(os.path.join(SITE, 'data', 'prices-history.json')))
    t = json.loads(read_text(os.path.join(SITE, 'data', 'prices-today.json')))
    return h, t


def comparable(meta_r, meta_w, rs, ws):
    """(slugs priced in the same unit on both lists, slugs left out for a
    different unit). Not-food categories are never considered."""
    both = [s for s in meta_r if s in meta_w and s in rs and s in ws
            and meta_r[s].get('category') not in NOT_FOOD]
    same = sorted(s for s in both if meta_r[s].get('unit') == meta_w[s].get('unit'))
    other = sorted(s for s in both if meta_r[s].get('unit') != meta_w[s].get('unit'))
    return same, other


def window(rs, ws, slugs):
    """(d0, d1, n): whole weeks counted back from the last wholesale date, over
    the retail dates up to it. None if too short."""
    w_last = max((p['as_of'] for s in slugs for p in ws[s] if p.get('avg')), default=None)
    if not w_last:
        return None
    dates = sorted({p['as_of'] for s in slugs for p in rs[s] if p.get('avg') and p['as_of'] <= w_last})
    return storychart.whole_weeks(dates)


def _weekly(points, d0, d1):
    blocks = {}
    for p in points:
        if p.get('avg') and d0 <= _d(p['as_of']) <= d1:
            blocks.setdefault(storychart.block_of(_d(p['as_of']), d0), []).append(p['avg'])
    return {k: statistics.median(v) for k, v in blocks.items()}


def item_gaps(meta_r, rs, ws, slugs, d0, d1, n):
    """Per item: weekly shop/wholesale ratios and the last-four-weeks figures.
    Returns (rows, frozen slugs). An item needs a ratio in at least one of the
    last LAST_WEEKS weeks to be listed."""
    rows, frozen = [], []
    last = range(max(0, n - LAST_WEEKS), n)
    first = range(0, min(LAST_WEEKS, n))
    for s in slugs:
        w_in = [p['avg'] for p in ws[s] if p.get('avg') and d0 <= _d(p['as_of']) <= d1]
        if len(set(w_in)) <= FROZEN_MAX_DISTINCT:
            frozen.append(s)
            continue
        r, w = _weekly(rs[s], d0, d1), _weekly(ws[s], d0, d1)
        ratio = {k: r[k] / w[k] for k in r if k in w and w[k]}
        tail = [ratio[k] for k in last if k in ratio]
        if not tail:
            continue
        head = [ratio[k] for k in first if k in ratio]
        m = meta_r[s]
        rows.append({'slug': s, 'category': m.get('category', 'other'), 'name_ar': m.get('name_ar', ''),
                     'name_en': english_name(m), 'unit': m.get('unit') or '',
                     'gap': statistics.median(tail), 'gap_first': statistics.median(head) if head else None,
                     'shop': statistics.median(r[k] for k in last if k in ratio),
                     'wholesale': statistics.median(w[k] for k in last if k in ratio),
                     'ratio': ratio, 'retail_w': r, 'wholesale_w': w})
    return rows, frozen


def charted_categories(rows):
    counts = {}
    for r in rows:
        counts[r['category']] = counts.get(r['category'], 0) + 1
    cats = [c for c, k in sorted(counts.items(), key=lambda x: -x[1]) if k >= CHART_MIN_ITEMS]
    return cats[:len(CHART_COLOURS)]


def category_line(rows, category, d0, d1, n):
    """[(date, gap x 100)]: the median ratio across the category's items each
    week, placed mid-week; a week with fewer than CHART_MIN_ITEMS items is not drawn."""
    out = []
    for k in range(n):
        v = [r['ratio'][k] for r in rows if r['category'] == category and k in r['ratio']]
        if len(v) >= CHART_MIN_ITEMS:
            out.append((min(d0 + _dt.timedelta(days=7 * k + 3), d1), 100 * statistics.median(v)))
    return out


def weekly_band(rows, n):
    """(lo, hi, weeks): the range of the all-items weekly median gap."""
    meds = []
    for k in range(n):
        v = [r['ratio'][k] for r in rows if k in r['ratio']]
        if len(v) >= CHART_MIN_ITEMS:
            meds.append(statistics.median(v))
    return (min(meds), max(meds), len(meds)) if meds else None


def same_direction(rows, category=None):
    """(share, moves): how often an item's shop and wholesale weekly medians
    moved the same way from one week to the next, counting only weeks where
    BOTH changed."""
    agree = moves = 0
    for r in rows:
        if category and r['category'] != category:
            continue
        ks = sorted(k for k in r['ratio'])
        for a, b in zip(ks, ks[1:]):
            dr = r['retail_w'][b] - r['retail_w'][a]
            dw = r['wholesale_w'][b] - r['wholesale_w'][a]
            if dr and dw:
                moves += 1
                agree += (dr > 0) == (dw > 0)
    return (agree / moves if moves else None), moves


def _x(v):
    return egfmt.fixed(v, 'en', 2) + TIMES


def _name(r):
    return r['name_en'] or r['name_ar']


def _list(names):
    return names[0] if len(names) == 1 else ', '.join(names[:-1]) + ' and ' + names[-1]


def findings(rows, cats, d0, d1, n, other_unit, frozen, meta_r):
    by = {c: [r['gap'] for r in rows if r['category'] == c] for c in cats}
    heads = [(CATEGORY_NAMES.get(c, c).lower(), statistics.median(by[c]), len(by[c])) for c in cats]
    parts = [f"<strong>{egfmt.fixed(g, 'en', 2)} times</strong>" for _, g, _ in heads]
    out = [f"In the four weeks to {egfmt.date(d1, 'en', 'prose')}, {heads[0][0]} cost {parts[0]} their wholesale "
           "price in shops"
           + ''.join(f", and {name} {pt}" if i == len(heads) - 1 else f", {name} {pt}"
                     for i, ((name, _, _), pt) in enumerate(zip(heads[1:], parts[1:]), start=1))
           + f" (the median of {_list([str(k) for *_, k in heads])} items). For every 100 pounds at the wholesale "
           f"market, shoppers paid about {_list([str(round(g * 100)) for _, g, _ in heads])}."]
    band = weekly_band(rows, n)
    if band:
        lo, hi, weeks = band
        out.append(f"That gap is steady. In the {weeks} weeks since {egfmt.date(d0, 'en', 'prose')} in which both "
                   f"lists were published, the median across all {len(rows)} items stayed between {egfmt.fixed(lo, 'en', 2)} and "
                   f"{egfmt.fixed(hi, 'en', 2)} times.")
    ranked = sorted(rows, key=lambda r: (-r['gap'], r['slug']))
    out.append("The widest gaps: " + '; '.join(f"{esc(_name(r))} {_x(r['gap'])}" for r in ranked[:3])
               + ". The narrowest: " + '; '.join(f"{esc(_name(r))} {_x(r['gap'])}" for r in ranked[-3:][::-1]) + '.')
    both = [r for r in rows if r['gap_first']]
    narrowed = sum(1 for r in both if r['gap'] < r['gap_first'] * (1 - MOVE))
    widened = sum(1 for r in both if r['gap'] > r['gap_first'] * (1 + MOVE))
    out.append(f"Between the first four weeks and the last four, the gap narrowed by more than 5% for {narrowed} "
               f"items and widened by more than 5% for {widened}; the other {len(both) - narrowed - widened} "
               "moved less.")
    share, moves = same_direction(rows)
    if share is not None:
        out.append(f"Week to week, an item&rsquo;s shop and wholesale prices moved the same way only "
                   f"{round(share * 100)}% of the time ({moves} weeks in which both changed). The gap is a "
                   "difference in level that holds over months, not a weekly mark-up applied to the market price.")
    fish_out = (any(meta_r[s].get('category') == 'fish' for s in other_unit)
                and not any(r['category'] == 'fish' for r in rows))
    out.append(f"Left out: {len(other_unit)} items the wholesale list prices by the crate, carton or sack rather "
               f"than by the shops&rsquo; unit{' (all the fish among them)' if fish_out else ''}, and "
               f"{len(frozen)} whose wholesale price did not change in these weeks.")
    return out


def table_html(rows):
    """Gap sits next to the name, units live in the headers (the currency
    table's lesson: a 390 px phone hid its last column)."""
    out = []
    for r in sorted(rows, key=lambda r: (-r['gap'], r['slug'])):
        name = (f"{esc(r['name_en'])} <span class=\"wg-ar\" lang=\"ar\" dir=\"rtl\">{esc(r['name_ar'])}</span>"
                if r['name_en'] else f"<span lang=\"ar\" dir=\"rtl\">{esc(r['name_ar'])}</span>")
        # Most rows are per kilo; repeating it on every row made each row
        # three lines tall on a phone (measured: 128 px rows at 390 px).
        unit = (f" <span class=\"wg-note\" lang=\"ar\" dir=\"rtl\">{esc(r['unit'])}</span>"
                if r['unit'] and r['unit'] != KILO else '')
        out.append(f'<tr><th scope="row">{name}{unit}</th><td class="num wg-gap">{esc(_x(r["gap"]))}</td>'
                   f'<td class="num">{egfmt.fixed(r["wholesale"], "en", 2)}</td>'
                   f'<td class="num">{egfmt.fixed(r["shop"], "en", 2)}</td></tr>')
    return ('<div class="wg-wrap"><table class="wg-table"><caption>Median of the last four weeks, in Egyptian '
            'pounds per kilo unless another unit is shown under the name. Gap = shop price divided by wholesale '
            'price: 1.50 means shops charged half as much again.</caption><thead><tr><th scope="col">Item</th>'
            '<th scope="col" class="num">Gap</th><th scope="col" class="num">Wholesale</th>'
            '<th scope="col" class="num">Shop</th></tr></thead>'
            f'<tbody>{"".join(out)}</tbody></table></div>')


CSS = """
.wg-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.wg-table{border-collapse:collapse;width:100%}
.wg-table caption{caption-side:bottom;text-align:left;font-size:.82rem;padding-top:8px;opacity:.85}
.wg-table th,.wg-table td{text-align:left;padding:9px 8px;border-bottom:1px solid rgba(41,36,32,.15);font-size:.92rem}
.wg-table .num{text-align:right;font-variant-numeric:tabular-nums}
.wg-table td.num{white-space:nowrap}
.wg-table .wg-gap{font-weight:700}
@media (max-width:600px){.wg-table th,.wg-table td{padding:8px 5px;font-size:.86rem}}
.wg-ar{font-weight:400;color:var(--ink-soft)}
.wg-note{display:block;font-size:.78rem;color:var(--ink-soft);font-weight:400}
.wg-chart{display:block;width:100%;height:auto;border-radius:10px}
@media (max-width:600px){.wg-chart-sheet{padding:8px}}
.hc-code{white-space:pre-wrap;word-break:break-all;user-select:all;font:500 .82rem/1.5 ui-monospace,Consolas,monospace;background:var(--papyrus);border:1px solid rgba(41,36,32,.25);border-radius:8px;padding:12px 14px;margin:10px 0 0}
"""


def build_wholesale_gap_page():
    """Write the page and both charts; [] (nothing published) if the data is too thin."""
    try:
        h, t = load()
    except (OSError, ValueError):
        return []
    rs = (h.get('retail') or {}).get('series') or {}
    ws = (h.get('wholesale') or {}).get('series') or {}
    meta_r = {i['slug']: i for i in (t.get('retail') or {}).get('items', [])}
    meta_w = {i['slug']: i for i in (t.get('wholesale') or {}).get('items', [])}
    same, other_unit = comparable(meta_r, meta_w, rs, ws)
    win = window(rs, ws, same)
    if not win:
        return []
    d0, d1, n = win
    rows, frozen = item_gaps(meta_r, rs, ws, same, d0, d1, n)
    cats = charted_categories(rows)
    if len(rows) < MIN_ITEMS or not cats:
        return []
    lines = [(CATEGORY_NAMES.get(c, c), CHART_COLOURS[i], category_line(rows, c, d0, d1, n))
             for i, c in enumerate(cats)]
    url, chart_url = f'{SITE_URL}/{PAGE}', f'{SITE_URL}/{CHART}'
    # seo.py caps titles at 65 characters; the H1 keeps the full phrase.
    title = "Wholesale to shop: Egypt's food price gap · EgyBI"
    desc = (f"How much more Egypt's shops charged than the wholesale market for {len(rows)} foods, "
            f"{egfmt.date(d0, 'en', 'compact')} to {egfmt.date(d1, 'en', 'compact')}, from the official price portal.")
    chart_title = "Shop prices against wholesale in Egypt"
    chart_desc = 'Shop price for every 100 pounds at wholesale, median per category, by week'
    credit = (f"egybi.com/{PAGE} · IDSC price portal, {len(rows)} items in the same unit.",
              "Weekly median; 100 = the wholesale price. A gap, not a profit margin.")
    wide_svg = storychart.wide(lines, d0, d1, chart_title,
                               'Shop price for every 100 pounds at wholesale, weekly median per category',
                               chart_desc, credit)
    narrow_svg = storychart.narrow(lines, d0, d1, chart_title,
                                   ('Shop price for every 100 pounds', 'at wholesale, weekly median'),
                                   chart_desc, credit)
    narrow_h = int(narrow_svg.split('height="', 1)[1].split('"', 1)[0])
    alt = f"{chart_title}: shop price for every 100 pounds at wholesale, by category (EgyBI)"
    snippet = (f'<a href="{url}"><img src="{chart_url}" alt="{alt}" width="846" '
               'style="max-width:100%;height:auto" loading="lazy"></a>')
    facts = ''.join(f'<p style="margin:0 0 10px;">{x}</p>'
                    for x in findings(rows, cats, d0, d1, n, other_unit, frozen, meta_r))
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "name": "From the wholesale market to the shop: Egypt's food price gap", "url": url,
         "description": desc, "isPartOf": {"@id": SITE_URL + "/#site"}},
        breadcrumb("Wholesale to shop", url, "Daily prices", SITE_URL + "/prices.html")]}
    body = f"""
<section class="surface-hero" style="padding-top:64px;padding-bottom:44px;">
  <div class="wrap" style="max-width:960px;">
    <p class="hero-eyebrow"><span data-glyph="ra"></span> <a href="prices.html">Daily prices</a> &middot; {egfmt.time_tag(d0, 'en', 'compact')} to {egfmt.time_tag(d1, 'en', 'compact')} &middot; measured, not estimated</p>
    <h1 style="font-size:clamp(1.6rem,5vw,2.6rem);margin:0 0 12px;">From the wholesale market to the shop: Egypt&rsquo;s food price gap.</h1>
    <p class="lead" style="margin:0;max-width:68ch;">The government&rsquo;s price portal publishes what the same foods
    cost at wholesale and in shops. Kept week by week since the summer, the two lists show how far apart they sit.</p>
  </div>
</section>

<section class="surface-light" id="findings" data-nav="The gap">
  <div class="wrap" style="max-width:960px;">
    <div class="sheet">
      <span class="seal" aria-hidden="true"><span data-glyph="ankh"></span></span>
      {facts}
      <p style="margin:0;">How shop prices themselves moved over the same weeks:
      <a href="egypt-food-prices.html">Egypt&rsquo;s food prices, measured since July</a>.</p>
    </div>
    <div class="sheet wg-chart-sheet" style="margin-top:18px;">
      <picture>
        <source media="(max-width: 600px)" srcset="{CHART_NARROW}" width="{NARROW_W}" height="{narrow_h}">
        <img class="wg-chart" src="{CHART}" alt="{esc(alt)}" width="846" height="500">
      </picture>
    </div>
    <p class="chart-cap" style="margin-top:14px;">Source: the IDSC local prices portal (Egyptian Cabinet): its retail
    averages across outlets, published daily, and its wholesale prices, published about weekly, kept by EgyBI since
    the summer. The portal does not say which wholesale market it quotes. Each week compares the median of each
    list, item by item, and only items priced in the same unit on both. The chart&rsquo;s points are single
    weeks; the figures above are the median of the last four. The gap includes transport, handling and
    quality as well as the shop&rsquo;s margin, so it is not a profit figure.</p>
  </div>
</section>

<section class="surface-light-2" id="items" data-nav="Every item">
  <div class="wrap" style="max-width:960px;">
    <h2 style="font-size:1.2rem;margin:0 0 12px;">Every item compared</h2>
    <div class="sheet">{table_html(rows)}</div>
    <div class="cta-row" style="margin-top:18px;"><a class="btn btn-primary" href="prices.html">Today&rsquo;s prices &rarr;</a>
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
