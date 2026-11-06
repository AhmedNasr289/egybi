"""Mutation-test every verification tool on this project.

A check that has never been observed failing is not evidence. For each checker,
this injects one specific defect that checker exists to catch, runs it, asserts
it reports the defect, reverts it, and asserts it goes quiet again.

Reverting restores the exact bytes read before the mutation, and verifies the
restore landed. It used `git checkout --`, which silently does nothing for an
untracked file — so the first mutation of a brand-new file left the defect in
the working tree and reported only that the checker had failed to catch it.
"""
import json
import os
import tempfile
import re
import subprocess
import sys
from pathlib import Path

# Windows consoles default to cp1252; the em dashes in this harness's own
# headings printed as mojibake and any non-latin-1 output would abort the run.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

# The checkers live next to this file. Pointing at one container's scratch
# directory meant the committed harness only ever ran in the sandbox that wrote
# it; resolve siblings relative to this file so it runs from any checkout.
HERE = Path(__file__).resolve().parent
# CASE=<substring> re-runs a single case instead of all thirteen — a repaired
# case needs re-proving, and re-proving it should not cost the whole suite.
WANT = os.environ.get("CASE", "").lower()
results = []
skipped = 0


def sh(cmd, timeout=900):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    return r.returncode, (r.stdout or "") + (r.stderr or "")


def snapshot(paths):
    """Read the exact bytes before mutating.

    revert() used `git checkout --`, which silently does NOTHING for a file git
    does not track. The first mutation aimed at a brand-new, untracked
    site/assets/mapkit.js therefore stripped its aria-labels and its keyboard
    focus and left them stripped: the harness reported FAILS TO CATCH, moved on,
    and the defect sat in the working tree waiting to be committed. A mutation
    that cannot be applied is coverage lost in silence; a mutation that cannot
    be REVERTED is a defect shipped in silence, which is worse.

    Bytes in, bytes out — works the same whether git has heard of the file."""
    return {p: (Path(p).read_bytes() if Path(p).exists() else None) for p in paths}


def revert(snap):
    for p, data in snap.items():
        if data is None:
            if Path(p).exists():
                Path(p).unlink()
        else:
            Path(p).write_bytes(data)
    # Never take the restore on trust — that assumption is what let a stripped
    # file through in the first place.
    for p, data in snap.items():
        now = Path(p).read_bytes() if Path(p).exists() else None
        if now != data:
            raise SystemExit("REVERT FAILED for %s — stop and restore it by hand "
                             "before committing anything." % p)


def edit(path, old, new):
    p = Path(path)
    t = p.read_text(encoding="utf-8")
    assert t.count(old) >= 1, f"anchor not found in {path}: {old[:60]!r}"
    p.write_text(t.replace(old, new, 1), encoding="utf-8")


def case(name, tool, files, mutate, detects, cmd, timeout=900):
    """detects(output) -> bool : did the tool report THIS defect?"""
    global skipped
    if WANT and WANT not in name.lower():
        skipped += 1
        return
    # 0. exact bytes, so the revert cannot depend on git knowing the file
    snap = snapshot(files)
    # 1. quiet before
    rc0, out0 = sh(cmd, timeout)

    # A CHECKER THAT CANNOT START HAS NOT FAILED TO CATCH ANYTHING.
    #
    # env.js exits 2 — distinct from a checker's own 1 — when playwright-core or
    # Chromium is missing, precisely so "cannot run" is separable from "ran and
    # found nothing". This harness ignored that and scored it as FAILS TO CATCH,
    # so a scratch directory losing node_modules printed twenty-three checkers
    # that had "gone blind" while every one of them was fine. That is the same
    # false positive tap-targets.js spent six sessions on, in the tool whose job
    # is to be trustworthy about the others.
    #
    # It still counts as a failure — a suite that could not run proves nothing —
    # but it says which kind of failure it is, so the fix is "install the
    # browser" rather than a day spent auditing checkers that were never broken.
    if rc0 == 2:
        first = next((l for l in out0.splitlines() if l.strip()), "")[:60]
        results.append((name, tool, "COULD NOT RUN", f"exit 2 before mutating — {first}"))
        print(f"  {'COULD NOT RUN':16} {name}  ({first})")
        return

    before_clean = not detects(out0)
    # 2. inject
    try:
        mutate()
    except Exception as e:  # noqa: BLE001
        results.append((name, tool, "COULD NOT MUTATE", str(e)[:70]))
        print(f"  {'COULD NOT MUTATE':16} {name}  ({str(e)[:60]})")
        revert(snap)
        return
    # 3. does it catch it?
    rc1, out1 = sh(cmd, timeout)
    caught = detects(out1)
    # 4. revert
    revert(snap)
    # 5. quiet after
    rc2, out2 = sh(cmd, timeout)
    after_clean = not detects(out2)
    verdict = ("PASS" if (caught and before_clean and after_clean)
               else "FAILS TO CATCH" if not caught
               else "NOISY" if not (before_clean and after_clean) else "?")
    results.append((name, tool, verdict,
                    f"quiet-before={before_clean} caught={caught} quiet-after={after_clean}"))
    print(f"  {verdict:16} {name}")


