# 05 Newsletter — Lead Magnet and Welcome Series

> Status: copy complete, written 2026-11-19; the cheat sheet PDF and the automatic welcome sending still need a Claude coding session (see the end). Back to [[Home]] · plan: reports/EgyBI marketing and distribution plan.md · links follow [[01 Phase 0 — Listing, Search Setup and UTM]].

The Papyrus runs on the site's own mailer (`site/api/newsletter.php` with double opt-in, `site/api/send_issue.php` for issues). It sends one issue to the whole confirmed list; it has no automatic sequence yet. So the welcome series below needs one small build, described at the end.

---

## 1. The lead magnet: "Egypt, honestly: the prices-and-heat cheat sheet"

One A4 page, two columns, printed from the site's data on the day it is built. Every figure below is the value on 2026-11-19 with its source; when the PDF is rebuilt, the figures are re-read from the data files, never retyped.

**Header:** Egypt, honestly — the prices-and-heat cheat sheet · edition of the build date · egybi.com (I built and run it)

**Block 1 — What your money is worth**
- 1 USD = 53.77 EGP · 1 EUR = 59.00 · 1 GBP = 70.89 (ExchangeRate-API market reference rate, 19 Nov 2026; not the Central Bank fixing; banks quote their own buy and sell)
- 100 EGP ≈ US$1.86

**Block 2 — Entry, foreign adult** (Ministry of Tourism and Antiquities price list, 5 Nov 2024, unless stated)
- Giza plateau 700 EGP (students 350) · inside the Great Pyramid +1,500 (Egypt Independent, 4 Dec 2024; not on the booking site)
- Egyptian Museum, Tahrir 550 · Karnak 600 · Luxor Temple 500 · Valley of the Kings 750, Tutankhamun's tomb +700
- Abu Simbel 750 on the list, 822 on the booking site (17 Nov 2026); on 22 Feb and 22 Oct 1,200 on the list, 1,272 on the booking site
- Grand Egyptian Museum: prices rose on 1 Nov 2026; buy only on tickets.gem.eg, where the price shows during booking

**Block 3 — Tips** (Pyramids Land, Tipping in Egypt, 2026, unless stated)
- Housekeeping 50–100 EGP per room per day, left daily
- Camel or horse handler 50–100 EGP per ride, after the ride
- Felucca captain 100–200 EGP per one-hour sail, for the boat
- Guide, standard tour 100–200 EGP (Travelling King); multi-day tours US$25+ per day (Mara House Luxor)
- Nile cruise crew US$10–15 per person per night; the same operator elsewhere says US$25–40 for the whole trip. Ask your operator.

**Block 4 — Rides**
- Typical cross-city ride US$1–3 (tabiji, 2026). Open Uber or inDrive for the same trip and read its quote before agreeing any street fare.
- Camel ride at Giza: **no reliable published price exists** (searched 9 Oct 2026). Agree the total, the time and the ride back before you get on.
- Cairo airport: Uber pick-up at Terminal 2 Gate 7 and the Terminal 3 B6 parking space; none at Terminal 1 (Uber, checked 18 Nov 2026).

**Block 5 — How hot a normal afternoon gets, °C** (NASA POWER mean daily high, 2001–2020 normals)

| Site | Jan | Mar | May | Jul | Dec |
|---|---|---|---|---|---|
| Giza | 19 | 26 | 34 | 39 | 21 |
| Karnak, Luxor | 22 | 30 | 38 | 41 | 24 |
| Abu Simbel | 24 | 31 | 39 | 41 | 25 |
| Philae, Aswan | 24 | 32 | 40 | 42 | 26 |
| Hurghada | 21 | 25 | 31 | 34 | 23 |
| Alexandria | 19 | 23 | 30 | 34 | 21 |

Karnak and Abu Simbel open at 06:00, last entry 16:00; Giza opens 07:00, last entry 16:00 (Ministry booking site, checked 17 Nov 2026).

