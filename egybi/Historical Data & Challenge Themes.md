# Historical Data & Challenge Themes

> [!warning] **PARTLY SUPERSEDED on 2026-08-07 by the pivot.**
> The exercises this note designs themes for are retired — the 123 challenge pages
> are tombstones now. See [[The Pivot — From SQL Practice to Encyclopaedia]].
>
> The *subject matter* survived the product and is worth keeping: the sourcing
> decisions, the disputed figures, and which Egyptian topics have data solid enough
> to build on all still apply to the charts, maps and stories that replaced the
> exercises. Read the themes as live and the exercise framing as history.

The Egyptian identity ([[Brand & Creative Identity]]) so far lives in the visual/gamification layer. This note takes it deeper: into the actual subject matter of the practice exercises across [[Curriculum & Skill Tracks]], so a learner practicing SQL or data modeling is simultaneously absorbing real Egyptian history — not solving abstract "customer/orders" problems with a themed skin on top. Every dataset below is real and sourced (see [[Sources]]); nothing here is invented history.

## The real historical datasets

**1. Pharaohs & Dynasties** — a 32-row reference table spanning Early Dynastic through Ptolemaic (seed file: `data/pharaohs_dynasties_seed.csv`), with well-documented succession chains (Sneferu→Khufu→Khafre→Menkaure; Seti I→Ramesses II→Merneptah), attested co-regencies (Amenemhat I/Senusret I), a usurpation/damnatio memoriae case (Hatshepsut/Thutmose III), and genuine chronology disputes (Pepi II's reign traditionally 94 years per the Turin King List, now widely doubted in favor of ~64; High vs. Low vs. New chronology debates shifting entire reign blocks by decades).

**2. Monuments, UNESCO Sites & Museum Collections** — a 20-row monument-construction table (seed file: `data/monuments_seed.csv`) spanning the Step Pyramid of Djoser through Ptolemaic-era temples, Egypt's 7 UNESCO World Heritage Sites, and — genuinely useful — the **Metropolitan Museum of Art's Egyptian Art collection**: ~30,000 objects, CC0-licensed, with a real, bulk-downloadable nightly CSV dump on GitHub (`github.com/metmuseum/openaccess`) plus a full REST API. This is a real, live, legally-clean external dataset — not a synthetic stand-in.

**3. Quantitative Historical Records** — the Nilometer flood-level series (a real, citable modern reconstruction dataset published on PANGAEA covering ~1,500 years), the Palermo Stone (Old Kingdom royal annals recording per-year Nile flood heights and reign events — only 7 fragments survive), the Wilbour Papyrus (~2,800 individual land/tax records from 1145 BCE — genuinely the most spreadsheet-like ancient Egyptian record known), and the Deir el-Medina Database (a real, searchable Leiden University database of ~3,000 workmen's-village entries).

## Challenges by track (3-4 each, historically grounded)

### 1. SQL Fundamentals & Advanced
- "Longest Reigns" — rank pharaohs by reign length using `pharaohs_dynasties_seed.csv`; window-function variant partitions by dynasty.
- "The Family Line" — self-join the pharaohs table on a `predecessor_id` column to reconstruct father→son chains (Dynasty IV, Dynasty XIX).
- "Missing Monuments" — anti-join UNESCO sites against the monuments table to find sites with no linked monument row yet.
- "Co-Regency Overlap" — write a query that correctly identifies attested co-regencies (Amenemhat I/Senusret I) versus illegitimate date overlaps.

### 2. Dimensional Modeling & Data Warehousing
- Build `fact_monument_construction` (grain: one construction event) against `dim_pharaoh`, `dim_dynasty`, `dim_location`, `dim_era` using the 20-monument dataset.
- SCD Type 2 on the Great Sphinx's disputed attribution (Khafre vs. Djedefre/Khufu) — model "current best attribution" with full history of changed scholarly consensus.
- Conformed Dimension Bus Matrix — share `dim_dynasty` across `fact_monument_construction` and a `fact_reign` table built from the pharaohs dataset.
- Star-vs-snowflake tradeoff — model `dim_location` flat vs. normalized into site → region → UNESCO-designation hierarchy.

### 3. Orchestration (Airflow)
- Build a real DAG that pulls the Met Museum's actual nightly-updated Egyptian Art CSV from GitHub, lands it, and triggers downstream transforms — a genuine live external dependency, not a mock.
- Backfill exercise: recompute dynasty-level summary aggregates after a schema change.
- Sensor-based triggering: wait for the Met's nightly file update before running (mirrors its real publishing cadence).
- SLA-miss alerting: fire an alert if the Met ingestion DAG doesn't complete within a set window.

### 4. dbt-Style Transformation / Analytics Engineering
- `stg_met_objects` → `int_objects_by_era` → `mart_artifact_summary`, built on the real Met CSV schema.
- Test suite: `not_null`/`unique` on `object_id`, a `relationships` test linking artifact era to `dim_dynasty`.
- Incremental model: only process Met objects updated since the last run, using the dataset's real "last updated" field.
- A `clean_disputed_date_range()` macro that consistently handles "circa"/disputed dates (e.g. Amenemhat III's contested start year) across every model that touches them.

### 5. Spark / PySpark
- Partition the ~30,000-row Met dataset by culture/era and detect skew (Egyptian Art vs. other departments in the full Met dump).
- Broadcast-join the tiny 32-row `dim_dynasty` against a much larger fact table of monuments/artifacts.
- Rolling-window aggregation: compute a moving-average Nile flood level from the real PANGAEA flood-layer dataset.
- Idempotent, exactly-once ingestion of the ~3,000-row Deir el-Medina Database using a stable natural key.

### 6. Cloud Data Warehouses (Snowflake/BigQuery)
- Load the Met's real Egyptian Art CSV and choose/justify a clustering key (culture, era, or department).
- Parse the Met API's nested JSON (multiple `constituents`/artists per object) with `VARIANT`/JSON functions.
- Time-travel/zero-copy-clone exercise simulating recovery from an accidental bad `UPDATE` to a monument-attribution field.
- Cost/performance tuning: full scan vs. pruned partition query on the Nilometer time-series table.

### 7. BI Tooling (Power BI/Tableau)
- A Gantt-style timeline of monument-construction eras across dynasties.
- A DAX/calculated measure for average reign length by era, with Era → Dynasty → Pharaoh drill-down.
- A time-series visualization of the real historical Nile flood-level record, highlighting statistically anomalous flood/drought years.
- Redesign a misleading dual-axis chart comparing "monuments built" vs. "average reign length" per era — a *Storytelling with Data*-style exercise.

### 8. Data Quality & Testing
- Validate that no two pharaohs in the same dynasty have illogically overlapping reign dates — except attested co-regencies, modeled as an explicit allowlist (directly using the real chronology-dispute research).
- A real freshness check: alert if the Met Museum's nightly GitHub CSV dump hasn't updated within 48 hours — a genuine live-data SLA, not a synthetic one.
- Anomaly detection on the Nilometer flood-level series (flagging statistical outlier years).
- A lineage exercise: when Egyptological consensus shifts a disputed date (e.g. Amenemhat III's start year), trace which downstream marts need reprocessing.

### 9. Python for Data Engineers
- A resilient ingestion script (retries/backoff) pulling live from the Met Museum's real public API.
- Clean a Wilbour-Papyrus-style ~2,800-row land/tax dataset, handling inconsistent units (arouras vs. hectares) — modeled on the real papyrus's structure.
- A small CLI: given a pharaoh name, look up dynasty/era/reign dates from the seed table.
- The capstone "End-to-End Lifecycle" exercise: ingest the real Met API → land → dbt transform → Airflow-orchestrate → BI-ready mart, tying every track together on one real dataset.

## The "Did You Know" mechanic

After a correct answer, surface a short, sourced historical note tying the exercise's data back to the real event/figure it's modeled on — reinforcing that this is genuine history, not decoration. Examples:
- After "Longest Reigns": *"Pepi II is traditionally credited with a 94-year reign — the longest in recorded history — per the Turin King List. Most Egyptologists today believe this figure was mistranscribed, and favor a shorter reign closer to 64 years."*
- After the Great Sphinx SCD exercise: *"The Sphinx's attribution to Khafre is the mainstream view, but some evidence points to his brother Djedefre or father Khufu — a genuinely unresolved debate, not settled fact."*
- After the Nilometer anomaly-detection exercise: *"The Roda Island Nilometer in Cairo recorded Nile flood levels for over 1,300 years, making it one of the longest continuous environmental records in human history."*

This mechanic should pair naturally with the ink-stroke feedback animation in [[Brand & Creative Identity]] — the gold ankh flourish on a correct answer is the moment the trivia note appears, so the historical payoff and the gamified feedback land together.

## Guardrails (see [[IP & Content Rules]])
Every fact above is drawn from cited, real sources — never presented as more certain than it is (uncertainty is treated as a feature: it becomes data-quality and lineage exercises, not something to smooth over). The Met Museum data is CC0 and genuinely safe to build on directly; other sources (Palermo Stone, Wilbour Papyrus) are referenced for their real structure and content, with exercises built as original re-creations inspired by that structure — never copied transcriptions from any single scholarly publication.
