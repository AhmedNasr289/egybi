"""Arabic and Russian twins of English pages (trilingual stage 1, 2026-11-16).

English stays where it is. For every page in PAGES this writes site/ar/<page>
and site/ru/<page> from the English page as it stands after the rest of the
build, by replacing each translatable unit (i18n_units.py) with its entry in
backend/i18n/<lang>.tsv, then:

  - <html lang dir> for the language (Arabic right to left);
  - every relative path one level up, and links to pages that have a twin
    kept in the same language;
  - canonical, og:url and the JSON-LD url and inLanguage pointing at the twin;
  - hreflang links for en, ar, ru and x-default on all three versions;
  - the language button in the header (and plain links in the phone menu),
    built as links so it works without JavaScript;
  - the language's fonts (Google Fonts only) and assets/i18n.css;
  - a line saying the translation awaits a native speaker's review.

The English page gets the same head block and button between generator
markers, so it links to its twins.

The build fails, rather than shipping a half-English page, when a unit has no
translation or a translation does not carry exactly the source's tags.
"""
from __future__ import annotations

import hashlib
import json
import os
import re

from .common import SITE, SITE_URL, read_text, write_text
from .i18n_units import norm, script_strings, units

PAGES = ['about.html', 'privacy.html', 'index.html', 'plan.html', 'fair-prices.html',
         'hieroglyphs.html', 'dossier.html', 'ask.html',
         'visit.html', 'community.html', 'places.html', 'geospatial.html',
         'stories.html', 'streets.html', 'arriving-in-egypt.html', 'made-in-egypt.html']

LANGS = {
    'ar': {'dir': 'rtl', 'label': 'العربية', 'short': 'عربي',
           'fonts': 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Sans+Arabic:wght@400;500;600;700&display=swap',
           'note': 'ترجم EgyBI هذه الصفحة، والترجمة بانتظار مراجعة متحدث أصلي باللغة العربية.',
           'menu': 'اللغة'},
    'ru': {'dir': 'ltr', 'label': 'Русский', 'short': 'RU',
           'fonts': 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&display=swap',
           'note': 'Эту страницу перевёл EgyBI; перевод ждёт проверки носителем языка.',
           'menu': 'Язык'},
}
EN = {'label': 'English', 'short': 'EN', 'menu': 'Language'}
CSS_V, JS_V = 1, 1
CAT_DIR = os.path.join(os.path.dirname(SITE), 'backend', 'i18n')
TAG = re.compile(r'<[^>]+>')
# Attribute values a reader sees (a tooltip, alt text) are translated with the
# text around them; everything else in a tag - href, class, id, data-* - must
# match the English exactly, so a translation cannot move a link or a hook.
READABLE_ATTR = re.compile(r'(?<=[\s])(title|alt|aria-label|placeholder)="[^"]*"')


def tag_shape(s: str) -> list:
    """A unit's tags with the readable attribute values blanked, in order-free form."""
    return sorted(READABLE_ATTR.sub(r'\1=""', t) for t in TAG.findall(s))


GLOBE = ('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
         'stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/>'
         '<path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>')


def load_catalogue(lang: str) -> dict:
    path = os.path.join(CAT_DIR, f'{lang}.tsv')
    cat = {}
    for n, line in enumerate(read_text(path).split('\n'), 1):
        line = line.rstrip('\r')
        if not line.strip():
            continue
        if line.count('\t') != 1:
            raise SystemExit(f'{lang}.tsv line {n}: expected one tab between English and translation')
        en, tr = line.split('\t')
        en, tr = norm(en), tr.strip()
        if en in cat:
            raise SystemExit(f'{lang}.tsv line {n}: duplicate entry for {en[:60]!r}')
        if tag_shape(en) != tag_shape(tr):
            raise SystemExit(f'{lang}.tsv line {n}: the translation does not carry the same tags as the English')
        cat[en] = tr
    return cat


def _url(lang: str, page: str) -> str:
    """A page's public address in one language. The home page is the folder
    itself (egybi.com/, egybi.com/ar/), the address its canonical has always
    named, so hreflang, canonical and sitemap all agree on one URL."""
    path = '' if page == 'index.html' else page
    return f'{SITE_URL}/{path}' if lang == 'en' else f'{SITE_URL}/{lang}/{path}'


page_url = _url


# ---- text the site's scripts write -----------------------------------------
# A script asks for a string as t('English text'); egybi.js looks it up in
# EGYBI_STRINGS, which a translated page loads from assets/i18n/<lang>.js.
# The table is built here from the same catalogue as the page text, and the
# build stops if any string a script asks for has no translation.
ASSETS = os.path.join(SITE, 'assets')
T_CALL = re.compile(r"\bt\('((?:[^'\\]|\\.)*)'\)")
STRINGS_V = {}   # lang -> content hash, set by write_strings()


