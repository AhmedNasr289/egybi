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
- **sql.js** — the live in-browser SQL engine (home + practice).
- **Google Fonts** — Cinzel + Inter.

## Verified live (2026-07-18)
Every page checked in-browser: CSS variables load, all charts render with size, the SQL engine runs and challenge-clicks execute real JOINs, no console errors, no horizontal overflow at desktop or mobile, active-nav highlighting works, mobile hamburger nav works.

## Wiring to the backend (optional, later)
The counters and charts currently use real figures baked in (so the site works standalone before the API is deployed). `index.html` has an `EGYBI_API_BASE` constant; once the API is live, the widgets can fetch from `/charts/highlights`, `/charts/tourism`, `/charts/population`, `/charts/energy`, etc. — the API already returns exactly those shapes. See [[Backend & Knowledge Base]].

## Related
- [[Backend & Knowledge Base]] — the data + API these pages surface
- [[Brand & Creative Identity]] — the research the palette and mascot are drawn from
- [[Improvement Roadmap]] — where this sits (frontend + architecture areas advanced)
