"""No page loads motion code that cannot do anything on it (study S4, 2026-11-16).

Measured on main before S4 part 1:
  - the Motion One library (vendor/motion.min.js, 24.6 KB) was loaded on 18
    pages, while the only code that used it (motion.js) falls back to the
    browser's IntersectionObserver and behaves the same without it;
  - AOS (vendor/aos.css + aos.js, 40.7 KB) was loaded on 5 pages with no
    [data-aos] element at all (ask, dossier, fair-prices, hieroglyphs, plan);
  - the two prices pages loaded AOS's script without its stylesheet, so it
    could not animate anything.

This reads every published page and fails on:
  RETIRED LIBRARY  a page loads vendor/motion.min.js;
  UNUSED AOS       a page loads aos.css or aos.js but has no data-aos= anywhere;
  HALF AOS         a page loads one of aos.css / aos.js without the other;
  NO JS FLAG       a page loads aos.css without S1's .js flag before it, which
                   is what keeps [data-aos] content visible when scripts fail;
  VACUOUS          fewer than 150 pages read.
Exits 1 on any."""
import glob
import os
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FLAG = 'document.documentElement.classList.add("js")'
pages = sorted(glob.glob(os.path.join(ROOT, 'site', '**', '*.html'), recursive=True))
bad = []
aos_pages = 0
for p in pages:
    t = open(p, encoding='utf-8').read()
    rel = os.path.relpath(p, ROOT).replace(os.sep, '/')
    css = 'assets/vendor/aos.css' in t
    js = 'assets/vendor/aos.js' in t
    uses = 'data-aos=' in t
    if 'assets/vendor/motion.min.js' in t:
        bad.append(f'RETIRED LIBRARY  {rel}: loads vendor/motion.min.js; motion.js works without it')
    if (css or js) and not uses:
        bad.append(f'UNUSED AOS  {rel}: loads AOS but has no data-aos= element')
    elif css != js:
        bad.append(f'HALF AOS  {rel}: loads aos.{"css" if css else "js"} without aos.{"js" if css else "css"}')
    if css:
        aos_pages += 1
        i = t.find('assets/vendor/aos.css')
        if t.find(FLAG) < 0 or t.find(FLAG) > i:
            bad.append(f'NO JS FLAG  {rel}: aos.css without S1\'s .js flag before it')
for b in bad:
    print(b)
if len(pages) < 150:
    print(f'VACUOUS: only {len(pages)} pages read; expected at least 150.')
    sys.exit(1)
print(f"motion weight: {len(pages)} pages, {aos_pages} load AOS's stylesheet, {len(bad)} problem(s)")
sys.exit(1 if bad else 0)
