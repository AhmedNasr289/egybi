# Tourism Services Plan

> Selling creative and data services to hotels, DMCs, operators and destination bodies — the aggressive version, written 2026-08-17. Companion to [[SaaS Conversion Plan]], which bets on the price archive; this one bets on delivery work into tourism and argues in §6 about which is right. Back to [[Home]] · see [[The Visitor Layer]], [[Cairo Street Report Card]], [[Places & Data Stories]], [[IP & Content Rules]].

## The assets, measured

Read from `site/data/` on 2026-08-17. These are what gets sold; everything
below is built out of exactly this and nothing imaginary.

| Asset | What is actually in it |
|---|---|
| **Climate normals** (`visit-climate.json`) | **18 named sites** — Giza, Saqqara, Karnak, Valley of the Kings, Abu Simbel, Philae, Abydos, Dendera, Historic Cairo, Alexandria, Siwa, the White Desert, Saint Catherine's, Dahab and four more — monthly means over the closed **2001–2020** window, NASA POWER / MERRA-2, declared as **modelled** rather than observed |
| **Walkability** (`streets-access.json`) | **10 districts**, walk graphs (Downtown Cairo: 1,863 walk nodes), median walking minutes and within-15-minute share to hospital, clinic, school and pharmacy. Downtown Cairo: **74.8%** mean within 15 min; hospital median **9.2 min** |
| **Street form** (`streets-districts.json`) | Per district: area, nodes, edges, intersection density/km², dead-end share %, street density km/km², mean street length — the vocabulary of urban quality, already computed |
| **Gazetteer** (`geo-places.json`) | **873 places: 335 settlements, 116 museums, 29 IATA airports, 393 antiquities** |
| **Relief** (`visit-relief.json`) | **5 transects**: across the valley at Luxor, the Giza plateau edge, Aqaba up to Saint Catherine, Siwa and the depressions, the Nile from Cairo to Abu Simbel |
| **The map stack** | Leaflet with **zero runtime calls to any provider**. No key, no tile bill, no rate limit, no third-party cookie, no vendor who can switch it off |
| **The discipline** | 39 mutation-tested checkers, and caveats written into the data itself — `streets-access.json` says in its own file that *"a low score can mean few facilities or simply few mapped facilities, and the two are impossible to separate from this data alone"* |

That last row is the one most people would delete before showing a client. It
is the product.

---

## 1. Twelve ideas

### ① The House Map
**Mechanism.** A permanent, interactive, co-branded neighbourhood-and-destination map built for one property and installed on the client's own domain as static files.
**Buyer & price.** Boutique hotel, small chain marketing lead. **$2,400 one-off** (EGP 120,000) per property, **$600/yr** optional refresh.
**Unfair advantage.** Zero-vendor. It has no API key to expire, no per-view cost, no rate limit, no vendor account, and it **sets no third-party cookie — so it needs no consent banner**, which is a live problem for any hotel selling to EU guests.
**Website needs.** A `for-hotels.html` page, three live demo maps on fictional-but-labelled properties, a one-page spec sheet.
**3-week test.** Build one on spec for a real Cairo boutique hotel, unasked, and send it to the GM as a working link.
**Most likely failure.** The hotel's web agency sees it as territory and blocks it.

### ② The Heat Calendar
**Mechanism.** The 18 sites × 12 months of normals turned into "what will actually happen to your guests in August at Abu Simbel", as a free public tool and a licensable embed.
**Buyer & price.** Tour operators and DMCs. **Free tool** publicly; **$1,200/yr** (EGP 60,000) for a co-branded embed on the operator's site.
**Unfair advantage.** The data is already fetched, dated, and honestly labelled as modelled. Nobody in Egyptian travel marketing publishes a discouraging month.
**Website needs.** One new page, `climate.html`, built on existing `visit-*` data.
**3-week test.** Ship the free tool. Count inbound emails.
**Most likely failure.** Operators like it and won't pay, because it helps guests more than it helps sales.

