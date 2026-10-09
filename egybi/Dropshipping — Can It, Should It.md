# Dropshipping: Can It, Should It

> **Status:** Superseded 2026-10-09 by [[The Pivot — Egypt, Honestly]]. Kept as the record of why dropshipping was ruled out. Back to [[Home]].

> Can egybi.com be converted fully into a dropshipping store, and is that the best way to make money from it? Researched 2026-10-09. Companion to [[SaaS Conversion Plan]] and [[Tourism Services Plan]]. Back to [[Home]].

## The verdict, in three lines

1. **Possible? Technically, yes**, but it would be a rebuild rather than a conversion, because the site has no cart, checkout, payment rail, inventory or accounts. **Commercially, classic dropshipping is blocked in both directions for an Egypt-based seller.** Selling *into* Egypt runs into mandatory pre-shipment customs filing, no duty-free threshold and cash-on-delivery returns. Selling *out of* Egypt runs into the fact that Shopify Payments, Stripe and a usable PayPal are not available to Egyptian merchants.
2. **Wise? No. Confidence 0.85.** Full conversion gives up something worth almost nothing in cash today and gets something worth less than nothing in return. The trade is bad even though the asset is small.
3. **What to do instead:** keep egybi.com intact and keep the data/services plans as the main bet. Add one cheap parallel line that does pass the checks: **print-on-demand Egypt map prints sold on Etsy**. Etsy officially supports Egyptian sellers via Payoneer, the prints are made and shipped in the buyer's country, and no parcel ever crosses Egyptian customs. It is a side income and a marketing channel, not a way to "make money well" on its own, and this note says so throughout.

---

## Facts read from the repository today

| Fact | Value | Source |
|---|---|---|
| Price archive | **69 observation days / 91 calendar days = 75.8%**, 2026-07-09 → 2026-10-07 | `site/data/prices-history.json` `coverage` block |
| EGP/USD | **52.36** on 2026-10-08, down from ~50.2 in mid-August | `site/data/fx-today.json` (ExchangeRate-API) |
| Audience | ~37 visitors/7 days at the last recorded reading | [[Traffic Baseline & Analytics]] |
| Newsletter | **2 confirmed subscribers**, confirmed live 2026-08-30 | `send_issue.php` dry run, run #5 |
| Real pages | ~30 (153 files, 123 `noindex` tombstones) | `find site -name '*.html'` |
| Printable assets already owned | geoBoundaries ADM1 vector outlines (CC BY 4.0), street graphs for 10 districts (ODbL), 5 SRTM relief transects (public domain), 873 gazetteer places incl. 393 antiquities (ODbL) | `site/data/*.json` `license` fields |

The brief described the archive as 38/53 days and 72%. It has grown since. The pound has also weakened about 4% in six weeks, which is the devaluation risk §3 discusses, playing out in this repo's own data.

---

## 1. Can it be done fully, and what does it destroy?