# sys.executable, not "python3": on Windows `python3` resolves to a Store
# execution-alias stub that exits 0 with no output, so every Python-based case
# reported FAILS TO CATCH while testing nothing at all. A harness that cannot
# invoke its checkers reports the same thing as a checker that cannot fire.
PY_AUDIT = f'"{sys.executable}" {HERE}/static-audit.py'
SWEEP1 = "ONLY={p} node " + str(HERE) + "/all-pages.js"

print("mutation tests — each injects a defect the checker exists to catch\n")

# ---- 1. static audit: a link that does not resolve --------------------------
case("broken internal link", "static-audit.py", ["site/about.html"],
     lambda: edit("site/about.html", "</footer>", '<a href="no-such-page.html">x</a></footer>'),
     lambda o: "internal links that do not resolve" in o, PY_AUDIT)

# ---- 2. static audit: an anchor whose id is not there -----------------------
case("anchor to a missing id", "static-audit.py", ["site/about.html"],
     lambda: edit("site/about.html", "</footer>", '<a href="#no-such-anchor">x</a></footer>'),
     lambda o: "anchors pointing at an id that is not there" in o, PY_AUDIT)

# ---- 3. static audit: one page left on an older asset build -----------------
def drift_version():
    """Read the version in use rather than hardcoding one: this case silently
    stopped applying the moment the stylesheet was bumped, and a mutation that
    cannot be applied is coverage quietly lost."""
    p = Path("site/about.html")
    t = p.read_text(encoding="utf-8")
    m = re.search(r"egybi\.css\?v=(\d+)", t)
    assert m, "no versioned egybi.css link in about.html"
    cur = int(m.group(1))
    p.write_text(t.replace(f"egybi.css?v={cur}", f"egybi.css?v={cur - 1}", 1), encoding="utf-8")

case("asset version drift", "static-audit.py", ["site/about.html"],
     drift_version,
     lambda o: "shared assets requested at different versions" in o, PY_AUDIT)

# ---- 3b. static audit: a committed asset its generator no longer reproduces --
# build_flag.py is deliberately in no workflow — its input is a static committed
# GeoJSON, and a monthly cron re-deriving an unchanged file is noise. That
# leaves drift as the real risk: re-simplify the boundary file and the flag
# keeps the old outline, correct-looking and wrong. The audit runs the generator
# as an assertion instead of scheduling it, and this is what proves it works.
case("committed asset its generator no longer reproduces", "static-audit.py",
     ["site/assets/egypt-silhouette.svg"],
     lambda: edit("site/assets/egypt-silhouette.svg", "<title>Egypt</title>",
                  "<title>Egypt</title><!-- hand-edited -->"),
     lambda o: "no longer reproduces" in o, PY_AUDIT)

# ---- 4. static audit: a field a page reads that the data stopped writing ----
def drop_median():
    p = Path("site/data/visit-relief.json")
    d = json.loads(p.read_text(encoding="utf-8"))
    d["transects"][0].pop("median_m")
    p.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")

case("data field a page reads is gone", "static-audit.py", ["site/data/visit-relief.json"],
     drop_median, lambda o: "median_m" in o and "no longer has" in o, PY_AUDIT)

# ---- 5. static audit: the climate layer failing its own published gate ------
def break_gate():
    p = Path("site/data/visit-climate.json")
    d = json.loads(p.read_text(encoding="utf-8"))
    for pair in d["validation"]["pairs"]:
        pair["delta_c"] = round(pair["delta_c"] + 5.0, 1)
    p.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")

case("published climate fails gate A", "static-audit.py", ["site/data/visit-climate.json"],
     break_gate, lambda o: "gate A" in o, PY_AUDIT)

# ---- 6. static audit: a data file with no date on it -----------------------
def strip_date():
    p = Path("site/data/visit-terrain.json")
    d = json.loads(p.read_text(encoding="utf-8"))
    for k in ("as_of", "fetched_at", "generated_at", "generated", "updated"):
        d.pop(k, None)
    p.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")

case("data file with no date", "static-audit.py", ["site/data/visit-terrain.json"],
     strip_date, lambda o: "data files with no date on them" in o, PY_AUDIT)

# ---- 6b. Egyptian formatting: a number formatted by the visitor's browser ----
# toLocaleString() with no locale printed 1.234 in a German browser and ١٬٢٣٤
# in an Arabic one; fourteen such calls drew the atlas and the maps until
# 2026-11-06. Putting one back must be caught.
case("toLocaleString with no locale", "static-audit.py", ["site/assets/egypt-map.js"],
     lambda: edit("site/assets/egypt-map.js", "toLocaleString('en-GB')", "toLocaleString()"),
     lambda o: "toLocaleString() with no locale" in o, PY_AUDIT)