### ③ The Fifteen-Minute Report
**Mechanism.** A per-property walkability report: what a guest can reach on foot, in minutes, with the walk graph drawn.
**Buyer & price.** Hotel developers and asset managers doing site selection; brand teams writing "location" copy. **$3,500** (EGP 176,000) per site.
**Unfair advantage.** `streets-access.json` already does this for 10 districts; extending to an arbitrary point is a pipeline parameter, not a new product.
**Website needs.** A public sample report for one real district, and a request form.
**3-week test.** Produce one for a named hotel and send it to the asset manager.
**Most likely failure.** Developers already buy this from JLL/Colliers and want a brand name on the cover.

### ④ The Correction Service
**Mechanism.** Audit a client's published destination content claim by claim, and return every statement that cannot be traced to a named source with a date — plus a corrected version.
**Buyer & price.** Hotel groups and DMCs who have discovered their AI-written content is wrong. **$1,800** (EGP 90,000) per audit of ~30 pages; **$900/mo** retainer.
**Unfair advantage.** This *is* the project's culture, sold. A public changelog recording every time the tooling itself was wrong is a credential no agency has.
**Website needs.** One published audit of a *public* page — ideally a government tourism page — as a demonstration.
**3-week test.** Audit one large operator's Egypt pages, send the first five findings free.
**Most likely failure.** Nobody believes they have a problem until a guest complains publicly.

### ⑤ The Shore Sheet
**Mechanism.** Per-landing feasibility packs for Nile and Red Sea cruise operations: distance, terrain from SRTM, climate normal for the sailing month, what is mapped nearby, and what is *not* mapped.
**Buyer & price.** Cruise lines and Nile-cruise operators. **$6,000** (EGP 302,000) for a route; **$2,000/yr** to keep current.
**Unfair advantage.** The relief transects already cover the Nile from Cairo to Abu Simbel.
**Website needs.** A single worked example for one Nile stop.
**3-week test.** Send the Kom Ombo example to three Nile operators.
**Most likely failure.** Cruise operations are run on relationships and incumbent ground handlers.

### ⑥ The Location Pack for film and stills
**Mechanism.** Scouting packs: terrain profile, sun and heat by month, access, and the honest note on what OSM does and does not show.
**Buyer & price.** Production service companies, stills producers. **$1,500–4,000** per project.
**Unfair advantage.** SRTM relief plus climate normals plus 393 mapped antiquities, already joined.
**Website needs.** A gallery page with two worked location packs.
**3-week test.** Send one to two Cairo production-service houses.
**Most likely failure.** Productions hire a human fixer who knows the permits, and the data is the easy part.

### ⑦ The Room Chart *(the physical object)*
**Mechanism.** A large, beautifully printed, data-drawn map of the property's district — walkable radius, mapped antiquities, the street grid — framed in every room and sold at the desk.
**Buyer & price.** Boutique hotels, riads, Nile cruise cabins. **$3,000** design fee (EGP 151,000) plus per-unit print; hotel resells at $35–60 a copy.
**Unfair advantage.** The geometry is bundled and print-resolution by construction, because it is vector rather than raster tiles. A tile-based map **cannot** be printed at poster size without a licence and a rendering pipeline; this one can.
**Website needs.** Photographs of one printed proof.
**3-week test.** Print one at A1, photograph it in a real room, send to five GMs.
**Most likely failure.** Print, shipping and framing logistics eat the margin and the founder's time.

### ⑧ The F&B Cost Brief
**Mechanism.** The price archive pointed at hospitality: what a buffet's inputs actually cost, month over month, per commodity, with sources and dates.
**Buyer & price.** Hotel F&B directors, restaurant groups, catering companies. **$300/mo** (EGP 15,000) per group.
**Unfair advantage.** 132 retail and 105 wholesale commodities since 2026-07-09 — **35 observation days across 49, 71.4% dense, not daily** (re-read 2026-08-28) — and no back-fill is possible for anyone starting later. **This is the bridge between the two plans** — the same archive, sold to a buyer who is already in the tourism conversation.
**Website needs.** A sample month as a public page.
**3-week test.** Send last month's brief, free, to ten Cairo hotel F&B directors.
**Most likely failure.** Procurement already has supplier quotes and considers this decoration.

