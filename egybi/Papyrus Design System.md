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