**Technically:** a static site on Hostinger shared hosting cannot run a store by itself. "Full conversion" would mean either replacing it with Shopify (or WooCommerce on Hostinger's PHP/MySQL), or bolting a hosted checkout onto static pages. Either way, the payment problem in §3 decides the outcome, not the build.

**What full conversion destroys, priced honestly:**

| Asset | Cash value today | Why |
|---|---|---|
| Traffic | **≈ $1/month** | ~160 visits/month at a generous $5 display RPM (assumption). With 37 visitors a week the traffic value really is close to zero. |
| Search authority | Near zero for products | 30 pages of cited Egypt data have relevance for Egypt-data queries and none for product queries. A pivot loses one without gaining the other. |
| Editorial identity | The whole business | The price archive (75.8% dense and compounding) is only sellable from a source known for cited, dated figures. A dropshipping storefront on the same domain ends that. |
| The option | The largest number here | The [[SaaS Conversion Plan]] models up to ~$26k ARR by month 12 (assumption-heavy). It is the only path in this note with a five-figure year-one case. |

**So yes, 37 visitors makes the cash value ≈ zero, and that is still the wrong question.** The domain does not earn anything today, and converting it would not earn anything either, because 37 visitors do not buy products. You would give up the option for no gain.

**The integrity constraint rules out the standard playbook.** The usual dropshipping toolkit includes imported AliExpress reviews, countdown timers, inflated "was" prices, "fast shipping" promises on 2–4 week items, and product claims nobody has verified. Every one of those breaks the rule this site exists on. A store that cannot use those tools has to compete on something real. Here, the real thing is the provenance of the maps.

---

## 2. Dropshipping in 2026 — the numbers

*All read 2026-10-09. Most are vendor and blog estimates that cite each other, so the agreement between them is weaker than it looks.*

| Metric | Figure | Source (2026) |
|---|---|---|
| First-year store failure | **80–90%**; TrueProfit says ~95%, and only 1–5% are consistently profitable | Branvas, Thunderbit, TrueProfit |
| Stores reaching $50k/month | ~1.5% | StatsUp via Printful, Podbase |
| Typical net margin | **15–20%**; beginners <10%; another estimate is 5–15% after ads | Sellers Commerce, Easyappsecom |
| Meta ecommerce CPM | **$15.06** median, **+13.2% YoY** | Triple Whale via DigitalApplied/Trackbee |
| Meta ecommerce CPA | **$32.14** | Ryze AI |
| Meta ecommerce conversion rate | 1.53% | Triple Whale |
| TikTok ecommerce CPM | $4.80 to $13.26 depending on dataset | Lebesgue, Triple Whale |
| TikTok conversion rate | 1.92% | Lebesgue |
| Card-not-present chargebacks | 0.6–1.0% typical | Eightx, Chargeback.io |
| Card-network penalty line | **1.5%** (Mastercard ECM; Visa VAMP fell to 1.5% on 2026-04-01) | Chargeback.io |

**The maths that ends it:** a typical dropship item sells for $25–40. At a 35% contribution margin before ads, a $35 order leaves ~$12. The median Meta CPA is **$32**. **Every first order loses about $20.** To break even on the first order at that CPA, the order needs to be about **$92 at 35%**, and very few dropship catalogues reach that. Dropshipping also rarely gets repeat purchases that would recover the loss.

**In plain words: classic dropshipping in 2026 is saturated and margin-poor, and paid acquisition costs more than the first order earns.** The operators who make money have capital to absorb the learning phase. This founder does not.

---

## 3. The Egypt reality — where generic advice breaks

### Two directions, two walls

| | Selling INTO Egypt (Egyptian buyers) | Selling OUT of Egypt (foreign buyers, your own store) |
|---|---|---|
| **The wall** | Customs and cash on delivery | Payment processing |
| **Why** | ACI is mandatory for **every air consignment regardless of value** since 2026-01-01. Egypt appears to have **no de minimis**, so 14% VAT + 0–60% duty apply from the first dollar. COD returns run 15–30%. | **Shopify Payments: not available** (Egypt is outside its ~39 countries). **Stripe: no confirmed route for Egyptian entities.** **PayPal:** 30-day holds, withdrawal to a Visa card, reported total fees up to 8.5%. |
| **Workaround** | Import inventory as a registered importer. That is capital-heavy and is not dropshipping. | A foreign LLC (US/UK) for Stripe. It brings setup cost, annual fees and tax compliance, which near-zero capital cannot carry. |

### The detail

**ACI (Advance Cargo Information).** It became mandatory at Egypt's airports on 2026-01-01 (Finance Minister announcement, *Ahram Online*, *Daily News Egypt*). The foreign exporter uploads the documents to CargoX before dispatch, and the importer obtains an **ACID number through Nafeza before the goods are loaded**. One source states this applies to every air consignment regardless of size or value. Fees were reported at about **$95 per consignment** for a six-month introductory period. ⚠️ *Assumptions to check:* the current fee, and whether express couriers file ACI under their own consolidations for small parcels. That second point is the one assumption that could reopen inbound dropshipping. Even then, VAT and duty from the first dollar and COD returns would remain.

**Cash on delivery.** Estimates of COD's share range from **34% of payment value** (Mordor Intelligence, 2025) to **77% of transactions** (23HubLab). The spread is mostly about what is being measured. COD returns are **15–25%** against 5–8% prepaid (23HubLab), and **30%+ without order confirmation** against 10–15% with it (Leadivo). COD ties up working capital until the courier pays out, which takes days to weeks depending on the contract.

**Domestic gateways** (for EGP card payments): **Paymob 2.75% + EGP 3**, **Kashier 2.85% + EGP 3**, **Fawry 1.5–2.5%**. All are usable, and none solves foreign buyers paying in USD to an Egyptian account.

**Last mile.** Bosta claims a 96% success rate and 20+ distribution centres, with COD remitted next-day to weekly. Its own site publishes no fee schedule. One unsourced blog gives **$1.00–1.80 per COD shipment** and **25–35% return-to-origin**. ⚠️ Low confidence. Get written quotes from Bosta and Aramex.

**Competition.** The market is **$9–11.5bn in 2026** (Mordor, Codrocket). Share figures contradict each other (Amazon.eg at 11%, 62% or under 10% depending on source). The direction is not in doubt, though: Amazon expanded its 10th of Ramadan warehouse to 100,000 m³ (Dec 2025), and Noon raised **$500m** (Dec 2025). A solo store selling generic goods into Egypt competes with both on price and delivery speed and loses.

**Paying a supplier from Egypt.** Egyptian **debit and prepaid cards have been blocked abroad since 2023-10-09** (Banque Misr's 2026 schedule; AAIB and HSBC Egypt the same). Credit cards carry bank-set international limits. So even paying a print supplier in USD needs a route outside the Egyptian banking system (see §5).

**Currency.** EGP/USD went from 46.8 in February 2026 (its high since May 2024, per Trading Economics) to ~50.2 in August and **52.36 on 2026-10-08** (repo). Any inventory priced in dollars and sold in pounds loses margin every month you hold it.

### The door that is open

**Etsy officially lists Egypt as eligible for Etsy Payments, via a Payoneer Payment Account** (Etsy Payments Policy, updated ~mid-2026; Etsy Help Center). That one fact changes the plan.

- **Payment:** Etsy collects from the buyer and pays USD into Payoneer, so no Stripe, Shopify Payments or PayPal is needed.
- **Fulfilment:** a print-on-demand partner prints in the buyer's region, so no parcel touches Egyptian customs.
- **Paying the printer:** USD stays in Payoneer, so the Egyptian card limits do not apply. ⚠️ *Assumption to check:* that Printify Balance can be topped up from Payoneer (documented in a ~2022 Printify post) or that the Payoneer card is issued to Egyptian residents.

The money and the goods both go around Egypt's banking and customs systems instead of through them. That is the only structure in this note that passes every check.

---

## 4. Three paths, costed

EGP at **52.36/USD** (repo, 2026-10-08).

| | **(a) Full conversion of egybi.com** | **(b) Etsy POD shop, egybi.com intact** | **(c) Data / services, no store** |
|---|---|---|---|
| **What** | Shopify store on the domain, a foreign LLC for Stripe, Meta ads | Egypt map prints and printable PDFs on Etsy; egybi.com links to them | The [[SaaS Conversion Plan]] and [[Tourism Services Plan]] |
| **90-day cash** | ~$2,300–2,800 (Shopify ~$39/mo, LLC $300–600, apps, **$1,500 ad test**, samples) | **~$85–120** (40 listings × $0.20, 3 samples) | ~$0–50 |
| | EGP 120,000–147,000 | **EGP 4,500–6,300** | EGP 0–2,600 |
| **Build time** | 60–100 h (rebuild) | ~30 h | Continues existing plan |
| **First sale** | 6–10 weeks | 3–8 weeks (assumption) | 4–10 weeks (manual B2B) |
| **Month-12 base case** | **Negative.** About −$20 per first order at a $32 CPA | **~$1,000/yr** contribution (≈60 sales × ~$17 blended) | **$9k–26k ARR** (modelled in the existing plans, assumption-heavy) |
| **Month-12 good case** | Break-even | ~$3,500 (25 sales/month by year end) | ~$26k ARR |
| **Most likely killer** | CAC above contribution, on top of the payment wall | Etsy search invisibility: the listings exist and nobody finds them | The licence answer from IDSC / ExchangeRate-API, and the founder doing outbound sales |
| **Confidence it pays** | **0.03** | **0.30** (≥$200/month by month 12) | **0.35** (≥$1,000/month by month 12) |

Path (b)'s month-12 numbers are small, and that is intentional. What it offers is near-zero downside, assets that already exist, and some marketing value; it is not a large income. (b) and (c) are not mutually exclusive, and they reinforce each other (§7).

---

## 5. The store worth building — specified

### Unit economics: an 18×24″ map poster, Etsy + POD, US buyer

| Line | $ |
|---|---|
| Item price | 34.99 |
| Shipping charged | 5.99 |
| **Order total** | **40.98** |
| Etsy transaction 6.5% (also charged on shipping) | −2.66 |
| Etsy processing 3% + $0.25 | −1.48 |
| Listing fee | −0.20 |
| POD base cost, 18×24″ poster | −9.95 |
| POD shipping to US (⚠️ assumption) | −5.99 |
| **Contribution before ads** | **20.70 (50.5%)** |
| Payoneer withdrawal ~3% | −0.62 |
| **Net per sale** | **≈ $20.08 ≈ EGP 1,051** |
| If attributed to Etsy Offsite Ads (15% for sellers under $10k) | −6.15 → **≈ $13.93** |

**Printable PDF at $9.99:** Etsy fees ≈ $1.40 → **≈ $8.59 (86%)**, with no production cost, no shipping and no card problem.

Sources: Etsy fees per checkoutpage.com and Craftybase (2026); the poster base cost is from **Printful's own pricing guide, which is promotional**. ⚠️ Price a real sample before listing.

### Product lines, chosen because they pass the checks

| Line | Built from (already in the repo) | Why it survives |
|---|---|---|
| **Data choropleth posters** — one cited indicator across 27 governorates, with source and date printed in the corner | geoBoundaries ADM1 (CC BY 4.0) + the knowledge base | **"The only Egypt map poster with its sources on it."** The provenance is the product, which is also the honest version of a differentiator |
| **Street-network art prints** of the 10 districts — Downtown Cairo's Khedivial grid, New Cairo's cul-de-sacs | `streets-*` (ODbL) | Figure-ground street art is an established POD category, and these are real measured networks with their metrics. Printed maps need the line "© OpenStreetMap contributors" |
| **Relief cross-sections** — "The Nile, Cairo to Abu Simbel", "The Giza plateau edge" | 5 SRTM transects (public domain) | Unusual, scientific and attractive, and the source is unrestricted |
| **"Every mapped ancient site in Egypt"** | 393 antiquities in `geo-places` (ODbL) | A heritage gift at a price point that suits tourists |
| **Printable PDFs** of all of the above | Same | 86% margin, instant delivery, no supplier and no cards involved |

**Lines to avoid:** apparel and mugs (20–40% margin, saturated); generic "Egyptian" souvenirs (knock-off and trademark risk, and nothing to differentiate them); **anything shipped into Egypt** (§3).

**Licences are already sorted.** Every layer in `site/data/` declares its licence, so the credit line on each print is written once and is correct. Most POD shops are guessing about licences; this one is not.

### Platform decision

**Etsy, with Printify for physical prints and Etsy's own digital listings for PDFs.** On egybi.com, add one static `prints.html` page that **links out** to the Etsy listings.

- **Why Etsy:** it is the only checkout found that officially pays Egyptian sellers (via Payoneer). Etsy also brings its own search traffic, which matters because egybi.com has almost none.
- **Why Printify first:** its Payoneer Balance top-up route is the one that is documented. Printful has better paper (per comparison sources), so switch to it if Printful can be paid from Payoneer.
- **Why not Shopify:** Shopify Payments is unavailable in Egypt, and Paymob is domestic only, so foreign card payments to an Egyptian account remain unsolved.
- **Why not WooCommerce:** it would run on Hostinger's PHP, but it has the same gateway problem and adds a database and plugins to a site whose strength is having neither.
- **Why a static link-out page:** no cart, no checkout code, no build step, and no runtime third-party calls (anchor links only). The site's architecture and its zero-call rule stay intact.

**Phase 2, only after demand is proven:** print locally in Egypt for Egyptian buyers and sell in EGP through Bosta COD with order confirmation. That is the only route into the domestic market that avoids ACI.

---

## 6. The 90-day plan, dated

Today is **Friday 2026-10-09**. Launching in October puts the shop in front of **Q4 gift buying**, which is the strongest season for wall art.

| When | Do | Effort | Cost |
|---|---|---|---|
| **This week, Oct 9–15** | **Three gating checks before any design work:** (1) open the Etsy shop and link Payoneer: does it complete for an Egyptian seller? (2) open Printify and test a Balance top-up from Payoneer. (3) send the two licence emails from the [[SaaS Conversion Plan]] to IDSC and ExchangeRate-API, which costs nothing. **If (1) or (2) fails, stop path (b). No money will have been spent.** | 6–8 h | $0 |
| Oct 16–22 | Render 3 designs at print resolution from the bundled geometry, each with source, date and licence line. Order 3 samples to a friend abroad | 10 h | ~$75 |
| Oct 23 – Nov 5 | Photograph the samples. Launch 12 listings (3 designs × 2 sizes + 3 PDFs + 3 bundles). Ship `prints.html` on egybi.com | 8 h | ~$3 |
| Nov 6 – Dec 3 | Grow to 30 listings. Pin to Pinterest (organic, free). Post where map enthusiasts already share maps | 4 h/week | ~$4 |
| **Dec 8 — day-60 checkpoint** | **Fewer than 5 orders → stop adding listings**, leave the shop running and put the time back into path (c) | — | — |
| Dec 9 – Jan 6 | Holiday peak. No new spending | 2 h/week | — |
| **Jan 7, 2027 — day-90 decision** | **20 or more orders → double down:** Etsy Ads at $1–2/day, 20 more designs, start the local-print EGP pilot. **Fewer than 20 → stop investing time** and leave the listings live as passive income | — | — |

Path (c) runs alongside this every week: the licence emails in week 1, then the outreach in its own plan.

---

## 7. Attacking the recommendation

**The strongest case against it:**

> "You have had a cited-data encyclopaedia for months, two monetisation plans, and zero revenue. Path (c) is a B2B sale that needs cold outreach you have never done, a licence answer nobody has, and an archive three months old that buyers may dismiss. Path (b) is pocket money. Always picking the careful option is how a project ends up beautiful, verified and unprofitable. A hungry operator would set up a US LLC, run a real Shopify store to American buyers, and learn customer acquisition, a skill that carries over to everything else."

**The answer:**

- **The learning argument is real.** But the first $1,500 of ad spend at a $32 CPA against ~$12 contribution is tuition, not income, paid by someone with near-zero capital. The same skill can be learned on path (b) with $1–2/day of Etsy Ads once organic sales show demand, at about **1/50th of the risk**.
- **"Zero revenue" is a fair hit, so the plan has a deadline.** If by **2027-01-07** path (b) has fewer than 20 orders and path (c) has no paying customer or signed pilot, the problem is not the business model. It is distribution. The next move then is to fix distribution, not switch models a fourth time.
- **The two paths reinforce each other.** Every poster sold is a sourced, dated EgyBI map on someone's wall with the site's name on it. That is marketing for path (c) that pays for itself.

**One concrete reason to reject this recommendation:**

> Path (c), the main bet, depends on two things neither verified nor yet demonstrated: a favourable licence answer, and the founder doing outbound B2B sales. **If you know you will not do cold outreach, path (c)'s real probability is far below 0.35**, and path (b) — which sells through a marketplace without outreach — should become the primary, scaled into local print and COD inside Egypt in 2027.

---

## Assumptions to check before acting

1. **Etsy shop opening plus Payoneer linking actually completes for an Egyptian seller.** This gates everything in path (b).
2. Printify Balance top-up from Payoneer, or Payoneer card issuance to Egyptian residents.
3. Real POD poster base cost and US shipping. The $9.95 figure is Printful's own promotional example.
4. The current ACI fee, and whether express couriers handle ACI for small parcels.
5. Egypt's de minimis status, from the Customs Authority or a broker rather than shipping blogs.
6. Stripe availability for Egyptian entities, from Stripe's own supported-countries page.
7. Bosta and Aramex COD rates and return fees, via written quotes.
8. Display RPM for the traffic-value line ($5 is generous, which only strengthens the conclusion).

## Self-check

- **Every market claim carries a source and a date:** yes. All web figures were read on 2026-10-09 from 2026 sources named in the tables. Repo figures cite their file. Weak or promotional sources are labelled as such.
- **"Can it be done fully" answered directly:** yes, in the first section. Possible as a rebuild, blocked commercially in both directions, and unwise (confidence 0.85).
- **A concrete reason to reject my own recommendation:** yes. If you will not do outbound sales, path (c)'s probability collapses and path (b) should lead.

---

## Sources

Dropshipping and ads: [Printful — dropshipping statistics](https://www.printful.com/blog/dropshipping-statistics) · [TrueProfit — is dropshipping profitable](https://trueprofit.io/blog/is-dropshipping-profitable) · [Branvas — 50+ statistics](https://branvas.com/blogs/news/dropshipping-statistics) · [Sellers Commerce](https://www.sellerscommerce.com/blog/dropshipping-statistics/) · [Thunderbit](https://thunderbit.com/blog/dropshipping-stats) · [Easyappsecom](https://easyappsecom.com/guides/shopify-dropshipping-statistics-2026) · [Podbase](https://www.podbase.com/blogs/dropshipping-statistics) · [DigitalApplied — Facebook ads benchmarks](https://www.digitalapplied.com/blog/facebook-ads-benchmarks-2026-cpc-cpm-ctr-industry) · [Trackbee](https://www.trackbee.ai/blog/facebook-ads-cost) · [Ryze AI — Meta benchmarks](https://www.get-ryze.ai/blog/meta-ads-cost-benchmarks-by-industry-2026) · [Lebesgue — TikTok benchmarks](https://lebesgue.io/tiktok-ads/tiktok-ads-benchmarks-for-ctr-cr-and-cpm) · [Eightx — chargebacks](https://eightx.co/blog/average-chargeback-rate-by-vertical) · [Chargeback.io](https://www.chargeback.io/ru/blog/average-e-commerce-chargeback-rate) · [Ringly](https://www.ringly.io/blog/shopify-chargeback-percentage)

Payments: [Etsy — countries eligible for Etsy Payments](https://help.etsy.com/hc/en-us/articles/115015710408-Countries-Eligible-for-Etsy-Payments) · [Etsy Payments Policy](https://www.etsy.com/legal/etsy-payments/) · [Etsy — Payoneer with Etsy Payments](https://help.etsy.com/hc/en-us/articles/16999319005207-How-Do-I-Use-a-Payoneer-Account-With-Etsy-Payments) · [Cenoa — Etsy payouts in Egypt](https://www.cenoa.net/blog/amazon-etsy-payout-fees-egypt-2026) · [CS-Cart — Stripe supported countries](https://www.cs-cart.com/blog/stripe-supported-countries/) · [Incorpuk — Stripe in Egypt](https://incorpuk.com/blog/open-stripe-account-in-egypt/) · [CS-Cart — Shopify Payments countries](https://www.cs-cart.com/blog/shopify-payments-supported-countries/) · [Shopify Community — Egypt payment method](https://community.shopify.com/c/payments-shipping-and/i-m-from-egypt-and-i-cant-add-a-payment-method/m-p/1822851) · [Xpay — PayPal in Egypt](https://xpay.app/blog/paypal-egypt-alternatives) · [Cenoa — PayPal alternatives Egypt](https://www.cenoa.com/blog/paypal-alternatives-egypt-freelancers-2026) · [OneSafe — Payoneer in Egypt](https://www.onesafe.io/blog/does-payoneer-work-in-egypt) · [Kerolos — Egypt gateway comparison](https://www.kerolosxgad.com/writing/payment-gateways-egypt-comparison) · [Digitology — Egypt gateways](https://digitology.co/payment-gateway-egypt/) · [Printify — payment process](https://help.printify.com/hc/en-us/articles/4483601124113-How-does-the-payment-process-work) · [Printify — Payoneer](https://printify.com/blog/a-new-way-to-top-up-your-balance-payoneer/) · [Paddle — supported countries (third-party)](https://supportedcountries.com/paddle/) · [Banque Misr — card usage limits 2026](https://www.banquemisr.com/-/media/Usage-limits-and-fees/Usage-limits-and-Fees-EN.pdf) · [Egypt Independent — card limits abroad](https://www.egyptindependent.com/egyptian-banks-adjust-withdrawals-and-purchases-limits-for-cards-abroad/)

Egypt logistics and market: [Ahram Online — ACI for air shipments](https://english.ahram.org.eg/NewsContentP/3/556054/Business/Egypt-to-implement-advance-cargo-information-syste.aspx) · [Daily News Egypt — ACI from January 2026](https://www.dailynewsegypt.com/2025/11/02/advanced-cargo-information-to-be-implemented-at-airports-from-january-2026-finance-minister/) · [AHK Egypt — mandatory ACI](https://aegypten.ahk.de/en/news2/egypt-to-enforce-mandatory-aci-for-air-freight-starting-january-1-2026) · [Logistics Middle East — ACI fees](https://www.logisticsmiddleeast.com/news/egypt-cuts-air-shipment-automation-fees-as-aci-goes-live) · [Rateships — Egypt customs](https://rateships.com/en/customs/egypt) · [iWishBag — de minimis by country](https://www.iwishbag.com/de-minimis) · [Mordor — Egypt e-commerce](https://www.mordorintelligence.com/industry-reports/egypt-ecommerce-market) · [23HubLab](https://23hublab.com/e-commerce-growth-in-egypt-opportunities-gaps/) · [Leadivo](https://www.leadivo.app/blog/how-to-start-ecommerce-egypt) · [Udjat Agency](https://www.udjatagency.com/ecommerce-in-egypt/) · [Codrocket](https://codrocket.com/blog/egypt-ecommerce-statistics-trends-2026) · [Research and Markets](https://www.researchandmarkets.com/reports/5601203/egypt-e-commerce-market-share-analysis) · [Euromonitor](https://www.euromonitor.com/retail-e-commerce-in-egypt/report) · [Bosta](https://bosta.co/en-eg/home) · [EasySell — Egypt COD](https://easysellapp.com/blogs/wiki/egypt-ecommerce-cod-market-entry-shopify-2026) · [Amwal Al Ghad — EGP rate](https://en.amwalalghad.com/?p=230356)

POD and Etsy fees: [Branvas — Printful vs Printify](https://branvas.com/blogs/news/printful-vs-printify) · [Artomate — poster POD partners](https://www.artomate.app/blog/poster-pod-partners-2026-printshrimp-vs-printful-vs-printify) · [Checkoutpage — Etsy fees](https://checkoutpage.com/blog/etsy-fees) · [Craftybase — Etsy fees](https://app.craftybase.com/blog/the-complete-guide-to-etsy-fees)

---

## Implementation, on approval

1. Save this note to the vault as `egybi/Dropshipping — Can It, Should It.md`, and add it to [[Home]] under Strategy beside the two existing plans.
2. Add a dated [[Changelog]] entry recording the verdict and the two corrections to the brief (archive at 69/91 days, 75.8%; EGP at 52.36).
3. Run the static checkers, commit and push. This touches only `egybi/`, so `Verify (browser)` will not trigger.

No site code changes. The `prints.html` page and the designs wait until the week-1 gating checks pass.
