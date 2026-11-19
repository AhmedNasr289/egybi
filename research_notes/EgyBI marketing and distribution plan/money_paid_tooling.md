# Money, Paid Tests and Tooling for EgyBI (solo, Egypt-resident) — research notes, 19 Nov 2026

Research method note: all findings come from web search results gathered on 2026-11-19. Direct page fetches were blocked in this session's network (docs.lemonsqueezy.com, gumroad.com and support.travelpayouts.com failed to resolve), so most claims come from search-result summaries of official pages or from secondary blogs. Every row marked "UNCONFIRMED for Egypt" must be checked in the platform's signup or payout screen before launch. Many affiliate and benchmark figures come from affiliate or vendor blogs that have a commercial interest, so treat them as directional.

## 1. Payments: how an Egypt resident can sell a $12 PDF and a $49 email service and get paid

### Takeaway
Stripe is still not available to Egypt-based businesses, so any tool that pays out only through Stripe is out. The most workable options are: (a) **Payhip** with PayPal and/or **PayTabs Egypt** connected, (b) **Gumroad**, a merchant of record that pays out by PayPal or bank where supported (Egypt UNCONFIRMED), and (c) **Etsy**, which officially supports Egypt sellers through Payoneer. **Lemon Squeezy** is now a risky choice: reports say sign-ups closed on 16 Nov 2026 as it moves to Stripe Managed Payments (unverified). Use **InstaPay or Paymob** links only for local EGP buyers.

