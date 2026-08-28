# EgyBI — Project Root

**EgyBI** is a free **encyclopaedia of Egypt told through maps and cited open data** — its
27 governorates, its heritage, its streets, its prices and its history. Every figure carries
the source and the date it came from, and where sources genuinely disagree the page says so
rather than picking the tidier number. It deploys to **egybi.com** (Hostinger) on `git push`.

> The site was a **SQL practice platform** until 2026-08-07. That product is retired: the 123
> challenge URLs return retirement notices, `practice.html` and `tracks.html` 301 away, and the
> sql.js engine survives as site infrastructure so any table in the knowledge base can be
> queried by the reader. See `egybi/The Pivot — From SQL Practice to Encyclopaedia.md`.

> The root folder is named `perankh/` for path stability (the project's original working name).
> The product is **EgyBI** and the docs vault is `egybi/`. See `egybi/Relationship to EGYBi.md`.

---

## 📁 What's in this project

```
perankh/
├── README.md                    ← you are here (the map)
├── egy_adm1_simplified.geojson  geoBoundaries EGY ADM1, mapshaper-simplified (CC BY 4.0)
│
├── site/                        ← the FRONTEND (static, deploys to egybi.com root)
│   ├── index.html                  Home — the flag, the pitch, The Papyrus signup
│   ├── explore.html                Egypt in charts, clustered into seven themes
│   ├── visit.html                  Planning a trip: NASA climate normals, SRTM elevation,
│   │                               five measured terrain cross-sections
│   ├── geospatial.html             The Atlas — 27 governorates + health, school and UNESCO layers
│   ├── places.html                 873-place OSM gazetteer, each with a "Going there" block
│   ├── invest.html                 Where Egypt is building — projects, figures, sources (FRA-safe)
│   ├── stories.html                Data stories: the map moves as you read
│   ├── streets.html                Street Report Card — ten districts on seven network metrics
│   ├── case.html                   The Vanishing Economy — one investigation in six queries
│   ├── prices.html                 Daily retail/wholesale prices + an FX band
│   ├── stocks.html                 EGX charts and screener (information only, not advice)
│   ├── blog.html / community.html / about.html / privacy.html / 404.html
│   ├── practice.html, tracks.html  Tombstones — 301 away, kept so old links land somewhere
│   ├── practice/  papyrus/         135+ generated pages (retirement notices + newsletter issues)
│   ├── data/                       Every dated JSON the pipelines write (see below)
│   ├── api/                        Framework-free read-only PHP/MySQL API, plus the isolated
│   │                               write-side endpoints (newsletter, moderated community board)
│   └── assets/
│       ├── egybi.css               THE design system — one file, every page
│       ├── egybi.js                Shared behaviour (nav, reduced-motion flag, escaping)
│       ├── mapkit.js               Shared map behaviour: controls, locator, credit, choropleth
│       ├── egypt-geo.js            Bundled governorate geometry + KB figures (generated)
│       ├── egypt-silhouette.svg    The national outline on the flag (generated, 1.2 KB)
│       ├── geospatial.js  places.js  invest.js  streets.js  visit.js  scrolly.js  case.js
│       ├── wayfinding.js           Builds the sticky "on this page" sub-nav from the DOM
│       ├── glyphs.js  motion.js    The hieroglyph layer and the reveal/parallax layer
│       └── vendor/                 Vendored libraries — see vendor/LICENCES.md for every one
│
├── backend/
│   ├── DEPLOY.md                   Step-by-step Hostinger deployment guide
│   ├── sql/                        61-table cited knowledge base (schema + seed.sql … seed_v9.sql)
│   ├── data/                       egybi_kb.sqlite — the built KB mirror
│   ├── assets/                     og-image.html, the template build_og_image.py renders
│   ├── test/                       build_test_db.py → a local SQLite mirror of the KB
│   ├── pipeline/                   Everything that writes data or pages — see below
│   └── verify/                     The checkers. See "Verification" below — this is not optional
│
└── egybi/                       ← the DOCS (Obsidian vault: knowledge base / plan / decisions)
    └── Home.md                     ← START HERE for strategy, plan, and every decision
```

### `backend/pipeline/` — what writes what

| Script | Writes | Needs network |
|---|---|---|
| `fetch_worldbank.py` | `sql/seed_auto.sql` | yes |
| `fetch_prices.py`, `fetch_fx.py` | `site/data/prices-*.json`, `fx-*.json` | yes |
| `fetch_geo_layers.py` | `geo-health`, `geo-schools`, `geo-heritage`, `geo-places`, `geo-industry` | yes (Overpass, UNESCO) |
| `fetch_tourism.py` | `visit-climate`, `visit-relief`, `visit-terrain`, `visit-station-normals` | yes (NASA) |
| `fetch_streets.py` | `streets-districts`, `streets-boundaries`, `streets-access` | yes (Overpass) |
| `build_egypt_map.py` | `site/assets/egypt-geo.js` | no |
| `build_flag.py` | `site/assets/egypt-silhouette.svg` | no |
| `build_invest_map.py` | `site/data/invest-projects.json` | no |
| `build_static_pages.py` | 135+ pages, `sitemap.xml`, `feed.xml`, `404.html` | no |
| `build_og_image.py`, `build_favicons.py`, `build_planner_notes.py` | image and note assets | no |

Every network pipeline keeps its last-good file per layer when a source fails, and exits
non-zero so the Actions run shows red instead of publishing a hole.

## 🚀 Current status (live at egybi.com)

- **Frontend:** 18 top-level pages plus 12 data stories and 123 retirement notices — 153 in all. Hand-written
  HTML, CSS and vanilla JS — **no framework and no build step**; deployment is `git push`. Every
  map is tile-free vector Leaflet with **zero runtime requests to any map provider**, measured
  with request interception during real panning and zooming rather than assumed.
- **Backend:** a **61-table (838-row)** cited Egypt knowledge base across 18+ sectors, a read-only
  PHP/MySQL API, and isolated write-side endpoints for the newsletter and the moderated community
  board. A Phase-2 accounts layer exists and is **dormant** — its backend is deployed but no page
  loads it, because it tracked progress through challenges that no longer exist.
- **Automation:** twelve GitHub Actions workflows write dated data files, plus `Verify (browser)` on every push. Prices and FX daily,
  World Bank weekly, Atlas layers monthly, the street report card quarterly. The visitor layers
  are manual by design: SRTM is a completed survey and the climate normals average a closed window.

## 🔍 Verification

`backend/verify/` is a set of real checkers that drive the built site in Chromium. They exist
because three of six maps were once visibly broken while every automated check called them
clean — a map rendering zero markers still has zero console errors, zero off-origin requests
and perfectly good contrast on the text it does draw.

```bash
python3 -m http.server 8793 --directory site      # the checkers drive this
node backend/verify/all-pages.js                  # all 153 pages: errors, 404s, off-origin,
                                                  #   overflow, canonicals, CC BY attribution
node backend/verify/map-interaction.js            # real drag-pan, zoom, reset, click, at 1280 & 375
node backend/verify/reduced.js                    # reduced motion loses no content and stops all motion
node backend/verify/contrast.js                   # WCAG AA against the actually-painted background
node backend/verify/a11y2.js                      # keyboard operation with real key presses
python3 backend/verify/static-audit.py            # links, anchors, asset-version drift
python3 backend/verify/mutate.py                  # ← the one that checks the checkers
```

**`mutate.py` is the important one.** It injects, one at a time, the exact defect each checker
claims to catch, asserts the checker was quiet before, caught it, and is quiet again after the
revert. A checker that cannot be shown failing is not evidence. Set `CASE=` to run one case.

All of them also run in GitHub Actions on every push to `main` — `Verify (browser)` — because
every push to `main` is a live Hostinger deploy, so a regression reaches readers before anyone
looks. A failing run opens or comments on a failure issue naming the checker that broke and
quoting what it printed. See `backend/verify/README.md`.

Two rules the tools enforce that are easy to lose by hand:

- **CC BY 4.0 attribution.** Any page rendering geoBoundaries-derived geometry — a Leaflet map,
  the bundled `egypt-geo.js`, or the flag silhouette — must show the citation and link the deed.
  This is a licence condition, not a courtesy, and it is checked rather than remembered.
- **`build_static_pages.py` must be byte-identical across two consecutive runs.** It owns 135+
  pages; a generator that drifts turns every run into an unreviewable diff.

## ▶️ Quick start

**Preview the site locally:**
```bash
python3 -m http.server 8745 --directory site
# open http://localhost:8745
```

**Build the local KB mirror (SQLite, no MySQL needed):**
```bash
python3 backend/test/build_test_db.py
```

**Run the API locally:**
```bash
php -d extension=pdo_sqlite -S 127.0.0.1:8189 -t site/api site/api/index.php
# open http://127.0.0.1:8189/health
```

**Deploy to Hostinger:** follow `backend/DEPLOY.md` end to end.

## 📖 The plan & all decisions

Everything strategic lives in the **`egybi/`** Obsidian vault, entry point `egybi/Home.md`.
Two notes are worth reading before changing anything:
`egybi/Technology Rulings — What Was Declined and Why.md` (every tool proposed and its verdict)
and `egybi/Map Toolkit — Decisions and Handover.md` (what was acted on from the map toolkit and
what was declined, with the measurements).

## ⚖️ Non-negotiable rules

1. **Every figure is real, sourced and traceable to a named dataset with a date.** Uncertainty
   and disputes are flagged, never smoothed. Nothing is fabricated or back-filled. Fixture data
   is never committed.
2. **OSM counts are the geographic pattern of what has been mapped** — never official totals.
3. **No invented travel or investment facts.** Opening hours, ticket prices, hotel availability
   and investment terms all go stale. Every such figure carries its source and the date it was
   read, or it does not ship — which is why the visitor links are live searches and the investor
   page quotes only what a named source published.
4. **FRA: information and education only, never investment advice.** No recommendation, no
   projection, no return — locations and published figures only.
5. **Open source only, and no key at runtime.** No paid tier, no vendor account, no API key in
   the browser. GitHub Actions, Python and static hosting are the entire budget.
6. **No framework, no build step.** Anything added is vendored into `site/assets/vendor/` as a
   plain file the browser loads directly, with its licence recorded in `vendor/LICENCES.md`.
7. **Reduced motion means no animation, never reduced functionality.** Keyboard and
   screen-reader parity are not optional: labelled map features must be reachable as text.
8. **Original content only**, and **no employer data, ever** — nothing derived from the
   founder's day-job clients, schemas or code.
