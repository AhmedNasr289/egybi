# Making EgyBI Magical — Plan & Next Steps

> [!warning] **SUPERSEDED on 2026-08-07 by the pivot.**
> This note plans the SQL-practice product — leaderboards, a daily challenge, guided
> tracks under the nine skill tracks, an AI tutor that explains query errors. That
> product was retired: EgyBI is now an encyclopaedia of Egypt built on GIS and data
> storytelling. See [[The Pivot — From SQL Practice to Encyclopaedia]].
>
> It is kept rather than deleted because the *reasoning* is still worth reading — the
> engine survived as site infrastructure, and several ideas here (progressive
> disclosure, the in-browser data tier, DuckDB-Wasm) were re-judged on their merits
> rather than discarded with the product. Read it as history, not as a plan.

Back to [[Home]]. Companion to [[Improvement Roadmap]] (which covers curriculum/GTM/pricing); this note is specifically about the **product experience** — what turns EgyBI from "a beautiful cited-data site" into a platform people come back to daily.

**Where we are (2026-07-18):** a 5-page static site with a disciplined papyrus/kemet identity, a 35-table cited Egyptian knowledge base, a framework-free read-only PHP API, and a real in-browser SQL sandbox (sql.js). Everything below builds on that — most of Phase 1 needs **no new infrastructure** and can ship on the current Hostinger static hosting.

---

## Phase 1 — The "magic core" (all client-side, no new backend)

The single highest-leverage leap. These are what make it feel like HackerRank, not a demo.

1. **Auto-graded challenges with instant feedback.** Run the learner's query in sql.js, hash the result set (column-order-insensitive, row-order-aware where it matters), compare to the expected answer, and show ✔/✗ with the **Maat's-feather** motif. No server — the grading runs entirely in the browser. *This is the feature that makes it a product.*
2. **"Did You Know" reveals.** After a correct answer, surface the sourced history behind that dataset (e.g. solve the reigns query → the Pepi II 94-year disputed reign). The KB already carries `certainty_note`/`source_url` on every row — wire it in. Story + data = memorable.
3. **Local progress, streaks & badges.** `localStorage`-backed XP, a daily streak, and the "Cord-Stretcher" rank ladder / "Stretching the Cord" badges from the brand identity. Works with zero backend; a real leaderboard comes in Phase 2.
4. **A dataset browser over all 35 tables.** A page that lists every dataset (from `/datasets`), shows its schema, a sample, and its sources, with a "query this" button that drops it into the sandbox. Turns the whole cited KB into an explorable surface.
5. **Python (pandas) sandbox via Pyodide.** The user asked to "make everything queryable using SQL **or Python**." Add a Pyodide tab that loads the same datasets as DataFrames so learners can solve the same challenge in pandas. A genuine modern-data-stack differentiator few practice sites have.
6. **Micro-animations from the brand kit.** Papyrus-unroll on dashboard load, a gold wax-seal stamp on a correct answer, a ba-bird/ankh loading spinner, Khayamiya-pattern section dividers. Tasteful, on-identity, reduced-motion-aware.

## Phase 2 — Accounts & the social loop (needs the read-write backend)

Grows the PHP/MySQL layer from read-only to read-write. **Security is first-class here** (hashed passwords, per-user isolation, rate limiting) — see the boundaries in [[IP & Content Rules]].

7. **Real accounts + cloud-synced progress** (Paddle/LemonSqueezy for any paid tier — they pay out to Egypt; Stripe doesn't).
8. **Leaderboards + submission history** — global and per-track, with a weekly reset.
9. **A daily challenge** — one fresh cited-data puzzle a day; the retention engine.
10. **Guided tracks** — sequence challenges under the existing 9 tracks / 3 specializations (Data Engineering, Analytics Engineering, BI Development) with a visible progress map.

## Phase 3 — AI & scale (the 2026 "wow")

11. **An AI tutor** — hints, "explain my SQL error," and "why is my answer wrong" using Claude (the [[video-to-arsl]] project already proves the Bedrock pattern). Gated/metered because it costs money.
12. **Auto-generated challenges** — the AI proposes new challenges over the cited KB, human-reviewed before publishing (keeps the every-fact-cited rule intact).
13. **A DuckDB-Wasm analytics tier** — window functions, CTEs and larger joins in the browser for the warehouse/analytics-engineering tracks.
14. **Spaced repetition + certificates** — resurface missed concepts; issue a shareable completion cartouche.

---

## Suggested next 3 actions (in order)
1. **Build auto-grading + "Did You Know" on the existing practice page** — the biggest perceived-value jump, zero new infra.
2. **Add the Pyodide/pandas tab** — directly delivers the user's "SQL or Python" ask and is a standout differentiator.
3. **Ship local streaks/badges + the dataset browser** — makes the 35-table KB feel alive and gives a reason to return, still with no backend.

Then, once those validate engagement, stand up the Phase 2 read-write backend (accounts, leaderboards, daily challenge) with security built in from the first migration.