### ⑨ The Honest Brochure
**Mechanism.** A white-label scrollytelling destination story, built on the existing story engine, delivered on the client's domain, permanent and dependency-free.
**Buyer & price.** Luxury travel advisors, DMCs, tourism boards. **$8,000–15,000** per story.
**Unfair advantage.** The scrollytelling map engine exists and makes zero external calls, so it will still work in ten years with nobody maintaining it.
**Website needs.** One public flagship story as the portfolio piece — this already exists.
**3-week test.** Pitch one to a luxury DMC with a named story idea about their own signature route.
**Most likely failure.** Agencies do this for more money and with a bigger deck.

### ⑩ The Governorate Dashboard
**Mechanism.** A tourism-authority-facing dashboard of arrivals-adjacent open indicators, heritage inventory and access, updated on a cron.
**Buyer & price.** Governorate tourism authorities, the Ministry, development agencies. **$20,000–60,000/yr**.
**Unfair advantage.** The pipelines and the atlas already exist; the marginal cost of another dashboard is small.
**Website needs.** A public governorate profile page as the demonstration.
**3-week test.** Not testable in three weeks. Procurement is 6–18 months.
**Most likely failure.** Public procurement in Egypt favours incumbents and consortia; a solo supplier struggles to be compliant on paper.

### ⑪ The Rate Card Ledger *(strange)*
**Mechanism.** For a hotel that publishes rates in EGP while its costs or owners think in USD, a monthly record of **what the published rate card was actually worth**, using the 10-currency FX archive — history only, no forecast.
**Buyer & price.** Revenue managers at Egyptian-owned hotels; owners abroad. **$400/mo** (EGP 20,100).
**Unfair advantage.** A dated, sourced FX archive that nobody else is keeping for this purpose.
**Website needs.** A public explainer with one worked historical example.
**3-week test.** Send three months of a worked example to five revenue managers.
**Most likely failure.** Revenue-management systems already do currency, and the value looks obvious in hindsight only.
⚠️ **Guardrail.** Historical figures only. No projection, no expected return, no "you should price at". That line is not negotiable and it is what keeps this an operations tool rather than advice.

### ⑫ The Disappointment Widget *(strange)*
**Mechanism.** A hotel embeds a small, honest widget on its booking page: *this is the climate normal for your travel month at this location, modelled 2001–2020, and here is what that means for a midday visit to the site you are booking.* It talks guests **out** of bad months.
**Buyer & price.** Hotels and operators with high refund and complaint rates in summer. **$1,500 setup + $500/yr**.
**Unfair advantage.** Only a supplier with a sourcing discipline would build a marketing widget whose job is to reduce a booking, and only that supplier would be believed.
**Website needs.** A live demo and a page arguing the economics of a prevented complaint.
**3-week test.** Show it to three GMs and ask what their summer refund rate is.
**Most likely failure.** Nobody in hotel marketing gets promoted for reducing bookings, whatever it does to complaints.

---

## 2. The choice

### Primary bet — ① The House Map, differentiated by ③ and sold on ④'s credibility

Not because it is the most interesting idea here — ⑫ is — but because it is the
one that converts a solo technical founder's actual strengths into cash inside
90 days. It is a **delivered artefact at a defensible price with no recurring
obligation**, which is exactly what someone with limited hours and no capital
can carry.

What makes it not-just-another-map, and both of these go in the sales page:

