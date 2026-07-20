# Deploying EgyBI to Hostinger

> **👉 Using Git auto-deploy? Follow [`GO-LIVE.md`](../GO-LIVE.md) instead — it's
> the canonical launch checklist for the GitHub-connected workflow you set up.**
> This file remains the detailed *manual-upload* reference and the per-feature
> notes (newsletter, AdSense, prices, community, accounts). Both are consistent.

> **Repo layout note:** the web root is the **`site/`** folder, which now contains
> the pages **and** the `api/` and `auth/` backends. In this guide, "upload
> `site/api` → `public_html/api`" and "`site/auth` → `public_html/auth`" — or, with
> Git deploy, set the document root to `public_html/site` and it's all in place.

A plain-language, step-by-step guide to get the whole thing live on your Hostinger
**Unlimited Web Hosting** plan at **egybi.com**. No command line required — everything
here can be done through Hostinger's hPanel and phpMyAdmin.

There are four pieces:

| Piece | What it is | Where it goes |
|---|---|---|
| **Frontend** | All pages (`site/*.html` — index, explore, tracks, practice, blog, community, about, privacy) + `favicon.svg` + `assets/` | `public_html/` (the site root) |
| **Database** | The Egypt knowledge base (58 tables) | A MySQL database you create in hPanel |
| **Backend API** | The read-only PHP that serves the knowledge base | `public_html/api/` |
| **Newsletter endpoint** | The one write-side PHP file — stores *The Papyrus* subscribers in the database (was a private file; that file was deleted by every deploy) | `public_html/api/newsletter.php` |

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
3. Upload the entire contents of your local **`site/api/`** folder into
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
   - the nine pages — `index.html`, `explore.html`, `prices.html`, `tracks.html`,
     `practice.html`, `blog.html`, `community.html`, `about.html`, `privacy.html`
   - `favicon.svg`
   - the whole **`assets/`** folder (`egybi.css`, `egybi.js`, `challenges.js`,
     `egypt-geo.js`, `egypt-map.js`, `blog-posts.js`, `newsletter.js`, `ads.js`)
   - the **`data/`** folder (`prices-today.json`, `prices-history.json` — the daily
     prices feed the Prices page reads; see Step 9)
   - `ads.txt` (for AdSense — see Step 8)
2. Visit **https://egybi.com** — the landing page should load, the live SQL demo
   should run (sql.js from a CDN, no backend), and the top nav should link Home / Explore /
   Prices / Tracks / Practice / Blog / Community / About plus the **Newsletter** CTA.

## Step 6 — Wire the frontend to the live API (optional, later)

The landing page currently uses real figures baked in as static values, so it works even
before the API is deployed. Once the API is live, you can switch the "Egypt by the numbers"
counters and the data chart to fetch from `https://egybi.com/api/charts/highlights` and
`.../charts/tourism` — the API already returns exactly the shapes those widgets expect.
Look for the `EGYBI_API_BASE` constant near the top of the `<script>` in `index.html`.

## Step 7 — The Papyrus newsletter signup

The signup form (on the home page's *Newsletter* section) posts to a **single, isolated
write-side PHP file**: `site/api/newsletter.php`. It's the only place the whole site
writes anything.

1. Upload `site/api/newsletter.php` into `public_html/api/` alongside the read-only API.
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

## Step 9 — Daily product prices (the Prices page)

The **Prices page** (`prices.html`) shows real Egyptian **retail (consumer) prices** and reads
two static JSON files in `site/data/`. Those files are produced by
**`backend/pipeline/fetch_prices.py`**, which reads the **official IDSC / Cabinet price API**
(`http://app.prices.idsc.gov.eg/api` — the JSON backend of the government portal
`agriprice.gov.eg`): ~131 retail items across 9 categories (groceries, vegetables, fruit,
fish, dairy, meat, grains, fertilisers, building materials), each with min/max/avg in EGP and
a daily change %. Clean JSON, not HTML scraping. No server code runs for this — it's static
JSON the page `fetch()`es, so it works on plain Hostinger.

Run it locally / on any machine with Python:

```bash
python backend/pipeline/fetch_prices.py --dry-run   # fetch + parse + summary, write nothing
python backend/pipeline/fetch_prices.py             # write site/data/prices-today.json + prices-history.json
python backend/pipeline/fetch_prices.py --offline   # parse the bundled fixture (no network) — for testing
```

It is **cert-tolerant on purpose** (the Egyptian gov/market price sites are HTTP-only and
some, like `agriprice.gov.eg`, have expired SSL certs), idempotent (re-running the same day
adds no duplicate history), and has a guardrail that **aborts and keeps the last-good files**
if the source is unreachable or its markup changed (so the page never shows garbage).

**To refresh daily, pick one:**
- **GitHub Action (recommended):** a daily `cron` workflow runs `fetch_prices.py` and commits
  the updated `site/data/*.json`. The gov-site SSL quirks run on GitHub's network, not your
  host, and it's free + observable. (If the repo auto-deploys to Hostinger, the page updates
  itself; otherwise re-upload `site/data/` after each run.)
