# Challenge Engine & Data Pipeline

Two systems built 2026-07-18 that move EgyBI from "a beautiful cited-data site" toward a real practice product. Back to [[Home]].

## 1. The SQL challenge engine (HackerRank/LeetCode-style)

**Files:** `site/assets/challenges.js` (the catalog + sandbox data) and a rewritten `site/practice.html` (the workbench). Runs 100% client-side on sql.js — no server, no signup, deploys as static files.

**The catalog** — `EGYBI_CHALLENGES`, 22 challenges spanning every sector, each with:
- a **difficulty** (Easy / Medium / Hard) and **sector** tag;
- a plain-English **problem statement**;
- the **givens** (which tables/columns are in scope + a short schema recap);
- a **starter query** seeded into the editor;
- a reference **solution** — the expected output is *computed live* from it against the real data, so it is always correct and never hand-transcribed;
- an **orderMatters** flag that tunes grading (rankings are order-sensitive; set-listings aren't);
- a sourced **"Did You Know"** revealed on a correct answer.

**The sandbox** — `EGYBI_SANDBOX_SQL` builds ~14 curated, cited tables (pharaohs, monuments, tourism, suez, governorates, indicators, exports, athletes, sports_titles, satellites, companies, investment_deals, cultural_figures, water_use). Every row is a genuine figure that also lives in the backend KB.

**The workbench UX** — pick a challenge from a filterable list (by sector + difficulty), read the statement + givens, write SQL, hit **Run & check**. The learner's result set is graded against the solution's (value-based, column-names ignored so aliases are free, numeric tolerance, order-aware only when it matters). Pass → green verdict + the Did-You-Know + a solved tick (localStorage, with an in-memory fallback so it works inside sandboxed iframes). "Show expected output" is always available.

**Verification:** all 22 solutions run in SQLite (0 failures); grading verified live in-browser (correct → pass + reveal; wrong → precise reason, e.g. "Wrong number of rows: you returned 26, expected 10"); filters and solved-count verified; no console errors.

**Extending it:** add an object to `EGYBI_CHALLENGES` — no backend change. New sectors just need their slice added to `EGYBI_SANDBOX_SQL`. The natural next step ([[Magical Roadmap]]) is a **Pyodide/pandas** tab that solves the same challenges in Python.

## 2. The automated data-refresh pipeline

**Files:** `backend/pipeline/fetch_worldbank.py`, `backend/pipeline/fixtures/*.json`, `backend/pipeline/README.md`.

**What it does** — fetches a curated **allowlist** of World Bank indicators for Egypt (GDP, GDP/capita, growth, inflation, unemployment, urbanisation, life expectancy, under-5 mortality, electricity access, internet use, population), transforms each into the project's cited seed-SQL format, and writes `sql/seed_auto.sql`. Those rows are **pipeline-managed**: the file deletes exactly the indicator codes it owns, then re-inserts fresh values — idempotent, and it never touches the hand-curated seeds.

**Review gate** — `--dry-run` fetches live data and prints a diff vs the current SQLite DB (new / changed / unchanged points) so a human approves before anything lands. `--offline` runs the identical transform against bundled fixtures (tested here, since local network is blocked) and writes a clearly-labelled sample file, never real data.

**Automatable vs manual (honest map, full version in the pipeline README):** World Bank API = automated; Our World in Data = automatable next; UNESCO UIS = semi; **CBE, CAPMAS, EGX, Suez Canal Authority = manual** (scraping-blocked or PDF/press-release only); all qualitative rows (pharaohs, companies, athletes, projects, culture) = curated by nature. The pipeline deliberately owns only the numeric series that have a real API.

**Scheduling later** — best as a weekly **GitHub Action** that runs the fetch and opens a PR with the `seed_auto.sql` diff for review (freshness with a human in the loop). Hostinger cron is possible but the PR-review model keeps the cited-and-flagged discipline intact.

## Related
- [[Backend & Knowledge Base]] — the 40-table KB these build on
- [[Frontend & Design System]] — the design system the workbench uses
- [[Magical Roadmap]] — where these sit in the product plan (auto-grading = done)
- `backend/pipeline/README.md` · `site/assets/challenges.js`
