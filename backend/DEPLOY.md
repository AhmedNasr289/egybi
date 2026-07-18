# Deploying EgyBI to Hostinger

A plain-language, step-by-step guide to get the whole thing live on your Hostinger
**Unlimited Web Hosting** plan at **egybi.com**. No command line required — everything
here can be done through Hostinger's hPanel and phpMyAdmin.

There are four pieces:

| Piece | What it is | Where it goes |
|---|---|---|
| **Frontend** | All pages (`site/*.html` — index, explore, tracks, practice, blog, community, about, privacy) + `favicon.svg` + `assets/` | `public_html/` (the site root) |
| **Database** | The Egypt knowledge base (58 tables) | A MySQL database you create in hPanel |
| **Backend API** | The read-only PHP that serves the knowledge base | `public_html/api/` |
| **Newsletter endpoint** | The one write-side PHP file — appends *The Papyrus* subscribers to a private file | `public_html/api/newsletter.php` (+ a private `_private/` folder) |

The practice SQL sandbox runs **in the visitor's browser** (sql.js), so there is no
server-side code execution to configure or secure — that was a deliberate design choice.
The newsletter endpoint is the **only** part of the site that writes anything, and it is
deliberately isolated and injection-safe (see Step 7). If you'd rather run zero server
code, Step 7 also documents a no-PHP fallback (Formspree/Buttondown).

---

## Step 0 — One-time: finish setting up the hosting plan

Your plan currently shows *"awaiting setup"*. In hPanel, click **Setup** on the
Unlimited Web Hosting plan, choose a data center (pick the one closest to Egypt/Europe
for lowest latency), and connect the **egybi.com** domain to it. Wait for it to finish
provisioning before continuing.

---

## Step 1 — Create the MySQL database

1. In hPanel, go to **Databases → MySQL Databases**.
2. Create a new database. Note the three values Hostinger gives you:
   - Database name (often prefixed, e.g. `u123456789_egybi_kb`)
   - Database username (e.g. `u123456789_egybi`)
   - The password you set
3. You do **not** need to change the 3 GB size limit — the whole knowledge base is a
   few hundred kilobytes.

## Step 2 — Import the schema and data

1. In hPanel, open **phpMyAdmin** for the database you just created.
2. Select the database on the left, then the **Import** tab.
3. Import **`backend/sql/schema_mysql.sql`** first (creates all 58 tables). Click Go.
4. Then import **`backend/sql/seed.sql`** (the core cited data). Click Go.
5. Then import **`backend/sql/seed_v2.sql`** (enrichment — demographics, governorates,
   energy, agriculture, water, notable people, universities, artifacts, more pharaohs).
6. Then import **`backend/sql/seed_v3.sql`** (economic time series — inflation, EGP/USD,
   unemployment, FDI, debt, reserves, remittances — plus digital-economy and social
   indicators and the tech ecosystem). Click Go.
7. Then import **`backend/sql/seed_v4.sql`** (five sectors — art & cinema, sports,
   industry/investment/companies, science & space, and water & irrigation). Click Go.
8. Then import **`backend/sql/seed_v5.sql`** (transport & infrastructure, a QS-2026
   university table, energy-depth + green-hydrogen deals, UNESCO sites, more pharaohs
   & events, and World Bank/OWID time series into `indicators`). Click Go.
9. Then import **`backend/sql/seed_v6.sql`** (telecom & internet time series, 2023 trade
   partners, and 2025 social-media platforms). Click Go.
10. Then import **`backend/sql/seed_v7.sql`** (agriculture/food + health system + economy
   depth + climate + demography — and the governorate map layers: it UPDATEs the
   `governorates` rows with 2017-census population and urban %). Click Go.
11. Then import **`backend/sql/seed_v8.sql`** (2026-current enrichment — prominent
   businessmen, cinema economics, military standing & arms-trade *public figures only*,
   football & handball depth, logistics projects, and national mega-project 2026 status).
   Click Go.
12. *(Optional, only if you ran the data pipeline)* import **`backend/sql/seed_auto.sql`**
   LAST — it is pipeline-generated and idempotently refreshes the World Bank indicator
   rows it owns. Skip it if the file doesn't exist.
13. Verify: click the database — you should see **58 tables**. Click `pharaohs` → Browse
   (45 rows); click `governorates` (all 27, now with `census_2017` + `urban_pct`); click
   `businessmen` (9), `football` (14), `arms_trade` (8), `logistics_projects` (12) and
   `megaproject_status` (12).

> **Import order matters** (v4–v8 add/UPDATE rows on existing tables): schema → seed →
> seed_v2 → seed_v3 → seed_v4 → seed_v5 → seed_v6 → seed_v7 → seed_v8 → (seed_auto).
> `build_test_db.py` runs exactly this order locally (**58 tables, 837 rows, zero FK
> violations**).

## Frontend note — the Egypt map & challenge assets

