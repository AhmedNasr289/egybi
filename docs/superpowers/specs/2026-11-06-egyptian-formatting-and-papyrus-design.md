# Egyptian formatting and the Papyrus reading layer — design

Approved by Ahmed on 2026-11-06. This records the decisions so each PR can be checked against them.

## Why

A read-only audit on 2026-11-06 found that Egypt-specific values are written in many different ways:
- 11 copies of the month-name lists and five different decimal rules;
- money written "EGP 1,234", "1,234 EGP" and "48.71 ج.م";
- four visible date styles, plus about 18 raw ISO dates;
- 14 number calls whose output depends on the visitor's browser locale;
- an Arabic page laid out left to right.

Two defects are confirmed live on `prices-ar.html`:
- the summary prints `%13.5+` (the sign is on the wrong side);
- its Arabic block is left-aligned.

Separately, the 12 Papyrus issues read as a bare column of paragraphs, and each visit page is one undivided background about 2,300 px tall.

## The rules

| What | English | Arabic |
|---|---|---|
| Digits | Western `0-9` | Arabic-Indic `٠-٩`; thousands `٬`, decimal `٫` |
| Money | `EGP 1,234`. No decimals at 100 and above; up to two below | `١٬٢٣٤ جنيه` (same rounding) |
| Exchange rate | `USD 1 = EGP 54.77` (always two decimals) | `الدولار = ٥٤٫٧٧ جنيه` |
| Date, compact | `6 Nov 2026` | `٦ نوفمبر ٢٠٢٦` |
| Date, prose | `6 November 2026` | `٦ نوفمبر ٢٠٢٦` |
| Time | 24-hour, `19:05` | 12-hour with ص/م, `٧:٠٥ م` |
| Change | arrow plus the unsigned value, `▼ 18.6%` | `▼ ١٨٫٦٪` |

- **Months:** Egyptian Arabic month names: يناير فبراير مارس أبريل مايو يونيو يوليو أغسطس سبتمبر أكتوبر نوفمبر ديسمبر.
- **Time zone:** every date is computed in `Africa/Cairo`.
- **Summer time:** the clock comes from the IANA database's real transition dates, never from sampling one day a month.
- **ISO dates:** a raw `2026-11-06` appears only in a `<time datetime>` attribute or other machine-readable markup, never as visible text.
- **Text direction:**
  - A page in Arabic is right-to-left from its root (`<html lang="ar" dir="rtl">`).
  - An Arabic block inside an English page carries `lang="ar" dir="rtl"`.
  - Every number, range or signed percentage inside Arabic text is wrapped in a left-to-right isolate (U+2066 … U+2069), so it cannot render as `%13.5+` or `١٠٠–٥٠`.
- **Spelling:** the governorate's English name is **Fayoum**.

## Architecture

There are two formatters, one per runtime, with identical behaviour:

- `site/assets/egfmt.js`, exposed as `window.EGYBI.fmt`. It uses `Intl.NumberFormat` and `Intl.DateTimeFormat` with `en-GB` / `ar-EG` and `timeZone: 'Africa/Cairo'`. Arabic digits come from the `ar-EG` locale, with an explicit digit map as a fallback, because a browser without Arabic locale data would otherwise print Western digits silently.
- `backend/pipeline/pages/egfmt.py`. It is pure Python with an explicit digit map, plus `zoneinfo` for Cairo time.

The functions are the same in both, keyed by language (`'en'` or `'ar'`):

- `num(x, lang, decimals?)`
- `money(egp, lang)`
- `rate(egpPerUsd, lang)`
- `pct(change, lang)`, which returns the arrow and the unsigned value
- `date(iso, lang, style)`, where `style` is `'compact'` or `'prose'`
- `time(iso, lang)`
- `isolate(s)`
- `range(lo, hi, lang)`

**One set of shared cases:** `backend/pipeline/tests/egfmt_cases.json` lists inputs with the exact expected strings for both languages.
- The Python tests read it directly.
- A small Node script (`backend/verify/egfmt-cases.js`) loads `egfmt.js` in a stub window and checks the same file.
- CI runs both. If either formatter drifts, a case fails.

## The Papyrus reading layer

These extend the existing Papyrus Design System. They add no images, no fonts and no new requests.

1. **Issue on a sheet.** The issue body sits in a parchment `.sheet` with the torn gold top edge.
   - Masthead: `The Papyrus · No. N · 19 July 2026 · M min read`.
   - `N` is the issue's position in publication order, oldest first, so the first issue is No. 1.
   - `M` is the word count at 220 words a minute, rounded up.
   - The date sits in a `<time datetime>` element.
2. **Reading rhythm.**
   - The measure is about 66 characters, with a slightly larger body size and a 1.75 line height.
   - `h2` headings get a short gold rule with a small ankh mark. It is a pseudo-element, so it stays out of the reading order.
   - Bold figures get the gold-ink highlight.
   - The drop cap stays.
3. **Sources.** The closing "Every figure here is real" note becomes a `.specimen` card labelled "Sources".
4. **Issue navigation.**
   - Previous and next issue links, with their titles.
   - "More from the Papyrus" becomes three `.sheet` cards showing the kicker, title and date.
5. **Visit pages (PR 2).** Each topic block (heat, light, terrain, nearby) becomes its own sheet, with the existing scroll rod between them.
6. **Arabic prices page.** It is right-to-left from the root, with the hero ornaments mirrored and every number isolated.

## Proof required in each PR

- **Unit tests:** the full pipeline suite with `ResourceWarning` as an error, plus the shared-case runner for both formatters.
- **Static checks:** `pyflakes`, `seo.py`, `static-audit.py`, `workflow-audit.py` and `checks.py workflows`.
- **Generator output:** compare it byte for byte with `main`. The only files that change are the ones the PR intends to change. A positive control proves the comparison can fail.
- **Contrast:** `contrast.js` measures every new sheet and text colour.
- **Screenshots:** before and after, at 1280 px and at phone width, in the built-in browser pane.
- **Caching:** the `?v=` version is bumped on every page that loads a changed asset.
- **New audit rules:** each one comes with a `mutate.py` case that shows it can fail.

## Delivery

- **PR 1:** both formatters and the shared cases; the Arabic prices page (RTL root, isolates, Arabic digits and dates in the summary and the exchange-rate band); Papyrus items 1–4 and 6.
- **PR 2:** every English call site moved onto the formatters; static-audit rules against locale-less `toLocaleString()` and visible bare ISO dates; the visit-page sheets (item 5).
- **PR 3:** the spelling "Fayoum" in one shared alias map; the heat-band labels unified; the summer-time sentence on the visit pages; the workflow comments that assume UTC+2 all year.