# ---- 6c. Egyptian formatting: a raw ISO date a reader can see -----------------
# Dates are written "3 Nov 2026"; the ISO form belongs only in <time datetime>.
# The 18 visit pages printed "layer dated 2026-08-08" until 2026-11-06.
case("bare ISO date in visible text", "static-audit.py", ["site/about.html"],
     lambda: edit("site/about.html", "</footer>", "<p>Updated 2026-11-06.</p></footer>"),
     lambda o: "a bare ISO date in visible text" in o, PY_AUDIT)

# ---- 7. page sweep: a script that throws ------------------------------------
case("console error on a page", "all-pages.js", ["site/places.html"],
     lambda: edit("site/places.html", "</body>",
                  "<script>window.__boom.x = 1;</script></body>"),
     lambda o: "console:" in o, SWEEP1.format(p="places.html"))

# ---- 8. page sweep: horizontal overflow at 375px ----------------------------
case("content clipped off-screen at 375px", "overflow.js", ["site/places.html"],
     lambda: edit("site/places.html", "</body>",
                  '<section><div style="width:900px;height:8px">wide</div></section></body>'),
     lambda o: "clipped off-screen: 1" in o, f"node {HERE}/overflow.js")

# ---- 9. page sweep: a sub-nav chip pointing at a section that is gone -------
case("section[data-nav] with no id", "all-pages.js", ["site/visit.html"],
     lambda: edit("site/visit.html", '<section class="surface-light" id="terrain" data-nav=',
                  '<section class="surface-light" data-nav='),
     lambda o: "with no id" in o, SWEEP1.format(p="visit.html"))

# ---- 10. page sweep: an off-origin request ---------------------------------
case("off-origin request", "all-pages.js", ["site/places.html"],
     lambda: edit("site/places.html", "</body>",
                  '<img src="https://example.com/a.png" alt=""></body>'),
     lambda o: "external:" in o, SWEEP1.format(p="places.html"))

# ---- 11. CSSOM: a class in the DOM with no rule behind it -------------------
case("class in DOM with no CSS rule", "cssom.js", ["site/places.html"],
     lambda: edit("site/places.html", "</body>",
                  '<p class="zz-no-rule-here">x</p></body>'),
     lambda o: "zz-no-rule-here" in o, f"node {HERE}/cssom.js")

# ---- 12. contrast: text below AA against its painted ground ----------------
case("sub-AA contrast", "contrast.js", ["site/places.html"],
     lambda: edit("site/places.html", "</body>",
                  '<p style="color:#d8d2c4;background:#f6eedc;font-size:14px">'
                  'deliberately faint</p></body>'),
     lambda o: "deliberately faint" in o, f"node {HERE}/contrast.js")

REDUCED1 = "ONLY={p} node " + str(HERE) + "/reduced.js"

# ---- 13. reduced motion: content hidden when animation is suppressed -------
# Detects the per-row marker, not the summary sentence. The summary WAS the
# anchor, and rewording it to mention the new failure silently turned this case
# vacuous — it kept passing while testing nothing, which is the same class of
# bug as the asset-version case above.
case("content hidden under reduced motion", "reduced.js", ["site/assets/egybi.css"],
     lambda: edit("site/assets/egybi.css",
                  "  [data-aos] { opacity: 1 !important; transform: none !important; }",
                  "  /* removed by mutation test */"),
     lambda o: "HIDDEN REVEAL" in o,
     # explore.html, not index.html. AOS strips data-aos from every element
     # present when it initialises, so on most pages the attribute the check
     # looks for is gone by the time anything could hide it and the mutation is
     # unobservable — it caught nothing and the case looked like a broken
     # checker rather than a badly aimed test. Measured across five pages,
     # explore.html is where 68 attributes survive, which is the same 68 the
     # comment in egybi.css records having been hidden.
     REDUCED1.format(p="explore.html"))

# ---- 13b. reduced motion: an animation that keeps running under reduce -----
# The failure the file is named after, and until now it was only printed in the
# margin rather than failing the run.
#
# The first version of this case removed the FLAG's own reduced-motion override
# and caught nothing, which was the correct answer to a badly aimed question:
# egybi.css already carries a global `* { animation: none !important }` under
# reduce, so the per-component override is redundant for stopping motion and
# earns its place only by setting the resting pose. Mutating a redundant rule
# tests nothing. The global rule is what actually enforces the promise, so the
# global rule is what gets broken here.
case("animation still running under reduced motion", "reduced.js", ["site/assets/egybi.css"],
     lambda: edit("site/assets/egybi.css",
                  "  * { animation: none !important; transition: none !important; }",
                  "  /* removed by mutation test */"),
     lambda o: "still animating" in o,
     REDUCED1.format(p="index.html"))

