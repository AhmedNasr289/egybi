# Map Toolkit — Decisions and Handover

What was acted on from `EgyBI-Map-and-Dataviz-Toolkit.docx` (committed at the repo
root), what was declined and why, and what the next pass needs to know before it
starts. Written 2026-08-08. Companion to
[[Technology Rulings — What Was Declined and Why]], which judges tools; this
judges *recommendations*.

Read this before touching the maps again. Several of the toolkit's verdicts were
correct when written and are not correct now, and the reasons are more useful
than the conclusions.

## The toolkit's premises that have since expired

**It assumes CDN delivery.** §0.1 says "Plain HTML/CSS/JS from CDNs" and lists
Chart.js, sql.js and AOS as "already on CDN". None of that is true any more —
everything is vendored into `site/assets/vendor/` and `all-pages.js` fails the
build on any off-origin request. Every "CDN-cached, so the weight is free"
argument in §1b and §6 has to be re-read as "bytes we commit and serve".

**Its byte budget predates the pages.** §6 allows "at most 200 KB gzip of new
map payload on explore.html". Explore already carries roughly 900 KB
uncompressed across 21 files.

**Two of its recommendations were already done.** `egypt-geo.js` was at 4 decimal
places, not the 14 §2 describes, and the §7 cache-busting trap was fixed the day
before. Both were checked rather than assumed.

**Concept 3 is dead.** "SQL to map on practice.html", which §3 calls the
competitive moat, cannot be built: the practice product is retired and
`practice.html` is a tombstone that 301s to Explore. The recommendation predates
that decision.

## Acted on

| Toolkit item | What shipped |
|---|---|
| §0.1, §5, §8 — the geoBoundaries attribution gap | Credit rendered as page content **outside Leaflet**, so `attributionControl:false` cannot suppress it again. Enforced by `all-pages.js`. |
| §6 — header below Leaflet's z-index 1000 | A documented stacking scale: panes 400–700, controls 1000, sub-nav 1050, header 1100, skip link and query panel 1200, auth modal 1300. |
| §2 priority 1 — the FX layer | `fill` colour tween, south-to-north reveal, roving tabindex with geographic arrow keys, `aria-live` announcements, `.sr-only` data table. |
| §2 priority 2 — shrink the geometry | 125,860 → 30,018 bytes, 6,773 → 1,396 vertices, on six pages. |
| §3 concept 8 — tourism | Built honestly on Chart.js; see below. |

### The attribution gap was wider than documented

§0.1 flags one map. Measured, `explore.html` carried no credit at all and the
other five had a bare footer link with neither the citation nor the deed link
§5 requires — because `attributionControl:false` had by then moved into
`mapkit.js` and so applied to all six maps. **This was a live licence breach on
every map page**, and it is the reason the credit is now a build-enforced rule
rather than a convention.

### 15% simplification, not the recommended 8%

The toolkit says `-simplify 8%`. Rendered raw against 15% and 8% side by side at
four times size, zoomed on the Nile Delta, 8% turns the coastline into straight
segments and the Damietta promontory into a triangle. The 8% figure was written
for a country-scale choropleth; these maps now zoom to level 18. **Choosing on
byte count alone would have picked 8%.** The exact mapshaper command lives in
`build_egypt_map.py`; mapshaper stays offline tooling and its output is
committed, so the Python-and-static-hosting budget is unchanged.

## Declined, with reasons

### ECharts — measured at three times its stated weight

§1b budgets ECharts at "~110 KB gzip". No shipped dist matches that:

| Build | Gzip |
|---|---|
| `echarts.min.js` | 335 KB |
| `echarts.common.min.js` | 219 KB |
| `echarts.simple.min.js` | 156 KB |
| Chart.js, already vendored | 70 KB |

The 110 KB figure implies a tree-shaken custom build, which needs a bundler the
no-build-step rule forbids. **ECharts is deferred, not rejected.** Its real case
is §3 concept 4's trade arcs, which need `lines` with `effect` and which
Chart.js genuinely cannot draw. Pay the 156 KB then, alongside the sourced OEC
dataset that concept needs — not on the strength of a chart the data cannot
support.

### Concept 8's bar race — the data cannot carry it

`tourism_annual` holds seven years. Arrivals exist for 2023, 2024 and 2025 only.
And 2021 revenue is not missing, it is **disputed**: the Tourism Ministry stated
more than $13bn, independent trackers put it near $3–4bn, a gap of three to four
times that nobody has reconciled.

A bar race needs a value per frame. Inventing four is fabrication; drawing
through 2021 smooths a dispute the data itself flags. What shipped instead: the
year is shaded and labelled *on the chart*, and all seven years are published as
a table beside it with both 2021 claims stated. Zero new bytes.

### Concept 6, capitals through time — NOT BUILT, and here is exactly why

This is the one to read before promising it to anyone.

| Needed | Status in the repo |
|---|---|
| Capital → period mapping | **Absent.** The only `capital` column across 62 tables is each governorate's modern administrative seat |
| Coverage −3100 to 2026 | `historical_eras` starts at **−305**. The pharaonic millennia are not in it |
| Coordinates | Memphis, Tanis, Alexandria and Luxor/Thebes are in `geo-places`. **Amarna and the New Administrative Capital are not** |
| Chronological certainty | **All 45 of 45** pharaohs already carry an explicit certainty caveat |

That last row settles it. This knowledge base flags uncertainty on every single
reign, and the concept asks for a confident line from Memphis to the New Capital
across three thousand contested years. Memphis and Thebes served as dual seats
for long stretches, Itjtawy's site is debated, and Tanis is routinely conflated
with Pi-Ramesses. Any tidy scrubber would be a narrative wearing this site's
citation styling.

**What IS buildable** is the same idea across the period the repo documents:
Alexandria (Ptolemaic, from −305), Fustat (639), Cairo (founded 969), and the
New Administrative Capital (seat of government since 2024). Four capitals, real
dates, three of four already carrying coordinates. A genuine map with a
scrubber — it simply is not three thousand years long.

**To build the full version**, someone must first commit a cited capitals
dataset with dates, coordinates and an explicit uncertainty field per entry.
That is a data task, not a charting task, and it needs network access this
sandbox does not have.

## Traps confirmed against the repo

- **`L.canvas()` silently kills every transition.** Present today only on the
  Atlas health points, so it does not bite — but the colour tween depends
  entirely on Leaflet's SVG renderer, and this is the exact flag someone
  optimising later will reach for. Noted in `egybi.css` where they will meet it.
- **A canvas is invisible to `contrast.js`.** It reads the DOM, so text drawn
  into a chart canvas is never measured. The disputed-year label was computed by
  hand at 6.63:1. Any future canvas text needs the same treatment.
- Nominatim, OSMF tiles, EOX and Google Maps are used nowhere. Clean.

## Still open

- `Refresh Egypt data` went green after a retry-on-transient-status fix; issue
  #42 can be closed.
- The remaining brief — visitor layer with images and booking links, investor
  layer, scrollytelling, the animated flag, README and vault reorganisation — is
  larger than everything above and has not been started.
- §8 of the toolkit lists eight licence claims deliberately left unverified.
  None of them block anything shipped so far, because none of those tools are
  in use.
