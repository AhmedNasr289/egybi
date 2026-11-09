"""Every indexable signal on every page, checked against every other page.

The browser checkers prove a page RENDERS. This proves a page can be FOUND,
and the two failures look nothing alike: a page with a perfect map and a
duplicate canonical is invisible, and nothing in backend/verify/ noticed that
until 123 retired pages had spent months telling Google this was a SQL
practice site.

That is the whole argument for auditing the corpus rather than the page. A
per-page check passes 123 times while the site's identity is being decided
against it, because every one of those pages is individually flawless. The
signal only appears when you count them.

Exit 1 on any finding, so CI can gate on it.
"""
import html as _html
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

# The same cp1252 crash that killed static-audit.py mid-report: titles here are
# full of em-dashes and the Egyptian pages carry Arabic, so a report that
# cannot print its own findings is worse than no report.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

SITE = Path("site")
ORIGIN = "https://egybi.com"

# Retired sections are deliberately still served at 200 (see .htaccess rule 2b:
# 301-ing 123 distinct pages onto one anchor reads as a soft 404). They are
# held to a different standard — they must be noindex, and they must NOT be
# blocked from crawling, because a blocked page is a page whose noindex Google
# never reads.
RETIRED_DIRS = {"practice"}

# Private pages: a signed-in reader's own space, never meant for search. Named
# one by one on purpose. A rule that exempted every noindex page would let an
# accidental noindex on a real page pass in silence, which is how a site drops
# out of Google without anyone noticing. Each one must carry noindex and must
# not be in the sitemap; the share-card and structured-data checks skip it.
PRIVATE_PAGES = {"account.html"}

# Pages the server 301s away before their markup is ever sent. Auditing their
# og: tags is auditing bytes no crawler receives — the first run of this file
# raised fourteen findings against practice.html and tracks.html, every one of
# them real in the file and meaningless on the wire.
#
# Parsed out of .htaccess rather than listed here, so retiring the next section
# does not silently start producing phantom findings.
def redirected_pages():
    ht = Path(".htaccess")
    if not ht.exists():
        return set()
    out = set()
    for m in re.finditer(
        r"^\s*RewriteRule\s+\^([^\s]+?)\$?\s+\S+\s*\[[^\]]*R=301", ht.read_text(encoding="utf-8"), re.M
    ):
        out.add(m.group(1).replace("\\", ""))
    return out


REDIRECTED = redirected_pages()

findings = defaultdict(list)


def add(kind, msg):
    findings[kind].append(msg)


def strip_scripts(t):
    t = re.sub(r"<script\b.*?</script>", "", t, flags=re.S | re.I)
    return re.sub(r"<style\b.*?</style>", "", t, flags=re.S | re.I)


def meta(t, attr, name):
    # The delimiter is captured and back-referenced rather than written as the
    # class [^"'], because an apostrophe inside a double-quoted value ends that
    # class. The first version of this function read
    #   content="Egypt's economy, year by year"
    # as the five characters "Egypt", then reported the description too short
    # AND duplicated against every other page whose description opened with the
    # same word. Two confident, entirely fabricated findings from one character.
    for pat in (
        r'<meta\s[^>]*%s\s*=\s*(?P<d1>["\'])%s(?P=d1)[^>]*content\s*=\s*(?P<d2>["\'])(?P<val>.*?)(?P=d2)',
        # content= can precede name=; a single-direction regex reports the tag
        # missing when it is merely written the other way round.
        r'<meta\s[^>]*content\s*=\s*(?P<d2>["\'])(?P<val>.*?)(?P=d2)[^>]*%s\s*=\s*(?P<d1>["\'])%s(?P=d1)',
    ):
        m = re.search(pat % (attr, re.escape(name)), t, re.I)
        if m:
            return m.group("val").strip()
    return None


pages = sorted(SITE.rglob("*.html"))
if not pages:
    print("no pages found under site/ — wrong working directory?")
    sys.exit(1)

seen_title, seen_desc, seen_canon = defaultdict(list), defaultdict(list), defaultdict(list)
retired_indexable = []
live_pages = []
private_seen = []

