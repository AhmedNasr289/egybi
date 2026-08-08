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
│   ├── prices.html           Daily product prices (reads data/*.json, refreshed daily)
│   ├── tracks.html           The 9-track curriculum in detail
│   ├── practice.html         SQL challenge workbench (auto-graded, filterable)
│   ├── blog.html             Data-driven dev blog (posts from blog-posts.js)
│   ├── community.html        Contribute rules, accuracy rules, roadmap, automations
│   ├── about.html            Identity / story + the knowledge-base breadth
│   ├── privacy.html          Privacy & cookies policy (required for AdSense)
│   ├── ads.txt               AdSense authorized-sellers (placeholder pub ID)
│   ├── data/                 Daily-prices JSON (prices-today.json, prices-history.json)
│   ├── favicon.svg           The ankh (key of life) site mark
│   └── assets/
│       ├── egybi.css         THE design system (one file, all pages)
│       ├── egybi.js          Shared behavior (nav, animations)
│       ├── challenges.js     123 auto-graded SQL challenges (8 topics) + 25-table practice sandbox
│       ├── blog-posts.js     "The Papyrus" — non-technical Egypt data-stories
│       ├── newsletter.js     The Papyrus signup handler (validation, honeypot, graceful)
│       ├── community.js      Community ideas/comments handler (moderated, honeypot)
│       └── ads.js            Config-gated Google AdSense loader (inert until set)
│
├── backend/               ← the BACKEND (PHP + MySQL, deploys to egybi.com/api)
│   ├── DEPLOY.md             Step-by-step Hostinger deployment guide
│   ├── sql/
│   │   ├── schema_mysql.sql  Table definitions for Hostinger MySQL (61 tables)
│   │   ├── schema_sqlite.sql Mirror for local testing
│   │   ├── seed.sql          Core cited data
│   │   ├── seed_v2.sql       Enrichment: demographics, energy, culture (after seed.sql)
│   │   ├── seed_v3.sql       Enrichment: economic time series + digital (after v2)
│   │   ├── seed_v4.sql       Enrichment: cinema, sports, industry, science, water (after v3)
│   │   ├── seed_v5.sql       Enrichment: transport, education, energy/heritage depth (after v4)
│   │   ├── seed_v6.sql       Enrichment: telecom, trade partners, social media (after v5)
│   │   ├── seed_v7.sql       Enrichment: agriculture/health/economy/climate/demography + map layers
│   │   ├── seed_v8.sql       Enrichment (2026): businessmen, cinema economics, military/arms, football/handball, logistics, mega-project status
│   │   └── seed_v9.sql       Enrichment: history & heritage depth (surviving obelisks, archaeological discoveries, temples by deity, royal women)
│   ├── pipeline/             Data pipelines: fetch_worldbank.py + build_egypt_map.py + fetch_prices.py (daily prices)
│   ├── api/                  Framework-free PHP read-only API
│   │   ├── index.php         Front controller / router
│   │   ├── config.php        DB config (edit for Hostinger)
│   │   ├── newsletter.php    Write-side endpoint (The Papyrus signups)
│   │   ├── community.php     Write-side endpoint (moderated ideas/comments)
│   │   └── (auth/ is a separate module — see below)
│   │   ├── lib/              Database, Response, Cache
│   │   └── controllers/      DatasetController, ChartController
│   └── test/                 Local SQLite test DB (build_test_db.py)
│
└── egybi/                 ← the DOCS (Obsidian vault: knowledge base / project plan)
    └── Home.md               ← START HERE for strategy, plan, and all decisions
```

## 🚀 Current status (live at egybi.com)

- **Frontend:** 17 top-level pages plus 12 data stories and 123 retirement notices for the URLs the old SQL product used to serve. The reader-facing pages are the home page, **Explore** (Egypt in charts), **Visit** (climate normals, elevation and five measured terrain cross-sections), the **Atlas** (governorates, heritage, health and schools on a tile-free vector map), **Places** (everything OpenStreetMap has mapped), **Stories** (*The Papyrus*), the **Street Report Card** (ten districts measured on network connectivity), **The Vanishing Economy** (a case study in six queries), **Prices**, **Stocks**, **Blog**, **Community**, **About**, **Privacy** and a generated 404. Hand-written HTML, CSS and vanilla JS — no framework and no build step; deployment is `git push`. Every map is tile-free vector Leaflet with zero runtime requests to any map provider, which is measured with request interception rather than assumed.
- **Backend:** a **61-table (838-row)** cited Egypt knowledge base spanning 18+ sectors + a read-only PHP/MySQL API; isolated write-side endpoints for the newsletter and moderated community board; and a **Phase-2 accounts/SaaS layer** (`site/auth/`) — Argon2id auth, sessions, CSRF, per-account progress sync, and paywall-ready gating, all **free at launch** (see `egybi/Phase 2 — SaaS & Accounts.md`). Built and tested end-to-end locally (`backend/test/build_test_db.py`, zero FK violations).
- **Data pipeline:** an automated World Bank refresh (`backend/pipeline/`) with dry-run/diff and offline modes — keeps the numeric time series current without hand-editing.
- **Automation:** eleven GitHub Actions workflows write 16 dated data files. Prices and FX refresh daily, World Bank indicators weekly, the Atlas layers monthly and the street report card quarterly; the visitor layers are manual by design because SRTM is a completed survey and the climate normals average a closed window. Every workflow is time-bounded, keeps last-good data per layer on failure, pushes to the ref it was dispatched on, and opens an issue when it breaks.

## ▶️ Quick start

**Preview the site locally:**
```bash
python -m http.server 8745 --directory site
# open http://localhost:8745
```

**Run the API locally (SQLite, no MySQL needed):**
```bash
python -c "import sqlite3;c=sqlite3.connect('backend/test/egybi_test.sqlite');[c.executescript(open(f,encoding='utf-8').read()) for f in ['backend/sql/schema_sqlite.sql','backend/sql/seed.sql','backend/sql/seed_v2.sql']]"
php -d extension=pdo_sqlite -S 127.0.0.1:8189 -t site/api site/api/index.php
# open http://localhost:8189/health
```

**Deploy to Hostinger:** follow `backend/DEPLOY.md` end to end.

## 📖 The plan & all decisions

Everything strategic — the concept, competitive research, curriculum, pricing, GTM, the build plan, and the running changelog — lives in the **`egybi/`** Obsidian vault, entry point `egybi/Home.md`. The phased plan is `egybi/Build Plan.md`; the concrete next-actions are `egybi/Improvement Roadmap.md`.

## ⚖️ Non-negotiable rules
1. **Every fact is real and cited.** Disputed/approximate figures are flagged in the data itself — never smoothed over.
2. **Original content only.** Exercises are inspired by real books but never copy their text/data.
3. **No employer data, ever.** Nothing derived from the founder's day-job (Teleperformance) clients/schemas/code.
