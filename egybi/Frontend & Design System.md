# Frontend & Design System

Rebuilt 2026-07-18 into a disciplined multi-page site with a single shared design system. Location: `C:\dev\perankh\site`. Deploys to egybi.com as static files (+ the PHP API for data).

## The color-identity fix (the point of this pass)

The earlier single page had "too many colors, no identity" — carnelian, malachite, lapis, multiple sand shades and dark treatments all competing. Fixed with a strict system in `assets/egybi.css`:

- **Structural color = Egyptian Blue** (`#17408B`) — headings, links, primary data, nav. Never decorative.
- **The one accent = Gold** (`#C9A227` / bright `#E7C64C`) — CTAs, kickers, highlights, dark-surface accents. The *only* accent.
- **Two surfaces only** — **Papyrus** (`#F6EEDC` light) and **Kemet** (`#14110C` dark). Every section is one or the other; they alternate. No third/fourth background competing.
- **Functional-only colors** — malachite green (success) and carnelian (error/warning) appear *only* for state feedback (e.g. a wrong-answer message, the Suez-collapse bar), never as section backgrounds or theming.
- **Type** — Cinzel (monumental, for all headings + the wordmark) + Inter (body).

The result reads as one coherent identity: blue + gold on papyrus/kemet, everywhere, on every page.

## Structure (multi-page, shared system)

- `assets/egybi.css` — the entire design system (one file, linked by every page).
- `assets/egybi.js` — shared behavior: mobile nav toggle, active-link highlighting, AOS init, hero particles, an `escapeHtml` helper.
- `favicon.svg` — the ankh mark.
- **5 pages**, each with the shared sticky header + footer:
  - `index.html` — home hub: hero (Typed.js tagline, gold particles), animated CountUp stat band, the competitor "gap", a tracks teaser, a featured tourism chart, the live SQL demo, an identity teaser, and the waitlist.
  - `explore.html` — the **data explorer**: 8 real BI charts (GDP, GDP composition, Suez revenue with the 2024 collapse highlighted, exports doughnut, tourism combo, population growth, energy mix, top governorates) + a sourced historical timeline + megaproject cards. The richest showcase of the knowledge base.
  - `tracks.html` — the 9-track curriculum in detail, each with its book reading list and real Egyptian-history sample challenges.
  - `practice.html` — a fuller **SQL playground**: 4 real tables loaded client-side (pharaohs, monuments, tourism, suez), clickable challenges that load a starter query, schema chips.
  - `about.html` — the identity/story: the House of Life, Ibi the mascot (placeholder SVG), the rank ladder, 8 badges, and the accuracy principle.

## Libraries (the "make it attract eyes" ask, kept tasteful)

All via jsdelivr CDN, self-contained, degrade gracefully, and respect `prefers-reduced-motion`:
- **AOS** — scroll reveals.
- **tsParticles** — subtle gold-dust on dark heroes.
- **Typed.js** — rotating hero tagline.
- **CountUp.js** — animated stat counters (real cited figures).
- **Chart.js** — the 8 explore-page charts + the home teaser chart.
- **sql.js** — the in-browser SQL engine, loaded **on demand only**. It is not on the home page (the hero sandbox was removed on 2026-08-08) and the practice section is retired. It loads when a reader presses *Query this yourself* on one of the three tables marked `data-query` (two on Explore, one on the Atlas), and from a script tag on the case study. Every other page ships without it.
- **Google Fonts** — Cinzel + Inter.

## Verified live (2026-07-18)
Every page checked in-browser: CSS variables load, all charts render with size, the SQL engine runs and challenge-clicks execute real JOINs, no console errors, no horizontal overflow at desktop or mobile, active-nav highlighting works, mobile hamburger nav works.

## Wiring to the backend (optional, later)
The counters and charts currently use real figures baked in (so the site works standalone before the API is deployed). `index.html` has an `EGYBI_API_BASE` constant; once the API is live, the widgets can fetch from `/charts/highlights`, `/charts/tourism`, `/charts/population`, `/charts/energy`, etc. — the API already returns exactly those shapes. See [[Backend & Knowledge Base]].

