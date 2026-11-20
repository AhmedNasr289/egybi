# 08 Improvement Pass — 2026-11-20

> Second pass on the season campaign: guesses replaced with evidence where a tool could reach it, and marked **unverified** where none could. Back to [[Home]] · plan: `reports/EgyBI marketing and distribution plan.md` · raw data: `research_notes/EgyBI marketing and distribution plan/autocomplete_2026-11-20.json` (re-run with `autocomplete_mine.py`).

## 1. Demand: what people actually type (measured)

**Method.** Google autocomplete (`suggestqueries.google.com`, `hl` = en/ru/ar) and Yandex autocomplete (`suggest.yandex.ru`) on 2026-11-20, from a cloud machine. Each seed phrase was expanded with every letter of its alphabet (a–z, а–я, ا–ي) and the distinct suggestions counted. **This is breadth of demand, not search volume**: a topic with many distinct completions is one many people type in many ways. It is the best signal reachable without a keyword tool (see §7 for the connectors that give volumes). Autocomplete in November also under-represents topics that peak later (Ramadan peaks in January–February).

| Rank | Topic | Distinct completions per seed | What people type (verbatim) | EgyBI page that answers it |
|---|---|---|---|---|
| 1 | Visa | EN 192 · RU Google 201 / Yandex 143 | "egypt visa on arrival cost", "…for us citizens", "…cost in gbp"; «виза в египет для россиян 2026», «виза в египет с 1 марта 2026» | `arriving-in-egypt.html` (+ /ru/) |
| 2 | Best time / weather | EN 179 · RU 119 / 87 · AR 26 | "best time to visit egypt weather by month", "…not too hot", "…december"; «погода в египте в …»; «افضل وقت لزيارة مصر» | `visit.html`, `egypt-weather-by-month.html` |
| 3 | GEM tickets | EN 128 | "grand egyptian museum tickets price", "…for foreigners", "…official site", "…reddit" | `fair-prices.html` (row has **no figure**: see §4) |
| 4 | Heat at a site | EN 95 | "luxor weather", "aswan weather in …", "is egypt too hot in …" | `visit/<site>.html` |
| 5 | Itinerary | EN 92 | "egypt itinerary 7 days / 10 days" | `plan.html` |
| 6 | Trip cost | EN 79 | "egypt travel cost per day", "egypt 7 day trip cost" | `fair-prices.html` (no daily-budget total: honest gap) |
| 7 | Tipping | EN 70 · RU 25 / 10 | "tipping in egypt 2026", "…in egyptian pounds", "…us dollars", "…nile cruise"; «чаевые в египте 2026», «…рублями» | `fair-prices.html` |
| 8 | Name in hieroglyphs | EN 64 | "name in hieroglyphics generator", "…copy paste", "…necklace", "…cartouche" | `hieroglyphs.html` |
| 9 | Uber / airport | EN 61 | "uber cairo airport", "cairo airport to giza" | `arriving-in-egypt.html` |
| 10 | Russian money and cards | RU 43 / 46 | «карты мир в египте 2026», «российские карты в египте», «какие деньги лучше брать в египет доллары или евро» | `/ru/arriving-in-egypt.html` (already covers Mir cards) |
| 11 | Arabic prices | AR 134 | «اسعار الخضروات اليوم», «سعر الدولار اليوم» | `prices-ar.html` |
| 12 | Arabic ticket prices | AR 34 | «أسعار تذاكر الأهرامات للاجانب / للعرب / للمصريين / 2026» | `ar/fair-prices.html` (foreign prices only: see §4) |
| low | Giza scams / camel | EN 21 | "egypt scams reddit", "giza pyramid scams" | `fair-prices.html` |
| low | Abu Simbel festival | EN 21 | | `visit/abu-simbel.html` |
| low (seasonal) | Ramadan 2027 | EN 10 | "ramadan 2027 egypt dates", "when is ramadan 2027 egypt" | `egypt-public-holidays.html` |
| low | Russian excursions | RU 16 / 4 | «экскурсии из хургады цены», «…анекс тур», «…библио глобус» | `/ru/fair-prices.html` |

**What changed in the calendar** (`07 Content Calendar.csv` and the Calendar tab, same content):
- The week-1 English Reddit slot (27 Nov) now carries the **visa** answer; the Giza-scams answer moved to its old slot (15 Dec). Visa is the broadest demand in both English and Russian; scams the narrowest.
- The week-1 Russian chat slot (24 Nov) now carries **cash and the visa on arrival**; the GEM reply moved to 3 Dec. The swap kept the rule that the first three chat replies carry no link: the cash/visa reply lost its link line and the GEM reply gained a tagged link to `/ru/fair-prices.html`.
- A new column, `demand_evidence`, tags every row with its topic and measured breadth.
- **Flag, not yet acted on:** 17 rows are about Ramadan and 11 about the visa. Autocomplete in November says the reverse weighting. Ramadan demand peaks later, so keep the Ramadan rows but add visa rows in the first two weeks of January, around the 1 January fee change (judgement).

