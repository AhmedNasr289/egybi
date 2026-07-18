# Build Plan

**Updated 2026-07-18:** EGYBi WFM is dropped — EgyBI (renamed from the working name "Per Ankh," see [[Relationship to EGYBi]]) is Ahmed's sole active SaaS venture. This plan no longer needs to share hours with a second venture; sized for a solo, part-time founder (still working full-time at his day job) at full available priority.

## Phase 0 — Validation (light-touch)
- ~~Ship~~ Shipped a Phase 0 landing page (`C:\dev\perankh\site\index.html`, deploys to `egybi.com`) describing the concept and the Egyptian identity ([[Brand & Creative Identity]]), with a waitlist. Originally built under the "Per Ankh" name, then updated to "EgyBI" branding throughout — see [[Relationship to EGYBi]] for the rename history.
- Hand-build 8–10 real exercises for the SQL Fundamentals track only (the cheapest to build — see [[Product Format & Architecture]]) using the reading-list-grounded use cases from [[Curriculum & Skill Tracks]].
- Share in data-engineering/BI communities (Reddit, LinkedIn, Egyptian dev communities) to gauge real interest and collect the first waitlist signups — zero build commitment beyond the demo exercises.
- **Go/no-go gate:** meaningful organic interest (waitlist signups, unprompted shares/comments) before committing to Phase 1's larger build.

## Phase 1 — MVP
- **Tracks:** SQL Fundamentals & Advanced + Dimensional Modeling & Data Warehousing only (tracks 1–2 of 9) — both run entirely client-side via DuckDB-Wasm, avoiding any server-side execution-security work at this stage.
- **Gamification layer:** rank ladder, the 8 badges, streak tracking, the papyrus progress map, and the ink-stroke feedback animation — all from [[Brand & Creative Identity]] — built as a lightweight overlay from day one, since the Egyptian identity *is* the differentiator, not an afterthought.
- **Billing:** freemium per [[Business Model & Pricing]] — the Paddle/LemonSqueezy merchant-of-record choice stands on its own merits now (Stripe still doesn't pay out to Egypt-based merchants directly).
- **Content volume:** aim for 20–30 exercises across the two MVP tracks, templated where possible to multiply authoring effort (see [[Product Format & Architecture]]).

## Phase 2 — Growth
- Add the remaining 7 tracks, in rough order of build complexity: BI Tooling and Data Quality (structured-answer grading, no live execution needed) before Orchestration/dbt/Spark/Python (which need the managed code-execution API from [[Product Format & Architecture]]).
- Open the reviewed community-contribution pipeline for new exercises once there's real traction.
- Consider the B2B assessment/recruiting angle (HackerRank's actual revenue model) as a later expansion once the content library and reputation exist.

## Timeline
No longer needs to be sequenced behind a second venture (see [[Relationship to EGYBi]]) — pace this against Ahmed's actual available part-time hours around his full-time job, not against another project's build schedule.
