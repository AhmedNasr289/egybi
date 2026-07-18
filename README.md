# EgyBI — Project Root

**EgyBI** is a gamified, HackerRank/LeetCode-style skills-practice platform specialized in **Business Intelligence, Data Engineering, Data Warehousing, and the modern data stack** — where every challenge is built on real, cited Egyptian data. It deploys to **egybi.com** (Hostinger).

> The root folder is named `perankh/` for path stability (the project's original working name). The product itself is **EgyBI**, and the docs vault is now `egybi/`. See `egybi/Relationship to EGYBi.md` for that history.

---

## 📁 What's in this project

```
perankh/
├── README.md              ← you are here (the map)
│
├── site/                  ← the FRONTEND (static, deploys to egybi.com root)
│   ├── index.html            Home hub + The Papyrus newsletter signup
│   ├── explore.html          Data explorer — real BI charts (incl. business, defence, logistics)
│   ├── tracks.html           The 9-track curriculum in detail
│   ├── practice.html         SQL challenge workbench (auto-graded, filterable)
│   ├── blog.html             Data-driven dev blog (posts from blog-posts.js)
│   ├── community.html        Contribute rules, accuracy rules, roadmap, automations
│   ├── about.html            Identity / story + the knowledge-base breadth
│   ├── privacy.html          Privacy & cookies policy (required for AdSense)
│   ├── ads.txt               AdSense authorized-sellers (placeholder pub ID)
│   ├── favicon.svg
│   └── assets/
│       ├── egybi.css         THE design system (one file, all pages)
│       ├── egybi.js          Shared behavior (nav, animations)
│       ├── challenges.js     The SQL challenge catalog + practice-sandbox data
│       ├── blog-posts.js     Blog post data array
│       ├── newsletter.js     The Papyrus signup handler (validation, honeypot, graceful)
│       └── ads.js            Config-gated Google AdSense loader (inert until set)
│
├── backend/               ← the BACKEND (PHP + MySQL, deploys to egybi.com/api)
│   ├── DEPLOY.md             Step-by-step Hostinger deployment guide
│   ├── sql/
│   │   ├── schema_mysql.sql  Table definitions for Hostinger MySQL (58 tables)
│   │   ├── schema_sqlite.sql Mirror for local testing
│   │   ├── seed.sql          Core cited data
│   │   ├── seed_v2.sql       Enrichment: demographics, energy, culture (after seed.sql)
│   │   ├── seed_v3.sql       Enrichment: economic time series + digital (after v2)
│   │   ├── seed_v4.sql       Enrichment: cinema, sports, industry, science, water (after v3)
│   │   ├── seed_v5.sql       Enrichment: transport, education, energy/heritage depth (after v4)
│   │   ├── seed_v6.sql       Enrichment: telecom, trade partners, social media (after v5)
│   │   ├── seed_v7.sql       Enrichment: agriculture/health/economy/climate/demography + map layers
│   │   └── seed_v8.sql       Enrichment (2026): businessmen, cinema economics, military/arms, football/handball, logistics, mega-project status
│   ├── pipeline/             Data pipelines: fetch_worldbank.py + build_egypt_map.py
│   ├── api/                  Framework-free PHP read-only API
│   │   ├── index.php         Front controller / router
│   │   ├── config.php        DB config (edit for Hostinger)
│   │   ├── newsletter.php    The ONE write-side endpoint (The Papyrus signups)
│   │   ├── lib/              Database, Response, Cache
│   │   └── controllers/      DatasetController, ChartController
│   └── test/                 Local SQLite test DB (build_test_db.py)
│
└── egybi/                 ← the DOCS (Obsidian vault: knowledge base / project plan)
    └── Home.md               ← START HERE for strategy, plan, and all decisions
```

## 🚀 Current status (Phase 0 — pre-launch)

- **Frontend:** 8-page site, live and verified. Disciplined color identity, real BI dashboards, a **BI-grade interactive Egypt choropleth map** (27 governorates, 5 metrics — population, density, urban %, growth, area — Leaflet, offline), and a **HackerRank-style SQL challenge workbench** (50 auto-graded challenges across 11 sectors with instructive per-table givens, running in-browser via sql.js). Adds a data-driven **Blog**, a **Community** page (contribute/accuracy rules, public roadmap, automations), *The Papyrus* **newsletter** signup (validated, honeypot-guarded, injection-safe write endpoint + no-server fallback), a **Privacy** policy, and **Google AdSense** plumbing (config-gated, inert until a real publisher ID is set). Static — ready to upload to Hostinger.
- **Backend:** a **58-table (837-row)** cited Egypt knowledge base spanning 18+ sectors + a read-only PHP/MySQL API, plus one isolated write-side endpoint for newsletter signups. Built and tested end-to-end locally (`backend/test/build_test_db.py`, zero FK violations).
- **Data pipeline:** an automated World Bank refresh (`backend/pipeline/`) with dry-run/diff and offline modes — keeps the numeric time series current without hand-editing.
- **Blocking next action:** none technical — the site can deploy now. Complete the Hostinger plan **Setup**, connect egybi.com, and follow `backend/DEPLOY.md`.

## ▶️ Quick start

**Preview the site locally:**
```bash
python -m http.server 8745 --directory site
# open http://localhost:8745
```

**Run the API locally (SQLite, no MySQL needed):**
```bash
python -c "import sqlite3;c=sqlite3.connect('backend/test/egybi_test.sqlite');[c.executescript(open(f,encoding='utf-8').read()) for f in ['backend/sql/schema_sqlite.sql','backend/sql/seed.sql','backend/sql/seed_v2.sql']]"
php -d extension=pdo_sqlite -S 127.0.0.1:8189 -t backend/api backend/api/index.php
# open http://localhost:8189/health
```

**Deploy to Hostinger:** follow `backend/DEPLOY.md` end to end.

## 📖 The plan & all decisions

Everything strategic — the concept, competitive research, curriculum, pricing, GTM, the build plan, and the running changelog — lives in the **`egybi/`** Obsidian vault, entry point `egybi/Home.md`. The phased plan is `egybi/Build Plan.md`; the concrete next-actions are `egybi/Improvement Roadmap.md`.

## ⚖️ Non-negotiable rules
1. **Every fact is real and cited.** Disputed/approximate figures are flagged in the data itself — never smoothed over.
2. **Original content only.** Exercises are inspired by real books but never copy their text/data.
3. **No employer data, ever.** Nothing derived from the founder's day-job (Teleperformance) clients/schemas/code.
