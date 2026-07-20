# Backend & Egypt Knowledge Base

Built and tested 2026-07-18. This is the real, working data layer behind EgyBI — a cited Egypt knowledge base in a relational DB, plus a read-only PHP API that serves it to the practice sandbox and the site's dashboards. Location: `C:\dev\perankh\backend`.

## The knowledge base (61 tables, 838 rows)

> **Enriched 2026-07-20 (v9).** The history & heritage-depth pass that brings the KB to its current **61 tables (838 rows)** — it adds 58 cited rows across four tables that the schema already defined, all cited, disputes flagged in `certainty_note`: `obelisks` (33 surviving ancient obelisks and where each stands today — only 15 remain in Egypt; 18 abroad across 7 countries; the tallest standing is the Lateran in Rome at 32.18 m and the largest ever cut is still cracked in the Aswan quarry at 41.75 m), `archaeological_discoveries` (7 landmark finds — attribution/first-discoverer disputes stated, not smoothed), `temples` (11 major temples by principal deity), and `royal_women` (7 who held real power — Hatshepsut, Nefertiti, Cleopatra VII, etc.). `seed_v9.sql`; import order `… → seed_v8 → seed_v9 → (seed_auto)`. Rebuilt clean via `test/build_test_db.py` (**61 tables, 838 rows, zero FK**). The schema always created these four tables; `seed_v9` is what fills them, and the homepage's "Here for Egypt, not for SQL?" obelisk section reads them — so `seed_v9` is **not** optional on deploy (the earlier `DEPLOY.md`/`GO-LIVE.md` steps stopped at v8, which left the four tables empty; corrected 2026-07-20).