def script_keys() -> list:
    """Every t('...') string in the site's own scripts, sorted."""
    keys = set()
    for name in sorted(os.listdir(ASSETS)):
        if name.endswith('.js'):
            src = read_text(os.path.join(ASSETS, name))
            for m in T_CALL.finditer(src):
                keys.add(re.sub(r'\\(.)', r'\1', m.group(1)))
    return sorted(keys)


# Data files whose visible text a script passes through t() as it renders
# them, with the fields that are shown. Sources that have a link are
# publication titles and stay as published; a source with no link is our own
# words ("Searched ...: no verifiable published price"), so it is translated.
DATA_TEXT = {
    'fair-prices.json': {'top': ('note',), 'group': ('title', 'note'),
                         'row': ('item', 'unit', 'note', 'conflict', 'kind')},
    # The planner's leg cards show a row's label and value (plan.js legHowHtml).
    # Only the rows a leg names in getting-around.json are shown by script.
    'arrival.json': {'top': (), 'group': (), 'row': ('label', 'value'),
                     'only_leg_rows': 'getting-around.json'},
    # The heat page names the measured sites in the page's language (visit.js
    # siteName, 2026-11-18): Russian pages through this table; Arabic pages
    # use the file's own name_ar, and the Arabic table repeats it.
    'visit-climate.json': {'top': (), 'group': (), 'row': (), 'lists': {'sites': ('name',)}},
    # The planner's stop cards name the items made near a stop (plan.js madeNearHtml).
    # Only items made near a site appear there (rows with a "near" list).
    'made-in-egypt.json': {'top': (), 'group': (), 'row': ('item',), 'no_sources': True, 'only_near': True},

    # Holiday names and notes, and the capacity facts, shown by the home page
    # and the planner (home.js renderEvents, plan.js renderDossier).
    # District names, eras and descriptions on streets.html (streets.js,
    # 2026-11-19, maps plan stage 3). Arabic pages use the data's name_ar.
    'streets-districts.json': {'top': (), 'group': (), 'row': (), 'lists': {'districts': ('name', 'era', 'why')}},
    'calendar.json': {'top': (), 'group': (), 'row': (),
                      'lists': {'events': ('name', 'note'), 'capacity': ('place', 'fact')}},
}


def data_keys() -> list:
    """Every visible string in DATA_TEXT's files, sorted."""
    keys = set()
    for name, f in DATA_TEXT.items():
        d = json.loads(read_text(os.path.join(SITE, 'data', name)))
        only = None
        if f.get('only_leg_rows'):
            guide = json.loads(read_text(os.path.join(SITE, 'data', f['only_leg_rows'])))
            only = {k for leg in guide.get('legs', []) for k in leg.get('rows', [])}
        keys.update(d[k] for k in f['top'] if d.get(k))
        for g in d.get('groups', []):
            keys.update(g[k] for k in f['group'] if g.get(k))
            for r in g.get('rows', []):
                if only is not None and r.get('key') not in only:
                    continue
                if f.get('only_near') and not r.get('near'):
                    continue
                keys.update(r[k] for k in f['row'] if r.get(k))
                if r.get('source') and not r.get('source_url') and not f.get('no_sources'):
                    keys.add(r['source'])
        for lname, fields in f.get('lists', {}).items():
            for item in d.get(lname, []):
                keys.update(item[k] for k in fields if item.get(k))
    return sorted(keys)


def write_strings(cats: dict) -> None:
    keys = sorted(set(script_keys()) | set(data_keys()))
    for lang in LANGS:
        missing = [k for k in keys if norm(k) not in cats[lang]]
        if missing:
            raise SystemExit(f'i18n {lang}: {len(missing)} script string(s) have no translation, e.g. {missing[0]!r}')
        table = {k: cats[lang][norm(k)] for k in keys}
        # scripts insert these as text (or escaped), so markup would show as
        # literal tags: refuse it on either side
        marked = [k for k, v in table.items() if '<' in k or '<' in v]
        if marked:
            raise SystemExit(f'i18n {lang}: script string {marked[0]!r} or its translation contains markup')
        body = ('/* generated by backend/pipeline/pages/i18n.py from backend/i18n/' + lang + '.tsv; edit those, not this. */\n'
                'window.EGYBI_STRINGS = ' + json.dumps(table, ensure_ascii=False, sort_keys=True, indent=1) + ';\n')
        out = os.path.join(ASSETS, 'i18n', lang + '.js')
        os.makedirs(os.path.dirname(out), exist_ok=True)
        write_text(out, body)
        STRINGS_V[lang] = hashlib.sha256(body.encode('utf-8')).hexdigest()[:8]


