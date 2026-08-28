# SaaS Conversion Plan

> How EgyBI could become a business that takes money, written 2026-08-17 against the repository as it actually stands rather than as it is usually described. Back to [[Home]] · supersedes the pre-pivot [[Business Model & Pricing]] · see [[The Pivot — From SQL Practice to Encyclopaedia]], [[Traffic Baseline & Analytics]], [[IP & Content Rules]], [[Risks & Mitigations]].

## Read this first: four measured facts that decide the plan

Everything below follows from these. Each was read out of the repository on
2026-08-17, not estimated.

| # | Fact | Where it came from | Why it changes the answer |
|---|---|---|---|
| 1 | **The audience is ~37 people.** Visitors 7d = 37, views all-time = 156, at the last recorded reading (2026-07-20 11:59 UTC, pre-launch). No reading has been taken since. | [[Traffic Baseline & Analytics]] | Every self-serve funnel plan — "convert 2% of traffic" — is arithmetic on a number that does not exist yet. Self-serve is not available as a first move. |
| 2 | **The corpus is ~30 real pages, not 153.** 153 HTML files, of which 123 are `noindex` retired tombstones under `site/practice/` and `site/tracks/`. | `find site -name '*.html'` vs `site/practice/*.html` | An advertising or media business needs a corpus an order of magnitude larger. Media is out as a revenue line for at least 18 months. |
| 3 | **The only non-re-fetchable asset is young and it is not daily.** Re-read 2026-08-28: `prices-history.json` holds **35 observation days across a 49-day span** (2026-07-09 → 2026-08-26, **71.4% dense**) over 132 retail and 105 wholesale commodities. `fx-history.json` holds 10 currencies and 37 points. | `site/data/prices-history.json`, `fx-history.json` | This is the whole moat, and it is seven weeks old with holes in it. It cannot be bought, back-filled or hurried — only waited for. **Correcting an earlier draft of this note, which called it daily.** |
| 4 | **The two commercially interesting datasets are the two with no declared licence.** Sixteen of eighteen files in `site/data/` declare a source; `geo-*` and `streets-*` declare **ODbL** (share-alike); `visit-*` declare public domain. `prices-today`, `prices-history`, `fx-today` and `fx-history` declare **no licence at all**. | `site/data/*.json` `license` fields | The wedge below depends on a redistribution right nobody has established. This is the single highest-value unknown in the plan and it is answerable this week. |

Fact 4 is the kind of thing this project's own discipline exists to surface:
every other dataset says under what terms it may be used, and the two that would
be sold say nothing. That is not a licensing problem yet. It becomes one the
moment money changes hands.

---

## 1. What is actually sellable

### The honest asset inventory

Split by whether a competent stranger could reproduce it in a weekend.

| Asset | Reproducible by anyone? | Commercial value |
|---|---|---|
| `geo-places` (873 places), `geo-health`, `geo-schools`, `geo-industry` | **Yes** — one Overpass query | Near zero as data. Real as *presentation*. |
| `streets-*` (10 districts, OSMnx network metrics) | Yes, with a day's work and an OSMnx install | Low as data; the *choice of ten districts and the metric definitions* is the work |
| `visit-climate`, `visit-relief`, `visit-terrain` (NASA) | Yes | Zero. Public domain, globally available |
| `geo-heritage` (UNESCO) | Yes — it is a published list | Zero |
| Knowledge base (~40 tables, ~600 rows, hand-researched, cited) | **No** — it is a year of reading | Moderate. Small but genuinely original |
| `invest-projects` (the investor join) | **No** — it is the KB joined to geography | Moderate, and legally constrained (§4) |
| **`prices-history` + `fx-history` archive** | **No, and never** — IDSC publishes *today*, not history | **This is the asset.** Compounds with every publication, cannot be caught up |
| The verification suite (39 mutation-tested checkers) | No | Zero as a product. Real as a *sales proof* (§5) |
| Tile-free zero-call map stack | Mostly | Low. Interesting to engineers, not to buyers |

**The uncomfortable conclusion: most of EgyBI's data is not sellable, because
it is open data anyone can re-fetch.** What is sellable is (a) the accumulating archive
that only exists because someone started collecting it, (b) the editorial layer
that says what a number means and where it came from, and (c) the founder's
labour applied to a specific buyer's question.

