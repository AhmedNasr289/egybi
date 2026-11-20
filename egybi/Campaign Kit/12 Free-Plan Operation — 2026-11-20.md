# 12 Free-Plan Operation — checked 2026-11-20

> The campaign on free plans only: no subscriptions, no paid credits, no ads. Back to [[Home]] · tools: `09 Tools and Connectors.md` · first readings: `10 Connected Tools — First Readings 2026-11-20.md`.

**How this was checked:** every limit and fee below was read on the vendor's own pricing or help page on 20 Nov 2026.
- Pages were fetched live with Firecrawl; some quotes come from search snippets of the vendor page.
- Anything not confirmed on a vendor page says **unverified**.
- Figures marked *estimate* are my judgement.
- Nothing was signed up for, bought or posted.

## 1. Every tool on its free plan

| Tool | Free plan, with its limits (quoted) | What the plan loses | Free replacement | Source |
|---|---|---|---|---|
| **Ayrshare** | **No free plan.** "The Basic Plan… is no longer available to new sign-ups"; to try it, "start a 28-day free trial of the Launch Plan", which costs "$299/mo". | One-place scheduling | Native schedulers plus Buffer Free (see the Scheduling comparison) | ayrshare.com/pricing |
| **Apollo.io** | "900 credits per seat per year, granted monthly", "2 Sequences", "Daily Emails Sends 250". On the API: "if you have a free Apollo account, you must register with a work email address to use certain people and company search… actions." | People search through Claude. It was refused today for an account on a personal Gmail address. | Register Apollo with **hello@egybi.com**, a work address, then retry. Whether that unlocks search is unverified. Also Hunter Free and journalists' public author pages. | apollo.io/pricing, docs.apollo.io/docs/developer-faqs |
| **Ahrefs** | **Ahrefs Free (formerly Webmaster Tools):** "free-forever… No credit card". For a *verified* site: rankings ("up to 1000 keywords at once"), backlinks ("up to 1000"), Site Audit ("5,000 crawl credits per verified project per month"). The free keyword generator gives volumes and difficulty. API: paid only. | Competitor domains; AI Brand Radar ("Starts at $50/mo") | Ahrefs Free on egybi.com, verified through Search Console | ahrefs.com/free, ahrefs.com/brand-radar |
| **OpenRush** | **No free allowance.** "$10 buys 1,000 credits"; per call: keywords 4, site audit 9, AI visibility 25, AI citations 25. | Pay-per-call keyword, audit and AI-citation data | Bing Webmaster Keyword Research, Google Search Console, Keyword Surfer, autocomplete mining (`research_notes/…/autocomplete_mine.py`), HubSpot AI Search Grader | openrush.com/pricing |
| **vidIQ** | "Free … 150 AI Credits every month", which do not roll over. Keyword research costs 5 credits per call through Claude, or is free in the web app ("3 results/search"). | Nothing at this campaign's pace | Keep, at about 30 research calls a month | vidiq.com/plans, support.vidiq.com (features & credits) |
| **Firecrawl** | "1,000 credits every month", "no credit card required", "2 concurrent requests". reddit.com is not supported. | Reddit rules and Telegram sizes | Read subreddit sidebars by hand; tgstat in your own browser | firecrawl.dev/pricing |
| **Supermetrics** | Trial only: "trial any Supermetrics connector… for free for 14 days", no card asked. No free plan. | Automatic GSC → Weekly log | Export from the Search Console Performance report and paste into the Weekly log, about 10 min a week (*estimate*) | supermetrics.com/pricing |
| **Similarweb** | Free checker: "a high-level sample… without deeper drill downs". Number of lookups: unverified. | Detailed competitor traffic | Ahrefs free keyword generator; Similarweb free for headline numbers | similarweb.com/website |
| **Higgsfield** | Free plan "with limited access to selected AI models, no monthly credits". Another page says "10 free credits once at sign-up" (the vendor contradicts itself). Free downloads are probably watermarked ("Paid plans include watermark-free downloads"). Virality Predictor gate: unverified. | Nothing: the plan uses screen recordings and real photos only | Drop | higgsfield.ai/pricing |
| **Canva** | Free: "1 Brand Kit (3 colors only)", "5GB". Bulk Create and Magic Resize are Pro only. Free content may be used commercially, but not as a trademark. | Bulk Create and Magic Resize | The cards are built by `images/_build` from site data, so nothing is lost | canva.com/pricing, canva.com/help/bulk-create |
| **Adobe Express** | Free: "Plan and schedule posts to 1 account per social network", "5GB", "a limited number of free daily generations". "No credit card required." | — | A second free scheduler (one account per network) | adobe.com/express/pricing |
| **Figma** | Starter: "Unlimited drafts", "150 AI credits/day, up to 500 AI credits/mo". File and project caps: unverified. | — | Keep for one-off edits | figma.com/pricing |
| **CapCut** | Free: "Basic editing tools". Watermark-free "when Pro features aren't used". Sounds may not be used for "promoting a brand or business", except "Commercial Sounds" on CapCut and TikTok. | Pro effects | CapCut free without Pro features. Alternative: **Clipchamp Free**, "watermark-free video exports up to 1080p" | capcut.com/pricing, capcut.com/clause/material-license-agreement, Microsoft Clipchamp help |
| **Payhip** | "$0/mo +5% transaction fee", "Unlimited products"; collects and remits EU/UK VAT. Processor fees are extra. **Stripe does not serve Egypt** (not on stripe.com/global), so the processor is PayPal or PayTabs ("start from 2.25%"). | Stripe | See the checkout comparison | payhip.com/pricing, help.payhip.com/article/372 and /376 |
| **Mailchimp** | "250 contacts and 500 sends per month"; automations "Not included". | The 5-email welcome series as an automation | Keep the site's own mailer (`send-newsletter.yml`, already free). If it ever moves: **MailerLite Free**, "250 subscribers", "2,500 monthly emails", "Free automations". | mailchimp.com/pricing, mailerlite.com/pricing |
| **Gmail / Calendar / Sheets / Drive** | Free. Gmail: "more than 500 emails sent in a day" hits the limit. "15 GB" shared storage. | — | Keep | support.google.com/mail/answer/22839, support.google.com/googleone/answer/9312312 |
| **Notion** | Free: "Up to 5 MB" uploads, "7 days" of page history. | — | Not used; the vault in this repo is the record | notion.com/pricing |
| **Hostinger** | Existing paid hosting, not a new cost | — | Keep | — |

