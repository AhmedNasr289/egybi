# Brand & Creative Identity

Research-grounded, not generic pyramid-and-camel clichés. Full source list: [[Sources]].

## The research

**Deities of writing, wisdom, and measurement.** Thoth (Djehuty) — ibis- or baboon-headed, invented hieroglyphs, scribe of the gods, carries a reed pen and palette. Seshat ("She Who Writes") — goddess of writing, measurement, and architecture, wears a leopard-skin robe under a seven-pointed star emblem, holds a notched palm rib (the hieroglyph for "year"), and performed "stretching the cord" (pedj-shesh) — the temple-foundation surveying ritual, making her patron of measurement and record-keeping specifically. Maat, goddess of truth and order, is symbolized by a single ostrich feather weighed against the heart at judgment — a natural pass/fail icon.

**Notation systems.** Hieroglyphs combine logograms, phonograms, and determinatives — a layered icon grammar, not mere pictures. Egypt also hosts a living visual-notation tradition: SignWriting (invented 1974), which Egypt's National Association of the Deaf uses for a full online Egyptian Sign Language dictionary. Both systems, five millennia apart, encode meaning through small combinable glyph components — a model for a badge grammar where a base glyph plus a modifier yields new meaning.

**Pharaonic color palette.** Egyptian blue (first synthetic pigment, ~2500 BCE, heavens/Nile/rebirth) · gold ("flesh of the gods," eternity) · lapis lazuli (starry-night blue, royalty/divinity) · carnelian (life/vitality/protection) · turquoise (completes the "Egyptian trio" with lapis and carnelian) · malachite green (vegetation, "field of malachite" = land of the blessed dead) · black/kemet (fertile Nile silt, regeneration) · red/desheret (the desert, but also life and victory).

**Islamic geometric pattern & Khayamiya.** Islamic geometric patterns generate 8-, 10-, and 12-point star rosettes from a bisected polygon — a replicable construction algorithm. Cairo's Mamluk buildings show this at architectural scale; mashrabiya lattice screens filter light while still shading Cairo facades today. Khayamiya — appliqué textile hand-stitched on Cairo's "Street of the Tentmakers" — layers bold geometric stars and folkloric figures onto canvas.

**Contemporary Egyptian design.** Post-2011 Cairo street art fused ancient and political imagery — Alaa Awad's neo-Pharaonic murals, Ammar Abo Bakr's martyr portraits, Keizer's stencil ants, El Zeft's gas-masked Nefertiti. In typography, Khaled Hosny (Cairo) built the open-source Amiri typeface reviving a 1924 Naskh style; Ghada Wali is an internationally awarded Cairo type/identity designer.

## Creative synthesis

**Structure:** the platform is named **EgyBI** (originally designed under the working name "Per Ankh," ancient Egyptian for "House of Life" — see [[Relationship to EGYBi]] for the rename history), and "House of Life" remains its guiding metaphor: the real temple institution where scribes trained. Within that frame, **Thoth** is the guide/mentor figure (he presided over scribal learning); **Seshat's** measurement rite and iconography drive the badge/rank system (since she is specifically the patron of measurement and record-keeping — the closest mythological match to a data platform); **Maat's** feather drives pass/fail feedback.

