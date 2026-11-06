#!/usr/bin/env python3
"""
Static price summaries, and the Arabic prices page.

WHY THIS EXISTS
---------------
prices.html renders every price in the browser from data/prices-today.json,
so the HTML a crawler receives held 158 words and not one price. And the page
was English-first (lang="en", English title and H1) for a subject Egyptians
search in Arabic — "أسعار الخضار اليوم" — every single day.

This script, run after each daily price refresh, writes:

  site/prices.html     a static "today's biggest moves" block between the
                       PRICE-SUMMARY markers, plus hreflang links to the
                       Arabic page between the HREFLANG markers. Nothing
                       else in the file is touched.
  site/prices-ar.html  the same page with an Arabic head (lang, title,
                       description, canonical, social tags, JSON-LD), an
                       Arabic hero and an Arabic summary. It is DERIVED from
                       prices.html on every run, never edited by hand, so the
                       two cannot drift: the interactive part (cards, filters,
                       charts) is the same script reading the same JSON.

It lives at the site root rather than under /ar/ on purpose: the page's
script fetches data/… and assets/… by relative path, and one folder down every
one of those would 404.

Every substitution must match exactly once. If prices.html is restructured so
an anchor moves, the run fails naming the anchor, rather than writing an
Arabic page with an English head.

Figures come only from prices-today.json (retail view): the date the portal
gave, how many items rose and fell against the previous day, and the five
largest moves each way. No interpretation is added.

Run:  python backend/pipeline/build_prices_pages.py
"""
from __future__ import annotations

import html
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE = os.path.join(ROOT, 'site')
EN_PAGE = os.path.join(SITE, 'prices.html')
AR_PAGE = os.path.join(SITE, 'prices-ar.html')
DATA = os.path.join(SITE, 'data', 'prices-today.json')
SITE_URL = 'https://egybi.com'
EN_URL = f'{SITE_URL}/prices.html'
AR_URL = f'{SITE_URL}/prices-ar.html'
TOP_N = 5

MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
             'August', 'September', 'October', 'November', 'December']
MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو',
             'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

SUMMARY_START, SUMMARY_END = '<!-- PRICE-SUMMARY:start -->', '<!-- PRICE-SUMMARY:end -->'
HREFLANG_START, HREFLANG_END = '<!-- HREFLANG:start -->', '<!-- HREFLANG:end -->'
# Where the summary goes the first time, before the markers exist.
SUMMARY_ANCHOR = '<!-- CURRENCY BAND (fx.js) -->'


class AnchorError(RuntimeError):
    pass


def esc(s) -> str:
    return html.escape(str(s if s is not None else ''), quote=True)


def fmt_num(n) -> str:
    if n is None:
        return ''
    if float(n).is_integer():
        return f"{int(n):,}"
    return f"{n:,.2f}".rstrip('0').rstrip('.')


def fmt_date(iso: str, months: list[str]) -> str:
    y, m, d = (int(x) for x in iso.split('-'))
    return f"{d} {months[m - 1]} {y}"


def swap(text: str, old: str, new: str, what: str) -> str:
    n = text.count(old)
    if n != 1:
        raise AnchorError(f"{what}: expected exactly 1 match in prices.html, found {n}")
    return text.replace(old, new)


def swap_re(text: str, pattern: str, new: str, what: str) -> str:
    rx = re.compile(pattern, re.S)
    n = len(rx.findall(text))
    if n != 1:
        raise AnchorError(f"{what}: expected exactly 1 match in prices.html, found {n}")
    return rx.sub(lambda _m: new, text)


def put_block(text: str, start: str, end: str, body: str, anchor: str, before: bool = True) -> str:
    """Replace the content between start/end markers, or insert the block at anchor."""
    block = f"{start}\n{body}\n{end}"
    if start in text and end in text:
        return re.sub(re.escape(start) + r'.*?' + re.escape(end), lambda _m: block, text, count=1, flags=re.S)
    if text.count(anchor) != 1:
        raise AnchorError(f"insertion point {anchor!r}: expected exactly 1 match, found {text.count(anchor)}")
    return text.replace(anchor, (block + '\n' + anchor) if before else (anchor + '\n' + block))


def movers(items: list[dict]) -> tuple[list[dict], list[dict], int, int]:
    priced = [i for i in items if isinstance(i.get('change_pct'), (int, float))]
    rose = sorted((i for i in priced if i['change_pct'] > 0), key=lambda i: -i['change_pct'])
    fell = sorted((i for i in priced if i['change_pct'] < 0), key=lambda i: i['change_pct'])
    return rose[:TOP_N], fell[:TOP_N], len(rose), len(fell)


