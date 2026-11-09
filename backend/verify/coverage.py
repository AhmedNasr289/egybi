"""Checks the earlier passes never ran.

Titles and descriptions, alt coverage, structured-data validity, drift between
hand-duplicated header/footer copies, and whether any page's stated as-of date
has outrun the cadence of the pipeline that writes it.
"""
import sys
import datetime
import glob
import json
import re
from collections import defaultdict
from pathlib import Path


def posix_glob(pattern, recursive=False):
    """glob.glob with forward slashes on every OS.

    Every rule below compares names as POSIX paths ("site/x.html", "x.json").
    On Windows glob returns backslashes, so f.replace("site/", "") and
    f.split("/")[-1] silently did nothing there: coverage.py reported all 20
    data files as having no writer, never checked one against its cadence, and
    compared the two retired tombstone pages with the live shell. CI, on
    Linux, never saw it; a local run cried wolf on every line.
    """
    return [p.replace("\\", "/") for p in glob.glob(pattern, recursive=recursive)]

# Windows consoles default to cp1252; printing any non-latin-1 character then
# raises UnicodeEncodeError and takes the whole report with it.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")


# Today, in UTC like the CI runner. This was the literal 2026-08-08 from the
# day the cadence rule was written until 2026-11-08, so every file's age was
# measured against August: a file could fall any number of days behind its
# pipeline and the rule still read "fresh". mutate.py's cadence cases now
# backdate a file relative to the real date and require this rule to say so.
TODAY = datetime.datetime.now(datetime.timezone.utc).date()
findings = defaultdict(list)
pages = sorted(posix_glob("site/**/*.html", recursive=True))


def strip(t):
    t = re.sub(r"<script\b.*?</script>", "", t, flags=re.S | re.I)
    return re.sub(r"<style\b.*?</style>", "", t, flags=re.S | re.I)


# ---------------------------------------------- titles and descriptions -----
titles, descs = defaultdict(list), defaultdict(list)
for f in pages:
    t = Path(f).read_text(encoding="utf-8", errors="replace")
    m = re.search(r"<title>(.*?)</title>", t, re.S)
    d = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', t)
    name = f.replace("site/", "")
    if not m or not m.group(1).strip():
        findings["pages with no <title>"].append(name)
    else:
        titles[m.group(1).strip()].append(name)
    if not d or not d.group(1).strip():
        findings["pages with no meta description"].append(name)
    else:
        descs[d.group(1).strip()].append(name)
        if len(d.group(1)) > 200:
            findings["meta descriptions over 200 chars"].append(f"{name} ({len(d.group(1))})")
for k, v in titles.items():
    if len(v) > 1:
        findings["duplicate <title> across pages"].append(f"{len(v)}x {k[:52]!r}: {', '.join(v[:3])}")
for k, v in descs.items():
    if len(v) > 1:
        findings["duplicate meta description"].append(f"{len(v)}x {k[:52]!r}: {', '.join(v[:3])}")

# -------------------------------------------------------- image alt text ----
for f in pages:
    t = strip(Path(f).read_text(encoding="utf-8", errors="replace"))
    for img in re.findall(r"<img\b[^>]*>", t):
        if not re.search(r"\balt\s*=", img):
            findings["<img> with no alt attribute"].append(f"{f.replace('site/','')}: {img[:76]}")
    for svg in re.findall(r"<svg\b[^>]*>", t):
        if not re.search(r'aria-hidden="true"|role="img"|aria-label=|<title>', svg):
            findings["<svg> that is neither hidden nor labelled"].append(
                f"{f.replace('site/','')}: {svg[:70]}")

# ------------------------------------------------------- structured data ----
for f in pages:
    t = Path(f).read_text(encoding="utf-8", errors="replace")
    for blob in re.findall(r'<script type="application/ld\+json">(.*?)</script>', t, re.S):
        try:
            d = json.loads(blob)
        except Exception as e:  # noqa: BLE001
            findings["invalid JSON-LD"].append(f"{f.replace('site/','')}: {e}")
            continue
        for node in (d.get("@graph") or [d]):
            if not isinstance(node, dict):
                continue
            if "@type" not in node:
                findings["JSON-LD node with no @type"].append(f.replace("site/", ""))
            if node.get("@type") == "BreadcrumbList":
                for it in node.get("itemListElement", []):
                    if "position" not in it or "name" not in it:
                        findings["breadcrumb item missing position/name"].append(
                            f.replace("site/", ""))

