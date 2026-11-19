"""Mutation-test every verification tool on this project.

A check that has never been observed failing is not evidence. For each checker,
this injects one specific defect that checker exists to catch, runs it, asserts
it reports the defect, reverts it, and asserts it goes quiet again.

Reverting restores the exact bytes read before the mutation, and verifies the
restore landed. It used `git checkout --`, which silently does nothing for an
untracked file — so the first mutation of a brand-new file left the defect in
the working tree and reported only that the checker had failed to catch it.
"""
import datetime
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
# SHARD=k/n runs every n-th case, starting at the k-th (2026-11-17). The whole
# suite outgrew one 60-minute job: #154 and #156 were cancelled at the cap
# after #153's run took 53 minutes, and a cancelled run proves nothing. CI
# runs n shards side by side; each writes "k n ran seen" to
# $VERIFY_LOG_DIR/mutate-shard.txt, and mutate-shards.py fails the run unless
# every shard reported and together they ran every case. Cases are dealt
# round-robin in file order, so one checker's cases spread over all shards.
_shard = os.environ.get("SHARD", "1/1")
SHARD_K, SHARD_N = (int(x) for x in _shard.split("/"))
assert 1 <= SHARD_K <= SHARD_N, f"SHARD={_shard!r}: want k/n with 1 <= k <= n"
seen = 0          # cases that passed the CASE filter, in file order
other_shard = 0   # of those, dealt to another shard


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


def edit_re(path, pattern, new):
    """edit() for an anchor whose exact text changes by itself, such as a
    content-hashed ?v= that moves whenever its file does."""
    p = Path(path)
    t = p.read_text(encoding="utf-8")
    t2, n = re.subn(pattern, new, t, count=1)
    assert n == 1, f"pattern not found in {path}: {pattern[:60]!r}"
    p.write_text(t2, encoding="utf-8")


def asset_tag(path, asset):
    """The page's own tag for a versioned asset (`motion.js`, `egybi.css`),
    whatever its ?v= is now. Hard-coding the version broke two cases the day
    motion.js went from v=4 to v=5 (run 43865452380: COULD NOT MUTATE, anchor
    not found): a version bump must not silently disarm a mutation case."""
    t = Path(path).read_text(encoding="utf-8")
    m = re.search(r'<(?:script src|link href)="assets/' + re.escape(asset) + r'\?v=\d+"[^>]*>(?:</script>)?', t)
    assert m, f"no {asset} tag in {path}"
    return m.group(0)


def case(name, tool, files, mutate, detects, cmd, timeout=900):
    """detects(output) -> bool : did the tool report THIS defect?"""
    global skipped, seen, other_shard
    if WANT and WANT not in name.lower():
        skipped += 1
        return
    seen += 1
    if (seen - 1) % SHARD_N != SHARD_K - 1:
        other_shard += 1
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
    # Say WHAT the checker printed. A NOISY verdict used to leave nothing but
    # the word, so the flaky run could not be told from a real fault without a
    # re-run (runs 43971112849, 43971142792).
    if verdict != "PASS":
        for label, rc, out in (("before", rc0, out0), ("mutated", rc1, out1), ("after", rc2, out2)):
            lines = [l for l in out.splitlines() if l.strip()]
            shown = [l for l in lines if "FAIL" in l] or lines[-6:]
            print(f"      [{label}, exit {rc}] " + ("\n      ".join(shown[:8]) or "(no output)"))


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
# a video poster is a file too: the Arabic home page's 404'd unseen (2026-11-17)
case("video poster pointing at a missing file", "static-audit.py", ["site/index.html"],
     lambda: edit("site/index.html", 'poster="assets/video/hero-lighthouse.webp', 'poster="assets/video/no-such-poster.webp'),
     lambda o: "internal links that do not resolve" in o, PY_AUDIT)

# the Abu Simbel sun-alignment days counted as public holidays again: the
# holidays page would claim two more days off than Egypt has (2026-11-17)
case("a dated event that is not a holiday counted as one", "test_holidays.py", ["backend/pipeline/pages/holidays.py"],
     lambda: edit("backend/pipeline/pages/holidays.py", "        if e.get('not_holiday'):\n            continue\n", ""),
     lambda o: "FAIL" in o and "test_a_dated_event_that_is_not_a_holiday_is_left_out" in o,
     f'"{sys.executable}" -m unittest discover -s backend/pipeline/tests -p test_holidays.py -v')

# a visit page's "Between here and ..." lines said once per leg (2026-11-17).
# Without the grouping, Giza would say the same three train rows twice, once
# for Luxor and once for Aswan; test_visit_legs.py must catch it.
case("a visit page repeats the same leg rows", "test_visit_legs.py", ["backend/pipeline/pages/visit.py"],
     lambda: edit("backend/pipeline/pages/visit.py", "            if g[0] == keys:\n", "            if False:\n"),
     lambda o: "FAIL" in o and "test_cairo_legs_with_the_same_rows_are_said_once" in o,
     f'"{sys.executable}" -m unittest discover -s backend/pipeline/tests -p test_visit_legs.py -v')

# Governorate names in Arabic and Russian (2026-11-18). Dropping one from the
# Arabic map would show that governorate in English on every Arabic page;
# test_gov_names.py must catch it.
case("a governorate with no Arabic name", "test_gov_names.py", ["backend/pipeline/pages/egfmt.py"],
     lambda: edit("backend/pipeline/pages/egfmt.py", '"South Sinai": "جنوب سيناء", ', ''),
     lambda o: "FAIL" in o and "test_every_governorate_has_an_arabic_and_a_russian_name" in o,
     f'"{sys.executable}" -m unittest discover -s backend/pipeline/tests -p test_gov_names.py -v')

# an empty-state note that talks to the maintainer, not the traveller (2026-11-17)
case("build language back in a visitor note", "static-audit.py", ["site/visit.html"],
     lambda: edit("site/visit.html", "The cross-sections are not ready yet. Please check back soon.",
                  "The cross-sections are not ready yet. Run the visitor-layer build to populate it."),
     lambda o: "build language shown to visitors" in o and "visit.html" in o, PY_AUDIT)

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
# the phone layout of the arrival tables dropped: rows go back to three columns
# and the source column needs sideways scrolling again (2026-11-17)
case("a stacked table back to sideways scrolling on a phone", "overflow.js", ["site/arriving-in-egypt.html"],
     lambda: edit("site/arriving-in-egypt.html", "@media (max-width: 600px) {", "@media (max-width: 1px) {"),
     lambda o: "a stacked table still needs sideways scrolling" in o, f"node {HERE}/overflow.js")

# ---- 9. page sweep: a sub-nav chip pointing at a section that is gone -------
case("a temperature typed into visit.html's hand-written prose", "static-audit.py", ["site/visit.html"],
     lambda: edit("site/visit.html", '<section class="surface-light" id="terrain"',
                  '<p>Luxor reaches 41 °C in June.</p>\n<section class="surface-light" id="terrain"'),
     lambda o: "figures typed into visit.html" in o, PY_AUDIT)
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

# ---- 13d. no JavaScript: revealed blocks left invisible ---------------------
# Since study S4 part 2 two guards keep [data-aos] blocks visible without
# JavaScript: the hiding rule is scoped to html.js (which only a running script
# sets), and S1's html:not(.js) override still forces them visible. Either alone
# is enough, so removing one changes nothing a reader sees, and CI run
# 43838169768 showed a one-rule mutation going blind. The pair is load-bearing:
# drop both, and nojs.js must report HIDDEN WITHOUT JS (Explore: 106 blocks).
NOJS1 = "ONLY={p} node " + str(HERE) + "/nojs.js"