**Guide character: "Ibi"** — a small ibis-headed apprentice-scribe (Thoth-inspired) carrying a reed stylus that doubles as a cursor, rendered as a flat geometric icon (not a cute cartoon god) so it survives at small badge scale. (Named distinctly from EGYBi WFM's own former mascot "Sesh" — that project is dropped, but the names were kept distinct to avoid confusion in any surviving references.)

**Rank ladder (progression through the House of Life):** Reed-Bearer → Palette-Keeper → Cord-Stretcher (Seshat's surveying rite — awarded for aggregation/measurement skill) → Ibis Scribe → Keeper of the House of Life → Master of Secrets.

**Badges:**
1. **First Cartouche** — the user's name auto-rendered inside a rounded cartouche outline.
2. **Stretching the Cord** — a taut measuring-cord glyph forming a right angle, for a first successful join query.
3. **Weighing of the Query** — a scale with a feather versus a database icon, for optimization challenges.
4. **Ibis Eye** — a stylized Wedjat eye rendered from query-plan lines, for debugging skill.
5. **Notched Palm** — Seshat's year-rib glyph, gaining a notch per daily streak.
6. **Egyptian Blue Seal** — a lapis-blue hexagonal rosette, for completing a module ("temple").
7. **Khayamiya Patch** — an appliquéd geometric star, for community/peer-help contributions, stitched onto a growing tent-canopy collection.
8. **Mashrabiya Master** — an 8-point lattice rosette that visibly unlocks/opens on completing an advanced window-function track.

**Feedback animation:** a correct answer inks an Egyptian-blue glyph onto a papyrus-textured strip in one continuous reed-pen stroke, ending in a small gold **ankh** flourish — a deliberate callback to the platform's guiding metaphor ("Per Ankh" = "house of the ankh/life," the House of Life scribal institution the platform is styled after). An incorrect answer draws a red determinative-style X and the stroke gently rewinds rather than shaking or buzzing.

**Progress map:** a Nile-scroll journey on unrolling papyrus, with Mamluk-rosette waystations as checkpoints and skill tracks as tributaries; completed sections shift from sand-ochre to Egyptian-blue-and-gold khayamiya-patterned banners.

**Palette in the UI:** Egyptian blue as the primary interactive color (buttons, links, progress bars), gold for level-ups/achievements, carnelian/terracotta for warnings or streak-at-risk states, malachite green for success states, black/kemet and sand-ochre neutrals for backgrounds and text.

**Caveat from the research:** all facts above trace to real web sources, but are worth a spot-check against primary/academic sources (e.g. Wilkinson's *Complete Gods and Goddesses of Ancient Egypt*) before locking any trademark-sensitive claim.

---

## Shipped: the hieroglyph layer & the mark (2026-07-20)

Everything above is design intent. This section is what actually runs on egybi.com.

### The nine signs

A fixed vocabulary in `site/assets/glyphs.js`, each with a name, Gardiner code, transliteration and meaning. Any `<span data-glyph="eye">` is filled by `paint()`, which adds the sign plus `aria-label`, a `data-tip` explanation and `tabindex="0"` — so the meaning is reachable by keyboard and screen reader, never hover alone.

| key | codepoint | Gardiner | meaning as used |
|---|---|---|---|
| `ankh` | U+132F9 | S34 | life, identity |
| `scribe` | U+13000 | A1 | the person — community, guides, learners |
| `eye` | U+13080 | D10 | protection — privacy, cookies, defence |
| `maat` | U+13184 | H6 | truth — citations, disputes, honesty claims |
| `scarab` | U+131A3 | L1 | becoming — progress, roadmaps, growth |
| `reed` | U+131CB | M17 | writing — learning, research, foundations |
| `ra` | U+131F3 | N5 | the sun, and simply "day" — Egypt, eras, dividers |
| `was` | U+13300 | S40 | power — rank, industry, the data stack |
| `scroll` | U+133DB | Y1 | records — the knowledge base |

**Placement rule: a sign goes where it carries meaning, never as decoration.** The section `.kicker` is the hook that exists on every page, so signs distribute through it. Spread is kept even (roughly was 10 / ra 9 / scroll 8 / scarab 8 / scribe 7 / reed 6 / maat 5 / ankh 2 / eye 2) — repeating one sign eight times down a page reads as wallpaper, which is the thing this system exists not to be. Deliberately **not** applied to prices.html's nine grocery categories: there is no honest mapping from this vocabulary to "fish" or "dairy".

### Three things that are easy to get wrong

1. **Font coverage.** U+13000 is absent from system fonts on iOS, Android and macOS, so these render as empty boxes unless the subset webfont loads. Each page carries a static `<link>` to a Noto Sans Egyptian Hieroglyphs subset (~12 KB) holding exactly these nine codepoints. A **dynamically injected** stylesheet does not reliably register the `@font-face` — the link must be static. Verify coverage by drawing a sign to canvas and comparing against a codepoint known to be absent; equal pixels means tofu.

2. **The ankh was the one invented thing.** It used U+2625, which lives in *Miscellaneous Symbols* and is the generic modern ankh, not a hieroglyph — which is exactly why it needed a hand-drawn SVG fallback. The true hieroglyphic ankh is **U+132F9 (S34)**, in the same block as the other eight, and Noto carries it. Fixed 2026-07-20; the bespoke SVG branch is gone.

3. **Dynamic content needs repainting.** `paint()` runs once on DOMContentLoaded. Any sign inside a client-rendered template (blog cards, price tables, the challenge list) would stay an empty span forever. `glyphs.js` now watches for new `[data-glyph]` nodes with a rAF-debounced MutationObserver, so this is solved for every renderer rather than one at a time.

### Sizing

Base `.glyph` is `1.36em`. Kickers and the hero eyebrow are set at ~0.75rem, so a purely relative size renders specks there — those get `1.62em` (≈1.2rem). Dividers `1.72rem`, About-page legend `2.5rem`.

### The mark (logo & favicon)

The logo and favicon stay SVG, because a favicon cannot depend on a webfont — but they are **drawn from the S34 form**, not invented: a pointed teardrop loop, a slim crossbar with flared ends, and a stem with a splayed foot. The previous mark was a thick circle on a stick, which read as a modern peace-sign ankh and shared no shape language with the signs beside it.

**Stroke weight 8** (in a `0 0 100 100` viewBox) was chosen by rendering a ladder at the real sizes: 6.5 fades out at 16px favicon size, 9.5 closes the loop up and goes chunky, 8 holds at 16px, 26px and 64px. The mark appears **twice per page** — header and footer — which is easy to miss when replacing it.

### A trap worth remembering

The tooltip is `position:absolute; width:max-content; max-width:260px`, centred on its sign. A sign near a container edge on a narrow screen pushes it past the viewport, and it still occupies layout at `opacity:0` — this inflated page `scrollWidth` by ~77px. Fixed with `body { overflow-x: clip }`. **Clip, not hidden:** the site header is `position:sticky`, and `overflow-x:hidden` turns body into a scroll container and silently breaks sticky. Also note `scrollWidth` still reports content extent on a *clipped* element, so it is a poor overflow test — the honest check is whether `scrollLeft` can actually move.

Related: [[Frontend & Design System]] · [[Changelog]]
