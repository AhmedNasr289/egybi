"""Four checkers that had only ever been run as one-off inline scripts, now
saved so they can be mutation-tested and re-run.

Usage: checks.py orphans | workflows | secrets | fra
"""
import glob
import re
import subprocess
import sys
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



def orphans():
    """CSS classes with a rule and no markup. Whole-token matching, because a
    word-boundary match counts class="filter-row" as a use of .row."""
    css = Path("site/assets/egybi.css").read_text(encoding="utf-8")
    defined = set()
    for m in re.finditer(r"(?m)^[ \t]*([^\n{}@][^\n{}]*)\{", css):
        defined.update(re.findall(r"\.([\w-]+)", m.group(1)))
    used = set()
    for f in posix_glob("site/**/*.html", recursive=True):
        for a in re.findall(r'class="([^"]+)"', Path(f).read_text(encoding="utf-8", errors="replace")):
            used.update(a.split())
    for f in posix_glob("site/assets/*.js") + posix_glob("site/**/*.php", recursive=True):
        t = Path(f).read_text(encoding="utf-8", errors="replace")
        for a in re.findall(r'class=\\?["\']([^"\'\\]+)', t):
            used.update(a.split())
        used.update(re.findall(r"classList\.\w+\(\s*['\"]([\w-]+)", t))
        used.update(re.findall(r"['\"]([a-z][\w-]+)['\"]", t))  # + not {2,}: ".ok" is two characters and was reported orphaned
        # A string literal holding SEVERAL classes is still a use of each of
        # them. This matched only single-token literals, so
        # L.DomUtil.create('div', 'mk-bar leaflet-bar') and
        # className: 'marker-cluster marker-cluster-' + kind both counted as
        # nobody using .mk-bar or .marker-cluster, and two live classes were
        # reported dead. Split on whitespace before deciding.
        for lit in re.findall(r"['\"]([a-z][\w -]{2,})['\"]", t):
            if " " in lit:
                used.update(w for w in lit.split() if re.fullmatch(r"[a-z][\w-]*", w))
        # A class APPENDED with a leading space is a use too: mapkit.js builds
        # className: cls + (isPoint ? ' mk-label-pt' : ''), and both patterns
        # above need the literal to start with a letter, so .mk-label-pt was
        # reported orphaned on every run, CI included, while every point label
        # on the maps wore it.
        for lit in re.findall(r"['\"](\s+[a-z][\w -]*)['\"]", t):
            used.update(w for w in lit.split() if re.fullmatch(r"[a-z][\w-]*", w))
    orph = sorted(c for c in defined - used
                  if not c.startswith(("aos", "leaflet", "cm-", "js-")))
    print(f"CSS classes defined: {len(defined)}   orphaned: {len(orph)}")
    for c in orph:
        print("   .", c, sep="")
    return len(orph)


def workflows():
    """Every workflow bounded; every one that commits carries the six guards."""
    bad = 0
    # build-pages and refresh-prices commit through this shared script
    # (2026-11-04). Their workflow text then holds no `git commit`, and this
    # check used to key on that string - so moving the commit into the script
    # would have skipped both workflows and passed them on nothing. A workflow
    # that calls the helper is a committing workflow, and the push guards are
    # read from the workflow AND the helper together.
    helper = Path(".github/scripts/push-with-regenerate.sh")
    helper_t = helper.read_text(encoding="utf-8") if helper.exists() else ""
    for f in sorted(posix_glob(".github/workflows/*.yml")):
        import yaml
        t = Path(f).read_text(encoding="utf-8")
        d = yaml.safe_load(t)
        n = Path(f).name
        job = list(d["jobs"].values())[0]
        problems = []
        if job.get("timeout-minutes") is None:
            problems.append("no timeout-minutes")
        uses_helper = helper.name in t
        if uses_helper and not helper_t:
            problems.append(f"calls {helper} but it does not exist")
        src = t + ("\n" + helper_t if uses_helper else "")
        if "git commit" in src:
            for label, ok in (("concurrency group", "concurrency:" in t),
                              ("pushes to the dispatched ref",
                               "GITHUB_REF_NAME" in src or "github.ref_name" in src),
                              ("rebases first", "pull --rebase" in src or "git rebase" in src),
                              ("retries the push", "for attempt in" in src),
                              ("alerts on failure", "notify-failure" in t)):
                if not ok:
                    problems.append(f"missing: {label}")
        if "notify-failure" in t and (d.get("permissions") or {}).get("issues") != "write":
            problems.append("alerts but has no issues: write")
        status = "OK" if not problems else "GAP"
        if problems:
            bad += 1
        print(f"  {n:24} {status:4} {', '.join(problems) or 'all guards present'}")
    print(f"\nworkflows with a gap: {bad}")
    return bad


