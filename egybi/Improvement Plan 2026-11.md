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

## Round 2 — 15 November 2026

Re-measured on Sunday 15 November 2026, 12:50–13:30 UTC (14:50–15:30 Cairo). Every check below was run that afternoon, and each one comes with a control that shows it can fail. The scripts are throwaway checkers kept outside the repo; the commands in **Evidence** re-measure the same things.

### What round 2 measured

- **Live pages.** All 55 sitemap pages return 200, and all 55 send HSTS, `X-Frame-Options`, `Referrer-Policy` and a CSP. A made-up page returns 404 with the "Page not found" page. `http://` redirects to `https://` with a 301.
- **Links.** 133 distinct internal links and assets: 0 broken. A planted bad asset was reported, so a broken link would show. 27 distinct outbound links checked:
  - none is dead;
  - `egx.com.eg` resets a script but answers 200 to a browser user agent;
  - `metmuseum.org` and `aboutads.info` answer 429, which is bot rate-limiting, so they could not be confirmed from a script;
  - the two Google Fonts hosts answer 404 at their root, which is expected for `preconnect` hints.
- **Blocked folders.** `backend/ops/dispatch_daily.php`, `backend/pipeline/fetch_streets.py`, `egybi/Changelog.md` and this plan all return 404 from the web; `sitemap.xml` still returns 200.
- **Accounts, signed out.**
  - `health` gives `{"ok":true}`.
  - `me` gives no user.
  - `progress.php` gives 401.
  - A GET to `login` gives 405.
  - A cross-site POST to `signup` gives 403 "Cross-site request blocked."
- **Data.** The live `prices-today.json`, `fx-today.json` and `streets-access.json` equal `origin/main` by git blob hash. A control confirmed that two different files do not match. All 10 street districts were measured on 13 November, and none is carried.
- **Workflows.** The latest run on main of every workflow that has one succeeded. Test (pipeline) runs only on pull requests, so it has no main run.
- **Local suites.** The CI jobs that need no browser or PHP were run on a fresh clone of main with Linux line endings:
  - conflict markers;
  - pyflakes;
  - unittest (184 tests, 61 subtests);
  - the 61 number-format cases;
  - a determinism rebuild (339 files byte-identical);
  - generated `site/` equal to committed `site/`;
  - static audit, coverage, the orphan, workflow, secret and advice scans, SEO (182 pages) and map completeness.

  All of them pass. A planted broken link made the static audit report it.
- **Actions minutes per day** (minutes guard, `--since`/`--until` per day):

  | 11-08 | 11-09 | 11-10 | 11-11 | 11-12 | 11-13 | 11-14 | 11-15 (to 13:30) |
  |---:|---:|---:|---:|---:|---:|---:|---:|
  | 96 | 626 | 4 | 229 | 177 | 152 | 4 | 0 |

  Days with no PR cost about 4 minutes, and days with PR work cost 150–630. The guard's "month ends near 6,715" is a straight-line projection over the early-November burst. It only changes the wording of its report, because its 70% and 90% issues fire on actual minutes. The December estimate of about 1,330 (round 1, item 3) still stands.

### R1. The daily refreshes still start about 7 hours late (needs you in two consoles)
- **Evidence:**
  - On 14 November prices started at 14:11 UTC and FX at 14:16, against crons of 07:17 and 07:23 UTC. On 15 November nothing had started by 13:30 UTC.
  - The on-time trigger (`backend/ops/dispatch_daily.php`, round 1 item 1) is merged but does nothing until it has a token and a cron job.
  - Re-measure: `gh run list --workflow refresh-prices.yml --limit 3`.
- **Fix:** three console steps, all yours, because they involve a secret:
  1. **GitHub:** your avatar → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
     - Repository access: Only select repositories → egybi.
     - Permissions → Repository permissions → Actions: Read and write. Nothing else.
     - Expiry: up to one year.
  2. **Hostinger:** hPanel → Files → File Manager. Open the folder that contains `public_html` (where `egybi-config.php` already lives), edit `egybi-config.php`, and add the line `'github_dispatch_token' => '…',` before the closing `];`.
  3. **Hostinger:** hPanel → Advanced → Cron Jobs.
     - First, a one-off test with `--dry-run` on the end, then read its output under "View output".
     - Then add the daily job at 07:20 UTC (hPanel shows server time, so check its clock line and convert): `php /home/<your user>/domains/egybi.com/public_html/backend/ops/dispatch_daily.php`. Your user name is in hPanel's File Manager path.
