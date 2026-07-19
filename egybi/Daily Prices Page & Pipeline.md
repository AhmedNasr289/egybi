# Daily Prices Page & Data Pipeline

> **✅ BUILT & SHIPPED 2026-07-19 — RETAIL prices.** After the first build used Obour *wholesale* data, Ahmed asked for **retail (تجزئة) consumer prices** — what a shopper actually pays. The shipped version now pulls from the **official IDSC / Cabinet price API** (`http://app.prices.idsc.gov.eg/api`, the backend of `agriprice.gov.eg`), which returns **131 retail items across 9 categories** (groceries, vegetables, fruit, fish, dairy, meat & poultry, grains, fertilisers, building materials) in clean JSON — min/max/avg in EGP, a **daily change %**, unit, and the API's own `insertionDate` as `as_of` (2026-07-18). No HTML scraping. `backend/pipeline/fetch_prices.py` + `site/prices.html` verified (131 cards, nav wired, 0 console errors, WCAG AA, change badges ▲/▼). Obour wholesale stays documented below as an *alternative* source. Back to [[Home]] · see [[Changelog]] pt5–6.
>
> Executable plan for a **"أسعار المنتجات" (Product Prices)** page on EgyBI that refreshes **every day** from real Egyptian sources. Written after live web verification of every source below — nothing here is assumed. A working scraper + a real 140-item snapshot are proven (§3). This was the prerequisite step before the [[Build Plan|Phase-2 SaaS layer]].

**Bottom line up front:** there is **no open daily price *API*** in Egypt. Every genuinely-daily product-price source is an **HTML page on an HTTP-only government/market site** (some with expired SSL certs) that must be **scraped**. The good news: one of them — the **Obour wholesale market** — is clean, parseable, updated daily, and I already pulled 140 items from it end-to-end. That's the launch source. Everything else is a second-phase add or a monthly context layer.

---

## 1. Source verification (what's real, what's actually usable)

Every source below was checked live on 2026-07-19. "Machine-readable" = can a script get structured data without a human.

