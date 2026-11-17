"""Find the translatable units of an HTML page, with their exact spans.

A unit is a whole paragraph, heading, list item, table cell, caption, button,
label or link: the element as a reader reads it, with any inline markup
(links, emphasis, code, abbreviations) kept inside it. Translating smaller
pieces than that would split sentences at every link, and Arabic and Russian
word order cannot be rebuilt from English fragments.

Also returned: the attribute values a reader meets (title, alt, aria-label,
placeholder) and the head's title and description texts.

Pure standard library (html.parser), so the build needs nothing new.
"""
from __future__ import annotations

import re
from html.parser import HTMLParser

UNIT_TAGS = {'p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'figcaption', 'caption',
             'summary', 'dt', 'dd', 'label', 'button', 'a', 'span', 'small', 'strong', 'em', 'b',
             'i', 'title', 'option', 'blockquote', 'legend', 'time', 'abbr', 'q', 'cite', 'div'}
INLINE = {'a', 'strong', 'em', 'b', 'i', 'span', 'abbr', 'code', 'small', 'sup', 'sub', 'br',
          'time', 'mark', 'q', 'cite', 'kbd', 'wbr', 'bdi', 'bdo', 'u', 's', 'data', 'var'}
SKIP = {'script', 'style', 'svg', 'code', 'pre', 'noscript', 'template', 'math'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source',
        'track', 'wbr'}
ATTRS = ('title', 'alt', 'aria-label', 'placeholder', 'data-nav')
META_NAMES = {'description', 'twitter:title', 'twitter:description'}
META_PROPS = {'og:title', 'og:description', 'og:image:alt'}
LETTER = re.compile(r'[A-Za-z]')


class _Node:
    __slots__ = ('tag', 'attrs', 'start', 'inner_start', 'inner_end', 'end', 'children', 'text',
                 'parent', 'skip', 'opening')

    def __init__(self, tag, attrs, start, inner_start, parent, opening=''):
        self.tag, self.attrs, self.start, self.inner_start = tag, attrs, start, inner_start
        self.inner_end = self.end = None
        self.children, self.text, self.parent = [], [], parent
        self.skip = tag in SKIP or (parent is not None and parent.skip)
        self.opening = opening


class _P(HTMLParser):
    def __init__(self, src):
        super().__init__(convert_charrefs=False)
        self.src = src
        # absolute offsets of each line start, to turn getpos() into indexes
        self.lines = [0]
        for m in re.finditer('\n', src):
            self.lines.append(m.end())
        self.root = _Node('#root', [], 0, 0, None)
        self.cur = self.root
        self.attr_hits = []      # (abs_start, abs_end, value) for attribute values

    def _pos(self):
        ln, col = self.getpos()
        return self.lines[ln - 1] + col

    def handle_starttag(self, tag, attrs):
        start = self._pos()
        raw = self.get_starttag_text() or ''
        end = start + len(raw)
        self._attrs(tag, attrs, start, raw)
        if tag in VOID:
            n = _Node(tag, attrs, start, end, self.cur, raw)
            n.inner_end = n.end = end
            self.cur.children.append(n)
            return
        n = _Node(tag, attrs, start, end, self.cur, raw)
        self.cur.children.append(n)
        self.cur = n

    def handle_startendtag(self, tag, attrs):
        start = self._pos()
        raw = self.get_starttag_text() or ''
        self._attrs(tag, attrs, start, raw)
        n = _Node(tag, attrs, start, start + len(raw), self.cur, raw)
        n.inner_end = n.end = start + len(raw)
        self.cur.children.append(n)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        start = self._pos()
        node = self.cur
        while node is not self.root and node.tag != tag:
            node = node.parent
        if node is self.root:
            return
        # close everything up to and including `node`
        c = self.cur
        while True:
            if c.inner_end is None:
                c.inner_end = start
                c.end = self.src.index('>', start) + 1
            if c is node:
                break
            c = c.parent
        self.cur = node.parent

    def handle_data(self, data):
        if data.strip():
            self.cur.text.append((self._pos(), data))

    handle_entityref = handle_charref = lambda self, name: None

    def _attrs(self, tag, attrs, start, raw):
        if self.cur.skip or tag in SKIP:
            return
        d = dict(attrs)
        want = [a for a in ATTRS if d.get(a)]
        if tag == 'meta':
            if d.get('name') in META_NAMES or d.get('property') in META_PROPS:
                want.append('content')
        for a in want:
            v = d.get(a)
            if not v or not LETTER.search(v):
                continue
            m = re.search(r'\s%s\s*=\s*("([^"]*)"|\'([^\']*)\')' % re.escape(a), raw)
            if not m:
                continue
            g = 2 if m.group(2) is not None else 3
            self.attr_hits.append((start + m.start(g), start + m.end(g), m.group(g)))