def secrets():
    """A key committed once is a key leaked."""
    PAT = [(r"sk-ant-[A-Za-z0-9_-]{20,}", "Anthropic key"),
           (r"sk-[A-Za-z0-9]{32,}", "OpenAI-style key"),
           (r"ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}", "GitHub token"),
           (r"AKIA[0-9A-Z]{16}", "AWS access key"),
           (r"AIza[0-9A-Za-z_-]{30,}", "Google API key"),
           (r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----", "private key"),
           (r"mysql://[^\s'\"]+:[^\s'\"]+@", "DB URL with password")]
    files = subprocess.run(["git", "ls-files"], capture_output=True, text=True).stdout.split()
    hits = []
    for f in files:
        if f.endswith((".png", ".ico", ".jpg", ".sqlite", ".woff2")):
            continue
        try:
            t = Path(f).read_text(encoding="utf-8", errors="replace")
        except Exception:  # noqa: BLE001
            continue
        for pat, why in PAT:
            for m in re.finditer(pat, t):
                ctx = t[max(0, m.start() - 90):m.end() + 40]
                if re.search(r"getenv|environ|process\.env|YOUR_|xxx|example|placeholder|\*\*\*|secrets\.",
                             ctx, re.I):
                    continue
                hits.append(f"{f}:{t[:m.start()].count(chr(10))+1} [{why}] {m.group()[:40]}")
    print(f"files scanned: {len(files)}   potential secrets: {len(hits)}")
    for h in hits:
        print("   ", h)
    return len(hits)


def fra():
    """Information and education only, never investment advice."""
    ADVICE = [
        (r"\b(you should|we recommend|our recommendation|advis(e|able)) (to )?(buy|sell|invest|hold)", "direct advice"),
        (r"\b(buy|sell) (now|this|these|the stock|shares)\b", "imperative trade instruction"),
        (r"\b(guaranteed|risk[- ]free|sure thing) (return|profit|gain)", "guaranteed return"),
        (r"\b(price target|target price|fair value estimate)\b", "valuation call"),
        (r"\b(strong buy|outperform|underweight|overweight)\b", "analyst rating language"),
        (r"\bwill (rise|fall|go up|go down|reach)\b", "price prediction"),
        (r"\b(best|top) (stocks?|investments?|shares) to\b", "recommendation listicle"),
    ]
    hits = []
    scanned = 0
    for f in sorted(posix_glob("site/**/*.html", recursive=True)) + sorted(posix_glob("site/assets/*.js")):
        scanned += 1
        t = Path(f).read_text(encoding="utf-8", errors="replace")
        if f.endswith(".html"):
            t = re.sub(r"<script\b.*?</script>", "", t, flags=re.S | re.I)
            t = re.sub(r"<[^>]+>", " ", t)
        else:
            # Whole-line // comments in a script are notes for whoever edits
            # it; no reader sees them. One in stories.js ("the answer the
            # reader will reach for") matched "will reach" and was reported as
            # a price prediction on every run. Strings, where reader-facing
            # copy lives, are still scanned. Only WHOLE-line comments go, so a
            # "//" inside a URL in a string is never mistaken for one.
            t = re.sub(r"(?m)^[ \t]*//.*$", "", t)
        for pat, why in ADVICE:
            for m in re.finditer(pat, t, re.I):
                hits.append(f"{f.replace('site/','')} [{why}] …"
                            + re.sub(r"\s+", " ", t[max(0, m.start()-70):m.end()+70]).strip() + "…")
    print(f"files scanned: {scanned}   advice-shaped phrases: {len(hits)}")
    for h in hits:
        print("   ", h)
    return len(hits)


if __name__ == "__main__":
    globals()[sys.argv[1]]()
