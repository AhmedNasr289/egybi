# Technology Rulings — What Was Declined and Why

> A standing record of every tool proposed for EgyBI and the verdict against the project's constraints, so the same argument is not had twice. Written **2026-08-07**. Back to [[Home]]. Related: [[Places & Data Stories]], [[The Visitor Layer]], [[Egypt Atlas — Geospatial Service]], [[IP & Content Rules]].

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
