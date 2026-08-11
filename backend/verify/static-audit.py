"""Exhaustive static audit of site/ — every file, every link, every data claim.

No sampling. Complements the browser pass: this catches things a browser will
not (a link that 404s only from a subdirectory, a JSON field the page reads that
the pipeline stopped writing, a version query that drifted between pages).
"""
import json
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

# Windows consoles default to cp1252, so printing the arrow in the relief lines
# raised UnicodeEncodeError and killed the whole run mid-report — every finding
# after that point lost. Same failure class as the checker that crashed on the
# defect it had just found: a report must survive its own output.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")
from urllib.parse import urlparse, unquote

SITE = Path("site")
pages = sorted(SITE.rglob("*.html"))
fails = defaultdict(list)

# ---------------------------------------------------------------- links ----
href_re = re.compile(r'(?:href|src)\s*=\s*"([^"]+)"', re.I)
ids_by_page, links = {}, []
for p in pages:
    t = p.read_text(encoding="utf-8", errors="replace")
    t = re.sub(r"<script\b.*?</script>", "", t, flags=re.S | re.I)
    t = re.sub(r"<style\b.*?</style>", "", t, flags=re.S | re.I)
    ids_by_page[p] = set(re.findall(r'\sid\s*=\s*"([^"]+)"', t))
    for h in href_re.findall(t):
        links.append((p, h))

ext_hosts, checked, bad_target, bad_anchor = set(), 0, [], []
for src, h in links:
    if h.startswith(("mailto:", "tel:", "data:", "javascript:", "#")):
        if h.startswith("#") and len(h) > 1 and unquote(h[1:]) not in ids_by_page[src]:
            bad_anchor.append(f"{src}  ->  {h}")
        continue
    u = urlparse(h)
    if u.scheme in ("http", "https"):
        ext_hosts.add(u.netloc)
        continue
    path = unquote(u.path)
    if not path:
        continue
    target = (SITE / path.lstrip("/")) if path.startswith("/") else (src.parent / path)
    target = Path(str(target).split("?")[0])
    checked += 1
    if not target.exists():
        bad_target.append(f"{src}  ->  {h}")
    elif u.fragment and target.suffix == ".html":
        tids = ids_by_page.get(target.resolve().relative_to(Path.cwd()), None)
        if tids is None:
            tt = target.read_text(encoding="utf-8", errors="replace")
            tids = set(re.findall(r'\sid\s*=\s*"([^"]+)"', tt))
        if unquote(u.fragment) not in tids:
            bad_anchor.append(f"{src}  ->  {h}")

if bad_target:
    fails["internal links that do not resolve"] = bad_target
if bad_anchor:
    fails["anchors pointing at an id that is not there"] = bad_anchor

# ------------------------------------------------------- asset versions ----
# Every page must ask for the same build of each shared asset. A page left on an
# older ?v= gets new JS against cached old CSS, which is how a layout breaks for
# some visitors and nobody else.
ver = defaultdict(lambda: defaultdict(list))
for p in pages:
    t = p.read_text(encoding="utf-8", errors="replace")
    for asset, v in re.findall(r'assets/([\w./-]+)\?v=(\d+)', t):
        ver[asset][v].append(str(p))
for asset, vs in sorted(ver.items()):
    if len(vs) > 1:
        detail = "; ".join(f"v={k} on {len(v)} page(s) e.g. {v[0]}" for k, v in sorted(vs.items()))
        fails["shared assets requested at different versions"].append(f"{asset}: {detail}")

