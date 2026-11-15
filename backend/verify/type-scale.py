"""One type scale, and nothing outside it (study S2, 2026-11-16).

Before S2 the site used 69 font sizes in egybi.css and 56 more in the pages,
so labels that meant the same thing differed by a pixel or two, and a page
title was the same size as a section heading on a phone. S2 mapped them all
onto ten steps defined once in egybi.css :root (typescale.py holds the list).

This check reads egybi.css and every published page (style="" attributes and
<style> blocks), and fails when:
  - a font-size is not a scale token (var(--fs-...)) or a parent-relative em/%,
    outside the glyph, icon and map-label rules typescale.EXEMPT_SELECTORS names
    (OFF-SCALE);
  - egybi.css :root no longer defines a step exactly as typescale.STEPS does
    (TOKEN DRIFT);
  - it inspected too few declarations to mean anything (VACUOUS).

Exits 1 on any of them."""
import glob
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
import typescale as ts  # noqa: E402

DECL = re.compile(r'font-size\s*:\s*([^;"\'}\n]+)')
MIN_DECLS = 700   # 2026-11-16: about 840 across egybi.css and 182 pages

files = [os.path.join(ROOT, 'site', 'assets', 'egybi.css')] + sorted(
    glob.glob(os.path.join(ROOT, 'site', '**', '*.html'), recursive=True))
bad, seen, exempted = [], 0, 0
for path in files:
    text = open(path, encoding='utf-8').read()
    rel = os.path.relpath(path, ROOT).replace(os.sep, '/')
    for m in DECL.finditer(text):
        value = m.group(1).strip()
        sel = ts.selector_at(text, m.start())
        if sel is not None and sel.startswith(':root'):
            continue
        seen += 1
        if ts.on_scale(value):
            continue
        if sel is not None and ts.exempt(sel):
            exempted += 1
            continue
        line = text.count('\n', 0, m.start()) + 1
        bad.append(f'OFF-SCALE  {rel}:{line}  font-size: {value}' + (f'   [{sel[:50]}]' if sel else '   [style attribute]'))

css = open(files[0], encoding='utf-8').read()
for k, v in ts.STEPS.items():
    m = re.search(r'--fs-' + re.escape(k) + r'\s*:\s*([^;]+);', css)
    if not m or m.group(1).strip() != v:
        bad.append(f'TOKEN DRIFT  --fs-{k}: egybi.css has {m.group(1).strip() if m else "nothing"}, typescale.py says {v}')

for b in bad[:40]:
    print(b)
if len(bad) > 40:
    print(f'... and {len(bad) - 40} more')
if seen < MIN_DECLS:
    print(f'VACUOUS: only {seen} font-size declarations across {len(files)} files; expected at least {MIN_DECLS}.')
    sys.exit(1)
print(f'type scale: {seen} font-size declarations in {len(files)} files, '
      f'{exempted} exempt (glyphs, icons, map labels), {len(bad)} off the scale')
sys.exit(1 if bad else 0)
