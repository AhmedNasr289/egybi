# Automation & CI Pipelines

> The one place that lists **every automated job** on EgyBI: what runs, when, what it writes, and how it fails safely. Verified against `.github/workflows/` and `backend/pipeline/` on **2026-07-21**. Back to [[Home]]. Related: [[Daily Prices Page & Pipeline]], [[Stock Market Page & EGX Data]], [[Challenge Engine & Data Pipeline]], [[Phase 2 — SaaS & Accounts]].

**How deploy works:** every push to `main` triggers Hostinger's auto-deploy (independent of GitHub Actions — the `[skip ci]` in bot commits only skips *Actions*, not the Hostinger deploy). So a data-refresh commit publishes to egybi.com automatically. Data pipelines run **on GitHub runners** because the dev sandbox can't reach the source (gov/vendor) APIs.

## The ten GitHub Actions

| Workflow | Trigger (UTC) | Runs → writes | Guardrail / failure behavior | Status |
|---|---|---|---|---|
| **refresh-prices.yml** | daily `17 7 * * *` (~09:17 Cairo) + manual | `fetch_prices.py` → `site/data/prices-today.json`, `prices-history.json` | `fetch_prices.py` aborts on unreachable API or `<40` retail items → keeps last-good; commit only if changed; push retries 3× with rebase | ✅ Healthy |
| **refresh-fx.yml** | daily `23 7 * * *` (~09:23 Cairo) + manual | `fetch_fx.py` → `site/data/fx-today.json`, `fx-history.json` | aborts on unreachable API or `<5` currencies → last-good; commit-if-changed; push retries 3× | ✅ Healthy |
| **refresh-data.yml** | weekly `41 3 * * 1` (Mondays) + manual | `fetch_worldbank.py` → `backend/sql/seed_auto.sql` + rebuilt `egybi_kb.sqlite` | 3-layer: change-detect → refuse if `<20` INSERTs → rebuild+verify DB (`build_test_db.py` exits non-zero on any FK/SQL error) → *then* commit; push retries 3× | ✅ Healthy |
| **build-pages.yml** | on push to `main` + manual | `build_static_pages.py` → 123 challenge + 12 story pages, `sitemap.xml`, `feed.xml` | reads committed data only (no external fetch); job fails → no commit; commit tagged `[skip ci]`; push retries 3× | ✅ Healthy |
| **send-newsletter.yml** | **manual only** (`workflow_dispatch`, inputs: slug + dry/live) | `curl` → `api/send_issue.php` | **dry-run by default**; `ANALYTICS_KEY`-gated (`hash_equals`); idempotent send-log keyed `(issue_id,email)` → never double-mails; loops batches until `remaining=0` | ✅ Healthy |
| **probe-idsc.yml** | **manual only** | `probe_idsc_endpoints.py` (read-only) | writes/commits nothing; a utility to re-check IDSC for newly-populated categories | ✅ Healthy (utility) |
| **refresh-streets.yml** | **manual only** (`workflow_dispatch`, input: planner_notes yes/no) | `fetch_streets.py` → `streets-districts.json`, `streets-boundaries.json`, `streets-access.json`; optional `build_planner_notes.py` → `streets-notes.json` | per-layer abort-and-keep-last-good; thin-graph floors (150 nodes/300 edges) and a 4-district minimum; area sanity-check on every geocoded boundary; non-zero exit on any skip with the commit step under `if: '!cancelled()'`; **not stdlib-only** — osmnx/scipy/networkx pinned in `backend/pipeline/requirements-streets.txt`, pip cached against it | ⚠️ Runs 1–3 exposed three bugs (below); fixed, full re-run pending |
| **probe-geocodes.yml** | **manual only** | `probe_geocodes.py` (read-only) | writes/commits nothing; geocodes candidate district names alone (seconds, no Overpass graph downloads) and prints each result's area, class/type and display_name, so a failed district geocode is fixed from evidence instead of a 20-minute pipeline run per guess | ✅ Healthy (utility) |
| **papyrus-reminder.yml** | monthly `0 8 1 * *` (1st) + manual | github-script → opens a GitHub issue naming this month's issue slug + send steps | repo-backed backup for the external send-reminder; never sends; deduped per month | ✅ Healthy |
| **build-geo-assets.yml** | **manual only** (`workflow_dispatch`) | `fetch_geo_layers.py` → `site/data/geo-health.json`, `geo-schools.json`, `geo-heritage.json` | **per-layer** abort-and-keep-last-good: Overpass retried 3× then that layer skipped; thin floors (<400 facilities / <700 schools / <6 heritage sites, calibrated against the first real run) skip the layer; any skip exits non-zero → run shows red, but the commit step is `if: '!cancelled()'` so layers that *did* build are still saved; push retries 3× | ⚠️ Run 1 red (heritage parse); fixed, re-run pending |

