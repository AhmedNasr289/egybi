# 02 Posts — Weeks 1 and 2

> Status: drafts for Ahmed to approve and rewrite in his own voice, written 2026-11-19 for use 23 November to 6 December 2026. Back to [[Home]] · plan: reports/EgyBI marketing and distribution plan.md · links follow the convention in [[01 Phase 0 — Listing, Search Setup and UTM]].

How to use this file:

- **Reddit answers carry no links at all.** Not to EgyBI, and not to anything else. Where an official website is the safety advice (for example the museum's only real ticket site), it is written inside backticks, like `tickets.gem.eg`, so Reddit shows it as text and does not turn it into a link. Each answer still says plainly that you built a site, without naming or linking it.
- **The first three Telegram replies carry no links**; anti-spam bots in resort chats delete links from new members. The last three carry one /ru/ link each, with its UTM.
- Every figure below comes from the site's data files (read 2026-11-19) or from a named research source; the source is in the text so a reader can check it.
- Before posting in any community, open its rules page and read it. Rules change, and none could be checked live during research.
- Answer only questions that are actually being asked. Paste, then edit the wording so it sounds like you.

---

## Reddit answers (no links)

### R1 · Tipping

**Answers:** "How much should I tip in Egypt? Every blog says something different."
**Where:** r/EgyptTravel, r/solotravel, r/travel. Check each subreddit's rules first.

> I'm a data engineer in Cairo and I keep a sourced table of exactly this for a free trip site I built, so here are the published figures rather than my opinion. Tipping has no official rate, so every number is from a named guide.
>
> - Hotel housekeeping: 50–100 EGP per room per day, left daily. (Pyramids Land, Tipping in Egypt, 2026 guide)
> - Camel or horse handler: 50–100 EGP per ride, after the ride and on top of its price. (same guide)
> - Felucca captain: 100–200 EGP for a one-hour sail, for the boat, not per person. (same guide)
> - Guide on a standard tour: 100–200 EGP per tour, by length (Travelling King, undated). The sources disagree a lot here: the same guide also suggests 10% of a half-day tour's price, and Mara House Luxor says US$25 or more per day on multi-day tours.
> - Nile cruise crew envelope: US$10–15 per person per night per Pyramids Land, but the same operator's other guide says US$25–40 for the whole trip. Ask your cruise company which they mean.
>
> For scale, 100 EGP was about US$1.86 on 19 Nov 2026 (53.77 EGP to the dollar, ExchangeRate-API market rate, not the Central Bank fixing). Carry small notes; big ones are hard to break.

### R2 · Giza scams and the camel price

**Answers:** "What's a fair price for a camel ride at Giza, and how do I avoid getting scammed?"
**Where:** r/EgyptTravel, r/solotravel. Check its rules first.

> Honest answer: there isn't one I can give you. I maintain a sourced price table for a free Egypt site I built (I'm a data engineer in Cairo), and when I searched on 9 Oct 2026 for a published, checkable camel-ride price at Giza, I found none, and no official price list either. Anyone quoting a confident "standard price" is guessing.
>
> What every guide agrees on: agree the TOTAL, the duration and the return leg before you get on. The common trick is a price that changes mid-ride. One traveller account (Where the Road Forks, 3 Mar 2024) describes a ride agreed at 200 pounds that became a demand for 1,000.
>
> Things that do have a figure:
>
> - Plateau entry, foreign adult: 700 EGP; students with a valid card 350 (Ministry of Tourism and Antiquities price list, 5 Nov 2024).
> - Inside the Great Pyramid: 1,500 EGP on top, from 1 Jan 2025, per Egypt Independent (4 Dec 2024). I couldn't confirm it on the Ministry's booking site.
> - Tip for the handler after the ride: 50–100 EGP (Pyramids Land, 2026 guide).
>
> Men who attach themselves to you as "guides" at the gate have no official role; licensed guides carry ID and are booked in advance (In Your Pocket). Buy tickets at the counter or on the Ministry's site, `egymonuments.com`.

### R3 · When to go, and the heat

**Answers:** "Is Egypt too hot in April/May? When's the best month?"
**Where:** r/EgyptTravel, r/travel. Check its rules first.