- **Hostinger cron:** possible via a PHP/`curl` wrapper, but the shared IP can be throttled by
  the source and the expired-cert handling is fiddly in PHP — the GitHub Action is cleaner.

The history file grows one point per item per day, so the per-item trend charts fill in over
time. See the full source research + data model in `egybi/Daily Prices Page & Pipeline.md`.
The IDSC API also exposes **wholesale**, **port** and **international** price views (not just
retail) — to surface those later, read the other keys from `GetGeneralIndicatorAllData` in
`fetch_prices.py`; the JSON shape already supports labelling multiple sources/views.

## Step 10 — Community ideas & comments (moderated)

The **Community** page lets visitors post ideas/comments through a second isolated
write endpoint, **`site/api/community.php`** — the same discipline as the newsletter,
plus **moderation**: nothing a stranger posts appears publicly until a human approves it.

1. Upload `site/api/community.php` into `public_html/api/`.
2. It stores submissions in `public_html/api/_private/community.jsonl` (append-only, one
   JSON object per line: `{id, name, message, ts, iph, approved}`). Block web access to
   `_private/` exactly as for the newsletter list.
3. **How posting works:** the form on the page POSTs `message` (+ optional `name`, + a
   hidden `website` honeypot). Valid notes are stored with `"approved": false` and a
   friendly "will appear once approved" message; the honeypot silently drops bots; the
   `GET` on the same URL returns **only approved** entries, which the page renders.
4. **To approve a note:** open `_private/community.jsonl` and change that line's
   `"approved": false` to `true` (or wire any small admin step you like). Moderation-first
   is the default, so an unreviewed board can never show spam or abuse.

**What makes it safe:** every field is JSON-encoded (injection-safe), length-capped,
control-characters stripped, appended under `LOCK_EX`; only `name/message/ts` are ever
served back. It reuses `.htaccess`'s `.jsonl` deny.