for p in pages:
    rel = p.relative_to(SITE).as_posix()
    raw = p.read_text(encoding="utf-8", errors="replace")
    t = strip_scripts(raw)
    is_retired = p.relative_to(SITE).parts[0] in RETIRED_DIRS
    is_404 = rel == "404.html"

    robots = (meta(t, "name", "robots") or "").lower()
    noindex = "noindex" in robots

    # ---------------------------------------------------------- retired ----
    if is_retired:
        if not noindex:
            retired_indexable.append(rel)
        continue

    if rel in REDIRECTED:
        continue

    if rel in PRIVATE_PAGES:
        private_seen.append(rel)
        if not noindex:
            add("private page indexable", rel)
        continue

    if is_404:
        # A 404 page that is indexable competes with real pages for the query
        # it happens to match.
        if not noindex:
            add("404 indexable", rel)
        continue

    live_pages.append(rel)

    # ------------------------------------------------------------ title ----
    m = re.search(r"<title>(.*?)</title>", t, re.S | re.I)
    # Unescaped, because a SERP renders "&amp;" as one character and counting
    # the source form made a 61-character title measure 65 and report as
    # truncated. Trimming a title to satisfy a wrong ruler is worse than not
    # measuring it.
    title = _html.unescape(m.group(1)).strip() if m else None
    if not title:
        add("missing title", rel)
    else:
        seen_title[title].append(rel)
        if len(title) > 65:
            add("title over 65 chars (truncates in SERP)", f"{rel}  [{len(title)}] {title}")

    # ------------------------------------------------------ description ----
    desc = meta(t, "name", "description")
    if not desc:
        add("missing meta description", rel)
    else:
        seen_desc[desc].append(rel)
        if len(desc) > 165:
            add("description over 165 chars", f"{rel}  [{len(desc)}]")
        if len(desc) < 70:
            add("description under 70 chars (wastes SERP space)", f"{rel}  [{len(desc)}]")

    # -------------------------------------------------------- canonical ----
    m = re.search(
        r'<link\s[^>]*rel\s*=\s*(?P<d1>["\'])canonical(?P=d1)[^>]*'
        r'href\s*=\s*(?P<d2>["\'])(?P<val>.*?)(?P=d2)',
        t,
        re.I,
    )
    canon = m.group("val").strip() if m else None
    if not canon:
        add("missing canonical", rel)
    else:
        seen_canon[canon].append(rel)
        if not canon.startswith("http"):
            add("relative canonical (must be absolute)", f"{rel}  ->  {canon}")

    # ------------------------------------------------------ social cards ----
    for prop in ("og:title", "og:description", "og:image", "og:url", "og:type"):
        if not meta(t, "property", prop):
            add(f"missing {prop}", rel)
    if not meta(t, "name", "twitter:card"):
        add("missing twitter:card", rel)
    # A card with no image renders as a bare link, which is the single biggest
    # brake on a page being shared at all.
    if not (meta(t, "name", "twitter:image") or meta(t, "property", "og:image")):
        add("no preview image (link shares render bare)", rel)

    # --------------------------------------------------------- JSON-LD ----
    blocks = re.findall(
        r'<script[^>]*type\s*=\s*["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        raw,
        re.S | re.I,
    )
    if not blocks:
        add("no JSON-LD structured data", rel)
    for b in blocks:
        try:
            json.loads(b)
        except json.JSONDecodeError as e:
            # Invalid JSON-LD is worse than none: it is silently discarded, so
            # the page looks marked up and earns nothing.
            add("JSON-LD does not parse", f"{rel}  {e}")

    # ---------------------------------------------------------- headings ----
    h1s = re.findall(r"<h1\b[^>]*>(.*?)</h1>", t, re.S | re.I)
    if len(h1s) == 0:
        add("no h1", rel)
    elif len(h1s) > 1:
        add("multiple h1", f"{rel}  [{len(h1s)}]")

    # ---------------------------------------------------------- img alt ----
    for tag in re.findall(r"<img\b[^>]*>", t, re.I):
        if not re.search(r'\salt\s*=', tag, re.I):
            add("img without alt", f"{rel}  {tag[:80]}")

    # ------------------------------------------------------------- lang ----
    if not re.search(r'<html\b[^>]*\slang\s*=', raw, re.I):
        add("no lang on <html>", rel)

# -------------------------------------------------------------- corpus ----
for title, ps in seen_title.items():
    if len(ps) > 1:
        add("duplicate title", f"{title}  <-  {', '.join(ps)}")
for desc, ps in seen_desc.items():
    if len(ps) > 1:
        add("duplicate meta description", f"{desc[:60]}...  <-  {', '.join(ps)}")
for canon, ps in seen_canon.items():
    if len(ps) > 1:
        add("duplicate canonical (pages compete)", f"{canon}  <-  {', '.join(ps)}")

if retired_indexable:
    add(
        "retired page still indexable",
        f"{len(retired_indexable)} pages under {'/, '.join(sorted(RETIRED_DIRS))}/ "
        f"carry no noindex — e.g. {', '.join(retired_indexable[:3])}",
    )

# ------------------------------------------------------------- sitemap ----
sm = SITE / "sitemap.xml"
if not sm.exists():
    add("sitemap.xml missing", str(sm))
else:
    locs = set(re.findall(r"<loc>([^<]+)</loc>", sm.read_text(encoding="utf-8")))
    listed = {u.replace(ORIGIN, "").lstrip("/") or "index.html" for u in locs}
    listed = {"index.html" if x in ("", "/") else x for x in listed}
    for rel in live_pages:
        if rel not in listed:
            add("live page not in sitemap", rel)
    for rel in private_seen:
        if rel in listed:
            add("sitemap advertises a private page", rel)
    for u in sorted(locs):
        if u.startswith(ORIGIN + "/practice/"):
            add("sitemap advertises a retired page", u)

# -------------------------------------------------------------- robots ----
rb = Path("robots.txt") if Path("robots.txt").exists() else SITE / "robots.txt"
if rb.exists():
    txt = rb.read_text(encoding="utf-8")
    if "Sitemap:" not in txt:
        add("robots.txt does not point at the sitemap", str(rb))
    # Disallowing a noindex page prevents the noindex from ever being read.
    for d in RETIRED_DIRS:
        if re.search(r"^\s*Disallow:\s*/%s/" % d, txt, re.M):
            add(
                "robots.txt blocks a noindex directory (Google can never read the noindex)",
                f"Disallow: /{d}/",
            )
else:
    add("robots.txt missing", "expected at repo root or site/")

# -------------------------------------------------------------- report ----
total = sum(len(v) for v in findings.values())
if not total:
    print(f"SEO: no findings across {len(pages)} pages ({len(live_pages)} live).")
    sys.exit(0)

print(f"SEO findings across {len(pages)} pages ({len(live_pages)} live):\n")
for kind in sorted(findings, key=lambda k: -len(findings[k])):
    items = findings[kind]
    print(f"  {kind}  [{len(items)}]")
    for i in items[:12]:
        print(f"      {i}")
    if len(items) > 12:
        print(f"      ... and {len(items) - 12} more")
    print()
print(f"{total} finding(s).")
sys.exit(1)