# ---- 13c. CC BY 4.0: geometry rendered with the credit stripped ------------
# index.html carries no map, and draws geoBoundaries-derived geometry on the
# flag. The old rule keyed on .leaflet-container and could not see this page at
# all, so this case is what stops that regression coming back.
case("geoBoundaries credit stripped from a page with no map", "all-pages.js",
     ["site/index.html"],
     lambda: edit("site/index.html",
                  'href="https://www.geoboundaries.org/" rel="noopener">geoBoundaries</a>',
                  'href="https://example.invalid/" rel="noopener">a source</a>'),
     lambda o: "no visible credit" in o,
     SWEEP1.format(p="index.html"))

COVERAGE = f'"{sys.executable}" {HERE}/coverage.py'

# ---- 14. chrome drift: a footer nav link that exists on every page but one --
case("footer nav link dropped from one page", "coverage.py", ["site/about.html"],
     lambda: edit("site/about.html", '<a href="stories.html">Data Stories</a>', ""),
     lambda o: "footer links differ" in o and "Data Stories" in o, COVERAGE)

# ---- 15. chrome drift: 404 links made relative ------------------------------
# The same file answers /nonsense.html and /deep/path/nonsense.html; a relative
# href sends a lost reader deeper into a directory that does not exist.
case("404 chrome link made relative", "coverage.py", ["site/404.html"],
     lambda: edit("site/404.html", 'href="/explore.html"', 'href="explore.html"'),
     lambda o: "not root-absolute" in o, COVERAGE)


# ---- 16. static audit: a date field holding something that is not a date ----
def date_field_not_a_date():
    """The rule used to test for the KEY. streets-notes.json shipped
    "generated": false — a boolean sharing a name with a date field — and passed
    "every data file is dated" while carrying no date. Prove the value is now
    what gets checked."""
    p = Path("site/data/visit-terrain.json")
    d = json.loads(p.read_text(encoding="utf-8"))
    for k in ("as_of", "fetched_at", "generated_at", "updated"):
        d.pop(k, None)
    d["generated"] = True
    p.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")


case("date field holding a boolean", "static-audit.py", ["site/data/visit-terrain.json"],
     date_field_not_a_date,
     lambda o: "data files with no date on them" in o, PY_AUDIT)

MAPINT = ("ONLY=geospatial.html FAST=1 node " + str(HERE) + "/map-interaction.js")

# ---- 20. a map that calls a provider the moment you touch it ---------------
# The whole point of map-interaction.js: a tile provider is contacted on pan and
# zoom, never on load, so a checker that only loads the page cannot see it.
case("map fetches off-origin on interaction", "map-interaction.js",
     ["site/assets/geospatial.js"],
     lambda: edit("site/assets/geospatial.js", "  function showDetail(p) {",
                  "  function showDetail(p) {\n"
                  "    fetch('https://tile.example.com/0/0/0.png').catch(function () {});"),
     lambda o: "OFF-ORIGIN REQUEST during interaction" in o, MAPINT)

# ---- 21. a map control that a screen reader cannot name --------------------
case("map control loses its accessible name", "map-interaction.js",
     ["site/assets/mapkit.js"],
     lambda: edit("site/assets/mapkit.js", "    b.setAttribute('aria-label', label);", ""),
     lambda o: "map control with no accessible name" in o, MAPINT)

# ---- 22. a choropleth that only a mouse can read --------------------------
# The anchor moved when makeFocusable was deleted: the Atlas was its only caller
# and now uses choropleth(). A case aimed at a deleted line does not fail — it
# reports COULD NOT MUTATE, which is coverage lost rather than coverage passing,
# and only because that verdict was added earlier.
case("governorates stop being keyboard-reachable", "map-interaction.js",
     ["site/assets/mapkit.js"],
     lambda: edit("site/assets/mapkit.js",
                  "      e.setAttribute('tabindex', n === 0 ? '0' : '-1');", ""),
     lambda o: "governorates not keyboard-reachable" in o, MAPINT)


# ---- 17. page sweep: a nav container that renders with nothing in it --------
def empty_the_nav():
    p = Path("site/places.html")
    t = p.read_text(encoding="utf-8")
    m = re.search(r'(<nav class="nav-links"[^>]*>)(.*?)(</nav>)', t, re.S)
    assert m, "no .nav-links container in places.html"
    p.write_text(t[:m.start()] + m.group(1) + m.group(3) + t[m.end():], encoding="utf-8")


case("nav container rendered with no links", "all-pages.js", ["site/places.html"],
     empty_the_nav, lambda o: "container with no links in it" in o,
     SWEEP1.format(p="places.html"))