def unguard_nojs():
    edit("site/assets/egybi.css",
         "html:not(.js) [data-aos] { opacity: 1 !important; transform: none !important; }",
         "/* removed by mutation test */")
    edit("site/assets/egybi.css",
         "html.js [data-aos]:not(.is-in) { opacity: 0; transform: translateY(12px); }",
         "[data-aos]:not(.is-in) { opacity: 0; transform: translateY(12px); }")


case("revealed content hidden without JavaScript", "nojs.js", ["site/assets/egybi.css"],
     unguard_nojs,
     lambda o: "HIDDEN WITHOUT JS" in o,
     NOJS1.format(p="explore.html"))

# ---- 13e. the reveal script fails to load: no fallback -----------------------
# With scripts on but motion.js blocked, the page head's 4 s fallback must drop
# .js so egybi.css shows everything. Removing the fallback must be caught.
case("content hidden when the reveal script fails to load", "nojs.js", ["site/explore.html"],
     lambda: edit("site/explore.html",
                  'setTimeout(function(){if(!document.documentElement.classList.contains("mo-ready"))'
                  'document.documentElement.classList.remove("js")},4000)',
                  "void 0"),
     lambda o: "HIDDEN WHEN THE REVEAL SCRIPT FAILS" in o,
     NOJS1.format(p="explore.html"))

# ---- 13f. visit tables: phone layout rule switched off --------------------
# Without egybi.css's compact rule, the Giza climate table needs ~392px in a
# 289px box at 390px wide (measured 2026-11-15), so it scrolls sideways.
VT1 = "ONLY={p} node " + str(HERE) + "/visit-tables.js"
case("visit table scrolls sideways on a phone", "visit-tables.js", ["site/assets/egybi.css"],
     lambda: edit("site/assets/egybi.css",
                  "@media (max-width: 430px) {\n  .fp-table.fp-compact { font-size: var(--fs-sm); }",
                  "@media (max-width: 1px) {\n  .fp-table.fp-compact { font-size: var(--fs-sm); }"),
     lambda o: "TABLE SCROLLS" in o,
     VT1.format(p="visit/giza.html"))

# ---- 13g. visit tables: the generator's compact class dropped from a page ---
case("visit table loses its compact class", "visit-tables.js", ["site/visit/giza.html"],
     lambda: edit("site/visit/giza.html", '<table class="fp-table fp-compact">',
                  '<table class="fp-table">'),
     lambda o: "TABLE SCROLLS" in o,
     VT1.format(p="visit/giza.html"))

# ---- 13h. type scale: a one-off font size comes back --------------------
# S2 put every reading size on ten steps (typescale.py). A new literal size in
# a rule, or in a page's style attribute, must be reported as OFF-SCALE.
PY_SCALE = f'"{sys.executable}" {HERE}/type-scale.py'
case("one-off font size in egybi.css", "type-scale.py", ["site/assets/egybi.css"],
     lambda: edit("site/assets/egybi.css", ".fp-wrap { overflow-x: auto; }",
                  ".fp-wrap { overflow-x: auto; font-size: 0.83rem; }"),
     lambda o: "OFF-SCALE" in o and "0.83rem" in o, PY_SCALE)
case("one-off font size in a page's style attribute", "type-scale.py", ["site/visit/giza.html"],
     lambda: edit("site/visit/giza.html", 'style="font-size:var(--fs-lg);',
                  'style="font-size:1.3rem;'),
     lambda o: "OFF-SCALE" in o and "[style attribute]" in o, PY_SCALE)

# ---- 13i. type scale: a step redefined in egybi.css only -------------------
case("type scale step drifts from typescale.py", "type-scale.py", ["site/assets/egybi.css"],
     lambda: edit("site/assets/egybi.css", "--fs-sm: 0.875rem;", "--fs-sm: 0.9rem;"),
     lambda o: "TOKEN DRIFT" in o and "--fs-sm" in o, PY_SCALE)

# ---- 13j. motion weight: a retired library or an unused AOS comes back ------
# S4 part 1 stopped loading Motion One (18 pages) and AOS where nothing uses it
# (5 pages). Putting either back must be reported.
PY_MW = f'"{sys.executable}" {HERE}/motion-weight.py'
case("retired Motion One library loaded again", "motion-weight.py", ["site/privacy.html"],
     lambda: edit("site/privacy.html", asset_tag("site/privacy.html", "motion.js"),
                  '<script src="assets/vendor/motion.min.js"></script>\n' + asset_tag("site/privacy.html", "motion.js")),
     lambda o: "RETIRED LIBRARY" in o and "privacy.html" in o, PY_MW)
case("retired AOS stylesheet loaded again", "motion-weight.py", ["site/plan.html"],
     lambda: edit("site/plan.html", asset_tag("site/plan.html", "egybi.css"),
                  asset_tag("site/plan.html", "egybi.css") + '\n<link href="assets/vendor/aos.css" rel="stylesheet">'),
     lambda o: "RETIRED LIBRARY" in o and "aos.css" in o and "plan.html" in o, PY_MW)

# ---- 13k. the one reveal system never reveals -----------------------------
# S4 part 2: motion.js adds .is-in as each [data-aos] block enters the view.
# If it stops doing so while still marking itself started, the blocks stay
# hidden for good, which only the scroll-through pass of nojs.js can see.
case("reveal script starts but never reveals", "nojs.js", ["site/assets/motion.js"],
     lambda: edit("site/assets/motion.js", "function show(el) { el.classList.add('is-in'); }",
                  "function show(el) { }"),
     lambda o: "STUCK HIDDEN" in o,
     NOJS1.format(p="explore.html"))

# ---- 13k2. the sweep removed: a fast fling leaves blocks hidden ---------------
# The observer misses blocks that pass the screen between frames; the sweep in
# motion.js reveals them. Without it, one jump to the bottom leaves every block
# in between hidden, deterministically (CI run 43857746528 saw 5 then 11 under
# an ordinary scroll, which is the flaky form of the same defect).
case("reveal sweep removed: blocks skipped by a fling stay hidden", "nojs.js", ["site/assets/motion.js"],
     lambda: edit("site/assets/motion.js", "      pending.push(el);\n", ""),
     lambda o: "STUCK AFTER A FLING" in o,
     NOJS1.format(p="explore.html"))

# ---- 13k3. a counter written as 0 in the HTML ---------------------------------
# A count-up only animates a figure that is already in the page. Written as 0,
# a reader without JavaScript, or one who flings past the counter, is told
# "0 feature films" (17 counters did this until 2026-11-16).
case("counter written as 0 in the HTML", "nojs.js", ["site/explore.html"],
     lambda: edit("site/explore.html", 'data-sep="1">4,000+</div>', 'data-sep="1">0</div>'),
     lambda o: "COUNTER WRONG WITHOUT JS" in o and "explore.html" in o,
     NOJS1.format(p="explore.html"))

# ---- 13l. a page sets the flag but loses its reveal script ------------------
# Without motion.js, the .js flag hides every [data-aos] block until the 4 s
# fallback: four seconds of blank sections on every visit.
case("flag set but the reveal script not loaded", "motion-weight.py", ["site/about.html"],
     lambda: edit("site/about.html", asset_tag("site/about.html", "motion.js"), ""),
     lambda o: "FLAG WITHOUT REVEALER" in o and "about.html" in o, PY_MW)

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

# opening hours keyed to a site that has no page are shown nowhere (2026-11-17)
case("opening hours for a site with no visit page", "coverage.py", ["site/data/opening-hours.json"],
     lambda: edit("site/data/opening-hours.json", '{ "key": "philae", "hours"', '{ "key": "philea", "hours"'),
     lambda o: "opening hours for a site with no visit page" in o and "'philea'" in o, COVERAGE)

