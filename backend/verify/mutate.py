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
import re
import subprocess
import sys
from pathlib import Path

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


PY_AUDIT = f"python3 {HERE}/static-audit.py"
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

COVERAGE = f"python3 {HERE}/coverage.py"

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
case("map with keyboard control disabled", "a11y2.js", ["site/assets/geospatial.js"],
     lambda: edit("site/assets/geospatial.js", "      keyboard: true,", "      keyboard: false,"),
     lambda o: "map cannot be focused by keyboard" in o,
     A11Y1.format(p="geospatial.html"))

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