# ---- 18. page sweep: a page a reader cannot leave ---------------------------
def make_dead_end():
    """The tombstones carry no site nav on purpose, so the rule that matters is
    not 'has a nav' but 'offers any way onward at all'. Neutralise every
    relative link and the page becomes a genuine dead end."""
    p = Path("site/practice.html")
    t = p.read_text(encoding="utf-8")
    new = re.sub(r'href="(?!https?:|#|mailto:)', 'data-was-href="', t)
    assert new != t, "no relative links to neutralise"
    p.write_text(new, encoding="utf-8")


case("a page with no way onward", "all-pages.js", ["site/practice.html"],
     make_dead_end, lambda o: "dead end" in o, SWEEP1.format(p="practice.html"))

A11Y1 = "ONLY={p} node " + str(HERE) + "/a11y2.js"

# ---- 19. a11y: a map that can only be panned with a mouse ------------------
# The anchor lived in geospatial.js until mapkit.js took over creating every
# map, and moved with it. The case did not go red when that happened — it went
# COULD NOT MUTATE, which is at least loud, and is the reason that verdict
# exists as something separate from a pass. It had been proving nothing for as
# long as mapkit has existed.
#
# Targeting mapkit is also strictly better: one mutation now covers the
# keyboard contract for all six maps rather than for the Atlas alone.
case("map with keyboard control disabled", "a11y2.js", ["site/assets/mapkit.js"],
     lambda: edit("site/assets/mapkit.js", "      keyboard: true,", "      keyboard: false,"),
     lambda o: "map cannot be focused by keyboard" in o,
     A11Y1.format(p="geospatial.html"))

MAPC = "ONLY={p} node " + str(HERE) + "/map-contrast.js"

# ---- 20. the country with no edge -----------------------------------------
# The defect this covers shipped, sat on every map page, and ran green through
# all nineteen cases above it. The boundary of Egypt was white on a cream
# background — 1.15:1, which is not a faint line but the absence of one — and
# nothing here looked at it, because contrast.js walks TEXT nodes and an SVG
# stroke is not text. On a tile-free site there is no basemap underneath to
# carry the shape, so that one colour pair decides whether a map is a map.
#
# Mutating the shared coastline colour to white reproduces exactly the state
# the site was in, which is the only reason to trust that the new checker would
# have caught it.
case("country outline with no contrast against the page", "map-contrast.js",
     ["site/assets/mapkit.js"],
     lambda: edit("site/assets/mapkit.js",
                  "return { fill: false, color: opts.color || '#0E2A5E',",
                  "return { fill: false, color: opts.color || '#FFFFFF',"),
     lambda o: "NO VISIBLE BOUNDARY" in o,
     # Aimed at Explore, not Places, and the difference is the whole case.
     # Places draws TWO country-wide boundaries — the halo and its own
     # #6E86A8 internal stroke at 3.51:1 — so whitening the halo there leaves a
     # map that still, correctly, has an edge, and the case reported FAILS TO
     # CATCH for a checker that was behaving perfectly. Explore's choropleth
     # strokes its governorates in near-white #FCF8EC at 1.09:1 because the
     # ramp fills either side carry the internal borders, so the halo is the
     # only thing drawing its coast. Whitening it there reproduces exactly the
     # state the whole site shipped in.
     MAPC.format(p="explore.html"))


# ---- 21. an outline that is only an accent ---------------------------------
# The first version of map-contrast.js asked for SOME stroke over 3:1, and
# Streets passed it on the gold ring around one selected district while its
# coastline sat at 1.15:1 — a rule satisfied by an accent that says nothing
# about whether the country has an edge. Deleting the country-wide outline
# entirely leaves those accents in place, so this case fails if the MIN_PATHS
# floor is ever relaxed back to "any stroke will do".
case("country outline removed, leaving only per-feature accents",
     "map-contrast.js", ["site/assets/mapkit.js"],
     lambda: edit("site/assets/mapkit.js",
                  "    if (!map || !geo || !window.L) return null;",
                  "    if (!map || !geo || !window.L) return null;\n    return null;"),
     lambda o: "NO VISIBLE BOUNDARY" in o or "NO COUNTRY OUTLINE" in o,
     MAPC.format(p="streets.html"))


# A mapkit.js with `outline` removed from its exported surface — byte-identical
# to the current file otherwise. That is exactly the state the live host was in
# on 2026-08-10: an older shared module that does not carry a function the page
# modules call. Synthesised from the CURRENT file rather than pulled from a
# historical commit, because a case pinned to a specific old ref quietly stops
# reproducing anything the moment that ref ages out of relevance.
STALE_MAPKIT = Path(tempfile.gettempdir()) / "egybi-stale-mapkit.js"
_mk = (HERE.parent.parent / "site" / "assets" / "mapkit.js").read_text(encoding="utf-8")
assert "outline: outline," in _mk, "mapkit no longer exports outline — update this fixture"
STALE_MAPKIT.write_text(_mk.replace("outline: outline,", ""), encoding="utf-8")

