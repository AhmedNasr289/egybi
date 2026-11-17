# ru.tsv review: Russian editing pass

Scope: all 955 lines of `backend/i18n/ru.tsv`, read in full on 2026-11-17. **146 lines** were rewritten in the PR that adds this file; the glossary is `backend/i18n/glossary-ru.tsv`, and `backend/verify/i18n.py` fails (GLOSSARY TERM) if a rejected variant comes back.

Overall the catalogue is good. The Russian is correct, the address is already a consistent lower-case «вы», and nothing uses «ты». Guillemets, em dashes and «ё» are used properly. What is left is mostly calques, one real term split (аккаунт / учётная запись), a few names, and some missing non-breaking spaces.

Every proposal was checked by script against the English and the current Russian:
- the HTML tags are identical (only title/alt/aria-label/placeholder values may differ),
- the digit sequences are identical to the current Russian line,
- there are no tabs or newlines,
- titles and descriptions stay inside their current length (largest change: line 96, 164 → 157 characters; titles 751/831/833 grow by 1 character).

## Problems by category

| Code | Count | What |
|---|---|---|
| literal | 70 | Calques: «являться» headings (*Чем это не является*), noun chains (*нажатие … или уход со страницы стирает его*), English word order, *Египет, доказанный картой* (argued from), *Планируйте Египет*, *планирует Египет*, *часы золотого света*, *однострочный показатель*. |
| term | 28 | **account**: 16 lines said «аккаунт» and 13 said «учётная запись». The button «Save to my account» appeared as both *Сохранить в аккаунте* (326) and *Сохранить в моей учётной записи* (112). Also **Plan check** vs the «Маршрут» nav, «BI-панель» vs «BI-дашборд», «прибытия» vs «турпоток», «измеренное место», golden hour. |
| rhythm | 24 | Correct but heavy or clumsy sentences, mixed infinitive/imperative pairs on buttons (236), clashing «на самом деле» repeats (435, 832). |
| typo | 14 | Plain space where a non-breaking one belongs (`97 %`, `280 км`, `21 °C`, `49 $`), a missing dash in place of an omitted copula (179, 441), the «, —» pile-up in 782, a colon in the title on 885. |
| name | 7 | Беккерат → **Бекерат** (60, so it matches 291); Эд-Дабаа → **Эль-Дабаа** (Rosatom/press usage); Храм Филы → **Храм на острове Филе** (4 lines); Eid → Ураза-байрам / Курбан-байрам (499). |
| register | 3 | The generic «ты» form *где и ожидаешь* (810), *Увидеть самому* (824), and the bureaucratic «См. наше…» (611). |

**Typography convention.** The catalogue writes non-breaking spaces as the `&nbsp;` entity and contains no literal U+00A0. The new non-breaking spaces in these proposals are **literal U+00A0**, which the brief allows and which works in both HTML and plain-text contexts. They were converted to `&nbsp;` when applied, so the file stays uniform. I did not add non-breaking spaces after every one-letter preposition, because that would touch about 600 lines for little gain. Do it with a typograf pass at build time if you want it.

## Glossary (one Russian term per English term)

- account → аккаунт (UI and privacy alike; «учётная запись» retired)
- sign in / sign out → войти / выйти; sign-in (noun) → вход
- planner / route planner → планировщик / планировщик маршрута
- Plan (nav) → Маршрут
- Plan check → Проверка маршрута (service name, 49 $)
- Have your plan checked → Проверить маршрут
- fair prices → честные цены
- dossier → досье; Papyrus dossier → досье «Папируса»
- The Papyrus → «Папирус»
- briefing → сводка
- governorate → мухафаза
- source / sourced / cited → источник / с источником / с источниками
- major sites → главные места
- measured site (the 18 with climate data) → место с климатическими данными
- measured heat → измеренная жара
- a normal afternoon (mean daily max) → обычный день / средний дневной максимум
- heat band / colour key → обозначения цветов
- golden hour / hours of golden light → «золотой час»
- arrivals (tourism) → турпоток
- dashboard → дашборд (BI-дашборд)
- gazetteer → справочник мест
- Atlas → Атлас
- Explore → Обзор
- Street report card → оценка улиц
- data story → история в данных
- pipeline → конвейер
- tile-free → без тайлов (kept as is, see the open questions)
- scrambled (hashed) → необратимо преобразованный
- travellers' notes → заметки путешественников
- display name → отображаемое имя
- Uber, Careem, OpenStreetMap, EgyBI, NASA, SRTM, CAPMAS → left as written