## What the first three street runs taught (2026-08-07)

Three bugs, none of them in the measurement code, all worth remembering because each generalises:

1. **`cache: pip` needs something to hash.** Run 1 died in **8 seconds** — before pip, before Overpass — on `No file … matched to [**/requirements.txt or **/pyproject.toml]`. `actions/setup-python`'s pip cache globs for a dependency file, and every other pipeline here is stdlib-only so the repo had none. It is a hard error, not a warning. Fixed by putting the pins in `requirements-streets.txt` and pointing `cache-dependency-path` at it — which also means the versions the cache is keyed on *are* the versions installed, by construction.
2. **A `workflow_dispatch`-only job cannot assume it is on `main`.** The commit step ended `git pull --rebase origin main` + bare `git push`. Correct for every cron-or-push pipeline here; wrong for the one workflow that can be aimed at any ref, where rebasing a feature branch onto main rewrites its history and the push is rejected as a non-fast-forward — discarding a finished 20-minute download at the last step. Now rebases against `GITHUB_REF_NAME` and pushes explicitly to it.
3. **A publication floor is not a completeness check.** Run 3 succeeded while dropping 2 of 6 districts, because `MIN_DISTRICTS_OK=4` was met *exactly*. See [[Cairo Street Report Card]] — this is the one with teeth, because the other two failed loudly and this one shipped green.

The through-line: **the failure that matters is the one that looks like success.** Runs 1 and 2 were red and self-announcing. Run 3 was green, committed data, and quietly lost the reference district the whole comparison depends on.

## Outside the repo (documented here so it isn't lost)
- **Monthly newsletter send-reminder** — a Claude-Code-Remote scheduled trigger **`trig_018YA7TYh5jKXRzQNWoNcV9r`**, cron `0 7 1 * *` (1st of month, 07:00 UTC), push+email, fires a **fresh session**. It reads `site/newsletter/issues/`, finds the current month's slug, and nudges Ahmed with the exact send steps. It **never sends** — the human runs `send-newsletter`. Single point of failure: if the trigger is deleted/disabled, issues silently stop going out.
- **Secrets:** `ANALYTICS_KEY` (GitHub Actions secret) = the server's `egybi-config.php` `analytics_key`; gates `send_issue.php` and `insights.php`. See [[Security Posture & Audit Log]] / [[Phase 2 — SaaS & Accounts]].

