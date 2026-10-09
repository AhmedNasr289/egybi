# egybi.com Reborn: "Egypt, Honestly", a Trip Companion Built on Real Data

> **Status:** CURRENT — approved and built 2026-10-09. Back to [[Home]]. Design: [[Papyrus Design System]]. Earlier plans it replaced: [[Income Plan — Site to 200 a Month]], [[Income Routes — Any Career]], [[egybi.com — 300 to 400 a Month]], [[Income Plan — 1,000 to 2,000 a Month]], [[Dropshipping — Can It, Should It]].

## Context

**What you asked for, across your last messages:**
- Change the website **entirely**, with out-of-the-box ideas, not small add-ons.
- Make it earn **at least $200 a month**. Your long brief aimed at $300–400.
- Research deeply across all niches and careers.
- Use the **Papyrus design** on every page.

**Why the last plans weren't enough:** the earlier ones bolted a services page or a shop onto the encyclopaedia, and you rejected them.

**The out-of-the-box answer: stop being an encyclopaedia people browse, and become the tool travellers use before and during an Egypt trip.**
- The site's data stays, but it changes job. NASA heat by site, 873 places, today's EGP rate and the official food prices become **answers to the questions every visitor asks**:
  - When should I go?
  - What will it really cost?
  - Am I being overcharged?
  - What do these hieroglyphs on the wall say?
- The money comes from the travellers, who are mostly tier-1, high-intent buyers, rather than from 37 Egyptian browsers a week.

**Basis:**
- Research date: 2026-10-09.
- Exchange rate: EGP **52.36/USD** (`site/data/fx-today.json`), so $200 is **EGP 10,472**.
- Implementation starts from `origin/main`, because the working tree is on the stale branch 0bd98ed.

## 1. Five radical concepts weighed

**How to read the table:**
- Every concept was researched on 2026-10-09.
- P(≥$200 by M6) and P(by M12) are judgement estimates, not measured figures.