The Explore page's choropleth map is fully **offline**: `site/assets/egypt-geo.js` bundles
the geoBoundaries EGY ADM1 boundaries (CC-BY 4.0) with the KB governorate data baked in,
and `site/assets/egypt-map.js` renders it with **Leaflet** (loaded from CDN like the other
libraries) — no map tiles, so there are zero runtime external calls and it works on the
static Hostinger deploy. It colours by **five metrics** (population, density, urban %,
growth 2017→2023, area). To regenerate the bundle after a governorate-data change, run
`python backend/pipeline/build_egypt_map.py` — it reads `population/area_km2/census_2017/
urban_pct` from the rebuilt DB, so run `build_test_db.py` first. The SQL challenge catalog +
sandbox data live in `site/assets/challenges.js` (**50 challenges** across 11 sectors,
including the v8 Business / Defence / Logistics sets, each computed live from a reference
solution). The **Blog** posts live in `site/assets/blog-posts.js` (a plain data array — add
an object to publish a post). No server code is needed for any of this — it's all static.

> **Keeping data fresh (optional):** `backend/pipeline/fetch_worldbank.py` pulls the
> latest World Bank indicators, diffs them (`--dry-run`), and writes `seed_auto.sql`.
> See `backend/pipeline/README.md` — including which sources automate and which stay
> manual. Best run as a scheduled GitHub Action that opens a PR for review.

> If phpMyAdmin rejects a large import, it also accepts the files split up, or you can
> raise the import size limit in hPanel. The files are small, so this is unlikely.

## Step 3 — Upload the backend API

1. In hPanel, open **File Manager** (or use FTP).
2. Inside `public_html/`, create a folder named **`api`**.
3. Upload the entire contents of your local **`backend/api/`** folder into
   `public_html/api/` — that's `index.php`, `config.php`, `.htaccess`, and the `lib/`
   and `controllers/` folders. Keep the structure identical.
4. Open **`public_html/api/config.php`** in the File Manager editor and set it to MySQL
   with your Step 1 credentials. Change the driver and fill in the DB_* values:

   ```php
   'db_driver' => 'mysql',
   'db_host'   => 'localhost',   // Hostinger MySQL host is usually 'localhost'
   'db_name'   => 'u123456789_egybi_kb',
   'db_user'   => 'u123456789_egybi',
   'db_pass'   => 'YOUR_DB_PASSWORD_HERE',
   ```

   (The defaults fall back to SQLite for local testing; setting these switches it to your
   real MySQL database. Alternatively, set `DB_DRIVER`, `DB_NAME`, `DB_USER`, `DB_PASS` as
   environment variables in hPanel and leave config.php untouched — cleaner if you prefer
   not to store the password in a file.)

5. Make sure `public_html/api/` is writable so the API can create its `cache/` folder
   (the parent `backend/cache/` in dev; on the server it will create `public_html/cache/`
   relative to config — if caching silently doesn't work it's harmless, the API just
   serves live every time).

## Step 4 — Test the API

Visit these URLs in a browser (replace with your domain once the DNS is live):

- `https://egybi.com/api/health` → should return `{"ok":true,...,"status":"up","driver":"mysql"}`
- `https://egybi.com/api/datasets` → a list of 60+ datasets
- `https://egybi.com/api/datasets/pharaohs` → 45 rows of pharaoh data
- `https://egybi.com/api/charts/tourism` → the tourism time series
- `https://egybi.com/api/charts/businessmen` and `.../charts/arms-suppliers` → the v8 chart series

If `/api/health` works but a data endpoint errors, it's almost always the DB credentials
in `config.php` — double-check them against Step 1.

## Step 5 — Upload the frontend

1. Upload **everything in `site/`** into `public_html/` (the root), keeping the structure:
   - the eight pages — `index.html`, `explore.html`, `tracks.html`, `practice.html`,
     `blog.html`, `community.html`, `about.html`, `privacy.html`
   - `favicon.svg`
   - the whole **`assets/`** folder (`egybi.css`, `egybi.js`, `challenges.js`,
     `egypt-geo.js`, `egypt-map.js`, `blog-posts.js`, `newsletter.js`, `ads.js`)
   - `ads.txt` (for AdSense — see Step 8)
2. Visit **https://egybi.com** — the landing page should load, the live SQL demo
   should run (sql.js from a CDN, no backend), and the top nav should link Home / Explore /
   Tracks / Practice / Blog / Community / About plus the **Newsletter** CTA.

## Step 6 — Wire the frontend to the live API (optional, later)

The landing page currently uses real figures baked in as static values, so it works even
before the API is deployed. Once the API is live, you can switch the "Egypt by the numbers"
counters and the data chart to fetch from `https://egybi.com/api/charts/highlights` and
`.../charts/tourism` — the API already returns exactly the shapes those widgets expect.
Look for the `EGYBI_API_BASE` constant near the top of the `<script>` in `index.html`.

## Step 7 — The Papyrus newsletter signup