- **Service:** Hostinger cron (already paid for) and one GitHub API call a day per workflow.
- **Free limit:** included in the plan. GitHub allows 5,000 API calls an hour; this uses 4 a day.
- **Prove:** the next morning, `gh run list --workflow refresh-prices.yml --limit 1` shows a `workflow_dispatch` run created within 10 minutes of the cron time.
- **Rollback:** delete the cron job. The GitHub schedule and the catch-up keep working as now.

### R2. Whether the live IP-hash secret is real is still unconfirmed (needs you)
- **Evidence:** the keyed health check reports `app_secret_ok` (round 1 item 4), but only the analytics key opens it, and that key is yours alone. Re-measure: open the URL below.
- **Fix:** open `https://egybi.com/auth/auth.php?action=health&key=` followed by your analytics key, in your own browser. If it shows `"app_secret_ok":false`, edit `egybi-config.php` (as in R1 step 2) and set `'app_secret'` to a random string of at least 32 characters. To make one in PowerShell:

  ```powershell
  -join ((48..57) + (97..122) | Get-Random -Count 40 | ForEach-Object { [char]$_ })
  ```

  Changing it signs nobody out, because sessions are stored server-side.
- **Service:** Hostinger (PHP); no new resource.
- **Free limit:** none needed.
- **Prove:** the same URL shows `"app_secret_ok":true`.
- **Rollback:** put the old value back.

### R3. PR #90 conflicts with main in two files, not the Changelog
- **Evidence:**
  - `git merge-tree --write-tree --name-only origin/main origin/feat/wholesale-story` shows the conflicts are in `backend/verify/shots.js` and `site/egypt-food-prices.html`. `egybi/Changelog.md` merges cleanly.
  - `site/egypt-food-prices.html` is regenerated by every daily price refresh, so it conflicts again each day.
  - The PR's head is `f48cdda`, and its last CI was green.
- **Fix:** on the day you want it merged (planned around 21 November), rebase it onto that day's main. Resolve `shots.js` by hand. Resolve the generated page by rerunning the generators on the merged data rather than editing it: `build_prices_pages.py`, `build_food_prices.py` (which writes `egypt-food-prices.html`), `build_currency_story.py` and `sitemap_lastmod.py`, all in `backend/pipeline/`. Commit only files whose content changed, since line-ending churn is not a change. Then push and let CI run. Rebasing earlier only buys another conflict tomorrow.
- **Service:** GitHub Actions.
- **Free limit:** one PR sweep, about 41 minutes, free while the repo is public.
- **Prove:** `gh pr view 90 --json mergeable` says `MERGEABLE`, and every check on the new head is green.
- **Rollback:** the rebase is on the PR branch only; main is untouched until you say yes.
- **Needs your yes:** the merge.

### R4. Going private on 1 December: add the budget alert now (needs you)
- **Evidence:** the repo is public (`gh repo view --json visibility`). The per-day table above puts a no-PR December at about 4 minutes a day. The read-only check `egybi-go-private-check-20261201` reports on 1 December at 16:00 UTC (18:00 Cairo).
- **Fix:**
  - **Now:** github.com → your avatar → Settings → Billing and licensing → Budgets and alerts → New budget. Choose Actions, set the amount to $0 (or the lowest allowed), and turn on the alerts at 75%, 90% and 100%.
  - **On 1 December, after the check reports:** the repo → Settings → General → Danger zone → Change repository visibility → Make private.
  - The 1 December check now also measures the last seven full days of November and scales them to a month. That rate is the best predictor of December; one day of December alone is not.
- **Service:** GitHub.
- **Free limit:** 2,000 minutes a month on the Free plan. With no payment method on file, GitHub stops jobs rather than charging.
- **Prove:** on 2 December, `gh repo view --json visibility` shows `PRIVATE`, and the minutes guard's run log shows under 70% for the month so far.
- **Rollback:** make it public again; minutes are free at once.

### R5. The first weekly browser sweep has not run yet
- **Evidence:** `gh run list --workflow verify-browser.yml --event schedule --limit 1` returns nothing. The first slot is Monday 16 November, 03:41 UTC (05:41 Cairo). GitHub's late scheduler may start it hours later.
- **Fix:** none now. Check on Monday that it ran and passed. If it did not run at all by Monday evening, look at the workflow's `schedule` trigger.
- **Service:** GitHub Actions.
- **Free limit:** about 41 minutes a week, already in the December estimate.
- **Prove:** the command above shows a run dated 2026-11-16 with conclusion `success`.
- **Rollback:** not applicable.

