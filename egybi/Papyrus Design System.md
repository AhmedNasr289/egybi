# Papyrus Design System

> Built 2026-10-09 as part of [[The Pivot — Egypt, Honestly]]. Back to [[Home]]. Extends [[Frontend & Design System]], whose colour rules (blue structural, gold the one accent, Papyrus and Kemet the only two surfaces) still hold.

## What it is

Until this change, The Papyrus newsletter's sign-up letter was the one place on the site that looked like what the site is about. That letter is `.papyrus-letter`: a parchment sheet with a torn gold top edge and an ankh wax seal that stamps when you subscribe.

Ahmed asked for that look on **every page**. It now lives in `site/assets/egybi.css`, in the section headed `Papyrus`, and works through the **classes pages already use**. So the hand-written pages, the 12 Papyrus issues, the 123 tombstones and the 18 generated site pages all change together, and no page has to opt in.

| Piece | Where it shows | How it is built |
|---|---|---|
| **Sheet** | Every `.card`, `.chart-card`, `.callout`, `.atlas-note`, `.streets-note` and `.glyph-card`, plus the explicit `.sheet` | A parchment gradient (`--sheet`) under a fibre texture (`--fibre`, two near-transparent repeating gradients). Dark sections use `--sheet-dark`. The radius is 4/4/14/14, like paper hanging from its top edge |
| **Torn edge** | The top of every sheet | A `::before` stripe of `--torn` gold dashes, the same stripe the letter already had |
| **Seal** | Offers, the dossier cover, site pages | `.seal`: a radial-gradient gold disc holding the ankh glyph |
| **Specimen** | Source and date notes | `.specimen` and `.specimen-label`. This generalises the newsletter's `.pl-specimen`, which is kept |
| **Scroll rod** | Wherever one light section meets another light section | `.surface-light + .surface-light-2::before`: a gold rod with rounded caps |
| **Title rule** | Under every hero `h1` on the site | `.surface-hero h1::after`: one rule covers every page |
| **Drop cap** | The 12 Papyrus issues | `.dropcap`, added by `build_static_pages.py` |
| **Print** | The trip dossier | `@media print`: page chrome hidden, sheets never split across pages, external URLs printed after links |

## Constraints, and how each is kept

- **No image requests.** The texture is gradients only, so this adds no new request and no third party.
- **Contrast is measured, not assumed.** Every alpha in the texture is low enough that text contrast is set by the base colour. `contrast.js` checks this against the painted pixel.
- **Motion.** There is no new animation. The seal stamp is the newsletter's existing animation, and it is off under reduced motion.
- **Fonts.** The hieroglyph signs on the new name studio use a **self-hosted** subset of Noto Sans Egyptian Hieroglyphs:
  - File: `site/assets/fonts/noto-hieroglyphs-subset.woff2`, 13.7 KB, 34 signs.
  - Licence: SIL OFL 1.1, with the licence file shipped beside it.
  - It is a separate font family (`EgyBI Glyphs`), so the existing Google Fonts subset used by `glyphs.js` is untouched.

## Removed while building it

- **`.hero-cta`**: the home hero now holds the date form instead of two buttons. Leaving the rules would have made them orphans, which `checks.py orphans` flags.
- **Draft rules that never shipped** (`.issue-line`, `.unroll`, `.print-only`). Each was written and then deleted, so none is left as an unused rule.

## Fixed at the source on the way

**The flag caption on the home hero measured 4.02:1** on the hero's brightest blue stop, below the 4.5:1 that AA requires. The fault was already on `main`. Its colour moved from `#b9ad93` to the hero lead's `#e9dfc8` (about 7:1).

## 2026-10-09, later — Papyrus everywhere

Ahmed asked for **every background** in papyrus, with all four ornaments. The near-black bands and the blue night-sky heroes are gone; the whole site reads as one scroll.

### The surface tiers

| Tier | Where | Ink |
|---|---|---|
| `--papyrus`, `--papyrus-2` | light sections, as before | `--ink`, `--ink-soft` |
| `--papyrus-deep` `#EEE0BF` | the 17 former dark bands, now `.surface-deep` | re-points `--ink-soft` to `#544c3e` and `--gold-ink` to `#64500e` |
| `--papyrus-aged` `#EBD9B2` | every hero (`.surface-hero`) | re-points `--ink-soft` to `#4a4336` and `--gold-ink` to `#5c450a`; title in `--blue-deep` |
| `--papyrus-burnt` `#2B1E10` | the footer | the old on-dark inks |

Each darker tier **re-points the ink tokens** rather than adding per-component rules. That is why every lead, caption, kicker and tag inside it keeps AA without any further rule.

### The four ornaments

All four are tokens at the top of `egybi.css`, built as CSS or inline SVG `data:` URIs, so there is **no request** for any of them. All four are pseudo-elements: out of the reading order, and none of them moves.

| Ornament | How it is built |
|---|---|
| **Fibre** (`--fibre-light`, `--fibre-dark`) | SVG `feTurbulence` stretched along x and along y, for the horizontal-over-vertical reed strips. The filter region is pinned to the tile (`userSpaceOnUse`, 100%); before that, `stitchTiles` left visible seams every 320 px |
| **Frieze** (`--frieze`) | Open lotus, lotus bud and papyrus umbel in gold ink, at the foot of every hero and on both edges of every deep band |
| **Signs** | Ankh, wedjat eye and scarab, as a faint watermark (7.5% alpha) in each hero's corner, from the self-hosted glyph subset |
| **Burn** | A sepia inset vignette on hero leaves, and a torn, scorched top edge on the footer (`--torn-foot`) |

### Done at the source, not by overriding

- **The dark sections were renamed to a new class.** `surface-dark` → `surface-deep` in 9 pages, and the ~30 dark-only rules were deleted. The light styling is now the default.
- **`.btn-ghost` defaults to papyrus ink.** The only dark panel left that carries one, `case.html`'s `.closed`, restores the dark treatment locally.
- **The `.stat` band defaults to papyrus ink.**
- **The `#e9dfc8` inline hero-lead colour was removed** from every page and from the generator.
- **Chart axis ticks on Explore** were recoloured from beige to ink.
- **The home film runs under a papyrus scrim** (at least 0.86 opacity) with a sepia filter.
- **The relief profile on `visit.html` is a framed dark plate set into the papyrus**, because its chart is drawn in light strokes.

### A mistake caught on the way

The first pass stripped inline dark colours with a text replace, and that replace also reached the pages' `<style>` blocks:

- **`case.html`:** the `.closed` panel lost its light text colours.
- **`visit.html`:** the relief plate lost its light text colours.

The screenshot review caught both before commit. The plate's tick labels also went pale, and `contrast.js` caught that. The rules were restored by hand. **The lesson:** a text replace aimed at `style=""` attributes must be scoped to attributes, not to whole files.