### The three segments, ranked

| Segment | Reachable in | Willingness to pay | Verdict |
|---|---|---|---|
| **A — Tourists, diaspora, curious readers** | Immediately, at scale, via SEO | **~$0 for information.** They pay for beds and flights, not facts | Never the wedge. Affiliate revenue at best (§4), funnel at worst |
| **B — Researchers, journalists, NGOs, university libraries** | 3–6 months, via direct outreach and citations | $100–800/yr individually; $2k–10k/yr institutionally | Real but slow, and small. Good second market |
| **C — Commercial users of Egyptian price and location data**: FMCG and food importers, commodity desks, market-entry consultancies, development agencies | 1–3 months, via direct email to named people | **$3k–25k/yr** — they already have a data budget line | **The wedge** |

Ranked on speed × capacity, C wins and it is not close — *given fact 1*. With
37 visitors there is no funnel to convert; there is only a list of people to
email. Segment C is the only one where **five customers is a business** and
where five customers can be reached by hand.

### Why not the alternatives

**Not segment A (tourism).** It is the largest audience and the one the site is
best at serving, and it monetises at roughly zero per reader for information.
The honest monetisation of A is affiliate — Booking.com and similar — which is
a media business requiring fact 2 to be false. Keep A entirely free. It is the
credibility engine, not the revenue engine.

**Not segment B first.** Institutional buyers are the natural long-run home for
a cited-data encyclopaedia, and their procurement cycles run 3–9 months. A solo
founder with near-zero capital cannot wait out a university library's purchase
order as a *first* revenue event. Sell to B in year two, when there are named
customers in C to cite.

### The wedge, stated precisely

> **Sell the Egyptian retail and wholesale price archive, plus EGP FX,
> as a maintained, provenance-carrying time series, to companies that need to
> know what food costs in Egypt over time.**

Not the maps. Not the atlas. Not the gazetteer. The boring table that has
been quietly accumulating since 2026-07-09.

**And say the density out loud when selling it.** 35 observations over 49
calendar days is 71.4%, not one point a day. An isolated missing date means IDSC
published nothing for it — a point is keyed by the source's own `as_of` and a
duplicate is never appended, which is why the runs on 2026-08-17 and 08-23
succeeded and added nothing. A *run* of missing dates means the pipeline was
down; the block from 2026-07-10 to 07-17 is that, and it has issue #35. A buyer
finds this in the first file they open, so it belongs in the pitch rather than
in their discovery.

**Confidence: 0.6.** It rests on two unknowns — whether IDSC's terms permit
redistribution (fact 4), and whether the specific buyers exist in reachable
numbers. Both are testable within three weeks and §5 says how.

### Give yourself a specific reason to disagree

The strongest case against this wedge: **seven weeks of 71%-dense history is not a product,
and by the time it is (12+ months), a competitor with capital could have started
their own collector and be only 12 months behind — while you would have spent a
year not building an audience.** If you believe the archive's value is linear
rather than compounding, the correct move is the opposite of this plan: pour the
year into segment A's traffic instead, and monetise attention.

The counter-argument, which is why I still pick the archive: the collector is
already running and costs nothing, so waiting is free and happens in parallel
with everything else. But if you find in §5's outreach that buyers say "we need
five years of history," the wedge is wrong and you should know that in three
weeks, not three quarters.

---

## 2. The product ladder

Prices in USD with EGP at **50.27 EGP/USD**, the rate in `fx-history.json` as of
2026-08-16. EGP prices are set annually against a rate you re-read, not pegged.

