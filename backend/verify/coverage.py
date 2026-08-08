"""Checks the earlier passes never ran.

Titles and descriptions, alt coverage, structured-data validity, drift between
hand-duplicated header/footer copies, and whether any page's stated as-of date
has outrun the cadence of the pipeline that writes it.
"""
import datetime
import glob
import json
import re
from collections import defaultdict
from pathlib import Path

TODAY = datetime.date(2026, 8, 8)
findings = defaultdict(list)
pages = sorted(glob.glob("site/**/*.html", recursive=True))


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
# that disagree are how a nav link exists on some pages and not others.
def chunk(t, tag):
    i = t.find(f"<{tag}")
    j = t.find(f"</{tag}>", i)
    return re.sub(r"\s+", " ", t[i:j]).strip() if i >= 0 and j > i else None

heads, foots = defaultdict(list), defaultdict(list)
for f in sorted(glob.glob("site/*.html")):
    t = Path(f).read_text(encoding="utf-8", errors="replace")
    h, ft = chunk(t, "header"), chunk(t, "footer")
    name = f.replace("site/", "")
    if h:
        # Ignore the per-page active-link marker, which is meant to differ.
        heads[re.sub(r'\s*class="active"', "", h)].append(name)
    if ft:
        foots[ft].append(name)
if len(heads) > 1:
    for variant, who in sorted(heads.items(), key=lambda kv: -len(kv[1])):
        findings["header variants across top-level pages"].append(
            f"{len(who)} page(s): {', '.join(who[:6])}")
if len(foots) > 1:
    for variant, who in sorted(foots.items(), key=lambda kv: -len(kv[1])):
        findings["footer variants across top-level pages"].append(
            f"{len(who)} page(s): {', '.join(who[:6])}")

# -------------------------------- data older than its own refresh cadence ---
CADENCE = {  # workflow -> max days a file may age before the page is misciting
    "refresh-prices.yml": 3, "refresh-fx.yml": 3, "refresh-data.yml": 10,
    "build-geo-assets.yml": 45, "refresh-streets.yml": 120,
    "build-visit-layers.yml": None,   # manual by design; sources are fixed
}
writers = {}
for wf in glob.glob(".github/workflows/*.yml"):
    t = Path(wf).read_text(encoding="utf-8")
    n = wf.split("/")[-1]
    for m in re.findall(r"site/data/([\w-]+\.json)", t):
        writers[m] = n
    for s in re.findall(r"python backend/pipeline/(\w+)\.py", t):
        src = Path(f"backend/pipeline/{s}.py")
        if src.exists():
            body = src.read_text(encoding="utf-8")
            for m in (re.findall(r'write\(\s*"([\w-]+\.json)"', body)
                      + re.findall(r'"([\w-]+\.json)"\)\.write_text', body)):
                writers[m] = n
for f in sorted(glob.glob("site/data/*.json")):
    name = f.split("/")[-1]
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
    if limit is None:
        continue
    if limit == "unknown":
        findings["data file with no workflow that writes it"].append(name)
    elif age > limit:
        findings["data older than its pipeline's cadence"].append(
            f"{name}: {age}d old, {wf} runs at most every {limit}d")

print(f"pages checked : {len(pages)}")
print(f"distinct titles: {len(titles)}   distinct descriptions: {len(descs)}")
print(f"data files     : {len(glob.glob('site/data/*.json'))}")
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