def head_block(page: str, lang: str) -> str:
    up = '' if lang == 'en' else '../'
    alts = ''.join(f'<link rel="alternate" hreflang="{l}" href="{_url(l, page)}">\n' for l in ('en', 'ar', 'ru'))
    alts += f'<link rel="alternate" hreflang="x-default" href="{_url("en", page)}">\n'
    fonts = f'<link href="{LANGS[lang]["fonts"]}" rel="stylesheet">\n' if lang in LANGS else ''
    # which pages have a copy in this language, for links that scripts write
    # (trip.js T.url): only translated pages carry it
    if lang in LANGS:
        fonts += f'<meta name="egybi-twins" content="{" ".join(PAGES)}">\n'
    return ('<!-- I18N-HEAD:START - generated by backend/pipeline/pages/i18n.py; edit that, not this. -->\n'
            + alts + fonts
            + f'<link href="{up}assets/i18n.css?v={CSS_V}" rel="stylesheet">\n'
            + f'<script src="{up}assets/lang.js?v={JS_V}" defer></script>\n'
            + (f'<script src="{up}assets/i18n/{lang}.js?v={STRINGS_V[lang]}"></script>\n' if lang in LANGS else '')
            + '<!-- I18N-HEAD:END -->')


def switch_block(page: str, lang: str) -> str:
    cur = EN if lang == 'en' else LANGS[lang]
    items = []
    for l, meta in (('en', EN), ('ar', LANGS['ar']), ('ru', LANGS['ru'])):
        if l == lang:
            href = page
        elif lang == 'en':
            href = f'{l}/{page}'
        else:
            href = f'../{page}' if l == 'en' else f'../{l}/{page}'
        cur_attr = ' aria-current="true"' if l == lang else ''
        items.append(f'<a href="{href}" hreflang="{l}" lang="{l}" data-lang="{l}"{cur_attr}>{meta["label"]}</a>')
    return ('<!-- LANG-SWITCH:START -->'
            f'<details class="lang-switch"><summary aria-label="{cur["menu"]}: {cur["label"]}">{GLOBE} {cur["short"]}</summary>'
            f'<div class="lang-menu">{"".join(items)}</div></details>'
            '<!-- LANG-SWITCH:END -->')


def mobile_links(page: str, lang: str) -> str:
    out = []
    for l, meta in (('en', EN), ('ar', LANGS['ar']), ('ru', LANGS['ru'])):
        if l == lang:
            continue
        href = f'{l}/{page}' if lang == 'en' else (f'../{page}' if l == 'en' else f'../{l}/{page}')
        out.append(f'<a class="nav-only-mobile lang-link" href="{href}" hreflang="{l}" lang="{l}" data-lang="{l}">{meta["label"]}</a>')
    return '<!-- LANG-LINKS:START -->' + ''.join(out) + '<!-- LANG-LINKS:END -->'


def _put(html: str, name: str, block: str, anchor: str, after: bool = False) -> str:
    """Replace the NAME block, or insert it at the anchor the first time."""
    s, e = f'<!-- {name}:START', f'<!-- {name}:END -->'
    i, j = html.find(s), html.find(e)
    if i != -1 and j != -1:
        return html[:i] + block + html[j + len(e):]
    k = html.find(anchor)
    if k == -1:
        raise SystemExit(f'i18n: no {anchor!r} to place the {name} block')
    k = k + len(anchor) if after else k
    return html[:k] + block + ('' if after else '\n') + html[k:]


def chrome(html: str, page: str, lang: str) -> str:
    html = _put(html, 'I18N-HEAD', head_block(page, lang), '</head>')
    html = _put(html, 'LANG-SWITCH', switch_block(page, lang), '<div class="nav-actions">', after=True)
    html = _put(html, 'LANG-LINKS', mobile_links(page, lang), '</nav>')
    return html