## 2. Competitors (from the deep-research search phase; pages themselves could not be fetched)

| Competitor | What it is | What it lacks that EgyBI has |
|---|---|---|
| tonkosti.ru «Чаевые в Египте» | The main Russian tipping page; **dated 28 Jan 2022** | Current, cited amounts. → Russian tipping post and pin use EgyBI's dated rows (pin10 already does) |
| travelto.ru «Как платить в Египте в 2026» | Payments for Russians: Russian Visa/Mastercard and Mir do not work | EgyBI's `/ru/arriving-in-egypt.html` covers the same with sources and check dates |
| howtrip.ru «Египет самостоятельно — 2026» | First-person review, uncited prices that disagree with each other (visa $25 vs $30) | Sourced visa rows with the 1 Jan 2027 change |
| egyptra.pro (RU/AR) | Guide labelled 2026; competitor for Hurghada searches | Not fetched: **unverified** whether it cites sources |
| Payhip "Egypt Travel Guide, 112 Best Things to Do" | **$6**, 26 pages | No dates or sources visible in the listing |
| Gumroad "10-day Egypt itinerary" | **$8.07**, 33 pages | No citations; no refunds |
| Payhip "30 Days in Egypt" | **$2.99**, no reviews | Several sub-$5 listings mention AI-assisted research |
| Free itineraries (Gumroad lead magnets, template.net) | $0 | Set a low ceiling for plain itineraries |

**Reading:** $12 is above every comparable printable found ($1–8.07). The pack's case is the one thing none of them shows: a source and a check date on every figure, plus the 18-site heat sheets. Two consequences (judgement): (a) the listing's first line must say so (it does: "Every figure cited and dated"); (b) if day-84 shows planner use but under 1% buying, the plan's existing fallback of $9 is the first lever, not a new product.

## 3. Money: Egypt eligibility, from the official pages found

| Option | Egypt resident | Evidence | Status |
|---|---|---|---|
| Etsy (digital download) | **Yes**, through Payoneer | Etsy Help "How do I use a Payoneer account with Etsy Payments" names Egypt | verified (official) |
| Gumroad | Payouts only by bank deposit or PayPal; **no Payoneer** | Gumroad Help "Getting paid" | Egypt row **unverified** |
| Payhip + PayTabs | PayTabs serves MENA incl. Egypt | Payhip Help article 372 | individual (non-company) onboarding **unverified** |
| Viator affiliates | 8%, 30-day cookie; PayPal weekly with no minimum, bank monthly $50 min | partnerresources.viator.com | Egypt eligibility **unverified** |
| GetYourGuide | 8% reported (Awin lists 7%) | third-party review only | **unverified** |
| Travelpayouts | Methods depend on country; shown in Finance → Payout methods | Travelpayouts Help | Egypt methods **unverified** until sign-up |
| Airalo, SafetyWing | — | nothing official found this pass | **unverified** |

**Action:** open Payhip first (plan unchanged); list the same PDF on **Etsy** as the second store, the one route with written Egypt support.

## 4. Page edits proposed (not made: they change what the site claims, so they wait for your yes)

1. **GEM ticket row** (`site/data/fair-prices.json`, key `gem-entry`): demand rank 3, and the row shows no figure. Proposal: keep `low/high` empty (no checkable official figure) but add a `reported` line: "Reported from 1 Nov 2026: EGP 1,830 for a foreign adult, up from 1,570 (Egypt Today; Egyptian Streets, 27 Oct 2026). Not shown on tickets.gem.eg until a booking starts." This answers the query people type without claiming an official price.
2. **Arabic ticket prices by nationality**: people type «للاجانب / للعرب / للمصريين». Proposal: if the Ministry list of 5 Nov 2024 that the page already cites prints Egyptian and Arab prices (**unverified**: not checked this pass), add them as a column to the entry rows on `ar/fair-prices.html`, from the same list and with the same source line.
3. **Visible "Updated" date at the top** of `fair-prices.html`, `arriving-in-egypt.html` and `visit.html` with `dateModified` in the JSON-LD. Evidence: an audit of 1,702 AI-engine citations linked visible dates and structured data to being cited (arXiv 2509.10762, 2025; B2B pages, correlational), and the GEO study (Aggarwal et al., KDD 2024) found statistics and citations raised visibility in generative answers by up to ~40%.
4. **Name studio "copy as text"**: people type "name in hieroglyphics copy paste". The studio draws Unicode signs already; a copy button for the plain-text signs would answer that query directly (small change to `hieroglyphs.js`).

## 5. AI-citation baseline: not run, and why

