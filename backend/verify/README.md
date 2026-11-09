# Verification tools

These are the checks this site is verified with, kept in the repo rather than in
a scratch directory, because a check nobody can re-run is a claim rather than a
control.

| Tool | Answers |
|---|---|
| `static-audit.py` | Every internal link and anchor resolves; every shared asset is on one version; every data file is dated and internally consistent; every field a page reads is present. |
| `all-pages.js` | Drives every page: status, console errors, 404 subresources, off-origin requests, heading structure, sub-nav authoring mistakes, and the CC BY 4.0 attribution any page rendering geoBoundaries-derived geometry owes. `ONLY=a.html,b.html` runs a subset. |
| `overflow.js` | Content clipped off-screen at 375px. |
| `contrast.js` | WCAG AA against the background actually painted behind each text node. |
| `cssom.js` | Classes in the live DOM with no CSS rule behind them. |
| `reduced.js` | Content and animation compared with and without `prefers-reduced-motion`. Fails on lost content, a reveal left invisible, **or** an animation still running under reduce. `ONLY=a.html` runs a subset. |
| `a11y2.js` | Landmarks, heading order, focus visibility, accessible names, the mobile nav, and keyboard operation of the maps and the relief slider. |
| `coverage.py` | Titles, descriptions, alt text, JSON-LD, drift between duplicated chrome, data older than its pipeline's cadence. |
| `tap-targets.js` | Whether a thumb can hit it: zero-size controls, controls covered by something else, and anything under 24×24 that has no equivalent full-size control on the same page. Measured at 390px. |
| `seo.py` | The CORPUS rather than the page: retired pages still indexable, `robots.txt` blocking the noindex it depends on, two pages claiming one canonical, JSON-LD that no longer parses. |
| `map-render.js` | Whether a map that finished loading actually drew, and whether its loading placeholder is gone once the page settles. |
| `map-contrast.js` | Whether the country outline and the fills behind it are distinguishable from the page — 3:1 for non-text, WCAG 1.4.11. |
| `map-interaction.js` | Panning, zooming and keyboard reach on every map, with request interception proving zero runtime calls to any map provider. |
| `map-completeness.py` | Whether a map EXPLAINS: legend, labels, units, source line. A map can render perfectly and still be unlabelled gold shapes on a pale field. |
| `workflow-audit.py` | The whole workflow fleet at once — triggers, path filters, timeouts, concurrency, push-back, and whether anything that can fire unattended tells somebody when it breaks. Exits non-zero on a gap. |
| `beacon-url.js` | Where the analytics beacon lands, from pages at the root and in folders. It runs `analytics.js` in a stub browser, so no Chromium is needed, and carries its own control (the old relative URL must be caught). |
| `env.js` | Not a check — resolves Chromium, `playwright-core`, the preview server and the log directory for the browser checkers. |
| `ci-step.sh` | Not a check — runs one checker in CI, tees its output into `$VERIFY_LOG_DIR` and records its name in `FAILED` if it failed, so the failure alert can name the checker and quote what it said. |
| `checks.py` | `orphans`, `workflows`, `secrets`, `fra`. |

## mutate.py — the check on the checks

A check that has never been observed failing is not evidence. `mutate.py` runs
forty-four cases, each injecting one real defect a checker exists to catch,
asserts the checker reports it, reverts, and asserts the checker goes quiet
again.

It reverts by **restoring the exact bytes read before the mutation, and
verifying the restore landed** — not by `git checkout --`, which was the
original design and silently does nothing for a file git does not track. The
first mutation aimed at a then-untracked `mapkit.js` stripped its aria-labels
and its keyboard focus and left them stripped: the harness reported FAILS TO
CATCH and moved on with the defect sitting in the working tree. A mutation that
cannot be applied is coverage lost in silence; one that cannot be reverted is a
defect shipped in silence, which is worse.

Run it before trusting a clean report. It found three checks that had been
reporting "clean" while being incapable of detecting anything:

- **The 375px overflow check could never fire.** It compared
  `documentElement.scrollWidth` with `clientWidth`, and this site sets
  `body { overflow-x: clip }` on purpose — `hidden` would make body a scroll
  container and kill the sticky header. `clip` pins that difference at 0
  forever. Replaced by `overflow.js`, which looks for elements past the viewport
  with no ancestor that scrolls or clips them.
- **The missing-data-field check detected the defect and then crashed**, taking
  the entire report with it — every other finding lost. It indexed a field it
  had just reported missing. A checker must survive the defect it checks for.
- **The orphaned-sub-nav-chip check was structurally incapable of firing**,
  because `wayfinding.js` generates every chip from `section[id][data-nav]`, so
  a chip's target exists by construction. Replaced with the authoring mistakes
  that can actually happen: a `data-nav` section with no id (silently gets no
  chip), a blank label, and a mount with nothing to list.

`CASE=<substring>` runs a single case, so a repaired case can be re-proven
without paying for the other forty-three. Run the cases one at a time or let
the whole suite run alone — a case rewrites files in the tree and will pull them
out from under any other checker reading them concurrently.

A fourth defect, found later, was the harness lying about its own coverage: the
asset-version case searched for the literal `egybi.css?v=21` and had silently
stopped applying four stylesheet bumps earlier, reporting nothing at all. It now
derives the version in use, and an inapplicable mutation prints
`COULD NOT MUTATE` rather than passing in silence. A mutation that cannot be
applied is coverage lost quietly.

A fifth was `a11y2.js` claiming in its own header to check "keyboard operability
of the map and slider" while containing no such code. A stated coverage claim
with nothing behind it is worse than a missing check, because it stops anyone
looking. Written now — and it immediately found three maps that could not be
panned without a mouse.