def translate(src: str, lang: str, cat: dict, page: str) -> str:
    u, a = units(src)
    spans = list(u) + [x for x in a if not any(s <= x[0] and x[1] <= e for s, e, _ in u)]
    attr_spans = {(s, e) for s, e, _ in a}
    # Text a page's inline script writes (About's sector and fact cards): a
    # quoted string is translated when the catalogue has it, escaped for the
    # quote it sits in. Strings it does not have are code, and stay.
    code_spans = {}
    for s_, e_, t in script_strings(src):
        if norm(t) in cat:
            code_spans[(s_, e_)] = src[s_ - 1]
            spans.append((s_, e_, t))
    missing = []
    out = src
    for s, e, t in sorted(spans, reverse=True):
        k = norm(t)
        tr = cat.get(k)
        if tr is None:
            missing.append(k)
            continue
        if (s, e) in attr_spans and '"' in tr:
            raise SystemExit(f'i18n {lang}/{page}: a translated attribute value contains a double quote: {tr[:60]!r}')
        if (s, e) in code_spans:
            q, bs = code_spans[(s, e)], chr(92)
            tr = tr.replace(bs, bs + bs).replace(q, bs + q)
        out = out[:s] + tr + out[e:]
    if missing:
        raise SystemExit(f'i18n {lang}/{page}: {len(missing)} unit(s) have no translation in {lang}.tsv, e.g. {missing[-1][:80]!r}')
    return out


def relocate(html: str, page: str, lang: str) -> str:
    """Move the page one folder down and point it at its twins."""
    # lang and dir on the <html> tag, keeping whatever else it carries (the
    # stories page has class="no-js"; a pattern for the bare tag missed it
    # and left both translated stories pages lang="en" dir="ltr").
    def html_tag(m):
        tag = re.sub(r'\s(lang|dir)="[^"]*"', '', m.group(0))
        return tag.replace('<html', f'<html lang="{lang}" dir="{LANGS[lang]["dir"]}"', 1)
    html = re.sub(r'<html\b[^>]*>', html_tag, html, count=1)
    # relative paths one level up (not the generated blocks, which are written
    # for this location already, and not absolute, root, fragment or mail links)
    def up(m):
        return f'{m.group(1)}="../{m.group(2)}'
    # Every attribute that holds a site path, named in full. It was (href|src)
    # with \b, which caught data-src only because \b matches after a hyphen,
    # and missed poster: the home page's hero poster 404'd as ar/assets/...
    # (twin-data.js, run 43987216476).
    html = re.sub(r'(?<![\w-])((?:data-)?(?:href|src)|poster|action)="(?!https?:|#|/|\.\./|mailto:|tel:|data:|javascript:)([^"]*)',
                  up, html)
    html = html.replace("base: 'auth/'", "base: '../auth/'")
    html = html.replace("endpoint: 'api/", "endpoint: '../api/")
    # links to pages that have a twin stay in this language
    for p in PAGES:
        html = re.sub(r'(href=")\.\./' + re.escape(p) + r'([#"?])', r'\g<1>' + p + r'\2', html)
        html = html.replace(f'href="/{p}', f'href="/{lang}/{p}')
    if page == 'index.html':
        html = html.replace(f'<link rel="canonical" href="{SITE_URL}/">',
                            f'<link rel="canonical" href="{_url(lang, page)}">')
        html = html.replace(f'<meta property="og:url" content="{SITE_URL}">',
                            f'<meta property="og:url" content="{_url(lang, page)}">')
    html = html.replace(f'"{SITE_URL}/{page}"', f'"{SITE_URL}/{lang}/{page}"')
    html = html.replace(f'"{SITE_URL}/{page}#', f'"{SITE_URL}/{lang}/{page}#')
    html = html.replace('"inLanguage": "en"', f'"inLanguage": "{lang}"')
    note = (f'<p class="i18n-note">{LANGS[lang]["note"]} '
            f'<a href="../{page}" hreflang="en" lang="en">English</a></p>\n')
    html = html.replace('</footer>', note + '</footer>', 1)
    return html


def build_i18n() -> list[tuple[str, str]]:
    """Write the twins, refresh the English pages' blocks; return sitemap entries."""
    cats = {l: load_catalogue(l) for l in LANGS}
    write_strings(cats)
    entries = []
    for page in PAGES:
        en_path = os.path.join(SITE, page)
        en = read_text(en_path)
        en_out = chrome(en, page, 'en')
        if en_out != en:
            write_text(en_path, en_out)
        # the twin is made from the English page WITHOUT its English blocks
        base = en_out
        for name in ('I18N-HEAD', 'LANG-SWITCH', 'LANG-LINKS'):
            base = re.sub(r'<!-- %s:START.*?<!-- %s:END -->\n?' % (name, name), '', base, flags=re.S)
        for lang in LANGS:
            html = translate(base, lang, cats[lang], page)
            html = relocate(html, page, lang)
            html = chrome(html, page, lang)
            out = os.path.join(SITE, lang, page)
            os.makedirs(os.path.dirname(out), exist_ok=True)
            write_text(out, html)
            entries.append((_url(lang, page), '0.5'))
    return entries