### Scheduling: the job Ayrshare was meant to do

| Option | Free limits (quoted) | Covers |
|---|---|---|
| **Buffer Free** | "Connect up to 3 channels", "10 scheduled posts per channel - refill anytime". Card requirement: unverified. | Pinterest, LinkedIn, Instagram, TikTok, YouTube, X, Bluesky… Which networks the *free* plan covers is unverified. |
| **Metricool Free** | "1 brand", "Schedule up to 20 posts per month", networks "except LinkedIn and Twitter". "Free never expires, does not require a credit card" (snippet). | Instagram, Facebook, Pinterest, TikTok, YouTube |
| **Native tools** | Pinterest: "up to 30 days in advance… up to 10 Pins scheduled". Meta Business Suite: "between 20 minutes and 29 days away" (snippet). LinkedIn: "between 10 minutes and 3 months" (snippet). YouTube Studio: schedule card, no maximum stated. TikTok Studio: scheduling exists, lead time unverified. X: scheduling is in X Pro; whether that needs Premium is unverified. | Each its own network |

**Choice:**
- **Buffer Free with 3 channels:** Pinterest, LinkedIn and Instagram.
- **Native schedulers:** YouTube Studio, TikTok Studio and Meta Business Suite for the videos.
- **X:** post by hand.

The calendar never has more than 2 pins or 1 video a week, so the 10-post queues never fill.

### Checkout: one $12 sale

The fee figures are from the vendors' pages; the arithmetic is mine. VAT and payout fees are not included.

| Route | Fees on $12 | You keep | Egypt payouts |
|---|---|---|---|
| Payhip Free + PayPal | 5% + (4.40% + $0.30) = **$1.43** | $10.57 | **Unverified** whether an Egyptian PayPal account can receive. PayPal "may require… a business account". |
| Payhip Free + PayTabs | 5% + "from 2.25%" + fixed fee (unverified) | unverified | PayTabs "supports… Egypt" |
| **Gumroad** | 10% + $0.50 = **$1.70** | **$10.30** | **Egypt is on Gumroad's bank-payout table ("Egypt \| EGP")**. Gumroad handles VAT as merchant of record. |
| Polar.sh Starter | 5% + $0.50 + 1.5% non-US card = $1.28 | $10.72 | Egypt is on Polar's supported-countries list. **The site's buy button does not accept polar.sh links yet** (`store.js` allows only payhip.com and gumroad.com). |
| Lemon Squeezy | — | — | "no longer accepting new sign-ups and will shut down on March 31, 2027" |

**Choice:** **Gumroad** first. Payouts to an Egyptian bank account are confirmed on its own page, and it handles VAT. The cost is $0.27 more per sale than Payhip with PayPal.
- Move to Payhip only after you confirm in your own PayPal account that it can receive payments.
- `store.js` already accepts a Gumroad link, so the swap is one line in `site/data/store.json`.

### Other jobs, with two or more free options compared

