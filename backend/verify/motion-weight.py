"""No page loads motion code that cannot do anything on it (study S4, 2026-11-16).

Measured on main before S4:
  - the Motion One library (vendor/motion.min.js, 24.6 KB) was loaded on 18
    pages, while the only code that used it (motion.js) falls back to the
    browser's IntersectionObserver and behaves the same without it;
  - AOS (vendor/aos.css + aos.js, 40.7 KB) was loaded on 17 pages: 5 with no
    [data-aos] element at all, 2 with its script but not its stylesheet.
S4 part 1 removed the useless loads; part 2 retired AOS for good: motion.js
now reveals every [data-aos] block, with one motion for the whole site.

This reads every published page and fails on:
  RETIRED LIBRARY        a page loads vendor/motion.min.js, aos.css or aos.js;
  FLAG WITHOUT REVEALER  a page sets S1's .js flag (which lets egybi.css hide
                         [data-aos] blocks) but does not load motion.js, the
                         only thing that reveals them - readers would wait 4 s;
  VACUOUS                fewer than 150 pages read.
Exits 1 on any."""
import glob
import os
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
FLAG = 'document.documentElement.classList.add("js")'
RETIRED = ('assets/vendor/motion.min.js', 'assets/vendor/aos.css', 'assets/vendor/aos.js')
pages = sorted(glob.glob(os.path.join(ROOT, 'site', '**', '*.html'), recursive=True))
bad = []
flagged = 0
for p in pages:
    t = open(p, encoding='utf-8').read()
    rel = os.path.relpath(p, ROOT).replace(os.sep, '/')
    for lib in RETIRED:
        if lib in t:
            bad.append(f'RETIRED LIBRARY  {rel}: loads {lib.split("/")[-1]}; motion.js does its work now')
    if FLAG in t:
        flagged += 1
        if 'assets/motion.js' not in t:
            bad.append(f'FLAG WITHOUT REVEALER  {rel}: sets the .js flag but does not load motion.js')
for b in bad:
    print(b)
if len(pages) < 150:
    print(f'VACUOUS: only {len(pages)} pages read; expected at least 150.')
    sys.exit(1)
print(f"motion weight: {len(pages)} pages, {flagged} reveal with motion.js, {len(bad)} problem(s)")
sys.exit(1 if bad else 0)
