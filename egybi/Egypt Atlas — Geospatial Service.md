# Egypt Atlas — Geospatial Service

> EgyBI's fourth data service, live at **egybi.com/geospatial.html**. One interactive map of Egypt carrying several cited layers at once. Built **2026-07-25**. Back to [[Home]]. Related: [[Automation & CI Pipelines]], [[Daily Prices Page & Pipeline]], [[Stock Market Page & EGX Data]], [[Frontend & Design System]].

## What it is

A multi-layer choropleth of Egypt's **27 governorates**, plus point overlays, plus a sortable table and a heritage list. It reuses the map engine already proven on Explore rather than inventing a second one: vector-only **Leaflet**, **no tile layer**, so the page makes *zero* runtime calls to any map service (no key, no quota, no tile-usage-policy exposure, works on a strict static deploy).

**Layers:**

| Layer | Source | License | Refresh | Notes |
|---|---|---|---|---|
| Governorate boundaries | geoBoundaries.org EGY ADM1 | CC-BY 4.0 | Static, bundled in `assets/egypt-geo.js` | Simplified; already shipped for the Explore map |
| Population / density / area / urban % / growth | EgyBI KB (CAPMAS, Nov 2023; 2017 census for growth) | — | Static, bundled | Same figures the SQL challenges query |
| Hospitals + clinics | OpenStreetMap via Overpass | **ODbL** (attribution) | Manual, a few×/yr | Points **and** per-governorate counts |
| Schools | OpenStreetMap via Overpass | **ODbL** | Manual, a few×/yr | Counts only — tens of thousands of points would bloat the page for no display value |
| UNESCO World Heritage sites | UNESCO WHC list XML | © UNESCO, attributed | Manual, a few×/yr | Egypt's 7 inscribed sites; gold markers, on by default |

## Why these sources and not others (the honest shortlist)

Research before building rejected more than it accepted — recorded here so it isn't re-litigated:

- **Air quality** — rejected. The U.S. State Department's global embassy air-quality program (which fed most of OpenAQ's Cairo/MENA coverage) was **discontinued in March 2025**. No other currently-live, freely-licensed, real-time Cairo feed could be confirmed. Shipping a "Health → air quality" tab behind a dead feed is exactly the silent-staleness failure the site's guardrails exist to prevent.
- **Real-time disease / health-outcome data for Egypt** — confirmed absent for free. Not built.
- **Suez Canal AIS vessel traffic** (aisstream.io) — deferred, not rejected. Genuinely free, but it's a **persistent WebSocket feed**, a different technical shape from every other pipeline here (all one-shot `GET`+parse). Needs a manual prototype before it can be trusted unattended.
- **Ookla connectivity open data** — possible later, with a caveat: **CC BY-NC-SA** (NonCommercial). If Phase 2 monetization ever lands, that license must be re-checked before use.
- **WorldPop / GHSL rasters, vegetation indices** — need `rasterio`-class raster processing, too heavy for a lightweight Actions job. The bundled CAPMAS figures already cover the population question.
- **Agriculture/water, energy/infrastructure** — no free, currently-available, Egypt-specific geospatial source beyond what other EgyBI pages already use.

## Pipeline

`backend/pipeline/fetch_geo_layers.py` → `site/data/geo-health.json`, `geo-schools.json`, `geo-heritage.json`.
Run by **`.github/workflows/build-geo-assets.yml`** — **manual only** (`workflow_dispatch`). OSM coverage and the World Heritage List change slowly; a daily cron here would be theatre.

**Guardrails** (same abort-and-keep-last-good pattern as prices/FX, applied *per layer* — one bad source never takes the others down):
- Unreachable Overpass → 3 attempts, 30 s apart, then **skip that layer** (its previous JSON survives untouched).
- Thin-result floors: `<150` health facilities, `<1000` schools, `<6` Egyptian heritage sites → treated as a broken response, layer skipped.
- Any skipped layer makes the run **exit non-zero**, so a partial run shows red in the Actions UI rather than passing quietly.

### First real run (2026-07-25) — what the sources actually returned

| Layer | Result | Verdict |
|---|---|---|
| Health facilities | **963** hospitals + clinics, 0 outside the simplified borders | ✅ |
| Schools | **1,191** | ✅ passed, but see the floor note below |
| Heritage | **0** Egyptian sites found | ❌ correctly rejected as a broken parse |

Three things this taught us, all now fixed:

1. **The UNESCO feed isn't shaped the way the first parser assumed.** It fetched and parsed as valid XML, but contained no `<row>` element carrying an `iso_code` — so the Egypt filter matched nothing. The parser now finds records **structurally** (any element carrying both a latitude and a longitude child, under several possible tag spellings), matches Egypt on `iso_code` *or* a `states`/`country` field containing "Egypt", and **prints the feed's root tag, record count and field names** on every run — so if it breaks again the run log says what the feed actually looks like instead of leaving us to guess. Verified against five simulated feed shapes: two plausible schemas parse correctly (and correctly exclude a Jordanian site), and the three broken cases each fail loudly with a useful diagnostic.
2. **The `MIN_SCHOOLS` floor was set blind and was dangerously tight.** 1,000 sat only 16% below the real 1,191 — ordinary mapping churn could have false-tripped it. Floors are now calibrated against observed reality: **`MIN_SCHOOLS` 1000 → 700**, and `MIN_HEALTH` **150 → 400** (the original 150 was so loose a badly truncated response would have sailed through). Both now sit far enough below the observed values to be safe, and far enough above zero to catch a collapse.
3. **The workflow discarded the two layers that succeeded.** This was the real bug. The per-layer guardrail worked exactly as designed *inside* the script — health and schools were written correctly, only heritage was skipped — but the script's non-zero exit meant the commit step never ran, so all of it was thrown away. That's the precise opposite of "one bad source can't take the others down." The commit step now carries **`if: '!cancelled()'`**, so successfully-built layers are committed even when a sibling layer fails, while the run *still* reports failure so the breakage isn't silent. Only the salvage is unconditional, not the green tick.

**Per-governorate counts** are assigned by point-in-polygon against the *simplified* bundled boundaries, so facilities right on a border can land one governorate over. This is recorded in each JSON's `note` and stated on the page — not hidden. (The point-in-polygon was verified offline against seven known coordinates: Cairo, Alexandria, Aswan, Luxor, Sharm El Sheikh, Marsa Matruh, and a Mediterranean point that correctly returns nothing.)

## Graceful empty state (why the page shipped before the data)

The three layer JSONs are **not committed**. Until the workflow is first run, the page still works: the governorate map, legend, table and detail panel all render from the bundled data; the health/schools metric buttons and both overlay buttons stay **disabled with a tooltip**; the table shows **“—”** rather than a fabricated `0`; and a note says plainly which layers aren't generated yet. Verified in a real browser (Chromium) in both states — empty and fixture-populated — with zero page errors.

## Compliance & honesty framing

- The health layer is explicitly **not** a care directory: the page states it says nothing about quality, capacity or opening hours, and points to official health-ministry channels for real medical needs.
- OSM layers are labelled as showing **where things are mapped**, not an official registry — community coverage is incomplete, and the page says so rather than implying completeness.
- Urban % is flagged as a **CAPMAS ~2016 proxy (±1–2 points)**, carried over from the Explore map's existing caption.
- No FRA exposure — nothing financial, no advice of any kind.

## Wayfinding & IA

Single page, layer toggles — **not** a hub of per-sector sub-pages. All the layers are Egypt-wide views of the same geography; splitting them would fragment one coherent map into pieces that only reference each other. Sticky `.on-this-page` sub-nav chips: **Map · Governorates · Heritage · Method & sources**. Linked from the main header nav (after Stocks, labelled **Atlas**), the footer's Explore column, and `sitemap.xml` (priority 0.8). The generated challenge/story pages inherit the new nav automatically, since `build_static_pages.py` lifts the header out of `blog.html`.

## Planned next (designed, not built)

Automated **daily** layers, both reusing the existing cron+guardrail+notify-failure shape:
1. **Earthquakes** — USGS FDSN Event API (public domain, no key), bbox over Egypt/Sinai/Red Sea. Guardrail nuance: a **zero-result day is valid data**, not a failure — unlike prices/FX, low count must not trigger the abort.
2. **Flights** — OpenSky Network REST `/states/all` (free tier: 400 req/day anonymous, 4,000 registered). Opposite nuance: a **near-zero aircraft count *is* a failure signal**, since Egyptian airspace is never empty.
3. **NASA FIRMS fire/thermal hotspots** — free but needs a registered `MAP_KEY` secret (one-time human step).
4. **An "Insights" layer** — rolling z-score anomaly flags on the event streams, a least-squares population trend, DBSCAN facility clustering. Each must carry inline disclaimer language ("statistically flagged, not verified as significant"; "a simple least-squares line, not a projection"; "density only, not service quality") — a computed statistic is a step removed from a cited fact and is the easiest thing on the page to overstate.