def item_line(i: dict, lang: str) -> str:
    pct = i['change_pct']
    arrow = '▲ +' if pct > 0 else '▼ '
    rng = f"{fmt_num(i.get('min'))}–{fmt_num(i.get('max'))}"
    unit = esc(i.get('unit') or '')
    if lang == 'ar':
        return (f"<li><strong>{esc(i.get('name_ar'))}</strong>: {rng} جنيه / {unit} "
                f"<span class=\"chg {'up' if pct > 0 else 'down'}\">{arrow}{pct}%</span></li>")
    name = esc(i.get('name_en') or i.get('name_ar'))
    return (f"<li><strong>{name}</strong> <span lang=\"ar\" dir=\"rtl\">{esc(i.get('name_ar'))}</span>: "
            f"{rng} EGP / <span lang=\"ar\">{unit}</span> "
            f"<span class=\"chg {'up' if pct > 0 else 'down'}\">{arrow}{pct}%</span></li>")


def summary_html(data: dict, lang: str) -> str:
    v = data['retail']
    items, as_of = v['items'], v['as_of']
    top_up, top_down, n_up, n_down = movers(items)
    src = data['source']
    if lang == 'ar':
        head = f"أكبر تحركات الأسعار اليوم، {fmt_date(as_of, MONTHS_AR)}"
        lead = (f"في {fmt_date(as_of, MONTHS_AR)} نشرت {esc(src.get('name_ar'))} أسعار التجزئة لـ {len(items)} صنف. "
                f"غلي سعر {n_up} صنف ورخص سعر {n_down} مقارنةً باليوم اللي قبله. "
                f"كل رقم هو أقل وأعلى سعر في المنافذ، بالجنيه المصري.")
        up_h, down_h = 'غلت أكتر حاجة', 'رخصت أكتر حاجة'
        dir_attr = ' dir="rtl" lang="ar"'
    else:
        head = f"Today's biggest price moves, {fmt_date(as_of, MONTHS_EN)}"
        lead = (f"On {fmt_date(as_of, MONTHS_EN)} the official price portal listed retail prices for "
                f"{len(items)} items: {n_up} rose and {n_down} fell against the previous day. "
                f"Each figure is the minimum–maximum range across outlets, in Egyptian pounds.")
        up_h, down_h = 'Rose most', 'Fell most'
        dir_attr = ''
    up_list = ''.join(item_line(i, lang) for i in top_up) or '<li>—</li>'
    down_list = ''.join(item_line(i, lang) for i in top_down) or '<li>—</li>'
    return (f'<section class="surface-light" id="today-summary"{dir_attr}>\n'
            f'  <div class="wrap">\n'
            f'    <h2>{esc(head)}</h2>\n'
            f'    <p class="lead">{lead}</p>\n'
            f'    <div class="ns-grid">\n'
            f'      <div><h3>▲ {up_h}</h3><ul class="plain-list">{up_list}</ul></div>\n'
            f'      <div><h3>▼ {down_h}</h3><ul class="plain-list">{down_list}</ul></div>\n'
            f'    </div>\n'
            f'  </div>\n'
            f'</section>')


def hreflang_html() -> str:
    return (f'<link rel="alternate" hreflang="en" href="{EN_URL}">\n'
            f'<link rel="alternate" hreflang="ar" href="{AR_URL}">\n'
            f'<link rel="alternate" hreflang="x-default" href="{EN_URL}">')


AR_TITLE = 'أسعار الخضار والفاكهة اليوم في مصر — محدّثة يوميًا | EgyBI'
# seo.py caps descriptions at 165 characters; keep this one under 155.
AR_DESC = ('أسعار الخضار والفاكهة واللحوم والسلع في مصر النهارده، تجزئة وجملة، من بوابة الأسعار '
           'الرسمية. كل سعر بمصدره وتاريخه وتغيّره عن امبارح.')
AR_OG_TITLE = 'أسعار المنتجات اليوم في مصر — EgyBI'


