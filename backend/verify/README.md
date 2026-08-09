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
| `env.js` | Not a check — resolves Chromium, `playwright-core`, the preview server and the log directory for the browser checkers. |
| `checks.py` | `orphans`, `workflows`, `secrets`, `fra`. |

## mutate.py — the check on the checks

A check that has never been observed failing is not evidence. `mutate.py` runs
sixteen cases, each injecting one real defect a checker exists to catch,
asserts the checker reports it, reverts through
`git checkout --` so a mutation cannot survive a crash, and asserts the checker
goes quiet again.

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
without paying for the other fifteen. Run the cases one at a time or let the
whole suite run alone — a case reverts through `git checkout --`, which will
pull files out from under any other checker reading them concurrently.

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

## Three things this directory learned the hard way

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

