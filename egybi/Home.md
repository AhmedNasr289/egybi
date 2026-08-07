# EgyBI — Vault Home

The knowledge base and plan for **EgyBI** — a gamified skills-practice platform for **Business Intelligence, Data Engineering, Data Warehousing, and the modern data stack**, where every challenge is built on real, cited Egyptian data. Deploys to **egybi.com** (Hostinger). Project files map: `../README.md`.

**One-line status:** Phase 0, at launch. An **11-page site** (with a **123-challenge auto-graded SQL engine**) + a **61-table (838-row)** cited knowledge base (18+ sectors) + a read-only PHP/MySQL API + a **Phase-2 accounts layer** (Argon2id + Google Sign-In, XP/streaks/rank, free at launch) + automated data-refresh pipelines are all built, deployed to Hostinger, and verified live on egybi.com (durable MySQL storage, SMTP + Google sign-in live, security-reviewed). Since launch: a **site-wide wayfinding system** (sticky "On this page" sub-nav + scroll-spy), the tracks grouped into the **3 specializations**, an **automated "Send The Papyrus" newsletter** (double opt-in, one-click unsubscribe, idempotent batched sending — first issue sent live, an **18-issue backlog** through Dec 2027, monthly send-reminder armed), an **SEO pass** (FAQPage/Dataset schema, RSS feed), a **daily Prices page** (IDSC retail/wholesale + a **currency/FX band**, sparklines + timeframe charts) and a free, FRA-compliant **Stocks (EGX) page** (a 56-company fundamentals picker + live ticker, TradingView widgets, one shared `egx-symbols.js` source also feeding a homepage ticker). An **Egypt Atlas** geospatial page (multi-layer Leaflet map of all 27 governorates — boundaries, demographics, OSM health/school layers, UNESCO heritage sites; see [[Egypt Atlas — Geospatial Service]] · [[The Vanishing Economy — Standalone Case]] · [[Cairo Street Report Card]]). Eight GitHub Actions run the automation (see [[Automation & CI Pipelines]]). Full history in [[Changelog]]; growth playbook in [[Launch Posts & Growth Kit]].

> 📱 **New device?** See [[Using This Vault]] — how to open this vault in Obsidian on your phone or laptop and keep it synced with the repo.

---

## 🧭 The plan
- [[Build Plan]] — the phased plan (Phase 0 validation → Phase 1 MVP → Phase 2 growth)
- [[Improvement Roadmap]] — concrete, prioritized next actions (curriculum, architecture, brand, pricing, GTM, timeline)
- [[Magical Roadmap]] — the product-experience plan (auto-grading, Python/pandas sandbox, gamification, AI tutor)
- [[Changelog]] — dated log of everything built so far

## 🎯 Strategy
- [[Competitive Landscape]] — sourced research on HackerRank/LeetCode/SQLZoo/DataCamp and the real gap EgyBI fills
- [[Business Model & Pricing]] — freemium, dual-currency (EGP/USD)
- [[Relationship to EGYBi]] — name/domain history (Per Ankh → EgyBI; why the domain is `egybi.com`)
- [[Risks & Mitigations]]

## 📚 Product & content
- [[Curriculum & Skill Tracks]] — the 9 skill tracks, book-grounded reading lists, and named exercises
- [[Historical Data & Challenge Themes]] — real Egyptian datasets mapped into concrete challenges per track
- [[Brand & Creative Identity]] — the Egyptian mythology/art research behind the mascot, ranks, badges, palette

## 🛠️ Build & tech
- [[Frontend & Design System]] — the color identity + the 11-page site (`../site/`) + the wayfinding system
- [[Backend & Knowledge Base]] — the 61-table KB + PHP/MySQL API (`../backend/`); deploy guide at `../backend/DEPLOY.md`
- [[Challenge Engine & Data Pipeline]] — the auto-graded SQL problem set + the World Bank refresh pipeline
- [[Daily Prices Page & Pipeline]] — the daily IDSC retail/wholesale prices page + the currency/FX band
- [[Stock Market Page & EGX Data]] — the free, FRA-compliant EGX page (TradingView widgets, 56-company picker, shared `egx-symbols.js`)
- [[Egypt Atlas — Geospatial Service]] — the multi-layer governorate map (tile-free Leaflet, OSM + UNESCO layers, per-layer guardrails, the rejected-source shortlist)
- [[The Visitor Layer]] — `visit.html`: the tourism entry point, from NASA POWER climate normals and SRTM elevation; what it deliberately refuses to describe, and why there is no flythrough
- [[Places & Data Stories]] — the 757-place gazetteer and the scrollytelling engine behind `stories.html`
- [[Technology Rulings — What Was Declined and Why]] — every tool proposed for the project and the verdict against the four constraints, so the argument is not had twice
- [[Automation & CI Pipelines]] — every automated job: the 8 GitHub Actions, their schedules & guardrails, and the monthly send-reminder
- [[Product Format & Architecture]] — in-browser sandbox strategy, execution security, gamification mechanics
- [[Security Posture & Audit Log]] — the 2026-07-20 review: what was fixed, what was already right, and which reported findings were wrong
- [[Traffic Baseline & Analytics]] — the pre-launch traffic baseline, how to read the dashboards, and which figures are honest

## ⚖️ Rules & sources
- [[IP & Content Rules]] — the employer-data boundary + the book-copyright boundary
- [[Sources]] — every cited source used across the project

---

## Related (outside this vault)
- [[cv-and-tp-work-scope]] — Ahmed's TP role/scope; source of the clean-room IP boundary applied here
- [[egybi-saas-project]] — the dropped EGYBi WFM concept (historical reference only; its site files were deleted 2026-07-18)