| Tier | Price | What is in it | What makes someone cross the line |
|---|---|---|---|
| **Public** | Free, no account | Everything on the site today: all ~30 real pages, every map, every story, the SQL sandbox, the atlas, the gazetteer, the visitor and investor layers. On-screen, forever. | — |
| **Reader** | Free, account | Saved places, one weekly email digest, alerts when a commodity you follow moves more than a threshold you set | They want to be told rather than to come back and look |
| **Pro** | **$14/mo · $140/yr**<br>(EGP 700/mo · EGP 7,000/yr) | Export any table as CSV/XLSX/JSON. Full price and FX history, not just the on-screen window. Chart embeds with a permanent provenance line. Personal-use licence. | **They need the numbers *out* of the browser** — into a spreadsheet, a paper, an article |
| **Team** | **$99/mo · $990/yr**<br>(EGP 4,975/mo · EGP 49,750/yr) | 5 seats. API key, 25,000 calls/month. Scheduled deliveries (daily CSV to email or S3). Commercial-use licence for internal reporting. | **They need it to arrive without a human** — it is now in someone's workflow |
| **Data** | **from $7,500/yr** | Full historical archive as a versioned bulk file, delivered on a stated schedule with a freshness SLA. A provenance manifest naming every source, its licence, and the date each figure was read. Right to redistribute *within* the buying organisation. One named custom series per year (a commodity, a district, a governorate) added to the collector. | **They need to depend on it** — it goes in a model, a report they sell, or a board pack |

**The logic of the boundaries**, which is the part worth defending:

- Free/Reader → Pro is **export**. Reading is free forever; taking it away costs money. This is the only boundary that does not damage the mission, because the public benefit is that the figures are *visible and cited*, not that they are bulk-downloadable.
- Pro → Team is **automation**. One person copying a CSV is Pro. A system fetching it is Team.
- Team → Data is **dependence**. The moment a buyer's own output is wrong if yours is late, they are buying an SLA, and an SLA is worth an order of magnitude more than an API key.

**What must never go behind a wall:** every figure currently visible on a page,
its source, and its as-of date. The entire credibility of this project is that
a stranger can check the number. Paywalling the *number* destroys the asset
that makes the paywall sellable. Paywall the *convenience*.

---

## 3. What to build, in order

### The architectural ruling that governs everything

**The static site never becomes dynamic.** `egybi.com` stays exactly what it is:
static files on Hostinger, no runtime keys, no provider calls, git auto-deploy,
verified by the browser suite on every push. Paid functionality lives at a
**separate origin** (`api.egybi.com`) with its own deploy path.

This is not conservatism. It is the only way to keep three things that are
already true and valuable: the site is fast, it cannot leak a key, and
`Verify (browser)` can prove its correctness in 35 minutes. A single dynamic
page on the main origin ends all three.

### Phases

| Phase | What | Effort | Deferrable? |
|---|---|---|---|
| **0 — Answer the licence question** | Write to IDSC and ExchangeRate-API asking, in writing, whether the daily figures may be redistributed and on what terms. Record the answers in `site/data/*.json` `license` fields and in [[IP & Content Rules]]. Do the same for the WMO station normals. | **3–5 days, mostly waiting** | **No. Nothing else may start.** |
| **0b — Sell before you build** | A single page: what the archive is, its span, its sources, a 200-row sample CSV, and a "reply to this email" price. No account system. No payment integration. Invoice by hand. | 2 days | No |
| **1 — Manual fulfilment** | First 1–5 customers served by hand: a signed download link generated by a script, emailed. Payment by MoR checkout link (§4). Zero infrastructure. | 3 days | No |
| **2 — Accounts and entitlements** | `api.egybi.com`: email+magic-link auth, a `customers`/`entitlements`/`api_keys` schema alongside the existing KB, checkout webhooks writing entitlements. Export endpoints gated on entitlement. | 3–4 weeks | Until 5 paying customers exist |
| **3 — Metered API** | Keys, per-key rate limits, usage counters, a usage page, overage handling. Read replicas of the JSON the pipelines already write — the API serves files, not queries, until volume justifies otherwise. | 3–4 weeks | Until a customer asks twice |
| **4 — Delivery and SLA** | Scheduled push (S3/email/SFTP), a public status page with the real freshness of each dataset, versioned archive snapshots, the provenance manifest generator. | 4 weeks | Until the first Data-tier deal |
| **5 — Institutional** | Seats, SSO, invoicing, procurement paperwork, a DPA. Only for segment B. | 4+ weeks | Yes, indefinitely |

**Total to first revenue: about two weeks, nearly all of it writing and
waiting.** Total to a self-serve product: about three months of evenings.

### How the pipelines feed a paid product

They already do the hard part. `fetch_prices.py` and `fetch_fx.py` write dated,
sourced JSON on a daily cron; `build-geo-assets` and `refresh-streets` do the
same on longer cadences. Three additions turn that into something sellable:

1. **Immutable dailies.** Today the history file is rewritten. Write instead an append-only `site/data/archive/prices-YYYY-MM-DD.json` (or keep them off the public origin). A subscriber's reproducibility claim depends on yesterday's file still existing unchanged.
2. **A provenance manifest.** One generated file listing every dataset, its source, its licence, its as-of date, and the commit that produced it. This is the artefact that justifies the Data tier's price, and the repository already holds every input it needs.
3. **A freshness contract.** `workflow-audit.py` already reads every workflow's cadence and alerting. Extend it to assert that each *sold* dataset has a schedule, a timeout, and alerting — so the SLA is machine-checked rather than promised.

That third item matters more than it looks: it makes the existing verification
discipline into a commercial control, and it is perhaps a day's work.

### Deliberately not doing

No Kubernetes, no data warehouse, no dbt, no React rewrite, no CDN contract. At
the volumes this business will see in year one, a 320 KB JSON file served from
static hosting outperforms every one of them and costs nothing.

---

## 4. Commercial and legal mechanics

### Payments

⚠️ **Assumption to check, and it is load-bearing:** Stripe's list of supported
countries for *sellers* has historically not included Egypt. Verify this
directly before designing anything around it, because it decides the stack.

| Option | How it works | Trade-off |
|---|---|---|
| **Paddle or Lemon Squeezy (Merchant of Record)** | They sell to the customer; you are their supplier. They handle global VAT/sales tax, invoices, chargebacks, and pay you out | **Recommended.** ~5% + fixed fee is expensive per transaction and cheap compared to registering for VAT in a dozen jurisdictions as a solo founder. Removes the seller-country problem entirely |
| **Wise Business / Payoneer + manual invoicing** | You invoice, they receive | Fine for 1–5 enterprise deals. Does not scale to self-serve, and puts tax compliance on you |
| **Paymob / Fawry / Kashier** | Domestic Egyptian rails | Necessary for EGP customers, useless for international. Add only when an Egyptian buyer appears |
| **Stripe via a foreign entity** | A UK/US/UAE company | Real cost (formation, accounting, sometimes an audit) and a tax posture you should not adopt before there is revenue to justify it |

**Sequence: MoR from day one, Egyptian rails when an Egyptian customer asks,
foreign entity only past roughly $50k/yr.**

### Pricing in a devaluing currency

`fx-history.json` shows EGP/USD moving from 51.09 to 50.23 across 37 points — a
1.6% swing in under a month, and the multi-year direction has been one way.
Therefore:

- **Price internationally in USD.** The buyers in segment C are international.
- **Publish an EGP price for Egyptian buyers, re-derived annually** from your own `fx-today.json`, with the rate and its date printed beside the price. This is both honest and exactly the kind of thing this site already does everywhere else.
- **Never offer multi-year EGP contracts.** Annual, re-quoted.

### Licensing — what may and may not be resold

This is the section to get right, because it is the one that can produce a
letter from a lawyer.

| Source | Licence (as declared in `site/data/`) | What it permits |
|---|---|---|
| geoBoundaries | CC BY 4.0 | Redistribute and sell, **with attribution**. The site already carries this and `all-pages.js` enforces it |
| World Bank indicators | CC BY 4.0 | Same |
| NASA POWER, SRTM (`visit-climate`, `visit-relief`, `visit-terrain`) | Public domain | Anything, with citation as courtesy |
| **OpenStreetMap via Overpass/OSMnx** (`geo-health`, `geo-schools`, `geo-industry`, `geo-places`, `streets-districts`, `streets-access`) | **ODbL** | **Share-alike.** Distributing a derived database obliges you to offer that derived database under ODbL. You may charge for it; you may not make it exclusive |
| UNESCO (`geo-heritage`) | "used with attribution" | Attribution; treat as reference, not as a saleable dataset |
| **IDSC prices, ExchangeRate-API** | **Not declared** | **Unknown. This is the wedge. Establish it in writing before selling.** |

**Practical rulings:**

1. **Keep the ODbL layers out of the paid product**, or accept publishing the derived database under ODbL. The cleanest line: OSM-derived layers stay free on the site under ODbL with attribution, and are never part of a paid bundle. This costs nothing, because those layers were never the sellable asset.
2. **The paid product is prices, FX, and the knowledge base** — the three things whose rights are either yours or answerable.
3. **Sell the compilation, not the facts.** What a buyer pays for is a maintained, dated, provenance-carrying series with an SLA. Say that in the terms, and the product survives even if an underlying source turns out to be freely redistributable — because they are buying the maintenance.