RENDER = "ONLY={p} node " + str(HERE) + "/map-render.js"
RENDER_SKEW = (f"SKEW_MAPKIT={STALE_MAPKIT} ONLY={{p}} node " + str(HERE) + "/map-render.js")


# ---- 22. a map that finishes loading and draws nothing ----------------------
# The failure that reached a reader: a blank white rectangle where the map
# should be. Nothing asserted this. Rendering zero paths is not an error, it is
# an absence, so all-pages.js, contrast.js and map-interaction.js were all
# correct to stay quiet while the Atlas showed the reader nothing at all.
#
# Aimed at a Stories map because those deliberately have no degradation net —
# they are inert illustrations beside prose that already states every figure,
# so there is nothing there to catch a throw and hide it from this case.
case("a map that finishes loading having drawn nothing", "map-render.js",
     ["site/assets/stories.js"],
     lambda: edit("site/assets/stories.js",
                  "    var el = document.getElementById('mapRibbon'); if (!el) return;",
                  "    var el = document.getElementById('mapRibbon'); if (!el) return;\n"
                  "    el.remove();"),
     lambda o: "MAP DREW NOTHING" in o or "container not found" in o,
     RENDER.format(p="stories.html"))


# ---- 23. a loading placeholder that never goes away ------------------------
# The other half of the screenshot, and a distinct failure: the map can be
# perfectly fine while the page still tells the reader it is loading. A reader
# cannot tell a frozen page from a slow one, which is why "Loading…" left on
# screen is a defect in its own right rather than cosmetic.
case("a loading placeholder still on screen after the page settles",
     "map-render.js", ["site/assets/geospatial.js"],
     lambda: edit("site/assets/geospatial.js",
                  "  function setLayerNote() {\n    var el = $('layerNote');",
                  "  function setLayerNote() {\n    return;\n    var el = $('layerNote');"),
     lambda o: "STUCK LOADING" in o,
     RENDER.format(p="geospatial.html"))


# ---- 24. an optional helper called as if it were guaranteed -----------------
# THE ACTUAL OUTAGE, reproduced end to end. Twenty-seven checkers ran green
# through it because every one of them tests this repository, where the files
# are in sync by construction — and the defect existed only in the combination
# of files the HOST was serving.
#
# So this case does what none of the others can: it serves a mapkit.js without
# `outline` while everything else stays current, then removes the guard. That
# is a partial deploy, and the page dies exactly as it died live. With the
# guard in place the same skew is a non-event, which is the whole claim being
# tested — "optional" is not a comment, it is something a page either survives
# or does not.
case("optional mapkit helper called unguarded, against an older mapkit",
     "map-render.js", ["site/assets/stories.js"],
     lambda: edit("site/assets/stories.js",
                  "    mkx('outline')(m, GEO);",
                  "    window.EGYBI.mapkit.outline(m, GEO);"),
     lambda o: "MAP DREW NOTHING" in o or "UNCAUGHT" in o,
     RENDER_SKEW.format(p="stories.html"))


TAP = "ONLY={p} node " + str(HERE) + "/tap-targets.js"

# ---- 25. a target too small for a finger ----------------------------------
# The gazetteer shipped its pins at 8x8 and nothing here objected, because a
# small button is not an error: it renders, it responds, it throws nothing.
# Only a measurement finds it. Shrinking the icon back to the dot restores
# exactly the state a reader hit on a phone.
case("a tap target smaller than a finger", "tap-targets.js",
     ["site/assets/places.js"],
     lambda: edit("site/assets/places.js", "      var HIT = 30;", "      var HIT = 8;"),
     lambda o: "UNDER-24px" in o,
     TAP.format(p="places.html"))


# ---- 26. the exception that stopped being earned ---------------------------
# Fourteen governorates are under 24px and cannot be enlarged, so the checker
# forgives them ONLY while a full-size control reaches the same features. That
# is a licence with a condition attached, and a condition nobody verifies is
# not a condition. Removing the picker must turn the forgiveness back into a
# failure — otherwise the exception is just a permanent exemption wearing a
# justification.
case("the equivalent full-size control removed from a map page",
     "tap-targets.js", ["site/geospatial.html"],
     lambda: edit("site/geospatial.html",
                  '<select id="govPick" class="gov-pick">',
                  '<select id="govPickDisabled" class="gov-pick">'),
     lambda o: "EQUIVALENT CONTROL MISSING" in o or "UNDER-24px" in o,
     TAP.format(p="geospatial.html"))


