# EgyBI — automated data-refresh pipeline

Keeps the programmatically-sourced parts of the knowledge base current **without
hand-editing**, while preserving the project's non-negotiable rule: every fact is
a real, cited value. Today it covers the World Bank Indicators API; the design
leaves room to add more automatable sources.

## What it does

`fetch_worldbank.py` fetches a curated **allowlist** of World Bank indicators for
Egypt (GDP, GDP per capita, growth, inflation, unemployment, urbanisation, life
expectancy, under-5 mortality, electricity access, internet use, and total
population), transforms each into the project's cited seed-SQL format, and writes
**`backend/sql/seed_auto.sql`**.

Those rows are **pipeline-managed**: `seed_auto.sql` starts with a `DELETE` of
exactly the indicator codes the pipeline owns, then re-inserts fresh values, so:

- re-running is **idempotent** — no duplicate rows;
- it **never touches** the hand-curated rows in `seed.sql` / `seed_v2..v5.sql`
  (which own different indicator codes and every other table);
- every generated row still carries its real `source_url` (the World Bank
  indicator page) and a `note` marking it pipeline-refreshed.

## How to run

```bash
# 1. Preview: fetch live data and DIFF it against the current DB — writes nothing.
python backend/pipeline/fetch_worldbank.py --dry-run

# 2. Commit: fetch live data and write backend/sql/seed_auto.sql
python backend/pipeline/fetch_worldbank.py

# 3. Rebuild + verify the SQLite test DB (build_test_db.py imports seed_auto.sql last):
python backend/test/build_test_db.py

# Offline plumbing test (no network) — uses pipeline/fixtures/*.json, writes a
# clearly-labelled SAMPLE file, never real data:
python backend/pipeline/fetch_worldbank.py --offline
```

`--dry-run` is the **review gate**: it prints every point that is *new*, *changed*,
or *unchanged* versus what's already in `test/egybi_test.sqlite`, so a human can
eyeball the delta before anything lands. Nothing is written until you run without
`--dry-run`.

## Automatable vs. manual — an honest map

| Source | Status | Why |
|---|---|---|
| **World Bank Indicators API** | ✅ Automated (this pipeline) | Clean JSON REST API, CC-BY 4.0, stable indicator codes. |
| Our World in Data | + Automatable next | Public CSV/API per chart; same pattern, add a fetcher. |
| UNESCO UIS (education) | ~ Semi | Bulk data exists but the API is clunky; wrap or download periodically. |
| **CBE (Central Bank)** | ❌ Manual | Site blocks automated scraping; export figures by hand, cite the page. |
| **CAPMAS** | ❌ Manual | Mostly PDF reports / licensed microdata, not bulk-downloadable. |
| **EGX (stock exchange)** | ❌ Manual | No free public API; use periodic snapshots, cite them. |
| Suez Canal Authority | ❌ Manual | Figures come via press releases, not a feed. |
| Qualitative rows (pharaohs, companies, athletes, projects, culture) | ❌ Manual by nature | Curated, cited facts — not a numeric feed. |

So the pipeline owns the **numeric time series** that have a real API; everything
else stays human-curated and cited. That split is deliberate — it maximises
freshness where a clean source exists without ever fabricating a "feed" that
doesn't.

## Scheduling later (not wired yet)

- **GitHub Action** (recommended): a weekly `cron` workflow runs the two commands
  above and opens a PR with the `seed_auto.sql` diff for review — freshness with a
  human in the loop, matching the `--dry-run` gate.
- **Hostinger cron**: the plan supports cron jobs; a weekly job could run the
  fetch and import via the MySQL client. Prefer the PR-review model so a person
  still approves each change (keeps the cited-and-flagged discipline intact).

## Files

- `fetch_worldbank.py` — the fetcher/transformer/emitter (with `--dry-run` / `--offline`).
- `fixtures/*.json` — real-shaped World Bank responses for offline testing / CI.
- `_sample_output.sql` — throwaway output of `--offline` runs (fixtures only; never imported).