### The FRA constraint, and what it does to the investor product

Egypt's FRA rules mean the investor layer is **information and education only**.
Concretely, for anything sold:

**Permitted:** where a project is; what a published figure says and who published it; when it was read; what a zone's declared incentives are per the official text; historical prices and rates as recorded.

**Forbidden, in every tier, at every price:** any recommendation to invest or not; any projection, forecast, or expected return; any yield, IRR, or payback figure of your own construction; any ranking that implies "better investment"; any language a reasonable buyer would read as advice.

**Three structural consequences:**

- **Never sell a "recommendation" or "scoring" product**, however much a buyer asks. If a customer wants a ranked shortlist, the deliverable is the underlying figures and their sources, and they do the ranking.
- **Write the disclaimer into the product, not the footer** — into the API response envelope, the CSV header, and the manifest. A disclaimer a machine strips out is not a disclaimer.
- **Put it in the terms of sale**, so the buyer has contractually acknowledged what they are and are not buying. This protects the FRA posture better than any page-level notice.

⚠️ **Assumption to check:** whether selling *data* about investment locations
(as opposed to publishing it freely) changes your FRA classification at all. This
is a question for an Egyptian lawyer, costs a consultation fee, and should
happen before the first investor-adjacent invoice.

---

## 5. Go-to-market — the first hundred

Fact 1 makes the usual arithmetic meaningless. **The first hundred customers are
not converted; they are contacted.** Here is the sequence, with the arithmetic
written where arithmetic applies.

### Stage 1 — the first five (weeks 1–6). Hand-sold.

Build a list of **120 named people**, not companies: category managers and
supply-chain analysts at food importers and FMCG firms operating in Egypt;
commodity desks with MENA coverage; market-entry consultancies with an Egypt
practice; economists at development agencies and embassies' commercial sections.
LinkedIn and company sites give you names in a week.

The email is short and leads with the artefact, not the pitch: *"I've been
recording Egypt's retail and wholesale food prices since July — 132 retail
and 105 wholesale commodities, every figure carrying its source and the date it
was read. Here's a sample CSV. Is this a thing you'd use?"*

| Metric | Assumption | Result |
|---|---|---|
| Emails sent | 120 | |
| Reply rate | 12% (cold, but specific and free) | 14 replies |
| Substantive conversation | 40% of replies | 6 |
| Convert to paid | 50% | **3** |
| Mean deal | Pro/Team mix, one Data pilot | ~$1,200 first-year |

Three customers and about $3,600 is not a business. It is the only thing that
matters at this stage: **proof that anyone pays for this at all**, plus the
sentences they used to describe why — which become the landing page.

### Stage 2 — the next twenty (months 2–5). Content that a buyer searches for.

Now the media asset earns its keep, aimed at segment C rather than segment A:
a monthly **"What Egypt paid for food"** post — the archive's own figures, with
the caveats intact — and a free weekly price email. This is the top of a funnel
that does not currently exist, and it doubles as the product demo.

| Metric | Assumption | Result |
|---|---|---|
| Monthly organic sessions by month 5 | 3,000 | |
| Email signup rate | 3% | 90/mo |
| List by month 5 | | ~350 |
| List → paid | 4% | **14** |

⚠️ Every number in that table is an assumption to check. 3,000 sessions from a
base of 37 is a 80× increase; it is achievable for a niche query nobody else
serves, and it is not achievable by writing generally about Egypt.

### Stage 3 — to a hundred (months 6–12). Two motions in parallel.

- **Citations as distribution.** Every journalist or researcher who cites EgyBI produces a link and a credential. Actively offer segment B free Pro accounts in exchange for citation. This is cheap, on-mission, and compounds.
- **One or two Data-tier deals.** By month 9 the archive is ~14 months deep, which crosses the threshold where a year-on-year comparison is possible — that is the moment the price can go up, and the moment to go back to everyone who said "come back when you have more history."

### The distribution asset nobody else has