# ---- 27. the checker measuring a page that is still moving -----------------
# Not a site defect: a defect in the CHECKER, and the one that actually
# happened. tap-targets.js read elementFromPoint the instant it scrolled, so on
# explore.html the reveal animation's own wrapper was the topmost element at the
# button's centre and two working "Query this yourself" buttons were reported
# COVERED by a <p>. That kept Verify (browser) red from 2026-08-13 through
# fourteen runs, and a checker that calls a reachable control unreachable is
# worse than none — it teaches everyone to ignore a red build.
#
# The cure has two parts and MEASURING SAYS EITHER ONE ALONE IS ENOUGH, which
# is not what the fix's own header assumed. Run against explore.html:
#
#     reduced motion + 60ms settle    clean      (what ships)
#     reduced motion + no settle      clean
#     animation on   + 60ms settle    clean
#     animation on   + no settle      COVERED(2): Query this yourself <- P.
#
# So there is no single line to remove that reproduces the failure, and a
# one-line mutation here reported the checker as failing to catch a defect that
# the other guard had already absorbed. Removing both restores exactly the state
# the file was in while CI was red, and that is the state this asserts against —
# the pair is load-bearing, and neither half may quietly go without the other
# being noticed.
def unsettle_tap_targets():
    edit("backend/verify/tap-targets.js",
         "reducedMotion: 'reduce'", "reducedMotion: 'no-preference'")
    edit("backend/verify/tap-targets.js", "const SETTLE = 60;", "const SETTLE = 0;")

case("the checker hit-testing a page mid-animation", "tap-targets.js",
     ["backend/verify/tap-targets.js"],
     unsettle_tap_targets,
     lambda o: "COVERED" in o,
     TAP.format(p="explore.html"))


# ---- 28. a scheduled workflow that can fail with nobody told ----------------
# workflow-audit.py is the only thing that reads the whole fleet at once, and
# for days it printed its findings and exited 0 — so it could report that a
# pipeline might fail silently forever and still let the build pass. This proves
# the exit code, not just the print: strip the alert step off a workflow that
# fires on a cron and the audit has to go red.
PY_WF = f'"{sys.executable}" {HERE}/workflow-audit.py'

case("a cron workflow left with no failure alerting", "workflow-audit.py",
     [".github/workflows/papyrus-reminder.yml"],
     lambda: edit(".github/workflows/papyrus-reminder.yml",
                  "        if: failure() || cancelled()\n"
                  "        uses: ./.github/actions/notify-failure",
                  "        run: 'true'"),
     lambda o: "papyrus-reminder: fires unattended" in o, PY_WF)


# ---- 40. an unattended workflow whose alert cannot say what broke ----------
# The other half of the same lesson, and the one that actually cost something.
# refresh-data DID alert on 2026-08-17 — it just said "the workflow failed",
# while its own log named nine World Bank indicators returning HTTP 502 and
# explained that it was refusing to write seed_auto.sql rather than delete their
# rows. Alerting had been marked done since 2026-07-21; the reason that makes it
# actionable was missing for six weeks and nothing noticed, because nothing
# checked. Removing `reason:` from a cron workflow has to turn the audit red.
# (The reason line itself became a longer expression on 2026-11-06, when the
# alerts learned to explain a cancellation; renaming the key drops the reason
# without leaving half an expression behind.)
case("a cron workflow alerting with no reason", "workflow-audit.py",
     [".github/workflows/refresh-fx.yml"],
     lambda: edit(".github/workflows/refresh-fx.yml",
                  "        with:\n          reason: ${{ job.status == 'cancelled'",
                  "        with:\n          not_a_reason: ${{ job.status == 'cancelled'"),
     lambda o: "refresh-fx: fires unattended" in o and "without a reason" in o,
     PY_WF)


# ---- 42. an unattended workflow whose alert cannot see a timeout -------------
# refresh-streets hit its 120-minute limit on 2026-10-05; GitHub recorded the
# run as CANCELLED, every alert in the fleet ran `if: failure()`, and the street
# pages sat on three-month-old data with nobody told. Narrowing the alert back
# to failure() alone has to turn the audit red.
case("a cron workflow whose alert misses a timeout", "workflow-audit.py",
     [".github/workflows/refresh-streets.yml"],
     lambda: edit(".github/workflows/refresh-streets.yml",
                  "        if: failure() || cancelled()\n        uses: ./.github/actions/notify-failure",
                  "        if: failure()\n        uses: ./.github/actions/notify-failure"),
     lambda o: "refresh-streets: fires unattended" in o and "CANCELLED" in o,
     PY_WF)


# ---- 41. a committing workflow whose push guards moved into a script -------
# On 2026-11-04 build-pages and refresh-prices began committing through
# .github/scripts/push-with-regenerate.sh, after a sitemap.xml rebase conflict
# lost a day's prices. checks.py keyed its push guards on the literal
# `git commit` in the workflow, so moving the commit into the script would
# have skipped both workflows and passed them on nothing. It now reads the
# workflow and the helper together; strip the retry loop from the helper and
# both workflows have to come back GAP.
PY_CHECKS_WF = f'"{sys.executable}" {HERE}/checks.py workflows'