### R6. No defect found in pages, links, accounts, data or the local suites
- **Evidence:** see "What round 2 measured" above. Every check passed and every check's control failed as it should.
- **Fix:** none. No work is invented here.
- **Service:** none.
- **Free limit:** none.
- **Prove:** re-run the checks in "What round 2 measured".
- **Rollback:** not applicable.

### R7. Newsletter reminders #55, #57 and #60 are still open (needs you)
- **Evidence:** `gh issue list --state open` lists only these three.
- **Fix:** for each, decide whether that issue was sent, then close it. Nothing is sent without your yes on the exact text.
- **Service:** none.
- **Free limit:** none.
- **Prove:** the issues are closed by you.
- **Rollback:** reopen the issue.

## Round 3 — formatting and motion study, 15 November 2026

Measured 15 November, 18:10–18:45 UTC, on main 863fca2 and on the live site. I read `site/assets/egybi.css`, every live page in the sitemap, and the CI screenshots from run 43729813508. I also measured live pages in a browser at 390 px. Two of my first readings were my own instrument's fault, and are corrected below rather than reported as defects.

### What was measured
- **One stylesheet for the whole site:** `egybi.css`, 102 KB and 631 rules. It defines 38 tokens (colours, radius, shadows, the papyrus textures) and uses them 422 times.
- **No type or spacing scale.**

  | Property | Distinct values |
  |---|---:|
  | font-size | 69 (around 20 between 0.68 and 0.98 rem; some written twice, `0.9rem` and `.9rem`) |
  | spacing (margin, padding, gap) | 55 (14, 10, 12, 16, 8, 6, 18, 26, 22, 20, 13, 15… px) |
  | literal colours outside the tokens | 104 (`#fff` 31 times; golds such as `#8a6d14` 4 times) |
  | line-height | 19 |
  | border-radius | 19 |
  | breakpoints | 13 (380, 430, 560, 600, 640, 720, 900, 959, 960, 1024 px…) |

- **Header and footer, after normalising** `../` path depth, `class="active"` and whitespace. The first count said 14 and 12 "variants"; that was the instrument.
  - The header is one design on all 54 English pages, plus the Arabic page (`lang`/`dir` only).
  - The footer is one design. Pages differ only in their **data-source column** (IDSC on prices, EGX on stocks, the Met on About, and so on), which is deliberate.
  - **Organisation does not need rebuilding.**
- **Animation:** three mechanisms.
  - AOS: 333 reveals (324 `fade-up`, 9 `zoom-in`) on 15 pages. It loads on 36 pages (26 KB CSS + 15 KB JS), 5 of which use none of it.
  - Motion One (24 KB) plus EgyBI's `motion.js` (7.5 KB) load on 39 pages. Its reveal hooks (`data-mo`) are used almost nowhere; it mostly drives the gold scroll bar and the count-up figures (`data-count`, on 3 pages).
  - The 30 generated pages (Papyrus stories and visit pages) have no reveals at all.
  - `vendor/tsparticles.bundle.min.js` (170 KB) is loaded by no page.
  - Reduced motion is already handled: AOS is disabled, and a CSS guard forces `[data-aos]` visible.
- **Page weight (HTML, CSS and JS):** median 142 KB. The heaviest are explore (734 KB), places, visit, invest, geospatial, streets (488–513 KB), and plan, home and stories (462–476 KB). 17 pages carry inline `<style>`, and prices / prices-ar carry 10 KB each.

### S1. Content is invisible when JavaScript does not run
- **Evidence:**
  - AOS's own CSS sets `[data-aos^=fade]{opacity:0}` unconditionally and relies on its script to reveal.
  - Measured live, in a frame with scripts blocked: Explore hid **106 blocks (2,557 words)**, About **33 (837)** and Home **32 (764)**. Plan, which has no AOS, hid 0 (the control).
  - The same happens to any reader whose scripts fail, for example after an error earlier in `egybi.js`.
