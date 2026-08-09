# Frontend & Design System

Rebuilt 2026-07-18 into a disciplined multi-page site with a single shared design system. Location: `C:\dev\perankh\site`. Deploys to egybi.com as static files (+ the PHP API for data).

## The color-identity fix (the point of this pass)

The earlier single page had "too many colors, no identity" — carnelian, malachite, lapis, multiple sand shades and dark treatments all competing. Fixed with a strict system in `assets/egybi.css`:

- **Structural color = Egyptian Blue** (`#17408B`) — headings, links, primary data, nav. Never decorative.
- **The one accent = Gold** (`#C9A227` / bright `#E7C64C`) — CTAs, kickers, highlights, dark-surface accents. The *only* accent.
- **Two surfaces only** — **Papyrus** (`#F6EEDC` light) and **Kemet** (`#14110C` dark). Every section is one or the other; they alternate. No third/fourth background competing.
- **Functional-only colors** — malachite green (success) and carnelian (error/warning) appear *only* for state feedback (e.g. a wrong-answer message, the Suez-collapse bar), never as section backgrounds or theming.
- **Type** — Cinzel (monumental, for all headings + the wordmark) + Inter (body).

The result reads as one coherent identity: blue + gold on papyrus/kemet, everywhere, on every page.

## Structure (multi-page, shared system)

- `assets/egybi.css` — the entire design system (one file, linked by every page).
- `assets/egybi.js` — shared behavior: mobile nav toggle, active-link highlighting, AOS init, hero particles, an `escapeHtml` helper.
- `favicon.svg` — the ankh mark.
- **5 pages**, each with the shared sticky header + footer:
  - `index.html` — home hub: hero (Typed.js tagline, gold particles), animated CountUp stat band, the competitor "gap", a tracks teaser, a featured tourism chart, the live SQL demo, an identity teaser, and the waitlist.
  - `explore.html` — the **data explorer**: 8 real BI charts (GDP, GDP composition, Suez revenue with the 2024 collapse highlighted, exports doughnut, tourism combo, population growth, energy mix, top governorates) + a sourced historical timeline + megaproject cards. The richest showcase of the knowledge base.
  - `tracks.html` — the 9-track curriculum in detail, each with its book reading list and real Egyptian-history sample challenges.
  - `practice.html` — a fuller **SQL playground**: 4 real tables loaded client-side (pharaohs, monuments, tourism, suez), clickable challenges that load a starter query, schema chips.
  - `about.html` — the identity/story: the House of Life, Ibi the mascot (placeholder SVG), the rank ladder, 8 badges, and the accuracy principle.

## Libraries (the "make it attract eyes" ask, kept tasteful)

All via jsdelivr CDN, self-contained, degrade gracefully, and respect `prefers-reduced-motion`:
- **AOS** — scroll reveals.
- **tsParticles** — subtle gold-dust on dark heroes.
- **Typed.js** — rotating hero tagline.
- **CountUp.js** — animated stat counters (real cited figures).
- **Chart.js** — the 8 explore-page charts + the home teaser chart.
- **sql.js** — the in-browser SQL engine, loaded **on demand only**. It is not on the home page (the hero sandbox was removed on 2026-08-08) and the practice section is retired. It loads when a reader presses *Query this yourself* on one of the three tables marked `data-query` (two on Explore, one on the Atlas), and from a script tag on the case study. Every other page ships without it.
- **Google Fonts** — Cinzel + Inter.

## Verified live (2026-07-18)
Every page checked in-browser: CSS variables load, all charts render with size, the SQL engine runs and challenge-clicks execute real JOINs, no console errors, no horizontal overflow at desktop or mobile, active-nav highlighting works, mobile hamburger nav works.

## Wiring to the backend (optional, later)
The counters and charts currently use real figures baked in (so the site works standalone before the API is deployed). `index.html` has an `EGYBI_API_BASE` constant; once the API is live, the widgets can fetch from `/charts/highlights`, `/charts/tourism`, `/charts/population`, `/charts/energy`, etc. — the API already returns exactly those shapes. See [[Backend & Knowledge Base]].

## The wayfinding system (2026-07-20) — the fix for "I feel lost"

