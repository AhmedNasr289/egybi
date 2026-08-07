# Places & Data Stories

> Two pages built for the encyclopaedia direction on **2026-08-07**: **egybi.com/places.html**, an Egypt-wide gazetteer on a tile-free map, and **egybi.com/stories.html**, three scrollytelling data stories driven by a reusable engine. Back to [[Home]]. Related: [[The Pivot — From SQL Practice to Encyclopaedia]], [[Egypt Atlas — Geospatial Service]], [[Cairo Street Report Card]], [[Frontend & Design System]], [[Automation & CI Pipelines]].

## Why these two and not one

The pivot left a gap the Atlas doesn't fill. The Atlas answers *how do the 27 governorates compare* — it is a choropleth, and a choropleth's unit is an administrative polygon. An encyclopaedia of Egypt for a visitor also has to answer *what is actually there*, which is a question about points, not polygons. That's Places.

Stories is the other half: the Atlas and Places both show a reader data and leave them to draw the conclusion. A **موسوعه** that only ever does that is a reference work, not a readable one. Stories makes the argument explicitly, with the map moving as the reader reads.

---

## Places — the gazetteer

**757 places** across four kinds, from OpenStreetMap via Overpass: **335 settlements** (`place=city` / `place=town`), **29 airports** (`aeroway=aerodrome` carrying an `iata` tag) and **393 archaeological sites** (`historic=archaeological_site`). Built by `build_places()` in `backend/pipeline/fetch_geo_layers.py`, shipped as `site/data/geo-places.json`, rendered by `site/assets/places.js`.

Tile-free vector Leaflet, same as the Atlas and the street report card: governorate outlines from the bundled `EGYBI_EGYPT_GEO`, points from a JSON file in this repo, **zero runtime calls to any map provider**. Layer toggles per kind, free-text search, a governorate filter, and a detail panel per place. Each place's governorate is **computed by point-in-polygon** rather than read from a tag, because OSM's `addr:*` coverage on these objects is patchy and inconsistent while the boundary geometry is reliable.

### What the page refuses to do

It does not sort places into "oases", "Red Sea resorts" or "canal cities". Those groupings would be *ours* rather than the data's, and the moment they sit next to sourced figures they read as sourced too. A place shows what OSM records — kind, names in English and Arabic, coordinates, IATA code where present — plus the computed governorate. The geography a reader wants is visible on the map, which is where geography belongs.

### The honesty framing, which is the same one the Atlas uses

Every count is the **geographic pattern of what the OSM community has mapped**, never an official total. This is stated in the JSON's own `note` field and on the page, not tucked into a footer. Two specific disclosures:

- **Population.** Only **94 of 335** settlements carry a `population` tag. That tag is community-maintained and often years out of date, so it is shown only where OSM has one and labelled as an OSM tag, not a census figure. The alternative — filling the other 241 from anywhere — would be exactly the back-filling the cited-data rule forbids.
- **Antiquities are not a heritage register.** 393 mapped archaeological sites is a mapping density, not a count of Egypt's archaeology, and the page says so.

### The floors, and how they were set

The layer publishes only above `{"settlement": 220, "airport": 18, "antiquity": 250}`. These were **calibrated against an observed run** (335 / 29 / 393), not guessed — roughly two-thirds of a healthy result, low enough that ordinary Overpass variance and OSM churn never trip them, high enough that a truncated or partially-failed query cannot pass as a real one. A floor picked before you have seen a good result is a number with no evidence behind it.

### The coverage self-check, and the mistake it caught in me

`build_places()` now tests the result against a `BENCHMARK` list of 22 well-known Egyptian cities and ships the outcome as `coverage_check` in the JSON, so a future run that quietly loses half the Delta is visible in the data file itself rather than only in a log nobody reads.

Writing it, my first version checked each benchmark name as a **substring across all three kinds**, and reported Ismailia missing. It wasn't — it is present as *Al Ismailiyya*, and a loose check on the wrong subset had produced a confident wrong absence. Corrected to check settlements specifically and to allow for OSM's transliteration variants. The genuine absences from `place=city`/`place=town` are **Mansoura** and **Sohag**, which are tagged differently upstream; that is recorded rather than papered over.

This is the second time on this project that a **check** rather than the thing being checked was the bug. It rhymes with the streets note's *always check the tag family your successes live in before declaring an absence*.

---

## Stories — the scrollytelling layer

