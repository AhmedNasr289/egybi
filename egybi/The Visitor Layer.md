# The Visitor Layer

> **egybi.com/visit.html** — the tourism entry point, built **2026-08-07** from the only sources that let every figure carry a citation. Back to [[Home]]. Related: [[Technology Rulings — What Was Declined and Why]], [[Places & Data Stories]], [[Egypt Atlas — Geospatial Service]], [[Automation & CI Pipelines]].

## The brief, and the gap between it and what could honestly be built

The ask was tourism: beautiful places, descriptions, 3D tours, cinematic drone footage, everything wired together. Most of that cannot be built here — not for lack of skill but because the material does not exist under a licence that permits it, and inventing the material would destroy the thing that makes the rest of the site worth reading.

So this page is the version of that brief which can survive a source check on every line. It is smaller than the brief and more useful than a version that could not be defended.

## What it does

**Eighteen sites** a first-time visitor is realistically choosing between, on the same tile-free vector Leaflet as the Atlas, Places and the street report card — **zero runtime calls to any map provider**, measured with request interception rather than assumed.

The centrepiece is a **month picker**. Choose a month and the map recolours and the table reorders by that month's mean daily maximum. Heat is the one variable that genuinely reshapes a trip to Egypt, and the country spans nine degrees of latitude, so "is it hot" has a different answer in Alexandria and Abu Simbel on the same day. Each site opens a twelve-month bar of its own temperatures, its elevation, and whether UNESCO lists it.

The UNESCO flag is **cross-checked against the fetched heritage file** rather than trusted from our own table. If the two ever disagree the fetched one wins, because that one has a source.

**The temperatures check themselves, and the check is on the page.** The mean daily maximum was published wrong twice — `T2M_MAX` means three different things across POWER's three endpoints, and two of them are not a mean daily maximum. So the build now compares every computed figure against Egypt's published station normals from the WMO's World Weather Information Service, and refuses to write the layer if the comparison fails. The first full run: **mean bias +0.15 °C across 168 site-months, 125 of them within 2 °C**. The whole comparison — both gates, all fourteen site-station pairs, the elevation caveat on Saint Catherine, and the reason the largest gaps cluster over the irrigated Delta in summer — is printed in a *How it was checked* section. A validation a reader cannot see is one they have to take on trust.

## The two refusals, which are the point

**It describes no site in prose.** There is no sourced, licence-clear dataset of what Karnak feels like at dawn. Writing that would mean inventing atmosphere and setting it beside measured temperatures, where a reader would reasonably take it to be equally sourced — and they would be right to, because the page gives them no way to tell the two apart. So each place shows what the data holds and stops. *A visitor is better served by a real August temperature than by an adjective.*

**It makes no recommendation.** "The best time to visit" depends on heat tolerance, budget and how much you mind crowds, none of which are in any dataset. The measurement is shown; the judgement is the reader's. The colour bands are labelled in °C rather than as good and bad, because 38 °C is unbearable to one visitor and unremarkable to another and the data cannot tell which one is reading.

A third, smaller one: the page states plainly that **the choice of eighteen sites is an editorial call**, not something derived from data. Egypt has hundreds of significant sites; Places holds every one OSM has mapped.

## The sources, and what they are not

| Layer | Source | Licence |
|---|---|---|
| Climate normals | **NASA POWER** climatology (MERRA-2 reanalysis) | Public domain (US Government) |
| Elevation | **NASA SRTM 30 m** (SRTMGL1 v003) via Open-Topo-Data | Public domain (NASA/USGS) |
| World Heritage status | **UNESCO World Heritage Centre** | Already in `geo-heritage.json` |

**The climate figures are modelled, not observed**, and the page says so where a reader will see it rather than in a footer. POWER derives long-term monthly means from the MERRA-2 reanalysis. That is excellent for *how hot is Aswan in July* and wrong to quote as *the temperature on the day you visit*. A single hot week does not appear in them at all.

**POWER's `-999` fill value is mapped to null**, never written through. A missing reading rendered as a number would put −999 °C on a page about holidays, and more subtly, a fill value that survives into a chart looks exactly like data.

**SRTM measures the reflective surface**, so in built-up or densely vegetated places the figure sits slightly above bare ground. Stated on the page.

## Why there is no flythrough, in the page's own words

A cinematic aerial tour would have to be either footage somebody shot — which we do not have — or frames generated by a model, which would be invented terrain sitting beside measured figures on the same page. So the terrain section is the honest version of the same information: **the actual ground elevation at each site's own coordinates**, from the Shuttle Radar Topography Mission's 30 m survey. Every bar is a radar measurement of real land.

It looks like a data visualisation rather than a photograph. That is the point — it can carry a source line. The full ruling, including the supplied Veo 3.1 workflow and the three separate constraints it fails, is in [[Technology Rulings — What Was Declined and Why]].