### Cited Findings
**Stripe**
- Stripe is not natively available to Egypt-based businesses. The usual workaround is a foreign company (UK LLP/Ltd or US LLC plus a US bank), sold through third-party formation services. No official Stripe page was found in the results that says otherwise. — [Incorpuk](https://incorpuk.com/blog/open-stripe-account-in-egypt/); [doola](https://www.doola.com/stripe-guide/how-to-open-a-stripe-account-in-egypt/); [Osome](https://osome.com/uk/blog/stripe-verified-business-egypt); [Stripe availability page](https://stripe.com/en-ro/money-management/availability)
- Storeleads counts about 95 Egyptian e-commerce stores with Stripe installed (2026). This most likely reflects foreign-entity accounts, not native Egyptian accounts. — [Storeleads](https://storeleads.app/reports/technology/Stripe/country/EG)

**PayPal (Egypt)**
- PayPal's official Egypt page says that to receive payments you link an Egypt-issued Visa card or a US bank account. The balance is swept to that card or account monthly, or you can withdraw on demand. — [PayPal Egypt: set up to receive and withdraw](https://www.paypal.com/eg/webapps/mpp/setup-to-receive-withdraw)
- A secondary source says PayPal's Arabic pages list local-bank withdrawals taking up to 7 business days with a 125 EGP fee per withdrawal. Other blogs and community threads say withdrawing to an Egyptian bank account is not possible, and users report problems with Egyptian debit cards. — [lilachbullock](https://www.lilachbullock.com/paypal-in-egypt/); contradicted by [PayPal Community](https://www.paypal-community.com/t5/My-Money/Egypt-and-Paypal/m-p/1546600) and [Wise blog](https://wise.com/gb/blog/can-you-use-paypal-in-egypt)

**Payhip (+ PayTabs / PayPal)**
- Payhip lists PayTabs as a gateway for sellers in the UAE, Saudi Arabia, **Egypt**, Oman, Jordan, Iraq and Kuwait. — [Payhip blog: 11 new gateways](https://payhip.com/blog/new-feature-payhip-integrates-with-11-new-payment-gateways/)
- PayTabs is connected under Payment Details. Payhip's default currency must match the PayTabs account currency. Each sale's funds go straight to the seller, and Payhip bills its own fee to the seller's card monthly. — [Payhip Help: Connect PayTabs](https://help.payhip.com/article/372-connect-your-paytabs-account)
- PayTabs Egypt advertises settlement that can be scheduled daily, weekly, monthly or yearly. In April 2025, Mastercard announced a partnership with PayTabs aimed at Egyptian SMEs. — [PayTabs Egypt](https://site.paytabs.com/en/egypt); [Mastercard press release, Apr 2025](https://www.mastercard.com/news/eemea/en/newsroom/press-releases/en/2025-1/april/mastercard-and-paytabs-collaborate-to-empower-egypt-s-small-and-medium-enterprises-through-private-labelled-digital-payment-solutions)
- Payhip pricing as reported: Free plan with 5% transaction fee plus processing; Plus $29/mo with 2% (one source disagrees); Pro $99/mo with 0%. Payhip collects and remits EU and UK VAT on all plans. Other taxes, such as US sales tax, are reportedly left to the seller. — [Fungies Payhip review 2026](https://fungies.io/payhip-review-2026) (a competitor's blog); [latuos](https://latuos.com/payhip-vs-gumroad/)

**Gumroad**
- Gumroad is reported to charge 10% + $0.50 per direct sale with no monthly fee. It has acted as merchant of record for VAT and sales tax worldwide since 1 Jan 2025. — [Fungies comparison](https://fungies.io/sellfy-vs-payhip-vs-gumroad-2026); [fastlancer](https://www.fastlancer.org/en/fastlancer-blog/best-platform-to-sell-digital-products/)
- Gumroad does **not** pay out through Payoneer, Wise, wire or cheque. Payouts go by direct bank deposit in supported countries, or by PayPal in USD (1–3 business days). If neither is available in your country, Gumroad cannot pay you. — [Gumroad Help: Payoneer and Gumroad](https://gumroad.com/help/article/223-payoneer-and-gumroad); [Gumroad Help: Getting paid](https://gumroad.com/help/article/13-getting-paid)
- Whether Egypt is on Gumroad's bank-deposit list is **UNCONFIRMED**. The page could not be fetched. Gumroad payouts would probably have to go through PayPal Egypt.

**Lemon Squeezy**
- Lemon Squeezy says it supports PayPal payouts in 200+ countries and bank payouts in 79. Egypt's bank-payout status is **UNCONFIRMED**. — [LS supported countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries); [LS blog: bank payouts to 79 countries](https://lemonsqueezy.com/blog/new-bank-payouts)
- A third-party tool page is headlined "Lemon Squeezy shuts down on March 31, 2027. Sign-ups closed on November 16, 2026." This is **unverified** and comes from a single source. Other blogs describe a migration to Stripe Managed Payments, with fees reported anywhere from 5% + 50¢ to 6.4% + 30¢ (conflicting). Stripe Managed Payments reportedly lacks LS features such as digital download delivery and affiliate tools. — [Checkoutpage LS fee calculator](https://checkoutpage.com/tools/lemon-squeezy-fee-calculator); [Dodo Payments LS review 2026](https://dodopayments.com/blogs/lemonsqueezy-review); [passive-income-tools](https://passive-income-tools.pages.dev/blog/lemon-squeezy-stripe-managed-payments-2026)

**Paddle**
- Paddle's supported-countries table includes Egypt (EG, USD, tax-inclusive) and its API lists EG as a country it sells to. Paddle acts as merchant of record and calculates, collects and remits tax. — [Paddle supported countries](https://developer.paddle.com/concepts/sell/supported-countries-locales); [Paddle: which countries are supported](https://www.paddle.com/help/start/account-verification/which-countries-are-supported-by-paddle)
- The quoted Paddle wording is that it works with "software businesses anywhere in the world" except sanctioned countries. — [Paddle help](https://www.paddle.com/help/start/account-verification/which-countries-are-supported-by-paddle)

**Etsy**
- Egypt is on Etsy's eligible-countries list with an asterisk, meaning sellers there must use a Payoneer Payment Account to receive Etsy Payments. Enrolment is mandatory, and shops are suspended until the seller enrols. Payoneer can then withdraw to a local bank, possibly for a fee. — [Etsy Help: Countries eligible for Etsy Payments](https://help.etsy.com/hc/articles/115015710408); [Etsy Help: Payoneer with Etsy Payments](https://help.etsy.com/hc/articles/16999319005207)
- One source puts the Etsy payment-processing fee for an Egypt bank account at 6.5% + $0.30. This is secondary and not confirmed from Etsy's table. — [lilachbullock: sell on Etsy from Egypt](https://www.lilachbullock.com/sell-on-etsy-from-egypt/); [Etsy Payments policy](https://www.etsy.com/legal/etsy-payments/)

**Local (EGP): Paymob, InstaPay**
- Paymob has payment links you can share in chat apps without a website. One Paymob-branded page lists 2.75% + 3 EGP per successful card charge (its domain could not be verified as official). — [Paymob payment link](https://www.paymobsolutions.com/en/payment-link); [Paymob online payment](https://www.paymobsolutions.com/en/online-payment)
- InstaPay has charged 0.1% per transaction since April 2025 (minimum EGP 0.50, maximum EGP 20). It is for individual customers only. A 2026 update added shareable payment links that auto-fill the beneficiary. — [Business Today Egypt](https://www.businesstodayegypt.com/amp/1/6185/InstaPay-to-Introduce-New-Fee-Structure-Starting-April-2025); [Alex Bank InstaPay](https://alexbank.com/en/retail/instapay.html); [Egyptian Streets, Jan 2026](https://egyptianstreets.com/2026/01/04/inside-egypts-instapay-economy-how-instant-payments-are-changing-access-for-a-new-generation/)

### Inferences
- **Recommended setup for the $12 dossier: Payhip Free.** Connect PayPal Egypt for international cards and PayPal buyers, and PayTabs Egypt as the card gateway. Payhip's EU/UK VAT handling covers the most important tax exposure for a European audience. Before going live, confirm that Payhip's VAT collection still applies when checkout goes through PayTabs, since that was not confirmed. All-in cost per $12 sale is roughly $0.60 to Payhip plus about $0.70–1.00 in PayPal or PayTabs processing. This is an estimate: PayTabs Egypt card rates were not found.
- **Fallback: Gumroad**, if Payhip/PayTabs onboarding stalls. It is a true merchant of record and needs only a PayPal account that can withdraw. The cost is about $1.70 per $12 sale (10% + $0.50).
- **Etsy is a secondary storefront for discovery, not the main checkout.** Etsy fees plus Payoneer fees eat into a $12 price, but Etsy's marketplace search for "Egypt itinerary printable" can bring buyers.
- **Paddle is probably unsuitable** despite listing Egypt. Its own wording targets "software businesses", and a PDF travel pack and a human itinerary review are unlikely to pass its product review. Ask Paddle sales before applying.
- **Lemon Squeezy: avoid.** It may already be closed to new sign-ups, and its successor (Stripe Managed Payments) runs on Stripe, which Egypt residents cannot use natively.
- **For the $49 itinerary check,** a PayPal invoice or a Payhip "service/digital" listing works. Use InstaPay or Paymob only for Egyptian expats or residents paying in EGP.
- **Tax:** Egypt's own income-tax and VAT obligations for an individual earning foreign digital revenue are outside this research. A merchant of record (Gumroad, Etsy) or VAT-collecting platform (Payhip, for EU/UK) covers buyer-side consumption tax only.

### Gaps
- Whether Egypt is on the bank-payout lists of Gumroad or Lemon Squeezy (pages not fetchable).
- PayTabs Egypt merchant fees and whether an individual (non-company) can open a PayTabs account. PayTabs normally asks for a commercial registration (not verified).
- PayPal Egypt withdrawal fees in 2026 from an official PayPal page (only a secondary report of 125 EGP).
- Official confirmation of the Lemon Squeezy sign-up closure and shutdown date.
- Egyptian tax treatment of a sole individual's foreign digital-product income.

## 2. Affiliate programmes relevant to Egypt travellers that pay Egypt residents

### Takeaway
**Travelpayouts** is the practical hub. One account covers GetYourGuide, Viator, Klook, Tiqets, eSIMs, insurance and transfers, and it pays by PayPal ($50 minimum), bank transfer to a USD or EUR account ($/€400 minimum) or WebMoney. Methods depend on country of residence, and Egypt's specific options are UNCONFIRMED. Booking.com now goes only through CJ, at about 4%. Commissions on tours run about 8% (GYG) and 8–10% (Viator). **SafetyWing** pays 10% recurring by PayPal.

### Cited Findings
- Travelpayouts payout methods are bank transfer to a USD/EUR foreign-currency account (minimum 400), PayPal (minimum $50) and WebMoney (minimum $10). Availability depends on country of residence, which is selected under Finance → Payout methods. The chosen method sets the earnings currency. No Egypt-specific list was found. — [Travelpayouts Help: How can I receive payout](https://support.travelpayouts.com/hc/en-us/articles/206635007-How-can-I-receive-payout-/)
- GetYourGuide: 8% of completed bookings is the headline rate in most sources. Network listings differ (Awin profile, Tradedoubler US 5%, CJ 7%, FlexOffers RO 4%). The Travelpayouts listing says 8–10%, with up to 10% on GYG Originals. The cookie is 30 days. PayPal payouts have no minimum, and bank payouts need $/€50. — [Travelpayouts GYG offer](https://travelpayouts.com/en/offers/getyourguide-affiliate-program); [Awin GYG profile](https://ui.awin.com/merchant-profile/18925); [Tradedoubler GYG US](https://directory.tradedoubler.com/en/programs/362232-getyourguide-US); [Referly](https://www.referly.so/affiliate-programs/getyourguide)
- Viator: 10% with a 30-day cookie for content creators via Travelpayouts. Another roundup says 8% and weekly payouts. — [Travelpayouts best affiliate programs](https://www.travelpayouts.com/blog/best-affiliate-programs-for-travel-sites/amp/); [affililist](https://www.affililist.com/blog/affiliate-programs-for-travel-bloggers)
- Klook: 2–5% reported. Available through Travelpayouts and Klook's own portal. — [UpPromote Klook](https://uppromote.com/affiliate-program-directory/klook/); [track360 tours guide 2026](https://track360.io/blog/tours-activities-experiences-affiliate-programs-operator-guide-2026)
- SafetyWing: 10% recurring on subscriptions, 365-day cookie, PayPal payout with a $10 threshold. — [affilimate](https://affilimate.io/blog/travel-affiliate-programs/); [HostAdvice](https://hostadvice.com/blog/monetization/affiliate-marketing/best-travel-affiliate-programs/)
- Booking.com: since June 2025 its direct affiliate programme is closed and applicants go through CJ, which lists 4% on completed stays. Payouts come monthly, 30–60 days after checkout, with a €100 minimum. The cookie is short (2–7 days, sources differ). — [track360 Booking teardown 2026](https://track360.io/blog/booking-com-affiliate-partner-program-operator-teardown-2026); [FlexOffers Booking](https://flexoffers.com/affiliate-programs/booking-com-affiliate-program); [Travelpayouts Booking offer](https://www.travelpayouts.com/en/offers/bookingcom-affiliate-program)
- Airalo: listed as a Travelpayouts programme (via a site's disclosure), but no rate was found. — [findertrip disclosure](https://findertrip.pages.dev/affiliate-disclosure/)

### Inferences
- **Start with Travelpayouts**, and do not apply to six programmes separately. After signing up, check the Finance → Payout methods screen with Egypt as country of residence. That is the definitive eligibility test, and it takes five minutes.
- **Choose PayPal as the payout method** ($50 threshold, low compared with $400 for bank transfer) if PayPal Egypt withdrawals work for the owner. Otherwise use a USD account at an Egyptian bank and accept the $400 threshold.
- **Priority for an Egypt companion site:** GYG and Viator (Giza, Luxor, Nile day tours) > eSIM (Airalo/Saily/Holafly) > SafetyWing (recurring) > transfers (Welcome Pickups/Kiwitaxi via Travelpayouts) > Booking via CJ (low rate, short cookie, €100 minimum).
- **CJ (for Booking.com) and Awin (for GYG direct) need their own country-eligibility checks.** Awin historically restricts publisher payouts in some countries (not verified for Egypt here).

### Gaps
- Confirmation that Travelpayouts accepts Egypt residents and which methods it offers them (help page not fetchable).
- Commission rates for Tiqets, Airalo, Holafly, Saily, World Nomads, Agoda, Hotels.com, 12Go and Welcome Pickups. No reliable figures were found in this session.
- Whether Awin and CJ accept Egypt-resident publishers and how they pay them.

## 3. Paid ads: does a $50–300 test make sense, and what does it cost?

### Takeaway
A $100–300 test can teach which message and creative earn a click or an email sign-up. It cannot prove ROAS on a $12 product. Travel CPCs are among the cheapest verticals: about $2–3 on Google Search, roughly $0.55–1.90 on Meta depending on country, and roughly $0.10–1.50 on Reddit. On Meta, use a single campaign optimised for leads or landing-page views rather than "Boost". Telegram channel placements in RU are cheap per 1,000 views but quality varies.

### Cited Findings
- Meta CPC for Travel & Hospitality averaged $1.88 in 2025 (Vaizle). Superads shows Recreation & Travel CPC at $0.71 in Canada versus a $1.11 global average, and about $0.55 in India (Jul 2026). — [Vaizle](https://insights.vaizle.com/facebook-ad-benchmarks/); [Superads Canada CPC](https://www.superads.ai/facebook-ads-costs/cpc-cost-per-click/recreation-and-travel/canada); [Superads India CPC](https://www.superads.ai/facebook-ads-costs/cpc-cost-per-click/recreation-and-travel/india)
- Meta Recreation & Travel CPM rose from about $11.63 (Jul 2025) to about $14.88 (Jul 2026). Triple Whale reports Meta CPMs across all industries up 13.24% from Aug 2025 to Jul 2026. — [Superads CPM](https://www.superads.ai/facebook-ads-costs/cpm-cost-per-mille/recreation-and-travel); [Triple Whale](https://triplewhale.com/blog/facebook-ads-benchmarks)
- Meta CTR for Recreation & Travel: US 1.98%, Italy 1.88% (Oct 2024–Sep 2025), against a cross-industry average of about 0.9–1.1%. LocaliQ's all-industry CTR for traffic campaigns is 1.71%. — [Superads US CTR](https://www.superads.ai/facebook-ads-costs/ctr-click-through-rate/recreation-and-travel/united-states); [LocaliQ Facebook benchmarks](https://localiq.com/blog/facebook-advertising-benchmarks/)
- Google Search 2025 (WordStream/LocaliQ, about 16k campaigns): average CPC rose from $4.66 to $5.42, conversion rate 7.52–8.18% (editions differ), CTR 6.66%. Travel & Hospitality is among the cheapest verticals at about $2–3 CPC. One unverified table gives a 5.75% travel conversion rate. — [Search Engine Land](https://searchengineland.com/google-ads-costs-rising-but-conversion-rates-improved-in-2025-477927); [Shopifreaks](https://www.shopifreaks.com/google-ads-cpcs-rose-to-5-42-in-2025-with-87-of-industries-seeing-increases-but-conversion-rates-climbed-to-8-18-as-automation-improves/); [twominutereports](https://twominutereports.com/google-ads-benchmarks); [Segwise](https://segwise.ai/blog/google-ads-benchmarks-industry-insights)
- Reddit: self-serve minimum about $5/day. Reddit's "Max" campaigns (Jan 2026) reportedly need $20/day. Consumer CPC is about $0.10–0.80 (other sources say $0.20–1.50, or a $0.59 average). Reddit advises an ad-group daily budget of at least 3× target CPA. — [Stackmatix minimum spend](https://www.stackmatix.com/blog/reddit-ads-minimum-spend); [Stackmatix cost 2026](https://stackmatix.com/blog/reddit-ads-cost-guide-2026); [benly.ai](https://benly.ai/learn/reddit-ads/reddit-ads-cost-benchmarks)
- Telegram (RU market): adsgram puts paid posts in channels at about ₽100–300 per 1,000 views for entertainment, ₽200–500 for news, ₽300–800 for niche/business and ₽1,000–2,000 for premium. RichAds says roughly $1 CPM for news and $10 for IT/business. Official Telegram Ads run in public channels with 1,000+ subscribers. Minimum bids and budgets conflict (€2 CPM floor; resellers about $100/day; agencies from $1,500). — [adsgram](https://adsgram.ai/blog/adsgram/reklama-v-telegram-kanalakh); [RichAds 2026](https://richads.com/blog/telegram-ads-pricing-how-much-do-they-cost/); [smmplanner 2026](https://smmplanner.com/blog/skolko-stoit-rieklama-v-tielieghramie/amp/); [getuniq](https://getuniq.me/en/networks/telegram-ads)

### Inferences
- **What the money buys:** at about $1–2 per Meta click into UK/US/DE audiences, $150 buys roughly 75–150 clicks. At a 20–30% landing-page email opt-in rate, that is about 15–45 emails. At a 1–3% list-to-purchase rate, it is near zero sales of the $12 pack. So the test should measure **CPC, opt-in rate and cost per email**, not sales. The "learning" target is about 100+ link clicks per creative variant.
- **Geography:** Gulf and RU audiences generally have lower CPMs than UK/US/DE. RU audiences are not reachable through Meta from inside Russia and are better served by Telegram channel posts or VK. Paying for ads in Russia also raises sanctions and payment problems for an Egypt resident (not researched).
- **Suggested $150 test:** Meta, $10/day for 15 days, 3 creatives (Reels made in Higgsfield/CapCut). Objective: Leads or Landing-page views. UK + DE + US, ages 30–60, interests "Egypt travel / Nile cruise". If RU is a target, add one Telegram travel-channel post (~$20–60) as a separate test. Skip Google Search: the $2–3 CPC on high-intent terms is outcompeted by OTAs.
- **Boost vs campaign:** a "Boost" optimises for engagement by default. An Ads Manager campaign lets you choose the conversion goal and place a Pixel or Conversions API event. Use Ads Manager (via Higgsfield's Meta Ads connection or directly).

### Gaps
- No reliable 2025–2026 Pinterest or TikTok travel CPC/CPM benchmarks were found in this session.
- Gulf-specific (UAE/KSA) travel CPMs on Meta.
- Official Telegram Ads minimums for 2026 (sources conflict).

## 4. Funnel and measurement setup

### Takeaway
Travel is a low-click email vertical (about 30% open, about 1.7% click per MailerLite 2025). The funnel needs a strong lead magnet (for example a free "Egypt 7-day itinerary" or a "scam-avoidance checklist") and a short welcome sequence that sells the $12 pack. Use UTMs on every link and a cookieless analytics tool so no consent banner is needed.

### Cited Findings
- MailerLite 2025: travel & transportation open rate 30.10%, click rate 1.68%, which it calls one of the lowest-performing industries. — [MailerLite benchmarks](https://mailerlite.com/blog/compare-your-email-performance-metrics-industry-benchmarks)
- A NeverBounce roundup of Mailchimp data gives a 33.25% travel open rate (the table is garbled). Mailchimp's public benchmark page was last updated Dec 2023. — [NeverBounce](https://www.neverbounce.com/blog/2025-email-benchmark-report); [Mailchimp benchmarks](https://mailchimp.com/resources/email-marketing-benchmarks/?afsrc=1)
- Google Search average conversion rate in 2025 was about 7.5–8.2% (all industries), which is a ceiling reference for paid landing pages. — [Search Engine Land](https://searchengineland.com/google-ads-costs-rising-but-conversion-rates-improved-in-2025-477927)

### Inferences
- **UTM convention** (lowercase, hyphenated): `utm_source` = platform (pinterest, instagram, tiktok, reddit, telegram, newsletter), `utm_medium` = social | paid-social | email | affiliate | referral, `utm_campaign` = `2026-12-dossier-launch`, `utm_content` = creative ID (for example `pin-luxor-01`). Keep a Google Sheet as the UTM builder and log.
- **Analytics:** a cookieless first-party tool (for example Plausible, Umami or Cloudflare Web Analytics) avoids a consent banner for EU visitors. Track goals: email sign-up, dossier checkout click, purchase (via a Payhip "thank you" redirect), and affiliate outbound clicks. These tools were not price-checked in this session.
- **Planning benchmarks** (directional, not sourced in this session): landing-page opt-in 20–40% for a specific free itinerary; list-to-purchase of a low-ticket product 1–3% per launch email sequence. Run a pricing test of $9 vs $12 vs $15 only after about 300 checkout-page visits.
- **Funnel:** free tool/page → lead magnet (free 1-page "Egypt honestly" checklist) → 5-email welcome (days 0, 1, 3, 5, 7) → $12 dossier offer → $49 itinerary check upsell for buyers.

### Gaps
- No sourced conversion benchmarks for free-tool → email → $12 digital product, or for travel newsletter list-to-sale. The numbers above are rules of thumb and must not be cited as data.
- Privacy-analytics pricing and free tiers (not searched).

## 5. AI-assisted content workflow for a one-person team

### Takeaway
Batch-produce content from a data sheet: Google Sheets rows → Canva Bulk Create pins and carousels → Higgsfield/CapCut short videos → schedule with native schedulers (Pinterest, Meta Business Suite) plus Buffer Free (3 channels, 10 queued posts each). AI-generated realistic content must be labelled on TikTok and YouTube, and on Meta ads. Fabricated imagery of real monuments works against an "Egypt, honestly" brand.

### Cited Findings
- Buffer Free: 3 channels, 10 scheduled posts per channel (refills as posts publish), 1 user, AI assistant, basic analytics. Pinterest is supported. — [Buffer vs Metricool (Buffer)](https://buffer.com/resources/buffer-vs-metricool/); [marcandrews](https://marcandrews.com/buffer-free-plan-limits-2026-exactly-what-you-get/)
- Metricool Free: Metricool's own page says 3 channels and 10 posts per channel. Buffer and other reviewers say 20 published posts per month, 1 brand, no LinkedIn or X. These sources conflict. — [Metricool vs](https://metricool.com/metricool-vs/); [Buffer vs Metricool](https://buffer.com/resources/buffer-vs-metricool/)
- TikTok requires creators to label realistic AI-generated images, audio or video (toggle under More options → AI-generated content), and may auto-label suspected AI content. TikTok ads with AI content must carry its AI label or a disclaimer, or they are rejected or restricted. — [billo: AI labeling 2026](https://billo.app/blog/ai-labeling/); [Kapwing](https://www.kapwing.com/resources/when-should-you-label-videos-as-ai/)
- YouTube requires disclosure of realistic altered or synthetic content. It may apply the label itself and penalise creators who repeatedly fail to disclose. The label alone does not affect monetisation. — [Quartz](https://qz.com/youtube-ai-content-label-facebook-instagram-meta-1851346541); [magichour](https://magichour.ai/blog/ai-video-disclosure-guide)
- Meta applies an "AI info" label, and ads with AI-generated or heavily AI-edited content require disclosure. Rules for organic posts are described inconsistently across sources. — [billo](https://billo.app/blog/ai-labeling/); [everything-pr](https://everything-pr.com/ai-generated-content-disclosure-platform-by-platform-rules)

### Inferences
- **Weekly 7-hour template:** 1 h planning in Notion (content calendar database) → 1.5 h writing captions and pin copy with AI from the site's own data (prices, opening hours, scam notes) in a Sheet → 1.5 h Canva Bulk Create (one template × 20 rows = 20 pins in EN/DE/RU) → 1.5 h making 3 Reels/Shorts (real footage or stills + text overlay; Higgsfield for motion and B-roll, CapCut for subtitles) → 0.5 h scheduling (Pinterest native scheduler, Meta Business Suite for FB/IG, Higgsfield TikTok publishing, Buffer Free for spillover) → 1 h engagement and metrics review in a Sheet.
- **AI imagery of real monuments:** generated pictures of the pyramids, Abu Simbel and other sites can show wrong details or impossible views (empty sites, wrong light, invented structures). That breaks an "honestly" positioning and invites "fake" comments. Use real photos (own or licensed or CC) for monuments. Keep AI for illustrations, maps, text-led cards and clearly stylised visuals, and turn on the AI label whenever realistic synthetic footage is used. Filming or commercial photography at Egyptian sites (for example drones) can need permits (not researched).
- **Trilingual batching:** keep one Sheet row per idea with EN/DE/RU columns, so one Canva bulk run produces all three language versions.

### Gaps
- Exact Pinterest native-scheduler limits and the Meta Business Suite scheduling window in 2026 (not searched).
- Canva Bulk Create plan requirements (believed to need Canva Pro; not verified this session).
- Pinterest's own AI-label rules (not found).