| Job | Option 1 | Option 2 | Option 3 | Choice |
|---|---|---|---|---|
| Keyword volumes | Bing Webmaster Tools, Keyword Research: "phrases… and their corresponding search volumes" (free) | Keyword Surfer: "100% free. Forever", volumes in 70 countries | Google Keyword Planner: "You must enter your billing information", so excluded | Bing + Keyword Surfer + autocomplete mining |
| Rank tracking | Google Search Console: average position, "last 16 months", 1,000 rows in the interface | Ahrefs Free: "up to 1000 keywords" for the verified site | — | Both, once Search Console is verified |
| AI citations | HubSpot AI Search Grader: "a free, one-time check… no account required" | By hand: the 20-prompt panel in `06`, run in free ChatGPT, Perplexity and Gemini | OpenRush: 25 credits ($0.25) a call, not free | Panel by hand monthly; Grader once |
| Journalist contacts | Hunter Free: "50 credits per month" | Snov.io: "50 credits", "renews every month" | Apollo Free with a work email (unverified) · Muck Rack: nothing free for PR | Author pages first, then Hunter, then Snov |
| Newsletter | Site mailer (already running, free) | MailerLite Free: 250 subscribers, automations | Brevo Free: "300 emails per day", "Sent by Brevo" sticker, no automations | Site mailer |
| Video editing | CapCut Free, without Pro features | Clipchamp Free: 1080p, no watermark | — | Either |
| Analytics | The site's own `insights.php` (UTM table, funnel) | Pinterest business analytics: "past year and a half" | Search Console + Bing | All three |

## 2. The free-only plan, week by week

Nothing changes in the channels or the post text of `07 Content Calendar.csv`; only the tool for each task changes. Most rows were always meant to be posted by hand under each community's rules: Reddit, Telegram chats, TripAdvisor forums, Facebook groups, Hacker News.

| Weeks | Calendar tasks | Free tool per task |
|---|---|---|
| W0–W1 (21–30 Nov) | Reddit, Telegram chat, TripAdvisor, Arabic Facebook group answers | By hand in each app. Read each subreddit's sidebar first; Firecrawl cannot read Reddit. |
| W1 setup | Phase 0: checkout, Search Console, Bing, Yandex | Gumroad (or Payhip), Search Console (the TXT record already exists), Bing "Import from GSC", Yandex DNS TXT (I add it once you send the code), Ahrefs Free |
| W2 | LinkedIn, Reddit r/travel, RU Telegram channel (mirrored to VK and Max), TripAdvisor, first pin | Buffer Free for LinkedIn and Pinterest. Telegram's built-in "Schedule message" (a feature of the free app; no vendor page read today). The rest by hand. |
| W3 (8 Dec) | Show HN, r/cairo, video 1, Arabic Facebook group, pin | HN and Reddit by hand. Video: CapCut or Clipchamp, scheduled in TikTok Studio, YouTube Studio and Meta Business Suite. Pin through Buffer. |
| W4 | 1 press pitch + 3 creator pitches, newsletter | Contacts from author pages, then Hunter Free. Pitches sent from Gmail; page `11` opens each one pre-filled. Newsletter: the site mailer. |
| W5–W6 | 3 videos, pins, LinkedIn, X, RU channel | Videos as in W3; pins and LinkedIn through Buffer; X by hand |
| W7 | r/dataisbeautiful, Egyptian Streets pitch, video, pin | As above. Chart: a PNG from the site. |
| W8 | 3 creator pitches | vidIQ Free to pick the creators (5 credits a search), then Hunter or the channel's About tab |
| W9–W11 | Ahram pitch, TripAdvisor Aswan, newsletter, Ramadan posts (expected 8 or 9 Feb) | The Ramadan pin and post are queued by 31 Jan through Buffer and Meta Business Suite |
| W12–W14 | Videos, pins, Masrawy pitch, LinkedIn, X | As above |
| W15–W19 (to 31 Mar) | Creator pitches, Independent pitch (15 Mar), videos, pins, newsletter | As above |
| Every Monday | Weekly log | Paste the Search Console export, `insights.php` campaign table, Pinterest analytics and Bing numbers into the Sheet |
| 1 Jan and 31 Mar | Checkpoints | Ahrefs Free rankings, the 20-prompt AI panel by hand, HubSpot AI Search Grader once |

**Dropped or done by hand:**
- One-place scheduling (Ayrshare).
- Automatic Search Console → Sheet reporting (Supermetrics).
- AI-citation tracking by tool (OpenRush, Brand Radar).
- Apollo people search, until the work-email route is tested.
- Higgsfield.

**Extra time (estimate): about 1½ to 2 hours a week.**

| Task | Time a week (estimate) |
|---|---|
| Scheduling in three native tools instead of one | +45 min |
| Manual Search Console export | +10 min |
| Finding contacts by hand in pitch weeks | +30 min |
| Monthly AI-panel check, spread over the month | +15 min |

## 3. Free-plan traps

