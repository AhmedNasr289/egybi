# Verification tools

These are the checks this site is verified with, kept in the repo rather than in
a scratch directory, because a check nobody can re-run is a claim rather than a
control.

| Tool | Answers |
|---|---|
| `static-audit.py` | Every internal link and anchor resolves; every shared asset is on one version; every data file is dated and internally consistent; every field a page reads is present. |
| `all-pages.js` | Drives every page: status, console errors, 404 subresources, off-origin requests, heading structure, sub-nav authoring mistakes. `ONLY=a.html,b.html` runs a subset. |
| `overflow.js` | Content clipped off-screen at 375px. |
| `contrast.js` | WCAG AA against the background actually painted behind each text node. |
| `cssom.js` | Classes in the live DOM with no CSS rule behind them. |
| `reduced.js` | Content and animation compared with and without `prefers-reduced-motion`. |
| `a11y2.js` | Landmarks, heading order, focus visibility, accessible names, the mobile nav. |
| `coverage.py` | Titles, descriptions, alt text, JSON-LD, drift between duplicated chrome, data older than its pipeline's cadence. |
| `checks.py` | `orphans`, `workflows`, `secrets`, `fra`. |

## mutate.py — the check on the checks

A check that has never been observed failing is not evidence. `mutate.py` injects
one real defect per checker, asserts the checker reports it, reverts through
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

Requires a local server: `python3 -m http.server 8793 --directory site`.