The signup form (on the home page's *Newsletter* section) posts to a **single, isolated
write-side PHP file**: `backend/api/newsletter.php`. It's the only place the whole site
writes anything.

1. Upload `backend/api/newsletter.php` into `public_html/api/` alongside the read-only API.
2. It writes subscribers to `public_html/api/_private/newsletter.jsonl` (one JSON object per
   line: `{email, ts, iph}`). Create the `_private/` folder if the script can't (it tries
   to `mkdir` it on first run). **Block web access to it** — the API `.htaccess` already
   denies `.jsonl`, but for belt-and-braces add a `_private/.htaccess` containing
   `Require all denied` (Apache 2.4) so the list can never be fetched over the web.
3. Test: submit the form on the live site. A valid email returns *"You are subscribed to
   The Papyrus"*; a duplicate (case-insensitive) is quietly ignored; an invalid address is
   rejected; a bot that fills the hidden `website` honeypot field gets a friendly success
   but is **not** stored. To read your list, open `_private/newsletter.jsonl` in File Manager.

**What makes it safe:** emails are validated with `filter_var(..., FILTER_VALIDATE_EMAIL)`,
stored **JSON-encoded** (so nothing in an address can break the file or inject), de-duplicated,
and appended under `LOCK_EX`. It uses plain `strtolower`/`strlen` (no `mbstring` dependency),
so it runs on any stock PHP host.

**No-server fallback (zero PHP):** if you'd rather not run the endpoint, point the form
elsewhere — in each page's config script set
`window.EGYBI_NEWSLETTER = { endpoint: 'https://formspree.io/f/XXXX' };` (or a Buttondown /
Mailchimp form-action URL). `assets/newsletter.js` will POST there instead, and it already
degrades gracefully with a clear message if the endpoint is ever unreachable.

## Step 8 — Google AdSense monetisation

The plumbing is built and **inert until you set a real publisher ID** — no ad requests, no
empty boxes, nothing to slow the site down before you're approved.

1. **Apply:** create a Google AdSense account and add `egybi.com` as a site. AdSense requires
   a privacy policy that discloses advertising cookies — that's already live at
   **`/privacy.html`** (linked in every page footer), so you're covered.
2. **ads.txt:** edit `public_html/ads.txt` and replace `pub-0000000000000000` with your real
   publisher ID (`pub-################` from AdSense → Account). Google reads it within a day
   or two. Comments (`#` lines) are fine to leave in.
3. **Turn ads on:** in each page's config script near the bottom, change
   `window.EGYBI_ADS = { client: 'ca-pub-XXXXXXXXXXXXXXXX' };` to your real
   `ca-pub-################`. That single change activates `assets/ads.js`, which then loads
   the AdSense library and fills any `.ad-slot` placeholders (there's one on Explore; add more
   by dropping `<div class="ad-slot" data-ad-slot="YOUR_SLOT_ID" hidden></div>` where you want
   a unit and creating that unit in the AdSense dashboard). The regex guard means the
   placeholder `...XXXX...` value stays completely inert, so you can deploy before approval.
4. **Hostinger note:** AdSense is pure client-side — no server config needed. Just make sure
   `ads.txt` sits at the site **root** (`egybi.com/ads.txt`, i.e. directly in `public_html/`)
   and that `privacy.html` is reachable. Keep ad density light (the built-in single Explore
   slot is deliberately unobtrusive) — AdSense penalises ad-heavy layouts.

---

## Security notes (already handled)

- The API is **read-only** — it only ever runs `SELECT`s, and dataset names are validated
  against a fixed whitelist, so no user input can reach the SQL as an identifier.
- The **newsletter endpoint** is the only writer: it validates the email, stores it
  JSON-encoded (injection-safe) under a file lock, and keeps the list in a web-inaccessible
  `_private/` folder (see Step 7).
- The `.htaccess` blocks direct web access to `.sql`, `.sqlite`, `.jsonl`, and `config.php`.
- Lock down CORS for production if you want: set the `CORS_ORIGIN` env var (or edit
  config.php) to `https://egybi.com` instead of `*`. For public reference data, `*` is
  acceptable.

## What NOT to put here

Your **video-to-arsl** project stays on AWS — it needs Lambda, Step Functions, S3, and
Bedrock, which shared hosting can't run. Only EgyBI belongs on this Hostinger plan.

---

## Local testing (for reference)

You already have a SQLite test database (`backend/test/egybi_test.sqlite`) built from the
same schema + seed, so you can run the exact same API code locally without MySQL:

```bash
# build/refresh the test DB (loads schema + all seed files, checks FKs, prints row counts):
python backend/test/build_test_db.py

# run the API locally (PHP built-in server, SQLite driver):
php -d extension=pdo_sqlite -d extension=sqlite3 -S 127.0.0.1:8189 backend/api/index.php
# then open http://127.0.0.1:8189/health   (60+ datasets; try /charts/businessmen)
```

> `build_test_db.py` runs `schema_sqlite.sql` → `seed.sql` → `seed_v2.sql` → … →
> `seed_v8.sql` in order, then a `PRAGMA foreign_key_check`. Latest build: **58 tables,
> 837 rows, zero FK violations.**

> To test the newsletter endpoint locally, run the PHP server from `backend/` and POST to
> `/api/newsletter.php` (e.g. `curl -d "email=you@example.com" http://127.0.0.1:8189/api/newsletter.php`).
