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

## Stage 2c (2026-11-17): the data stories and the street report card

| Page | Arabic | Russian | English source |
|---|---|---|---|
| Data stories | https://egybi.com/ar/stories.html | https://egybi.com/ru/stories.html | https://egybi.com/stories.html |
| Street report card | https://egybi.com/ar/streets.html | https://egybi.com/ru/streets.html | https://egybi.com/streets.html |

144 more entries per language. Please look especially at the technical terms
on the street report card: intersection density, dead ends, circuity and
orientation entropy (كثافة التقاطعات، الطرق المسدودة، التعرّج، إنتروبيا الاتجاه /
плотность перекрёстков, тупики, извилистость, энтропия ориентации), and at
Downtown Cairo's hand-drawn boundary paragraph, which names real streets.
The figures the stories compute in the browser (populations, ratios) are
still written by script in English digits until stage 4.

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
- Stage 4a translated the header bar's script-written labels: "Sign in",
  "Sign out", "Your trips and account", "Your account", "On this page" and
  "Offline, try again" (تسجيل الدخول / Войти, and so on). They come from the
  same catalogue, through `assets/i18n/ar.js` and `ru.js`.
- Stage 4b translated the sign-in dialog: its titles, labels, buttons, the
  password-strength notes and the messages it writes itself (49 strings).
  Please read the line under the dialog's side panel closely: "We keep your
  email and the trips you save. Delete it all from your account page at
  any time." It is a privacy statement, so its meaning must match exactly.
  Messages the server sends (for example a rejected password) are still
  English, and the verification and reset emails are unchanged.
- Twelve more strings per language (2026-11-17), text the generator had
  missed: the date labels "Arriving" / "Leaving", "Show amounts in", "A name,
  in Latin letters", "Name for the dossier cover", "Or search 897 mapped
  places", and whole paragraphs on Privacy (the account bullet), Community
  (two bullets), Stories (the sources note) and Streets (the boundaries
  note). The Privacy bullet describes what an account stores; please check
  its meaning matches the English exactly.
- Menu links to pages that have no translation yet lead to the English page.
- Verification and password-reset emails are unchanged and English only.
  Any translation of them needs the owner's approval of the exact text first.

## Checklist for the reviewer

- [ ] Arabic: reads naturally to an Egyptian reader; no machine-like phrasing
- [ ] Arabic: right-to-left layout looks right on phone and desktop
- [ ] Russian: reads naturally; terms consistent
- [ ] Both: every number and date matches the English
- [ ] Both: privacy page meaning matches the English exactly

## Russian editing pass (2026-11-17)

All 955 lines of ru.tsv were read in full and 146 rewritten. The full review,
with the glossary, before-and-after examples and every line still to check, is
`backend/i18n/review-ru.md`.

- The Russian was already correct, and every line already used a lower-case
  «вы». The rewrites fix calques (70 lines), split terms (28), heavy rhythm
  (24), typography (14: non-breaking spaces before units and in «49 $»),
  names (7) and register (3).
- "Account" was «аккаунт» on 16 lines and «учётная запись» on 13, so the same
  button was named two ways. It is now «аккаунт» everywhere.
- Line 419 changed meaning: it used to compare each day *with* where the hours
  should move; it now says the day is checked against the measured heat and
  we suggest which hours to shift.
- Please check first: the privacy lines (96-131, 951), sign-in and passwords
  (895-942), the safety and medical notes (424, 692, 728, 784, 785, 867), the
  prices and payment timing (333, 405, 409, 412, 418, 423, 426) and the names
  listed in review-ru.md.

## Arabic editing pass (2026-11-17)

All 955 lines of ar.tsv were read in full and 157 rewritten. The full review,
with the glossary, examples and every line still to check, is
`backend/i18n/review-ar.md`.

- The Arabic was already correct: Arabic punctuation, « » quotes, mirrored
  arrows and Arabic-Indic digits throughout. The rewrites remove calques (56),
  heavy rhythm (49) and terms rendered several ways (44); "planner" alone had
  four forms and is now مخطِّط الرحلة everywhere.
- Address: the reader as أنت with singular imperatives (اختر، احفظ، خطّط); the
  site as نحن.
- Four meaning fixes: the $49 page title had dropped "data" (Cairo *data*
  analyst); "two dozen" had become "about twenty"; "tidier number" had become
  "the most suitable number"; and the water line called the *sources*
  contested where the English says the *models* are.