`site/assets/scrolly.js` (~4 kB) is the engine; `site/assets/stories.js` and `site/stories.html` are the first three stories using it.

### The design rule that decided everything

**The article is the source of truth and the map is an enhancement of it.** Turn JavaScript off and you get a readable article; leave it on and the map illustrates it as you go. A story that becomes a blank page without JS is not an encyclopaedia entry — it is a slideshow with prose stuck to it — and the engine is built so that cannot happen: every step is an ordinary `<section>` containing ordinary text, and the map is decoration layered on top.

Verified, not asserted. With JS off: **12 steps present, 6,536 readable characters, prose and source lines intact.** With JS on: 3 scrolly blocks, 12 steps, 3 maps, 87 rendered paths, every computed figure filled, **zero external requests**.

### The API

`EGYBI_SCROLLY.register(graphicId, steps, target)` binds a set of named step handlers to a graphic; `.setTarget()`, `.goTo(map, latlng, zoom)` and `.reduced()` are the helpers a story uses. Activation is an `IntersectionObserver` with `rootMargin: '-45% 0px -45% 0px'`, so a step becomes current when it reaches the middle of the viewport rather than the edge — the edge version fires while the reader is still on the previous paragraph.

**Accessibility is in the engine, not bolted on per story.** Every step is focusable; arrow keys, Home and End navigate; the maps are `aria-hidden` because they repeat what the prose already says, so a screen-reader user gets the argument once rather than twice; and `prefers-reduced-motion` is honoured by jumping the map instead of animating it, which is the setting's actual intent — not "no map".

### The three stories

Every figure is **computed in the browser** from data already in the repository — the bundled governorate boundaries with their CAPMAS attributes, `geo-health.json`, `streets-districts.json`. Nothing is typed in as a literal, which is what stops these numbers drifting away from their source the next time a pipeline runs. Computed on the current data:

| Story | The argument | Figures it computes |
|---|---|---|
| **The ribbon** | Egypt is not a country the size of its map | 106,668,704 people; the 10 densest governorates hold half of them on **2.4%** of the land; 5 sparse governorates are **77.9%** of the land and **1.9%** of the people |
| **Where the hospitals are** | Facility distribution follows the ribbon, not the borders | **963** mapped health facilities; a **143×** spread from South Sinai to Beheira |
| **Six ways to build a street** | Planning eras leave a measurable geometric signature | the street report card's districts, their entropies and dead-end shares |

The health story leads with *this is not a map of hospitals, it is a map of what has been mapped* — the same OSM caveat as everywhere else, placed **before** the number rather than after it.

---

## Districts, and the country check that came out of them

The street report card's district list grew from 6 to **10** in the same pass: **Luxor**, **10th of Ramadan**, **Sheikh Zayed** and **New Alamein** joined, chosen from a read-only Nominatim probe rather than guessed. Fourteen other candidates were **dropped with the reason recorded in `DISTRICTS`** — seven resolved to a whole governorate (Aswan came back as 57,962 km²), and Zamalek, the New Administrative Capital, Gamaliya and Historic Cairo have no OSM polygon at all.

Probe round 4 also produced the failure the area check could not catch. Three Arabic queries returned polygons of an entirely plausible size in **the wrong country**:

| Query | Resolved to | Area |
|---|---|---|
| `شبرا` | **Riyadh**, Saudi Arabia | 4.70 km² |
| `المنشية` | **Kairouan**, Tunisia | 1.17 km² |
| `الأقصر` | **Liberia** | 108,500 km² |

The first two sail through a 1–900 km² guardrail. So `resolve_boundary` now also checks the resolved polygon's **centroid against Egypt's bounding box** and logs `NOT IN EGYPT` with the offending `display_name` when it fails. Verified against all five probe cases before shipping.

The general shape: **a plausibility check on one dimension is not a plausibility check.** Area answers "is this the right *kind* of thing"; it says nothing about where on Earth it is.

## Automation

Places rides `.github/workflows/build-geo-assets.yml` with the Atlas layers — manual-only, per-layer keep-last-good, floors as above. Stories has **no pipeline at all**: it computes from files other pipelines already publish, so it stays current for free and has nothing of its own to break.

## Verified

Full-site pass in Chromium across all 15 pages: every page 200, **zero console errors, zero horizontal overflow at 375 px**, and no external requests from any map. Stories verified twice, once with JavaScript and once without, as above.