## Honest gaps (flagged, not silently "fixed" — Ahmed's call)
1. **Silent failure notification — ✅ ADDRESSED (2026-07-21).** The four unattended workflows (refresh-prices/fx/data, build-pages) now end with an `if: failure()` step that runs the **`.github/actions/notify-failure`** composite action: it opens a GitHub issue titled `⚠️ CI failure: <workflow>` (or comments on the existing open one, so a recurring failure doesn't spam) using the built-in `GITHUB_TOKEN` — no external secret. Requires `issues: write`, which was added to each. Watching the repo = failure emails. (Manual workflows are excluded by design — you see them run live.)
2. **Source-outage = stale data — ✅ ADDRESSED (2026-07-22).** Two paths now alert: an *unreachable* API makes the fetch exit non-zero → the failure alert fires; and a *frozen* source (returns 200 but stops advancing its date) is caught by a new **staleness guard** step in refresh-prices/fx that fails (→ alert) if the newest `as_of` is >5 days old (a threshold that tolerates weekends + a holiday). Data itself is still never overwritten with bad values — the guard only raises a flag.
3. **Monthly reminder was external-only — ✅ ADDRESSED (2026-07-22).** Added **`papyrus-reminder.yml`**, an in-repo monthly Action that opens a GitHub-issue reminder with this month's slug + send steps. The reminder is now version-controlled and survives even if the external Claude-Code-Remote trigger (`trig_018YA7TYh5jKXRzQNWoNcV9r`) is deleted. Both now fire on the 1st (different channels — issue vs push/email); the external one is now a redundant convenience you may keep or delete.

## What is *not* automated (by design)
- **Newsletter sending** stays manual — a deliberate FRA/consent choice; the reminder automates only the nudge, not the send.
- **The deferred EGX EOD dataset** (`fetch_stocks.py`) isn't built — gated on confirming a free vendor covers EGX. See [[Stock Market Page & EGX Data]].

## Schedules, as of 2026-08-08

Every workflow is bounded, every one that commits carries the same six guards
(bound, concurrency group, push to the dispatched ref, rebase, retry, alert),
and the question that mattered was not "does it have guardrails" but "does
anything refresh this page's figures".

| Workflow | Trigger | Bound | Why that cadence |
|---|---|---|---|
| `refresh-prices` | daily 07:17 UTC | 25 m | Prices move daily. |
| `refresh-fx` | daily 07:23 UTC | 15 m | Rates move daily. |
| `refresh-data` | weekly, Mon 03:41 | 30 m | World Bank indicators publish on a slow cycle. |
| `build-geo-assets` | **monthly, 3rd 04:31** | 45 m | OpenStreetMap changes every day, and UNESCO inscribes new sites each summer. Was manual-only; a layer built once and never refetched drifts from its own as-of date while still printing it. |
| `refresh-streets` | **quarterly, 5th of Jan/Apr/Jul/Oct** | 120 m | Same source, far heavier job — drive and walk graphs for ten districts. Monthly would spend real Actions minutes to move figures that shift slowly at district scale. |
| `build-visit-layers` | **manual, deliberately** | 30 m | SRTM was flown in February 2000 and is finished. POWER's normals average a closed 2001–2020 window declared as constants in this repo. WMO station normals move on a decadal timescale. A cron would re-download the same bytes forever and put a standing load on two free public services for nothing. |
| `build-pages` | manual + push | 15 m | Pure generation from files already in the repo. |
| `send-newsletter`, `papyrus-reminder` | manual / monthly | 10 m | Both now alert on failure: a send that silently does not happen looks exactly like a quiet week. |
| `probe-geocodes`, `probe-idsc` | manual | 15 m | Diagnostics a human runs and watches; no alert on purpose. |
| `verify-browser` | **push to `main` + PR** | 35 m | Every push to `main` is a live Hostinger deploy, so this is the only thing standing between an edit and readers. Runs the whole `backend/verify/` suite in Chromium — seventeen steps, all `if: always()` so one finding cannot hide three others. |

Cron minutes are deliberately odd and days deliberately avoid the 1st: GitHub's
shared scheduler is contended on the hour and at month boundaries, and a skipped
run is a silent one.

## An alert that cannot say what broke is barely an alert (2026-08-16)

`Verify (browser)` was red for fourteen runs and every one of its alerts said
only "the workflow failed" — while `if: always()` on seventeen steps meant
GitHub's own run summary did not name the failing one either. The diagnosis was
in a log somebody had to go and open, and nobody did, for three days.

Every checker now runs through **`backend/verify/ci-step.sh`**: it tees the
checker's output into `$VERIFY_LOG_DIR` and appends the checker's name to a
`FAILED` file if it exits non-zero. A collect step lifts the tail of each failing
log into `reason:` for `notify-failure`, which already took that input — it was
added on 2026-08-10 for exactly this and the new workflow was written without it.
`set -o pipefail` lives inside that script because the exit status of
`cmd | tee` is tee's, which is always 0; without it every failing checker turns
the run green, and this repo has demonstrated that in both directions.

**`workflow-audit.py` is now a step in it, and now exits non-zero.** It reads the
whole fleet at once — triggers, path filters, timeouts, concurrency, push-back,
alerting — which is the only reading that can catch a trigger narrower than the
inputs its generator reads. For days it printed real findings and exited 0, and
ran in no workflow at all: a checker wired into nothing has never run. Its rule
was also too broad, asking failure alerting of every workflow including the two
`workflow_dispatch`-only probes a human presses the button on. Scoped to what can
fire unattended (`schedule`, `push`, `pull_request`), both findings disappear as
the false positives they were. Two findings nobody can act on is how a report
becomes background noise.

