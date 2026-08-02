# The Vanishing Economy — Standalone Case

> EgyBI's shareable artifact, live at **egybi.com/case.html**. One self-contained SQL investigation, six queries, about ten minutes, no signup. Built **2026-08-02**. Back to [[Home]]. Related: [[Challenge Engine & Data Pipeline]], [[Competitive Landscape]], [[Frontend & Design System]].

## Why this exists

A 123-challenge platform is not shareable. You cannot link it in one sentence and you cannot finish it in one sitting, so nobody passes it on. A **single finishable artifact** can be, and is the one growth pattern that repeatedly worked in this category without any marketing spend: **SQL Murder Mystery** (Knight Lab) and **SQL Noir** both spread for years on being small, complete and free. This is EgyBI's version of that shape.

It is the top of the funnel, not the product: the case ends by pointing at the other 123 challenges.

## The honesty decision — why this is not a murder mystery

The reference artifacts are **outright fiction**: invented victims, invented suspects, invented crime scenes. That works for them and would quietly corrode EgyBI, whose single distinguishing asset is that every number on the site is real, sourced and traceable, with disputes flagged rather than smoothed away. A fake murder sitting next to the cited-data promise makes the promise look decorative.

So this is **not fiction wrapped around real data**. It is a genuine analytical investigation whose finding is real and verifiable:

> Between 2022 and 2024 Egypt's GDP measured in **US dollars fell 18.4%**. Over exactly the same two years, the same GDP measured in **Egyptian pounds rose 67.9%**. Both figures are true. The gap is the exchange rate, not the economy.

The "case" framing is honest because there genuinely *is* a puzzle in the data. No invented narrative detail appears anywhere in it, and every value the learner queries is a published figure they can check.

## Where the case deliberately stops

The final step does **not** compute "real GDP" by deflating with CPI, and this is the most important design decision in the whole thing.

Doing so with these numbers implies the economy **contracted** — nominal EGP growth over 2023–24 is a factor of 1.6787, while cumulative CPI is 1.7849. That would contradict the World Bank's own real-growth series, because **CPI is not the GDP deflator**: one measures a consumer basket, the other the whole economy's price level. Using one for the other is a real methodological error, and hard-coding it into a teaching artifact would hand every learner a false conclusion dressed as a discovery.

So the case names the limit instead of papering over it. The closing line is that the right answer *is not a number you can compute from this table — it is knowing which number you would need to go and get.* Teaching someone what their data cannot answer is more useful than a tidy fake resolution, and it is the same editorial instinct as The Papyrus flagging disputes rather than picking a side.

## The six steps

| # | Skill | What it reveals |
|---|---|---|
| 1 | `SELECT` + `WHERE` + `ORDER BY` | GDP climbs to $476.75bn in 2022, then falls twice |
| 2 | Self-join + arithmetic | The fall is **−18.4%** in two years |
| 3 | Range filter | The pound went 24.72 → 50.85 per dollar over the same window |
| 4 | Two-table `JOIN` | Measured in pounds, the same economy **rises** every year |
| 5 | Multi-join, one row | **−18.4% and +67.9%** side by side |
| 6 | `IN` filter | Inflation ~a third per year — and why you still cannot conclude "real" growth |

Each step carries a revealable hint that does not give the answer, so stalling at step 3 does not end the session.

## How it is built

- `site/case.html` — page, UI and runner. `site/assets/case.js` — content (steps, hints, reveals) and the honesty rationale as a code comment.
- **Data comes from `EGYBI_SANDBOX_SQL` in `challenges.js`** — the same cited tables the 123 challenges use. One source of truth rather than a duplicated copy that could silently drift out of sync.
- **Grading reuses the practice-page approach exactly**: run the learner's query *and* a reference solution against the same database, compare result sets by value. The expected answer is therefore computed live and cannot drift from the data.
- sql.js (SQLite → WebAssembly) from CDN, entirely client-side. No backend call, no account, nothing typed leaves the page.
- **Progress resumes** via `localStorage` under `egybi.case.vanishing-economy`.

## Two deliberate omissions

- **No leaderboard.** Advent of Code's growth engine was its leaderboard, so the temptation is real — but a leaderboard needs identity, which means signup, which destroys the zero-friction property that makes this artifact shareable in the first place. Resume-on-reload is the retention mechanic that actually fits. Revisit only if the case earns traffic and people ask.
- **No wayfinding sub-nav**, despite it being the house pattern for longer pages. A sticky chip row would put a **"Verdict"** link on screen from the moment the page loads — one click to the answer, before the reader has run a single query. The `data-nav` hooks were removed so the markup doesn't advertise a nav that deliberately isn't there.

## Entry points

- **Homepage** — a featured strip immediately after the hero, leading with the contradiction and the two numbers. The hero itself was audited and left alone: it already states what EgyBI is in one line and puts a live SQL box above the fold, so it did not need restructuring.
- **practice.html** — a "new here? start with the case" band, placed **above the `CHALLENGE-INDEX:START` marker**. This matters: everything between those markers is regenerated by `build_static_pages.py`, and a first attempt placed inside the block was silently wiped on the next build.
- `sitemap.xml` at priority 0.9, plus dedicated OG/Twitter tags and `site/og-case.png` (1200×630) so the link previews properly in Facebook, LinkedIn, WhatsApp and Reddit.

## Verified

Driven end to end in Chromium against the real data: all six steps solved with the intended solutions; a deliberately wrong answer rejected with a useful message while the next step stayed locked; reveals and progress dots correct; progress surviving a reload; share action copying the intended text; completion state rendering. 375 px mobile with **zero** horizontal overflow, no console errors on any page touched, the existing **123 challenges still loading**, and a generated challenge page and story page both still rendering after `build_static_pages.py` was re-run.

Two bugs were caught by driving it rather than reading it: `out.className = 'case-status bad'` **clobbered the `out` hook class**, so the status element stopped matching its own selector after the first run; and the homepage CSS injection was a **silent no-op** because `index.html` has no `<style>` block for the anchor to match, which left the strip unstyled and a `btn-ghost` (white text, built for dark surfaces) invisible on a light band.

## FRA and honesty check

No securities, no prices, no recommendation — the case is macroeconomic and historical, so the FRA information-only constraint is not engaged beyond the site-wide posture. Every figure is real and cited on the page itself (`Sources` section names the World Bank indicator). The one place a reader could have been misled — CPI-as-deflator — is explicitly called out rather than quietly avoided.