Visitors kept saying the site made them feel lost. The cause was never the colours — it was
missing orientation: long pages (Explore's ~23 chart sections, About's ~9 bands) had no
"where am I / where next", and anchor jumps landed *behind* the sticky header because nothing
set `scroll-margin`. Fixed once in the shared assets, then applied to every page, rather than
patching one page at a time.

**Built once (`assets/egybi.css?v=11` + new `assets/wayfinding.js?v=1`, on all 9 pages + the
135 generated pages):**
- **`--header-h` / `--subnav-h` tokens.** `wayfinding.js` measures the sticky header (and the
  sub-nav bar, if present) and publishes their heights as CSS vars. Global
  `section[id] { scroll-margin-top: calc(var(--header-h) + var(--subnav-h) + 14px); }` makes
  **every** `#`-anchor on the site clear both bars — the bug that made even the old tracks
  jump-nav drop headings under the header. Verified in Chromium: a clicked chip lands the
  target at ~135px top vs a 121px bar bottom, i.e. just below the bars, desktop and mobile.
- **`.on-this-page`** — a sticky "On this page" sub-nav that pins directly under the header.
  `wayfinding.js` builds it from the page's own `section[id][data-nav]` (one chip per section,
  labelled by the short `data-nav` attribute) and runs a rAF-debounced scroll-spy that adds
  `.current` + `aria-current` to the chip you're reading, auto-scrolling the chip into view on
  mobile. A page opts in with one empty `<nav class="on-this-page" data-wayfinding>` mount after
  its hero; if it has fewer than two `data-nav` sections the mount removes itself. It replaced
  the old per-page inline `.jump-nav` on `tracks.html` (which was not sticky, so it vanished
  inside the long "9 tracks" block).
- **`.page-intro`** — a one-line "what this page is for" style for the hero.
- **`.next-steps` / `.ns-grid` / `.ns-card`** — a consistent end-of-page "Where to next" block,
  so pages that used to dead-end into the footer (Prices, Blog, Privacy, Practice, Explore) now
  route forward.
- **`.cluster-head`** — a slightly larger heading for the first section of a group, so Explore's
  long scroll reads as ~10 labelled clusters instead of 23 identical bands.

**Applied:** Explore (23 sections grouped into 10 sub-nav clusters + Sports split into
Football/Handball sub-blocks), Tracks (inline jump-nav → shared sticky sub-nav), Practice
(Solve / All-123 sub-nav, light→light-2 rhythm, the 123-link index re-ordered easy→hard per
sector with counts), About (the one dark Ibi/Ranks/Badges section split into three linkable
sections + full sub-nav), Community (five-section sub-nav), plus purpose lines / next-steps /
heading-hierarchy fixes on Prices, Blog and Privacy (its policy `<h3>`s promoted to `<h2>`).
The global 8-item top nav was deliberately left unchanged (on-page wayfinding does the work;
the header is hand-duplicated in every file and the generated pages depend on it staying static).

**Invariants preserved** (checked in a headless-Chromium sweep of all 9 pages + a generated
page, desktop + 375px mobile): the glyph layer still paints every `[data-glyph]` with its
tooltip/aria-label; the AOS/`data-mo*`/particle motion hooks are untouched; the 123 challenges
still run; no real console errors; and no *new* horizontal overflow (the pre-existing 73px
`scrollWidth` artifact on mobile Home is the newsletter honeypot at `left:-9999px` — identical
on pristine `git HEAD`, clipped by `body{overflow-x:clip}`, `scrollLeft` immovable — not
introduced here).

Any new page gets the whole system for the cost of: a `.page-intro` line, `id` + short
`data-nav` on each `<section>`, one `.on-this-page` mount, and a `.next-steps` block.

## Related
- [[Backend & Knowledge Base]] — the data + API these pages surface
- [[Brand & Creative Identity]] — the research the palette and mascot are drawn from
- [[Improvement Roadmap]] — where this sits (frontend + architecture areas advanced)

## Accessibility baseline (2026-08-08)

Everything below is checked by `backend/verify/a11y2.js` and measured in a real
browser rather than asserted. Each item is here because it was found missing.

- **`<main id="main">` on every page.** There was none anywhere, so a screen
  reader's "jump to main content" did nothing on all 152 pages. Added to the
  shared shell and to `build_static_pages.py`, so generated pages carry it too.