The 20-prompt panel (`06 Weekly Checklist and KPI Tracker.md`) needs ChatGPT search, Perplexity, Google AI Overviews and Copilot. None of them is reachable from this session: no connector exists for them here, and their sites are not on the environment's network list. **Status: unverified.** Ways to close it: run the panel by hand once (about 40 minutes; record cited domains in the KPIs tab), or add **Ahrefs** (its Brand Radar tools report AI-answer citations by domain) or **OpenRush** (`discover_ai_citations`).

Published evidence on who gets cited, for planning: Perplexity draws heavily on Reddit (cloro.dev, vendor: ~46.7% of top citations across its mix). That supports answering on Reddit first, and it is the reason the Reddit answers name their sources in text.

## 6. Channel verification: still unverified

Reddit, TGStat and Telegram are not reachable from this session (requests to add `www.reddit.com`, `old.reddit.com`, `tgstat.ru` and `trends.google.com` to the environment were refused by the environments service). What is verified from official text: TripAdvisor forbids promotional and affiliate links in forums (Tripadvisor Content & Community Guidelines). From mirrors (not live pages): r/solotravel allows blog/self-promotion links only in its weekly thread; r/Egypt removes comments from accounts under 3 days old. **Before the first post in each community, open its rules page and mark the Calendar tab's status** ("approved" only after reading them).

## 7. Connectors that would replace the remaining guesses

| Connector | Unlocks for this plan |
|---|---|
| Ahrefs | Real keyword volumes (EN/RU/AR), competitor rankings, and Brand Radar: which domains AI answers cite for "tipping in Egypt" and the rest |
| Ubersuggest (cheaper) | Keyword volumes and competitor pages; an AI-visibility view |
| Firecrawl | Fetch the pages this sandbox cannot: subreddit rules, Etsy listings, competitor pages |
| Supermetrics | Read Search Console and GA-style data into Claude for the weekly row, once Search Console is set up |
| Typefully | Queue the LinkedIn and X posts as drafts you approve in one place |
| beehiiv | If The Papyrus moves off the site's own mailer: the welcome sequence and recommendations network |

## 8. Creative variants made this pass, and how to test them

**New and B-variant images** (`images/`, built by `images/_build/make_cards.py` from site data; also in the Drive folder):

| File | What it tests |
|---|---|
| `pin11-visa-on-arrival.jpg` | New: the broadest English demand (visa); rows from `arrival.json`, UK government source |
| `pin12-ru-viza.jpg` | New: «виза в египет 2026», the broadest Russian demand; with the "check with your tour operator" caveat for Russian passports |
| `pin02b-tipping-2026-cards.jpg` | B of pin02: the title people type ("Tipping in Egypt 2026") and four big-number cards instead of a table |
| `pin06b-best-time-weather-by-month.jpg` | B of pin06: the exact phrase "best time to visit Egypt / weather by month" and a 6-site × 12-month heat grid |
| `cover01b-camel-honest-hook.jpg` | B of the video-1 cover: an honest-question hook instead of "Tourist price vs fair price" |

**Two video-1 recordings** (`videos/video1-A.mp4`, `videos/video1-B.mp4`; 13 s, 1080×1920, real screen captures of `fair-prices.html`, made by `videos/record.js`). They are identical after the first 3 seconds; only the opening card differs (A: "Tourist price vs fair price"; B: "Nobody can tell you what a camel ride costs").

**Scoring: not done.** Higgsfield's Virality Predictor refused with "Requires basic plan or higher". The account is on the free plan (10 credits), and upgrading is spending money, so it waits for your decision. The honest alternative costs nothing and measures real people:

1. Post A in the calendar's first video slot (11 Dec) and B in the next one (the following week's video slot), same platform, same hour, same caption apart from the first line.
2. After 72 hours, record from each platform's own analytics: views, average watch time, % who watched past 3 seconds, profile visits, and the `tiktok.video.s2627-prices` (or `instagram` / `youtube`) row in `insights.php`.
3. Winner = the higher 3-second hold rate, unless the other sends at least twice the site visits. Use the winner's hook style for the remaining video slots. Log both in the Weekly log tab.

Pins: post A and B of the same topic a week apart to the same board; compare outbound clicks after 14 days in Pinterest Analytics (Pinterest lags, so judge at 14 days, not 2).

## 9. A phone-layout cost found while recording

On a phone, every table on `fair-prices.html` is wider than the screen (at 390 px: 412, 636, 414 and 369 px wide in a 390 px viewport; at 540 px the entry-ticket table is 636 px). They sit in horizontal-scroll containers, so nothing is broken and the overflow checks pass. But the column people came for (the price) starts off-screen on the entry-ticket table, as the recording shows ("EGP 70…"). Proposal (needs your yes, it changes the page): on narrow screens, stack each row as a card (item, then price, then source), the pattern already queued for the visit pages' climate tables (Improvement Plan, round 3, S3).