| Source | URL | Has product prices? | Coverage | Cadence | Machine-readable? | Verdict | Confidence |
|---|---|---|---|---|---|---|---|
| **Obour wholesale market** | `http://www.oboormarket.org.eg/prices_today.aspx` | **Yes** | ~140 veg/fruit/etc. wholesale items, min–max, unit, packaging, + per-item price-history chart | **Daily** | HTTP-only (refuses HTTPS); no `<table>` — Bootstrap "card" divs; **parsed successfully here** | **★ Launch source** | **High — 140 rows pulled, as_of 16/7/2026** |
| **بوابة الأسعار المحلية والعالمية (IDSC/Cabinet)** | `http://www.agriprice.gov.eg/` | **Yes** | Local + global commodity prices (the Cabinet's official price portal) | **Daily** | HTTP-only, **expired SSL cert** (WebFetch failed on cert; a cert-tolerant Python GET returned HTTP 200). HTML → scrape | **Phase-2 add** (authoritative, broader) | Med — reachable, DOM not yet mapped |
| **IDSC app / `idsc.gov.eg`** | `https://www.idsc.gov.eg/` | Yes (behind app) | 30+ **local** commodities updated **daily** (veg, fruit, meat, building materials, fertilizers) + 75 local/global | Daily | Data surfaced through the **IDSC mobile app**; website is JS-heavy, no documented open API | Use `agriprice.gov.eg` as its web face | Med |
| **بشائر (Bashaier)** | `http://www.bashaier.net/market-price/price-list` | Yes | Alt wholesale price list | Daily/near | HTML scrape | Backup/cross-check for Obour | Low-med |
| **CAPMAS CPI catalog** | `https://censusinfo.capmas.gov.eg/Metadata-en-v4.2/` | Index, not item prices | Consumer Price Index bulletins | **Monthly** | Catalog with CSV export URLs | **Context layer** (inflation trend) | Med |
| **Egypt Data Portal (AfDB)** | `https://egypt.opendataforafrica.org/` | Index, not item prices | CPI & inflation by section | Monthly | Real API + export | Context layer | Med-high |
| **وزارة التموين (subsidized/ration prices)** | via `digital.gov.eg` / press | Yes (subsidized) | ~33 ration-card items (sugar, oil, rice…) | Changes **infrequently** | Mostly PDF/press | Low-frequency manual layer | Med |
| **بنك المعرفة المصري (EKB)** | `https://www.ekb.eg/` | **No** | Academic/research library only — SciVal, ProQuest, Nature, e-books | — | — | **Ruled out — it has no commodity prices at all** | High |
| CBE | `cbe.org.eg` | No (FX + inflation only) | — | — | Blocks scraping | Not a product-price source | High |
| Trading Economics | `tradingeconomics.com/egypt` | Aggregated indices | Producer prices, CPI | — | Paywalled/secondary | Cite sparingly, not a primary feed | High |

**Honest headline:** the three sources you named resolve to — (1) **بوابة الأسعار المحلية والعالمية = `agriprice.gov.eg`**, run by IDSC/Cabinet, real and daily but on an expired-cert HTTP host; (2) **IDSC** = the same data, primarily via a mobile app; (3) **EKB = not a price source at all** (academic library). The most *immediately usable* daily source turned out to be one you didn't name — the **Obour wholesale market**.

---

## 2. Recommendation — the realistic daily stack

1. **Launch now on Obour** (`oboormarket.org.eg`). Proven parseable, ~140 daily items, includes a per-item price-history endpoint (`chart.aspx?items=<name>`) for trend charts. This alone makes a credible, genuinely-daily prices page.
2. **Add `agriprice.gov.eg` (IDSC) in phase 2** of this feature — it's the *authoritative government* portal and adds retail + global + likely governorate breadth. Needs a cert-tolerant fetch (its HTTPS cert is expired) and a one-time DOM mapping.
3. **Context layer (already automatable):** CAPMAS / Egypt Data Portal / World Bank **monthly CPI + inflation** for a "how prices moved over the year" chart — this reuses the existing [[Challenge Engine & Data Pipeline|fetch_worldbank.py]] pattern and the `indicators` table already in the KB.
4. **Subsidized/ration prices**: a small, low-frequency, semi-manual table (changes a few times a year) — nice contrast against market prices, but not part of the daily job.

**Design consequence:** the pipeline must be **cert-tolerant** (SSL verify off for these gov hosts), **HTTP-capable**, and **DOM-change-resilient** — because every daily source is a scrape of a fragile public site, not an API. This is consistent with EgyBI's existing "automatable-vs-manual, flag everything" honesty.

---

## 3. Live snapshot — proof the path works (not theoretical)

Pulled live on 2026-07-19 from `oboormarket.org.eg/prices_today.aspx` with a cert-tolerant Python GET, parsed 140 items in ~1 s. Page's own date: **16/7/2026**. Sample (EGP, wholesale, per kilo unless noted):

| Item (ar) | Min | Max | Unit | Packaging |
|---|---|---|---|---|
| طماطم | 7.5 | 13.5 | كيلو | قفص / تكنة بلاستيك / صندوق خشب |
| بطاطس | 13 | 17 | كيلو | جوال |
| بصل أبيض | 7 | 10 | كيلو | جوال |
| بصل أحمر | 6 | 8 | كيلو | جوال |
| كوسة | 12 | 20 | كيلو | قفص |
| جزر بدون عروش | 10 | 20 | كيلو | جوال |
| فاصوليا | 28 | 32 | كيلو | جوال / تكنة بلاستيك |
| باذنجان بلدي | 4.5 | 6.5 | كيلو | شوال / كرتونة |

…plus ~132 more items across vegetables, fruit and other categories. Source: [سوق العبور — أسعار اليوم](http://www.oboormarket.org.eg/prices_today.aspx). The raw HTML was saved as a pipeline **fixture** (for `--offline` testing) during this run.

---

## 4. Data model (fits the 58-table KB; read-only API stays read-only)

Three new tables. Every row carries `source_url` + `as_of` + optional `note`, per the KB rule. History is append-only: one row per **item × source × day**.

```sql
-- Master list of price sources (Obour, agriprice, Tamween, CPI…)
CREATE TABLE price_sources (
  id            INTEGER PRIMARY KEY,
  name_ar       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  url           TEXT NOT NULL,
  kind          TEXT NOT NULL,          -- 'wholesale' | 'retail' | 'subsidy' | 'index'
  cadence       TEXT NOT NULL,          -- 'daily' | 'monthly' | 'irregular'
  note          TEXT
);

-- Canonical item catalogue — keeps names stable across days & sources
CREATE TABLE price_items (
  id            INTEGER PRIMARY KEY,
  name_ar       TEXT NOT NULL,
  name_en       TEXT,
  category      TEXT NOT NULL,          -- 'vegetable' | 'fruit' | 'meat' | 'grocery' | 'building' | ...
  default_unit  TEXT,                   -- 'kg' | 'piece' | 'litre' ...
  slug          TEXT UNIQUE NOT NULL    -- stable key, e.g. 'tomato'
);

-- The daily fact table (append-only history)
CREATE TABLE daily_prices (
  id            INTEGER PRIMARY KEY,
  item_id       INTEGER NOT NULL REFERENCES price_items(id),
  source_id     INTEGER NOT NULL REFERENCES price_sources(id),
  as_of         DATE    NOT NULL,       -- the price date reported by the source
  price_min     REAL,
  price_max     REAL,
  price_avg     REAL,                   -- (min+max)/2 when only a range is given — flagged in note
  currency      TEXT NOT NULL DEFAULT 'EGP',
  unit          TEXT,
  packaging     TEXT,
  governorate   TEXT,                   -- NULL for single-market sources like Obour
  source_url    TEXT NOT NULL,
  note          TEXT,                   -- e.g. 'range→avg estimated', 'subsidised price'
  fetched_at    TEXT NOT NULL,
  UNIQUE(item_id, source_id, as_of)     -- idempotent daily upsert
);
CREATE INDEX idx_daily_prices_asof ON daily_prices(as_of);
CREATE INDEX idx_daily_prices_item ON daily_prices(item_id, as_of);
```

**API wiring (read-only preserved):** register `price_items`, `price_sources`, `daily_prices` as whitelisted read-only datasets, and add chart endpoints `/charts/prices-today` (latest `as_of` snapshot) and `/charts/price-trend?item=<slug>` (history for one item). The API only ever `SELECT`s — the **pipeline** is the writer, exactly like `seed_auto.sql` is loaded separately today. No change to the read-only principle.

Example `daily_prices` row from the live pull:
```json
{ "item":"tomato","source":"obour","as_of":"2026-07-16","price_min":7.5,"price_max":13.5,
  "price_avg":10.5,"currency":"EGP","unit":"kg","packaging":"قفص/تكنة/صندوق",
  "governorate":null,"source_url":"http://www.oboormarket.org.eg/prices_today.aspx",
  "note":"wholesale; avg = midpoint of reported range" }
```

---

## 5. Daily pipeline — `backend/pipeline/fetch_prices.py` (mirrors `fetch_worldbank.py`)

Same shape as the existing World-Bank fetcher (idempotent seed, `--dry-run` diff, `--offline` fixtures, human review gate):

- **Fetch:** cert-tolerant HTTP GET (`ssl` verify off, realistic UA). **Required** — these gov/market hosts are HTTP-only / expired-cert.
- **Parse:** one small parser per source. The **Obour parser is written & proven** (cards: `<h5>` name, `من سعر/الى سعر` min–max, `.status` unit, `العبوة` packaging). `agriprice` parser = TODO once its DOM is mapped.
- **Normalize:** map each source's Arabic item name → the canonical `price_items` catalogue (a synonyms map: `بصل أحمر`/`بصل احمر` → `onion_red`), so history stays joinable.
- **Emit:** `seed_prices_YYYYMMDD.sql` with idempotent upserts (`INSERT … ON DUPLICATE KEY UPDATE` on MySQL / `INSERT OR REPLACE` on SQLite) keyed on `(item_id, source_id, as_of)`.
- **Guardrails (don't overwrite good data with garbage):** if a source is unreachable, its DOM changed, or today's row-count drops >30% vs the last good day → **abort, alert, keep last-good**. Log what was skipped (the KB "never silently truncate" rule).
- **Modes:** `--dry-run` prints a diff vs the DB; `--offline` runs against saved HTML fixtures (today's Obour HTML already captured); default writes the seed for human review before load.

**Deploy shape — two options, launch with the simpler:**

- **(A) Static JSON (recommended for launch).** A **daily GitHub Action** runs `fetch_prices.py`, writes `site/data/prices-today.json` + `site/data/prices-history.json`, commits them. The static page just `fetch()`es those files. **Zero server write, fits EgyBI's static-first architecture, free, and the gov-site SSL mess runs on GitHub's network, not Hostinger's.**
- **(B) DB-backed (later).** Nightly import the seed into MySQL; the PHP API serves `/charts/prices-*`. Do this once you also want the data queryable in the Practice sandbox.

**Runner: GitHub Action cron > Hostinger cron.** Hostinger cron *can* run PHP/curl daily, but its shared IP may be throttled/blocked by gov sites and the expired-cert handling is fiddly in PHP; a GH Action is cleaner, free, observable, and keeps the write off the web host. (Document both.)

**Politeness/legality of frequency:** 1 request/source/day, cached, identifying User-Agent.

---

## 6. The Prices page — `site/prices.html`

- **Design:** papyrus/gold/blue system, matches every other page. Hero: *"أسعار المنتجات — تتحدث يوميًا"* with an **"آخر تحديث: 16/7/2026 · المصدر: سوق العبور"** badge and a source link.
- **Layout:** category tabs (خضار / فاكهة / لحوم / بقالة / مواد بناء); a **searchable, sortable grid** of item cards (or a dense table toggle) showing min–max + unit + packaging; a small **sparkline** per item; click an item → a full **Chart.js price-history** view (from `daily_prices` history, backfilled from Obour's `chart.aspx` if we choose to).
- **Context strip:** a monthly **CPI / food-inflation** line (from the `indicators` KB layer) so daily market prices sit against the official inflation trend — the honest "prices vs. official index" story EgyBI is good at.
- **Discipline:** every number shows its **source link + `as_of`**; ranges and any midpoint average are **flagged**; "wholesale, not retail" stated plainly. Responsive; **WCAG AA** contrast; Arabic item names with the site's UI. Wire into nav + footer like the other pages.
- **Later / Phase-2 tie-in:** price-based Practice challenges ("which item rose most week-over-week", "avg price by category today"), and — once accounts exist — price-watch alerts as a paid perk (see [[Build Plan]]).

---

## 7. Legality & the automatable-vs-manual map

- **Legality:** prices are **facts** (not copyrightable); scraping **public** government/market price pages, at low frequency, **with attribution and a link back on every row**, is low-risk. Still: check each site's `robots.txt`/terms, identify the bot via User-Agent, cache, and never hammer (1×/day). Present the data in EgyBI's own original layout, not a copy of theirs.
- **What truly automates daily vs. not — flag it on the page:**
  - **Obour** — fully automatable (proven). ✅ daily
  - **agriprice.gov.eg** — automatable once DOM mapped; cert-tolerant fetch required. ✅ daily (phase 2)
  - **CAPMAS / Egypt Data Portal / World Bank CPI** — automatable, **monthly**. ✅ context
  - **Subsidized/ration prices** — low-frequency, **semi-manual**. ⚠️
  - **EKB** — **N/A, no prices.** ❌

---

## Decisions & open questions

1. **Launch scope:** ship the page on **Obour only** now, add `agriprice` after? → *Recommended: yes, launch on Obour.*
2. **Deploy shape:** **static JSON via GitHub Action** for launch vs DB-backed? → *Recommended: static JSON first.*
3. **Page language:** fully Arabic, or Arabic item names with bilingual UI? (Rest of the site is English.)
4. **History:** start accumulating from today (clean, no backfill) vs scrape Obour's per-item `chart.aspx` to seed history? 
5. **Runner:** GitHub Action (recommended) vs Hostinger cron.
6. **Governorate breakdown:** Obour is one (Cairo) wholesale market — no governorate split. `agriprice`/retail may allow it later; defer.

---

## Sources (verified 2026-07-19)
- [سوق العبور — أسعار اليوم](http://www.oboormarket.org.eg/prices_today.aspx) · [بوابة الأسعار المحلية والعالمية — agriprice.gov.eg](http://www.agriprice.gov.eg/) · [مركز معلومات مجلس الوزراء (IDSC)](https://www.idsc.gov.eg/) · [بشائر — أسعار الجملة](http://www.bashaier.net/market-price/price-list) · [CAPMAS CPI catalog](https://censusinfo.capmas.gov.eg/Metadata-en-v4.2/) · [Egypt Data Portal (AfDB)](https://egypt.opendataforafrica.org/) · [بنك المعرفة المصري (EKB) — academic library, no prices](https://www.ekb.eg/) · [أسعار التموين — يوليو 2026 (المصري اليوم)](https://www.almasryalyoum.com/news/details/4305553)
