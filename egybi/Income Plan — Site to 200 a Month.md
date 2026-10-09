# egybi.com Earns $200 a Month, Dressed in Papyrus

> **Status:** Superseded 2026-10-09 by [[The Pivot — Egypt, Honestly]]. Rejected by Ahmed as not changing the site enough. Back to [[Home]].

## Context

**Your latest instruction:** focus on egybi.com itself. Make it earn **at least $200 a month**, research every niche and career that could run *on the site*, and give **every page the Papyrus design**.

**How this differs from the last plan:** the "any career" plan put the money off-site (AI training, tutoring) and has been dropped. In this plan, every dollar is earned through a page on egybi.com:
- a service bought from the site;
- a product sold from the site;
- an affiliate link on the site;
- or a sponsor slot on the site.

Outside channels (Fiverr search, Pinterest, LinkedIn, Reddit) only send buyers *to* those pages.

**Research basis:**
- Research date: 2026-10-09.
- Exchange rate: EGP **52.36/USD** (`site/data/fx-today.json`). The target of **$200 is EGP 10,472 a month**.
- Today's traffic: about 160 visits a month.

**Repo state:** the working tree is on the stale branch `claude/project-artifacts-memory-review-0tgzxz` (0bd98ed). `main` has moved on. It has 16 top-level pages, including `invest.html` and `404.html`, plus 12 Papyrus issues, 123 tombstones, the `backend/verify/` suite and 12 workflows. **All implementation starts from `origin/main`.**

## 1. Verdict

**egybi.com can earn $200 a month from about month 6. It gets there as a storefront for what you can do, not as an ad site.** The arithmetic that rules out ads:

| Route | What $200 needs | Today |
|---|---|---|
| Ads on Egyptian traffic | **80,000–200,000 pageviews/month** at an Egypt RPM of $1–2.50 | ~160 visits |
| Ads on tourist traffic | ~13,000 pageviews at an *assumed* $15 RPM | ~160 visits |
| Sponsored posts | Posts sell for **£75–200 under 5,000 visitors/month** (Lilach Bullock, 2026), but sponsors still ask for traffic numbers | Too early, so they start around month 9 |
| **Services sold from the site** | **2 orders a month at $150** (net $117.60 each after Fiverr's 20%) | Possible from month 2 |

Search is getting harder too, which is why this plan doesn't wait for SEO:
- AI Overviews cut organic clicks by **38%** (Search Engine Journal field study).
- Seer Interactive measured position-1 CTR falling about **52%** on queries that show an AI Overview.
- Only **1.74%** of new pages reach Google's top 10 within a year (Ahrefs).

**The stack: four earning layers on the site, each one a new page or section.**
1. **`work.html`:** Egypt data, maps and Power BI services. This is the core.
2. **`shop.html`:** Egypt data packs, Power BI templates, printable maps and climate sheets.
3. **Visitor and expat pages:** 18 "best time to visit" pages, plus `living.html`, a cost-of-living page built from the official prices feed. They carry plain affiliate links for tours, an eSIM and travel insurance.
4. **A sponsor slot ("The Papyrus is supported by …")** from month 9, once traffic numbers exist to show sponsors.

**Base case:** **$310 in month 6** (crosses $200), $463 in month 12, **$3,330 in the year (EGP 174,348)**. Confidence ≥ $200 by month 6 is **0.50**; by month 12 it is **0.65**.

⚠️ **Gate:** layers 1 and 2 are paid outside work. **Check your Teleperformance contract for outside-work and IP clauses first.** Without layer 1, the site makes **$75 a month at month 6 and $228 at month 12**: it reaches $200 only near the end of the year.

---

## 2. Niches and careers the site could host, researched

**How to read the table:**
- "Career" is the role egybi.com would play.
- P(≥$200 by M6) and P(by M12) are the chances that **that niche alone** reaches $200 a month at 6–10 h a week. They are judgement estimates, not measured figures.
- ✅ means the payout to Egypt is confirmed on the platform's own page. ⚠️ means it is unconfirmed.

| # | Niche on egybi.com | Career | How the site earns | Payout to Egypt | P(M6) | P(M12) | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | **Egypt data & map services** (`work.html`) | BI consultant / cartographer | Fixed-price offers, each linking to a Fiverr gig ($150 → $117.60 net), or an invoice for direct clients | ✅ Fiverr → Payoneer | **0.40** | **0.55** | **Core.** The site is the proof: Street Report Card, prices pipeline, tile-free atlas |
| 2 | **Data packs & templates** (`shop.html`) | Data vendor | $15–29 downloads: cited Egypt CSVs + a Power BI file, an SQL interview pack, map PDFs. Sold through **Payhip** (5% fee on the free plan; Egypt payouts via PayTabs per Payhip's help page) or **Lemon Squeezy** (5% + 50¢; Egypt status on its bank-payout list unconfirmed) | ✅ Payhip+PayTabs / ⚠️ LS | 0.05 | 0.20 | **Yes.** It is the semi-passive layer |
| 3 | **Visitor planning** (18 "best time to visit" pages from `visit-climate.json`) | Travel writer | Plain links: **GetYourGuide via Awin** (Awin pays through **Payoneer**), **Airalo eSIM 10%+ via Impact** (bank or PayPal), Klook/Tiqets (Egypt eligibility unconfirmed) | ⚠️ Awin→Payoneer likely; GYG eligibility for Egypt unconfirmed | 0.01 | 0.05 | **Yes, as a slow builder.** Egypt had ~19m arrivals in 2025 |
| 4 | **Living in Egypt / expat costs** (`living.html`) | Relocation guide | A unique angle no expat blog has: **"what EGP 20,000 buys"** from the IDSC daily price feed. Links to SafetyWing (10%, reported) + Airalo | ⚠️ unconfirmed | 0.01 | 0.04 | **Yes**, because it reuses data the site already has. Digital-nomad visa status is disputed, so the page does not cover visas |
| 5 | Sponsor slot on Papyrus issues and visitor pages | Publisher | One sponsor per month, **$50** (assumption): an Egyptian tour operator, BI bootcamp or edtech. Sold by direct email; plain image + link, no script | ✅ bank/Payoneer invoice | 0.00 | 0.25 | **From month 9**, once traffic numbers exist to show |
| 6 | Egypt data-jobs board (`jobs.html`) | Recruiter | MENA boards charge **$149/post (Akhtaboot)** and **$99–250 (Wuzzuf, third-party figures)**; a new niche board could charge ~$30–50 featured | ⚠️ | 0.00 | 0.05 | **Later.** Needs employers *and* job seekers; month-9 option |
| 7 | Price-history data licensing | Data vendor | List the IDSC archive on **Datarade** (buyer discovery; commission tier exists, rate unconfirmed) | ⚠️ | 0.02 | 0.08 | **Optional add-on**; check the IDSC licence first |
| 8 | Arabic BI learning hub | Educator | Arabic Power BI/SQL lessons with Egyptian data → tutoring bookings / course | ⚠️ | 0.02 | 0.06 | **No.** It re-opens the retired SQL product, and Almentor already owns this space |
| 9 | Arabic calculators (electricity tiers, salary tax, inflation) | Tool publisher | AdSense | ✅ | 0.00 | 0.02 | **No.** Egypt RPM; it would need ads on the site |
| 10 | Investor information (`invest.html` exists) | — | — | — | — | — | **Not monetised.** FRA rules allow information only; no paid tips, no "returns" |
| 11 | Map prints on Etsy, linked from `shop.html` | Cartographer | ~$13 blended net | ✅ Etsy → Payoneer | 0.02 | 0.08 | **Folded into #2** |
| 12 | Hotels: Booking.com / Airbnb | — | Booking now signs up through **CJ** (Egypt not named); **Airbnb has no open cash affiliate programme in 2026** | ⚠️ / ❌ | — | — | Booking only if CJ accepts; **no Airbnb** |
| 13 | Newsletter sponsorship / beehiiv Ad Network | Publisher | beehiiv pays through **Stripe Express only**, and Egypt is unconfirmed; the list has 2 subscribers | ❌ | 0.00 | 0.01 | No |
| 14 | AdSense / Journey / Carbon | — | Covered in §1; Carbon pays by wire with a $500 minimum and a $35 fee | ✅/⚠️ | 0.00 | 0.02 | **No.** It breaks the zero-third-party rule |
| 15 | Donations, dropshipping | — | — | ❌ | 0.00 | 0.00 | No |

**What the research says, in one line:** the site earns from **selling the abilities it already proves** (data, maps, a cited archive), and only slowly from traffic. Every traffic-only niche (ads, calculators, newsletter) fails the $200 test within a year.

---

## 3. The Papyrus design on every page

The "Papyrus" look is the newsletter's letter style (`.papyrus-letter`, `site/assets/egybi.css` ~l.688 on main):
- a parchment gradient sheet;
- a torn gold top edge;
- a wax-seal ankh that stamps on success;
- gold-ruled "specimen" callouts.

It becomes the site-wide visual language, built mostly in the stylesheet so that pages need few edits.

**What changes in `site/assets/egybi.css`:**

1. **A `.sheet` primitive** generalising `.papyrus-letter`:
   - the parchment gradient, plus a paper-fibre texture from layered CSS gradients (no image file);
   - the torn gold edge as `::before`;
   - a 4/4/14/14 radius and the existing shadow.
2. **Applied through the classes pages already use**, so most pages need no HTML change:
   - `.card`, `.chart-card`, `.callout`, `.glyph-card`, `.retired-note` and the map frame `.map-box` all render as sheets;
   - the `.pl-specimen` callout is renamed `.specimen` (with an alias kept) for "source and date" notes on every chart.
3. **Section rhythm.**
   - `surface-light` becomes the "papyrus roll": a gold rod divider with rounded caps between sections, replacing flat borders.
   - `surface-dark` (Kemet) stays dark and holds sheets inset like documents on a desk, so the two-surface rule in the CSS header still holds.
4. **The hero** of every page gets a sheet title block with a small seal (the ankh glyph already in use). The animated flag on `index.html` stays as it is.
5. **Typography.** Cinzel headings are kept. Add a Cinzel drop cap on the first paragraph of story and Papyrus pages, and an "issue line" (date · source) under page titles.
6. **Motion.** Sheets unroll on reveal and the seal stamps on form success. Under `prefers-reduced-motion`, sheets appear fully drawn, with no animation and nothing hidden.

**HTML changes:**
- **The 16 top-level pages:** wrap each hero title in `.sheet-title` and add the `.specimen` source lines where charts lack them.
- **Generated pages:** change the templates in `backend/pipeline/build_static_pages.py`, so all 12 Papyrus issues and the 123 tombstones inherit the look on the next build. Never hand-edit generated output.
- **Cache-bust:** bump `egybi.css?v=` everywhere.
- **New pages** (`work.html`, `shop.html`, `living.html`, the 18 visit pages) are built Papyrus-first.

**Constraints kept:** no framework, no build step, no new third-party request (the texture is pure CSS), zero map-provider calls, WCAG AA contrast on parchment (check `--ink-soft` on the new gradient).

---

## 4. The new earning pages

| Page | Content | Data source | Effort |
|---|---|---|---|
| **`work.html`** | Three offers as Papyrus "commissions", each with a seal and price: **custom Egypt map** ($150), **Power BI dashboard on Egyptian public data** ($150), **price-history extract and report** ($60). Each case study links to the live page that proves it. Buttons link to the matching Fiverr gig; an email address for direct clients | Existing pages | 5 h |
| **`shop.html`** | Product sheets: price, what's inside, source and licence for every file, plain "Buy" link to Payhip/Lemon Squeezy and Etsy | Cited data only, never employer data | 3 h + products |
| **`visit/best-time-to-visit-<site>.html` × 18** | Monthly heat from the NASA 2001–2020 normals, a relief profile, then disclosed `rel="sponsored nofollow"` links for tours, eSIM and insurance | `visit-climate.json`, `visit-terrain.json`, generated by `build_static_pages.py` | 6 h |
| **`living.html`** | "What a month in Cairo costs, from the official price feed": a basket built from `prices-today.json` + FX band, dated, with an IDSC citation. Disclosed eSIM and insurance links. **No visa claims** | `prices-*.json`, `fx-*.json` | 5 h |
| Footer + `prices.html`, `explore.html`, `geospatial.html` | One line each: *"Need this as a dataset or a dashboard? → Work"* | — | 1 h |
| Sponsor slot (month 9) | One static `.sheet.sponsor` block: logo (self-hosted), one line, link, "Sponsored" label | — | 1 h |

Navigation: add **Work** and **Shop** to the header in every page and template. The wayfinding next-steps link visitor pages to Living and data pages to Work.

---

## 5. Plan of work

### Week 0 (before any build)
1. **Contract check** (30 min).
2. **Accounts:**
   - Fiverr seller account + 3 gigs;
   - Payhip, connected to PayTabs (fall back to Lemon Squeezy);
   - an Awin publisher application, then the GetYourGuide programme;
   - the Airalo programme on Impact.

   **Confirm in each dashboard that Egypt can be paid** before building any affiliate page.

### Build (about 4 weeks, at 8–10 h/week)

| Week | Ship |
|---|---|
| 1 | **Papyrus design system**: the CSS primitives, the 16 pages, the template changes in `build_static_pages.py`, the cache-bust. Run the full verify suite |
| 2 | `work.html` + Work/Shop in nav; the 3 Fiverr gigs use screenshots of the site's own maps and dashboards |
| 3 | First 2 products (Egypt prices data pack + Power BI file; printable climate sheets for 18 sites) → `shop.html` |
| 4 | The 18 visit pages + `living.html`, generated; sitemap; Search Console submit |

### Months 2–12
- **Every week:** one LinkedIn chart post from the site's own data, linking to the page it came from. Five Pinterest pins a week for products and visit pages.
- **Day 56 (early December):** no service order yet → change gig titles and images, and lower the entry price to $120.
- **Month 4:** 4th and 5th products; list the data packs on Datarade (if the IDSC licence allows).
- **Month 6:** raise gig prices 15% after 5 reviews.
- **Month 9:** send a one-page sponsor kit (real Search Console numbers) to 10 Egyptian tour operators and BI bootcamps; decide on `jobs.html`.
- **Month 12:** review. Drop any layer earning under $10/h.

## 6. Income table, base case

**Assumptions (all net):**

| Layer | Unit net | Volume by month (M1–M12) |
|---|---|---|
| **Services** | $150 → **$117.60** | Orders: 0, then 1/month for M2–M5, then 2/month from M6 |
| **Products** | **$13** per sale ($15 less Payhip's 5% and processing; *assumption*) | Sales: 0, 1, 2 … rising by 1 a month to 11 |
| **Affiliates** | **$5** per booking (*assumption*) | Bookings: 0, 0, 0, 1, 1, 2, 2, 3, 4, 5, 6, 7 |
| **Sponsor** | **$50** a month (*assumption*) | From M9 |

| Month | Services | Products | Affiliates | Sponsor | **Total USD** | **Total EGP** |
|---|---|---|---|---|---|---|
| 1 | 0 | 0 | 0 | 0 | **$0** | 0 |
| 2 | 117.60 | 13 | 0 | 0 | **$130.60** | 6,838 |
| 3 | 117.60 | 26 | 0 | 0 | **$143.60** | 7,519 |
| 4 | 117.60 | 39 | 5 | 0 | **$161.60** | 8,461 |
| 5 | 117.60 | 52 | 5 | 0 | **$174.60** | 9,142 |
| 6 | 235.20 | 65 | 10 | 0 | **$310.20** ✅ | 16,242 |
| 7 | 235.20 | 78 | 10 | 0 | **$323.20** | 16,923 |
| 8 | 235.20 | 91 | 15 | 0 | **$341.20** | 17,865 |
| 9 | 235.20 | 104 | 20 | 50 | **$409.20** | 21,426 |
| 10 | 235.20 | 117 | 25 | 50 | **$427.20** | 22,368 |
| 11 | 235.20 | 130 | 30 | 50 | **$445.20** | 23,311 |
| 12 | 235.20 | 143 | 35 | 50 | **$463.20** | 24,253 |
| **Year** | **$2,116.80** | **$858** | **$155** | **$200** | **$3,329.80** | **174,348** |

**Arithmetic check, month 6:** 2 × 117.60 = 235.20; 5 × 13 = 65; 2 × 5 = 10. Total **310.20**, × 52.36 = **16,242**.

**Hours check, month 12:** 2 orders × 6 h = 12 h, products ~5 h, posts and pins ~8 h, sponsor ~1 h: **26 h ≈ 6 h a week**.

**Traffic check:** 7 bookings at an assumed 1 per 150 visitor-page visits needs about 1,050 visits a month to those pages, about 6× today's whole site. This is the least certain line, and also the smallest.

**Stress cases:**
- **No services (contract blocks it):** **$75 at month 6 and $228 at month 12.** Products, affiliates and the sponsor reach $200 only in month 12.
- **Services at half the rate** (1 order a month all year): month 6 is $192.60, month 12 is $345.60. That crosses $200 in month 7.

## 7. Weekly metric and stop rules

The metric is **orders per week (services + products)**. Visits are a diagnostic only.

| Signal | Action |
|---|---|
| No service order by day 56 despite gig impressions | Rework titles and images, $120 entry |
| No Fiverr impressions at all | Change category and tags |
| Products < 3 sales by month 4 | Stop making new products; promote the best two |
| Affiliate pages < 300 visits/month at month 6 | Stop adding visit pages; keep the 18 live |
| Total ≥ $200 at month 6 | Continue; add the sponsor slot at month 9 |
| Total < $100 at month 6 | Most of the money is services: say so plainly, and decide whether the site should stay a portfolio |

## 8. Attacking the plan

**The strongest objection:** "You said 'make the *website* earn', and services are 64% of the year's income (51% in month 12): me doing paid work that the site advertises."

**The answer:**
- Yes, and §1 is why. No honest arithmetic gets a 160-visit site to $200 from ads or affiliates within a year.
- Every order in this plan is **bought through egybi.com**, with the site's own pages as the evidence.
- The products, affiliate and sponsor lines (49% of month 12, and growing) are the part that keeps earning without you.

**A concrete reason to reject it:** if the contract forbids outside work, the realistic number is **$75 a month at month 6**. In that case the site cannot reach $200 within a year without changing the contract.

## Assumptions to check before acting

1. **The employment contract** allows outside work and doesn't claim IP on side products.
2. **Fiverr → Payoneer** withdrawals work for an Egyptian account.
3. **Payhip + PayTabs** approves an individual Egyptian seller; otherwise check whether Egypt is on Lemon Squeezy's bank-payout list.
4. **Awin accepts an Egypt-based publisher**, and GetYourGuide accepts the site; Airalo/Impact pays to Egypt.
5. **The IDSC data licence** allows selling derived data packs. If not, packs use only openly licensed sources.
6. **Product price and net ($13), booking value ($5), conversion (1 per 150 visits) and sponsor price ($50)** are judgements, not sourced figures.
7. **Contrast:** `--ink-soft` on the new parchment gradient still passes WCAG AA, checked by `backend/verify/contrast.js`.

## Sources

All read 2026-10-09. Third-party figures are marked as such in the tables.

- **Search:** [SEJ — AI Overviews cut clicks 38%](https://www.searchenginejournal.com/ai-overviews-cut-organic-clicks-38-field-study-finds/573145/) · [Seer Interactive — AIO CTR 2026](https://www.seerinteractive.com/insights/aio-impact-on-google-ctr-2026-update) · [Ahrefs — ranking without links](https://ahrefs.com/blog/how-to-rank-in-google-without-links)
- **Sponsored content:** [Lilach Bullock — sponsored content pricing](https://www.lilachbullock.com/sponsored-content-blog-pricing/)
- **Job boards:** [Dirstarter — niche job board](https://dirstarter.com/blog/start-niche-job-board) · [AgileSoftLabs — job board models](https://www.agilesoftlabs.com/blog/2026/05/job-board-monetization-5-revenue-models) · [startup.jobs — Akhtaboot](https://startup.jobs/job-boards/akhtaboot) · [BetterTeam — Wuzzuf](https://betterteam.com/wuzzuf) · [Qureos — Egypt recruitment platforms](https://www.qureos.com/hiring-guide/top-recruitment-platforms-in-egypt)
- **Affiliates:** [Awin — Payoneer FAQ](https://success.awin.com/articles/en_US/Knowledge/Payoneer-for-Awin-Publishers-FAQs) · [UpPromote — GetYourGuide](https://uppromote.com/affiliate-directory/getyourguide/) · [Airalo — affiliate FAQ](https://www.airalo.com/blog/airalo-affiliate-program-faqs) · [Involve Asia — Klook](https://involve.asia/?p=36792) · [Awin — Tiqets](https://www.awin.com/us/news-and-events/program-news/new-affiliate-program-tiqets) · [PostAffiliatePro — SafetyWing](https://www.postaffiliatepro.com/affiliate-program-directory/safetywing-affiliate-program/) · [Track360 — Airbnb 2026](https://track360.io/blog/airbnb-vacation-rental-affiliate-referral-programs-operator-teardown-2026) · [Travelpayouts — Booking.com](https://www.travelpayouts.com/en/offers/bookingcom-affiliate-program) · [Creator-Hero — Viator](https://www.creator-hero.com/blog/viator-affiliate-program-in-depth-review-pros-and-cons)
- **Selling products:** [Payhip — connect PayTabs](https://help.payhip.com/article/372-connect-your-paytabs-account) · [Dodo — Payhip review 2026](https://dodopayments.com/blogs/payhip-review) · [Lemon Squeezy — supported countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries) · [Lemon Squeezy — getting paid](https://docs.lemonsqueezy.com/help/getting-started/getting-paid) · [PayTabs — payouts](https://site.paytabs.com/en/payouts/) · [Fiverr — withdrawing earnings](https://help.fiverr.com/hc/en-us/articles/360010530058-Withdrawing-your-earnings-managing-payout-methods) · [Etsy — eligible countries](https://help.etsy.com/hc/en-us/articles/115015710408-Countries-Eligible-for-Etsy-Payments)
- **Data and ad networks:** [ZoomInfo — Datarade pricing](https://pipeline.zoominfo.com/sales/datarade-pricing) · [Datarade — provider apply](https://providers.datarade.ai/apply) · [Carbon Ads — FAQ](https://carbonads.net/faq) · [beehiiv — Stripe Express](https://www.beehiiv.com/support/article/30065237532823-how-to-set-up-a-stripe-express-account-for-monetization) · [Brightseotools — AdSense by country](https://brightseotools.com/adsense-calculator)
- **Niches:** [TechCrunch — Almentor](https://techcrunch.com/?p=2159241) · [Nomada — Egypt](https://nomada.tools/destinations/egypt) · [Expat Arrivals — cost of living Egypt](https://www.expatarrivals.com/egypt/cost-of-living-in-egypt) · [Ecofin — Egypt arrivals 2025](https://www.ecofinagency.com/news-industry/0601-51778-egypt-tourist-arrivals-jump-21-in-2025-to-19-million) · [PayScale — BI analyst Egypt](https://www.payscale.com/research/EG/Job=Business_Intelligence_(BI)_Analyst/Salary)

---

## Implementation, on approval

**Order:** design first, then pages, then the vault.

1. **Start from main:** `git fetch origin main && git checkout -B claude/project-artifacts-memory-review-0tgzxz origin/main`.
2. **Papyrus design system** (§3):
   - edit `site/assets/egybi.css`;
   - edit `backend/pipeline/build_static_pages.py`;
   - edit the 16 top-level pages (sheet title, specimen lines, nav Work/Shop);
   - bump the `egybi.css?v=` cache-bust.
3. **New pages** (§4):
   - `work.html`, `living.html` and the 18 generated visit pages.
   - `shop.html` ships as a shell that says "first products coming", with no fake products. Affiliate links are added **only after** the dashboards confirm Egypt payout; until then those sections ship without links.
   - Add every new page to `sitemap.xml` via the generator.
4. **Vault:**
   - save this plan as `egybi/Income Plan — Site to 200 a Month.md`;
   - recover the earlier plans verbatim from the session transcript, never from memory: *300 to 400*, *1,000 to 2,000*, *Dropshipping* and *Any Career*;
   - write a new note, `egybi/Papyrus Design System.md`;
   - update [[Frontend & Design System]], [[Home]] (a new "💰 Income" section) and [[Changelog]];
   - update `README.md` (page list, design line).
5. **Commit and push:** grep for model identifiers, then commit with the attribution lines and push to the designated branch. **No PR unless you ask**, and merging to main (which deploys) is your call.

**Verification:**
- **Static checks:** `python backend/verify/static-audit.py`, `checks.py`, `seo.py`, `coverage.py`.
- **Browser suite:** `backend/verify/ci-step.sh`, which runs `all-pages.js`, `contrast.js`, `overflow.js` (390px), `reduced.js` and `map-render.js` on every page, old and new.
- **Mutation suite:** `python backend/verify/mutate.py` must report no FAILS TO CATCH.
- **Screenshots:** `index`, `visit`, `work`, a Papyrus issue and a tombstone, at 390px and 1280px, light and dark, so the parchment look can be checked.
- **Discipline checks:**
  - grep the new pages: zero `<script src=` to third-party domains;
  - every affiliate `<a>` has `rel="sponsored nofollow"` and a visible disclosure;
  - every figure on `living.html` and the visit pages carries a source and date.