> It depends on where as much as when. I pulled NASA's climate normals (POWER, mean daily high 2001–2020) for the main sites for a free planner I built; I'm a data engineer in Cairo. Normal afternoon high, °C:
>
> - Giza: Jan 19, Feb 21, Mar 26, Apr 30, May 34, Jul 39, Dec 21
> - Karnak/Luxor: Jan 22, Feb 25, Mar 30, Apr 34, May 38, Jun–Aug 41, Dec 24
> - Abu Simbel: Jan 24, Feb 27, Mar 31, Apr 36, Jun–Aug 41
> - Philae (Aswan): 43 in August, the hottest normal afternoon of the 18 sites I track
>
> So the cut-off is Upper Egypt, not Cairo. Every site I track stays under 34 °C in the afternoon in January, February, March, November and December. From May, Luxor and Aswan afternoons are 38+, and the answer is to be there at opening (Karnak and Abu Simbel open 06:00 per the Ministry's booking site, checked 17 Nov 2026) and in the shade by noon.
>
> Caveat: these are modelled long-run averages, not a forecast; a given week can be hotter. And Luxor nights in January average about 6 °C, so bring a layer for the early starts.

### R4 · GEM tickets

**Answers:** "How much is the Grand Egyptian Museum now, and where do I buy?"
**Where:** r/EgyptTravel, r/Egypt weekly thread. Check its rules first.

> Prices went up on 1 November 2026. Egypt Today and Egyptian Streets (27 Oct 2026) reported the foreign adult ticket going from 1,570 to 1,830 EGP, and Egyptian adults from 200 to 220.
>
> I keep a sourced price table for a free site I built (data engineer in Cairo), so I'll be straight about one thing: the museum's own ticket site only shows prices once you start a booking, and I haven't found a price list from the museum I could check the 1,830 against. Treat it as the reported figure and read the real one in the booking flow.
>
> From the museum's official ticketing site (checked 18 Nov 2026):
>
> - Buy only on `tickets.gem.eg`. The museum says it is the only official site, and lookalike resellers exist.
> - Tickets are for a time slot.
> - Galleries 9:00–18:00, to 21:00 on Wednesday and Saturday; last entry one hour before the galleries close.
>
> For scale, 1,830 EGP is about US$34 at 53.77 EGP to the dollar (ExchangeRate-API, 19 Nov 2026). The museum had about 5.2 million visitors in its first year (Egyptian Streets, 16 Nov 2026), so book your slot ahead.

### R5 · Uber and the airport

**Answers:** "Best way from Cairo airport to my hotel? Does Uber work?"
**Where:** r/EgyptTravel, r/cairo, r/solotravel. Check its rules first.

> From the Cairo Airport and Uber pages (both checked 18 Nov 2026), which I list with sources on a free site I built; I'm a data engineer in Cairo.
>
> - Uber pick-up: in Terminal 2, turn left after customs and leave through Gate 7. Terminal 3: the B6 parking space. Uber gives no pick-up point for Terminal 1.
> - White taxis have meters. The old black-and-white ones don't, so agree the price before you set off. The airport itself says a class C airport limousine's price is the most a taxi fare should be.
> - Airport limousines have fixed prices by destination and car class, picked up at the kerb in front of each terminal.
> - Drivers approach tourists in the arrival hall. You don't need them.
>
> One thing travellers report (One Mile at a Time forum, August 2025): some Cairo drivers ask for extra cash before the ride, or cancel in the app to get paid in cash. You can decline and book another car.
>
> Outside Cairo: Uber's own city list doesn't include Luxor, Aswan or Sharm el-Sheikh; inDrive's does, and there you propose a fare. As a very rough anchor, a cross-city ride is typically US$1–3 (tabiji, 2026 comparison).

### R6 · Cash and ATMs

**Answers:** "Do I need cash in Egypt? How much should I bring?"
**Where:** r/EgyptTravel, r/travel. Check its rules first.

> A few sourced rules; I compile these for a free Egypt site I built (data engineer in Cairo).
>
> - You can bring in or take out up to 5,000 EGP. Foreign currency has no limit, but declare more than US$10,000 on arrival (UK government travel advice, entry requirements, updated 27 Oct 2026).
> - Visa on arrival at the airport kiosks is US$30, cash only (same source). Cairo's digital kiosks take cards: US$36, including a US$6 service fee. From 1 Jan 2027 the single-entry fee becomes US$33, or US$39 at Cairo's digital kiosks (ATTA, on a Cabinet decision of 13 Aug 2026).
> - Tips are expected in pounds, and big notes are hard to break, so get small ones early.
> - Bring clean, undamaged dollar notes. Travellers in Hurghada and Sharm report old or damaged ones refused (Tourdom, 22 Apr 2026).
> - Today's rate: 1 USD = 53.77 EGP, 1 EUR = 59.00, 1 GBP = 70.89 (ExchangeRate-API market reference, 19 Nov 2026; banks and exchange offices quote their own buy and sell).
>
> What I don't have a sourced figure for is ATM fees. They depend on your bank and the machine's bank, so read the screen before you confirm.

### R7 · Luxor in one day or two

**Answers:** "Is one day in Luxor enough?"
**Where:** r/EgyptTravel, r/solotravel. Check its rules first.

> Doable for the highlights, but two days is far more comfortable, and the clock is the real constraint. From the Ministry's booking site (checked 17 Nov 2026), via a free planner I built (I'm a data engineer in Cairo):
>
> - Karnak: opens 06:00, last entry 16:00, all year.
> - Valley of the Kings: opens 06:00, last entry 16:00 in winter and 17:00 in summer.
>
> Foreign adult tickets (Ministry price list, 5 Nov 2024): Karnak 600 EGP, Luxor Temple 500, Valley of the Kings 750, and Tutankhamun's tomb 700 on top. Without Tut that's 1,850 EGP, about US$34 at 53.77 to the dollar (19 Nov 2026).
>
> The split that works: West Bank from opening time on day one, Karnak at opening on day two. In one day you're doing the West Bank at dawn and Karnak by midday, which is fine from December to February, when Luxor's normal afternoon is 22–25 °C, and brutal from May, when it's 38 (NASA POWER normals, 2001–2020).
>
> Coming from Cairo: the sleeper trains now leave from Cairo Upper Egypt (Bashtil) station, not Ramses, from US$110 per person sharing a cabin, and booking opens 4–5 months ahead (Seat61, updated 14 Sep 2026).