**Block 6 — Getting in, and cash** (UK government travel advice, updated 27 Oct 2026, read for British passports; check your own country's advice)
- Visa on arrival US$30, cash only · Cairo digital kiosks US$36 by card · e-Visa US$30 single, US$65 multiple (visa2egypt.gov.eg)
- From 1 Jan 2027: US$33, or US$39 at Cairo's digital kiosks (ATTA, Cabinet decision of 13 Aug 2026)
- Up to 5,000 EGP in or out; declare foreign currency over US$10,000
- Tourist police 126

**Block 7 — Dates for 2027** (calendar sources named on egybi.com/egypt-public-holidays.html)
- Coptic Christmas, Thu 7 Jan · Ramadan expected 8 or 9 Feb to 8 or 9 Mar · Abu Simbel sun alignment, Mon 22 Feb · Eid al-Fitr expected 9 or 10 to 12 Mar · Sham el-Nessim, Mon 3 May
- Giza during Ramadan: opens 08:00, last entry 15:30

**Footer:** Three habits every source agrees on: agree the total first; anchor on the app's fare; carry small notes. Every figure has a source and a date; where sources disagree, both are shown. Not affiliated with any tour company.

---

## 2. Signup copy for the site

Use on the home page briefing, plan.html, fair-prices.html and the weather page, in the existing newsletter box.

- **Heading:** Egypt, honestly: the cheat sheet
- **Line:** One page with entry prices, tips, ride rules, afternoon heat at six sites and the 2027 dates, every figure sourced. Free, with The Papyrus: one letter a month for anyone planning Egypt.
- **Field placeholder text:** Your email address
- **Button:** Send me the cheat sheet
- **Small print:** We send a confirmation link first; nothing arrives until you click it. One letter a month, unsubscribe in one click. Your address is never shared or sold.
- **After pressing the button:** Check your inbox for the confirmation link. The cheat sheet comes as soon as you confirm.

Arabic version:

- **العنوان:** مصر بصراحة: ورقة الأسعار والحرارة
- **السطر:** صفحة واحدة فيها أسعار الدخول والبقشيش وقواعد المواصلات والحرارة بعد الظهر في ستة مواقع ومواعيد ٢٠٢٧، وكل رقم بمصدره. مجانًا مع «البردية»: رسالة واحدة في الشهر لمن يخطط لزيارة مصر.
- **الزر:** أرسلوا لي الورقة
- **سطر صغير:** نرسل أولًا رابط تأكيد، ولن يصلك شيء قبل أن تضغطه. رسالة واحدة في الشهر، وإلغاء الاشتراك بضغطة واحدة.

Russian version:

- **Заголовок:** Египет честно: шпаргалка по ценам и жаре
- **Строка:** Одна страница: цены билетов, чаевые, правила поездок, дневная жара в шести местах и даты 2027 года, у каждой цифры источник. Бесплатно вместе с «Папирусом» — одно письмо в месяц для тех, кто планирует Египет.
- **Кнопка:** Пришлите шпаргалку
- **Мелкий шрифт:** Сначала придёт письмо со ссылкой для подтверждения. Одно письмо в месяц, отписка в один клик.

---

## 3. The welcome series (five emails)

Send email 1 straight after confirmation, then emails 2–5 on days 2, 4, 7 and 10. Signed "Ahmed". Every link carries the newsletter UTMs.

### Email 1 — day 0

- **Subject:** Your cheat sheet, and why every number has a date
- **Preview text:** Prices, tips, heat and the 2027 dates on one page.

> Hello,
>
> Thank you for confirming. Your cheat sheet is attached as a one-page PDF, and the key lines are below in case you are reading on a phone.
>
> - Giza plateau entry: 700 EGP for a foreign adult (Ministry price list, 5 Nov 2024).
> - Housekeeping tip: 50–100 EGP per room per day, left daily (Pyramids Land, 2026).
> - Camel ride at Giza: no reliable published price exists. Agree the total, the time and the ride back first.
> - A normal July afternoon at Karnak: 41 °C. In January: 22 (NASA POWER, 2001–2020).
> - Visa on arrival: US$30 cash, US$33 from 1 January 2027 (UK government advice; ATTA).
>
> Why the dates? Because Egyptian prices move with the pound. A figure without a date is a guess you can't check. Every line on the sheet tells you where it came from and when.
>
> I'm Ahmed. I'm a data engineer living in Egypt, and I built EgyBI so the questions visitors ask me have answers they can check. Over the next ten days I'll send four short letters, one subject each.
>
> Ahmed
>
> P.S. Start with your dates: https://egybi.com/plan.html?utm_source=newsletter&utm_medium=email&utm_campaign=s2627-launch

### Email 2 — day 2

- **Subject:** The month you go changes everything
- **Preview text:** In July the gap between two Egyptian sites is 13 °C.

> Hello,
>
> Most "best time to visit Egypt" advice talks about the country as if it had one climate. It has several.
>
> From NASA's climate normals (2001–2020), here is what a normal afternoon reaches:
>
> - In July, the spread between sites is 13 °C: about 29 at Abu Mena near Alexandria, about 42 at Philae in Aswan.
> - Every one of the 18 sites I track stays under 34 °C in the afternoon in January, February, March, November and December.
> - Karnak is 30 in March and 38 in May. That two-month gap is where most spring trips go wrong.
>
> Two practical rules follow. If you go to Luxor or Aswan after April, be at the gate when it opens: Karnak and Abu Simbel open at 06:00 (Ministry booking site, checked 17 November 2026). And bring a layer in winter: a January night at Karnak averages about 6 °C.
>
> The full table, all 18 sites and all twelve months: https://egybi.com/egypt-weather-by-month.html?utm_source=newsletter&utm_medium=email&utm_campaign=s2627-heat
>
> Ahmed

### Email 3 — day 4

- **Subject:** The price nobody publishes
- **Preview text:** What to do when there is no fair price to quote.

> Hello,
>
> When I built the fair-prices page, I searched for a published, checkable price for a camel ride at Giza. On 9 October 2026 I still had not found one, and there is no official list. So the page says exactly that.
>
> I think that matters more than any number. If a source tells you a camel ride "should" cost a precise amount, ask where it comes from. One traveller account (Where the Road Forks, 2024) describes a ride agreed at 200 pounds that turned into a demand for 1,000.
>
> Where a price does exist, use it:
>
> - Entry tickets have official prices. Karnak is 600 EGP and the Valley of the Kings 750 for a foreign adult (Ministry list, 5 Nov 2024).
> - For a street taxi, open Uber or inDrive for the same trip and read its quote first, even if you then take the taxi.
> - For anything else, agree the total, how long it lasts, and the ride back, before you start.
>
> The page has a box where you type the price you were quoted, and it compares it with the published range. Nothing you type leaves your phone: https://egybi.com/fair-prices.html?utm_source=newsletter&utm_medium=email&utm_campaign=s2627-prices
>
> Ahmed

### Email 4 — day 7

- **Subject:** Five dates that change an Egypt trip in 2027
- **Preview text:** The visa, Ramadan, Abu Simbel's alignment and Eid.

> Hello,
>
> Five dates worth checking against your trip:
>
> 1. **1 January 2027.** The single-entry visa goes from US$30 to US$33, or US$39 at Cairo airport's digital kiosks (ATTA, on a Cabinet decision of 13 August 2026).
> 2. **7 January.** Coptic Christmas, a public holiday.
> 3. **8 or 9 February to 8 or 9 March.** Ramadan is expected; the exact days depend on the moon sighting. Giza then opens at 08:00 with last entry at 15:30, against 07:00 and 16:00 normally. Karnak and Abu Simbel keep their hours.
> 4. **Monday 22 February.** The Abu Simbel sun alignment, this year inside Ramadan. The day's ticket is 1,200 EGP on the Ministry's list and 1,272 on its booking site. The October 2026 alignment drew a queue of over 6,000 people (Egypt Today).
> 5. **9 or 10 to 12 March.** Eid al-Fitr is expected: a public holiday of several days, so book trains and timed tickets early.
>
> All twelve public holidays, each with its source: https://egybi.com/egypt-public-holidays.html?utm_source=newsletter&utm_medium=email&utm_campaign=s2627-ramadan
>
> Ahmed

### Email 5 — day 10

- **Subject:** If you want the whole thing printed, or a second pair of eyes
- **Preview text:** Two optional ways to support the free site.

> Hello,
>
> Everything on EgyBI is free, and it will stay that way. If it has been useful, there are two optional things that pay for it.
>
> **The Papyrus Egypt Dossier, $12.** One printable PDF: all 18 site sheets with twelve months of heat and rain, elevation and the light on the 15th of each month; the fair-price pocket card in English and Arabic, every row sourced; and the 2027 holiday calendar. It is the site's data, laid out to print and carry offline: https://egybi.com/dossier.html?utm_source=newsletter&utm_medium=email&utm_campaign=s2627-pack
>
> **The plan check, $49.** Send me your draft itinerary and within 48 hours you get a written check of the heat, distances, holidays and prices on your route, each point tied to a sourced figure. You email first, and nothing is charged until I reply to confirm I can help: https://egybi.com/ask.html?utm_source=newsletter&utm_medium=email&utm_campaign=s2627-check
>
> No bookings, no commissions, no affiliate links in either.
>
> From here on you'll get The Papyrus once a month: what the coming month looks like for heat, holidays and the pound.
>
> Ahmed

**Before the pack is on sale, change one paragraph.** Until the Payhip checkout is live, replace the pack paragraph in email 5 with: "**The Papyrus Egypt Dossier, $12,** is in preparation: all 18 site sheets, the fair-price pocket card in English and Arabic, and the 2027 holiday calendar in one printable PDF. You are on the list, so you will hear the day it opens." Once the dossier page has its buy button, switch back to the paragraph above. Everything else stays the same.

---

## 4. What needs a Claude coding session

Say to a session on the repo: "Build the cheat sheet PDF and the welcome series from egybi/Campaign Kit/05." It will:

1. Generate the one-page cheat sheet from the site's data files (fx-today, fair-prices, arrival, opening-hours, visit-climate, calendar), the same way `dossier_pack.py` builds the pack, so the figures are never retyped; save it where the welcome email can attach or link it.
2. Add the five welcome emails as issue files under `site/newsletter/issues/` and a small sender that mails email *n* to each subscriber *n* days after their confirmation, reusing `send_issue.php`'s idempotent per-recipient log so nobody gets a letter twice.
3. Put the new signup copy into the newsletter boxes in EN, AR and RU.
4. Open a PR for you to approve.