1. **Ayrshare:** the only way in is a 28-day trial of a $299/month plan. **Do not start it.** Card requirement unverified. The plugin is installed but has no key; leave it unused.
2. **Trials that look like free plans:**
   - Later: "Free for 14 days".
   - Supermetrics: 14 days.
   - Ubersuggest: "A credit card is required to start" its 7-day trial.
   - Otterly: trial; length and card unverified.
3. **Google Keyword Planner** needs billing details, so it is not free in practice.
4. **Stripe does not serve Egypt.** Any route that assumes Stripe payouts fails. This includes Payhip's Stripe option and Polar's payouts, which go through Stripe Connect (unverified for Egypt).
5. **Lemon Squeezy shuts on 31 Mar 2027**, the same day as the campaign checkpoint.
6. **OpenRush costs from the first call.** There is no free allowance on its pricing page. The calls I made today used about 91 credits at its list prices (*estimate*: audit 9, AI visibility 25, AI citations 25, 8 keyword calls × 4), about $0.91. Whether a starting grant covered them is unverified. I will make no more OpenRush calls without your yes.
7. **CapCut watermark and music:**
   - Using a Pro feature adds a watermark.
   - The ending watermark clip has to be deleted.
   - Ordinary CapCut sounds may not promote a business. Use no music, or "Commercial Sounds" only.
8. **Branding on free newsletters:** Brevo adds a "Sent by Brevo" sticker; beehiiv and MailerLite keep their logos on free plans. The site mailer has no branding.
9. **Mailchimp Free:** 500 sends a month and no automations. A 5-email welcome series runs out at about 100 new subscribers a month (*estimate*: 500 ÷ 5).
10. **Queue caps:** Pinterest holds 10 scheduled pins; Buffer holds 10 posts per channel; Metricool allows 20 posts a month and excludes LinkedIn and X. At this calendar's pace (2 pins a week at most) none of them binds. Refill the queue every Monday.
11. **vidIQ:** 150 credits a month, with no rollover. Credit-costing tools use plan credits first. Thumbnail generation costs 22 credits; don't use it, the covers are already made.
12. **Firecrawl:** 1,000 credits a month, and it cannot read Reddit.
13. **Higgsfield:** free downloads are probably watermarked. It is not needed.
14. **Apollo Free through Claude:** blocked for accounts on a personal email address.
15. **Commercial use:** Canva free content may be used commercially, except as a trademark. For vidIQ, Adobe Express, Clipchamp and the newsletter tools, the pricing pages don't state commercial-use terms (unverified). Read their terms before relying on assets from them.

## 4. The one upgrade worth considering, and when

**A single $10 OpenRush top-up (1,000 credits), not a subscription, at the 1 January check-in.**

| Check | Credits |
|---|---|
| AI visibility (OpenRush list price) | 25 |
| AI citations | 25 |
| Keyword research, 5 calls × 4 | 20 |
| **One full re-check** | **70** |
| Two re-checks (1 Jan and 31 Mar) | 140, about $1.40 |

- No free tool measures Google AI Overview citations the same way, and the 20 Nov baseline (0 citations) was taken with OpenRush. Re-checking with the same tool keeps the comparison honest.
- The rule for the decision is the plan's own day-84 rule: buy it only if the run-rate on 1 Jan is **at least $10 a month**. That is one Gumroad sale nets $10.30, so a single sale pays for it.
- Every subscription found today costs more than the campaign is likely to earn by January (*estimate*): Ayrshare $299/month, Ahrefs Brand Radar from $50/month. Leave those until the $100/month "continue" threshold is met.

## 5. Account settings only you can change, in this order

1. **Search Console:** open the egybi.com Domain property and press Verify. The TXT record is already in DNS.
2. **Bing Webmaster Tools:** "Import from Google Search Console". Then run URL Inspection on `https://egybi.com/`; my test got a 403 for bingbot on the homepage.
3. **Yandex Webmaster:** choose DNS verification and send me the code. I add the TXT record with the Hostinger connector once you say yes.
4. **Checkout:** create a Gumroad account with an EGP bank payout and list the $12 pack (the listing text is in `01`). Send me the product link; I put it in `site/data/store.json`.
   - If you prefer Payhip, first check in your own PayPal account that it can receive payments.
5. **Ahrefs Free:** add egybi.com and verify it through the Search Console import.
6. **Pinterest business account**, then **Buffer Free** with Pinterest, LinkedIn and Instagram.
7. **TikTok, YouTube and Meta Business Suite**, for the three videos already made and the four scripts.
8. **Apollo:** change the login email to hello@egybi.com, then tell me so I can retry people search. Separately, set up a **Hunter Free** account.
9. **Gmail and Google Calendar connectors:** allow drafts and events at claude.ai/customize/connectors, so I can save the pitches and dates directly.
10. **Do not start** the Ayrshare, Later, Supermetrics or Ubersuggest trials.