- **It cannot be switched off or metered.** Every competing embed depends on a vendor's key, a monthly bill and a rate limit. Google's Maps pricing has been repriced under hotels before; a map with no vendor cannot be.
- **It sets no third-party cookie**, so it needs no consent gate on an EU-facing booking site. ⚠️ *Assumption to check: how much hotel marketing teams actually weigh this. It is a strong technical claim and an untested commercial one.*

### Cheap parallel — ② The Heat Calendar, free and public

Because with 37 visitors, the site must do the prospecting. A genuinely useful
free tool that tells an operator something true and unwelcome about August is
the cheapest lead generator available, costs one page built on data already
fetched, and demonstrates the discipline without a word of pitch.

### Why the two strongest runners-up lose

**⑨ The Honest Brochure** is the highest-value idea per unit of work and the
best fit for the existing scrollytelling engine — and it loses on **sales
cycle and credibility asymmetry**. A $12,000 content commission from a DMC is
an agency-scale decision made by committee, and a supplier with no portfolio and
37 visitors will not win it in 2026. It becomes the right product at customer
five, sold to someone who already bought a House Map.

**④ The Correction Service** is the most *distinctive* thing on this list and I
nearly picked it. It loses on **problem awareness**. Selling an audit requires
the buyer to already believe their content is wrong; most do not, and the sales
motion is therefore education, which is slow and unpaid. Keep it as an *upsell*
after a House Map, when you are already inside and can point at three specific
errors on their own site — at which point it sells itself.

### Where the wild idea genuinely wins

**⑫ The Disappointment Widget is a better *marketing asset* than a product.**
Build it, give it away, and write about it. A supplier who publicly ships a
widget designed to lose the client a booking is making an argument about
trustworthiness that no case study can make. Its commercial value is what it
does to ①'s close rate, not its own price.

---

## 3. What gets built on egybi.com

### New, public — these do the selling

| Build | What it does | Data | Effort |
|---|---|---|---|
| **`climate.html` — "When to go, honestly"** | The 18 sites × 12 months, as a "what will it be like" tool. Every reading labelled *modelled, 2001–2020, NASA POWER* | `visit-climate.json` — exists | **2 days** |
| **`walk.html` — "The Fifteen-Minute Check"** *(the free tool that prospects)* | Drop a pin anywhere in the 10 covered districts and get the walk-graph answer: median minutes and within-15-min share to hospital, clinic, school, pharmacy, with the OSM-incompleteness caveat printed **on the result, not in a footnote** | `streets-access.json` + walk graph — exists for 10 districts | **4 days** |
| **`for-hotels.html`** | The offer: three live demo maps, the spec sheet, prices, and a plain statement of what is and is not measured | — | **2 days** |
| **The Disappointment Widget demo** | Embeddable, one file, on the `for-hotels` page | `visit-climate.json` | **2 days** |
| **One public audit** | ④ demonstrated on a real public page, published with the methodology | — | **3 days** |

### Repurposed rather than rebuilt

The scrollytelling engine becomes the Honest Brochure template. `mapkit.js`
becomes the House Map build target. The gazetteer's 873 places become every
map's point layer. `streets-districts.json`'s street-form metrics become the
Fifteen-Minute Report's second page. **Nothing in the list above is a new
pipeline** — it is all presentation over data already on the site, which is why
the whole build is about three weeks of evenings.

### Gated

Almost nothing. The reports are delivered to clients as files rather than
locked behind a login, because a login is infrastructure and this business does
not need it until there are ten recurring clients. **Defer accounts, billing and
any API indefinitely** — services are invoiced, not subscribed to.

### Build order

`walk.html` → `climate.html` → `for-hotels.html` → the widget → the audit. The
free tool first, because it is the only item that generates leads while the rest
is being built.

---

## 4. Commercially real

### Prices

EGP at **50.27/USD**, the rate in `fx-history.json` on 2026-08-16, re-quoted per
invoice rather than pegged.