### R8 · Ramadan 2027

**Answers:** "We're going in February 2027 and just realised it's Ramadan. What changes?"
**Where:** r/EgyptTravel, r/travel. Check its rules first.

> Ramadan 2027 is expected from 8 or 9 February to 8 or 9 March, and Eid al-Fitr from 9 or 10 March to 12 March. The exact days are set by moon sighting (The National, 6 Oct 2026; Gulf News). I track this for a free Egypt planner I built; I'm a data engineer in Cairo.
>
> What changes for visitors, from the Ministry's booking site (checked 17 Nov 2026):
>
> - Giza: opens 08:00, last entry 15:30 during Ramadan (normally 07:00 and 16:00).
> - Valley of the Kings: last entry 16:00 during Ramadan.
> - Karnak and Abu Simbel: the same hours as the rest of the year, 06:00 with last entry 16:00.
>
> Ramadan isn't a public holiday itself; Eid at its end is. February is also one of the mildest months: Giza's normal afternoon is 21 °C and Luxor's 25 (NASA POWER, 2001–2020 normals).
>
> One date to know: the Abu Simbel sun alignment on 22 February falls inside Ramadan in 2027. Hours there don't change for Ramadan, and the alignment-day ticket is 1,200 EGP on the Ministry's list and 1,272 on its booking site (checked 17 Nov 2026), against 750 on the list on other days.

### R9 · Abu Simbel

**Answers:** "Abu Simbel: day trip from Aswan, bus or tour? Worth it?"
**Where:** r/EgyptTravel, r/solotravel. Check its rules first.

