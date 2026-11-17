# Trilingual Plan — English, Arabic, Russian

Approved by the owner on 2026-11-16, as recommended. **Status, 2026-11-17 01:00 UTC:**
stage 1 (About, Privacy), 2a (home, planner, prices, name studio, dossier, plan check),
2b (When to go, Community, Places, Atlas), 2c (data stories, street report card),
4a (header text written by scripts) and 4b (the sign-in dialog) are built and open as
PRs #150–#154 and #156, all based on main, to merge in that order. That is 14 pages
in each language. None of them is merged yet.

Back to [[Home]] · related: [[Papyrus Design System]] · [[Frontend & Design System]] · [[Lessons — Checks That Measured the Wrong Thing]]

---

## What there is to translate (measured 2026-11-16)

| Group | Pages | Words (English) | Indexed |
|---|---|---|---|
| Top-level pages | 29 | ~20,500 | 25 in the sitemap |
| Visit pages | 18 | ~10,900 | 18 |
| Stories (Papyrus) | 12 | ~5,900 | 12 |
| Practice pages | 123 | ~27,000 | 0 (retired, noindex) |

- About 330 interface strings in the page scripts, plus prose fields in `fair-prices.json`, `calendar.json` and the visit data.
- Arabic site names already exist in the data (`name_ar`), and `prices-ar.html` was the one Arabic page.
- **Decision:** translate the 55 indexed pages (~37,000 words); leave the retired practice pages in English.

## Structure

- English stays at its current addresses, so nothing indexed moves.
- The build writes `/ar/<page>` and `/ru/<page>` twins from one catalogue per language: `backend/i18n/ar.tsv` and `ru.tsv`, one `English<TAB>translation` line per unit.
- **A unit** is a whole paragraph, heading, list item, button or link label, with its inline tags. Word order in Arabic and Russian cannot be rebuilt from English fragments.
- **The build fails** if a unit has no translation, or if a translation's tags differ from the English.
- **Each twin:**
  - `lang`/`dir`, with Arabic right to left;
  - a canonical pointing at itself;
  - hreflang for en, ar, ru and x-default on all three versions;
  - an entry in the sitemap;
  - its language's fonts;
  - a footer line saying the translation awaits a native review.
- **Code:**
  - `backend/pipeline/pages/i18n.py` builds the twins;
  - `pages/i18n_units.py` finds the units;
  - `assets/i18n.css` and `assets/lang.js` run the button.

## Decisions

- **Toggle:**
  - a compact globe button in the header showing the current language (EN, عربي, RU) that opens English, العربية and Русский, made of `<details>` and plain links so it works without JavaScript;
  - on phones, the other languages are links in the menu;
  - the choice is remembered on the device, and a reader on another language's page is *offered* a link, never redirected.
- **Header widths, measured on the live About page at 1280 px:**
  - English fits with links 12 px apart (47 px to spare);
  - Arabic keeps the menu below 1440 px;
  - Russian needs 1,340 px, more than the 1,320 px row, so it keeps the menu below 1600 px and gets a wider row above.
- **Digits:** Arabic uses Arabic-Indic digits (٠–٩), as the existing Arabic page did; Russian uses Russian number style.
- **Fonts** (Google Fonts only):
  - Arabic: Noto Sans Arabic for text and Amiri for headings, with letter-spacing removed so letters join;
  - Russian: Cormorant Garamond for headings (Cinzel has no Cyrillic) and Inter for text.
- **Never translated:** travellers' notes stay in the language they were written in.
- **Emails:** the verification and reset emails are unchanged; any translation needs the owner's yes on the exact text first.
- **Privacy:** the privacy page, in all three languages, says the language choice stays on the device.

## Stages, each its own PR

1. **The system, proven on About and Privacy:**
   - catalogue, build, button, right-to-left foundations, fonts;
   - the check (`backend/verify/i18n.py`, seven mutation cases);
   - `header.js` measuring the twins.

   *Built 2026-11-16; PR #150 after #147 merged into a stacked base by mistake.*
2. The other top-level pages: 2a, 2b and 2c built (12 pages). Explore, stocks, invest, case, blog, prices and the four data pages are left.
3. Visit pages and stories, through the generator.
4. Script text, through `EGYBI.t()`: the generator writes `assets/i18n/<lang>.js` from the same catalogues and refuses a missing translation or markup. 4a (header bar) and 4b (sign-in dialog) are built. Still to do: the planner, briefing, notes and maps, number and date formatting, and the hieroglyph list on About, which `glyphs.js` writes.

   Found while building them: the trip scripts fetched `data/` relative to the page, so the twins would have loaded empty. Fixed with `T.url()` and `EGYBI.url()`, which resolve against the script's own address, and proven by `twin-data.js`.
5. **Reading like a person wrote it** (2026-11-17), after a full read of every translated page:
   - Russian (PR #160, merged) and Arabic (PR #161) rewritten line by line, each with a glossary
     (`backend/i18n/glossary-ru.tsv`, `glossary-ar.tsv`) that `i18n.py` enforces; Arabic is compared
     without vowel marks;
   - English (PR #162): 83 lines rewritten, with the Arabic and Russian for each rewritten to match,
     and `static-audit.py` now refuses build language shown to visitors;
   - the reviews are `backend/i18n/review-en.md`, `review-ar.md` and `review-ru.md`.
6. Fixes from the native review.

## Native review

Every Arabic and Russian text was written by Claude and is marked as awaiting
a native speaker's review. `backend/i18n/REVIEW.md` is the file to hand a
reviewer: pages, conventions to confirm and a checklist; its last sections list
the lines from the 2026-11-17 rewrite that most need a native speaker's eye.