## Before and after examples

1. **Line 31 (literal)**
   - Before: «EgyBI пишется на основе реальных фараонов, реальных памятников, реальных данных о туризме…»
   - After: «EgyBI опирается на реальность: настоящих фараонов, настоящие памятники, настоящую статистику туризма и настоящие экономические ряды. Посмотрев здесь на график, вы узнаёте что-то о стране, а не просто любуетесь красиво оформленным числом.»
2. **Line 113 (literal, privacy)**
   - Before: «…нажатие <em>Не использовать моё местоположение</em> или уход со страницы стирает его.»
   - After: «…если нажать <em>Не использовать моё местоположение</em> или уйти со страницы, оно забывается.»
3. **Line 112 (term)**
   - Before: «…и не нажмёте <em>Сохранить в моей учётной записи</em>»
   - After: «…и не нажмёте <em>Сохранить в аккаунте</em>» (now matches the real button on line 326)
4. **Line 419 (literal, and a meaning fix)**
   - Before: «каждый день сравнивается с измеренной дневной температурой … и с тем, куда стоит сдвинуть часы.» This compared the day *with* where the hours should move.
   - After: «каждый день сверяется с измеренной дневной температурой в этом месте в ваш месяц, и мы подсказываем, на какие часы стоит перенести программу.»
5. **Line 751 (literal, title)**
   - Before: «Истории в данных — Египет, доказанный картой | EgyBI»
   - After: «Истории в данных — Египет, объяснённый картой | EgyBI» (same change on 753, 831, 833)
6. **Line 652 (term + typo)**
   - Before: «…осадки и часы золотого света для каждого месяца … в пределах 5 км»
   - After: «…осадки и время «золотого часа» в каждом месяце … в пределах 5 км» (with a non-breaking space in «5 км»)
7. **Line 384 (literal)**
   - Before: «Чем это не является»
   - After: «Чего здесь не стоит ждать»
8. **Line 772 (rhythm)**
   - Before: «Это карта того, где люди занимались картографированием, — и умение их различать — самый полезный навык…»
   - After: «Это карта того, где люди занимались картографированием. Умение отличать одно от другого — самый полезный навык при чтении любых открытых данных о Египте.»

## Lines a native Russian reviewer should still check

**Privacy and data handling** (legal meaning must not drift): 96, 98, 105, 107, 108, 110, 111, 112, 113, 114, 117–121, 123, 124, 126, 127, 129, 131, 951.
- On 110, 111 and 951, «scrambled» is now «необратимо преобразованный». The old 110/111 said «зашифрованный», which wrongly implies the data can be decrypted.
- 111: the Do-Not-Track sentence was ambiguous («не отслеживать его»). Check the new «не вести отслеживание».

**Account, sign-in and passwords**: 747–750, 895–942, especially:
- 917, the reset link (must not reveal whether an account exists),
- 932/933, expired links,
- 936, «завершит ваши сеансы на всех других устройствах»,
- 919/920/927/934, the password-strength hints.

**Safety and medical disclaimers**: 424 (no visa/health/safety advice), 692 («не для навигации или экстренных случаев»), 728 (health layer is not a care directory), 784, 785, 867.

**Prices and money**:
- 333/405/412, the 49 $ / 12 $ service prices, and whether to write «49 $» or «$49» for a Russian audience,
- 341, 343, 356, 361, 363, 365,
- 418, the offer terms,
- 423 (no commissions),
- 426, «До этого ответа ничего не списывается» (payment timing),
- 409 (not on sale yet).

**Names to confirm**:
- 62, Feryal Ashraf («Ферьял Ашраф»; the press also writes «Фериал»),
- 154, «Эль-Дабаа»,
- 391/495/497/653, «Храм на острове Филе»,
- 499: «Eid» rendered as Ураза-байрам and Курбан-байрам. Confirmed: `site/data/calendar.json` lists both Eid al-Fitr and Eid al-Adha (with Arafat Day).
- 872, «Каср-эн-Нил», «Эзбекия», «Сайида-Зейнаб».
- 874, «Город 6-го Октября» (also seen as «6 Октября»).

**Left unchanged on purpose, but a native reviewer may want them changed**:
- «без тайлов» / «карта без тайлов» (307, 529, 585, 632, 660, 676, 678) is jargon to a traveller. «без сторонних картографических сервисов» is clearer but longer, and some of these lines are SEO descriptions.
- «Цены за день» (85, nav label) could become «Цены на сегодня».
- «Человек в контуре» (600) is the accepted ML calque.
