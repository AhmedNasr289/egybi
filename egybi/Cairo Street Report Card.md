# Cairo Street Report Card

> EgyBI's fifth data service, at **egybi.com/streets.html**. Six Cairo districts spanning six planning eras, measured rather than described. Built **2026-08-07**. Back to [[Home]]. Related: [[Egypt Atlas — Geospatial Service]], [[Automation & CI Pipelines]], [[Frontend & Design System]].

## What it is

Street-network geometry is one of the few things about urban form you can measure **objectively** from open data. This page computes seven metrics per district and shows how a khedivial grid differs from a desert cul-de-sac subdivision *numerically*, instead of asserting it.

| District | Era | Why it earns a place |
|---|---|---|
| Downtown Cairo | Khedivial, 1860s–70s | Ismail's Paris-on-the-Nile — boulevards and midans over a dense grid |
| Heliopolis | Garden suburb, 1905–10s | Baron Empain's tram-served suburb, built around transit from day one |
| Maadi | Garden suburb, 1900s–30s | Delta Land Company villa quarter — grid softened by diagonals |
| Nasr City | Nasserist, 1958+ | The state's post-revolution expansion: arterials and superblocks |
| 6th of October | Desert new town, 1979+ | First-generation satellite city, planned from nothing |
| New Cairo | Desert new town, 1990s–2000s | Compound-led suburban form — the sharpest contrast with the grid |

**Metrics:** intersection density per km², dead-end share, street density, mean segment length, streets per junction, circuity, and orientation entropy.

## The five methodological traps, and how each is handled

These are the decisions that separate a real measurement from a demo. All are in the pipeline docstring and restated on the page, because *a metric you cannot interrogate is a metric you should not trust*.

1. **Place-name boundaries.** OSMnx resolves a district by geocoding a string, and Egyptian district names are inconsistent in OSM (English vs Arabic, "Nasr City" vs "Madinat Nasr", missing relations). Each district carries **several candidate queries tried in order**, and every resolved polygon is **area-checked** (1–900 km²) before use. A wrong geocode usually lands on a single POI or a whole governorate; both would silently corrupt every per-km² figure downstream. Anything implausible is dropped **and named** in the output's `skipped` list, which the page displays.
2. **Projection.** Lengths and circuity computed on raw lat/lon degrees are meaningless. Every graph is projected to UTM before measurement.
3. **Normalisation.** 6th of October is orders of magnitude larger than Downtown, so raw counts would compare *size* rather than *design*. Every count is divided by the district's real projected area.
4. **Drive vs walk networks.** The report card uses the **drive** network because that is what street design produces; the access score uses the **walk** network because a 15-minute city is about walking. Mixing them would answer neither question.
5. **Bearings unprojected and length-weighted.** Bearings are compass directions, so they must come from lat/lon — and a two-kilometre avenue should count for more than a fifty-metre lane.

## Orientation entropy — why it's the most interesting number

A perfect four-way grid scores about **1.39** (= ln 4); a fully disordered network approaches **3.58** (= ln 36). Everything real sits between. It is rotation-invariant, so a grid tilted 45° scores identically to a north-south one — it measures *regularity*, not *direction*.

Verified against synthetic networks before trusting it on real data: a generated perfect grid returned 1.386, the same grid rotated 45° returned 1.386 with the occupied compass sectors shifted, and a random walk returned 3.565 against the theoretical maximum of 3.584.

## The page

Tile-free vector Leaflet, exactly like the Atlas — **zero runtime calls to any map service**. Four views: a choropleth switchable across all seven metrics, **orientation roses drawn client-side as SVG from 36 numbers per district** (which is why the payload stays tiny instead of shipping street geometry), a sortable comparison table, and a per-district drill-down carrying the rose, every metric, walking access and the planner's note.

Deliberately **no small-multiple PNG thumbnails**: rendering street geometry server-side would add matplotlib to the pipeline and hundreds of KB to the repo, and the orientation roses already answer "what shape is this place" more legibly than a tangle of lines at thumbnail size.

## The AI planner's note

Each district gets one 60–90 word plain-language paragraph, written by Claude **from the computed metrics and nothing else**. Three rules keep it honest rather than decorative:

- The model sees **only** that district's numbers, and is explicitly told not to introduce population, history, policy, prices or named streets it wasn't given.
- **Every figure it is given is displayed beside the note**, so any claim can be checked against the measurement it came from.
- The panel is labelled `AI-GENERATED` in the interface, and the page states in plain words that it is a reading of metrics, not professional planning advice.

If `ANTHROPIC_API_KEY` is absent the script **exits cleanly without writing a file** and the page says notes weren't generated for this build. No key, no notes, no pretending.

## Pipeline & automation

`backend/pipeline/fetch_streets.py` → `streets-districts.json`, `streets-boundaries.json`, `streets-access.json`. `build_planner_notes.py` → `streets-notes.json`. Run by **`.github/workflows/refresh-streets.yml`**.

**Manual only, deliberately.** Street networks change on the timescale of construction projects, so a weekly cron would produce byte-identical output while hammering the free public Overpass API, whose usage policy asks for exactly the restraint a pointless cron job fails to show. For the same reason each district's boundary is **geocoded once and shared** between the report-card and access passes rather than looked up twice.

**Not stdlib-only** — the first pipeline here that isn't. OSMnx pulls geopandas, shapely and networkx. Versions are pinned so an upstream release cannot silently change published measurements, and pip is cached. **`scipy` is pinned explicitly** because `orientation_entropy` needs it as an *optional* dependency that osmnx does not install by default — omit it and the metric raises `ImportError` at runtime rather than at install time. That was caught by testing locally; it would otherwise have failed only on the runner.

Guardrails follow the house pattern: thin-graph floors (150 nodes / 300 edges), a minimum of 4 districts before publishing a comparison, abort-and-keep-last-good per layer, non-zero exit on any skip, and a commit step under `if: '!cancelled()'` that stages only files that exist.

## Verified

Driven in Chromium against fixtures: 6 table rows, 6 roses, 6 map polygons, metric switching, drill-down, access cards, 5 wayfinding chips, 375px with zero horizontal overflow, no console errors. Then the **fixtures were deleted** and the empty state re-verified — sections hide rather than rendering zeros, and the method section stays visible so the page still explains itself.

The pipeline was also run with the network unreachable to prove the failure path: every candidate query logged its reason, the abort named all six districts, exit code 1, and **zero files written**.

Full-site regression after the nav change: Atlas 27 rows, practice 123 challenges, the case's six steps, homepage sandbox, and generated challenge/story pages all still correct.

## Compliance & honesty

No FRA exposure — this is urban geometry, nothing financial. The honesty risks are different here and each is handled in the framing rather than a buried disclaimer:

- **OSM coverage ≠ ground truth.** Street geometry is among the best-mapped data in OSM, which is what makes the comparison reasonable. Amenities are *not* — the access section leads with the caveat that a low score can mean few facilities **or** few mapped facilities, and the data cannot separate them.
- **An access score is not a service-quality statement.** It says nothing about whether a facility is open, affordable, staffed or any good.
- **Boundaries are OSM's, not administrative.** Stated on the page.
- **No district is scored "good" or "bad".** The `good` direction on each metric only decides which end of the colour ramp is dark; the copy describes trade-offs (cul-de-sacs are quieter on their own street and harder to walk across) rather than ranking places.