def _all_inline(n: _Node) -> bool:
    for c in n.children:
        # <code> stays inside its sentence, untranslated, as the docstring
        # says; rejecting it (it is in SKIP so nothing INSIDE it becomes a
        # unit) dropped the whole paragraph around it, half-English twins
        # (2026-11-17: privacy, community, stories, streets)
        if c.tag == 'code':
            continue
        if c.tag in SKIP:
            return False
        if c.tag not in INLINE and c.tag != 'img':
            return False
        if not _all_inline(c):
            return False
    return True


def _has_letters(src: str, n: _Node) -> bool:
    inner = re.sub(r'<[^>]+>', ' ', src[n.inner_start:n.inner_end])
    return bool(LETTER.search(inner))


def units(src: str):
    """Return (element_units, attribute_units), each a list of
    (start, end, text) spans into `src`, in document order, not overlapping."""
    p = _P(src)
    p.feed(src)
    p.close()
    out = []

    def walk(n: _Node):
        for c in n.children:
            if c.skip or c.inner_end is None:
                continue
            if (c.tag in UNIT_TAGS and c.inner_end > c.inner_start and _all_inline(c)
                    and _has_letters(src, c)):
                out.append((c.inner_start, c.inner_end, src[c.inner_start:c.inner_end]))
                continue
            # loose text directly inside a container: its own unit. That
            # includes a unit tag that could not be taken whole - a <label>
            # wrapping its <input> ("Arriving"), a <button> with an icon -
            # whose text was otherwise dropped without a word (2026-11-17)
            for pos, data in c.text:
                if LETTER.search(data) and c.tag not in {'html', 'head', 'body'}:
                    s = pos + (len(data) - len(data.lstrip()))
                    e = pos + len(data.rstrip())
                    out.append((s, e, src[s:e]))
            walk(c)

    walk(p.root)
    out.sort()
    attrs = sorted(p.attr_hits)
    return out, attrs


def norm(s: str) -> str:
    """The catalogue key: whitespace collapsed, so re-indenting a page does not
    orphan its translations."""
    return re.sub(r'\s+', ' ', s).strip()


# ---- text inside inline scripts --------------------------------------------
_SCRIPT = re.compile(r'<script\b([^>]*)>(.*?)</script>', re.S)
NL, BS = chr(10), chr(92)   # newline and backslash, spelled out so no shell can eat them


def _js_strings(code: str, base: int):
    """Spans of quoted string literals in JavaScript source, skipping
    comments. Template literals are left alone (they hold markup and code)."""
    out, i, n = [], 0, len(code)
    while i < n:
        c = code[i]
        if c == '/' and i + 1 < n and code[i + 1] == '/':
            j = code.find(NL, i)
            i = n if j == -1 else j
        elif c == '/' and i + 1 < n and code[i + 1] == '*':
            j = code.find('*/', i + 2)
            i = n if j == -1 else j + 2
        elif c in ('"', "'"):
            j = i + 1
            while j < n and code[j] != c and code[j] != NL:
                j += 2 if code[j] == BS else 1
            if j < n and code[j] == c:
                out.append((base + i + 1, base + j, code[i + 1:j]))
            i = j + 1
        elif c == '`':
            j = i + 1
            while j < n and code[j] != '`':
                j += 2 if code[j] == BS else 1
            i = j + 1
        else:
            i += 1
    return out


def script_strings(src: str):
    """(start, end, text) for every quoted string in the page's inline
    scripts (not JSON-LD, not speculation rules, not external scripts)."""
    out = []
    for m in _SCRIPT.finditer(src):
        attrs = m.group(1)
        if 'src=' in attrs or 'ld+json' in attrs or 'speculationrules' in attrs:
            continue
        out += _js_strings(m.group(2), m.start(2))
    return out


def prose(text: str) -> bool:
    """A string a reader would read: at least two words of three letters or more."""
    return len(re.findall(r'[A-Za-z]{3,}', text)) >= 2 and ' ' in text and '<' not in text