| Product | Type | USD | EGP |
|---|---|---|---|
| House Map, single property | One-off project | **$2,400** | 120,600 |
| House Map, 3+ properties | One-off, per property | **$1,800** | 90,500 |
| Annual refresh | Licence + refresh | **$600/yr** | 30,200 |
| Fifteen-Minute Report | One-off | **$3,500** | 176,000 |
| Content audit, ~30 pages | One-off | **$1,800** | 90,500 |
| Content retainer | Retainer | **$900/mo** | 45,200 |
| Heat Calendar co-branded embed | Licence | **$1,200/yr** | 60,300 |
| F&B Cost Brief | Subscription | **$300/mo** | 15,100 |
| Honest Brochure | Project | **$8,000–15,000** | 402,000–754,000 |

**Price on the artefact, never on the hour.** The zero-marginal-cost map is
worth what it saves and signals, not what it took to build — and hourly pricing
punishes exactly the efficiency that is this project's advantage.

### Getting paid

**International hotel group or chain.** They pay a supplier invoice by bank
transfer. Practically: **Wise Business** or **Payoneer** to receive USD/EUR,
invoice in USD with 50% on commission and 50% on delivery. Expect to be asked
for a tax form and a company name — a sole-proprietor registration in Egypt is
usually enough for a services invoice. ⚠️ *Assumptions to check: current Wise
and Payoneer availability to Egypt-registered businesses, and whether the buyer
requires a VAT-registered supplier.*

**Local Egyptian operator.** Local bank transfer or Instapay, in EGP.
**Quote in USD, settle EGP at the spot rate on the invoice date, and say so in
the quote.** Never fix an EGP price for work delivered in 60 days — the FX
archive shows 51.09 → 50.27 inside 26 days, and the multi-year direction has
been one way. For retainers, re-quote quarterly.

**Do not** set up Paddle or Lemon Squeezy for this. Merchant-of-record processors
are built for self-serve software; a services business with five clients wants
invoices, not a checkout.

### The first 90 days

| When | Do |
|---|---|
| **This week** | Build `walk.html`. Then build one **unrequested House Map** for a real, named Cairo or Luxor boutique hotel — a property you would be proud to have as a first logo — and send it to its **General Manager and Director of Sales & Marketing** as a live link with one sentence: *"I built this for your property. It costs you nothing to keep. Here's how it was made and what it does not claim."* |
| Week 2–3 | Ship `climate.html` and `for-hotels.html`. Send the spec House Map to nine more properties — same tier, same city |
| Week 4–6 | Close the first paid one. Build it properly. Photograph it. It becomes the portfolio |
| Week 6–8 | Publish the free Fifteen-Minute Check and the public audit. Send both to the same list, plus 20 DMCs |
| Week 8–10 | Ship the Disappointment Widget and write the piece about why it exists. This is the credibility artefact |
| Week 10–13 | First Fifteen-Minute Report sold to a developer or asset manager. First F&B brief to a hotel group. Re-quote the whole price list against reality |

**Target at day 90: three paid House Maps and one larger engagement — roughly
$9,000–12,000.** That is a real income in Egypt and it is earned without
accounts, billing, an API or a single subscriber.

### The exact first email, and who gets it

**To:** the GM, cc the Director of Sales & Marketing, of one named boutique
property. Not `info@`. Find the names on LinkedIn.
**Subject:** the property's name and the word *map*.
**Body:** the live link first, three sentences, no deck, no attachment, and one
line stating what the map does not know — because that sentence is the entire
differentiator and it belongs in the first contact, not the third.

---

## 5. Distribution without an audience

**1. Build it before they ask.** Ten unrequested House Maps cost ten evenings and
convert far better than any pitch, because the buyer is evaluating the thing
itself rather than a promise. This is the whole strategy and it works precisely
because the marginal cost of a map here is zero.

**2. Go where hotel marketers already are.** HSMAI and Skål chapters, the Egyptian
Hotel Association, and the trade press — *Hospitality Net*, *Skift*, *Hotelier
Middle East*. A short, specific, data-backed piece about Egyptian hotels'
walkability or August heat is publishable, and it reaches buyers who will never
find egybi.com.