> From the sources I keep for a free Egypt site I built (I'm a data engineer in Cairo):
>
> - Distance: Aswan to Abu Simbel is 275 km by desert road. A daily bus leaves Aswan at 08:00 and arrives at 12:00; the return leaves at 13:00 and reaches Aswan at 16:00. Most day tours leave very early, around 04:00 (Seat61, updated 14 Sep 2026).
> - Hours: opens 06:00, last entry 16:00, the same in summer, winter and Ramadan (Ministry booking site, checked 17 Nov 2026).
> - Ticket, foreign adult: 750 EGP on the Ministry's price list of 5 Nov 2024; its booking site showed 822 EGP on 17 Nov 2026. I can't tell you which you'll be charged, so I show both.
> - Sun alignment days: 22 February and 22 October. The list prints 1,200 EGP for those days, the booking site 1,272. The October 2026 alignment drew a queue of over 6,000 people (Egypt Today). 22 Feb 2027 is a Monday and falls in Ramadan.
> - Heat: normal afternoon 27 °C in February, 41 in June–August (NASA POWER, 2001–2020).
>
> The bus gets you there at noon, which in summer is the worst hour of the day. In winter it's fine.

### R10 · How much per day

**Answers:** "What's a realistic daily budget for Egypt?"
**Where:** r/EgyptTravel, r/solotravel, r/travel. Check its rules first.

> I'll dodge the single number, because I haven't found a sourced daily budget I trust and I'd rather not invent one. I keep a cited price table for a free site I built (Cairo-based data engineer). What I can give you is the fixed costs, which are where most of the surprises are.
>
> - Entry, foreign adult (Ministry price list, 5 Nov 2024): Giza plateau 700 EGP; Egyptian Museum 550; Karnak 600; Luxor Temple 500; Valley of the Kings 750; Abu Simbel 750 (822 on the booking site, 17 Nov 2026). Inside the Great Pyramid 1,500 more (Egypt Independent, from 1 Jan 2025). GEM: reported 1,830 since 1 Nov 2026 (Egypt Today).
> - Getting around: a cross-city ride typically US$1–3 (tabiji, 2026); Cairo–Luxor sleeper from US$110 per person sharing (Seat61, Sep 2026).
> - Tips: 50–100 EGP per room per day for housekeeping (Pyramids Land, 2026); 100–200 EGP per guided tour (Travelling King).
> - Visa: US$30 cash on arrival, US$33 from 1 Jan 2027 (UK government advice; ATTA).
>
> Rate: 53.77 EGP to the dollar (ExchangeRate-API, 19 Nov 2026). Hotels and food vary too much for one honest figure, so add your own.

---

## Russian Telegram replies (Hurghada and Sharm chats)

Chats to start in (from the research notes; check each chat's rules and pinned message first): «Хургада 🇪🇬 Чат TravelAsk», «Гайд Хургада 🇪🇬» (@HurghadaLive), «Шарм-Эль-Шейх🇪🇬 Чат TravelAsk», «Шарм-Эль-Шейх 🇪🇬 Чат» (@Sharm_el_Sheikh_live). Never pay any chat or channel for a post: a paid post is advertising under Russian law and needs an ERID label.

### T1 · Чаевые (без ссылки)

> Отвечу цифрами с источниками: я живу в Египте и веду таблицу таких цен для бесплатного сайта, который сделал сам (ничего здесь не продаю).
> — Горничной: 50–100 фунтов за номер в день, оставлять каждый день, потому что убирать может другой человек (гид Pyramids Land, 2026).
> — Погонщику верблюда или лошади: 50–100 фунтов за поездку, сверх цены самой поездки (там же).
> — Капитану фелюги: 100–200 фунтов за час на всю лодку, а не с человека (там же).
> — Гиду на обычной экскурсии: 100–200 фунтов в зависимости от длины (Travelling King). Но источники сильно расходятся: Mara House Luxor пишет от 25 $ в день на многодневных турах.
> Для ориентира: 100 фунтов ≈ 1,86 $ по курсу 53,77 фунта за доллар (ExchangeRate-API, 19.11.2026, рыночный курс, не курс ЦБ Египта). Давайте в фунтах и держите мелкие купюры — крупные трудно разменять.

### T2 · Экскурсия в Луксор или Каир (без ссылки)

> Цены туров у продавцов разные, а вот входные билеты фиксированы, и их полезно знать, чтобы понимать, что входит в цену. Официальный прайс Министерства туризма и древностей (5.11.2024), для взрослого иностранца:
> — Карнак 600 фунтов, Луксорский храм 500, Долина царей 750, гробница Тутанхамона ещё 700.
> — Плато Гизы 700, Египетский музей на Тахрир 550.
> Главный вопрос продавцу: какие билеты включены, а какие нет.
> По погоде: в Луксоре в декабре–феврале днём обычно 22–25 °C, а ночью и ранним утром около 6–8 °C (NASA POWER, нормы 2001–2020). Выезды обычно ночные, так что возьмите кофту.
> Для ориентира по рынку: на Sputnik8 автобусные поездки из Хургады в Каир рекламировались примерно от 51,90 $, мини-группы с Большим Египетским музеем — от 108 $ (данные на ноябрь 2026). Я живу в Египте и собираю такие цифры для бесплатного сайта, который сделал сам.

### T3 · Большой Египетский музей (без ссылки)

> С 1 ноября 2026 цены в Большом Египетском музее выросли. Egypt Today и Egyptian Streets (27.10.2026) пишут, что билет для взрослого иностранца подорожал с 1570 до 1830 фунтов — это около 34 $ по курсу 53,77. На сайте музея цена видна только когда начинаешь бронирование, так что сверьте там.
> Важно: покупать только на официальном сайте билетов музея (tickets, точка, gem, точка, eg). Музей говорит, что другого официального сайта нет. Билеты продаются на конкретное время.
> Залы открыты 9:00–18:00, в среду и субботу до 21:00; последний вход за час до закрытия залов (официальный сайт музея, проверено 18.11.2026).
> За первый год музей принял около 5,2 млн посетителей (Egyptian Streets, 16.11.2026), поэтому слот лучше брать заранее.
> Я живу в Египте и сделал бесплатный сайт с такими таблицами; ссылку здесь не даю.

### T4 · Наличные и виза по прилёте (со ссылкой)

> Виза по прилёте — 30 $ наличными, в киосках перед паспортным контролем. В аэропорту Каира есть ещё электронные автоматы — 36 $ картой, включая сбор 6 $. С 1 января 2027 года — 33 $, в каирских автоматах 39 $ (решение правительства Египта от 13.08.2026, по данным ATTA). Это правила в прочтении правительства Великобритании для британских паспортов; для российского паспорта уточните у туроператора.
> Если летите в Шарм и остаётесь на курортах Синая (Шарм-эль-Шейх, Дахаб, Нувейба, Таба), по тем же правилам ставят бесплатный штамп до 15 дней.
> Наличные: фунтов можно ввезти и вывезти до 5000; валюту больше 10 000 $ нужно декларировать. Карты российских банков работают ненадёжно (Сравни.ру, 2.11.2026), поэтому везите доллары или евро и меняйте в банке или обменнике. Купюры — чистые и целые: старые и повреждённые в Хургаде и Шарме часто не берут (Турдом, 22.04.2026).
> Все строки с источниками и датами проверки — на странице, которую я сделал: https://egybi.com/ru/arriving-in-egypt.html?utm_source=telegram&utm_medium=answer&utm_campaign=s2627-visa

### T5 · Жара в декабре–феврале (со ссылкой)

> По нормам NASA POWER (средний дневной максимум и ночной минимум, 2001–2020):
> — Хургада: днём в декабре 23 °C, в январе 21; ночью около 16–18.
> — Дахаб (ближайшая к Шарму точка в моей таблице): днём 22 в декабре, 20 в январе, 22 в феврале; ночью 8–10.
> — Луксор (Карнак): днём 24 в декабре, 22 в январе, 25 в феврале; ночью 6–8.
> — Каир и Гиза: днём 21 в декабре, 19 в январе, 21 в феврале.
> Днём комфортно везде, вечером у моря свежо, а на ранних выездах в Луксор и в пустыне — холодно. Это многолетние средние, не прогноз на конкретную неделю.
> Таблица по 18 местам и всем месяцам — на сайте, который я сделал: https://egybi.com/ru/visit.html?utm_source=telegram&utm_medium=answer&utm_campaign=s2627-heat

### T6 · Зазывалы в Гизе (со ссылкой)

> Про Гизу коротко, по источникам:
> — Билет на плато для иностранца — 700 фунтов, студентам 350 (прайс министерства, 5.11.2024). Внутрь пирамиды Хеопса — отдельный билет, 1500 фунтов с 1.01.2025 (Egypt Independent).
> — Цены на верблюда нет ни в одном источнике, который можно проверить, и официального прайса тоже. Поэтому договаривайтесь об итоговой сумме, времени и обратной дороге до того, как сесть. Частый трюк — цена меняется посреди поездки: в одном рассказе договорились на 200 фунтов, а потребовали 1000 (Where the Road Forks, 2024).
> — «Гиды», которые сами пристраиваются у входа, не официальные. Лицензированного гида бронируют заранее, у него есть удостоверение (In Your Pocket).
> — Билеты — в кассе или на сайте министерства egymonuments.com.
> — Туристическая полиция: 126.
> Страница с ценами и источниками (сделал сам, бесплатно): https://egybi.com/ru/fair-prices.html?utm_source=telegram&utm_medium=answer&utm_campaign=s2627-prices

---

## Arabic Facebook group posts

Ask each group's admin first, in a private message: «أنا مهندس بيانات وعامل موقع مجاني فيه أرقام بمصادرها. ممكن أنزل بوست معلومات وأحط الرابط في أول تعليق؟». Post the text with one image (a screenshot of the page), then add the first comment yourself straight after.

### F1 · الأسعار اليومية (prices-ar.html)

**Image:** screenshot of the "biggest moves" list on https://egybi.com/egypt-food-prices.html (the Arabic item names are on it).

> البصل زاد ٥٦٪ من يوليو لحد النهارده، والرقم ده مش رأي، ده من أرقام الحكومة نفسها.
>
> أنا مهندس بيانات عايش في مصر، وبحفظ كل يوم أسعار التجزئة اللي بينشرها مركز المعلومات ودعم اتخاذ القرار بمجلس الوزراء، من آخر يوليو. لما قارنت أول أسبوع (من ٢٤ يوليو ٢٠٢٦) بآخر أسبوع (لحد ١٩ نوفمبر ٢٠٢٦):
>
> • البصل: من ١٣٫٩٤ إلى ٢١٫٧٦ جنيه للكيلو (+٥٦٫١٪)
> • البطاطس: من ١٩٫٣٦ إلى ٢٥٫٣٦ (+٣١٪)
> • الطماطم: من ١٩٫٩٣ إلى ٢٤٫٣٢ (+٢٢٫١٪)
> • والليمون البلدي نزل: من ٤٨٫٨١ إلى ٣٥٫٣٧ (−٢٧٫٥٪)
>
> وعلى ١٢٨ صنف، الوسيط اتحرك +١٫٩٪ بس، في نفس الأسابيع اللي الدولار فيها اتحرك من ٥١٫٣٠ لـ ٥٣٫٦٠ جنيه (+٤٫٥٪).
>
> دي متوسطات أسعار تجزئة للأصناف، مش سلة أسرة ولا معدل تضخم، والسوق عندك ممكن يختلف.
>
> عملت صفحة مجانية بتعرض أسعار النهارده بمصدرها، والرابط في أول تعليق. أنا اللي بنيت الموقع، ومش ببيع حاجة في الصفحة دي.

**First comment:**

> أسعار الخضار والفاكهة النهارده بمصادرها: https://egybi.com/prices-ar.html?utm_source=facebook&utm_medium=comment&utm_campaign=s2627-prices
> المصدر: بوابة الأسعار المحلية بمركز المعلومات ودعم اتخاذ القرار، مجلس الوزراء.

### F2 · اسمك بالهيروغليفي (ar/hieroglyphs.html)

**Image:** a screenshot of the studio with your own name in the cartouche.

> اكتب اسمك بالهيروغليفي، بس بأمانة: الأداة دي بتكتب «أصوات» اسمك، مش ترجمة له.
>
> عملت أداة مجانية بتكتب أي اسم بالحروف اللاتينية علامة علامة جوه خرطوش، زي ما كانت الأسماء الملكية بتتكتب على الآثار. كل علامة من العلامات «الأحادية» في قائمة غاردنر (كتاب Egyptian Grammar، الطبعة التالتة ١٩٥٧)، ومعاها رقمها وبتصوّر إيه.
>
> اللي لازم يتقال: الكاتب المصري القديم ماكانش هيكتب اسمك كده. الخط كان بيكتب الحروف الساكنة ويضيف علامات للمعنى، وحروف العلة ماكانتش بتتكتب بالطريقة دي. عشان كده أداتين محترمتين ممكن يدّوا كتابتين مختلفتين لنفس الاسم.
>
> اكتب اسمك بالإنجليزي في الأداة واحفظه صورة. ولو حابب، اكتب اسمك في التعليقات وأنا هنزّل صور لأول عشرة.
>
> الرابط في أول تعليق. أنا اللي بنيت الموقع، وهو مجاني ومن غير تسجيل.

**First comment:**

> استوديو الأسماء: https://egybi.com/ar/hieroglyphs.html?utm_source=facebook&utm_medium=comment&utm_campaign=s2627-names
> المصادر: قائمة علامات غاردنر، وجدول يونيكود للهيروغليفية المصرية.

### F3 · أفضل وقت لزيارة مصر (ar/visit.html)

**Image:** screenshot of the month-by-month table on https://egybi.com/egypt-weather-by-month.html.

> إمتى الأقصر وأسوان تبقى نار؟ بالأرقام مش بالإحساس.
>
> جمعت متوسط درجة الحرارة العظمى اليومية، يعني اللي بتوصله الحرارة بعد الضهر في يوم عادي، من بيانات ناسا المناخية NASA POWER (متوسط ٢٠٠١–٢٠٢٠) لـ ١٨ موقع:
>
> • الكرنك بالأقصر: يناير ٢٢، فبراير ٢٥، مارس ٣٠، أبريل ٣٤، مايو ٣٨، ومن يونيو لأغسطس ٤١
> • أبو سمبل: يناير ٢٤، فبراير ٢٧، ومن يونيو لأغسطس ٤١
> • فيلة بأسوان: أغسطس ٤٣، وده أعلى رقم في الجدول كله
> • الأهرامات: يناير ١٩، يوليو ٣٩
> • الغردقة: يناير ٢١، أغسطس ٣٥
>
> الخلاصة: في يناير وفبراير وديسمبر الـ١٨ موقع كلهم بعد الضهر تحت ٢٨ درجة. وفي يوليو الفرق بين أبرد وأسخن موقع ١٣ درجة: حوالي ٢٩ في أبو مينا و٤٢ في فيلة.
>
> دي متوسطات على مدى سنين طويلة، مش توقعات طقس.
>
> لو مسافر الصعيد في الصيف: الكرنك وأبو سمبل بيفتحوا الساعة ٦ الصبح (موقع الحجز التابع لوزارة السياحة والآثار، اتأكدت منه يوم ١٧ نوفمبر ٢٠٢٦)، فروح بدري.
>
> الجدول كامل شهر بشهر في أول تعليق. أنا اللي عملت الموقع، وهو مجاني.

**First comment:**

> أفضل وقت لزيارة مصر، شهر بشهر في كل موقع: https://egybi.com/ar/visit.html?utm_source=facebook&utm_medium=comment&utm_campaign=s2627-heat
> المصدر: NASA POWER، متوسطات ٢٠٠١–٢٠٢٠.

---

## LinkedIn posts (chart first, link in the first comment)

### L1 · Launch (week 2)

**Image:** the chart at https://egybi.com/charts/egypt-weather-by-month.svg, exported to PNG (open it in a browser, screenshot at full width).

> I spent my evenings this year building EgyBI, a free Egypt trip companion where every number carries its source and the date it was checked.
>
> The chart is the part I'm proudest of: the normal afternoon high at 18 Egyptian sites, every month, from NASA's POWER climatology (2001–2020 normals). Before it ships, every value is compared with the nearest published weather-station normal within 120 km, and the build is refused if the mean bias passes ±2 °C.
>
> What it shows:
> • In July the spread between sites is 13 °C: about 29 °C at Abu Mena near Alexandria, about 42 °C at Philae in Aswan.
> • Every site stays under 34 °C in the afternoon in January, February, March, November and December.
> • The hottest normal afternoon in the table is Philae in August, about 43 °C.
>
> The rest of the site follows the same rule. Entry tickets come from the Ministry's list, tips from named guides, and where sources disagree, both are shown. Where no reliable figure exists, like a camel ride at Giza, it says so.
>
> English, Arabic and Russian. No signup. Link in the first comment.
>
> #dataengineering #opendata #Egypt

**First comment:**

> The planner and the chart (I built it; free, no signup): https://egybi.com/?utm_source=linkedin&utm_medium=comment&utm_campaign=s2627-launch

### L2 · The pound and food prices (week 4 or later)

**Image:** https://egybi.com/charts/egyptian-pound.svg exported to PNG.

> Two series I've collected every day since July, and why I won't join them with "because".
>
> 1. The dollar went from EGP 51.30 to EGP 53.60 between the first week (from 24 July) and the last (to 19 November 2026), comparing weekly medians: +4.5%. These are ExchangeRate-API market reference rates, not the Central Bank fixing.
> 2. Across 128 food items on the Cabinet's IDSC local-prices portal, the median retail price moved +1.9% over the same weeks. 82 rose and 45 fell. Onions +56%, local lemons −27.5%.
>
> The tempting headline is "food lagged the pound". The honest one is that two measured series moved by different amounts; the data does not say one caused the other.
>
> The data-engineering part: the portal published on 104 of 119 days, and single days are noisy. Fish stood 18.9% off its start on 18 August and 3.5% the next day the portal published. So each item is compared first-week median to last-week median, and the chart shows weekly medians.
>
> Both charts are free to embed with the credit line. I built and run EgyBI; link in the first comment.
>
> #data #Egypt #economics

**First comment:**

> The pound since July (embeddable): https://egybi.com/egyptian-pound-since-july.html?utm_source=linkedin&utm_medium=comment&utm_campaign=s2627-prices
> And the food series: https://egybi.com/egypt-food-prices.html?utm_source=linkedin&utm_medium=comment&utm_campaign=s2627-prices

---

## Show HN — DRAFT ONLY

**This is a draft. Rewrite it in your own words before posting. HN wants human-written text, and moderators asked in 2026 for Show HN posts not to be written by an LLM. Never ask anyone to upvote or comment.** Plan: Tuesday 8 or Wednesday 9 December 2026, US Eastern morning.

**Title:** Show HN: An Egypt trip planner built on NASA climate normals and cited prices

(The plan's draft title named "CBE rates". The site uses ExchangeRate-API market reference rates and says they are not the Central Bank fixing, so the title must not say CBE.)

**URL field:** https://egybi.com/plan.html?utm_source=hn&utm_medium=post&utm_campaign=s2627-launch

**First comment (draft to rewrite):**

> I'm a data engineer living in Egypt. EgyBI is a trip planner I built because the questions visitors ask me (is Luxor too hot in May, what should a tip be, which ticket price is real) all have answers in public data, scattered across a NASA API, a Ministry PDF and a dozen blogs that disagree.
>
> What it does: pick your dates and stops, and it shows the normal afternoon high at each of 18 sites in your months, the straight-line legs, the holidays inside your dates, and the day's exchange rate. It prints as a dossier. No signup; nothing is sent to a server unless you choose to save to an account.
>
> The rules I held myself to:
> - Every row carries a source and the date it was checked.
> - Where two sources disagree, both are shown. Abu Simbel is 750 EGP on the Ministry's 2024 list and was 822 on its booking site when I checked; the page shows both.
> - Where there is no reliable figure, it says so. I could not find a checkable price for a camel ride at Giza, so there isn't one.
> - Heat is NASA POWER (MERRA-2) mean daily highs, 2001–2020. The build fails if the mean bias against station normals within 120 km passes ±2 °C.
>
> Built as a Python pipeline that writes static pages, JSON and SVG charts; the planner computes in the browser. English, Arabic and Russian.
>
> Disclosure: there is an optional $12 printable pack and a $49 written plan check. Everything in this post is free.
>
> I'd most like feedback on the planner's first-run flow and on any figure you think is wrong.

---

## r/dataisbeautiful [OC] — for week 5 or later

Post only after at least four weeks of link-free answers on the account, and check the subreddit's current rules first (the [OC] tag and a first comment with source and tool are required, per the research notes).

**Title:** [OC] How hot a normal afternoon gets at 18 Egyptian sites, every month (NASA POWER, 2001–2020 normals)

**Chart:** https://egybi.com/charts/egypt-weather-by-month.svg, exported to PNG at full width. It is generated by the site's own pipeline (heat_calendar.py), so it is original content.

**Required first comment:**

> Source: NASA POWER climatology API (MERRA-2 reanalysis), mean daily maximum temperature averaged over 2001–2020, at each site's coordinates. These are modelled long-run averages, not station readings and not a forecast. Each value was checked against the nearest published weather-station normal within 120 km; the build is refused if the mean signed bias exceeds ±2.0 °C.
>
> Tool: Python (standard library) writing the SVG directly; colour bands at 21 °C or less, 22–27, 28–33, 34–38 and 39 or more.
>
> A few things it shows: in January, February and December all 18 sites have a normal afternoon under 28 °C; in July the spread between sites is 13 °C (about 29 at Abu Mena, about 42 at Philae); the hottest cell is Philae in August, about 43.
>
> I made this for a free Egypt trip site I built (disclosure). The interactive version, with each site's nights, rain and golden-hour times: https://egybi.com/egypt-weather-by-month.html?utm_source=reddit&utm_medium=oc&utm_campaign=s2627-heat
