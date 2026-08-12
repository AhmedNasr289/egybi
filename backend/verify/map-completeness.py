"""Can a reader tell what a map is showing without the prose beside it?

Every other checker here asks whether a map RENDERS. None asks whether it
EXPLAINS. Those fail differently and only one of them is visible in a
screenshot: a map can draw perfectly, pass contrast, pass interaction, and
still be a gold shape on a pale field that names nothing.

That is exactly what "A century of plans" was — three unlabelled polygons,
no scale, no legend, no locator — while the prose beside them was specific
and sourced. The page looked finished because every checker that judged it
was judging something else.

Per map mount this asks for: a legend, a scale indicator, a named source, a
licence, an as-of date, and a locator. Reported per page so a gap is
attributable rather than a site-wide count.

Exit 1 on any missing element, so CI can gate on it.
"""
import re
import sys
from collections import OrderedDict
from pathlib import Path

for _s in (sys.stdout, sys.stderr):
    if hasattr(_s, "reconfigure"):
        _s.reconfigure(encoding="utf-8", errors="replace")

SITE = Path("site")

# Pages that mount a Leaflet map. Derived rather than listed: a new map page
# that forgets its legend should fail here on the day it lands, not whenever
# someone remembers to add it to a constant.
MAP_PAGES = sorted(
    p for p in SITE.glob("*.html")
    if re.search(r'mapkit\.js', p.read_text(encoding="utf-8", errors="replace"))
)

# Each probe is (label, regex). Deliberately matched against the page source
# plus its page-specific script, because several of these are injected at
# runtime by assets/<page>.js rather than written into the HTML.
PROBES = OrderedDict([
    ("legend",   r'class="[^"]*\b(legend|mk-row|marker-key|v-scale|iv-legend)\b'),
    ("scale",    r'L\.control\.scale|class="[^"]*\bmap-scale\b|scaleControl|km per|scale bar'),
    ("source",   r'OpenStreetMap|geoBoundaries|NASA|CAPMAS|OSMnx|data\.source'),
    ("licence",  r'ODbL|CC BY|creativecommons\.org|opendatacommons'),
    ("as_of",    r'as_of|asOf|stAsOf|hlAsOf|updated|last updated'),
    ("locator",  r'nameGovernorates|locator|inset|minimap|governorate'),
])

rows, missing_total = [], 0
for page in MAP_PAGES:
    html = page.read_text(encoding="utf-8", errors="replace")
    # Page-specific scripts ONLY. Loading a shared library is not evidence of
    # using it: the first version of this concatenated mapkit.js too and
    # reported "scale: yes" for stories.html, whose baseMap() is deliberately
    # NOT routed through mapkit and therefore has no scale control at all.
    # A checker that reads a capability from a file the page bypasses is
    # measuring the wrong thing confidently.
    SHARED = {"mapkit.js", "egybi.js", "glyphs.js", "wayfinding.js",
              "egypt-geo.js", "scrolly.js", "motion.js", "analytics.js",
              "ads.js", "ads-config.js"}
    own = ""
    for m in re.findall(r'src="assets/([a-z0-9-]+\.js)', html):
        if m in SHARED:
            continue
        f = SITE / "assets" / m
        if f.exists():
            own += f.read_text(encoding="utf-8", errors="replace")

    # mapkit.js supplies a scale control, a credit line and a legend scaffold
    # to every map built through it — so its contents COUNT for a page that
    # routes through it, and must NOT count for one that does not. Getting this
    # wrong in either direction produces a confident wrong answer: including it
    # blindly credited stories.html with a scale bar it has never had, and
    # excluding it blindly stripped the scale bar off six pages that genuinely
    # do have one.
    #
    # A raw `L.map(` in a page's own script is a map built outside mapkit, and
    # therefore one that has to carry its own chrome. That is precisely what
    # stories.js baseMap() is, and why it is the page this checker was written
    # for.
    raw_map = bool(re.search(r'\bL\.map\(', own))
    routes_via_mapkit = bool(re.search(r'EGYBI\.mapkit|mapkit\.', own))
    blob = html + own
    if routes_via_mapkit:
        blob += (SITE / "assets" / "mapkit.js").read_text(encoding="utf-8", errors="replace")
    found = OrderedDict()
    for name, pat in PROBES.items():
        found[name] = bool(re.search(pat, blob, re.I))
    # A page that builds its own maps must carry its own chrome, so a raw
    # L.map is reported alongside the gaps rather than hidden.
    found["own_map"] = raw_map
    gaps = [k for k, v in found.items() if k != "own_map" and not v]
    missing_total += len(gaps)
    rows.append((page.name, found, gaps))

w = max(len(r[0]) for r in rows)
COLS = list(PROBES) + ["own_map"]
head = "  ".join(f"{k:8}" for k in COLS)
print(f"{'page':<{w}}  {head}")
print("-" * (w + len(head) + 2))
for name, found, gaps in rows:
    cells = "  ".join(f"{('yes' if found[k] else 'NO'):8}" for k in COLS)
    print(f"{name:<{w}}  {cells}")

print()
if not missing_total:
    print(f"map completeness: every element present on all {len(rows)} map pages.")
    sys.exit(0)

print(f"{missing_total} missing element(s):")
for name, found, gaps in rows:
    if gaps:
        print(f"  {name}: {', '.join(gaps)}")
sys.exit(1)