def build_ar(en: str, data: dict) -> str:
    ar = en
    ar = swap(ar, '<html lang="en" dir="ltr">', '<html lang="ar" dir="ltr">', 'html lang')
    ar = swap_re(ar, r'<title>.*?</title>', f'<title>{esc(AR_TITLE)}</title>', 'title')
    ar = swap_re(ar, r'<meta name="description" content="[^"]*">',
                 f'<meta name="description" content="{esc(AR_DESC)}">', 'meta description')
    ar = swap(ar, f'<link rel="canonical" href="{EN_URL}">', f'<link rel="canonical" href="{AR_URL}">', 'canonical')
    ar = swap(ar, f'<meta property="og:url" content="{EN_URL}">', f'<meta property="og:url" content="{AR_URL}">', 'og:url')
    ar = swap_re(ar, r'<meta property="og:title" content="[^"]*">',
                 f'<meta property="og:title" content="{esc(AR_OG_TITLE)}">', 'og:title')
    ar = swap_re(ar, r'<meta property="og:description" content="[^"]*">',
                 f'<meta property="og:description" content="{esc(AR_DESC)}">', 'og:description')
    ar = swap_re(ar, r'<meta name="twitter:title" content="[^"]*">',
                 f'<meta name="twitter:title" content="{esc(AR_OG_TITLE)}">', 'twitter:title')
    ar = swap_re(ar, r'<meta name="twitter:description" content="[^"]*">',
                 f'<meta name="twitter:description" content="{esc(AR_DESC)}">', 'twitter:description')
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": AR_URL + "#page", "url": AR_URL, "name": "أسعار الخضار والفاكهة اليوم في مصر",
         "isPartOf": {"@id": SITE_URL + "/#site"}, "publisher": {"@id": SITE_URL + "/#org"}, "inLanguage": "ar",
         "dateModified": data['retail']['as_of']},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "EgyBI", "item": SITE_URL + "/"},
            {"@type": "ListItem", "position": 2, "name": "أسعار اليوم", "item": AR_URL}]}]}
    ar = swap_re(ar, r'<script type="application/ld\+json">.*?</script>',
                 '<script type="application/ld+json">\n' + json.dumps(ld, ensure_ascii=False) + '\n</script>', 'JSON-LD')
    ar = swap_re(ar, r'<h1 style="font-size:clamp\(1\.8rem,4\.2vw,2\.7rem\);margin:0 0 12px;">.*?</h1>',
                 '<h1 style="font-size:clamp(1.8rem,4.2vw,2.7rem);margin:0 0 12px;" dir="rtl"><span data-glyph="ra"></span> '
                 'أسعار الخضار والفاكهة والسلع في مصر النهارده.</h1>', 'hero H1')
    ar = swap_re(ar, r'<p class="lead" style="margin:0 auto;">The retail and wholesale prices.*?</p>',
                 '<p class="lead" style="margin:0 auto;" dir="rtl">أسعار التجزئة والجملة اللي الناس بتدفعها فعلًا، '
                 'مقسّمة حسب القسم، من بوابة الأسعار الرسمية اللي بتتحدّث كل يوم. كل رقم بمصدره وتاريخه. '
                 '<a href="prices.html" lang="en" dir="ltr">Read in English &rarr;</a></p>', 'hero lead')
    ar = put_block(ar, SUMMARY_START, SUMMARY_END, summary_html(data, 'ar'), SUMMARY_ANCHOR)
    banner = ('<!-- GENERATED by backend/pipeline/build_prices_pages.py from prices.html. '
              'Do not edit by hand: edit prices.html and rerun. -->\n')
    return swap(ar, '<!DOCTYPE html>\n', '<!DOCTYPE html>\n' + banner, 'doctype')


def build_en(en: str, data: dict) -> str:
    en = put_block(en, HREFLANG_START, HREFLANG_END, hreflang_html(), '</head>')
    en = put_block(en, SUMMARY_START, SUMMARY_END, summary_html(data, 'en'), SUMMARY_ANCHOR)
    link = ' <a href="prices-ar.html" lang="ar" dir="rtl">اقرأ الصفحة بالعربي &larr;</a>'
    lead_end = 'أسعار التجزئة والجملة الرسمية، بتتحدّث كل يوم.'
    if link not in en:
        en = swap(en, lead_end + '</p>', lead_end + link + '</p>', 'English hero lead (Arabic link)')
    return en


def main() -> int:
    data = json.load(io.open(DATA, encoding='utf-8'))
    if not data.get('retail', {}).get('items') or not data['retail'].get('as_of'):
        print('::error::prices-today.json has no retail items or no as_of; refusing to write pages', file=sys.stderr)
        return 1
    en_src = io.open(EN_PAGE, encoding='utf-8').read()
    try:
        en_out = build_en(en_src, data)
        ar_out = build_ar(en_out, data)
    except AnchorError as e:
        print(f"::error::{e}", file=sys.stderr)
        return 1
    for path, text in ((EN_PAGE, en_out), (AR_PAGE, ar_out)):
        old = io.open(path, encoding='utf-8').read() if os.path.isfile(path) else None
        if text != old:
            io.open(path, 'w', encoding='utf-8', newline='\n').write(text)
            print(f"wrote {os.path.relpath(path, ROOT)}")
        else:
            print(f"unchanged {os.path.relpath(path, ROOT)}")
    up, down, n_up, n_down = movers(data['retail']['items'])
    print(f"retail as_of {data['retail']['as_of']}: {len(data['retail']['items'])} items, {n_up} rose, {n_down} fell")
    return 0


if __name__ == '__main__':
    sys.exit(main())
