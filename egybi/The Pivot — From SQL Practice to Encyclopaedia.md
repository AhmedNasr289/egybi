# The Pivot — From SQL Practice to Encyclopaedia

> EgyBI stopped being a SQL practice platform on **2026-08-07** and became an encyclopaedia of Egypt built on GIS and data storytelling. This note records what happened to the practice product, and why each decision went the way it did. Back to [[Home]]. Related: [[Challenge Engine & Data Pipeline]], [[Curriculum & Skill Tracks]], [[Automation & CI Pipelines]], [[Frontend & Design System]].

## The three decisions

The practice product was three separable things, and they got three different fates.

**The engine survives as infrastructure.** sql.js, the grading approach and the seeded SQLite database all stay. What changed is that they stopped being a product and became a feature: any table on the site can now be queried by the reader. *Every figure here is queryable* is an unusual claim for an encyclopaedia and it cost almost nothing, because the machinery already existed and had just been self-hosted.

**The curriculum is gone.** Nine tracks across three specialisations was the part that most directly contradicted an encyclopaedia of Egypt, so `tracks.html` is retired and the framing is stripped from every page.

**The 123 challenge pages keep their URLs and explain themselves.** They are indexed and were the site's only real search presence. Each one now returns **200** with a retirement notice rather than a 404 or a redirect.

## Why tombstones rather than redirects

`.htaccess` with `mod_rewrite` was already in use, so this was a choice on merit, not a limitation.

A 301 cannot carry an explanation. More importantly, 123 distinct pages collapsing onto ~10 section anchors is a **many-to-few redirect**, which search engines treat as a soft 404 and drop — losing the message *and* the equity. A 200 page with genuinely distinct content keeps ranking for its own long tail while routing the reader onward.

`practice.html` and `tracks.html` **do** get 301s, because neither has a unique subject worth preserving. Both files still exist as tombstones behind the redirect: if `mod_rewrite` is ever unavailable, the URL returns a real page instead of a 404.

Each retired page keeps the part that was always about Egypt rather than about SQL — the question itself and the sourced *did you know* note — and drops the schema, the starter query and the sibling-challenge links. Tombstones linking to tombstones is a crawl trap with nothing at the end of it.

## The sector map

Every challenge already carried a `sector`, so the onward link is data-driven rather than hand-curated: one dictionary, `SECTOR_DESTINATION`, in `build_static_pages.py`. Re-pointing a whole sector when new encyclopaedia sections land is a one-line change.

| Sector | n | Destination |
|---|---|---|
| History | 48 | `explore.html#timeline` |
| Economy | 14 | `explore.html#economy` |
| Demographics | 11 | `geospatial.html#governorates` |
| Agriculture | 9 | `explore.html#agriculture` |
| Education | 8 | `geospatial.html#map` |
| Sports | 6 | `explore.html#sports` |
| Art & Cinema | 5 | `explore.html#cinema` |
| Suez Canal + Logistics | 4 | `explore.html#logistics` |
| Science & Space | 4 | `explore.html#science` |
| Industry | 4 | `explore.html#industry` |
| Tourism | 3 | `geospatial.html#heritage` |
| Business | 3 | `explore.html#business` |
| Water | 2 | `explore.html#water` |
| Defence | 2 | `explore.html#defence` |

**Every destination is a section that exists today**, verified against the live anchors. A retired page pointing at a URL that 404s would be worse than leaving it alone.

## The query affordance

`site/assets/query.js` — about 4 kB, loaded everywhere, and its entire job is to put a button on the page.

The engine is ~655 kB of WebAssembly plus ~50 kB of glue. Most people arriving at a page about Luxor will never touch a query box, so making them download the engine anyway would tax the majority to serve the few. **Nothing loads until the button is pressed.** Verified in the browser: zero engine requests before the click, three after.

A table opts in with `data-query`, `data-query-sql`, `data-query-source`, `data-query-asof` and — where needed — `data-query-note`. The source and date are carried into the panel header on purpose: a query box showing numbers stripped of their provenance would quietly undo the one rule the whole site is built on.

The same reasoning applied to the homepage hero editor, which used to preload the wasm at high priority for every visitor. It now starts on the first Run.

## The trap worth remembering: partial coverage

Wiring the affordance surfaced a real honesty problem. **The queryable database is a curated slice, not a mirror of the site.**

| Table | In the sandbox DB | On the page |
|---|---|---|
| `governorates` | 10 | 27 |
| `universities` | 8 | ~20 |
| `unesco_sites` | 7 | 7 ✅ |

A reader pressing the button under a table of 27 governorates and silently getting 10 rows would reasonably conclude the query was broken — or worse, that Egypt has 10 governorates. So `data-query-note` was added, and the panel prints the coverage disclosure **above** the results rather than below, because you need to know the slice is narrower *before* you read numbers off it.

The generalisable rule: **an interactive affordance inherits the honesty obligations of the page it sits on.** Making data explorable does not exempt it from saying what it does and does not cover.

## What was explicitly NOT retired

- **`site/papyrus/` — The Papyrus newsletter archive.** The 12 pages there were nearly swept into the retirement as "story pages". They are the site's only long-form writing about Egypt, which is precisely what the encyclopaedia is built on. Retiring them would have deleted the strongest existing example of the new direction on the same day it was chosen.
- **`site/case.html` — The Vanishing Economy.** A data story that happens to use the SQL engine, not a challenge. It is the closest thing the site already has to the new storytelling format.
- **`site/assets/challenges.js`** — holds `EGYBI_SANDBOX_SQL`, and is a shared dependency of both the case and the new query affordance.

## Identity claims that had to change

The pivot is not just navigation. The site was declaring itself a SQL practice platform in places that matter for how it is understood:

- The homepage JSON-LD `Organization.description` and a `LearningResource` node naming `practice.html`.
- The homepage `<title>`, meta description and OG/Twitter cards.
- The hero: *"Write SQL against 4,000 years of Egypt"* and *"123 auto-graded challenges"*.
- `about.html`'s *House of Life for the data engineer* framing and its meta description.
- A stat card counting auto-graded challenges.
- `explore.html`'s timeline lead, which referenced "the platform's history challenges".

All rewritten. The `LearningResource` node became a `Dataset`.

## Verified

Driven in Chromium against a local server: retired pages render the notice with the correct per-sector destination and no starter SQL; the query affordance loads nothing until clicked, then returns rows with its citation and coverage note; Escape closes the panel and focus returns to the button; all 13 top-level pages return 200 with zero Practice/Tracks nav leftovers; the sitemap carries 23 URLs (11 core + 12 Papyrus) and no challenge URLs; the feed is unchanged at 12 items.

## Still open

The encyclopaedia's own sections (Places, Stories, Method) do not exist yet. Until they do, retired pages point at `explore.html` and `geospatial.html` anchors — real destinations, but not the final ones. When those sections land, `SECTOR_DESTINATION` is the single place to re-point them.