# ---- 15. chrome drift: 404 links made relative ------------------------------
# The same file answers /nonsense.html and /deep/path/nonsense.html; a relative
# href sends a lost reader deeper into a directory that does not exist.
case("404 chrome link made relative", "coverage.py", ["site/404.html"],
     lambda: edit("site/404.html", 'href="/explore.html"', 'href="explore.html"'),
     lambda o: "not root-absolute" in o, COVERAGE)


# ---- 15b-15c. data older than its refresh cadence ---------------------------
# Until 2026-11-08 this rule could not fire for the hand-curated files, and on
# Windows for any file: a workflow that merely LISTED a data file as a trigger
# path was read as its writer, and backslash paths defeated every name match.
# The rule printed findings for files that were fine and was never shown
# catching a file that was not. These two cases are that showing.
def age_data_file(name, days):
    """Backdate a data file's own date fields by `days` from today."""
    p = Path(f"site/data/{name}")
    d = json.loads(p.read_text(encoding="utf-8"))
    old = (datetime.date.today() - datetime.timedelta(days=days)).isoformat()
    for k in ("as_of", "fetched_at", "updated"):
        if k in d:
            d[k] = old
    p.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")


case("daily FX file older than its cadence", "coverage.py", ["site/data/fx-today.json"],
     lambda: age_data_file("fx-today.json", 9),
     lambda o: "older than its pipeline's cadence" in o and "fx-today.json: 9d old, refresh-fx.yml" in o,
     COVERAGE)

case("hand-curated calendar overdue for re-reading", "coverage.py", ["site/data/calendar.json"],
     lambda: age_data_file("calendar.json", 150),
     lambda o: "calendar.json: 150d old, hand review" in o, COVERAGE)

# one price row left unread while the rest of the sheet was refreshed (2026-11-17)
case("a fair-price row past its re-check date", "coverage.py", ["site/data/fair-prices.json"],
     lambda: edit("site/data/fair-prices.json", '"published": "2024-12-04", "kind": "news report", "checked": "2026-11-17"',
                  '"published": "2024-12-04", "kind": "news report", "checked": "2025-01-02"'),
     lambda o: "price row past its re-check date" in o and "khufu-interior last checked 2025-01-02" in o, COVERAGE)
# the visa rise announced for 1 January 2027 has happened but the page still
# gives US$30 as the current fee (2026-11-17): moved to a date already past
# Russian site names on the heat page (2026-11-18). Dropping the Russian
# branch of siteName puts English names back in the Russian month caption;
# twin-data.js must report it.
case("the Russian month caption names a site in English", "twin-data.js", ["site/assets/visit.js"],
     lambda: edit("site/assets/visit.js", "if (LANG === 'ru') return t(s.name);", ""),
     lambda o: "ru/visit.html month caption names a site in English" in o, f"node {HERE}/twin-data.js")

# Coordinates on the Arabic place card in Arabic-Indic digits (2026-11-18).
# Writing them with toFixed again must make twin-data.js report it.
case("the Arabic place card's coordinates in Western digits", "twin-data.js", ["site/assets/places.js"],
     lambda: edit("site/assets/places.js", "if (LANG === 'ar' && F) return F.fixed(p.lat, 'ar', 4)", "if (false) return F.fixed(p.lat, 'ar', 4)"),
     lambda o: "coordinates in Western digits" in o, f"node {HERE}/twin-data.js")

# The quote checker (2026-11-18) treats the top of a range as inside it. An
# off-by-one that calls the top "above" would tell a traveller a fair price
# was too high; fair-verdict.js must catch it.
case("the quote checker calls the top of the range too high", "fair-verdict.js", ["site/assets/fair.js"],
     lambda: edit("site/assets/fair.js", "if (amount > top) return", "if (amount >= top) return"),
     lambda o: "FAIL the top of the range is inside it" in o, f"node {HERE}/fair-verdict.js")

# Luxor is on inDrive's own city list and not on Uber's (2026-11-18). Losing
# it from the inDrive row would leave a Luxor visitor with no app named;
# test_ride_apps.py must catch it.
case("Luxor dropped from the inDrive row", "test_ride_apps.py", ["site/data/arrival.json"],
     lambda: edit("site/data/arrival.json", '"Cairo, Alexandria, Luxor, Aswan, Hurghada', '"Cairo, Alexandria, Aswan, Hurghada'),
     lambda o: "FAIL" in o and "test_every_city_missing_from_uber" in o,
     f'"{sys.executable}" -m unittest discover -s backend/pipeline/tests -p test_ride_apps.py -v')

# The Cairo legs carry the sleeper fares (2026-11-18). Dropping the
# row from the leg must make leg-rows.js report the leg's rows as wrong.
case("the sleeper fares dropped from the Cairo-Luxor leg", "leg-rows.js", ["site/data/getting-around.json"],
     lambda: edit("site/data/getting-around.json", '"luxor"], "rows": ["train-bashtil", "train-sleeper", "train-fares"',
                  '"luxor"], "rows": ["train-bashtil", "train-fares"'),
     lambda o: "FAIL Giza to Karnak takes the Cairo-Luxor sleeper rows" in o, f"node {HERE}/leg-rows.js")

# made-in-egypt.html says EgyBI takes no payment from any maker (2026-11-18).
# A referral tag on a maker link would make that untrue; coverage.py must refuse it.
case("a maker link carrying a referral tag", "coverage.py", ["site/data/made-in-egypt.json"],
     lambda: edit("site/data/made-in-egypt.json", '"maker_url": "https://kiliim.com/"', '"maker_url": "https://kiliim.com/?ref=egybi"'),
     lambda o: "maker link that is not a plain https link" in o and "kiliim" in o, COVERAGE)

case("an announced visa change that has taken effect", "coverage.py", ["site/data/arrival.json"],
     lambda: edit("site/data/arrival.json", '"changes_on": "2027-01-01"', '"changes_on": "2026-01-01"'),
     lambda o: "an announced change has taken effect" in o and "visa-2027" in o, COVERAGE)
# a fact row whose source was dropped: no link, and nothing saying what was
# searched (2026-11-17), as the Careem row would read with its search note gone
case("a row with no source link that does not say what was searched", "coverage.py", ["site/data/arrival.json"],
     lambda: edit("site/data/arrival.json", '"source": "Searched 17 Nov 2026: no city list on careem.com"', '"source": ""'),
     lambda o: "does not say what was searched" in o and "careem-cities" in o, COVERAGE)
# a safety row re-sourced to a blog: the plan's rule is official advice only
# for anything about personal safety (2026-11-17)
case("a safety row not sourced from official travel advice", "coverage.py", ["site/data/arrival.json"],
     lambda: edit_re("site/data/arrival.json",
                     r'("key": "alone-hotel"[\s\S]*?"source_url": ")https://www\.gov\.uk/[^"]*', r'\1https://example-travel-blog.com/egypt-tips'),
     lambda o: "safety row not sourced from official travel advice" in o and "alone-hotel cites example-travel-blog.com" in o, COVERAGE)

PY_CHECKS = f'"{sys.executable}" {HERE}/checks.py'

# ---- 15d. a CSS class nothing uses ------------------------------------------
# checks.py orphans reported .mk-label-pt, a live class, on every run until
# 2026-11-08. Widening what counts as a use must not blind it to a real orphan.
case("CSS class no markup or script uses", "checks.py orphans", ["site/assets/egybi.css"],
     lambda: Path("site/assets/egybi.css").write_text(
         Path("site/assets/egybi.css").read_text(encoding="utf-8")
         + "\n.zz-mutation-orphan { color: #000; }\n", encoding="utf-8"),
     lambda o: ".zz-mutation-orphan" in o, PY_CHECKS + " orphans")