**Updated 2026-08-08 — there is now a flight, over real ground.** A single elevation per site was the weak version of this answer: it says Saint Catherine is 1 586 m and leaves the reader to imagine the rest. The page now carries **five measured cross-sections**, sampled at up to 300 points each from the same SRTM model, with a slider that walks along the profile while a marker walks the line on a tile-free map. Every point is a radar reading with a latitude, a longitude and an elevation.

That is the flyover, built the only way it can be built inside the constraints. The imagery is licensed; the ground is not.

| Line | Length | Range | Median | What it shows |
|---|---|---|---|---|
| Across the valley at Luxor | 24 km | 68–258 m | 84 m | The floodplain is a flat 78–80 m run about 6 km wide, desert on both sides. That strip is where Egypt lives. |
| The Giza plateau edge | 14 km | 11–119 m | 24 m | The ground climbs 108 m from floodplain to scarp. The builders chose that plateau; they did not raise it. |
| Gulf of Aqaba to Saint Catherine | 53 km | 19–1 879 m | 1 262 m | Sea level to the Sinai massif in under an hour's drive. This is why the monastery is cold. |
| Siwa and the depressions | 198 km | −82–199 m | −17 m | Egypt's west falls below the sea, and stays there for most of the line. |
| The Nile, Cairo to Abu Simbel | 1 041 km | 11–366 m | 76 m | A thousand kilometres of river and the ground barely moves. |

**Quartiles are published alongside the extremes, and that is a correction.** The first Nile line used eleven coarse waypoints; straight legs between them cut across the Qena bend and put 400 m of Eastern Desert in the middle of a river profile. Twenty-three waypoints on the actual course fixed most of it — samples above 200 m fell from 99-in-200 to 38-in-300 — but straight legs still clip the terrace where the river meanders hardest. Rather than hide that, every transect now reports p25, median and p75. A min and a max describe the two most unusual points on a line and nothing about the rest of it.

**No autoplay, so nothing for reduced motion to suppress.** A dot moving on its own is exactly what `prefers-reduced-motion` exists to prevent, so there is none: the slider is the control, dragging behaves identically either way, and the profile already shows the whole line at once. Verified — reduced motion loses no rows, no chips and no function.

## Engineering notes

**One engine, not two.** The scrollytelling run reuses `scrolly.js` — the same IntersectionObserver engine the data stories use, with a six-step register call. A second engine would have doubled the accessibility surface for nothing.

**One request, not eighteen.** Elevation for all sites comes from a single batched call to a free public endpoint, for the same reason the street pipeline's amenity queries were collapsed: a free service deserves one request rather than eighteen, and its usage policy asks for exactly that.

**Floors expressed as a share, not a magic number.** `MIN_CLIMATE_SITES` is 75% of the site list rather than a literal, so adding a site cannot silently lower the bar. These coordinates are fixed and known-good, so a miss is the endpoint failing — never the data being absent.

**Honest placeholders rather than 404s.** Both layer files ship containing `generated: false` and an **empty** sites array, following the `streets-notes.json` precedent. They hold no figures at all. The page reads the flag rather than inferring absence from a failed fetch, and treats an ungenerated layer as *absent* rather than as a layer with nothing in it — otherwise it would paint an empty table that reads like a finding.

## Automation

`.github/workflows/build-visit-layers.yml`, **manual-only**. POWER's climatology is a multi-decade mean and SRTM is a fixed survey flown in 2000 that will not change again, so a cron would re-download identical bytes forever and hammer two free public services for nothing. Run it when the site list changes.

House guardrails throughout: keep-last-good per layer, non-zero exit on any partial build, `if: '!cancelled()'` commit staging only files that exist, push to `$GITHUB_REF_NAME`, failure notifier.

## Verified

Driven in Chromium **in the pre-data state**, which is the state that ships first: 27 governorate outlines drawn, 6 scrolly steps, 4 wayfinding chips, both empty-state messages shown, **zero console errors, zero 404s, zero horizontal overflow at 375 px, and zero external requests**.

The pipeline was also run with the network unreachable to prove the failure path: every endpoint retried with backoff, both layers reported skipped, and **zero files written** — so no fixture data exists that could be committed by accident.

## Open

**Resolved 2026-08-08 — the data exists.** All three layers built and are live: 18 sites of validated climate normals, 18 elevations, and 5 cross-sections. The path from empty state to real data took four runs, each one refused by the guardrail for a different and correct reason, and each refusal named the next thing to fix. That is what the guardrail is for.

**Still open.** The WMO source states no normal period for any of its six Egyptian stations, so the comparison is against an undated published normal. The page says so rather than filling in a plausible range. If a dated set can be found from an equally open source, the check gets sharper.
