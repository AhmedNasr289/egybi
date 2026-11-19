"""made-in-egypt.html: things made in Egypt a visitor can see, buy or try,
from site/data/made-in-egypt.json (2026-11-18).

WHY
---
Visitors are steered to "factories" that are shops, and much of what sits at
the busiest stalls was not made in Egypt at all (the research behind this
page is reports/Made in Egypt research.md, kept outside the repository). This
page names real crafts and makers, where each is made, where a visitor meets
it, and only what a source says about price or how to tell the real thing.

RULES THE PAGE KEEPS
--------------------
* Every item names its source and the day it was last checked; coverage.py
  holds made-in-egypt.json to a review interval (HAND_CURATED), like every
  other hand-compiled sheet.
* A fair-price line or a "how to tell" line appears only with its own source.
  No item carries a price or an authenticity claim of our own.
* Maker links go to the maker's own site or account, never through a
  referral or affiliate link (coverage.py refuses a link that carries a
  referral tag), and the page says EgyBI takes no payment from anyone listed.
* No images: we link to the makers rather than copy their pictures.
* `near` names the measured visitor sites (visit-climate.json keys) an item
  is made near; the visit pages show those items under "Made near here" and
  the planner shows them on that stop's card.
"""
import json
import os

from . import egfmt
from .common import SITE, SITE_URL, breadcrumb, chrome, esc, page, read_text, write_text

PAGE = 'made-in-egypt.html'
DATA = os.path.join(SITE, 'data', 'made-in-egypt.json')
GLYPH = {'cairo': 'scroll', 'around-cairo': 'reed', 'nile': 'reed', 'oases': 'ra', 'makers': 'ankh',
         'food': 'reed', 'where-to-buy': 'scroll', 'warnings': 'maat'}
CSS = """
.mie-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr)); }
.mie-card { margin: 0; }
.mie-card h3 { font-size: var(--fs-lg); margin: 0 0 6px; scroll-margin-top: 90px; }
.mie-card > p { margin: 0 0 10px; }
.mie-card dl { margin: 0; display: grid; grid-template-columns: minmax(0, 9em) minmax(0, 1fr); gap: 6px 12px; }
.mie-card dt { font-weight: 600; }
.mie-card dd { margin: 0; overflow-wrap: anywhere; }
@media (max-width: 480px) { .mie-card dl { grid-template-columns: minmax(0, 1fr); gap: 2px; } .mie-card dd { margin-bottom: 8px; } }
.mie-src { margin-top: 10px; }
.mie-note { margin: 0 0 14px; max-width: 72ch; }
.mie-disclose { border-left: 3px solid var(--accent, #b8860b); padding-left: 12px; }
"""


def load() -> dict:
    return json.loads(read_text(DATA))


# The card labels, and how a checked date is written. Kept as arguments so the
# translation script that writes this page's catalogue lines can render the
# same cards in Arabic and Russian and pair them with the English, unit for
# unit (the generator itself always writes English; i18n.py makes the twins).
LABELS = {'made': 'Made in', 'find': 'Where to find it', 'watch': 'See it made', 'price': 'What it costs',
          'genuine': 'Real or imitation', 'maker': 'Maker or seller', 'source': 'Source: %s.',
          'checked': 'Checked %s.'}


def _en_date(d: str) -> str:
    return egfmt.time_tag(d, 'en', 'prose')


def _src(o: dict, k: str = 'source') -> str:
    """A cited source: its name as a link, or plain text when there is no link
    (coverage.py then requires the text to say what was searched)."""
    if o.get(k + '_url'):
        return f'<a href="{esc(o[k + "_url"])}" rel="noopener">{esc(o[k])}</a>'
    return esc(o.get(k, ''))


def card_html(r: dict, L: dict = LABELS, date=_en_date) -> str:
    rows = []
    for k in ('made', 'find', 'watch'):
        if r.get(k):
            rows.append((L[k], esc(r[k])))
    for k in ('price', 'genuine'):
        if r.get(k):
            o = r[k]
            rows.append((L[k], f'{esc(o["text"])} <span class="fp-src">{_src(o)}</span>'))
    if r.get('maker_url'):
        rows.append((L['maker'], f'<a href="{esc(r["maker_url"])}" rel="noopener">{esc(r["maker"])}</a>'))
    elif r.get('maker'):
        rows.append((L['maker'], esc(r['maker'])))
    dl = '<dl>' + ''.join(f'<dt>{k}</dt><dd>{v}</dd>' for k, v in rows) + '</dl>' if rows else ''
    return (f'<article class="sheet mie-card" data-item="{esc(r["key"])}">'
            f'<h3 id="{esc(r["key"])}">{esc(r["item"])}</h3>'
            f'<p>{esc(r["what"])}</p>{dl}'
            f'<p class="fp-src mie-src">{L["source"] % _src(r)} {L["checked"] % date(r["checked"])}</p></article>')