**No-server fallback (zero PHP):** to run community on a pure-static host, embed a hosted
discussion instead — **[Giscus](https://giscus.app)** (free, backed by GitHub Discussions;
paste its `<script>` into the page's `#communityList` area and drop `community.js`), or
**Disqus**. `assets/community.js` already degrades gracefully (the form explains itself and
points to `hello@egybi.com`) if no endpoint is connected.

## Step 11 — Accounts / SaaS layer (Phase 2)

Optional but ready. `site/auth/` is an **isolated** module (never touches the
read-only KB API) that adds real accounts, per-account progress sync, and
paywall-ready gating — **every plan free at launch**. Full design in
`egybi/Phase 2 — SaaS & Accounts.md`.

1. **Upload** the whole `site/auth/` folder to `public_html/auth/`
   (`auth.php`, `progress.php`, `stats.php`, `payments.php`, `lib.php`,
   `mailer.php`, `schema_auth_mysql.sql`, `config.sample.php`). The frontend
   already calls `auth/…` relatively.
2. **Create a MySQL DB** (or reuse the KB one) and **import
   `schema_auth_mysql.sql`** via phpMyAdmin — *not* the SQLite `schema_auth.sql`.
   (users, sessions, auth_tokens, user_progress, user_stats, entitlements,
   auth_attempts.) The MySQL file uses `VARCHAR` keys + `ENGINE=InnoDB
   CHARSET=utf8mb4`, because **MySQL cannot index a `TEXT` column** the way SQLite
   can — importing the SQLite schema on MySQL will fail. `schema_auth.sql` is for
   local SQLite testing only.
3. **Configure secrets — ONE FILE ABOVE `public_html`.**

   > ⚠ **Not `_private/config.php`, and not hPanel environment variables.**
   > `_private/` is gitignored, so it is absent from the repo, and Hostinger's
   > deploy replaces `public_html` from the repo — every push deleted it.
   > Hostinger *shared* hosting also has no environment-variable section (PHP
   > Configuration offers only version / extensions / options).
   >
   > Deploys never touch the folder **above** `public_html`. Put the config there.

   In File Manager, go to the folder that *contains* `public_html` (e.g.
   `/domains/egybi.com/`), create **`egybi-config.php`**, and paste the contents
   of `egybi-config.sample.php` from the repo root. Fill in either the MySQL
   credentials (recommended — tables self-create, no phpMyAdmin import) or a
   `sqlite_path` above `public_html`, plus `app_secret` and `analytics_key`.

   `lib.php` walks upward from itself looking for that filename, so no path
   configuration is needed. Environment variables (`AUTH_DB_*`, `APP_SECRET`,
   `ANALYTICS_KEY`, `SMTP_*`, `GOOGLE_CLIENT_ID`) still work as an override on
   hosts that support them.

   **Verify:** `https://egybi.com/auth/auth.php?action=health` should report
   `"durable": true`. If it says `false`, the file is one level too deep.

4. **Email.** Set `smtp_host` / `smtp_port` / `smtp_user` / `smtp_pass` /
   `mail_from` in that same `egybi-config.php`. `mailer.php` is a
   dependency-free SMTP client (no Composer) that sends the branded verify and
   password-reset mail through Hostinger. Create `no-reply@egybi.com` as a free
   **alias** on the `hello@egybi.com` mailbox (hPanel → Emails). Leave the
   `smtp_*` values blank to keep links **logged** rather than sent (fine before
   launch — signup and reset still succeed). Use port `587` if `465` is blocked.

5. **Payments stay OFF.** `payments.php` is inert unless `PAY_ENABLED=1` **and**
   `PAY_WEBHOOK_SECRET` are set — no payment code runs and no plan can change
   until you deliberately enable a Paddle/LemonSqueezy integration. To turn a
   **paid tier** on later: insert `pro` rows into `entitlements` for the gated
   features, add the provider webhook (set `users.plan='pro'` on subscribe), and
   flip `PAY_ENABLED`. Nothing else needs rebuilding.

**What it verifies as safe:** Argon2id password hashing (auto‑fallback to bcrypt
on hosts without Argon2), PDO prepared statements
everywhere, HttpOnly+Secure+SameSite session cookies, a CSRF token required on
every state-changing write, per-user data scoping, rate limiting on
signup/login/reset, honeypot, and generic replies that never reveal whether an
email exists. Anonymous visitors keep solving with `localStorage` untouched.

---

## Security notes (already handled)

- The API is **read-only** — it only ever runs `SELECT`s, and dataset names are validated
  against a fixed whitelist, so no user input can reach the SQL as an identifier.
- The only two writers are the **newsletter** and **community** endpoints: both validate
  input, store it JSON-encoded (injection-safe) under a file lock in a web-inaccessible
  `_private/` folder, and are honeypot-guarded (see Steps 7 &amp; 10). Community is
  moderation-first — it serves back only approved entries.
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
php -d extension=pdo_sqlite -d extension=sqlite3 -S 127.0.0.1:8189 site/api/index.php
# then open http://127.0.0.1:8189/health   (60+ datasets; try /charts/businessmen)
```

> `build_test_db.py` runs `schema_sqlite.sql` → `seed.sql` → `seed_v2.sql` → … →
> `seed_v8.sql` in order, then a `PRAGMA foreign_key_check`. Latest build: **58 tables,
> 837 rows, zero FK violations.**

> To test the newsletter endpoint locally, run the PHP server from `backend/` and POST to
> `/api/newsletter.php` (e.g. `curl -d "email=you@example.com" http://127.0.0.1:8189/api/newsletter.php`).
