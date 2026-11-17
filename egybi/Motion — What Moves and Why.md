# Motion — What Moves and Why

An honest inventory of the site's motion, made on 2026-11-16 after the owner
asked where the animations were. The finding: **motion is subtle and mostly
on three pages**. Only 20 of 182 pages load `motion.js`, so most pages move
only on hover and between pages. Rule for new motion: **it must carry real
information**. It uses opacity and transform only, is fully off under
reduced motion, hides nothing without JavaScript, and comes with a browser
check plus a mutation case per behaviour.

Back to [[Home]] · related: [[Papyrus Design System]] · [[Lessons — Checks That Measured the Wrong Thing]]

---

## What moves (status 2026-11-16)

| What | Where | When | Status |
|---|---|---|---|
| Flag sway and light ripple | Home | Always | Live |
| Hero entrance | Home | On load | Live |
| Gold scroll-progress bar | The 20 motion.js pages | On scroll | Live (runs even under reduced motion) |
| Blocks revealing in a sweep | The same pages | On scroll | Live |
| Charts drawing in | Explore | On scroll | Live |
| Counters | Explore, About | On reach | Live; the real figures are in the HTML since #136 |
| Sun path at the real time of day | Visit pages | On load | Live |
| Page cross-fade | Every page | On link click | Live since #139 (checked in Chrome 156) |
| Travellers' notes, reading-progress line | Visit pages; stories | On load / scroll | Live since #140 |
| **Briefing map**: 18 sites coloured by the month's heat, appearing north to south | Home | On reach, and again when dates change | Live since #142; #144 shows the dots as soon as the map is on screen |
| **Year strip**: 18 sites by 12 months, the year filling January to December | When to go | On reach | #145, not merged |

## Proposals, and what was decided

- **Briefing map:** built. A first-time visitor sees where each site is and how hot it will be, before reading 18 cards.
- **Year strip:** built. Each site's comfortable and too-hot months at a glance.
- **Fair-price meter:** dropped. `fair-prices.json` has fair ranges but no "typical first quote", so the meter would need invented numbers.
- **Planner stops in travel order:** later, because a first-time visitor has no stops yet.
- **The sun travelling from sunrise to now:** later, because it adds little to the sun path already shown.

## How it is checked

- `backend/verify/briefing-map.js` and `year-strip.js` record every `animationstart` from page load and judge the last full sweep:
  - order;
  - spacing of at least 30 ms;
  - opacity and transform only;
  - everything shown afterwards;
  - nothing under reduced motion;
  - visible without JavaScript;
  - nothing empty on screen when only the top edge shows.
- Each behaviour has a mutation case in `mutate.py`.