| Concept | What the site becomes | Evidence | How it earns | P(≥$200 by M6) | P(by M12) | Verdict |
|---|---|---|---|---|---|---|
| **A. "Egypt, Honestly": trip companion** | Date picker → honest briefing (heat, crowds, holidays, fair prices, today's EGP rate), plus a route planner on the tile-free map and a printable Papyrus trip dossier | **~19m arrivals in 2025** (Ecofin); the **GEM had 3m+ visits in 7 months, 60% foreign** (Ahram, 2026); tourists "use many apps to translate, map, check bookings" (TravelDailyNews). Custom itineraries sell for **$220** (Whynotegypt) or **€25 per planned day** (Marah House Luxor); Egypt itinerary PDFs sell for **$8–14** (Gumroad/Payhip) | $49 itinerary review · $12 dossier pack · plain affiliate links | **0.45** | **0.60** | **CHOSEN** |
| B. Hieroglyph Name Studio + "learn to read the temples" | Write your name in hieroglyphs, then a personalised cartouche certificate or print | At least 5 free translators already exist (Toolgiga, learnhieroglyphics.com, hieroglyphics-translator.com, Mobilefish, CalculateYogi); digital hieroglyph files sell for **€2–5** on Etsy; "hieroglyph cartouche" gets **~390 searches/month** (RankHero, a weak source); silver cartouche jewellery sells for **$48–98** | Personalised print / certificate | 0.05 | 0.15 | **Folded into A** as a free, shareable feature (your name on the dossier cover), not a business by itself |
| C. Audio walking tours of Cairo | Self-guided tours of districts from the Street Report Card | VoiceMap pays **50% royalty** (65% on Premium) and **100% on your own voucher sales**; payout by PayPal/bank, Egypt unconfirmed | Tour sales | 0.02 | 0.10 | **Later phase.** Recording audio is heavy work, and there's no tour catalogue yet |
| D. Egypt data storefront (the previous plan) | Encyclopaedia + work/shop pages | Fiverr $150 → $117.60 net | Services | 0.40 | 0.55 | Rejected by you as not changing the site; its services idea survives inside A as the itinerary review |
| E. Arabic BI learning hub / Arabic calculators / ads / jobs board | — | Egypt RPM $0.30–2.50 (Brightseotools); MENA job posts $99–250 (Akhtaboot, Wuzzuf via BetterTeam) | Ads / listings | 0.00–0.02 | ≤0.06 | No |

**Why A wins:**
1. **Buyers already pay for exactly this.** Custom Egypt itineraries sell for $220, and planning passes for €25 a day.
2. **It turns existing assets into answers** that a chatbot or an AI Overview can't give with dated numbers: heat at Abu Simbel in a given month, today's rate, what a kilo of tomatoes costs officially.
3. **Its buyers are foreign tourists**, so payment works in their direction (card → Payhip/PayTabs or Etsy → Payoneer). No Egyptian card is needed.
4. **Interactive tools are the format least hurt by AI Overviews**, which cut organic clicks by 38% (SEJ, 2026) and position-1 CTR by about 52% on affected queries (Seer, 2026).

**Competing hypotheses** (judgement estimates):

| Hypothesis | Confidence |
|---|---|
| A reaches ≥ $200 in its first peak season (by month 6) | **0.45** |
| A reaches ≥ $200 over a 12-month average | **0.40**, because summer is weak |
| The previous services plan would have got there faster | 0.35 |
| No concept reaches $200 by month 12 | 0.30 |

## 2. The new site: map of pages

**Navigation becomes:** **Plan · Prices · Places · Hieroglyphs · Dossier · Ask** (the travel layer), then a secondary **Egypt in Data** menu.

| Page | What it does | Fed by (existing pipelines) | Earns by |
|---|---|---|---|
| **`index.html`, rebuilt as "When are you going?"** | The animated flag stays. A papyrus sheet asks for travel dates and returns an instant **honest briefing** per site: average high at each of the 18 sites, Ramadan/Eid dates, peak-crowd months, today's EGP rate, the GEM daily cap, all with sources and dates | `visit-climate.json` (NASA 2001–2020 normals), `fx-today.json`, a new small cited `calendar.json` (holidays) | Hands off to the planner, the dossier and the review |
| **`plan.html`, the route planner** | Pick places from the 873 on the tile-free map, set days, and see heat and walking/elevation per stop. **"Print my dossier"** produces a Papyrus scroll through print CSS (save as PDF in the browser, **no library, no server**) | `geo-places.json`, `visit-terrain.json`, climate | The free dossier ends with three offers: $49 review, $12 full pack, disclosed affiliate links |
| **`fair-prices.html`, "What it should cost"** | Taxi, felucca, camel, guide, tips and SIM prices in EGP **and converted at today's rate**, each figure with a named source and date and its range shown; sources that disagree are shown side by side. Plus "what EGP 100 buys at the market today" from the IDSC feed. It answers a common search topic (Egypt scams and tipping) with sourced, dated ranges rather than unsourced blog advice | `prices-today.json`, `fx-today.json`, a new hand-cited `fair-prices.json` | eSIM / transfer affiliate links; feeds the dossier |
| **`hieroglyphs.html`, Name Studio** | Type a name → cartouche from the 24 uniliteral signs, **honestly labelled as a phonetic transliteration, not a translation**. Then "find these signs on real walls": links to the antiquities among the 393 that carry them. Shareable PNG via canvas, and your cartouche goes on the dossier cover | Self-hosted **Noto Sans Egyptian Hieroglyphs (OFL 1.1)**; gazetteer | Shareable traffic magnet (organic, social) → dossier |
| **`dossier.html`, the paid pack** | **$12 "The Papyrus Egypt Dossier"**: 18 site climate sheets, the fair-price pocket card, an Arabic phrase card, offline maps of 6 cities and a packing list by month. Sold via a plain link to Payhip (PayTabs) and listed on Etsy for marketplace traffic | Generated from the same JSON by `build_static_pages.py` | ~$9.50 net per sale (assumption) |
| **`ask.html`, "Have your plan checked by a Cairo data analyst"** | **$49**: send your draft itinerary and get a written review within 48 h covering heat, distances, closures, fair prices and timing, citing the site's data. The scope is written down: **no bookings, no guiding, no visas** | — | ~$45 net (assumption); undercuts the $220 benchmark |
| `places.html`, `geospatial.html`, `stories.html`, `streets.html` | Kept; every place card gains "Add to my plan" | as now | feeds the planner |
| `prices.html`, `explore.html`, `stocks.html`, `invest.html`, `case.html` | Move under **Egypt in Data**; `invest.html` stays information only (FRA) | as now | — |
| Papyrus newsletter | Becomes **"The Papyrus: before you go"**, a monthly seasonal briefing (heat, holidays, price moves) | own data | list-building for dossier and review |

Affiliate links are plain `<a rel="sponsored nofollow">` with a disclosure line. They are added **only after** each programme confirms in its dashboard that it pays an Egypt resident:
- GetYourGuide via **Awin**, which pays through Payoneer (Awin FAQ);
- **Airalo** via Impact (10%+, bank/PayPal);
- **SafetyWing** (10%, reported);
- **Booking.com** via CJ, if CJ accepts an Egypt publisher.

**Airbnb is excluded: it runs no open cash affiliate programme in 2026** (Track360).

## 3. The Papyrus design on every page

The `.papyrus-letter` look (main `site/assets/egybi.css` ~l.688) becomes the language of the whole site:
- the parchment gradient;
- the torn gold edge;
- the ankh wax seal;
- the gold-ruled "specimen" source notes.

**What changes in `egybi.css`:**
- A `.sheet` primitive: the parchment gradient plus a pure-CSS fibre texture, the torn edge and the seal option. No image request.
- `.card`, `.chart-card`, `.callout`, `.glyph-card`, `.map-box` and `.retired-note` all render as sheets.
- `.pl-specimen` is generalised to `.specimen` (with an alias kept) and holds the source and date of every figure.
- Section dividers become a gold "scroll rod". Kemet (dark) sections hold sheets like documents on a desk, so the two-surface rule still holds.
- Each page's hero becomes a title sheet with a seal and an issue line (date · source).
- A Cinzel drop cap on story and Papyrus issues.
- **The dossier print stylesheet** (`@media print`) renders the plan as a scroll: one sheet per day, the cartouche cover, a source footer.
- **Motion:** sheets unroll and seals stamp. Under reduced motion, everything is shown fully drawn and nothing is hidden.

**Generated pages:** the 12 Papyrus issues, 123 tombstones and new generated pages get the look through `backend/pipeline/build_static_pages.py`. Generated output is never hand-edited.

**Constraints kept:** no framework, no build step, no third-party runtime script, zero map-provider calls, WCAG AA on parchment.

## 4. The plan of work

### This week
1. **Contract check.** The $49 review is paid outside work.
2. **Open the accounts:**
   - Payhip (connect PayTabs, falling back to Lemon Squeezy);
   - an Etsy shop with Payoneer;
   - Awin, Impact (Airalo) and SafetyWing publisher applications.

   Note in each which payout method shows for Egypt.
3. **Source sheet for `fair-prices.json`:** every row gets a source, date and range. Where sources conflict, keep both.

### Build: weeks 1–6 (8–10 h a week)

| Week | Ship |
|---|---|
| 1 | Papyrus design system across all pages and templates (§3); cache-bust; full verify suite |
| 2 | New `index.html` briefing (dates → per-site heat, holidays, rate) + `calendar.json` with cited holiday dates |
| 3 | `plan.html` (planner on the existing tile-free map) + the dossier print stylesheet |
| 4 | `fair-prices.html` + `hieroglyphs.html` (self-hosted OFL font, licence file included) |
| 5 | `dossier.html` pack built and listed on Payhip + Etsy; `ask.html` live |
| 6 | Navigation restructure (travel layer / Egypt in Data); sitemap; Search Console; 18 per-site "best time" pages generated from climate data |

### Weeks 7–12: distribution, no paid ads

| Channel | Action |
|---|---|
| Reddit (r/EgyptTravel and similar) and TripAdvisor Egypt forums | Answer 5 real questions a week with a sourced figure. Link only where the rules allow |
| Pinterest | 5 pins a week of dossier sheets and fair-price cards |
| TikTok / Reels / YouTube Shorts | 1 short a week, e.g. "what a camel ride at Giza should cost, with sources" or "your name in hieroglyphs". These are for distribution, not income (TikTok Creator Rewards is not confirmed for Egypt) |
| Newsletter | "The Papyrus: before you go", monthly |
| **Day-42 check** | ≥ 300 planner uses and ≥ 1 sale → continue |
| **Day-84 check** | Run-rate ≥ $100 → continue into peak season; below $30 → see §6 |

### Months 4–12
- **Peak season (Nov–Mar):** add a second dossier (Red Sea / Sinai) and an Arabic version of the fair-price card.
- **Spring:** raise the review price to $59 after 10 written testimonials. Real ones only, and with the buyer's consent.
- **Summer dip:** build a "summer survival" sheet (heat-safe hours per site); add affiliate programmes that have confirmed Egypt payout.
- **Months 10–12:** test audio walking tours (concept C) on VoiceMap for one Cairo district.

## 5. Income table, base case

**Assumptions** (M1 = November 2026, the start of peak season, after a 6-week build):

| Line | Price and net | Volume (M1–M12) | Notes |
|---|---|---|---|
| Review | $49 → **$45 net** (Payhip 5% + processing, *assumption*) | 0, 1, 2, 3, 3, 3, 2, 2, 2, 3, 4, 5 | Volume follows the season |
| Dossier | $12 → **$9.50 net** (*assumption*, Payhip or Etsy fees) | 0, 3, 6, 8, 9, 10, 8, 7, 7, 10, 14, 18 | |
| Affiliate | **$5** per booking (*assumption*) | 0, 1, 2, 4, 5, 6, 5, 5, 6, 8, 10, 13 | |

| Month | Review | Dossier | Affiliate | **Total USD** | **Total EGP** |
|---|---|---|---|---|---|
| 1 Nov | 0 | 0 | 0 | **$0** | 0 |
| 2 Dec | 45 | 28.50 | 5 | **$78.50** | 4,110 |
| 3 Jan | 90 | 57.00 | 10 | **$157.00** | 8,221 |
| 4 Feb | 135 | 76.00 | 20 | **$231.00** ✅ | 12,095 |
| 5 Mar | 135 | 85.50 | 25 | **$245.50** | 12,854 |
| 6 Apr | 135 | 95.00 | 30 | **$260.00** | 13,614 |
| 7 May | 90 | 76.00 | 25 | **$191.00** ⚠️ | 10,001 |
| 8 Jun | 90 | 66.50 | 25 | **$181.50** ⚠️ | 9,503 |
| 9 Jul | 90 | 66.50 | 30 | **$186.50** ⚠️ | 9,765 |
| 10 Aug | 135 | 95.00 | 40 | **$270.00** | 14,137 |
| 11 Sep | 180 | 133.00 | 50 | **$363.00** | 19,007 |
| 12 Oct | 225 | 171.00 | 65 | **$461.00** | 24,138 |
| **Year** | **$1,350** | **$950** | **$325** | **$2,625** | **137,445** |

**Arithmetic check, month 6:** 3 × 45 = 135; 10 × 9.50 = 95; 6 × 5 = 30. Total **260**, × 52.36 = **13,614**.

**Honest reading of the table:**
- It crosses $200 in **month 4 (February)**.
- It **dips below $200 in May–July**, because Egypt's summer heat cuts visitors. The GEM CEO called summer levels "lower than expected" (Ahram, 2026).
- The second autumn reaches **$363–461**.

**Traffic needed:** at an assumed 2% of planner users buying something, the 13 sales of month 6 (3 reviews + 10 dossiers) need **~650 planner users a month**, about 4× today's whole site. Most of them come from Reddit, forums, Pinterest and Etsy rather than Google.

**Hours check:**
- Peak month: 5 reviews × 1.5 h + distribution 16 h + upkeep 4 h ≈ **28 h a month ≈ 6.5 h a week**.
- Build weeks: 8–10 h.

**Without the review (if the contract blocks it):** **$125 at month 6 and $236 at month 12.** The site crosses $200 only in the second autumn.

## 6. Weekly metric and stop rules

The metric is **planner uses per week, and the share of them that buy**.

| Signal | Action |
|---|---|
| < 50 planner uses a week by week 10 | Distribution problem: double forum answers and shorts. The product is not the issue yet |
| Uses ≥ 150 a week but sales < 1% | Product problem: change the dossier contents or price ($9) and the review copy |
| Zero review orders by day 84 in peak season | Cut to $39, and add a sample review made from a real (anonymised, consented) plan |
| < $30 run-rate at day 84 | Stop building. Keep the free tools live as a portfolio and return to the services plan (concept D) |

## 7. Attacking the plan

**The strongest objection:** "Travel planning is the most crowded content niche on earth. Viator, TripAdvisor, every tour operator and now ChatGPT give free Egypt itineraries. A solo site with 37 visitors a week won't be found, and a seasonal business that dips every summer is not steady income."

**The answers:**
1. **Crowded, yes, but not with *dated, sourced numbers*.** No competitor converts a fair-price table at today's official rate, or gives NASA heat per site for your exact dates. That is the one thing this site can do that a chatbot can't back with a citation.
2. **Discovery doesn't rely on Google:** forum answers, Etsy and Pinterest send buyers.
3. **The summer dip is real and shown in the table**, not hidden. The plan reaches $200 in peak months and in the year's average only in year 2.

**One concrete reason to reject it:** it **throws away the site's current identity** (an encyclopaedia and data portfolio) for a consumer travel product with a weaker sourcing base. Fair-price figures come from blogs and operators, not official data. If keeping egybi.com rigorous and data-first matters more to you than $200 a month, choose the services plan (concept D) instead.

## Assumptions to check before acting

1. **The employment contract** allows paid outside work (gates the review).
2. **Payhip + PayTabs** onboards an Egyptian individual and accepts foreign cards; the fallback is Lemon Squeezy (Egypt bank payout unconfirmed) or Etsy only.
3. **Awin/GetYourGuide, Impact/Airalo, SafetyWing and CJ/Booking** each pay an Egypt-resident publisher. Unconfirmed for all; checked in week 0.
4. **The Noto Sans Egyptian Hieroglyphs package note** about "special licensing conditions" (Google package metadata): email opensource-licensing@google.com before selling printed cartouches. The free web tool is covered by OFL 1.1.
5. **Prices, conversion rate and volumes** in §5 are judgements. The fair-price sources are blogs and operators, so they are flagged as such on the page.
6. **Holiday and Ramadan dates** for `calendar.json` come from an official or astronomical source, labelled "expected".

## Sources

All read 2026-10-09. Third-party sources are flagged where relied on.

- **Demand:** [Ahram — GEM 3m visitors, 60% foreign](https://english.ahram.org.eg/News/572221.aspx) · [ATTA — arrivals +7%, Jan–Apr 2026](https://atta.travel/resource/egypt-records-7-rise-in-tourist-arrivals-in-first-four-months-of-2026.html) · [Ecofin — 19m in 2025](https://www.ecofinagency.com/news-industry/0601-51778-egypt-tourist-arrivals-jump-21-in-2025-to-19-million) · [CairoScene — 30m target](https://cairoscene.com/Buzz/Egypt-Aims-for-30-Million-Tourists-After-Record-19-Million-Visitors) · [TravelDailyNews — Egypt goes mobile](https://www.traveldailynews.com/regional-news/egypt-goes-mobile/) · [Al-Fanar — student tourist app](https://al-fanarmedia.org/2026/08/student-project-puts-egypts-tourist-services-into-one-app/)
- **What travellers pay:** [Whynotegypt — itinerary customisation $220](https://www.wetravel.com/trips/itinerary-customization-up-to-2-weeks-trip-whynotegypt-29487557) · [Marah House — Planning Pass](https://marahouseluxor.com/planning-pass-egypt/) · [Gumroad — 10-day Egypt itinerary](https://midlifecrisistravel.gumroad.com/l/egypttravelitinerary) · [Payhip — Egypt in 2 weeks](https://payhip.com/b/0Spsl) · [Inside Egypt — daily budgets](https://www.inside-egypt.com/how-much-does-it-cost-to-go-to-egypt.html)
- **Fair prices and tipping (blog and operator sources):** [In Your Pocket — Egypt scams](https://www.inyourpocket.com/egypt/articles/common-egypt-travel-scams-and-how-to-avoid-them) · [Tabiji — Aswan scams 2026](https://tabiji.ai/scams/aswan/) · [Pyramids Land — tipping](https://www.pyramidsland.com/blog/tipping-in-egypt) · [Travelling King — tipping](https://www.travellingking.com/tipping-guide-for-egypt/) · [Beyond the Bucket List — scams](https://beyondthebucketlist.co/common-egypt-scams/)
- **Hieroglyphs:** [learnhieroglyphics.com — name translator](https://www.learnhieroglyphics.com/translate-name-to-hieroglyphics) · [Toolgiga — cartouche generator](https://www.toolgiga.com/egyptian-hieroglyphs-translator.php) · [hieroglyphics-translator.com](https://www.hieroglyphics-translator.com/) · [RankHero — "hieroglyph cartouche"](https://www.rankhero.com/keywords/hieroglyph-cartouche) · [Etsy — hieroglyph alphabet vector](https://www.etsy.com/listing/1376040038/egyptian-hieroglyph-alphabet-vector-art) · [Fontsource — Noto Sans Egyptian Hieroglyphs](https://fontsource.org/fonts/noto-sans-egyptian-hieroglyphs/about) · [Package metadata note](https://os.unplugged.com/werunplugged/unplugged-system/raw/branch/main/external/noto-fonts/notosansegyptianhieroglyphs/METADATA) · [City Lit — hieroglyphs courses](https://www.citylit.ac.uk/courses/ancient-egyptian-hieroglyphs-an-introduction-online) · [Patreon — Tamara Siuda](https://www.patreon.com/tsiuda)
- **Audio tours:** [VoiceMap — publishing agreement](https://docs.voicemap.me/tour-publishers/publishing-agreement/) · [VoiceMap — create](https://voicemap.me/create-audio-tours)
- **Payments and affiliates:** [Payhip — PayTabs](https://help.payhip.com/article/372-connect-your-paytabs-account) · [Dodo — Payhip review 2026](https://dodopayments.com/blogs/payhip-review) · [Lemon Squeezy — supported countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries) · [Etsy — eligible countries](https://help.etsy.com/hc/en-us/articles/115015710408-Countries-Eligible-for-Etsy-Payments) · [Awin — Payoneer FAQ](https://success.awin.com/articles/en_US/Knowledge/Payoneer-for-Awin-Publishers-FAQs) · [Airalo — affiliate FAQ](https://www.airalo.com/blog/airalo-affiliate-program-faqs) · [PostAffiliatePro — SafetyWing](https://www.postaffiliatepro.com/affiliate-program-directory/safetywing-affiliate-program/) · [Track360 — Airbnb 2026](https://track360.io/blog/airbnb-vacation-rental-affiliate-referral-programs-operator-teardown-2026) · [Travelpayouts — Booking.com](https://www.travelpayouts.com/en/offers/bookingcom-affiliate-program) · [Patreon — non-US payouts](https://support.patreon.com/hc/en-us/articles/39694936541965)
- **Search and ads:** [SEJ — AIO cut clicks 38%](https://www.searchenginejournal.com/ai-overviews-cut-organic-clicks-38-field-study-finds/573145/) · [Seer — AIO CTR 2026](https://www.seerinteractive.com/insights/aio-impact-on-google-ctr-2026-update) · [Ahrefs — ranking without links](https://ahrefs.com/blog/how-to-rank-in-google-without-links) · [Brightseotools — AdSense by country](https://brightseotools.com/adsense-calculator) · [Lilach Bullock — sponsored post pricing](https://www.lilachbullock.com/sponsored-content-blog-pricing/) · [startup.jobs — Akhtaboot](https://startup.jobs/job-boards/akhtaboot) · [BetterTeam — Wuzzuf](https://betterteam.com/wuzzuf)

---

## Implementation, on approval

1. **Branch from main:** `git fetch origin main && git checkout -B claude/project-artifacts-memory-review-0tgzxz origin/main`.
2. **Design system:**
   - `site/assets/egybi.css`: `.sheet`, `.specimen`, the scroll rod, title sheets, the print stylesheet;
   - `backend/pipeline/build_static_pages.py` templates;
   - nav and hero changes in every top-level page;
   - cache-bust.
3. **New data files**, cited and dated, never fixture data:
   - `site/data/calendar.json`;
   - `site/data/fair-prices.json`.
4. **New and rebuilt pages:**
   - rebuilt `index.html` (the briefing; the flag kept);
   - new `plan.html`, `fair-prices.html`, `hieroglyphs.html`, `dossier.html`, `ask.html`;
   - shared JS in `site/assets/plan.js`, reusing the existing map code in `site/assets/` for the tile-free map;
   - the self-hosted font + OFL licence under `site/assets/fonts/`;
   - 18 generated "best time" pages.

   Affiliate links ship **only** for programmes already confirmed to pay Egypt. Buy links point to Payhip/Etsy listings that exist; until they exist, the pages say "coming".
5. **Vault:**
   - `egybi/The Pivot — Egypt, Honestly.md` (this plan, plus the five concepts);
   - `egybi/Papyrus Design System.md`;
   - the earlier income notes recovered verbatim from the session transcript (300–400, 1,000–2,000, Dropshipping, Any Career, Site to 200);
   - update [[Home]], [[Frontend & Design System]], [[Changelog]] and `README.md`.
6. **Commit and push:** grep for model identifiers, commit with the attribution lines, push to the designated branch. **No PR unless asked**; merging to main deploys, so that is your call.

**Verification:**
- **Static checks:** `backend/verify/static-audit.py`, `checks.py`, `seo.py`, `coverage.py`, `map-completeness.py`.
- **Browser suite:** `backend/verify/ci-step.sh`, which runs `all-pages.js`, `contrast.js`, `overflow.js` at 390px, `reduced.js`, `map-render.js` and `map-interaction.js`.
- **Mutation suite:** `mutate.py`, with no FAILS TO CATCH.
- **Manual checks:**
  - type a name in the studio and check each sign against Gardiner's uniliteral list;
  - pick dates in the briefing and check one site's heat against `visit-climate.json`;
  - print the dossier to PDF and look at it.
- **Discipline greps:**
  - no third-party `<script src>`;
  - every affiliate link carries `rel="sponsored nofollow"` + a disclosure;
  - every `fair-prices.json` row has a source and date;
  - `invest.html` has no advice language.