# --------------------------------------------------------------- data -----
DATA = SITE / "data"
for f in sorted(DATA.glob("*.json")):
    try:
        d = json.loads(f.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        fails["data files that are not valid JSON"].append(f"{f}: {e}")
        continue
    if isinstance(d, dict):
        # Test the VALUE, not the key. streets-notes.json carries
        # "generated": false — a boolean flag that happened to share a name with
        # a date field — and so satisfied "every data file is dated" while
        # carrying no date at all. A rule that passes for the wrong reason is
        # indistinguishable from no rule.
        stamps = [d.get(k) for k in ("as_of", "fetched_at", "generated_at",
                                     "generated", "updated")]
        if not any(re.match(r"\d{4}-\d\d-\d\d", str(s)) for s in stamps if s is not None):
            fails["data files with no date on them"].append(str(f))
        blob = json.dumps(d)
        if "-999" in blob:
            n = blob.count("-999")
            fails["data files still carrying a POWER fill value"].append(f"{f} ({n}x)")

# --------------------------------- the fields the pages actually read ------
def need(path, fields, where):
    p = DATA / path
    if not p.exists():
        fails["data files a page reads but that do not exist"].append(path)
        return None
    d = json.loads(p.read_text(encoding="utf-8"))
    for f in fields:
        cur, ok = d, True
        for part in f.split("."):
            if isinstance(cur, list):
                cur = cur[0] if cur else None
            if not isinstance(cur, dict) or part not in cur:
                ok = False
                break
            cur = cur[part]
        if not ok:
            fails[f"fields {where} reads that the data no longer has"].append(f"{path}: {f}")
    return d

clim = need("visit-climate.json",
            ["as_of", "source", "license", "sites.key", "sites.months.month",
             "sites.months.t_daily_max", "sites.months.t_record_max",
             "validation.pairs.delta_c", "validation.pairs.site_elev_m",
             "validation.reference_source", "validation.known_divergence"],
            "visit.js")
rel = need("visit-relief.json",
           ["as_of", "source", "license", "transects.key", "transects.why",
            "transects.length_km", "transects.min_m", "transects.max_m",
            "transects.median_m", "transects.samples.km", "transects.samples.m",
            "transects.samples.lat"],
           "visit.js")
need("visit-terrain.json", ["as_of", "sites.key", "sites.elevation_m"], "visit.js")
need("visit-station-normals.json", ["source", "stations.name", "stations.lat",
                                    "stations.months"], "the reference check")

# ------------------------------- do the numbers say what the page says -----
if clim:
    v = clim["validation"]
    ds = [p["delta_c"] for p in v["pairs"]]
    mean = sum(ds) / len(ds)
    near = sum(1 for x in ds if abs(x) <= 2)
    print(f"climate  : {len(clim['sites'])} sites, {len(v['pairs'])} checked site-months, "
          f"mean bias {mean:+.2f} °C, {near} within 2 °C ({near/len(ds)*100:.0f}%)")
    if abs(mean) > 2.0:
        fails["published climate fails its own gate A"].append(f"mean {mean:+.2f}")
    if near / len(ds) < 0.33:
        fails["published climate fails its own gate B"].append(f"{near}/{len(ds)}")
    # No month may claim a daily max below its own daily min.
    for s in clim["sites"]:
        for m in s["months"]:
            hi, lo = m.get("t_daily_max"), m.get("t_daily_min")
            if hi is not None and lo is not None and hi < lo:
                fails["a month whose daily max is below its daily min"].append(
                    f"{s['key']} month {m['month']}: {hi} < {lo}")
            rec = m.get("t_record_max")
            if hi is not None and rec is not None and hi > rec:
                fails["a mean daily max above the record extreme"].append(
                    f"{s['key']} month {m['month']}: {hi} > {rec}")

if rel:
    for t in rel["transects"]:
        ms = [s["m"] for s in t["samples"] if s.get("m") is not None]
        # .get() throughout: this block runs AFTER need() has already recorded
        # any missing field, and indexing a field that was just reported missing
        # raised a KeyError that killed the whole audit before it printed
        # anything — losing every other finding with it. A checker must survive
        # the defect it is checking for.
        if not ms:
            fails["a transect with no usable samples"].append(t.get("key", "?"))
            continue
        if t.get("min_m") != min(ms) or t.get("max_m") != max(ms):
            fails["a transect whose stated extremes disagree with its samples"].append(t.get("key", "?"))
        lo, med, hi = t.get("min_m"), t.get("median_m"), t.get("max_m")
        if None not in (lo, med, hi) and not (lo <= med <= hi):
            fails["a transect whose median is outside its own range"].append(t.get("key", "?"))
        kms = [s.get("km") for s in t["samples"] if s.get("km") is not None]
        if kms != sorted(kms):
            fails["a transect whose distances are not monotonic"].append(t["key"])
        for s in t["samples"]:
            if s.get("lat") is None or s.get("lon") is None:
                continue
            if not (21.0 <= s["lat"] <= 32.5 and 24.0 <= s["lon"] <= 37.5):
                fails["a transect sample outside Egypt"].append(
                    f"{t['key']} @ {s['lat']},{s['lon']}")
                break
        def g(k, d="?"):
            v = t.get(k)
            return d if v is None else v
        print(f"relief   : {g('key'):9} {len(t['samples']):3} pts, "
              f"{g('length_km', 0):7.1f} km, {g('min_m', 0):6.0f} → {g('max_m', 0):6.0f} m, "
              f"median {g('median_m', 0):.0f} m")

# ------------------------------------------------ prose that fixed numbers -
# A number typed into markup becomes a false claim the first time a pipeline
# reruns. Flag temperatures and elevations hardcoded in visit.html.
vt = (SITE / "visit.html").read_text(encoding="utf-8")
body = re.sub(r"<!--.*?-->", "", vt, flags=re.S)
hard = re.findall(r"(\d[\d,]*(?:\.\d+)?)\s*(?:&deg;|°)\s*C", body)
hard += re.findall(r"(?<![\w-])(\d{2,4})\s*(?:&nbsp;)?m\b(?!ap|ean|onth|etre)", body)
if hard:
    fails["figures typed into visit.html rather than rendered from data"] = sorted(set(hard))

# -------------------------------------------------- generated assets stale ----
# A committed file produced by a script drifts silently from its source. There
# is no schedule that would catch it: build_flag.py is deliberately NOT in a
# workflow, because its input is a static committed GeoJSON and a cron that
# re-derives an unchanged file every month is noise. The risk that leaves is
# real though — re-simplify the boundary file and the flag keeps the old
# outline, correct-looking and wrong, with nothing to say so.
#
# So instead of scheduling the build, the build is used as an assertion: run it
# to a temporary path and compare bytes. Deterministic generators can be
# checked this way for free; the ones that need a database or a network cannot,
# which is exactly why this list is short and explicit rather than a glob.
GENERATED = [
    ("backend/pipeline/build_flag.py", SITE / "assets" / "egypt-silhouette.svg"),
]
for script, out in GENERATED:
    if not Path(script).exists() or not out.exists():
        fails["a generated asset or its generator is missing"].append(f"{script} -> {out}")
        continue
    before = out.read_bytes()
    try:
        r = subprocess.run([sys.executable, script], capture_output=True, text=True, timeout=120)
        after = out.read_bytes()
        if r.returncode != 0:
            fails["a generator that no longer runs"].append(
                f"{script}: exit {r.returncode} — {(r.stderr or '').strip()[:120]}")
        elif after != before:
            # `out` is already a repo-relative path. The first version prettified
            # it with .relative_to(Path.cwd()), which raises on a relative path
            # against an absolute cwd — so this check crashed the whole audit at
            # exactly the moment it had something to report, and ran clean
            # whenever it did not. Silent in the failure case, green in the
            # success case: the same shape as the .get() bug above, which is why
            # that comment is fifty lines up and this one is here.
            fails["a committed asset that its generator no longer reproduces"].append(
                f"{out}: rerunning {script} changes it "
                f"({len(before)} -> {len(after)} bytes). Commit the regenerated file.")
    finally:
        # Restore whatever was committed. This check must not be the thing that
        # edits the working tree — it only reports.
        if out.read_bytes() != before:
            out.write_bytes(before)

print(f"\npages    : {len(pages)}  ({len(list(SITE.glob('*.html')))} top-level, "
      f"{len(list((SITE/'practice').glob('*.html')))} challenge, "
      f"{len(list((SITE/'papyrus').glob('*.html')))} story)")
print(f"links    : {checked} internal file links + "
      f"{sum(1 for _, h in links if h.startswith('#'))} same-page anchors checked")
print(f"external : {sorted(ext_hosts)}")
print()
if fails:
    print("FINDINGS")
    for k, v in fails.items():
        print(f"  {k} ({len(v)}):")
        for x in v[:12]:
            print(f"      {x}")
        if len(v) > 12:
            print(f"      … and {len(v)-12} more")
    sys.exit(1)
print("No findings. Every link resolves, every anchor exists, every shared asset "
      "is on one version, every data file is dated and internally consistent, "
      "and every field the pages read is present.")
