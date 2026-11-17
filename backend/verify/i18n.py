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
  GLOSSARY TERM       a translation uses a variant its language's glossary
                      (backend/i18n/glossary-<lang>.tsv) has rejected
  ENGLISH LEAK        an Arabic or Russian page still shows an English
                      sentence from the English page: in its HTML, or in text
                      its inline script writes (About's cards). Strings that
                      external scripts write (glyphs.js) are stage 4

Exits 1 on any failure.
"""
from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
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


# Text nodes that stay as they are in every language, on top of SAME: the
# language button's own label, and data sources, licences and a book title
# named as their owners write them.
NODE_SAME = SAME | {'English', 'geoBoundaries', 'geoBoundaries.org', 'OpenStreetMap', 'SIPRI', 'CAPMAS',
                    'SIL Open Font License 1.1',
                    'Egyptian Grammar'}  # Gardiner's book, cited by title on the hieroglyphs page
NODE_SKIP = {'script', 'style', 'svg', 'code', 'pre', 'noscript', 'template', 'math'}
NODE_VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source',
             'track', 'wbr'}


class _Text(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.out: set[str] = set()

    def handle_starttag(self, tag, attrs):
        if tag not in NODE_VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in self.stack:
            while self.stack and self.stack.pop() != tag:
                pass

    def handle_data(self, d):
        if NODE_SKIP & set(self.stack) or ('head' in self.stack and 'title' not in self.stack):
            return
        d = norm(d).strip(' ·|—-:;,.()')
        if WORD.search(d):
            self.out.add(d)


def text_nodes(h: str) -> set:
    """Every visible text node with a word of three letters or more."""
    p = _Text()
    p.feed(h)
    return p.out


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
            # A second instrument that does not use units(): every visible
            # text node, one word or many. units() is what the generator uses
            # to FIND text, so a check built only on it cannot see text the
            # generator never found - the <label>Arriving<input></label> and
            # the half-translated paragraphs around <code> (2026-11-17)
            # passed every run of the check above.
            en_nodes = {t for t in text_nodes(html['en']) if t not in NODE_SAME}
            node_left = sorted({t for t in text_nodes(html[lang])} & en_nodes)
            if node_left:
                fail(f'ENGLISH LEAK: {lang}/{page} still shows {len(node_left)} English text node(s), '
                     f'e.g. "{node_left[0][:70]}"')

# One term, one translation (2026-11-17). backend/i18n/glossary-<lang>.tsv names
# the word the site uses for each recurring term and, where a rejected variant
# existed, a pattern for it. "Account" was once «аккаунт» on 16 lines and
# «учётная запись» on 13; a reader met both on the same screen. A translation
# that brings a rejected variant back fails here.
for lang in LANGS:
    gpath = ROOT / 'backend' / 'i18n' / f'glossary-{lang}.tsv'
    if not gpath.exists():
        continue
    for gline in gpath.read_text(encoding='utf-8').splitlines():
        if not gline.strip() or gline.startswith('#'):
            continue
        cols = gline.split('\t')
        if len(cols) < 3 or not cols[2].strip():
            continue
        avoid = re.compile(cols[2].strip())
        for en, tr in CATS[lang].items():
            if avoid.search(tr):
                fail(f'GLOSSARY TERM: {lang}.tsv uses a rejected variant for "{cols[0]}" '
                     f'(the glossary says {cols[1]!r}): "{tr[:70]}"')
                break

if fails:
    print(f'\n{len(fails)} i18n failure(s)')
    sys.exit(1)
print(f'i18n: {len(PAGES)} page(s) x 3 languages ({checked} files): twins, lang/dir, canonical, '
      'hreflang, language button, sitemap, no English left behind')