## The wayfinding system (2026-07-20) — the fix for "I feel lost"

Visitors kept saying the site made them feel lost. The cause was never the colours — it was
missing orientation: long pages (Explore's ~23 chart sections, About's ~9 bands) had no
"where am I / where next", and anchor jumps landed *behind* the sticky header because nothing
set `scroll-margin`. Fixed once in the shared assets, then applied to every page, rather than
patching one page at a time.

**Built once (`assets/egybi.css?v=11` + new `assets/wayfinding.js?v=1`, on all 9 pages + the
135 generated pages):**
- **`--header-h` / `--subnav-h` tokens.** `wayfinding.js` measures the sticky header (and the
  sub-nav bar, if present) and publishes their heights as CSS vars. Global
  `section[id] { scroll-margin-top: calc(var(--header-h) + var(--subnav-h) + 14px); }` makes
  **every** `#`-anchor on the site clear both bars — the bug that made even the old tracks
  jump-nav drop headings under the header. Verified in Chromium: a clicked chip lands the
  target at ~135px top vs a 121px bar bottom, i.e. just below the bars, desktop and mobile.
- **`.on-this-page`** — a sticky "On this page" sub-nav that pins directly under the header.
  `wayfinding.js` builds it from the page's own `section[id][data-nav]` (one chip per section,
  labelled by the short `data-nav` attribute) and runs a rAF-debounced scroll-spy that adds
  `.current` + `aria-current` to the chip you're reading, auto-scrolling the chip into view on
  mobile. A page opts in with one empty `<nav class="on-this-page" data-wayfinding>` mount after
  its hero; if it has fewer than two `data-nav` sections the mount removes itself. It replaced
  the old per-page inline `.jump-nav` on `tracks.html` (which was not sticky, so it vanished
  inside the long "9 tracks" block).
- **`.page-intro`** — a one-line "what this page is for" style for the hero.
- **`.next-steps` / `.ns-grid` / `.ns-card`** — a consistent end-of-page "Where to next" block,
  so pages that used to dead-end into the footer (Prices, Blog, Privacy, Practice, Explore) now
  route forward.
- **`.cluster-head`** — a slightly larger heading for the first section of a group, so Explore's
  long scroll reads as ~10 labelled clusters instead of 23 identical bands.

**Applied:** Explore (23 sections grouped into 10 sub-nav clusters + Sports split into
Football/Handball sub-blocks), Tracks (inline jump-nav → shared sticky sub-nav), Practice
(Solve / All-123 sub-nav, light→light-2 rhythm, the 123-link index re-ordered easy→hard per
sector with counts), About (the one dark Ibi/Ranks/Badges section split into three linkable
sections + full sub-nav), Community (five-section sub-nav), plus purpose lines / next-steps /
heading-hierarchy fixes on Prices, Blog and Privacy (its policy `<h3>`s promoted to `<h2>`).
The global 8-item top nav was deliberately left unchanged (on-page wayfinding does the work;
the header is hand-duplicated in every file and the generated pages depend on it staying static).

**Invariants preserved** (checked in a headless-Chromium sweep of all 9 pages + a generated
page, desktop + 375px mobile): the glyph layer still paints every `[data-glyph]` with its
tooltip/aria-label; the AOS/`data-mo*`/particle motion hooks are untouched; the 123 challenges
still run; no real console errors; and no *new* horizontal overflow (the pre-existing 73px
`scrollWidth` artifact on mobile Home is the newsletter honeypot at `left:-9999px` — identical
on pristine `git HEAD`, clipped by `body{overflow-x:clip}`, `scrollLeft` immovable — not
introduced here).

Any new page gets the whole system for the cost of: a `.page-intro` line, `id` + short
`data-nav` on each `<section>`, one `.on-this-page` mount, and a `.next-steps` block.

## Related
- [[Backend & Knowledge Base]] — the data + API these pages surface
- [[Brand & Creative Identity]] — the research the palette and mascot are drawn from
- [[Improvement Roadmap]] — where this sits (frontend + architecture areas advanced)
