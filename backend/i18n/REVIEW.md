# Arabic and Russian translations: native review needed

Every Arabic and Russian text on egybi.com was written by Claude (an AI) for
EgyBI, and **no native speaker has checked it yet**. Each translated page says
so in its footer. This file is what to hand a reviewer.

## What to review (stage 1, 2026-11-16)

| Page | Arabic | Russian | English source |
|---|---|---|---|
| About | https://egybi.com/ar/about.html | https://egybi.com/ru/about.html | https://egybi.com/about.html |
| Privacy & cookies | https://egybi.com/ar/privacy.html | https://egybi.com/ru/privacy.html | https://egybi.com/privacy.html |

The shared header and footer text (menu labels, footer columns) is reviewed
once, on either page. 142 entries per language in stage 1.

## Stage 2a (2026-11-17): the trip pages

| Page | Arabic | Russian | English source |
|---|---|---|---|
| Home | https://egybi.com/ar/ | https://egybi.com/ru/ | https://egybi.com/ |
| Route planner | https://egybi.com/ar/plan.html | https://egybi.com/ru/plan.html | https://egybi.com/plan.html |
| Fair prices | https://egybi.com/ar/fair-prices.html | https://egybi.com/ru/fair-prices.html | https://egybi.com/fair-prices.html |
| Name in hieroglyphs | https://egybi.com/ar/hieroglyphs.html | https://egybi.com/ru/hieroglyphs.html | https://egybi.com/hieroglyphs.html |
| Dossier | https://egybi.com/ar/dossier.html | https://egybi.com/ru/dossier.html | https://egybi.com/dossier.html |
| Plan check ($49) | https://egybi.com/ar/ask.html | https://egybi.com/ru/ask.html | https://egybi.com/ask.html |

237 more entries per language (379 in total). Please look especially at:

- the offer on Plan check and the "How paying works" paragraph: they describe
  a paid service, so the meaning must match the English exactly;
- site names on the planner and hieroglyph pages (الكرنك / Карнак, دندرة /
  Дендера, فيلة / Филы, وادي الملوك / Долина царей);
- the two population figures on the home page (١١٦٫٥ / 116,5 million and
  ١٠٧ / 107 million) and the GDP pair (−18.4%, +67.9%).

## Stage 2b (2026-11-17): When to go, Community, Places and the Atlas

| Page | Arabic | Russian | English source |
|---|---|---|---|
| When to go | https://egybi.com/ar/visit.html | https://egybi.com/ru/visit.html | https://egybi.com/visit.html |
| Community | https://egybi.com/ar/community.html | https://egybi.com/ru/community.html | https://egybi.com/community.html |
| Places | https://egybi.com/ar/places.html | https://egybi.com/ru/places.html | https://egybi.com/places.html |
| Atlas | https://egybi.com/ar/geospatial.html | https://egybi.com/ru/geospatial.html | https://egybi.com/geospatial.html |

315 more entries per language (694 in total). Please look especially at:

- the climate caveats on When to go ("What these numbers are not", "Three
  figures, three different questions"): they explain what the temperatures
  mean, so the meaning must match exactly;
- the Atlas's "What this map is not" paragraph, which tells readers the
  health layer is not a care directory;
- the month abbreviations in the year strip (ينا، فبر… / янв, фев…), and the
  18 site names, which should match the planner's.

## Where the text lives

- `backend/i18n/ar.tsv` and `backend/i18n/ru.tsv`: one line per unit,
  `English<TAB>translation`. A unit is a whole paragraph, heading, list item,
  button or link label.
- Keep every HTML tag exactly as it is in the English (links, bold, italics).
  The build refuses a translation whose tags differ from the English.
- Do not change the English column. It is how each translation finds its
  place on the page.

## Conventions used: please confirm or correct

- **Arabic digits:** figures use Arabic-Indic digits (٠–٩), as the existing
  Arabic prices page does, for example ٩٧٪ and ٢٠٢٤. Codes such as
  U+13000 stay Latin.
- **Russian numbers:** Russian style, for example "97 %" and "8 млрд долларов".
- **Names:**
  - EgyBI stays EgyBI.
  - The newsletter The Papyrus is «البردية» / «Папирус».
  - Ibi is إيبي / Иби.
  - Thoth is تحوت / Тот; Seshat is سشات / Сешат.
  - Per Ankh is «بر عنخ» / Пер-Анх.
  - Governorates are المحافظات / мухафазы.
- **Every figure, source and date must be identical to the English.** Please
  flag any that is not.
- **Privacy page wording:** must say exactly what the English says. It is a
  legal statement, so meaning matters more than style.

## Known gaps, to be closed in later stages

- On About, the list of hieroglyph signs is written by a script
  (`assets/glyphs.js`) and is still English on the Arabic and Russian pages.
  Stage 4 translates script text.
- Likewise, the text the trip scripts write after the page loads is still
  English on the translated pages: the home briefing (heat, holidays, rate),
  the planner's stop cards and dossier, the price tables on Fair prices and
  the sign table on the name studio. Stage 4.
- On every translated page, two labels in the shared header bar are still
  English because scripts write them: "Sign in" (`assets/auth.js`) and "On
  this page" (`assets/wayfinding.js`). Seen in CI's screenshots of the
  Arabic and Russian About pages (run 43971142792). First in stage 4.
- Menu links to pages that have no translation yet lead to the English page.
- Verification and password-reset emails are unchanged and English only.
  Any translation of them needs the owner's approval of the exact text first.

## Checklist for the reviewer

- [ ] Arabic: reads naturally to an Egyptian reader; no machine-like phrasing
- [ ] Arabic: right-to-left layout looks right on phone and desktop
- [ ] Russian: reads naturally; terms consistent
- [ ] Both: every number and date matches the English
- [ ] Both: privacy page meaning matches the English exactly