def group_html(g: dict, alt: bool, L: dict = LABELS, date=_en_date) -> str:
    cards = ''.join(card_html(r, L, date) for r in g['rows'])
    note = ''
    if g.get('note'):
        src = f' <span class="fp-src">{_src(g, "note_source")}</span>' if g.get('note_source') else ''
        note = f'<p class="chart-cap mie-note">{esc(g["note"])}{src}</p>'
    return f"""
<section class="{'surface-light-2' if alt else 'surface-light'}" id="{esc(g['key'])}" data-nav="{esc(g['title'])}">
  <div class="wrap" style="max-width:1040px;">
    <h2 class="kicker"><span data-glyph="{GLYPH.get(g['key'], 'scroll')}"></span>{esc(g['title'])}</h2>
    {note}<div class="mie-grid">{cards}</div>
  </div>
</section>"""


def items_near(key: str) -> list:
    """The items made near one measured site, for its visit page."""
    if not os.path.isfile(DATA):
        return []
    return [r for g in load().get('groups', []) for r in g.get('rows', []) if key in r.get('near', [])]


def near_section(key: str, name: str) -> str:
    """The "Made near here" block of a visit page ('' when nothing is listed)."""
    items = items_near(key)
    if not items:
        return ''
    chips = ''.join(f'<a class="chip" href="../{PAGE}#{esc(r["key"])}">{esc(r["item"])}</a>' for r in items)
    return f"""    <div id="made-near">
    <h2 style="font-size:var(--fs-lg);margin:0 0 12px;">Made near here</h2>
    <div class="chip-row">{chips}</div>
    <p class="chart-cap" style="margin:12px 0 28px;">Crafts and goods made near {esc(name)}, each with where to find it and its source. EgyBI takes no payment from any maker. <a href="../{PAGE}">Everything made in Egypt we list &rarr;</a></p>
    </div>
"""


def build_made_in_egypt_page() -> list:
    """Write the page. Returns its sitemap entry ([] if the data file is missing)."""
    if not os.path.isfile(DATA):
        return []
    d = load()
    url = f'{SITE_URL}/{PAGE}'
    title = 'Made in Egypt: crafts and makers to see on your trip · EgyBI'
    desc = ('Real things made in Egypt that you can see being made, buy or try on your trip: where each is made, '
            'where to find it and who makes it, every line with its source.')
    n = sum(len(g['rows']) for g in d['groups'])
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "name": "Made in Egypt", "url": url, "description": desc,
         "isPartOf": {"@id": SITE_URL + "/#site"}},
        breadcrumb("Made in Egypt", url, "Plan a trip", SITE_URL + "/plan.html")]}
    groups = ''.join(group_html(g, i % 2 == 1) for i, g in enumerate(d['groups']))
    body = f"""
<section class="surface-hero" style="padding-top:64px;padding-bottom:44px;">
  <div class="wrap" style="max-width:1040px;">
    <p class="hero-eyebrow"><span data-glyph="ankh"></span> <a href="plan.html">Plan a trip</a> &middot; made in Egypt &middot; every line sourced</p>
    <h1 style="font-size:var(--fs-h1);margin:0 0 12px;">Made in Egypt.</h1>
    <p class="lead" style="margin:0;max-width:68ch;">{esc(d['intro'])}</p>
    <p class="mie-disclose" style="margin:16px 0 0;max-width:68ch;"><strong>{esc(d['disclosure'])}</strong></p>
  </div>
</section>

<nav class="on-this-page" data-wayfinding aria-label="On this page"></nav>
{groups}

<section class="surface-light" id="how" data-nav="How we chose">
  <div class="wrap" style="max-width:1040px;">
    <h2 style="font-size:var(--fs-lg);margin:0 0 12px;">How we chose</h2>
    <p style="max-width:72ch;">{esc(d['method'])}</p>
    <p class="chart-cap">Items listed: {n}. Compiled {egfmt.time_tag(d['as_of'], 'en', 'prose')}.</p>
    <div class="cta-row" style="margin-top:18px;"><a class="btn btn-primary" href="fair-prices.html">What things should cost &rarr;</a>
    <a class="btn btn-ghost" href="plan.html">Plan your days &rarr;</a></div>
  </div>
</section>
"""
    nav, foot = chrome('')
    html = page(title, desc, url, body, ld, extra_head=f'<style>{CSS}</style>', prefix='', nav=nav, foot=foot,
                og_image=f"{SITE_URL}/og-visit.png?v=3")
    write_text(os.path.join(SITE, PAGE), html.replace('<html lang="en">', '<html lang="en" dir="ltr">', 1))
    return [(url, '0.8')]
