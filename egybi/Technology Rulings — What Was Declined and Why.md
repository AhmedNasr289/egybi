# Technology Rulings — What Was Declined and Why

> A standing record of every tool proposed for EgyBI and the verdict against the project's constraints, so the same argument is not had twice. Written **2026-08-07**. Back to [[Home]]. Related: [[Places & Data Stories]], [[The Visitor Layer]], [[Egypt Atlas — Geospatial Service]], [[IP & Content Rules]].

## What was actually built from this list

Updated **2026-08-08**. A refusal table is not an answer, so this is the part that shipped. Each row is live capability on egybi.com, not an assessment.

| Capability | Built with | Where it runs | What it does that nothing did before |
|---|---|---|---|
| **Mean daily maximum, per site, per month** | NASA POWER `temporal/daily` | `fetch_tourism.py` → `visit-climate.json` | The figure a visitor choosing between February and August actually wants. Neither of the other two POWER endpoints can produce it, and both were mistaken for it before this. |
| **A pipeline that refuses its own bad output** | WMO World Weather Information Service | `reference_check()` in the same file | Every computed normal is compared against Egypt's published station normals — a source that cannot be fooled by a misreading of the first one. Two gates, both shaped like the failure they exclude. On a failed check the layer is not published. |
| **The check, published** | — | `visit.html` § *How it was checked* | 168 site-month comparisons, both gate results, the per-site agreement and the reason the largest gaps cluster. A validation a reader cannot see is one they have to take on trust. |
| **Terrain cross-sections** | NASA SRTM 30 m via Open-Topo-Data | `build_relief()` → `visit-relief.json` | Five measured lines across Egypt at up to 300 points each. The Luxor line shows the floodplain as a flat 78–80 m run between desert on both sides; the Nile line runs 1 040 km at a median of 76 m. |
| **A traverse along real ground** | Hand-written SVG + tile-free Leaflet | `visit.js` `paintRelief()` | The honest version of the requested flyover. A slider moves along the profile and a marker moves along the line on the map; every point is a radar reading with a latitude and a longitude. |

### The flyover, answered properly

The ask was a cinematic drone flight over Egypt. Every route to a literal one fails a constraint: imagery good enough to fly through is licensed rather than open; a 3D render from open elevation needs a GPU pipeline GitHub Actions does not have and would commit hundreds of megabytes of frames to a repo a static host serves; generative video needs a vendor account and a key at build time.

What is open, cheap and citable is the ground itself. So the page flies the *terrain* instead of the *pixels* — and a measured profile of the Nile valley tells a reader more about Egypt than a flythrough of invented ones. Nine elevation requests per build, well inside the public instance's daily allowance, one per second as its policy asks.

### What the cross-sections found

- **The valley at Luxor is about 6 km of floodplain.** West desert at 155 m, the Theban hills at 258 m, then a flat run at 76–80 m across the river, then the eastern desert climbing again. The strip Egypt lives on is the flat part, and this is how narrow it is.
- **The pyramids stand on ground their builders chose.** The Giza line rises from 11 m on the floodplain to 119 m on the limestone scarp in 14 km. The plateau was not raised; it was selected.
- **Egypt's west falls below the sea.** The Siwa line reaches −82 m, with a median of −17 m over 198 km.
- **The Nile barely moves.** 1 040 km from Cairo to Abu Simbel, median 76 m. Straight legs between river waypoints still clip the terrace where the river meanders hardest, so every transect publishes its quartiles alongside its extremes — a min and a max describe the two most unusual points on a line and nothing about the rest of it.

### Three mistakes this record exists to prevent

1. **A parameter's name is not its meaning.** `T2M_MAX` means three different things across POWER's three endpoints. Two of them were published as "mean daily maximum" before a human caught it.
2. **An unsourced yardstick is not a check.** The first version of the guard used published normals written down from memory — an unsourced number validating a sourced one, with no way to tell which was wrong when they disagreed. The yardstick is now fetched and cited like everything else.
3. **A diagnostic that says nothing costs a run.** The station list did not parse and the log said *"shape changed?"* with no evidence. Printing the actual bytes found the real format — three columns, no coordinates — on the very next run.

## The four constraints every tool is judged against

Nothing here is a matter of taste. Each verdict traces to one of these, and if a tool fails one it is out regardless of how good it is:

1. **Open source only.** No paid tier, no API key at runtime, no vendor account at build time or run time. GitHub Actions + Python + static hosting is the entire budget.
2. **No runtime map-service calls.** Maps are tile-free vector Leaflet, and that property is *measured* with Playwright request interception on every verification pass. A free tier that still calls a provider fails this outright.
3. **No build step.** The site deploys by `git push`. Anything needing compilation or bundling breaks the one property that makes it deployable by one person.
4. **Cited-data honesty.** Every figure traceable to a named dataset with a date. Nothing fabricated, nothing back-filled, uncertainty flagged rather than smoothed.

## The ruling