- Please check first: privacy (96-131, 951), account and passwords (895-942),
  community posting (551, 607, 611), the paid service and prices (232, 333-335,
  405-426), safety and health (424, 692, 728, 771-785, 864-867) and the three
  technical renderings named in review-ar.md.

## English rewrite, and the translations that follow it (2026-11-17)

83 English lines were rewritten so they read like a person in Cairo talking to
a first-time visitor (`backend/i18n/review-en.md` has the patterns and the
style note for future writing). The Arabic and Russian for all 83 were
rewritten to the new English, not patched.

- The footer, on every page, now reads "Every figure has a source, and where
  sources disagree, we show both."
- Unfinished sections no longer show build language ("Run the visitor-layer
  build"); they say the section is not ready yet.
- Please check: the footer line in both languages; the "check back soon"
  wording (Arabic «عُد إلينا قريبًا», Russian «Загляните чуть позже»); Atlas
  line 692, where Russian glosses мухафаза as «(его провинций)» and Arabic
  leaves محافظة unglossed; and line 356, where Arabic now says «أهل البلد»
  for "a local".

## Fair prices: official entry prices and the price sheet in Arabic and Russian (2026-11-17)

The price table on Fair prices was English on the Arabic and Russian pages. Its
rows now go through the catalogues (79 new lines in each language, the last of
them "undated"), so the whole sheet reads in the page's language. Publication
titles stay as published, in English.

Please check:
- the Arabic counted nouns after numbers (٣٠٠ جنيه, ٣٥٠ جنيهًا, ١٬٢٧٢ جنيهًا);
- the Russian «Входные билеты в главные места» as the group title, and
  «с человека» for "per person";
- the sun-alignment note: Arabic «يومي تعامد الشمس», Russian «дни, когда
  солнце освещает святилище»;
- the Grand Egyptian Museum note, which tells the reader to buy only on
  tickets.gem.eg: the wording must not read as a guarantee about that site.

## Arriving in Egypt (2026-11-17)

A new page, arriving-in-egypt.html, in all three languages (54 lines per
language, plus two link lines on Plan and Fair prices).

Please check:
- the visa rows: Arabic «التأشيرة عند الوصول», «التأشيرة الرقمية عند الوصول»,
  Russian «Виза по прилёте», «Электронная виза по прилёте»;
- the Sinai row, which must keep the four named resorts and the 15 days;
- the Russian card row: it must say cards are sometimes declined, not always
  (the source says «иногда отклоняют»);
- the Cairo ride-hail row, which reports what travellers describe and must
  not read as a statement about all drivers;
- the closing note: the visa rules are for British passports, and other
  passports can differ.

## Arriving in Egypt: ride apps and trains (2026-11-17)

Two new sections on arriving-in-egypt.html (20 lines per language, 3 of them
replacing lines that no longer appear).

Please check:
- the Arabic names of the stations: «محطة صعيد مصر (بشتيل)» and «مكتب حجز
  العرب والأجانب» at Ramses; Russian «вокзал Верхнего Египта (Баштиль)»;
- the Russian city names: Думьят, Загазиг, Мансура, «города Суэцкого канала»;
- the Careem row, which must say coverage is not confirmed, not that Careem
  is absent.

## Planner leg cards (2026-11-17)

One new line per language, shown between two stops in the planner, plus 8
plain-text copies of lines already on arriving-in-egypt.html (the same
translations, without the page's HTML around them).

Please check:
- «%n كم بخطّ مستقيم من %s» and «%n км по прямой от %s»: %s is a place name,
  often in English (from OpenStreetMap); the number is written in the page's
  digits;
- that the train rows still read naturally out of their table, one per line:
  «قطارات النوم إلى الأقصر وأسوان: تنطلق من محطة صعيد مصر (بشتيل) بالقاهرة».

## Planner summary (2026-11-18)

Five short labelled lines replace an English sentence under the planner map.

Please check:
- «المحطات / الأيام المخطّطة / ليالي الرحلة» and «هذه أيام أكثر مما تتّسع له الرحلة.»;
- «Остановок / Дней в плане / Ночей в поездке / По прямой между остановками»
  and «Это больше дней, чем есть в поездке.»;
- that the summary reads as one line with « · » between the parts.

## The rest of the planner (2026-11-18)

51 lines from plan.js (stop cards, buttons, messages, the print dossier),
plus month names and dates written by trip.js.

Please check, in particular:
- the heat line: «يوليو: نحو ٣٩ °م نهارًا و٢٦ °م ليلًا» and
  «Июль: около 39 °C днём, 26 °C ночью»;
- the dossier title for a named trip: «مصر كما يراها %s» and «Египет: %s»
  (the English is "Ahmed's Egypt"); a better short form is welcome;
- the Russian dates: «17 ноября 2026» (genitive month, no "г.");
- «قدّم %s في الترتيب / أخّر %s في الترتيب» for the move-up and move-down buttons.

## Arriving in Egypt: travelling alone, and Russia or Kazakhstan (2026-11-17)

Two new sections (23 lines per language).

Please check:
- the safety rows, word by word against the English: they repeat the UK
  government's advice and must not soften or add to it;
- Arabic row "ركوب التاكسي وحدك": it addresses a woman («فأرسلي») because the
  advice is for women travelling alone; confirm that reads right next to the
  masculine form used elsewhere;
- Russian «Если едете одна» and «когда вы одна»: feminine on purpose, for the
  same reason;
- Arabic «رابطة الدول المستقلة» for CIS, and «مير» for the Mir card.

## Home page briefing (2026-11-18)

26 lines from home.js: the trip briefing, the holiday list labels and the
exchange-rate caption.

Please check:
- «الحرارة في كل موقع خلال %m.» and «Жара по каждому месту: %m.»;
- the Russian lead «… в месяце «%m» …», which quotes the month name to
  avoid declining it; a smoother wording is welcome;
- «عدد الأيام في %m: %n» for "July, days: 3" (worded to avoid number-noun
  agreement, which would need a different noun form for 1, 2, 3-10 and 11+);
- the heat legend bands, «٢١ °م أو أقل» … «٣٩ °م أو أكثر».
- the 14 holiday names and 8 notes from calendar.json, especially the Russian
  «Солнце в святилище Абу-Симбела» for the sun alignment day, and the Arabic
  figures in the museum capacity line («١٥٬٠٠٠» … «٦٠٪»).
## Heat page (visit.html, 2026-11-18)

32 lines from visit.js: map tooltips, the month caption, the site card, the
elevation section and the relief chart caption.

Please check:
- the month caption, «في %m، تتراوح الحرارة المعتادة بعد الظهر …» and
  «В месяце «%m» обычная дневная температура …»;
- the record-extremes sentence, which must keep saying these are the most
  extreme hours ever measured, not a typical day;
- «محافظة %g» / «мухафаза %g» for "Giza governorate".
## Places page (2026-11-18)

58 lines from places.js: the place card, its links, the list, "Near me" and
the summary.

Please check:
- the OpenStreetMap cautions on opening hours, step-free access and
  population: they must stay as cautious as the English;
- «الذهاب إلى هناك» and «Как туда попасть» for "Going there";
- «Ближайший объект Всемирного наследия» and «أقرب موقع تراث عالمي».

## Governorate names (2026-11-18)

The 27 names in `backend/pipeline/pages/egfmt.py` (GOV_NAMES_AR, GOV_NAMES_RU),
taken from Arabic and Russian Wikipedia.

Please check the Russian choices where Wikipedia's main form differs from
everyday usage: «Эль-Гиза» (Giza), «Эль-Файюм» (Fayoum), «Эль-Минья» (Minya),
«Вади-эль-Гедид» (New Valley), «Красное Море» (Red Sea).

## Heat page site names in Russian (2026-11-18)

The 18 measured sites' names in `ru.tsv` (from `visit-climate.json`), shown on
ru/visit.html. Four are Russian Wikipedia's titles (Пирамиды Гизы, Карнакский
храм, Абу-Симбел, Долина Царей); the others are the usual Russian forms.

Please decide Philae: Russian Wikipedia's title is «Филы», but the glossary
rejects it and the site uses «Храм на острове Филе». Also check «Храм в
Дендере», «Вади-аль-Хитан» and «Суэцкий канал у Исмаилии».

## 2026-11-20: name studio messages and the GEM ticket note

Ten new lines per language for the name studio (the "Copy the signs as text" button, its two messages, the sign table's headers, "Type a name…", "Not spelled…", "Saved…"), and the replaced Grand Egyptian Museum note on Fair prices (the reported 1,830 EGP). Pages: https://egybi.com/ar/hieroglyphs.html · https://egybi.com/ru/hieroglyphs.html · https://egybi.com/ar/fair-prices.html · https://egybi.com/ru/fair-prices.html
