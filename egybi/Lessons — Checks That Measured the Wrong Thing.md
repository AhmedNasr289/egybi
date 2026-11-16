# Lessons — Checks That Measured the Wrong Thing

Written 2026-11-16, after Round 5 and the trilingual stage 1. Every entry
below is a check, a test or a build step that reported something false, why,
and the rule that stops it happening again. Each was found by the mutation
pass (`backend/verify/mutate.py`, which plants a fault and demands the check
catch it) or by reading a CI log, never by assuming.

Back to [[Home]] · related: [[Automation & CI Pipelines]] · [[Changelog]]

---

## Browser checks

### A service worker walks around the test's request blocking
- **What happened:** since Round 5 every page registers `sw.js`. A request a service worker makes goes around Playwright's `page.route`, so a check that blocked `motion.js` or answered an API itself stopped doing so once the worker controlled the page. `reduced.js` went blind this way; its mutation case stopped being caught (run 43915133691).
- **Rule:** `backend/verify/env.js` launches every check's browser with service workers blocked. Only `offline.js` and the offline test in `platform.js` pass `serviceWorkers: 'allow'`. A new check that needs the worker must ask for it.

### Headless Chromium never plays a page cross-fade
- **What happened:** CI's headless browser reported no view transition even with the opt-in in effect. On the live site in a real Chrome 156, `pageswap` showed the transition being prepared.
- **Rule:** assert what the site controls, the `@view-transition` rule read through the CSSOM. Check the real fade by hand on the live site.

### A finished animation is no longer listed
- **What happened:** the briefing-map check read `getAnimations()` once. At 1280 x 900 the map is already on screen at load, so the sweep had played and finished before the check looked, and it reported NO MAP MOTION on a map that moves.
- **Rule:** record `animationstart` events from page load (an init script), then judge the last full sweep. Under reduced motion, no start may be recorded at all.

### The site scrolls smoothly
- **What happened:** `html { scroll-behavior: smooth }` makes `window.scrollTo` glide, so a test that scrolled and then waited 1.8 s read half a sweep (YEAR EMPTY ON SCREEN on a strip that works).
- **Rule:** tests scroll with `behavior: 'instant'`.

### Waiting for a hidden element throws instead of reporting
- **What happened:** `scrollIntoViewIfNeeded` waits for the element to become visible. When a mutation hid the map image, the no-JS section timed out and threw, so MAP HIDDEN WITHOUT JS was never printed and the whole script ended early.
- **Rules:**
  - scroll with a plain script call;
  - run every section inside its own guard, so a crash is a named failure and the next section still runs.

### The order of the verdicts matters
- **What happened:** the sign-in test checked "signed in?" before "redirected?". Under the mutation the reader *was* signed in and redirected, and the next page's start-up check then cleared the flag. The test therefore read SIGN-IN NEVER HAPPENED instead of UNASKED REDIRECT.
- **Rules:**
  - judge the redirect first;
  - judge the sign-in by the login exchange itself, not only the flag.

### A mutation must remove every lock, or it proves nothing
- **What happened:** reduced motion is locked three times on this site:
  - egybi.css's site-wide rule (under reduce, `* { animation: none !important }`);
  - each feature script's own check;
  - each feature stylesheet's no-preference query.

  The map's and the year strip's "moving under reduced motion" mutation cases removed only the last two, so the page stayed still and the cases could never be caught (runs 43948810613 and 43953866021). The site was safe the whole time; the cases proved nothing.
- **Rule:** before writing a mutation case, list every layer that enforces the behaviour, and remove all of them. A case that survives because a lock it does not know about still holds is a broken case, not a broken check.

### A one-in-four failure needs evidence, not a theory
- **What happened:** the same sign-in test failed once in four runs of identical code. A plausible cause (a late start-up check undoing the sign-in) turned out impossible on reading the code, because the dialog waits for that check before opening.
- **Rule:** make the failure line say what happened (login request sent or not, its status, the dialog's text, the page), and wait for the next occurrence.

### Stacked test links and invented positions
- **What happened:** test links placed at `100 + 50 * charCode % 4` px all landed at 100 or 102 px, covered each other, and the hover timed out.
- **Rule:** lay test elements out by index.

### A map page builds its licence link late
- **What happened:** streets.html adds its CC BY deed link only after its data loads, so a 250 ms reading on a slow runner called the page unlicensed.
- **Rule:** on pages with geoBoundaries geometry, wait (up to 8 s) for the link. A page that never links it still fails.

## Static checks

### A rule must know what is generated
- **What happened:** static-audit's "figures typed into visit.html" rule flagged the year strip's band labels and computed sentence.
- **Rule:** the rule now skips generator-owned `<!-- NAME:START … NAME:END -->` regions, which the regenerated-equals-committed check guards. It also got its first mutation case.

### A comparison must know what differs by design
- **What happened:** coverage.py compares header links across pages. A language button points at each page's own twins, so it differs everywhere.
- **Rule:** links marked `data-lang` are left out of the comparison.

## The build and the shell

### Heredocs eat backslashes
- **What happened:** `\1` in a regex written through a bash heredoc reached the file as a control character, and `\n` inside a Python string literal became a real line break.
- **Rule:** write code containing backslashes with a file editor, then grep the result.

### A rebuild shows "modified" files that are not
- **What happened:** line endings change, content does not. `git diff --stat` empty means nothing changed.
- **Rule:** restore those files with `git checkout -- .` before switching branches.

## CI and merging

- **Never cancel a run to read its logs:** cancelling destroys them. A finished job's log can be read through the API (`actions/jobs/<id>/logs`) while the rest of the run is still going.
- **Never push to a branch whose run is in progress:** it cancels that run. Commit locally and push when the run ends.
- **The mutation job's ceiling is 60 minutes:** a run carrying slow timeouts took 45 min 18 s and was stopped at the old 45.
- **Merging before CI is green is possible but leaves the result unproven:** on 2026-11-16 six PRs merged within 41 seconds while five runs were still going. The check afterwards:
  - main's tree must equal the tested head, plus the bots' price data;
  - main's own run must pass;
  - the live files must match main.
- **A version-tagged asset can look stale at its bare URL:** the CDN may serve a week-old copy of `egybi.css` without `?v=`. Pages request `?v=50`, which is current. Compare the versioned URL.
