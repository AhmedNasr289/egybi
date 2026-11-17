"""arriving-in-egypt.html: the first 48 hours, from site/data/arrival.json.

WHY
---
First-time visitors are most at sea in their first two days, and the rules
they meet first changed three times in 2026: a card-only digital visa at
Cairo airport from 1 August, a rise due on 1 January 2027, and lookalike
ticket sites. The research behind the solo-traveller plan (reports/Solo
travellers to Egypt needs.md) found no free page that states these facts
with a date and a source. This one does, and nothing else.

RULES THE PAGE KEEPS
--------------------
* Every row names its source and the day it was last checked. coverage.py
  fails a row older than the file's review interval (HAND_CURATED), and a
  row whose "changes_on" date has passed, so a visa price cannot quietly go
  stale after the change it announces.
* No advice the sources do not give. Where the evidence is travellers'
  reports (the Cairo ride-hail cash demands), the row says so.
* The page is in i18n.PAGES, so its Arabic and Russian twins are built from
  the same catalogue as the rest of the site.
"""
import json
import os

from . import egfmt
from .common import SITE, SITE_URL, breadcrumb, chrome, esc, page, read_text, write_text

PAGE = 'arriving-in-egypt.html'
DATA = os.path.join(SITE, 'data', 'arrival.json')
# On a phone the three columns do not fit: until 2026-11-17 the source column
# sat off-screen and every row had to be scrolled sideways to read where it
# came from. Under 600px each row stacks: what, then the answer, then the
# source. verify/overflow.js fails a .fp-stack table that is still wider than
# the screen at 375px.
CSS = """
@media (max-width: 600px) {
  .fp-table.fp-stack thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .fp-table.fp-stack tr { display: block; padding: 10px 0; border-bottom: 1px solid var(--line-light); }
  .fp-table.fp-stack th, .fp-table.fp-stack td { display: block; border: 0; padding: 3px 0; }
}
"""
GLYPH = {'entry': 'ankh', 'money': 'scroll', 'rides': 'ra', 'trains': 'reed', 'emergency': 'maat', 'official': 'scroll'}


def load() -> dict:
    return json.loads(read_text(DATA))


def row_html(r: dict) -> str:
    value = esc(r['value'])
    if r.get('link'):
        value = f'<a href="{esc(r["link"])}" rel="noopener">{value}</a>'
    detail = f'<span class="fp-src">{esc(r["detail"])}</span>' if r.get('detail') else ''
    # A row with no link names what was searched instead (coverage.py holds
    # it to that), so the source cell is plain text rather than a dead link.
    src = (f'<a href="{esc(r["source_url"])}" rel="noopener">{esc(r["source"])}</a>'
           if r.get('source_url') else esc(r['source']))
    return (f'<tr data-row="{esc(r["key"])}"><th scope="row">{esc(r["label"])}{detail}</th>'
            f'<td><strong>{value}</strong></td>'
            f'<td>{src}'
            f'<span class="fp-src">Checked {egfmt.time_tag(r["checked"], "en", "prose")}</span></td></tr>')


def group_html(g: dict, alt: bool) -> str:
    rows = ''.join(row_html(r) for r in g['rows'])
    return f"""
<section class="{'surface-light-2' if alt else 'surface-light'}" id="{esc(g['key'])}" data-nav="{esc(g['title'])}">
  <div class="wrap" style="max-width:960px;">
    <div class="kicker"><span data-glyph="{GLYPH.get(g['key'], 'scroll')}"></span>{esc(g['title'])}</div>
    <div class="sheet fp-wrap">
      <table class="fp-table fp-stack">
        <thead><tr><th scope="col">What</th><th scope="col">What it costs or says</th><th scope="col">Source</th></tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  </div>
</section>"""


def build_arrival_page() -> list:
    """Write the page. Returns its sitemap entry ([] if the data file is missing)."""
    if not os.path.isfile(DATA):
        return []
    d = load()
    url = f'{SITE_URL}/{PAGE}'
    title = 'Arriving in Egypt: visa, money and emergency numbers · EgyBI'
    desc = ('Your first two days in Egypt: which visa to buy and how to pay for it, the cash rules, '
            'Cairo ride-hail and the emergency numbers, each with its source.')
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "name": "Arriving in Egypt", "url": url, "description": desc,
         "isPartOf": {"@id": SITE_URL + "/#site"}},
        breadcrumb("Arriving in Egypt", url, "Plan a trip", SITE_URL + "/plan.html")]}
    groups = ''.join(group_html(g, i % 2 == 1) for i, g in enumerate(d['groups']))
    body = f"""
<section class="surface-hero" style="padding-top:64px;padding-bottom:44px;">
  <div class="wrap" style="max-width:960px;">
    <p class="hero-eyebrow"><span data-glyph="ra"></span> <a href="plan.html">Plan a trip</a> &middot; your first two days &middot; every line sourced</p>
    <h1 style="font-size:var(--fs-h1);margin:0 0 12px;">Arriving in Egypt.</h1>
    <p class="lead" style="margin:0;max-width:68ch;">What to sort out before you land and in your first two days:
    which visa to buy and how to pay for it, the cash rules, ride apps and trains, and the numbers to call
    if something goes wrong. Each line says where it comes from and when we last checked it.</p>
  </div>
</section>

<nav class="on-this-page" data-wayfinding aria-label="On this page"></nav>
{groups}

<section class="surface-light" id="next" data-nav="Next">
  <div class="wrap" style="max-width:960px;">
    <p class="chart-cap">{esc(d['note'])}</p>
    <div class="cta-row" style="margin-top:18px;"><a class="btn btn-primary" href="fair-prices.html">What things should cost &rarr;</a>
    <a class="btn btn-ghost" href="plan.html">Plan your days &rarr;</a></div>
  </div>
</section>
"""
    nav, foot = chrome('')
    html = page(title, desc, url, body, ld, extra_head=f'<style>{CSS}</style>', prefix='', nav=nav, foot=foot,
                og_image=f"{SITE_URL}/og-visit.png?v=3")
    # A page in i18n.PAGES says its direction too (verify/i18n.py, LANG/DIR),
    # as the hand-written translated pages do; page() writes lang alone.
    write_text(os.path.join(SITE, PAGE), html.replace('<html lang="en">', '<html lang="en" dir="ltr">', 1))
    return [(url, '0.9')]
