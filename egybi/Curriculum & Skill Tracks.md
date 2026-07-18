# Curriculum & Skill Tracks

9 tracks, each beginner → advanced, with a book-grounded reading list and named, hands-on use-case exercises (never copied from the books themselves — see [[IP & Content Rules]]). Full book source list: [[Sources]].

**Content update:** the use cases below are generic/technique-grounded. For the historically-grounded versions of these same tracks — real pharaoh/dynasty data, monuments, museum collections, and quantitative Egyptian records mapped into concrete challenges per track — see [[Historical Data & Challenge Themes]], which is the version to actually build toward.

## 1. SQL Fundamentals & Advanced
**Reading:** *SQL Antipatterns* (Bill Karwin) — catalogs real-world query/design mistakes; *SQL Performance Explained* (Markus Winand) — cross-database indexing/optimizer deep dive.
**Use cases:** basic SELECT/JOIN/aggregation drills · window-function ranking report (top-N per group) · self-join for hierarchical org charts · anti-join for "customers with no orders" · query rewrite to remove a correlated-subquery antipattern · index-selection exercise using `EXPLAIN` output · CTE-based recursive query (bill of materials) · deduplication via `ROW_NUMBER()`.

## 2. Dimensional Modeling & Data Warehousing
**Reading:** *The Data Warehouse Toolkit* (Kimball & Ross) — the definitive dimensional-modeling guide; *Building the Data Warehouse* (Inmon) — the normalized, top-down EDW approach; *Star Schema: The Complete Reference* (Adamson).
**Use cases:** Retail Sales Star Schema Build (design `fact_sales` at line-item grain + conformed dimensions) · SCD Type 2 Customer History (effective/expiry dates, surrogate keys) · Conformed Dimension Bus Matrix (share `dim_date`/`dim_product` across two facts) · Multi-Source Integration to 3NF (Inmon-style normalization of 3 source systems) · CIF Layered Pipeline (staging → normalized EDW → dependent mart) · snowflake-vs-star tradeoff exercise · factless fact table for tracking events.

## 3. Orchestration (Airflow)
**Reading:** *Data Pipelines with Apache Airflow* (Harenslak, de Ruiter, et al.) — DAG design, backfills, custom operators, cloud deployment.
**Use cases:** build a DAG with proper task dependencies and retries · debug a DAG stuck on a silent failure · implement idempotent backfills for a date-partitioned pipeline · write a custom operator wrapping an external API call · set up sensor-based triggering (wait for upstream file/table) · SLA-miss alerting configuration.

## 4. dbt-Style Transformation / Analytics Engineering
**Reading:** *Analytics Engineering with SQL and dbt* (Machado & Russa) — practical self-service transformation layer.
**Use cases:** build a staging → intermediate → mart model layer · write and pass a `not_null`/`unique`/`relationships` test suite · implement an incremental model · resolve a circular-reference / ref() dependency error · document a model with a `.yml` schema file · build a macro for a repeated transformation pattern.

## 5. Spark / PySpark
**Reading:** *Learning Spark, 2nd Edition* (Damji, Wenig, Das, Lee) — unified batch/streaming/SQL/ML APIs; *Designing Data-Intensive Applications* (Kleppmann) — partitioning/consistency theory underpinning distributed processing.
**Use cases:** Partition a Skewed Fact Table (choose/implement hash vs. range partitioning, detect skew) · Idempotent Late-Event Ingestion (dedup/exactly-once job for out-of-order events) · broadcast-join optimization for a small dimension table · window-function aggregation in PySpark · reading/writing partitioned Parquet efficiently · debugging a shuffle-heavy job from a Spark UI stage plan.

## 6. Cloud Data Warehouses (Snowflake + BigQuery to start)
**Reading:** *Snowflake: The Definitive Guide* (Joyce Kay Avila) — hands-on architecture/design/deployment.
**Use cases:** choose and justify a clustering key for a large table · query semi-structured JSON with `VARIANT`/nested fields · cost/performance tuning exercise (warehouse sizing, query pruning) · zero-copy cloning for a dev/test environment · time-travel recovery from an accidental delete · BigQuery partitioned + clustered table design.

## 7. BI Tooling (Power BI and/or Tableau)
**Reading:** *Storytelling with Data* (Cole Nussbaumer Knaflic) — tool-agnostic decluttering/focus principles for visualizations.
**Use cases:** redesign a cluttered dashboard against the book's principles · build a DAX/calculated-field measure for YoY growth · design a drill-down hierarchy · choose the right chart type for a given dataset (a "which chart wins" challenge) · build a dynamic date-range filter/parameter · fix a misleading dual-axis chart.

## 8. Data Quality & Testing
**Reading:** *Data Quality Fundamentals* (Moses, Gavish, Vorwerck / Monte Carlo) — data observability, SLAs/SLOs, anomaly detection, lineage.
**Use cases:** write a schema/contract validation check that fails a pipeline on breakage · build an anomaly-detection rule for row-count/volume drift · define SLAs/SLOs for a pipeline and alert on breach · trace a data-quality issue back through lineage to its source · implement a freshness check.

## 9. Python for Data Engineers
**Reading:** *Data Engineering with Python* (Paul Crickard) — practical, project-based pipelines/ETL/orchestration in Python; *Fundamentals of Data Engineering* (Reis & Housley) — the data engineering lifecycle framing that ties every track together.
**Use cases:** build a resilient API-ingestion script with retries/backoff · write a config-driven, reusable ETL function · build a small CLI tool for a repeated data task · implement structured logging for a pipeline · End-to-End Lifecycle Pipeline (ingest → land → transform with dbt → orchestrate with Airflow, grading each stage).

## Content-growth rule
Per [[IP & Content Rules]]: every exercise above is an original scenario built around the *technique* a given book teaches (e.g. "SCD Type 2," "clustering key," "idempotent ingestion" are industry-standard terms, free to reference) — never copied exercise text or sample data from the books themselves. The reading list is a pointer for the learner, not a content source to lift from.