- **A skip link as the first focusable element.** Without it a keyboard user
  tabbed through thirteen navigation links on every page before reaching the
  text. Off-screen at `left:-9999px` until focused — the standard idiom, and the
  reason the overflow checker has to exempt it.
- **`aria-label="Main"` on the primary nav**, which previously announced itself
  as an unnamed "navigation", indistinguishable from the on-this-page bar
  beneath it that always had a label.
- **Heading levels never skip.** Footer column headings were `<h5>` immediately
  after content ending at `<h3>`; they are `<h2>` with a `.foot-h` class
  carrying the size, because a tag should not lie about the outline to get a
  font size.
- **Every interactive control changes visibly on focus.** Three did not — the
  active sub-nav chip and the active map and metric toggles — because their
  focus rule set `outline:none` plus a border colour the active state had
  already set, and the active rule won on declaration order. The fix is an
  explicit ring that survives the active state.
- **A print stylesheet.** Chrome, hero backgrounds and ad slots are dropped, and
  link targets are spelled out in the printed text.
- **The maps can be operated without a mouse.** The Atlas, the Street Report
  Card and the Explore choropleth were each created with Leaflet's
  `keyboard: false`, so they could be panned and zoomed by mouse and by nothing
  else — on a site where the map *is* the content. Leaflet binds arrow-key pan
  and `+`/`-` zoom only while the map holds focus, so enabling it does not
  hijack page scrolling; `scrollWheelZoom: false` is what guards that, and it
  stays off. The Stories map keeps `keyboard: false` because it also has
  `dragging: false` — it is a static illustration with nothing to operate.
- **Six interactive maps were marked `role="img"`.** That makes an element a
  *leaf* in the accessibility tree: every zoom button and region inside it was
  invisible to a screen reader, and the whole map announced as one picture.
  They are `role="region"` with their existing labels now. The elevation
  profile, the Ibi portrait and the price sparklines keep `role="img"` — those
  genuinely are single graphics.

### Names on the maps (`mapkit.addLabels`)

Every map on the site was an unlabelled silhouette until 2026-08-09. These maps
are tile-free, so there is no basemap underneath carrying the names a reader
expects — the only way to learn which shape was Qena was to hover it, which is
no help at a glance and none at all on a phone. Reported plainly as "I can't see
the maps well", and correct.

Labels are one shared layer in `mapkit.js`, used by the Atlas, Places, Invest,
Streets and all four Stories maps. Four decisions inside it are worth knowing
before changing anything:

- **Gated per feature, not globally.** A polygon is named when its own shape is
  wide enough *on screen* to hold the text; a point is named once the reader has
  zoomed past the level where clustering hands over. Drawn at country zoom the
  packed Delta governorates overlap into a smear and the labels make the map
  worse than none — so Matrouh and New Valley are named immediately and
  Qalyubia appears when you zoom into the Delta. On Places the point threshold
  is deliberately the same number as `disableClusteringAtZoom`, so a bubble
  reading "44" becomes forty-four names at exactly the point it stops being a
  count.
- **Their own pane, not tooltips on the features.** The first version bound
  permanent tooltips, which meant unbinding the rich hover card the Atlas
  already had and rebinding it whenever the label went away. Two things
  fighting over one slot; the hover card lost.
- **Greedy collision avoidance, with the registry shared across every label
  layer on a map.** Around Cairo, settlements + museums + airports produced 154
  labels overprinting into a grey smear. A per-layer registry would have let
  settlements check against settlements while the categories overprinted each
  other freely, which is the same pile in a different arrangement.
- **Position is a centroid computed from the ring's coordinates.** A
  bounding-box centre puts a coastal governorate's name out in the sea, and
  Leaflet's `getCenter()` — the obvious fix — throws before sub-layers attach
  and took the whole Atlas to zero rendered paths.

Also from that round: Leaflet snaps to whole zoom levels, so `fitBounds` drops a
full step when the ideal zoom sits just under an integer. The Atlas at 375px
filled 70% of its box. `zoomSnap: 0.25` took it to 86%, measured.

Three more, added 2026-08-09 after looking at the maps again and finding the
labels were the second problem, not the first:

- **A ceiling as well as a floor (`maxZoom`).** Two label layers on one map have
  to hand over to each other. Governorates are enormous polygons, so they always
  clear `minPx` and — being placed first — win every collision; without a
  ceiling, zooming in for street-level names got "Giza" holding the middle of
  the screen instead. Places names governorates to zoom 8 and gazetteer places
  from zoom 9, so the two never compete.
- **Priority, because the winner of a contested forty pixels is an editorial
  decision.** It was being decided by the order the JavaScript happened to run
  in. The investor map builds its base before it fetches its projects, so the
  governorates placed first and the map answered "Red Sea" where the reader had
  asked "which project". `priority` states the ranking so it survives someone
  reordering the setup.
- **One pass over every layer, never a layer on its own.** Each layer used to
  reset the shared registry and refresh itself on creation, which meant the last
  layer built placed its labels against an empty registry. Two labels in the
  same pixels on first paint, tidying themselves up only if the reader panned.
  The map now owns the list of label layers and one pass replays all of them in
  priority order — on add, on move, and on remove.

And one measurement bug worth remembering: the collision box was computed
**centred** while a point's label renders **offset to the right of its dot**
(`.mk-label-pt`'s `translate(9px, -50%)`). At 30 characters the reserved
rectangle and the drawn one overlapped by about a third, so the registry was
carefully keeping two labels apart in a place neither of them was.

### The coastline (`mapkit.outline`, `mapkit.landStyle`)

The labels were not why the maps were hard to see. **Nothing was drawing the
coast.** Measured against the map background (`--papyrus` `#F6EEDC`):

| what | colour | contrast |
|---|---|---|
| the country outline | `#FFFFFF` | **1.15:1** |
| base land fill, Places/Invest | `#DDE3EC` | 1.12:1 |
| base land fill, Stories | `#E4E8EF` | 1.06:1 |
| lightest choropleth step | `#E3EAF5` | 1.05:1 |

A white boundary at 1.15:1 is not a faint line, it is the absence of one, so the
only thing separating Egypt from the sea was a 1.12:1 fill edge. The country
read as a pale slab with cluster numbers floating on it.

Two different problems, two answers:

- **Internal borders** — `#6E86A8`, one colour for every base-land layer,
  replacing four drifted copies of the same style object. 3.22:1 against the
  page and 3.73:1 against `#0E2A5E`, the darkest choropleth step, so it carries
  over any fill this site puts under it and clears WCAG 1.4.11's 3:1. Both
  numbers are the constraint: darker wins against the page and vanishes into the
  deep-blue end of the ramp.
- **The exterior** — no single stroke can do this on a choropleth. Against the
  six ramp steps `#6E86A8` runs 3.08, 2.22, 1.50, **1.05**, 1.83, 3.73. So the
  coast is a halo *under* the fills: the same geometry, unfilled, thick, in a
  pane below the overlay pane. The internal borders of that copy are covered by
  the opaque fills above; only the outside edge survives. No dissolved ring, no
  second geometry file, no build step, so it cannot fall out of sync with the
  boundaries it traces. The cost is that below full fill opacity the covered
  internal borders show faintly — at the 0.9–0.95 this site uses, a hairline at
  a tenth strength.

Cost of the whole round: **+3,667 bytes gzipped** across the six map files.

### The checker that should have existed first (`backend/verify/map-contrast.js`)

Twenty-five mutation-tested checkers ran green through all of the above. That is
worth sitting with: `contrast.js` walks **text** nodes, an SVG stroke is not
text, and so nothing on this site ever looked at the one colour pair that
decides whether a tile-free map is a map at all. A defect found by eye that no
tool can catch comes back.

The rule is deliberately narrow: **every page that draws Egypt must paint a
country-wide stroke clearing 3:1 against its map container's own background.**
Not every stroke — a hairline between two filled governorates is legitimately
light, because the fills either side already differ. The coast has no fill on
its far side and has to carry itself.

Two things the first version got wrong, both caught by running it:

- **"Country-wide" is load-bearing.** Asking for *some* stroke over 3:1 let
  Streets pass on the 1.5px gold ring around one selected district while its
  coastline sat at 1.15:1. Only strokes covering 15+ of the 27 governorates are
  eligible; accents are printed as context, never counted as evidence.
- **Opacity is measured, not assumed.** The halo is drawn at `stroke-opacity`
  0.62, so its raw colour is not what a reader sees. Compositing over the
  container background first is the difference between testing the CSS and
  testing the picture.

Running it found two maps the eye had missed: **`visit.html`** (best
country-wide stroke 1.63:1 — the outline was never added there) and
**`streets.html`** (still white at 1.15:1, passing only on that gold accent).
Both fixed. All eight surfaces now measure 3.22–9.29:1.

Its two mutation cases are worth reading together, because the first one failed
at first and the checker was right. Whitening the halo on **Places** proves
nothing: Places draws two country-wide boundaries, so the map still has an
edge. The case only reproduces the shipped defect on **Explore**, whose
choropleth strokes its governorates in near-white `#FCF8EC` at 1.09:1 — the
ramp fills carry the internal borders there, so the halo is the only thing
drawing its coast.

### Two things that will trip up the next person measuring this

**`:focus-visible` does not match a programmatic `.focus()`.** Diffing computed
style after `el.focus()` reports "no focus ring" on every control that uses it,
which is all of them. Drive real `Tab` presses.

**These focus styles transition over 150 ms.** Reading the computed style
immediately after `Tab` catches the start of the transition, when every property
still holds its resting value — the same class of mistake as scrolling faster
than AOS's throttled handler, or reading a CountUp mid-animation. Wait for the
transition before you read.


## The map kit (`assets/mapkit.js`)

Six map surfaces lived in five files, each constructing its own Leaflet instance
with its own options. That is not a tidiness complaint: it is why three of them
were pannable by mouse and by nothing else while two were fine, and why fixing
one never fixed the others. `mapkit.js` owns the parts that should never differ.

**Controls are real buttons.** Leaflet's own zoom control is `<a href="#">`,
which a screen reader announces as a link to nowhere. Every control the kit adds
is a `<button>` with an `aria-label`, in the tab order, firing on Enter and
Space without extra handling. Each map gets zoom in/out, reset-to-extent,
fullscreen, and a scale bar.

**Features are focus stops.** Leaflet paths are SVG and are not tabbable, so
every choropleth on this site could be read with a mouse and by no other means.
Each governorate and district is now `tabindex="0"` with `role="button"` and its
name, and Enter runs the same handler a click does — deliberately the same
function, so the keyboard path and the mouse path cannot drift apart.

**The locator is drawn, not fetched.** A minimap normally means a second tile
layer, which would put a provider call back into the one site whose whole point
is not making one. The inset draws the country outline once into an SVG from the
GeoJSON the page already holds and moves a rectangle over it. It hides itself
when the viewport already shows the whole country, and it is `aria-hidden`
because it repeats what the main map already says.

**Flying has a still twin.** `flyTo` becomes `setView`, `flyToBounds` becomes
`fitBounds`, and the destination is identical. Reduced motion removes the
travel, never the arrival. Leaflet's `inertia` goes too — a map that keeps
gliding after the pointer stops is motion nobody asked for.

### Chosen and rejected

| Wanted | Chosen | Why not the obvious plugin |
|---|---|---|
| Clustering | Leaflet.markercluster 1.5.3, MIT | Nothing rejected — Places draws 757 points and the Delta is unreadable without it. |
| Fullscreen | Native Fullscreen API, ~15 lines | Leaflet.fullscreen is ~4 KB and years without a release to wrap an API this small. |
| Minimap | Hand-drawn SVG inset | Leaflet-MiniMap expects a second tile layer. |
| Animation | Motion One, already vendored | Nothing new to add. |
| Faster vectors | Not needed | Leaflet.VectorGrid earns its place at tile scale; 27 governorates do not justify it. |

**Places clusters; the Atlas health layer does not.** 757 named places collide
badly — at country zoom a dozen Delta towns render as one dot with eleven
unclickable underneath. The Atlas's 963 health facilities look like the same
problem and are not: that layer is a canvas renderer whose radii, halo weights
and fill opacities were tuned against every choropleth bin beneath it, and
clustering would throw that away to solve a problem it does not have. It stays
canvas.

**The Stories maps stay inert, on purpose.** They illustrate a sentence that
already states every figure they encode. Interactivity there would add a focus
stop per paragraph for a reader who gains nothing by landing on it, and would
invite panning an illustration off its subject. The reasoning is written into
`stories.js` so the next person changes it deliberately or not at all.
