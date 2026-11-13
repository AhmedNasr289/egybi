# Improvement Plan, November 2026

Written 2026-11-13 after a full audit of the live site, the pipelines and the last 14 days of GitHub Actions runs. Items are ranked by impact on readers first, then by risk if left alone. Every figure was measured on 2026-11-13. The **Evidence** line says how, so it can be re-run.

## What the audit measured

- **Live pages.** All 55 pages in the live sitemap return HTTP 200. Each has a title, a meta description, a viewport tag, exactly one `<h1>` and a canonical URL. HTML fetch time averages 1.6 s from Cairo; the slowest is `visit/karnak.html` at 4.5 s.
  - Pages outside the sitemap: `account.html` (noindex), `404.html` (noindex), and `practice.html` / `tracks.html` (301 redirects).
  - An unknown URL returns 404.
  - Method: `curl` over every `<loc>` in `https://egybi.com/sitemap.xml`.
- **Links.** 135 distinct internal links and assets were checked with HEAD requests, and none is broken. Two apparent 404s were JavaScript template strings (`'+p.id+'`), not real links.
- **Browser checks.** The last full sweep ran on 2026-11-11 (run 43024222220) and passed:
  - 182 pages and 8,022 internal file links;
  - 31 pages at phone width with 0 clipped off-screen;
  - lowest contrast 4.55:1, 0 unreachable tap targets, 0 reduced-motion faults;
  - SEO clean on 182 pages;
  - all sign-in, save and newsletter flow checks PASS.
- **Caching.** HTML and data are brotli-compressed and served `no-cache, must-revalidate`. Versioned assets are `max-age=604800, immutable`. All are served through Hostinger's CDN (`server: hcdn`).
- **Accounts security.** Read in `site/auth/lib.php` and `auth.php`; headers read live.
  - Session cookie is `HttpOnly`, `Secure` and `SameSite=Lax`.
  - A CSRF token is required on every signed-in write, and cross-site POSTs to login and signup are refused.
  - Passwords are hashed with Argon2id, falling back to bcrypt.
  - Rate limits: signup 8/h, login 10 per 15 min per IP plus 8/h per account, reset 6/h, delete 5/h.
  - HSTS, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and a CSP `frame-ancestors` are live.
  - The health endpoint's detail is key-gated (`{"ok":true}` without the key).
