#!/usr/bin/env python3
"""Every translated page has its twins, says which language it is, links its
twins both ways, offers the language button, and carries no English left
behind. (Trilingual stage 1, 2026-11-16.)

For each page in backend/pipeline/pages/i18n.py PAGES:
  TWIN MISSING        site/ar/<page> or site/ru/<page> does not exist
  LANG/DIR WRONG      <html lang dir> is not en/ltr, ar/rtl, ru/ltr
  CANONICAL WRONG     the canonical is not the page's own address
  HREFLANG MISSING    not all of en, ar, ru and x-default, or not pointing at
                      the three versions
  NO SWITCHER         the language button is missing, or one of its three
                      links does not lead to an existing file
  NOT IN SITEMAP      a twin's address is missing from sitemap.xml
  ENGLISH LEAK        an Arabic or Russian page still shows an English
                      sentence from the English page: in its HTML, or in text
                      its inline script writes (About's cards). Strings that
                      external scripts write (glyphs.js) are stage 4

Exits 1 on any failure.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / 'site'
sys.path.insert(0, str(ROOT / 'backend' / 'pipeline'))
from pages.i18n import LANGS, PAGES, load_catalogue, page_url  # noqa: E402
from pages.i18n_units import norm, prose, script_strings, units  # noqa: E402

URL = 'https://egybi.com'
WANT = {'en': 'ltr', 'ar': 'rtl', 'ru': 'ltr'}
# Unit texts that are the same in every language: names, addresses, codes.
SAME = {'EgyBI', 'egybi.com', 'hello@egybi.com', 'aboutads.info/choices', 'Google AdSense',
        'Chronologie des pharaonischen Ägypten', 'SQL', 'Cinzel',
        'you@example.com',  # the e-mail field's example address
        # product and database names, kept as their makers write them
        'Our World in Data', 'FAO AQUASTAT', 'QS Rankings'}
CATS = {l: load_catalogue(l) for l in LANGS}
WORD = re.compile(r'[A-Za-z]{3,}')

fails: list[str] = []


def fail(m: str) -> None:
    print('FAIL ' + m)
    fails.append(m)


def text(s: str) -> str:
    return norm(re.sub(r'<[^>]+>', ' ', s))


sitemap = (SITE / 'sitemap.xml').read_text(encoding='utf-8') if (SITE / 'sitemap.xml').exists() else ''
checked = 0
for page in PAGES:
    paths = {'en': SITE / page, 'ar': SITE / 'ar' / page, 'ru': SITE / 'ru' / page}
    html = {}
    for lang, p in paths.items():
        if not p.exists():
            fail(f'TWIN MISSING: {p.relative_to(SITE).as_posix()}')
            continue
        html[lang] = p.read_text(encoding='utf-8')
    for lang, h in html.items():
        where = f'{lang}/{page}' if lang != 'en' else page
        m = re.search(r'<html\b[^>]*>', h)
        tag = m.group(0) if m else ''
        if f'lang="{lang}"' not in tag or f'dir="{WANT[lang]}"' not in tag:
            fail(f'LANG/DIR WRONG: {where} opens with {tag or "no <html> tag"}')
        own = page_url(lang, page)
        if f'<link rel="canonical" href="{own}">' not in h:
            fail(f'CANONICAL WRONG: {where} does not name {own} as its canonical')
        alts = dict(re.findall(r'<link rel="alternate" hreflang="([a-z-]+)" href="([^"]+)">', h))
        want = {l: page_url(l, page) for l in ('en', 'ar', 'ru')}
        want['x-default'] = page_url('en', page)
        if alts != want:
            fail(f'HREFLANG MISSING: {where} has {sorted(alts)} pointing at {sorted(set(alts.values()))}')
        sw = re.search(r'<details class="lang-switch">.*?</details>', h, flags=re.S)
        links = re.findall(r'href="([^"]+)"', sw.group(0)) if sw else []
        base = paths[lang].parent
        bad = [l for l in links if not (base / l).resolve().exists()]
        if not sw or len(links) != 3 or bad:
            fail(f'NO SWITCHER: {where} ' + ('has no language button' if not sw else f'button links {links}, broken {bad}'))
        if lang != 'en' and own not in sitemap:
            fail(f'NOT IN SITEMAP: {own}')
        checked += 1
    # English left behind: a unit of the twin whose text is a sentence of the English page
    if 'en' in html:
        u, a = units(html['en'])
        english = {text(t) for _, _, t in u + a}
        english = {t for t in english if t not in SAME and len(WORD.findall(t)) >= 2}
        for lang in ('ar', 'ru'):
            if lang not in html:
                continue
            tu, ta = units(html[lang])
            left = sorted({text(t) for _, _, t in tu + ta} & english)
            # ...and text the page's inline script writes (About's cards),
            # which the static units cannot see: any English string there that
            # reads as prose, or that the catalogue was meant to translate.
            en_code = {norm(t) for _, _, t in script_strings(html['en'])}
            en_code = {t for t in en_code if t not in SAME and (prose(t) or t in CATS[lang])}
            left += sorted({norm(t) for _, _, t in script_strings(html[lang])} & en_code)
            if left:
                fail(f'ENGLISH LEAK: {lang}/{page} still shows {len(left)} English unit(s), e.g. "{left[0][:70]}"')

if fails:
    print(f'\n{len(fails)} i18n failure(s)')
    sys.exit(1)
print(f'i18n: {len(PAGES)} page(s) x 3 languages ({checked} files): twins, lang/dir, canonical, '
      'hreflang, language button, sitemap, no English left behind')
