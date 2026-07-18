# Product Format & Architecture

## Core format
In-browser code/query sandbox, real execution (never multiple choice), auto-graded, progressive difficulty per track ([[Curriculum & Skill Tracks]]), leaderboard/streak/badge system ([[Brand & Creative Identity]]).

## Execution strategy — the key architectural decision

Running arbitrary user-submitted code safely is a real security problem (sandbox escape, resource exhaustion, injection) — not something to solve by naively `eval`-ing submissions server-side. Two tiers:

- **SQL + dimensional-modeling tracks (1 & 2 in [[Curriculum & Skill Tracks]]):** run entirely **client-side** via **DuckDB-Wasm** (or sql.js) — a real SQL engine executing inside the learner's browser. Zero server-side execution risk, near-zero marginal compute cost at scale, and genuinely fast feedback. This alone covers a large share of the curriculum and is realistic for a solo, part-time build.
- **Python / PySpark / dbt / Airflow tracks (3–5, 9):** need real server-side execution. Recommend a **managed, purpose-built code-execution API** (e.g. Piston or a Judge0-style service) rather than building sandbox infrastructure from scratch — far lower security risk and engineering effort than a self-hosted arbitrary-code sandbox, appropriate for a solo founder. Defer this tier to Phase 2 (see [[Build Plan]]) once the SQL/modeling tracks have validated demand.
- **Cloud warehouse and BI-tool tracks (6–7):** largely conceptual/design exercises (clustering-key choice, DAX authoring, chart-type selection) gradeable via structured-answer checking rather than live execution against a real Snowflake/Power BI account — avoids needing paid cloud-warehouse or BI-tool licenses per learner.
- **Data quality track (8):** exercises run against the same client-side DuckDB-Wasm data, checking output against expected validation rules.

## Content-growth mechanism
Seed each track with book-grounded, templated exercise generation (parameterized versions of the same use-case — different table names/data each time) to multiply content without linear authoring effort. Once there's real traction, open a reviewed community-contribution pipeline (Exercism's model) rather than trying to author everything solo forever — sustainable for someone already running EGYBi part-time.

## Gamification mechanics
Rank ladder, badges, streak-notched glyph, papyrus progress map, and feedback animations as designed in [[Brand & Creative Identity]] — implemented as a lightweight overlay on top of the exercise/grading engine, not a separate system.

## Hosting
Deploys to the `egybi.com` domain (already registered, Hostinger-hosted) — see [[Relationship to EGYBi]] for why the domain name doesn't match the product name.