Worth naming, because it is unusual and it sells: **the verification suite.**
Thirty-nine mutation-tested checkers, a public changelog that records the times
the tooling was wrong, and a CI run that proves the site's own claims. For a
buyer evaluating whether a one-person data source can be depended on, "here is
the test suite that checks my checkers, and here is the log of every time it
caught me being wrong" is a stronger credential than any logo wall. Put it on
the sales page.

---

## 6. The financial model

### Costs

| Phase | Monthly cost | Notes |
|---|---|---|
| Now | **~$3–8** | Hostinger shared hosting. GitHub Actions free tier. Everything else is free-tier open data |
| Phases 0–1 | **~$10** | Add a domain for the API origin. Fulfilment is manual |
| Phase 2–3 | **~$35–60** | A small VPS or Workers plan for `api.egybi.com`, a managed Postgres or continued SQLite, transactional email |
| Phase 4–5 | **~$120–250** | Object storage for archives, a status page, backups, an accountant |

The infrastructure is nearly free at every stage. **The real cost is founder
hours, and the real constraint is that the verification discipline already
consumes them.** A 35-minute CI sweep, 39 mutation cases and a changelog that
documents its own errors is a part-time job before any customer exists.

### Break-even, and what "leaving the free architecture" costs

Break-even on cash is trivial — roughly **one Pro subscription** covers
infrastructure through Phase 3. The meaningful threshold is different:

> **Do not add accounts, billing or an API until 5 customers have paid by hand.**

Because the moment there are accounts there are password resets, failed
payments, GDPR requests and an uptime expectation — and those consume exactly
the hours that currently go into keeping the data honest. Risk 3 below is what
that trade looks like when it goes wrong.

### Twelve months, with the assumptions exposed

| Month | Pro @$140/yr | Team @$990/yr | Data @$7.5k/yr | ARR | Cash cost | Notes |
|---|---|---|---|---|---|---|
| 1–2 | 0 | 0 | 0 | $0 | $20 | Licence answers; outreach list; sample CSV |
| 3 | 2 | 1 | 0 | $1,270 | $20 | Hand-sold, hand-invoiced |
| 4 | 4 | 1 | 0 | $1,550 | $30 | First content post |
| 6 | 9 | 2 | 0 | $3,240 | $60 | Accounts shipped; self-serve opens |
| 9 | 18 | 4 | 1 | $14,000 | $90 | Archive crosses 12 months — price rises |
| 12 | **32** | **7** | **2** | **$26,410** | $150 | ~$2.2k/mo |

**Assumptions, all arguable and all worth arguing with:**

1. IDSC and ExchangeRate-API permit redistribution, or acceptable terms are reached. *If false, the entire table is zero and the plan reverts to segment B and the knowledge base.*
2. Cold email to a specific, well-chosen list converts at 2–3% to paid. Plausible for a niche nobody serves; optimistic if the list is loose.
3. Traffic grows from 37 visitors/7d to ~3,000 sessions/mo by month 5 — driven entirely by price-data content, not by tourism content.
4. Churn 5%/mo on Pro, near zero on Team and Data. Untested.
5. The founder can sustain ~10 hours/week on commercial work *on top of* maintaining the data discipline. **This is the assumption I trust least.**
6. No competitor starts a rival daily collector in the next 12 months.

At $26k ARR this is a meaningful side business, not a company. **The honest
framing: EgyBI in twelve months is a credible one-person data service, and the
decision about whether it becomes more than that should be taken at month 12
with real numbers, not now with these.**

---

## 7. Risks that actually kill this

Ranked by probability × damage.