- **Actions minutes.** The minutes guard's own tally for November: **3,090 minutes** from 298 billed jobs, 1–12 Nov. That is 154.5% of a private repo's 2,000. Of it, Verify (browser) is 2,482 and the street job 404.
  - Verify (browser) wall time by day: 11-06: 1,340 min (44 runs); 11-09: 552 (23); 11-11: 42 (2).
  - Since the gate (PR #89) landed, a merge whose tree equals its tested PR skips the sweep: run 43030660444's browser job was `skipped`.

## Ranked items

### 1. The daily price and exchange-rate refreshes start 6 to 9 hours late
- **Evidence:**
  - GitHub's scheduler started `refresh-prices.yml` (cron 07:17 UTC) at 15:59 on 11-12, 15:16 on 11-11, 15:37 on 11-10 and 17:34 on 11-09.
  - It started the minutes guard (cron 06:23) at 15:21 on 11-12 and the catch-up (cron 16:17) at 22:17.
  - So readers see yesterday's prices and rate until late afternoon Cairo time, and the catch-up that is meant to rescue a missed day is late too.
  - Measured with `gh run list --workflow <file> --limit 4`.
- **Fix:**
  - `backend/ops/dispatch_daily.php` is run by a Hostinger cron job. It asks GitHub whether each daily workflow has started today and starts it if not, using the same rule as `backend/ops/refresh_catchup.py`.
  - The GitHub cron stays as the backup, so a day can never run twice: whichever trigger comes first wins, and the other sees "already started today".
  - The token is a fine-grained GitHub token limited to this repo with *Actions: read and write* only. It is kept in `egybi-config.php` above `public_html`, so it never enters the repo.
  - The script refuses to run from a web request, and `backend/` is already blocked by the root `.htaccess`.
- **Service:** Hostinger cron (hPanel → Advanced → Cron Jobs). It is already paid for, runs on time, and needs no new account. AWS (EventBridge Scheduler plus Lambda) would also be free, but it adds a second cloud, a second credential store and a budget alert to watch, for no extra benefit here.
- **Free limit:** included in the Hostinger plan. Each GitHub workflow_dispatch is one API call (5,000/hour allowed). The refreshes themselves cost what they cost today, about 2 minutes a day.
- **Prove:** after the cron is added, `gh run list --workflow refresh-prices.yml --limit 1` shows a `workflow_dispatch` run created within 10 minutes of the cron time, and `https://egybi.com/data/prices-today.json` carries today's `as_of` before 09:00 UTC.
- **Rollback:** delete the cron job in hPanel. The GitHub schedule and the catch-up keep working exactly as now.
- **Needs you (web console):** create the token, paste it into `egybi-config.php`, and add the cron job. The steps are in the PR.

### 2. Two districts on the street access layer are carried over
- **Evidence:** the access-only run 43393442846 (13 Nov, 35 min) measured 8 of 10 districts. 10th of Ramadan City (kept from 2026-11-09) and New Alamein (kept from 2026-08-07) were carried because Overpass returned `ResponseStatusCodeError`. All three public Overpass servers failed the preflight that morning (HTTP 504, timeout, HTTP 504).
- **Fix:** a `districts` input on the street workflow, passed as `STREETS_DISTRICTS`, rebuilds only the named districts and keeps every other row. A re-run then asks Overpass for 2 districts instead of 10, which is kinder to a shared free service and about five times faster. The one-time re-run already scheduled for 18:30 UTC today may close this on its own.
- **Service:** GitHub Actions; the code lives there already.
- **Free limit:** a 2-district run is about 7 minutes, against the 2,000-minute budget once private (unlimited while public).
- **Prove:** a run with `layers=access`, `districts=10th-ramadan,new-alamein` logs only those two districts. Afterwards `site/data/streets-access.json` shows today's `measured_on` for them, and the other 8 rows are unchanged (sha-compare those rows).
- **Rollback:** leave the input empty; the job behaves exactly as now.

### 3. Going private again needs a minute budget that fits 2,000
- **Evidence:** November is already at 3,090 minutes (item list above), so switching before 1 December would stop every job, the daily refreshes included, until the month resets. A December projection from measured per-run costs:

  | Workflow | Assumption | Minutes |
  |---|---|---|
  | Verify (browser), PR sweeps | 6 page-changing PRs × 2 pushes × 41 min | 492 |
  | Verify (browser), weekly full sweep | 4 Mondays × 41 min | 164 |
  | Verify (browser), merge gate | 12 merges × 1 min (sweep skipped, tree equals tested head) | 12 |
  | Conflict markers | ~157 runs × 1 min (68 in 13 days) | 157 |
  | Test (pipeline) | ~130 runs × 1 min (56 in 13 days, 57 min) | 130 |
  | Daily prices + FX | 25 min in 12 days → per month | 63 |
  | Rebuild static pages, minutes guard, catch-up, data, geo | measured rates scaled to 30 days | 100 |
  | Street job | worst case: 2 runs at the 105-min hard limit | 210 |
  | **Total** | | **about 1,330 (66%)** |

- **Fix:** no code change is needed now; the gate and the weekly sweep already hold Verify (browser) down. The things to do are:
  - wait until 1 December;
  - add a GitHub budget alert;
  - keep the daily minutes guard, which already opens issues at 70% and 90%.
- **Service:** GitHub.
- **Free limit:** 2,000 minutes/month on the Free plan. With no payment method on file the spending limit is $0, so GitHub stops jobs rather than charging.
- **Prove:** on 2 December, the minutes guard's summary in the run log shows under 70% for the month so far, and `gh repo view --json visibility` shows `PRIVATE`.
- **Rollback:** make the repo public again (Settings → General → Danger zone). Minutes are free again at once.
- **Needs you (web console):** on or after 1 December, Settings → General → Change visibility. Before that, GitHub → Settings → Billing → Budgets and alerts → add an Actions budget alert.

### 4. Accounts: confirm the secret that hashes IPs is not a default
- **Evidence:** `auth_cfg()` falls back to the literal `dev-only-insecure-secret-change-me` when `egybi-config.php` has no `app_secret`, and the sample config ships the placeholder `PASTE_A_LONG_RANDOM_STRING_HERE`. Nothing reports which one the live site uses. The secret salts the IP hashes behind rate limiting and the account bucket, so a known value makes those hashes reversible by brute force. Everything else in security already holds (see the audit above).
- **Fix:** the key-gated health check reports `app_secret_ok`: true only when the secret is set, is neither of those two strings, and is at least 32 characters. It reports only true or false, never the value.
- **Service:** Hostinger (PHP), no new resource.
- **Free limit:** none needed.
- **Prove:** the CI auth flow still passes. Then you open the keyed health URL yourself and see `"app_secret_ok": true`. If it says false, put a long random string in `egybi-config.php`. That signs nobody out: sessions are stored server-side and do not depend on it.
- **Rollback:** revert the PR; the field disappears.

### 5. Freshness alerts already exist, but every one depends on GitHub's late scheduler
- **Evidence:**
  - The price and FX jobs fail with an alert issue when their source is stale (`refresh-prices.yml` line 53, `refresh-fx.yml` line 50).
  - The catch-up starts a missed refresh, and failures open issues through `notify-failure`.
  - All of these run on GitHub's scheduler, which item 1 measured at 6–9 hours late.
- **Fix:** item 1 closes most of it, because the on-time trigger means the stale guard fires in the morning. No separate change.
- **Service:** Hostinger cron (item 1).
- **Free limit:** as item 1.
- **Prove:** as item 1.
- **Rollback:** as item 1.

### 6. Performance, accessibility and SEO: no defect found
- **Evidence:** see the audit above (55/55 pages 200 with full SEO tags; 0 clipped at phone width; contrast ≥ 4.55:1; immutable cached assets). The weekly full sweep is scheduled for Mondays 03:41 UTC but has not run yet, because it was added after Monday 9 November's slot.
- **Fix:** none. Check that the first weekly sweep actually runs on Monday 16 November.
- **Service:** GitHub Actions.
- **Free limit:** 41 min/week, already in the item 3 budget.
- **Prove:** `gh run list --workflow verify-browser.yml --event schedule --limit 1` shows a run on 2026-11-16.
- **Rollback:** not applicable.

### 7. Old failure-alert issues that are now resolved
- **Evidence:** the latest run on main of each workflow behind them is green:
  - #75 Verify (browser): success 11-11;
  - #72 Test (pipeline): green on PR #108;
  - #56 daily prices: success 11-12;
  - #52 Atlas geo layers: success 11-03;
  - #42 Egypt data: success 11-09.
  - #92 (streets) is only partly resolved: see item 2.
- **Fix:** you close #75, #72, #56, #52 and #42. Close #92 after item 2.
- **Service:** GitHub.
- **Free limit:** none.
- **Prove:** `gh issue list --state open` no longer lists them.
- **Rollback:** reopen the issue.

### 8. Newsletter send reminders #55, #57, #60
- **Evidence:** three monthly "Send The Papyrus" reminders are open (September, October, November).
- **Fix:** decide whether each issue was sent. Nothing is sent without your yes on the exact text.
- **Service:** none.
- **Free limit:** none.
- **Prove:** the issues are closed by you.
- **Rollback:** not applicable.

### 9. Personal AWS account: not used
- **Evidence:** every item above is better served by GitHub or Hostinger, which already run the site.
- **Fix:** none. No AWS resource is created, so no AWS budget alert is needed yet. If AWS is ever used, the first step is a $1 AWS Budgets alert, set up before anything else.
- **Service:** none.
- **Free limit:** none.
- **Prove:** not applicable.
- **Rollback:** not applicable.
