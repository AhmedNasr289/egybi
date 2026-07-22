# Automation & CI Pipelines

> The one place that lists **every automated job** on EgyBI: what runs, when, what it writes, and how it fails safely. Verified against `.github/workflows/` and `backend/pipeline/` on **2026-07-21**. Back to [[Home]]. Related: [[Daily Prices Page & Pipeline]], [[Stock Market Page & EGX Data]], [[Challenge Engine & Data Pipeline]], [[Phase 2 — SaaS & Accounts]].

**How deploy works:** every push to `main` triggers Hostinger's auto-deploy (independent of GitHub Actions — the `[skip ci]` in bot commits only skips *Actions*, not the Hostinger deploy). So a data-refresh commit publishes to egybi.com automatically. Data pipelines run **on GitHub runners** because the dev sandbox can't reach the source (gov/vendor) APIs.

## The six GitHub Actions

| Workflow | Trigger (UTC) | Runs → writes | Guardrail / failure behavior | Status |
|---|---|---|---|---|
| **refresh-prices.yml** | daily `17 7 * * *` (~09:17 Cairo) + manual | `fetch_prices.py` → `site/data/prices-today.json`, `prices-history.json` | `fetch_prices.py` aborts on unreachable API or `<40` retail items → keeps last-good; commit only if changed; push retries 3× with rebase | ✅ Healthy |
| **refresh-fx.yml** | daily `23 7 * * *` (~09:23 Cairo) + manual | `fetch_fx.py` → `site/data/fx-today.json`, `fx-history.json` | aborts on unreachable API or `<5` currencies → last-good; commit-if-changed; push retries 3× | ✅ Healthy |
| **refresh-data.yml** | weekly `41 3 * * 1` (Mondays) + manual | `fetch_worldbank.py` → `backend/sql/seed_auto.sql` + rebuilt `egybi_kb.sqlite` | 3-layer: change-detect → refuse if `<20` INSERTs → rebuild+verify DB (`build_test_db.py` exits non-zero on any FK/SQL error) → *then* commit; push retries 3× | ✅ Healthy |
| **build-pages.yml** | on push to `main` + manual | `build_static_pages.py` → 123 challenge + 12 story pages, `sitemap.xml`, `feed.xml` | reads committed data only (no external fetch); job fails → no commit; commit tagged `[skip ci]`; push retries 3× | ✅ Healthy |
| **send-newsletter.yml** | **manual only** (`workflow_dispatch`, inputs: slug + dry/live) | `curl` → `api/send_issue.php` | **dry-run by default**; `ANALYTICS_KEY`-gated (`hash_equals`); idempotent send-log keyed `(issue_id,email)` → never double-mails; loops batches until `remaining=0` | ✅ Healthy |
| **probe-idsc.yml** | **manual only** | `probe_idsc_endpoints.py` (read-only) | writes/commits nothing; a utility to re-check IDSC for newly-populated categories | ✅ Healthy (utility) |

## Outside the repo (documented here so it isn't lost)
- **Monthly newsletter send-reminder** — a Claude-Code-Remote scheduled trigger **`trig_018YA7TYh5jKXRzQNWoNcV9r`**, cron `0 7 1 * *` (1st of month, 07:00 UTC), push+email, fires a **fresh session**. It reads `site/newsletter/issues/`, finds the current month's slug, and nudges Ahmed with the exact send steps. It **never sends** — the human runs `send-newsletter`. Single point of failure: if the trigger is deleted/disabled, issues silently stop going out.
- **Secrets:** `ANALYTICS_KEY` (GitHub Actions secret) = the server's `egybi-config.php` `analytics_key`; gates `send_issue.php` and `insights.php`. See [[Security Posture & Audit Log]] / [[Phase 2 — SaaS & Accounts]].

## Honest gaps (flagged, not silently "fixed" — Ahmed's call)
1. **Silent failure notification.** A failed run (push fails after 3 retries, or a guard trips) just shows red in the Actions tab. GitHub's default emails the repo owner on workflow failure, so it's *semi*-covered — but there's no dedicated alert channel. Low effort to add (an email/Slack step) if wanted.
2. **Source-outage = stale-but-safe.** If the IDSC or ExchangeRate-API source is down for days, the pipelines keep last-good data (correct — never bad data), but the page silently freezes with no notice. Acceptable by design; worth knowing.
3. **The monthly reminder is a single external trigger** (see above) — the one link in the newsletter chain not backed up in the repo.

## What is *not* automated (by design)
- **Newsletter sending** stays manual — a deliberate FRA/consent choice; the reminder automates only the nudge, not the send.
- **The deferred EGX EOD dataset** (`fetch_stocks.py`) isn't built — gated on confirming a free vendor covers EGX. See [[Stock Market Page & EGX Data]].