# ------------------------------------------- drift in duplicated chrome -----
# The header and footer are hand-copied into every top-level page. Two copies
# that disagree are how a nav link comes to exist on some pages and not others.
#
# Comparing the footers WHOLE reported eleven variants and was useless, because
# the last footer column is the page's own source list — prices cites the price
# portal, stocks cites EGX, explore cites Trading Economics. Those are REQUIRED
# to differ: a page must name the data it actually shows. A checker that flags
# the cited-data rule working correctly trains you to ignore it.
#
# So compare the part that is genuinely meant to be identical — the brand block,
# the two site-nav columns, and the colophon — and report the per-page source
# column separately, as information rather than as a fault.
PER_PAGE_COLUMNS = {"Data sources", "Price source", "Legal"}


def chunk(t, tag):
    i = t.find(f"<{tag}")
    j = t.find(f"</{tag}>", i)
    return re.sub(r"\s+", " ", t[i:j]).strip() if i >= 0 and j > i else None


def normalise(s):
    """Two deliberate, documented differences, held constant so real drift shows.

    404.html uses root-absolute hrefs because it is served for /a/b/nonsense.html
    as well as /nonsense.html, where a relative link would resolve against the
    wrong directory. And the newsletter anchor is a same-page jump on index.html
    and a cross-page link everywhere else. Both are correct; neither is drift."""
    s = re.sub(r'\s*class="active"', "", s)
    s = re.sub(r'href="/(?=[\w-]+\.html)', 'href="', s)
    s = re.sub(r'href="(?:/?index\.html)?#newsletter"', 'href="#newsletter"', s)
    return s


def columns(footer):
    """Split .cols into its <div> blocks, keyed by the <h2 class="foot-h"> label
    (the brand block has no heading)."""
    out = {}
    for i, div in enumerate(re.findall(r"<div>(.*?)</div>(?=\s*<div>|\s*</div>)", footer)):
        m = re.search(r'<h2 class="foot-h">(.*?)</h2>', div)
        out[m.group(1).strip() if m else f"_block{i}"] = div
    return out


def linkset(fragment):
    """The ordered (href, label) pairs — what the reader can actually navigate to.

    Comparing raw markup instead reported index.html and stocks.html as drift
    over their PROSE: index carries its own brand tagline, and stocks' colophon
    carries the FRA line ("for information only — not investment advice") in
    place of the general cited-data sentence. Both are required to differ. The
    failure this check exists to catch is a LINK that exists on some pages and
    not others, so compare links and leave editorial wording alone."""
    return tuple((h, re.sub(r"<[^>]+>", "", lab).strip())
                 for h, lab in re.findall(r'<a\b[^>]*href="([^"]+)"[^>]*>(.*?)</a>', fragment))


heads, foots, sources, colophons = (defaultdict(list), defaultdict(list), {},
                                    defaultdict(list))
TOMBSTONES = {"practice.html", "tracks.html"}
for f in sorted(posix_glob("site/*.html")):
    name = f.replace("site/", "")
    t = Path(f).read_text(encoding="utf-8", errors="replace")
    h, ft = chunk(t, "header"), chunk(t, "footer")
    # The retired-section notices carry a deliberately minimal chrome and are
    # 301'd away by .htaccess; holding them to the live pages' shell would be
    # comparing a headstone with a house.
    if name in TOMBSTONES:
        continue
    if h:
        heads[linkset(normalise(h))].append(name)
    if ft:
        cols = columns(normalise(ft))
        for label in PER_PAGE_COLUMNS & set(cols):
            sources[name] = label
        foots[tuple(linkset(v) for k, v in sorted(cols.items())
                    if k not in PER_PAGE_COLUMNS)].append(name)
        colo = re.search(r'<div class="colophon">(.*)', normalise(ft))
        if colo:
            colophons[linkset(colo.group(1))].append(name)
for label, bucket in (("header", heads), ("footer", foots),
                      ("colophon", colophons)):
    if len(bucket) > 1:
        ordered = sorted(bucket.items(), key=lambda kv: -len(kv[1]))
        base = set(ordered[0][0] if label != "footer"
                   else [x for col in ordered[0][0] for x in col])
        for variant, who in ordered[1:]:
            got = set(variant if label != "footer"
                      else [x for col in variant for x in col])
            gone = sorted(f"{lab} -> {h}" for h, lab in base - got)
            extra = sorted(f"{lab} -> {h}" for h, lab in got - base)
            findings[f"{label} links differ across top-level pages"].append(
                f"{', '.join(who[:6])}: "
                + (f"missing {'; '.join(gone)} " if gone else "")
                + (f"extra {'; '.join(extra)}" if extra else "")
                + ("reordered" if not gone and not extra else ""))