- **Fix:** add a `js` class to `<html>` from a one-line inline script in every page head (generators and hand-written pages). Then add `html:not(.js) [data-aos] { opacity:1 !important; transform:none !important; }`, the same guard reduced motion already has. Content is then hidden only while a script that will reveal it is running.
- **Prove:** a new browser check (`nojs.js`) loads every page that uses `data-aos` with JavaScript disabled, and fails if any `[data-aos]` element has opacity below 0.05. A mutation copy without the guard must fail it.
- **Rollback:** revert the PR.

### S2. One type scale, one spacing scale, fewer one-off colours
- **Evidence:** the table above. Label-sized text alone uses 0.68, 0.70, 0.72, 0.74, 0.76 and 0.78 rem across the stylesheet, so similar labels on different sections differ by a pixel or two. Spacing likewise has 55 distinct values with no shared scale; 13, 14, 15 and 16 px all appear among them.
- **Fix:** add scale tokens to `:root` (proposal below). Map every `font-size`, spacing value, `line-height` and radius in `egybi.css` and the inline styles to the nearest step. Turn repeated literal colours into tokens. Mechanical and reviewable: the PR lists each old value and its new step.
- **Prove:**
  - distinct font sizes fall from 69 to 12 or fewer, spacing values from 55 to 14 or fewer, and literal colours from 104 to 40 or fewer, each re-measured by the same script;
  - contrast stays at or above 4.5:1, and overflow, tap targets and SEO stay green;
  - the 390 and 1280 px screenshots of all 9 shot pages are reviewed side by side.