**3. Sell through the web agencies, not around them.** Failure mode ① names the
agency as the blocker. Invert it: offer agencies a white-label House Map at
$1,200 they resell at $3,000. They have the client relationships you lack, and
they would rather resell than build a Leaflet map from scratch.

**4. The unconventional one — the framed proof.** Print the Room Chart (⑦) at A1,
frame it properly, and **hand-deliver it to the GM of one hotel you want as a
reference client**, with the QR code on the mount pointing at their live House
Map. A physical object left in a GM's office does something no email does: it
stays. It costs perhaps $80 and one afternoon, and it makes you the person who
turned up with a beautiful thing rather than the tenth cold email that week.

---

## 6. The strongest case that this is wrong

**The argument.** Services are a job, not a business. Every dollar of House Map
revenue is bought with founder hours that do not compound, and at $2,400 a
property the ceiling is roughly what one person can build — call it 40 maps a
year, $70k, at 100% utilisation with no time left for the pipelines, the
verification suite, or the encyclopaedia that made any of this credible. Worse,
services actively destroy the asset: hours spent on a hotel's neighbourhood map
are hours not spent on the price archive, which is the one thing here that
grows in value while you sleep and that a later competitor can never catch up
on. The [[SaaS Conversion Plan]] bets on an asset; this bets on labour. In three
years the archive is a four-year time series nobody else has, and the services
business is still exactly one founder wide. And tourism is the worst possible
sector for it: seasonal, margin-poor, relationship-driven, and violently
sensitive to shocks — a single security incident or currency event and every
hotel marketing budget in the country is frozen in a week.

**The answer, honestly.** All of that is true, and none of it argues for doing
the other plan *instead* — because the archive costs **nothing to keep growing**.
The crons run whether or not a single hour is spent on them. The real choice is
not "services or data"; it is "what pays for the next twelve months while the
archive gets deep enough to sell." Services do; the archive cannot yet, because
26 days of history is not a product.

Two things make the services plan a better bridge than it looks. Idea ⑧ **is**
the archive, sold to a tourism buyer — so the services motion is a distribution
channel for the data business rather than a detour from it. And every House Map
client is a named reference for the data product later.

The concession worth making in writing: **cap it.** If services revenue passes
roughly $40k/yr and the archive still has no paying customer, the ceiling
argument has won and the plan should be reversed deliberately rather than by
drift. Put that number in the calendar.

**And the concrete reason to reject the primary bet:** if the first ten
unrequested House Maps produce zero replies, the problem is not the pitch — it
is that hotels do not experience "our map depends on a vendor" as a problem at
all, and no amount of technical elegance creates a buyer for a solution to a
non-problem. Ten evenings is what it costs to find that out, and it is worth
spending precisely because the answer is unambiguous either way.

---

## What is asserted and what is assumed

**From the repository, verifiable:** the 18 climate sites and their 2001–2020
window; the 10 districts and Downtown Cairo's 74.8% and 9.2-minute figures;
873 places split 335/116/29/393; the 5 relief transects; the zero-provider map
behaviour; 50.27 EGP/USD on 2026-08-16 and the 51.09 reading 26 days earlier;
37 visitors in the last recorded 7-day window.

**Assumptions to check before acting:** what hotels actually pay for mapping and
content; whether cookie-consent avoidance moves a hotel marketer; how DMCs and
cruise lines procure; Wise and Payoneer availability to Egypt-registered
businesses; whether a sole-proprietor invoice satisfies an international chain's
supplier onboarding; and every price in §4, which is judgement rather than
observed market data.

**Non-negotiable in every deliverable:** each figure ships with its source and
the date it was read; OSM-derived counts are described as what has been mapped,
never as what exists; and nothing touching investment carries a recommendation,
projection or expected return.