> **Enriched again 2026-07-19 (v8).** 50 → **58 tables (837 rows)** with a 2026-current pass, all cited, disputes/estimates/projections flagged in-row: `businessmen` (Forbes real-time — Nassef Sawiris $9.9bn etc.; stake-value figures for Ezz/Thabet flagged as not full net worth), `cinema_economics` (box office, export markets, monetisation levers), `military_strength` + `arms_trade` (**public figures/rankings only** — Global Firepower 2026 rank 19/#1 Africa, SIPRI 2020-24 shares; no operational detail), `football` (Salah 121 caps/68 goals, AFCON 7, WC 2026 qualified) + `handball` (10 African titles), `logistics_projects` (dry ports, SCZONE, LPI 3.1) and `megaproject_status` (honest 2026 status). `seed_v8.sql`; +8 datasets + `/charts/{businessmen,arms-suppliers}`. Rebuilt clean (58 tables, 837 rows, zero FK). Also this pass: a write-side newsletter endpoint (`api/newsletter.php` — the only writer), Blog + Community + Privacy pages, config-gated AdSense plumbing, and Explore regrouped with Business/Logistics/Defence sections + football/handball. See [[Frontend & Design System]].

> **Enriched 2026-07-19 (v7).** 43 → **50 tables (~745 rows)**: `crop_production` (FAOSTAT staples 2015-2023), `food_facts`, `health_stats`, `climate_normals`, `economy_series` (external debt, EGX30, current account, savings, tax), `demographics` (age structure, urban/rural, religion flagged estimated, languages). `seed_v7.sql`; +6 datasets + `/charts/{crops,health,economy-depth,climate}`. This pass also added **two new Egypt-map layers** — the map now colours by 5 metrics (population, density, **urban %**, **growth 2017→2023**, area); `governorates` gained `census_2017` (2017 CAPMAS census, the 27 sum to the exact national total) + `urban_pct` columns via seed_v7 UPDATEs, baked into `egypt-geo.js`. Full map audit passed (27 render, name-join correct, values match KB, geography correct). See [[Challenge Engine & Data Pipeline]].


> **Enriched again 2026-07-19 (v6).** 40 → **43 tables (~647 rows)**: `telecom_stats` (mobile/broadband/internet-user time series + Ookla speeds), `trade_partners` (2023 top export destinations & import origins, OEC), `social_platforms` (most-used platforms 2025, DataReportal). `seed_v6.sql`; +3 datasets + `/charts/{telecom,trade-partners,social}`. This pass also shipped the **BI-grade Egypt choropleth map** (offline Leaflet, `site/assets/egypt-geo.js` + `egypt-map.js`, built by `backend/pipeline/build_egypt_map.py`) and **doubled the SQL challenge set to 43** with instructive auto-documented givens (`EGYBI_TABLE_DOCS`). See [[Challenge Engine & Data Pipeline]]. *(Agriculture/health + economy/climate/demography research was still returning — lands as seed_v7.)*


> **Enriched again 2026-07-18 (v5).** 35 → **40 tables (~607 rows)**. New sector **Transport & Infrastructure** (`transport_projects`, `transport_stats`: Cairo Metro/Monorail, the Siemens 2,000 km high-speed rail, LRT, ports, airports, the record bridge). New **`university_rankings`** (13 Egyptian universities in QS 2026). Energy depth: **`green_hydrogen_deals`** (all flagged MoU/framework — only the Scatec–Fertiglobe project has a real offtake) + 5 more renewable projects. **`unesco_sites`** (all 7). +6 pharaohs (fills Second Intermediate / Late Period gaps) and +7 events. **World Bank/OWID time series** into `indicators` (GDP per capita, GDP growth, life expectancy, under-5 mortality, CO₂/capita, urbanisation, tertiary enrollment, education spend, electricity generation & renewable share). `seed_v5.sql`; import order seed → v2 → v3 → v4 → v5 → (seed_auto). New API: `/charts/{transport,universities,energy-trend}` + 5 datasets. Rebuilt clean (40 tables, 607 rows, zero FK). An **automated World Bank fetch pipeline** now owns the numeric time series — see [[Challenge Engine & Data Pipeline]]. All the honestly-flagged disputes from the v5 research are kept in-row (HSR is not yet operational; the bridge is "cable-stayed" not "suspension"; every green-hydrogen deal is an MoU; Benban capacity and literacy series are disputed; ancient reign dates approximate).

> **Enriched again 2026-07-18 (v4)** from 22 → **35 tables (~480 rows)** with five new sectors, each real & cited, disputes flagged in-row. **seed_v4.sql** added: **Art & Cinema** — `cultural_figures` (25: Chahine, Umm Kulthum, Mokhtar, ...), `cultural_institutions` (6: Studio Misr, CIFF, GEM, Cairo Opera, Museum of Islamic Art, Bibliotheca Alexandrina), `film_industry` (10: CIFF 2024/2025 winners, 2025 box office, records); **Sports** — `athletes` (12: Salah, El Sherbini, Asal, Feryal Ashraf, ...), `sports_titles` (7: AFCON 7, Al Ahly 12 CAF CL, squash 14, 38 Olympic medals); **Industry/Investment** — `industrial_sectors` (7), `major_companies` (12: CIB, NBE, Elsewedy, Ezz Steel, ...), `investment_deals` (6: Ras El Hekma $35bn, IMF 2016/2022/2024, SCZONE, privatization); **Science & Space** — `satellites` (7: EgyptSat-1→NExSat-1), `research_institutions` (4: EgSA, African Space Agency, Zewail City, NRC), `scientists` (5: Zewail, El-Baz, El-Sayed, Iskander, Farid); **Water & Irrigation** — `water_projects` (7: New Delta, Toshka, Bahr El-Baqar, El-Hammam, desalination, canal lining), `water_resources` (10: the 86/11.5/2.5 usage split + deficit metrics). Also **+El Dabaa** in `megaprojects` and **+R&D / Hepatitis-C** rows in `indicators`. Import order: `seed.sql` → `seed_v2.sql` → `seed_v3.sql` → `seed_v4.sql`. New API endpoints: `/charts/{water-usage,sports-titles,industry}` + 13 new `/datasets/{name}`. Rebuilt via `test/build_test_db.py` — 35 tables, 480 rows, **zero FK violations**. Flagged in-row: Feryal Ashraf's gold is karate (not taekwondo); Umm Kulthum/Soad Hosny disputed dates; the 2024 IMF "$8bn" is the augmented total; SCZONE cumulative totals ($8.3-11.6bn) and the New Delta/Toshka/desalination targets are projections; GERD downstream-loss figures are Egyptian-source scenario models.

> **Enriched 2026-07-18** from 12 → **22 tables (~322 rows)** across two enrichment passes (six web-research rounds total). **seed_v2.sql** added: `population` (WB 1960–2024), `governorates` (all 27, with area — populations sum to the exact CAPMAS national total), `energy_generation` (2023 mix, sums to 100%), `renewable_projects`, `agriculture`, `water_facts` (Nile, Lake Nasser, Aswan Dam, GERD dispute), `notable_people` (12, incl. all 4 Egyptian Nobel laureates), `universities`, `artifacts`, +6 pharaohs. **seed_v3.sql** added the economic time series to `indicators` (inflation, EGP/USD exchange rate, unemployment, FDI, government debt, reserves, remittances — 2010–2024), digital-economy indicators (internet, mobile, ICT-GDP share), social indicators (life expectancy, infant mortality, physicians, HDI, health expenditure, poverty), and a `tech_companies` table (Fawry, InstaPay, MNT-Halan, Swvl, Vezeeta). `indicators` now has 87 rows across `economy` / `development` / `digital` categories. Import order: `seed.sql` → `seed_v2.sql` → `seed_v3.sql`. New API endpoints: `/charts/{population,energy,governorates,prices,digital}` + 10 new `/datasets/{name}` snapshots. All verified loading with zero FK violations. Notable flags kept in-row: the FDI-vs-remittances distinction, FY-vs-CY divergence, the FX-crisis distortions, and a genuine source disagreement on 2024 remittances ($22.7bn vs $29.6bn) left flagged rather than resolved.

The base is a single normalized relational KB spanning **ancient Egypt → present day**, every row real and cited, with disputed/approximate figures flagged in-row per the project content rule ([[IP & Content Rules]]). The original 12 tables:

| Table | What | Rows |
|---|---|---|
| `pharaohs` | Dynasty chronology (signed years, negative = BCE) | 33 |
| `monuments` | Monument construction windows, FK to pharaohs | 20 |
| `historical_eras` | Ptolemaic → El-Sisi eras | 10 |
| `historical_events` | Key dated events across all eras | 33 |
| `modern_leaders` | Muhammad Ali → El-Sisi | 7 |
| `indicators` | Economy + development time series (World Bank: GDP, per-capita, sector shares, literacy, internet, electricity) | 30 |
| `suez_canal_revenue` | Revenue by year, FY & CY flagged; the 2024 Red Sea collapse | 10 |
| `exports` | Top export categories 2023 | 5 |
| `tourism_annual` | Arrivals + revenue 2019–2025 (incl. the confirmed 2025 ~19M record) | 7 |
| `tourist_sites` | Top sites, FK to monuments | 8 |
| `tourism_source_markets` | Leading inbound markets | 7 |
| `megaprojects` | New Admin Capital, GEM, New Suez Canal, Benban, Aswan High Dam | 5 |

**Key convention decision:** all year columns use **signed integers (negative = BCE, positive = CE)** — unified across pharaohs, monuments, eras, and events. This was a deliberate fix: pharaohs/monuments were originally stored as positive-BCE, which made reign-length arithmetic (`reign_end - reign_start`) come out negative and inconsistent with the eras tables and the shipped landing-page demo. Signed years make date math natural and match the sql.js demo exactly (Pepi II = 94 years, correct).

**Sourcing:** every figure traces to a real source (World Bank, CBE, Suez Canal Authority, SIS/Ministry, Britannica, Wikipedia era pages, Lloyds/Coface). Disputed items are flagged: Pepi II's 94-yr reign (Turin King List vs ~64), the 2021 tourism-revenue dispute, Suez FY-vs-CY accounting windows, Benban's shifting "largest solar park" ranking, GEM's conflicting artifact counts. Full research + citations came from four sourced web-research passes (modern history, economics/Suez, tourism, megaprojects).

## The files

- `sql/schema_mysql.sql` — the canonical DDL for **Hostinger MySQL** (utf8mb4, InnoDB, FKs, indexes).
- `sql/schema_sqlite.sql` — mirror DDL for local testing.
- `sql/seed.sql` — portable INSERTs (work on both MySQL and SQLite), all the cited data.
- `test/egybi_test.sqlite` — a built local test DB (from schema_sqlite + seed).
- `api/` — the PHP API (see below).
- `DEPLOY.md` — plain-language Hostinger deployment guide (create DB → import SQL via phpMyAdmin → upload API → edit config → upload frontend).

## The API (framework-free PHP, Laravel-style structure)

Deliberately **framework-free** — no Composer/Laravel needed, so it runs on any Hostinger PHP hosting as-is (Hostinger's Unlimited plan does support SSH/Composer if we ever want real Laravel, but this doesn't require it). PHP 8, PDO, read-only.

- `api/config.php` — DB config; `db_driver` switches mysql (prod) / sqlite (local test) transparently.
- `api/lib/Database.php` — PDO singleton, portable queries.
- `api/lib/Response.php` — JSON envelopes + CORS; controllers RETURN payloads (no `exit`), so caching works.
- `api/lib/Cache.php` — file cache (data is static; degrades gracefully if cache dir unwritable).
- `api/controllers/DatasetController.php` — dataset **snapshots** for the client-side sql.js sandbox: returns columns (with inferred INTEGER/REAL/TEXT types), rows, a ready `create_table_sql`, and the dataset's source URLs so citations travel with the data. **Whitelisted table names only** (no user input reaches SQL as an identifier).
- `api/controllers/ChartController.php` — pre-shaped aggregates for dashboards: `/charts/gdp`, `/suez-revenue`, `/tourism`, `/gdp-composition`, `/exports`, `/highlights` (headline figures for the landing counters), plus `/timeline` and `/megaprojects`.
- `api/index.php` — front controller/router; strips optional `/api` prefix; central emit + cache; 404/500 handling.
- `api/.htaccess` — Apache rewrite for Hostinger + blocks direct access to `.sql`/`.sqlite`/`config.php`.

**Endpoints:** `/health`, `/datasets`, `/datasets/{name}`, `/charts/{gdp|suez-revenue|tourism|gdp-composition|exports|highlights}`, `/timeline`, `/megaprojects`.

## Verified working (2026-07-18)

Ran the API locally via PHP built-in server against the SQLite test DB: health OK, all 12 datasets serve, snapshots return correctly-typed columns + rows + sources, all chart endpoints return correct aggregates, cache MISS→HIT confirmed, 404s handled, clean error log. A real bug was found and fixed during testing: the original caching layer was dead code because `Response::json()` called `exit` before the cache-write ran — refactored to return-based controllers with central emit.

## Security posture (public reference data)
Read-only SELECTs only; dataset/table names validated against a fixed whitelist; `.htaccess` denies raw SQL/config; CORS lockable to the real origin via env. No multi-tenant isolation needed here (this is public data, unlike a hypothetical user-data layer).

## Related
- [[Product Format & Architecture]] — the client-side sql.js sandbox this backend feeds
- [[Historical Data & Challenge Themes]] — the ancient-Egypt half of the KB and the challenge designs built on it
- [[Improvement Roadmap]] — where this fits in the sequence
- `C:\dev\perankh\backend\DEPLOY.md` — how to put it all on Hostinger