- **Rollback:** revert. Only `egybi.css`, inline styles and their `?v=` change.
- **Status (2026-11-16):**
  - **Part 1, type, is built (PR #122).** 82 reading sizes became 10 steps, guarded by `type-scale.py`.
  - **Part 2 (spacing, radii, colours) was measured and not built.** It would not change anything a reader sees:
    - **Spacing:** sections are already 72 px on desktop and 52 px on a phone. Cards and sheets already pad 26 px. The hero is the same 64/44 px on 160 pages. The remaining 36 px values are 1–2 px differences inside components.
    - **Radii:** 19 values; the visible ones already use `--radius`.
    - **Colours:** 81 literal colours, 70 of them used once, each a deliberate alpha on a brand colour.

    Mapping them onto a grid would touch hundreds of lines for no visible change, and each line is a regression risk. Revisit only if a screenshot shows uneven spacing.

### S3. The visit pages' climate tables need a sideways swipe on phones
- **Evidence:** measured on 3 of the 18 visit pages (Giza, Karnak, Abu Simbel), identically; all 18 come from the same generator. At 390 px, "Heat and rain, month by month" is a 406 px table in a box of about 342 px, and the sun-times table is 383 px. The last column header shows as "R" and "MM/" until the reader finds the swipe. The box scrolls (`.fp-wrap`, overflow-x auto), so no data is lost, but it reads badly.
  - Re-measured on Giza while building the fix, inside the live page's `.sheet`: the box is **289 px**, the climate table needs 392 px, and the sun-times table 369 px. The earlier 342 px box figure did not account for the sheet's padding.
- **Fix (as built in PR #120):** at 430 px and below, in `pages/visit.py` and the CSS:
  - three-letter months, with the full name kept for screen readers;
  - cells at 4 px a side and text at 0.86 rem;
  - headers without capitals or letter-spacing, so they wrap at spaces.

  All 5 columns then fit at 360 px (a 263 px box). Breaking words anywhere was tried and rejected, because it split headers mid-word ("AFTERN OON").
- **Prove:** `visit-tables.js` fails if any visit-page table is wider than its wrapper at 360, 375 or 390 px. Mutation copies without the compact rule, or without the class, must fail it (cases 13f and 13g).
- **Rollback:** revert.

### S4. One motion system, applied the same way everywhere
- **Evidence:** the three mechanisms above. Reveals exist on 15 of 55 pages, none on the 30 generated pages. AOS is loaded on 5 pages that use none of it, and the Motion reveal hooks are unused.
- **Fix:**
  1. Stop loading AOS where no element uses it. This is pure weight, with no visual change.
  2. Make `motion.js`'s IntersectionObserver reveal the one system. It already honours reduced motion and animates only opacity and transform. It gets the S1 rule: hide only after JavaScript adds its class.
  3. Have the generators mark the section-level blocks on stories and visit pages.
  4. Move the AOS pages over, then stop shipping AOS.

  Count-up and chart reveals stay where the figures already are.
- **Prove:**
  - `reduced.js` stays green, and `nojs.js` from S1 stays green;
  - a new check fails if any animated element changes layout size (only opacity and transform may animate);
  - the shots show the same final layout.
- **Rollback:** revert. AOS stays in `vendor/`.
- **Status (2026-11-16): part 1 is built (PR stacked on #122).**
  - **What it removes:**
    - Motion One from 18 pages, because `motion.js` falls back to IntersectionObserver;
    - AOS from 5 pages that use none of it;
    - AOS's script from the prices pages, which had no AOS stylesheet;
    - `motion.js`'s magnetic buttons, which moved the target under the cursor.
  - **Guard:** `motion-weight.py`.
  - **Also measured:**
    - `stocks.html` carries 31 `data-aos` marks but loads no AOS, so they are inert; nothing is hidden;
    - `vendor/tsparticles.bundle.min.js` (170 KB) is loaded by no page, so the home page's `#hero-particles` is always empty. The file is kept; it costs a reader nothing.
  - **Parts 2–4** (one reveal system, generators marking sections, retiring AOS) remain.

### S5. Small findings, no change planned now
- **Clipped extra width:** on prices, the currency story and visit pages the page body measures 455–491 px at 390 px. No element is wider than the screen, and `html, body { overflow-x: clip }` stops any sideways scroll. That is why those CI screenshots are wider than 390. Look again only if a phone shows sideways wobble.
- **Inline styles:** 17 pages carry `<style>` (10 KB on each prices page). Moving them into `egybi.css` would let the browser cache them once. Do it during S2, page by page.
- **Navigation, header and footer:** consistent (see "What was measured"). No change.

### Proposal (waits for Ahmed's yes)
- **Type scale** (16 px base, about ×1.2):

  | Token | Size | Used for |
  |---|---|---|
  | `--fs-xs` | 0.75 rem (12 px) | captions, eyebrows, fine print; nothing smaller anywhere |
  | `--fs-sm` | 0.875 rem | meta, labels |
  | `--fs-base` | 1 rem | body |
  | `--fs-md` | 1.125 rem | lead paragraphs |
  | `--fs-lg` | 1.375 rem | h3 |
  | `--fs-xl` | 1.75 rem | h2 |
  | `--fs-2xl` | clamp(1.75 rem, 1.2 rem + 2.4 vw, 2.5 rem) | h1 |
  | `--fs-3xl` | clamp(2.1 rem, 1.4 rem + 3.5 vw, 3.25 rem) | hero |

  Line heights: `--lh-tight` 1.15 (Cinzel headings), `--lh-snug` 1.35, `--lh-body` 1.6.
- **Spacing** (4 px base): `--sp-1` 4, `--sp-2` 8, `--sp-3` 12, `--sp-4` 16, `--sp-5` 24, `--sp-6` 32, `--sp-7` 48 and `--sp-8` 64 px. Section rhythm is `--sp-7` between sections and `--sp-5` inside cards.
- **Radii:** `--r-sm` 6 px, `--r-md` 10 px, `--radius` 14 px (kept) and `--r-pill` 999 px.
- **Breakpoints, by convention:** 430, 720 and 960 px.
- **Colours:** the 38 tokens stay. Repeated literals become tokens, for example `--gold-deep` #8a6d14.
- **Motion rules:**
  - hover and focus 150 ms; card lift 250 ms; section reveal 600 ms, a 12 px rise plus fade, once per element, staggered 60 ms across at most 6 children;
  - count-up 900 ms, with the final number already in the HTML;
  - chart draw 600 ms;
  - easing `cubic-bezier(.22,1,.36,1)`;
  - only opacity and transform move;
  - never animated: body text after first view, tables, maps, form fields and navigation;
  - everything is off under reduced motion, and everything is visible without JavaScript.
- **Before and after:**
  1. **Giza on a phone:** the climate table needs a swipe and shows "R… MM/". After: all five columns visible at 390 px, and at 360 px too (PR #120).
  2. **Labels everywhere:** the six slightly different label sizes, from 0.68 to 0.78 rem, become one 12 px eyebrow style, with even spacing between sections.
  3. **A Papyrus story:** no movement today. After: sections rise into view once, as on the home page, and with JavaScript off or reduced motion everything is simply there. Explore with scripts blocked goes from 106 invisible cards to all of them visible.
- **PR order:** S1, then S3, then S2 (tokens, then mapping), then S4. Each PR is small, with its own browser check and a mutation-proven test.