# ---- 15e. a price prediction in reader-visible text -------------------------
# checks.py fra now skips whole-line // comments in scripts. Copy a reader can
# see, in a page or in a script's strings, must still be caught.
case("price prediction in a page's visible text", "checks.py fra", ["site/about.html"],
     lambda: edit("site/about.html", '<a href="stories.html">Data Stories</a>',
                  '<a href="stories.html">Data Stories</a> The pound will fall again.'),
     lambda o: "[price prediction]" in o and "about.html" in o, PY_CHECKS + " fra")

case("price prediction in a script string", "checks.py fra", ["site/assets/stories.js"],
     lambda: Path("site/assets/stories.js").write_text(
         Path("site/assets/stories.js").read_text(encoding="utf-8")
         + "\nvar zzMutation = 'EGX shares will rise this week';\n", encoding="utf-8"),
     lambda o: "[price prediction]" in o and "stories.js" in o, PY_CHECKS + " fra")


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

# RETIRED 2026-11-16 (study S4 part 2). The false COVERED came from AOS's
# reveal: for ~700 ms a wrapper was the topmost element at a button's centre.
# AOS is no longer loaded; motion.js moves a block and its controls together
# (one transform on the block), so hit-testing mid-animation finds the control
# itself. Measured in CI run 43838169768: with BOTH guards removed, tap-targets.js
# reported explore.html clean, so the case could no longer fail. The settle and
# the reduced-motion context stay in tap-targets.js as cheap insurance;
# unsettle_tap_targets() is kept so the case can return if a future animation
# brings the overlap back.


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