case("push helper loses its retry loop", "checks.py",
     [".github/scripts/push-with-regenerate.sh"],
     lambda: edit(".github/scripts/push-with-regenerate.sh",
                  'for attempt in $(seq 1 "$attempts"); do',
                  'while false; do'),
     lambda o: ("build-pages.yml" in o and "refresh-prices.yml" in o
                and o.count("missing: retries the push") >= 2),
     PY_CHECKS_WF)


# ---- 20-23. seo.py: the defects that decided the domain's identity ---------
# These four are the ones that actually happened. For months every page audited
# clean while Google showed the site under a name it had abandoned, because the
# defect was in the corpus rather than in any page — so the first case below is
# the one this checker exists for.
PY_SEO = f'"{sys.executable}" {HERE}/seo.py'

case("retired page silently indexable again", "seo.py",
     ["site/practice/your-first-select.html"],
     lambda: edit("site/practice/your-first-select.html",
                  '<meta name="robots" content="noindex,follow">', ""),
     lambda o: "retired page still indexable" in o, PY_SEO)

# Blocking a noindex page reads as reinforcement and does the exact opposite:
# Google cannot fetch the page, so it never reads the noindex, so the page
# stays indexed forever. The checker has to catch the well-meaning version.
case("robots.txt blocks the noindex it depends on", "seo.py", ["robots.txt"],
     lambda: edit("robots.txt", "Disallow: /api/",
                  "Disallow: /api/\nDisallow: /practice/"),
     lambda o: "robots.txt blocks a noindex directory" in o, PY_SEO)

case("two pages claiming one canonical", "seo.py", ["site/places.html"],
     lambda: edit("site/places.html",
                  '<link rel="canonical" href="https://egybi.com/places.html">',
                  '<link rel="canonical" href="https://egybi.com/visit.html">'),
     lambda o: "duplicate canonical" in o, PY_SEO)

# Invalid JSON-LD is worse than none: it is discarded in silence, so the page
# looks marked up in the source and earns nothing.
case("structured data that no longer parses", "seo.py", ["site/streets.html"],
     lambda: edit("site/streets.html", '"@context": "https://schema.org"',
                  '"@context": "https://schema.org",,'),
     lambda o: "JSON-LD does not parse" in o, PY_SEO)


# ---- 24. map-completeness: a map that draws but explains nothing ------------
# The defect this checker was written for. stories.html rendered its districts
# correctly and named none of them; every checker that judged that page was
# judging whether it drew.
PY_MAPS = f'"{sys.executable}" {HERE}/map-completeness.py'

case("map legend stripped from a story", "map-completeness.py",
     ["site/assets/stories.js"],
     lambda: edit("site/assets/stories.js", "class=\"st-legend\"", "class=\"st-nolegend\""),
     # Match the GAP LINE, not the table. The first predicate here was
     # `"legend" in o and "stories.html" in o`, which the checker's own
     # PASSING output satisfies — "legend" is a column header and
     # "stories.html" is a row — so it reported caught while nothing was
     # wrong. A detector that matches the report's furniture instead of its
     # findings is always true.
     lambda o: "stories.html: legend" in o, PY_MAPS)


print()
if not results:
    print(f"CASE={WANT!r} matched none of the {skipped} cases — nothing was proven.")
    sys.exit(2)
w = max(len(r[0]) for r in results)
print(f"{'defect injected':<{w}}  {'checker':<18} verdict")
print("-" * (w + 60))
for name, tool, verdict, detail in results:
    print(f"{name:<{w}}  {tool:<18} {verdict:16} {detail}")

bad = [r for r in results if r[2] != "PASS"]
print(f"\n{len(results) - len(bad)}/{len(results)} checkers demonstrably catch what they claim to")
if skipped:
    print(f"({skipped} case(s) not run — CASE={WANT!r} filtered them out)")
if bad:
    print("NOT PROVEN:")
    for r in bad:
        print("   ", r[0], "->", r[2], r[3])

# A CHECKER THAT CANNOT BE SHOWN FAILING IS NOT EVIDENCE — INCLUDING THIS ONE.
#
# This file printed NOT PROVEN and exited 0. So the step named "the check on
# the checks" could report that a checker no longer catches anything it claims
# to, and still let the build go green — which is precisely the defect
# workflow-audit.py was fixed for on 2026-08-16, sitting in the one tool whose
# whole purpose is to be the last line of defence.
#
# It was found by refusing to read a green step as a result: `Verify (browser)`
# run 31981498650 passed this step, and passing proved only that the file ran.
# Every verdict other than PASS counts — FAILS TO CATCH means a checker has
# gone blind, NOISY means it reports the defect when the defect is absent, and
# COULD NOT MUTATE means the case stopped applying and is testing nothing. All
# three are coverage lost, and coverage lost in silence is how this suite's own
# asset-version case sat vacuous through four stylesheet bumps.
if bad:
    sys.exit(1)