# 404.html's links MUST stay root-absolute — the same file answers
# /nonsense.html and /deep/path/nonsense.html, and a relative href would send a
# lost reader deeper into a directory that does not exist.
_404 = Path("site/404.html")
if _404.exists():
    body = _404.read_text(encoding="utf-8", errors="replace")
    for tag in ("header", "footer"):
        c = chunk(body, tag) or ""
        rel = re.findall(r'href="(?!https?:|/|#|mailto:)([^"]+)"', c)
        if rel:
            findings["404.html chrome link that is not root-absolute"].append(
                f"{tag}: {', '.join(sorted(set(rel))[:6])}")

# -------------------------------- data older than its own refresh cadence ---
CADENCE = {  # workflow -> max days a file may age before the page is misciting
    "refresh-prices.yml": 3, "refresh-fx.yml": 3, "refresh-data.yml": 10,
    "build-geo-assets.yml": 45, "refresh-streets.yml": 120,
    "build-visit-layers.yml": None,   # manual by design; sources are fixed
}
# Files compiled by hand from named sources (no workflow writes them), with the
# number of days before each must be re-read against its sources.
HAND_CURATED = {"calendar.json": 120, "fair-prices.json": 90}
writers = {}
for wf in posix_glob(".github/workflows/*.yml"):
    t = Path(wf).read_text(encoding="utf-8")
    n = Path(wf).name
    # Only the jobs can WRITE a file. A path listed under `on:` is a trigger:
    # test-pipeline.yml and build-pages.yml name calendar.json and the two
    # visit-*.json files there because a change to them must re-run those
    # workflows. Reading that as authorship (and the last match winning) made
    # test-pipeline.yml the "writer" of all three, a workflow with no cadence,
    # so CI reported them as having no writer and calendar.json's 120-day
    # re-read below never fired.
    jobs_at = re.search(r"(?m)^jobs:", t)
    t = t[jobs_at.start():] if jobs_at else t
    for m in re.findall(r"site/data/([\w-]+\.json)", t):
        writers[m] = n
    for s in re.findall(r"python backend/pipeline/(\w+)\.py", t):
        src = Path(f"backend/pipeline/{s}.py")
        if src.exists():
            body = src.read_text(encoding="utf-8")
            for m in (re.findall(r'write\(\s*"([\w-]+\.json)"', body)
                      + re.findall(r'"([\w-]+\.json)"\)\.write_text', body)):
                writers[m] = n
for f in sorted(posix_glob("site/data/*.json")):
    name = Path(f).name
    try:
        d = json.loads(Path(f).read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        continue
    if not isinstance(d, dict):
        continue
    stamp = d.get("as_of") or d.get("fetched_at") or d.get("updated")
    m = re.match(r"(\d{4})-(\d\d)-(\d\d)", str(stamp))
    if not m:
        continue
    age = (TODAY - datetime.date(*map(int, m.groups()))).days
    wf = writers.get(name)
    limit = CADENCE.get(wf, "unknown")
    # Hand-compiled, cited files have no pipeline, but they are not exempt
    # from going stale: a tipping range or a holiday forecast has a shelf life.
    # They get a review interval instead of a cadence, and age past it is a
    # finding exactly like a pipeline that stopped running.
    if wf is None and name in HAND_CURATED:
        wf, limit = "hand review", HAND_CURATED[name]
    if limit is None:
        continue
    if limit == "unknown":
        findings["data file with no workflow that writes it"].append(name)
    elif age > limit:
        findings["data older than its pipeline's cadence"].append(
            f"{name}: {age}d old, {wf} runs at most every {limit}d")

print(f"pages checked : {len(pages)}")
print(f"distinct titles: {len(titles)}   distinct descriptions: {len(descs)}")
print(f"data files     : {len(posix_glob('site/data/*.json'))}")
print(f"footer source column, per page (meant to differ): "
      f"{len(sources)} page(s) carry one — "
      + ", ".join(f"{k}={v}" for k, v in sorted(sources.items()) if v != "Data sources"))
print()
if not findings:
    print("No findings.")
else:
    for k in sorted(findings):
        v = findings[k]
        print(f"{k} ({len(v)}):")
        for x in v[:8]:
            print("   ", x)
        if len(v) > 8:
            print(f"    … and {len(v)-8} more")