| # | Risk | P | Damage | Early-warning signal |
|---|---|---|---|---|
| **1** | **The sourcing discipline becomes unsustainable.** A paying customer asks for a figure that does not exist, or wants a gap filled, or wants a caveat softened because it "looks unprofessional." The discipline is the entire brand, and commercial pressure erodes it one small accommodation at a time. | 0.7 | Fatal | **The first time a caveat is removed for a customer rather than because the underlying uncertainty was resolved.** Write that sentence into the terms of sale so the customer is on notice too |
| **2** | **Founder bandwidth.** The verification suite, the pipelines and the changelog already consume the available hours. Adding support, billing and sales does not add hours. | 0.8 | Severe | Two consecutive weeks where `Verify (browser)` stays red, or a data file's as-of date passes its cadence with nobody noticing. Both are already machine-detectable — wire them to the same alert as CI |
| **3** | **The IDSC/FX licence forbids redistribution.** | 0.35 | Fatal to the wedge | Answerable in writing this week. **Do this before anything else.** Fallback: sell the knowledge base and bespoke analysis to segment B instead |
| **4** | **FRA exposure on the investor product.** A buyer uses your figures to make a recommendation and characterises you as the source of advice. | 0.4 | Severe (regulatory) | Any inbound request phrased as "which zone should we…" or "what return can we…". Treat each one as a signal to tighten the terms, and answer with figures and sources only |
| **5** | **Upstream sources fail.** This is not hypothetical: `build-geo-assets` has been red on **5 of its last 7 runs** from Overpass HTTP 504s, and the pipeline correctly keeps last-good data rather than fabricating. With an SLA attached, "correctly skipped" becomes "missed a delivery." | 0.6 | Moderate–severe | Already visible in the workflow history. Before selling an SLA, define what it promises when a source is down — and promise *notification*, not data |
| **6** | **ODbL contamination.** An OSM-derived layer ends up in a paid bundle, triggering share-alike. | 0.3 | Moderate | A single rule, checkable in CI: no `geo-*` or `streets-*` file may be referenced by a paid export manifest. Add it as a checker |
| **7** | **The free layer cannibalises the paid one.** Everything visible free, exports paid — a determined user scrapes the pages. | 0.4 | Low | Scraping in the access logs. **Accept this.** The people who scrape were never going to pay, and closing the free layer to stop them costs the credibility that makes the paid layer sellable. Price for the buyer who values not having to scrape |
| **8** | **Nobody wants it.** The wedge is simply wrong — the buyers don't exist in reachable numbers. | 0.3 | Fatal to the plan, not the project | 120 emails producing fewer than 5 substantive replies. **Then stop and reconsider, having spent three weeks rather than a year** |

Note the shape: risks 1 and 2 are the top two, and neither is commercial. **The
most likely way this fails is that the business succeeds enough to break the
thing that made it worth buying.**

---

## The three hypotheses, judged

| Hypothesis | The case for | Why it loses (or wins) | Confidence |
|---|---|---|---|
| **Media** — audience, sponsorship, affiliate | The tourism layer serves the largest audience and is the site's best work | **Loses on fact 2.** ~30 real pages and 37 visitors is two orders of magnitude from ad-supportable. It would take a year of writing before the first dollar, and it monetises the segment with the least money | 0.85 it loses *as a revenue line*. It stays as the funnel |
| **Tools** — sell software: embeddable maps, the tile-free stack, a report builder | The zero-call map stack is genuinely good engineering, and the verification suite is rare | **Loses on market.** The buyers for "Egypt maps as a component" are a handful of developers who would rather use Mapbox. The engineering is a *proof*, not a product | 0.75 it loses |
| **Data** — sell the maintained, dated, sourced archive | It is the only asset that compounds, cannot be back-filled, and is bought by people with budgets | **Wins, conditionally.** Conditional on fact 4's licence answer, and on the archive being deep enough — which is a matter of waiting, and the waiting is already happening for free | 0.6 it wins, rising to ~0.8 if the licence answer is favourable |

**The plan in one paragraph:** answer the licence question this week; email 120
named people with a sample CSV and no product; sell three subscriptions by hand;
build accounts only after that; let the archive get deeper while you do; keep
everything currently visible free forever, because the visibility is what makes
the archive worth buying; and re-take this decision in twelve months with real
numbers instead of the assumptions in §6.

---

## What this note deliberately does not claim

- **No market sizing.** I have no verified figure for how many companies buy Egyptian price data. Every conversion number in §5 and §6 is an assumption I have labelled as one, not a finding.
- **No claim about Stripe, Paddle or Paymob's current availability to an Egypt-domiciled seller.** Verify each directly; these change.
- **No legal opinion on FRA classification** for a paid product. That requires an Egyptian lawyer and it is cheap relative to the risk.
- **No traffic projection I can defend.** The 3,000 sessions/month figure is an aspiration derived from nothing but the observation that the niche is unserved.

Consistent with everything else in this vault: the numbers that came from the
repository are cited to the file they came from, and the numbers that came from
judgement are marked as judgement.