# ---- 42b. a self-cancelling workflow that alerts on its superseded runs ------
# The other side of 42. On 2026-11-17 the #167 merge cancelled main's #166 run;
# Verify's `mutation` job, gated `always() && ...`, still ran on the cancelled
# shards and alerted on issue #155. Putting always() back has to turn the
# audit red.
case("a self-cancelling workflow that alerts on superseded runs", "workflow-audit.py",
     [".github/workflows/verify-browser.yml"],
     lambda: edit(".github/workflows/verify-browser.yml",
                  "if: ${{ !cancelled() && needs.gate.outputs.run == 'true' && needs.gate.outputs.mutate == 'true' }}",
                  "if: ${{ always() && needs.gate.outputs.run == 'true' && needs.gate.outputs.mutate == 'true' }}"),
     lambda o: "verify-browser: cancels superseded runs" in o,
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

# A private page (the account page) must stay out of search: noindex, and no
# sitemap entry. Removing the noindex is the well-meaning edit that would put
# a page nobody should land on from Google into the index.
case("account page made indexable", "seo.py", ["site/account.html"],
     lambda: edit("site/account.html", '<meta name="robots" content="noindex,follow">', ""),
     lambda o: "private page indexable" in o and "account.html" in o, PY_SEO)

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


# ---- 25. beacon-url.js: a page view sent to an address that does not exist ---
# The defect it was written for: a relative 'api/hit.php' made every page in
# visit/, papyrus/ and practice/ post to <folder>/api/hit.php, a 404, so 153
# pages' views were never counted. Match the FAIL line for a folder page, not
# the summary, which a passing run prints too.
case("analytics beacon resolved against the page", "beacon-url.js",
     ["site/assets/analytics.js"],
     lambda: edit("site/assets/analytics.js",
                  "var url = me ? new URL('../api/hit.php', me).href : '/api/hit.php';",
                  "var url = 'api/hit.php';"),
     lambda o: "FAIL /visit/giza.html -> https://egybi.com/visit/api/hit.php" in o,
     f"node {HERE}/beacon-url.js")


# ---- 26-27. auth-flow.sh: accounts that leak or do not die ------------------
# The two failures that matter most in an account system: a deletion that
# leaves the person's data behind, and one user able to act on another's rows.
# auth-flow.sh runs PHP, so these cases only run where PHP exists (CI). Each
# matches the FAIL line for the exact step, not the summary.
SH_AUTH = f"bash {HERE}/auth-flow.sh"

case("account deletion leaves the trips table behind", "auth-flow.sh",
     ["site/auth/lib.php"],
     lambda: edit("site/auth/lib.php",
                  "const ACCOUNT_TABLES = ['user_trips', ",
                  "const ACCOUNT_TABLES = ["),
     lambda o: "FAIL  1 user_trips rows left for A" in o, SH_AUTH)

case("one user can delete another user's trip", "auth-flow.sh",
     ["site/auth/auth.php"],
     lambda: edit("site/auth/auth.php",
                  "$del = $db->prepare('DELETE FROM user_trips WHERE id=? AND user_id=?');",
                  "$del = $db->prepare('DELETE FROM user_trips WHERE id=? OR user_id=?');"),
     lambda o: "FAIL  A cannot delete B's trip" in o, SH_AUTH)


# ---- 28-29. save-place.js: a save that undoes itself, or never shows --------
# The button toggles, so finishing a save after sign-in without first asking
# whether the place was already saved would REMOVE it: the reader presses
# Save and loses the place. And a button left hidden is a feature nobody sees.
NODE_SAVE = f"node {HERE}/save-place.js"

case("signing in undoes a place already saved", "save-place.js",
     ["site/assets/saveplace.js"],
     lambda: edit("site/assets/saveplace.js",
                  "if (saved) say('Already in your saved places.', 'ok'); else toggle(A);",
                  "toggle(A);"),
     lambda o: "FAIL  signing in does not undo a place already saved" in o, NODE_SAVE)

case("save button never shown", "save-place.js",
     ["site/assets/saveplace.js"],
     lambda: edit("site/assets/saveplace.js", "  btn.hidden = false;\n", "\n"),
     lambda o: "FAIL  signed in: the button is visible" in o, NODE_SAVE)


# ---- 31. auth-flow.sh: subscribing an address nobody has proven -------------
# The account page subscribes with no confirmation email, which is sound only
# because the account's email is verified. Without that check, anyone could
# create an account under someone else's address and subscribe it.
# ---- Travellers' notes interface (Round 4, R4-2b) ---------------------------
# notes.js puts every piece of a note on the page with textContent. Switch its
# one helper to innerHTML and notes-ui.js's hostile fixture must become markup.
NOTES_UI = f"node {HERE}/notes-ui.js"
case("notes: a note's text rendered as HTML", "notes-ui.js", ["site/assets/notes.js"],
     lambda: edit("site/assets/notes.js", "if (text != null) e.textContent = String(text);",
                  "if (text != null) e.innerHTML = String(text);"),
     lambda o: "MARKUP INJECTED" in o, NOTES_UI)
case("notes: the place filter not sent to the API", "notes-ui.js", ["site/assets/notes.js"],
     lambda: edit("site/assets/notes.js", "(siteFilter ? '&site=' + encodeURIComponent(siteFilter) : '')", "''"),
     lambda o: "FILTER IGNORED" in o, NOTES_UI)

# ---- Near me (Round 4, R4-8) -----------------------------------------------
# Pressing Near me must sort the list nearest first. Drop the sort and the
# column still appears, which is exactly the failure a glance would miss.
NEAR = f"node {HERE}/near-me.js"
case("near me: the list is not sorted by distance", "near-me.js",
     ["site/assets/places.js"],
     lambda: edit("site/assets/places.js",
                  "      out.sort(function (a, b) { return dist.get(a) - dist.get(b); });\n", ""),
     lambda o: "NEAR ME NOT SORTED" in o, NEAR)

# ---- Round 5: the browser platform (M1, M2, M5) and return after confirming (M6)
PLATFORM = f"node {HERE}/platform.js"
AUTH_RETURN = f"node {HERE}/auth-return.js"
case("page transition kept for readers who asked for reduced motion", "platform.js",
     ["site/assets/egybi.css"],
     lambda: edit("site/assets/egybi.css",
                  "@media (prefers-reduced-motion: no-preference) {\n  @view-transition", "@media all {\n  @view-transition"),
     lambda o: "TRANSITION UNDER REDUCED MOTION" in o, PLATFORM)
case("the account page prefetched on hover", "platform.js",
     ["site/about.html"],
     lambda: edit("site/about.html", '{"not":{"href_matches":"/account.html"}}', '{"not":{"href_matches":"/nothing.html"}}'),
     lambda o: "PREFETCHED PRIVATE" in o, PLATFORM)
case("the offline worker not registered on ordinary pages", "platform.js",
     ["site/assets/egybi.js"],
     lambda: edit("site/assets/egybi.js", "navigator.serviceWorker.register('/sw.js').catch(", "Promise.resolve().catch("),
     lambda o: "NO WORKER ON PAGES" in o, PLATFORM)
case("return after confirming follows any remembered address", "auth-return.js",
     ["site/assets/auth.js"],
     lambda: edit("site/assets/auth.js", "typeof r.p === 'string' && SAFE_RETURN.test(r.p) &&", "typeof r.p === 'string' &&"),
     lambda o: "OPEN REDIRECT" in o, AUTH_RETURN)
case("return after confirming fires on an ordinary sign-in", "auth-return.js",
     ["site/assets/auth.js"],
     lambda: edit("site/assets/auth.js", "if (cameFromLink) { var to = takeReturn();", "if (true) { var to = takeReturn();"),
     lambda o: "UNASKED REDIRECT" in o, AUTH_RETURN)

# ---- Community in every header, and a header that fits (2026-11-16) --------
HEADER = f"node {HERE}/header.js"
case("Community dropped from one hand-written page's header", "header.js", ["site/about.html"],
     lambda: edit("site/about.html", '<a href="community.html">Community</a>', ''),
     lambda o: "COMMUNITY MISSING" in o and "about.html" in o, HEADER)
case("the desktop header row kept below 1280px, where it overflows", "header.js", ["site/assets/egybi.css"],
     lambda: edit("site/assets/egybi.css", "@media (max-width: 1279px) {", "@media (max-width: 1024px) {"),
     lambda o: "HEADER OVERFLOW" in o, HEADER)
case("the current page no longer highlighted in the header", "header.js", ["site/assets/egybi.js"],
     lambda: edit("site/assets/egybi.js", "if (target === here) a.classList.add('active');", "if (false) a.classList.add('active');"),
     lambda o: "NO ACTIVE HIGHLIGHT" in o, HEADER)

# ---- trilingual stage 1: twins, language, hreflang, button, no English left --
I18N = f'"{sys.executable}" {HERE}/i18n.py'
case("a Russian twin missing", "i18n.py", ["site/ru/privacy.html"],
     lambda: Path("site/ru/privacy.html").unlink(),
     lambda o: "TWIN MISSING" in o, I18N)
case("an Arabic page marked left to right", "i18n.py", ["site/ar/about.html"],
     lambda: edit("site/ar/about.html", 'dir="rtl"', 'dir="ltr"'),
     lambda o: "LANG/DIR WRONG" in o, I18N)
case("a twin's canonical pointing at the English page", "i18n.py", ["site/ru/about.html"],
     lambda: edit("site/ru/about.html", '<link rel="canonical" href="https://egybi.com/ru/about.html">',
                  '<link rel="canonical" href="https://egybi.com/about.html">'),
     lambda o: "CANONICAL WRONG" in o, I18N)
case("an English page losing its Russian hreflang", "i18n.py", ["site/about.html"],
     lambda: edit("site/about.html", '<link rel="alternate" hreflang="ru" href="https://egybi.com/ru/about.html">\n', ''),
     lambda o: "HREFLANG MISSING" in o, I18N)
case("a twin without the language button", "i18n.py", ["site/ru/privacy.html"],
     lambda: edit("site/ru/privacy.html", '<details class="lang-switch">', '<details class="x-switch">'),
     lambda o: "NO SWITCHER" in o, I18N)
case("a twin left out of the sitemap", "i18n.py", ["site/sitemap.xml"],
     lambda: edit("site/sitemap.xml", "https://egybi.com/ar/privacy.html", "https://egybi.com/ar/privacy-x.html"),
     lambda o: "NOT IN SITEMAP" in o, I18N)
case("English left in a Russian page's script-written cards", "i18n.py", ["site/ru/about.html"],
     lambda: edit("site/ru/about.html", "'Суэцкий канал'", "'The Suez Canal'"),
     lambda o: "ENGLISH LEAK" in o, I18N)
case("English left on an Arabic page", "i18n.py", ["site/ar/about.html"],
     lambda: edit("site/ar/about.html", "بيت الحياة.", "The House of Life."),
     lambda o: "ENGLISH LEAK" in o, I18N)
# text the generator never collected (a <label> wrapping its <input>): the
# units()-based check above is blind to it, the text-node instrument is not
case("a Russian label left in English beside its input", "i18n.py", ["site/ru/index.html"],
     lambda: edit("site/ru/index.html", "<label>Прибытие<input", "<label>Arriving<input"),
     lambda o: "ENGLISH LEAK" in o and "text node" in o, I18N)
# the Russian glossary (2026-11-17): "account" is «аккаунт»; the rejected
# «учётная запись» coming back into the catalogue must fail
case("a rejected Russian term back in the catalogue", "i18n.py", ["backend/i18n/ru.tsv"],
     lambda: edit("backend/i18n/ru.tsv", " EgyBI: что мы собираем (аккаунт или ", " EgyBI: что мы собираем (учётная запись или "),
     lambda o: "GLOSSARY TERM" in o and "ru.tsv" in o, I18N)
# the Arabic glossary (2026-11-17): "named source" is «مصدر محدّد»; the
# calque «مصدر مسمّى» coming back into the catalogue must fail
case("a rejected Arabic term back in the catalogue", "i18n.py", ["backend/i18n/ar.tsv"],
     lambda: edit("backend/i18n/ar.tsv", "يحمل مصدرًا محدّدًا وتاريخًا", "يحمل مصدرًا مسمّى وتاريخًا"),
     lambda o: "GLOSSARY TERM" in o and "ar.tsv" in o, I18N)
case("an Arabic label left in English beside its select", "i18n.py", ["site/ar/fair-prices.html"],
     lambda: edit("site/ar/fair-prices.html", "<label>اعرض المبالغ بـ<select", "<label>Show amounts in<select"),
     lambda o: "ENGLISH LEAK" in o and "text node" in o, I18N)
# the home page's twins: the home page is the folder address, egybi.com/ar/
case("the Arabic home page claiming the English home page as its canonical", "i18n.py", ["site/ar/index.html"],
     lambda: edit("site/ar/index.html", '<link rel="canonical" href="https://egybi.com/ar/">',
                  '<link rel="canonical" href="https://egybi.com/">'),
     lambda o: "CANONICAL WRONG" in o, I18N)

# ---- the translated copies load the site's data (2026-11-17) ----------------
TWIN = f"node {HERE}/twin-data.js"
case("translated pages fetching data relative to themselves", "twin-data.js", ["site/assets/trip.js"],
     lambda: edit("site/assets/trip.js", "cache[path] = fetch(url(path), {", "cache[path] = fetch(path, {"),
     lambda o: "TWIN DATA FROM WRONG FOLDER" in o, TWIN)
case("EGYBI.url resolving against the page, not the site", "twin-data.js", ["site/assets/egybi.js"],
     lambda: edit("site/assets/egybi.js", "  var ROOT = ME ? new URL('../', ME).href : '';", "  var ROOT = '';"),
     lambda o: "TWIN DATA FROM WRONG FOLDER" in o or "TWIN REQUEST FAILED" in o, TWIN)
case("a translated page without its string table", "twin-data.js", ["site/ar/index.html"],
     lambda: edit_re("site/ar/index.html", r'<script src="\.\./assets/i18n/ar\.js\?v=[0-9a-f]+"></script>\n', ""),
     lambda o: "TWIN SCRIPT TEXT IN ENGLISH" in o, TWIN)
case("the sign-in dialog's title left out of t()", "twin-data.js", ["site/assets/auth.js"],
     lambda: edit("site/assets/auth.js", "title.textContent = t('Welcome back');", "title.textContent = 'Welcome back';"),
     lambda o: "TWIN SCRIPT TEXT IN ENGLISH" in o, TWIN)
case("a script string left out of EGYBI.t", "twin-data.js", ["site/assets/wayfinding.js"],
     lambda: edit("site/assets/wayfinding.js", "(window.EGYBI && window.EGYBI.t) ? window.EGYBI.t('On this page') : 'On this page'", "'On this page'"),
     lambda o: "TWIN SCRIPT TEXT IN ENGLISH" in o, TWIN)
# prices.html has no translated copy, so a relative link from ar/ lands on a
# page that does not exist (visit.html has one since 2b, so it no longer can)
case("a script link to an untranslated page left relative to the twin", "twin-data.js", ["site/assets/home.js"],
     lambda: edit("site/assets/home.js", "' + T.url('prices.html#fx-section') + '", "prices.html#fx-section"),
     lambda o: "TWIN LINK WRONG FOLDER" in o, TWIN)
case("a script link to a translated page sent to the English copy", "twin-data.js", ["site/assets/trip.js"],
     lambda: edit("site/assets/trip.js", "if (LANG !== 'en' && TWINS.indexOf(file) !== -1)", "if (false)"),
     lambda o: "TWIN LINK WRONG FOLDER" in o, TWIN)

# ---- the year strip on When to go (2026-11-16) -------------------------------
YEAR = f"node {HERE}/year-strip.js"
case("year strip months all at once, not January to December", "year-strip.js", ["site/assets/heat-calendar.css"],
     lambda: edit("site/assets/heat-calendar.css", "animation-delay: calc(var(--m, 0) * 70ms);", "animation-delay: 0ms;"),
     lambda o: "YEAR NOT IN ORDER" in o, YEAR)
# Reduced motion is locked THREE times: egybi.css's site-wide rule (under
# reduce, * { animation: none !important }), the script's own check and the
# stylesheet's no-preference query. Removing two left the site still, so the
# case could never fire (runs 43948810613 and 43953866021); it removes all
# three, to prove the check sees motion when nothing stops it.
case("year strip moving for readers who asked for reduced motion", "year-strip.js",
     ["site/assets/year-strip.js", "site/assets/heat-calendar.css", "site/assets/egybi.css"],
     lambda: (edit("site/assets/year-strip.js", "if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;", ""),
              edit("site/assets/heat-calendar.css", "@media (prefers-reduced-motion: no-preference) {", "@media all {"),
              edit("site/assets/egybi.css", "  * { animation: none !important; transition: none !important; }", "  * { }")),
     lambda o: "YEAR MOTION UNDER REDUCED MOTION" in o, YEAR)
case("year strip waits for a third of itself before showing a cell", "year-strip.js", ["site/assets/year-strip.js"],
     lambda: edit("site/assets/year-strip.js", "}, { threshold: 0 });", "}, { threshold: 0.35 });"),
     lambda o: "YEAR EMPTY ON SCREEN" in o, YEAR)
case("year strip hidden without JavaScript", "year-strip.js", ["site/assets/heat-calendar.css"],
     lambda: edit("site/assets/heat-calendar.css", "  .hc-table.is-waiting td { opacity: 0; }", "  .hc-table td { opacity: 0; }"),
     lambda o: "YEAR HIDDEN WITHOUT JS" in o, YEAR)

# ---- the briefing map: where the sites are and how hot (2026-11-16) ---------
BMAP = f"node {HERE}/briefing-map.js"
case("briefing map dots all one colour", "briefing-map.js", ["site/assets/site-map.js"],
     lambda: edit("site/assets/site-map.js", "c.setAttribute('fill', bd ? bd.colour : '#C9A227');", "c.setAttribute('fill', '#C9A227');"),
     lambda o: "MAP COLOURS WRONG" in o, BMAP)
case("briefing map dots all at once, not north to south", "briefing-map.js", ["site/assets/site-map.css"],
     lambda: edit("site/assets/site-map.css", "animation-delay: calc(var(--i, 0) * 70ms);", "animation-delay: 0ms;"),
     lambda o: "MAP ORDER WRONG" in o, BMAP)
# Reduced motion is locked THREE times: egybi.css's site-wide rule (under
# reduce, * { animation: none !important }), the script's own check and the
# stylesheet's no-preference query. Removing two left the site still, so the
# case could never fire (runs 43948810613 and 43953866021); it removes all
# three, to prove the check sees motion when nothing stops it.
case("briefing map moving for readers who asked for reduced motion", "briefing-map.js",
     ["site/assets/site-map.js", "site/assets/site-map.css", "site/assets/egybi.css"],
     lambda: (edit("site/assets/site-map.js", "var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;", "var reduce = false;"),
              edit("site/assets/site-map.css", "@media (prefers-reduced-motion: no-preference) {", "@media all {"),
              edit("site/assets/egybi.css", "  * { animation: none !important; transition: none !important; }", "  * { }")),
     lambda o: "MAP MOTION UNDER REDUCED MOTION" in o, BMAP)
case("briefing map waits for a third of itself before showing any dot", "briefing-map.js", ["site/assets/site-map.js"],
     lambda: edit("site/assets/site-map.js", "}, { threshold: 0 });", "}, { threshold: 0.35 });"),
     lambda o: "MAP EMPTY ON SCREEN" in o, BMAP)
case("briefing map hidden without JavaScript", "briefing-map.js", ["site/assets/site-map.css"],
     lambda: edit("site/assets/site-map.css", ".site-map img, .site-map svg { display: block;", ".site-map img { display: none; } .site-map svg { display: block;"),
     lambda o: "MAP HIDDEN WITHOUT JS" in o, BMAP)

# ---- travellers' notes on visit pages (R4-2c) and reading progress (M3) ------
GUIDE = f"node {HERE}/guide.js"
case("visit-page notes rendered as HTML", "guide.js", ["site/assets/visit-notes.js"],
     lambda: edit("site/assets/visit-notes.js", "if (text != null) e.textContent = String(text);",
                  "if (text != null) e.innerHTML = String(text);"),
     lambda o: "MARKUP INJECTED" in o, GUIDE)
case("reading progress kept for readers who asked for reduced motion", "guide.js", ["site/assets/progress.css"],
     lambda: edit("site/assets/progress.css", "@media (prefers-reduced-motion: no-preference) {", "@media all {"),
     lambda o: "PROGRESS UNDER REDUCED MOTION" in o, GUIDE)

# ---- Offline (Round 4, R4-7) ------------------------------------------------
# The worker must answer navigations from its cache when the network fails.
# Let navigations fall through to the network and the offline plan is gone.
OFFLINE = f"node {HERE}/offline.js"
case("offline: pages not served from the cache with no signal", "offline.js",
     ["site/sw.js"],
     lambda: edit("site/sw.js", "  if (req.mode === 'navigate') {", "  if (false) {"),
     lambda o: "OFFLINE PLAN NOT SHOWN" in o or "OFFLINE PAGE MISSING" in o, OFFLINE)
case("offline: account requests cached", "offline.js",
     ["site/sw.js"],
     lambda: edit("site/sw.js", "  if (/^\\/(auth|api)\\//.test(url.pathname)) return;\n", ""),
     lambda o: "ACCOUNT DATA CACHED" in o, OFFLINE)

case("offline: a page's query string (a verify token) cached", "offline.js",
     ["site/sw.js"],
     lambda: edit("site/sw.js", "put(PAGES, MAX_PAGES, key, res)", "put(PAGES, MAX_PAGES, req, res)"),
     lambda o: "ACCOUNT DATA CACHED" in o and "verify=" in o, OFFLINE)

# ---- Trip share link (Round 4, R4-6) ---------------------------------------
# A shared link is untrusted input. Without the Egypt bounds check, a link can
# place a stop anywhere; without the ask-first branch, opening a link silently
# replaces the reader's own saved plan.
SHARE = f"node {HERE}/share-link.js"
case("share link: stops outside Egypt accepted", "share-link.js",
     ["site/assets/plan.js"],
     lambda: edit("site/assets/plan.js",
                  "if (!(lat > 21 && lat < 32.5 && lon > 24 && lon < 37.5) || days < 1 || days > 30) return null;",
                  "if (days < 1 || days > 30) return null;"),
     lambda o: "SHARE ACCEPTS BAD LINK" in o, SHARE)
case("share link: the reader's own plan replaced without asking", "share-link.js",
     ["site/assets/plan.js"],
     lambda: edit("site/assets/plan.js",
                  "    if (!S.trip.stops.length) { apply(); return; }",
                  "    apply(); return;"),
     lambda o: "OWN PLAN OVERWRITTEN" in o, SHARE)

# ---- Travellers' notes (Round 4, R4-2a): each guard must be load-bearing ----
case("notes: one user can delete another user's note", "auth-flow.sh",
     ["site/api/notes.php"],
     lambda: edit("site/api/notes.php",
                  "if (!$note || $note['user_id'] !== $u['id']) json_out(false, ['message' => 'Unknown note.'], 404);",
                  "if (!$note) json_out(false, ['message' => 'Unknown note.'], 404);"),
     lambda o: "FAIL  notes: F cannot delete E's note" in o, SH_AUTH)

case("notes: a write without its CSRF token", "auth-flow.sh",
     ["site/api/notes.php"],
     lambda: edit("site/api/notes.php", "    require_csrf($s);\n    $u = current_user();",
                  "    $u = current_user();"),
     lambda o: "FAIL  notes: no CSRF token refused" in o, SH_AUTH)

case("notes: an unverified account may write", "auth-flow.sh",
     ["site/api/notes.php"],
     lambda: edit("site/api/notes.php", "if ((int)$u['email_verified'] !== 1) {",
                  "if (false) {"),
     lambda o: "FAIL  notes: unverified email refused" in o, SH_AUTH)

case("notes: a new account's notes skip moderation", "auth-flow.sh",
     ["site/api/notes.php"],
     lambda: edit("site/api/notes.php", "? 'published' : 'queued';", "? 'published' : 'published';"),
     lambda o: "FAIL  notes: E writes a note (queued)" in o, SH_AUTH)

case("notes: account deletion leaves the notes behind", "auth-flow.sh",
     ["site/auth/lib.php"],
     lambda: edit("site/auth/lib.php", "        notes_delete_user($db, $userId);\n", ""),
     lambda o: "FAIL  notes: no notes left for E" in o, SH_AUTH)

case("notes: reports never hide a note", "auth-flow.sh",
     ["site/auth/notes_lib.php"],
     lambda: edit("site/auth/notes_lib.php", "const NOTES_HIDE_AT_REPORTS = 3;", "const NOTES_HIDE_AT_REPORTS = 999;"),
     lambda o: "FAIL  notes: reports from two addresses hide an untrusted author's note" in o, SH_AUTH)

# ---- the R4-2b security review: each new guard must be load-bearing ---------
case("notes: three reports from one address hide a note", "auth-flow.sh",
     ["site/auth/notes_lib.php"],
     lambda: edit("site/auth/notes_lib.php",
                  " || (int)$r['ips'] < NOTES_HIDE_MIN_ADDRESSES) return false;", ") return false;"),
     lambda o: "FAIL  notes: three reports from one address do not hide a note" in o, SH_AUTH)
case("notes: reports hide a trusted author's note", "auth-flow.sh",
     ["site/auth/notes_lib.php"],
     lambda: edit("site/auth/notes_lib.php",
                  "    if (notes_author_trusted($db, $note['user_id'], $note['id'])) return false;\n", ""),
     lambda o: "FAIL  notes: a trusted author's reported note stays up" in o, SH_AUTH)
case("notes: republishing deletes the reports, so the same accounts hide it again", "auth-flow.sh",
     ["site/auth/notes_lib.php"],
     lambda: edit("site/auth/notes_lib.php",
                  "$db->prepare('UPDATE note_reports SET resolved=1 WHERE note_id=?')->execute([$id]);",
                  "$db->prepare('DELETE FROM note_reports WHERE note_id=?')->execute([$id]);"),
     lambda o: "FAIL  notes: the same reporters cannot hide a republished note" in o, SH_AUTH)
case("notes: an author can report their own note", "auth-flow.sh",
     ["site/api/notes.php"],
     lambda: edit("site/api/notes.php",
                  "        if ($note['user_id'] === $u['id']) json_out(false, ['message' => 'You cannot report your own note — you can delete it.'], 422);\n", ""),
     lambda o: "FAIL  notes: E cannot report E's own note" in o, SH_AUTH)
case("notes: the moderation key accepted from the URL", "auth-flow.sh",
     ["site/api/notes.php"],
     lambda: edit("site/api/notes.php",
                  "$key = (string)($_SERVER['HTTP_X_MOD_KEY'] ?? ($method === 'POST' ? (body()['key'] ?? '') : ''));",
                  "$key = (string)($_GET['key'] ?? ($_SERVER['HTTP_X_MOD_KEY'] ?? ($method === 'POST' ? (body()['key'] ?? '') : '')));"),
     lambda o: "FAIL  notes: the key in the URL is refused" in o, SH_AUTH)
case("notes: no per-address limit on helpful marks", "auth-flow.sh",
     ["site/api/notes.php"],
     lambda: edit("site/api/notes.php",
                  "\n            || !rate_ok('note-helpful', NOTES_HELPFUL_PER_DAY_IP, 1440)) notes_slow_down();", ") notes_slow_down();"),
     lambda o: "FAIL  notes: the per-address helpful limit holds" in o, SH_AUTH)
case("notes: account deletion leaves the abuse counters", "auth-flow.sh",
     ["site/auth/notes_lib.php"],
     lambda: edit("site/auth/notes_lib.php",
                  "    $db->prepare('DELETE FROM auth_attempts WHERE ip_hash IN (?,?,?,?)')\n",
                  "    if (false) $db->prepare('DELETE FROM auth_attempts WHERE ip_hash IN (?,?,?,?)')\n"),
     lambda o: "FAIL  notes: E's abuse counters are gone" in o, SH_AUTH)
case("notes: the data export leaves out marks and reports", "auth-flow.sh",
     ["site/auth/lib.php"],
     lambda: edit("site/auth/lib.php", "        'note_marks' => notes_export_marks($db, $u['id']),\n", ""),
     lambda o: "FAIL  notes: export lacks E's marks or reports" in o, SH_AUTH)

case("notes: no daily limit on writing", "auth-flow.sh",
     ["site/auth/notes_lib.php"],
     lambda: edit("site/auth/notes_lib.php", "const NOTES_PER_DAY = 5;", "const NOTES_PER_DAY = 500;"),
     lambda o: "FAIL  notes: the sixth note in a day is refused" in o, SH_AUTH)

# ---- "Today at this site" (Round 4, R4-1) ----------------------------------
# The browser's sun times must agree with the Python that builds the light
# table. Nudge the golden-light threshold in the port and they must part.
TODAY = f"node {HERE}/today-sun.js"
case("today card: the browser's golden light drifts from the table", "today-sun.js",
     ["site/assets/today.js"],
     lambda: edit("site/assets/today.js", "GOLDEN_ELEVATION = 6.0", "GOLDEN_ELEVATION = 5.0"),
     lambda o: "SUN TIMES DIFFER" in o, TODAY)
# The sun path (Round 5): the sun must sit at the share of daylight gone, and
# must not glide for a reader who asked for reduced motion.
case("sun path: the sun placed at the wrong share of the day", "today-sun.js",
     ["site/assets/today.js"],
     lambda: edit("site/assets/today.js", "return { u: (now - L.sunrise) / (L.sunset - L.sunrise) };",
                  "return { u: (now - L.sunrise) / (L.goldenEveningStart - L.sunrise) };"),
     lambda o: "SUN PATH WRONG" in o, TODAY)
case("sun path: the sun glides under reduced motion", "today-sun.js",
     ["site/assets/today.js"],
     lambda: edit("site/assets/today.js", "if (glided || reduce) {", "if (glided) {"),
     lambda o: "MOVES UNDER REDUCED MOTION" in o, TODAY)

case("unverified account subscribed to the newsletter", "auth-flow.sh",
     ["site/auth/auth.php"],
     lambda: edit("site/auth/auth.php",
                  "if ($on && (int)$u['email_verified'] !== 1) {",
                  "if ($on && false) {"),
     lambda o: "FAIL  unverified B is refused" in o, SH_AUTH)


# ---- 30. cache-bump.py: an asset changed under its old version ---------------
# Assets are cached `immutable` for a week, by URL, in browsers and the CDN.
# PR #98 changed account.js and kept ?v=1, and the CDN served old and new
# copies at random. Compared with HEAD, so the case needs no history: the
# mutation is the only change, and the page still asks for saveplace.js?v=1.
PY_CACHE = f'"{sys.executable}" {HERE}/cache-bump.py --base HEAD'

case("asset changed under its old cache version", "cache-bump.py",
     ["site/assets/saveplace.js"],
     lambda: edit("site/assets/saveplace.js", "(function () {\n  'use strict';",
                  "(function () {\n  'use strict'; // changed"),
     lambda o: "FAIL  saveplace.js changed, and site/visit/giza.html still requests ?v=1" in o, PY_CACHE)

# ---- the planner's heat warning (2026-11-17) ----------------------------------
# heatWarning warns only in the top band (39 °C or more). Lowering it one band
# would warn for every Cairo spring stop at 34 °C, which the weather page does
# not call extreme; heat-warning.js's band-edge cases must catch it.
case("the planner warns a band too early", "heat-warning.js", ["site/assets/trip.js"],
     lambda: edit("site/assets/trip.js", "var top = BANDS[BANDS.length - 1], worst = null;",
                  "var top = BANDS[BANDS.length - 2], worst = null;"),
     lambda o: "FAIL below the top band" in o, f"node {HERE}/heat-warning.js")

# ---- the planner's leg cards (2026-11-17) -------------------------------------
# A leg is the same journey in either direction. If legRows matched only the
# order getting-around.json lists, a trip planned Luxor first would lose the
# Cairo sleeper rows; leg-rows.js's backwards case must catch it.
case("a planner leg read backwards loses its rows", "leg-rows.js", ["site/assets/trip.js"],
     lambda: edit("site/assets/trip.js", "return (w[0] === x && w[1] === y) || (w[0] === y && w[1] === x);",
                  "return (w[0] === x && w[1] === y);"),
     lambda o: "FAIL the same leg read backwards gives the same rows" in o, f"node {HERE}/leg-rows.js")

# The first leg-cards CI run (17 Nov 2026) caught plan.js passing the page's
# language to egfmt, which formats only 'en' and 'ar' and throws on 'ru': the
# Russian planner then drew no stops at all. leg-cards.js must catch it again.
case("the Russian planner breaks on a number format", "leg-cards.js", ["site/assets/plan.js"],
     lambda: edit("site/assets/plan.js", "return F && ar ? F.digits(String(x), 'ar') : String(x);",
                  "return F ? F.digits(String(x), document.documentElement.getAttribute('lang') || 'en') : String(x);"),
     lambda o: "LEG LEFT IN ENGLISH (ru)" in o, f"node {HERE}/leg-cards.js")

# The home briefing in Arabic and Russian (2026-11-18). Putting its title back
# as an English literal must make twin-data.js report the briefing.
case("the home briefing title back in English", "twin-data.js", ["site/assets/home.js"],
     lambda: edit("site/assets/home.js", "title.textContent = t('The heat, site by site, in %m.').replace('%m', T.monthName(main));",
                  "title.textContent = 'The heat, site by site, in ' + T.MONTHS[main] + '.';"),
     lambda o: "TWIN SCRIPT TEXT IN ENGLISH" in o and "briefing" in o, f"node {HERE}/twin-data.js")

# The visit page in Arabic and Russian (2026-11-18). Writing the month
# caption back as an English sentence must make twin-data.js report it.
case("the visit month caption back in English", "twin-data.js", ["site/assets/visit.js"],
     lambda: edit("site/assets/visit.js",
                  "cap.innerHTML = esc(t('In %m, a normal afternoon across these %n sites",
                  "cap.innerHTML = esc(('In %m, a normal afternoon across these %n sites"),
     lambda o: "TWIN SCRIPT TEXT IN ENGLISH" in o and "month caption" in o, f"node {HERE}/twin-data.js")

# The Arabic month caption names the sites in Arabic (2026-11-18). Using the
# English name again must make twin-data.js report it.
case("the Arabic month caption names a site in English", "twin-data.js", ["site/assets/visit.js"],
     lambda: edit("site/assets/visit.js", ".replace('%a', siteName(lo.s))", ".replace('%a', lo.s.name)"),
     lambda o: "names a site in English" in o, f"node {HERE}/twin-data.js")

# The places page in Arabic and Russian (2026-11-18). Putting the card's
# "Going there" heading back as an English literal must make twin-data.js
# report the place card.
case("the place card heading back in English", "twin-data.js", ["site/assets/places.js"],
     lambda: edit("site/assets/places.js", "'<div class=\"pd-going\"><h4>' + esc(t('Going there')) + '</h4>'",
                  "'<div class=\"pd-going\"><h4>Going there</h4>'"),
     lambda o: "TWIN SCRIPT TEXT IN ENGLISH" in o and "place card" in o, f"node {HERE}/twin-data.js")

# A kind label passed to t() as a variable is never collected into the
# translation table, so it stayed English on the live Arabic and Russian
# pages (2026-11-18). Writing one back as a plain string must be caught.
case("a place kind label not collected for translation", "twin-data.js", ["site/assets/places.js"],
     lambda: edit("site/assets/places.js", "airport:    { label: t('Airports'),       one: t('Airport'),",
                  "airport:    { label: 'Airports',       one: 'Airport',"),
     lambda o: "TWIN SCRIPT TEXT IN ENGLISH" in o and "place card" in o, f"node {HERE}/twin-data.js")


print()
# The shard's own count, for mutate-shards.py: ran + other_shard == seen.
_log_dir = os.environ.get("VERIFY_LOG_DIR")
if _log_dir:
    Path(_log_dir).mkdir(parents=True, exist_ok=True)
    (Path(_log_dir) / "mutate-shard.txt").write_text(
        f"{SHARD_K} {SHARD_N} {len(results)} {seen}\n", encoding="utf-8")
if SHARD_N > 1:
    print(f"shard {SHARD_K}/{SHARD_N}: ran {len(results)} of {seen} case(s); "
          f"{other_shard} belong to the other shard(s)")
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