A sixth was the contrast check approximating a gradient by its brightest stop.
That is the right cheap filter — it asks whether text stays legible over the
whole gradient — but it is an approximation, and it left one standing flag on
text that is genuinely fine where it sits. Anything it flags is now screenshot
and measured against the pixels actually painted behind it, and reported
separately when the approximation was the thing that was wrong.

A seventh was the CSSOM check reporting ten unstyled classes flat, seven of
which were selector hooks a script genuinely uses and three vendor-injected. It
now reads every script the site ships and separates hooks from the classes that
promise styling and deliver none.

An eighth was the chrome-drift check comparing whole footers, which reported
eleven "variants" that were all the cited-data rule working correctly — each
page names its own sources, and `stocks.html` carries the FRA line in its
colophon. Drowning a real signal in required differences is how a check gets
ignored. It now compares the navigable link sets and leaves editorial wording
alone.

## Running them

From the repo root, with a local server up:

```sh
python3 -m http.server 8793 --directory site &
python3 backend/verify/static-audit.py
node   backend/verify/all-pages.js
python3 backend/verify/mutate.py
```

The browser checkers need `playwright-core` and a Chromium build. `env.js`
resolves both and names the knob when either is missing, rather than failing on
a path that only existed on one machine:

| Variable | Default | Use when |
|---|---|---|
| `PLAYWRIGHT_CORE` | resolved from `node_modules` | `playwright-core` is installed outside the repo |
| `CHROME` | highest `chromium-*` build under `PLAYWRIGHT_BROWSERS_PATH` (or `/opt/pw-browsers`) | a browser somewhere else |
| `BASE` | `http://localhost:8793` | the preview server is on another port |
| `VERIFY_LOG_DIR` | the system temp directory | progress logs belong elsewhere |

These were hardcoded absolute paths until 2026-08-08 — the committed tools ran
in exactly one sandbox and nowhere else, which is the same failure as a check
that cannot fire.

### In CI

`.github/workflows/verify-browser.yml` runs all of them on every push to `main`,
because every push to `main` is a live Hostinger deploy. Each checker goes
through `ci-step.sh`, which keeps its output and records whether it failed, so
the failure alert names the checker and quotes what it printed instead of saying
only that the workflow failed. Seventeen steps carry `if: always()` — a sweep
should report everything in one pass, and `tap-targets.js` failing once used to
skip `map-render`, `map-contrast` and `map-interaction` with it.

A `gate` job (`.github/scripts/verify-gate.sh`) decides first what the sweep
must run, because the sweep is about 38 minutes and on 2026-11-08 it had used
up the account's Actions minutes, stopping the daily data refreshes with it:

- A push to `main` whose merge commit has the same tree as the pull request
  head, where that head's sweep already passed, is not swept again.
- `mutate.py` (17.5 of the 38 minutes) runs when a checker, the workflow, the
  gate, or a file `mutate.py` edits has changed, and on the weekly scheduled
  run (Monday 03:41 UTC) and every manual run.

The gate fails open: anything it cannot determine means a full sweep.

## What this directory learned the hard way

(The heading used to say "three" and listed four. A count in a heading rots the
first time anyone adds to the list.)

**A false positive is worse than no checker.** `tap-targets.js` reported two
working buttons on `explore.html` as covered by a paragraph and kept
`Verify (browser)` red for fourteen runs — it was hit-testing a page whose
reveal animations were still running, so `elementFromPoint` returned the
reveal's wrapper rather than the control under it. A red build that is wrong
teaches everyone to stop reading red builds, and by the time it was fixed the
habit had already started. The fix opens the page with `reducedMotion: 'reduce'`
and settles in Node before measuring; the mutation case for it removes **both**
guards, because measurement showed either one alone is enough and a one-line
mutation therefore proved nothing.

**A checker can measure the machine instead of the site.** `all-pages.js` used to
let third-party requests run. Behind a filtering proxy they hang rather than
fail, every page load took about 13 seconds against a 15-second timeout, and
which pages "failed" was decided by load. They are now recorded and then
aborted — the off-origin host is captured from the *attempt*, so the check it
exists for is unchanged, and the sweep went from ~35 minutes to 71 seconds.

**A mutation case can go vacuous without failing.** Two ways, both seen here:
anchoring the detector on a summary line that later gets reworded, and aiming
the mutation at a page where the defect cannot manifest. Neither turns the case
red — it keeps passing while testing nothing. So: anchor on a specific printed
marker rather than a sentence, and when a case reports FAILS TO CATCH, check
whether the mutation was observable at all before concluding the checker is
broken. Twice now the checker was right and the test was pointed at the wrong
thing.

**A metric can be wrong in the same direction three times.** A script measuring
how much of its box each map fills unioned *every* SVG path in the container and
compared that to the container — including the base country outline, which on a
map fitted to ten districts is meant to extend past the viewport. It reported
streets at 117–121% and that was carried for two rounds as a possible clipping
bug. The same script had already been wrong twice before, once measuring the
container before layout settled and once measuring Leaflet's oversized pan pane
instead of the geometry. A number from a tool you wrote five minutes ago is not
evidence; a picture is.

**What counts as "content" is a decision, not a given.** `reduced.js` compared
`body.innerText` between the two runs. Once maps carried labels — `divIcon`
markers inside an `aria-hidden` pane, whose count depends on the map view —
stories.html reported LOST CONTENT with an 87-character delta and nothing
actually lost. It now measures a clone with `aria-hidden` subtrees removed,
which relaxes the check for anything wrongly marked `aria-hidden`. That is a
real cost, accepted deliberately: content a screen reader is told to ignore is
not content whose disappearance this file should police.

