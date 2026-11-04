# EgyBI — Vault Home

The knowledge base and plan for **EgyBI** — a free **encyclopaedia of Egypt told through maps and cited open data**. Every figure carries the source and the date it came from. Deploys to **egybi.com** (Hostinger). Project files map: `../README.md`.

**One-line status:** An **encyclopaedia of Egypt** told through maps and cited open data, live on egybi.com. **15 live pages** (plus two tombstones for the retired product): a visitor guide (`visit.html`, NASA climate normals + SRTM elevation), the **Egypt Atlas** (all 27 governorates with health, school and UNESCO layers), **Places** (an **873-entry** OSM gazetteer — 335 settlements, 116 museums, 29 IATA airports, 393 antiquities), **Data Stories** (four scrollytelling stories where the map moves as you read), the **Street Report Card** (ten districts measured on seven network metrics), the **data explorer**, a daily **Prices** page (IDSC + an FX band), a free FRA-compliant **Stocks (EGX)** page, **The Papyrus** newsletter (double opt-in, 12 issues published, an 18-issue backlog through Dec 2027), a standalone investigation at `case.html`, and **Where Egypt is building** (`invest.html`) — the knowledge base's investment rows on a map, placed only where they can honestly be placed. Behind it: a **61-table (838-row)** cited knowledge base, a read-only PHP/MySQL API, and **twelve GitHub Actions** running the pipelines (see [[Automation & CI Pipelines]]). Every figure carries a named source and a date, and where sources disagree the page says so. Maps are **tile-free** — zero runtime calls to any map provider, measured rather than assumed.

> The site was a **SQL practice platform** until 2026-08-07. That product is retired: the 123 challenge URLs return tombstones, `practice.html` and `tracks.html` 301, and the sql.js engine survives as site infrastructure — any table here can be queried by the reader. See [[The Pivot — From SQL Practice to Encyclopaedia]]. The accounts layer (Argon2id + Google Sign-In, XP/streaks/rank) is **dormant**: its backend is still deployed, but no page loads it, because it tracked progress through challenges that no longer exist.

> 🧭 **2026-10-09 — the site changed job.** egybi.com is now **"Egypt, honestly": a trip companion built on the same cited data**. The home page asks *when are you going?* and answers with measured heat at 18 sites, the holidays inside your dates and today's rate. Around it: a route planner that prints a Papyrus dossier (`plan.html`), sourced fair prices (`fair-prices.html`), a hieroglyph name studio (`hieroglyphs.html`), the dossier (`dossier.html`), a $49 plan check (`ask.html`) and one generated page per measured site (`visit/<site>.html`). The encyclopaedia stays, as **Egypt in data**. Every page now wears the [[Papyrus Design System]]. Why: [[The Pivot — Egypt, Honestly]].

> 📱 **New device?** See [[Using This Vault]] — how to open this vault in Obsidian on your phone or laptop and keep it synced with the repo.

---

## 🧭 The plan
- [[Growth Plan — Traffic and the Photo Layer]] — **current delivery plan (2026-11-04)**: what is live, the one metric and its dated checks, SEO/Arabic/distribution workstreams with owners, the gated photo layer, deferred agents with triggers, and the next eight weeks
- [[Build Plan]] — the phased plan (Phase 0 validation → Phase 1 MVP → Phase 2 growth)
- [[Improvement Roadmap]] — concrete, prioritized next actions (curriculum, architecture, brand, pricing, GTM, timeline)
- [[Magical Roadmap]] — the product-experience plan (auto-grading, Python/pandas sandbox, gamification, AI tutor)
- [[Changelog]] — dated log of everything built so far

## 🎯 Strategy
- [[Competitive Landscape]] — sourced research on HackerRank/LeetCode/SQLZoo/DataCamp and the real gap EgyBI fills
- [[Tourism Services Plan]] — the aggressive alternative: selling maps, walkability and provenance to hotels, DMCs and operators
- [[SaaS Conversion Plan]] — how EgyBI could take money: the wedge, the ladder, the build order, and the four measured facts that decide it
- [[Business Model & Pricing]] — ⚠️ pre-pivot, kept for the regional-pricing reasoning only
- [[Relationship to EGYBi]] — name/domain history (Per Ankh → EgyBI; why the domain is `egybi.com`)
- [[Risks & Mitigations]]

## 💰 Income & the pivot
- [[The Pivot — Egypt, Honestly]] — **current**: the trip companion, its income model ($49 plan check, $12 dossier, plain affiliate links once a programme confirms Egypt payout) and the stop rules
- [[Income Plan — Site to 200 a Month]] · [[Income Routes — Any Career]] · [[egybi.com — 300 to 400 a Month]] · [[Income Plan — 1,000 to 2,000 a Month]] · [[Dropshipping — Can It, Should It]] — the earlier plans it replaced, kept as the record of what was weighed

## 📚 Product & content
- [[Curriculum & Skill Tracks]] — the 9 skill tracks, book-grounded reading lists, and named exercises
- [[Historical Data & Challenge Themes]] — real Egyptian datasets mapped into concrete challenges per track
- [[Brand & Creative Identity]] — the Egyptian mythology/art research behind the mascot, ranks, badges, palette

## 🛠️ Build & tech
- [[Papyrus Design System]] — the parchment sheet, torn gold edge, seal and scroll rod on every page; the self-hosted hieroglyph font; the dossier print stylesheet
- [[Frontend & Design System]] — the colour identity + the 18-page site (`../site/`) + the wayfinding system + the home-page flag
- [[Backend & Knowledge Base]] — the 61-table KB + PHP/MySQL API (`../backend/`); deploy guide at `../backend/DEPLOY.md`
- [[Challenge Engine & Data Pipeline]] — the auto-graded SQL problem set + the World Bank refresh pipeline
- [[Daily Prices Page & Pipeline]] — the daily IDSC retail/wholesale prices page + the currency/FX band
- [[Stock Market Page & EGX Data]] — the free, FRA-compliant EGX page (TradingView widgets, 56-company picker, shared `egx-symbols.js`)
- [[Egypt Atlas — Geospatial Service]] — the multi-layer governorate map (tile-free Leaflet, OSM + UNESCO layers, per-layer guardrails, the rejected-source shortlist)
- [[The Visitor Layer]] — `visit.html`: the tourism entry point, from NASA POWER climate normals and SRTM elevation; what it deliberately refuses to describe, and why there is no flythrough
- [[Places & Data Stories]] — the 873-place gazetteer, its *Going there* links, and the scrollytelling engine behind `stories.html`
- [[Technology Rulings — What Was Declined and Why]] — every tool proposed for the project and the verdict against the four constraints, so the argument is not had twice
- [[Map Toolkit — Decisions and Handover]] — what was acted on from the map/dataviz toolkit document, what was declined and why (ECharts measured at three times its stated weight; the capitals timeline the data cannot carry), and the traps confirmed against the repo
- [[Automation & CI Pipelines]] — every automated job: the 11 GitHub Actions, their schedules & guardrails, and the monthly send-reminder
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