| Tool | Verdict | Why |
|---|---|---|
| **NASA POWER** | **Adopt** | Keyless, accountless, US-Government public domain. The only climate source that clears constraint 1 outright. |
| **NASA SRTM 30 m** | **Adopt** | Public-domain elevation; makes a genuine terrain view possible from measurements rather than renders. |
| **UNESCO World Heritage list** | **Adopt** | Already in use for `geo-heritage.json`; reused rather than duplicated. |
| **Overpass / OpenStreetMap** | **Adopt** | Already the backbone of Places, the Atlas and the street report card. |
| **osmnx, shapely, geopandas, networkx** | **Adopt** | Pure Python, pinned, build-time only — nothing reaches the browser. |
| **rasterio / rioxarray** | **Adapt** | Legitimate at build time to read a DEM and emit small JSON. Never shipped to the client. |
| **QGIS** | **Adapt — authoring only** | Cannot run in Actions, so it cannot be *in* a pipeline. Fine as a desktop tool whose exported GeoJSON a pipeline consumes. Nothing needs it yet. |
| **Nominatim** | **Adopt** | Free and keyless, build-time only, with the Egypt bounding-box check on every result. |
| **Mapbox GL JS** | **Decline** | Tiles need an access token and every render is a runtime call to Mapbox. Fails constraint 2 before cost is even discussed. |
| **Google Maps APIs** | **Decline** | API key plus billing account, and every render calls Google. Fails 1 and 2 together. |
| **ArcGIS** | **Decline** | Esri account required; paid beyond trivial use. Fails 1. |
| **Carto** | **Decline** | Hosted paid platform, account required. Fails 1. |
| **Google Earth / Earth Studio** | **Decline** | Imagery is licensed, not open. Deriving assets and republishing them breaks the licence chain at the source. |
| **Google PDFM** | **Decline** | Restricted-access research model, not available under an open licence. |
| **GeoStory / MapOG** | **Decline** | Hosted story-map services needing accounts; embedding one is a runtime provider call. `scrolly.js` already does this in 4 kB we own. |
| **Keyed weather APIs** | **Decline** | A key is a vendor account and a secret to rotate, for normals that change on a decadal timescale. |
| **CapCut / After Effects / GeoLayers / VFX** | **Decline — authoring only** | Hand-driven desktop software cannot run in Actions. Nothing here needs hand-authored video. |
| **AI "cinematic drone video"** | **Decline** | Three separate failures — see below. |
| **TypeScript** | **Decline** | Needs a compile step. Fails constraint 3, which is what keeps deployment to one `git push`. |
| **Tauri** | **Decline** | Builds desktop applications. A different product, not this website. |
| **deck.gl** | **Defer** | Genuinely good. GPU rendering earns its place when data outgrows SVG; 757 places and 27 polygons do not. |
| **DuckDB-WASM** | **Defer** | A real upgrade over JSON *when data outgrows JSON*. `geo-places.json` is 96 kB and sql.js already covers querying. |
| **PMTiles** | **Defer with intent** | The right answer the moment there is raster or street geometry too large for GeoJSON. Not yet true. |

## The drone video, in detail

Ahmed supplied a document of production prompts: a Google Earth screenshot is upscaled by an image model, then fed to **Veo 3.1** or **Google Omni** as start and end frames to generate a continuous aerial flight. It is a well-built workflow. It is also the clearest case on this page, and it fails three ways independently:

**Its own success criterion is the problem.** The document states the goal twice: *"The final result should be indistinguishable from footage captured by a professional aerial cinematography team using high-end cinema equipment."* That is a specification for imagery a viewer cannot distinguish from a photograph of a real place — and it is not one. On a site whose entire claim is that every figure is traceable, publishing that corrodes the only asset EgyBI has.

**The constraints in the prompt cannot be enforced, only requested.** It says *"Do not add, remove, relocate, or redesign buildings"* and, three lines later, *"Extend the environment consistently beyond the visible frame."* Those are in direct tension: everything beyond the frame is generated, because there is no data there. A generative video model produces pixels from a prior; "do not invent" is a wish, not a constraint. The output would be invented Cairo streets sitting beside measured Cairo street geometry, on the same site.

**The licence chain breaks before the model runs.** Veo 3.1 is a paid tier, which fails constraint 1. And Google Earth imagery is licensed — limited screenshot use with attribution is permitted, generating derived video and republishing it is not.

### What was built instead, and what it honestly is

The terrain section of `visit.html`: **real ground elevation at each site's own coordinates, from NASA's Shuttle Radar Topography Mission 30 m survey**, public domain. Every bar is a radar measurement of actual land. The page says so in plain words, right next to it, including *why* there is no flythrough.

It looks like a data visualisation rather than a photograph. **That is the point** — it can carry a source line.

**What would change this verdict:** footage Ahmed or a named photographer actually shot, or clips under a licence permitting republication (Wikimedia Commons holds some CC-BY Egyptian aerials). Either would be cut in with attribution. Generating it will not be.

## The rule this all comes down to

> A dependency that does not earn its place makes the site slower and more fragile — and a *source* that cannot be cited makes it worthless. Four tools wired in properly beat fourteen in a list.
