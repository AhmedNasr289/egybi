# Improvement Roadmap (2026-07-18)

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

Written after the Phase 0 landing page got a real upgrade — a genuine live SQL demo (sql.js/SQLite-over-WASM, verified working: real queries, real aggregations, real error handling), motion, mobile-responsive layout, meta tags, and an accessibility pass. See `C:\dev\perankh\site\index.html`. This note is the next-actions plan for everything *beyond* the page — concrete and decisive, one recommended action per area, not a menu.

> **Progress update (2026-07-18, later):** two roadmap areas below have jumped ahead. **(b) Technical architecture** — the backend now exists: a tested framework-free PHP read-only API over a 12-table MySQL knowledge base spanning ancient→modern Egypt, with dataset-snapshot endpoints purpose-built to feed the sql.js sandbox. See [[Backend & Knowledge Base]] + `backend/DEPLOY.md`. The remaining (b) work is wiring the sandbox to load snapshots from `/datasets/{name}` and adding the result-comparison grading layer. **The frontend** also got a second, bigger polish pass (Cinzel font, AOS, particles, Typed.js, CountUp stat band, and a real Chart.js Egypt-tourism dashboard). Areas **(a) curriculum authoring, (c) brand assets, (d) pricing, (e) GTM** are still the open priorities, roughly in that order.

## a) Curriculum content
**Current state:** 9 tracks exist only as pill-shaped labels; no real, playable, auto-graded exercise exists yet — the landing-page SQL demo is a *marketing* teaser, not product content.
**Next action:** turn the landing page's "Longest Reigns" demo into the actual first graded exercise. It already has 90% of what's needed (sql.js, the real pharaoh dataset) — the missing piece is a result-comparison check (did the visitor's query produce the expected rows?) and a pass/fail state tied to the existing "Did You Know" reveal. Build 8–10 more exercises in the same pattern for SQL Fundamentals before touching any other track, matching the Build Plan's Phase 1 scope (SQL + Dimensional Modeling only).

## b) Technical architecture
**Current state:** sql.js is now proven reliable in a plain static page with no build step — a real, de-risked foundation, not just a plan.
**Next action:** extract the query-runner into a reusable "exercise engine" — a small data structure per exercise (`{prompt, starterQuery, checkResult(rows), hint, didYouKnow}`) rather than hand-wiring one demo, so adding exercise #2–#10 is authoring, not engineering. For grading, use order-independent set comparison of result rows by default (only require exact row order when an exercise explicitly tests `ORDER BY`) — stricter exact-match comparison will produce false "wrong answer" results for equally-correct queries and frustrate learners. For progress persistence at this stage, use `localStorage` only — a real backend/auth system isn't justified before there are real users; add it when accounts become necessary, not before.

## c) Brand and creative assets
**Current state:** the ankh mark is a placeholder built from basic SVG shapes (circle + two rects); "Ibi" the mascot has never been visually illustrated, only described in copy; badges are text-only.
**Next action:** commission one real illustrated asset first — Ibi — since it's the single most reused, most emotionally load-bearing piece (onboarding, empty states, and potentially every correct-answer moment). A flat vector style matching the existing brief ("not a cute cartoon god") is cheap to commission on Fiverr/Upwork; specifically look for an Egyptian-diaspora illustrator for authenticity. If budget is the real constraint right now, an AI-generated placeholder is acceptable **only** as a placeholder — apply the same originality diligence already used for the historical facts (no copied artist styles, no reused existing character designs) before treating any AI output as a final asset. Badges follow once Ibi's style guide exists, using the same linework as a template — don't design them in parallel with different visual DNA.

## d) Business model & pricing
**Current state:** freemium + dual-currency (EGP/USD) is the plan, but untested — the waitlist form collects an email with zero price signal.
**Next action:** put an actual, specific price on the waitlist section now (even a provisional one, e.g. "~150–300 EGP/mo" or a global-USD equivalent) rather than leaving pricing invisible until later. An email collected next to a real price is a far more honest signal of purchase intent than an anonymous "sounds interesting" signup — do this before the next GTM push, not after.

## e) Go-to-market
**Current state:** the plan already calls for sharing in Reddit/LinkedIn/Egyptian dev communities once a real page exists — it now does.
**Next action:** once deployed to the real `egybi.com` domain (not localhost), post the live link to r/dataengineering and r/SQL specifically, leading with the interactive demo as the hook ("I built a thing that teaches SQL through real ancient Egyptian history — try the live demo") rather than a bare launch announcement. Both subreddits are known to reward a genuinely try-able demo link and penalize generic self-promotion — the CTA for this channel should be "try it," not "join the waitlist."

## f) Sequencing (solo, part-time founder)
- **Weeks 1–2:** deploy the current page for real (DNS/hosting on Hostinger at egybi.com), produce the missing `og-image.png` social-preview asset, add the provisional price from (d), then run the GTM push from (e).
- **Weeks 3–6:** build the first 8–10 real graded SQL Fundamentals exercises using the now-proven sql.js pattern from (a)/(b), reusing the already-researched historical datasets — no new research needed, just authoring.
- **Weeks 7–8:** go/no-go review based on actual waitlist signups and any organic engagement from (e) — the same validation gate already specified in [[Build Plan]], now made concrete with a real page and real content to measure against.

## Related
- [[Build Plan]] — the original phased plan this roadmap sharpens into immediate next actions
- [[Historical Data & Challenge Themes]] — the source data for the first 8–10 exercises in (a)
- [[Brand & Creative Identity]] — the style brief the illustrated Ibi asset in (c) must match
