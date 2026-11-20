# 01 Phase 0 — Listing, Search Setup and UTM

> Status: ready for Ahmed to use, written 2026-11-19; do everything here between 20 and 29 November 2026. Back to [[Home]] · plan: reports/EgyBI marketing and distribution plan.md · see [[Owner Steps — Search, Sales and Housekeeping]] · [[Traffic Baseline & Analytics]].

Order of work: (1) Search Console baseline, (2) Bing, (3) Yandex, (4) the crawler check, (5) Payhip account and gateways, (6) the listing, (7) the buy button. The baseline goes first because every later number is judged against it.

---

## 1. The Payhip listing — "The Papyrus Egypt Dossier", $12

What the pack really contains is fixed by `backend/pipeline/dossier_pack.py` and promised on `site/dossier.html`: 18 site sheets, the fair-price pocket card in English and Arabic, and the public-holiday calendar for the year. Nothing else. Older notes mention an Arabic phrase card and a packing list; the builder does not make them, so the listing must not promise them. If they are added later, add them here at the same time.

Build the file before listing: `python backend/pipeline/dossier_pack.py --pdf` writes `build/dossier-pack/the-papyrus-egypt-dossier.pdf` (A4). The default year for the light tables is the last year in calendar.json, which is 2027.

### Title

The Papyrus Egypt Dossier — 2027 printable trip pack

### Subtitle

Heat by month at 18 sites, a fair-price card in English and Arabic, and the 2027 holiday calendar. Every figure with its source and date.

### Full description

This is the printable version of the data on egybi.com, gathered into one A4 PDF that works offline. I built EgyBI, a free Egypt trip companion, as a data engineer living in Egypt; this pack is how the free site pays for itself.

Nothing in it is secret or new. It is the same cited data the site publishes, laid out so you can print it, fold it and carry it, and so you are not depending on mobile data at a temple gate.

**What you get**

- **18 site sheets, one per site**, from Alexandria and Abu Mena in the north to Philae and Abu Simbel in the south: the normal afternoon high, the night low and the rain for all twelve months (NASA POWER climatology, 2001–2020 normals), the site's elevation, and sunrise, the end of morning golden light, the start of evening golden light and sunset on the 15th of every month of 2027. Each sheet names the months when a normal afternoon stays under the comfort line and the hottest month.
- **The fair-price pocket card, in English and Arabic.** Tips, entry tickets and rides as named sources publish them, each converted at the day's market reference rate (said so on the card), with the source and date of every row. Where two sources disagree, the card shows both. Where no reliable figure exists, as for a camel ride at Giza, the card says so instead of inventing one. Fold it and show the Arabic column.
- **Egypt's public holidays for 2027**, with Ramadan and the two Eids marked as expected until the moon is sighted.

**How current it is.** The cover prints the edition date and every source with the date it was read. Prices move with the pound; heat normals describe a typical year, not a forecast. Check anything your trip depends on.

**What it is not.** Not a guidebook, not a booking service, and not affiliated with any tour company. No commissions from anyone.

### Three benefit bullets (for the top of the page)

- Know how hot the afternoon will be at each site in your month, before you book the day.
- Carry the published price of tips, tickets and rides, with the Arabic beside it, so a quote can be checked on the spot.
- Plan around Ramadan, Eid and the other 2027 holidays with the dates marked as fixed or expected.

### What's inside (list for the product page)

1. Cover with the edition date and the full list of sources
2. 18 site sheets: Alexandria, Abu Mena, the Suez Canal at Ismailia, Historic Cairo, the Giza Pyramids, Saqqara, Wadi al-Hitan, Siwa Oasis, Saint Catherine's Monastery, Dahab, Hurghada, the White Desert, Abydos, Dendera Temple, Valley of the Kings, Karnak Temple, Philae Temple, Abu Simbel
3. The fair-price pocket card (English and Arabic), with numbered notes and sources
4. Public holidays 2027, with Ramadan and Eid as expected ranges

Format: one PDF, A4, prints in colour or greyscale.

### FAQ

**What format is it?**
One PDF, A4 pages. It opens on any phone, tablet or computer, and it is made to be printed.

**Can I print it on US Letter paper?**
Yes. Choose "Fit to page" in your print dialog. The pages are laid out for A4 with generous margins, so nothing is cut off.

**How current is the data?**
Each edition is built on the day it is dated, from the same files the site updates. The cover lists every source with the date it was read. Entry tickets come from the Ministry of Tourism and Antiquities price list and its booking site; tips and rides come from the named guides on each row; the exchange rate is the market reference rate of the build day, not the Central Bank fixing. If you buy and a price row changes before your trip, email me and I will send the newest edition.

**Do I get updates?**
Yes, for the 2027 edition: email hello@egybi.com with your order email and I will send the latest build.

**What languages is it in?**
English, with Arabic on the fair-price card and the Arabic name of every site. There is no Russian edition yet.

**Can I get a refund?**
If the file does not open, or it is not what this page describes, email hello@egybi.com within 14 days and you get a full refund.

**Is this the same as the free dossier on the site?**
No. The free one prints the stops of your own route from the planner. This pack has all 18 sites, all twelve months, the pocket card and the full year's holidays in one file.

**What is it not?**
It is not a guidebook with recommendations, it does not sell tours or tickets, and it is not advice on visas, health or safety. For those, use your government's travel advice.

### Suggested tags (Payhip)

egypt travel, egypt itinerary, cairo, luxor, aswan, abu simbel, printable travel guide, egypt weather, tipping in egypt, travel planner

### Gumroad fallback (short variant)

Use only if Payhip with PayPal or PayTabs stalls.

- **Name:** The Papyrus Egypt Dossier — 2027 printable trip pack
- **Price:** $12
- **Summary line:** Heat by month at 18 sites, a fair-price card in English and Arabic, and the 2027 holidays. Every figure cited and dated.
- **Description:** A printable A4 PDF of the cited data on egybi.com, which I built and run from Egypt. Inside: 18 site sheets (twelve months of afternoon highs, night lows and rain from NASA POWER 2001–2020 normals, elevation, and sunrise, golden light and sunset on the 15th of each month of 2027); the fair-price pocket card in English and Arabic, with the source and date of every row and both figures where sources disagree; and Egypt's 2027 public holidays with Ramadan and Eid marked as expected. No tours, no commissions. Email hello@egybi.com for the newest edition or a refund within 14 days if the file is not as described.

### Etsy listing

- **Title (under 140 characters):** Egypt Travel Planner 2027 Printable PDF, Heat by Month at 18 Sites, Tipping and Entry Price Card in Arabic, Cairo Luxor Aswan Guide
- **13 tags (each under 20 characters):**
  1. egypt travel
  2. egypt itinerary
  3. cairo travel
  4. luxor travel
  5. aswan
  6. abu simbel
  7. nile cruise
  8. printable planner
  9. travel pdf
  10. egypt weather
  11. tipping guide
  12. pyramids trip
  13. egypt 2027

Etsy pays Egypt sellers through Payoneer (Etsy Help, cited in the plan). It is a second shop for search traffic, not the main checkout.

---

## 2. The UTM convention

Every link to egybi.com that leaves the site gets exactly these three tags, all lowercase, in this order:

`?utm_source=<platform>&utm_medium=<format>&utm_campaign=<campaign>`

| Tag | Allowed values | Meaning |
|---|---|---|
| `utm_source` | reddit, telegram, facebook, linkedin, hn, pinterest, tiktok, instagram, youtube, tripadvisor, newsletter, press, creator, qr, x | Where the click happened |
| `utm_medium` | answer, oc, post, pin, video, bio, pitch, email, card, comment | The format that carried the link |
| `utm_campaign` | s2627-launch, s2627-prices, s2627-heat, s2627-names, s2627-visa, s2627-gem, s2627-ramadan, s2627-abusimbel, s2627-easter, s2627-pack, s2627-check | The season's hook (s2627 = season 2026–27) |

Examples:

| Situation | Link |
|---|---|
| A Russian Telegram answer about tipping, after the link-free weeks | `https://egybi.com/ru/fair-prices.html?utm_source=telegram&utm_medium=answer&utm_campaign=s2627-prices` |
| The link in the first comment of a LinkedIn post | `https://egybi.com/?utm_source=linkedin&utm_medium=comment&utm_campaign=s2627-launch` |
| A Pinterest pin about heat | `https://egybi.com/egypt-weather-by-month.html?utm_source=pinterest&utm_medium=pin&utm_campaign=s2627-heat` |

Rules: no link at all in Reddit answers or in the first Telegram replies. Never use a value that is not in the table; if a new platform is needed, add it here first. Log every link you post in the UTM sheet (date, platform, post URL, link).

### Pre-built tagged links for the season

| # | Use | Link |
|---|---|---|
| 1 | LinkedIn launch, first comment | https://egybi.com/?utm_source=linkedin&utm_medium=comment&utm_campaign=s2627-launch |
| 2 | Show HN post URL | https://egybi.com/plan.html?utm_source=hn&utm_medium=post&utm_campaign=s2627-launch |
| 3 | LinkedIn bio / featured link | https://egybi.com/?utm_source=linkedin&utm_medium=bio&utm_campaign=s2627-launch |
| 4 | Reddit [OC] first comment, heat chart | https://egybi.com/egypt-weather-by-month.html?utm_source=reddit&utm_medium=oc&utm_campaign=s2627-heat |
| 5 | Reddit comment where a link is allowed (r/solotravel weekly thread) | https://egybi.com/fair-prices.html?utm_source=reddit&utm_medium=comment&utm_campaign=s2627-prices |
| 6 | RU Telegram answer, prices | https://egybi.com/ru/fair-prices.html?utm_source=telegram&utm_medium=answer&utm_campaign=s2627-prices |
| 7 | RU Telegram weekly card | https://egybi.com/ru/fair-prices.html?utm_source=telegram&utm_medium=card&utm_campaign=s2627-prices |
| 8 | RU Telegram answer, visa and cash | https://egybi.com/ru/arriving-in-egypt.html?utm_source=telegram&utm_medium=answer&utm_campaign=s2627-visa |
| 9 | RU Telegram answer, heat | https://egybi.com/ru/visit.html?utm_source=telegram&utm_medium=answer&utm_campaign=s2627-heat |
| 10 | RU Telegram card, GEM | https://egybi.com/ru/fair-prices.html?utm_source=telegram&utm_medium=card&utm_campaign=s2627-gem |
| 11 | EN visa change post, LinkedIn | https://egybi.com/arriving-in-egypt.html?utm_source=linkedin&utm_medium=post&utm_campaign=s2627-visa |
| 12 | Pinterest heat pins | https://egybi.com/egypt-weather-by-month.html?utm_source=pinterest&utm_medium=pin&utm_campaign=s2627-heat |
| 13 | Pinterest price pins | https://egybi.com/fair-prices.html?utm_source=pinterest&utm_medium=pin&utm_campaign=s2627-prices |
| 14 | TikTok bio | https://egybi.com/hieroglyphs.html?utm_source=tiktok&utm_medium=bio&utm_campaign=s2627-names |
| 15 | Instagram bio | https://egybi.com/hieroglyphs.html?utm_source=instagram&utm_medium=bio&utm_campaign=s2627-names |
| 16 | YouTube Shorts description, prices | https://egybi.com/fair-prices.html?utm_source=youtube&utm_medium=video&utm_campaign=s2627-prices |
| 17 | AR Facebook first comment, daily prices | https://egybi.com/prices-ar.html?utm_source=facebook&utm_medium=comment&utm_campaign=s2627-prices |
| 18 | AR Facebook first comment, name studio | https://egybi.com/ar/hieroglyphs.html?utm_source=facebook&utm_medium=comment&utm_campaign=s2627-names |
| 19 | AR Facebook first comment, best time to visit | https://egybi.com/ar/visit.html?utm_source=facebook&utm_medium=comment&utm_campaign=s2627-heat |
| 20 | Press pitch, the pound since July | https://egybi.com/egyptian-pound-since-july.html?utm_source=press&utm_medium=pitch&utm_campaign=s2627-prices |
| 21 | Press pitch, holidays and Ramadan | https://egybi.com/egypt-public-holidays.html?utm_source=press&utm_medium=pitch&utm_campaign=s2627-ramadan |
| 22 | Newsletter, Abu Simbel issue | https://egybi.com/visit/abu-simbel.html?utm_source=newsletter&utm_medium=email&utm_campaign=s2627-abusimbel |
| 23 | Newsletter, the pack | https://egybi.com/dossier.html?utm_source=newsletter&utm_medium=email&utm_campaign=s2627-pack |
| 24 | Newsletter, the plan check | https://egybi.com/ask.html?utm_source=newsletter&utm_medium=email&utm_campaign=s2627-check |
| 25 | Creator pitch, the plan check offer | https://egybi.com/ask.html?utm_source=creator&utm_medium=pitch&utm_campaign=s2627-check |
| 26 | Hostel QR card | https://egybi.com/fair-prices.html?utm_source=qr&utm_medium=card&utm_campaign=s2627-prices |
| 27 | TripAdvisor profile "about me" | https://egybi.com/plan.html?utm_source=tripadvisor&utm_medium=bio&utm_campaign=s2627-launch |
| 28 | X post, Easter week at Giza | https://egybi.com/visit/giza.html?utm_source=x&utm_medium=post&utm_campaign=s2627-easter |

For the QR card, give each property its own row in the UTM sheet. The convention has no per-property tag, so tell properties apart by the date range the card was placed and by asking Claude to add a fourth tag only if you place more than one card in the same week.

---

## 3. Google Search Console baseline (about 15 minutes, do first)

1. Open https://search.google.com/search-console and pick the **egybi.com** property in the top-left list.
2. Left menu: **Performance → Search results**.
3. Click the **Date** chip at the top, choose **Last 3 months**, press **Apply**.
4. Click all four boxes above the chart so they are coloured: **Total clicks, Total impressions, Average CTR, Average position**.
5. Write the four numbers into a new row of the **Search Console readings** table in [[Traffic Baseline & Analytics]]: Date = the day you take it, Window = "Last 3 months".
6. Top right: **Export → Download CSV**. Save the zip as `gsc-2026-11-3m.zip`. It holds Queries.csv and Pages.csv, among others.
7. Click the **Date** chip again, choose **Last 28 days**, **Apply**. Write a second row (Window = "Last 28 days") and export again as `gsc-2026-11-28d.zip`.
8. Left menu: **Indexing → Pages**. Write **Indexed** and **Not indexed** into both rows.
9. In the note column of the 3-month row, paste the top 10 queries and top 10 pages by clicks (or by impressions if clicks are near zero) from the CSVs.
10. Repeat every two weeks over the same two windows, on a Monday, in the metrics block.

**Tell Claude:** "Search Console baseline taken", and attach the two zips. Claude adds the top queries to the note and sets the KPI targets from them.

## 4. Bing Webmaster Tools (about 10 minutes)

1. Open https://www.bing.com/webmasters and sign in with a Microsoft account.
2. Choose **Import your sites from Google Search Console**, allow access with the Google account that owns egybi.com, tick **egybi.com**, press **Import**. Importing verifies the site, so no file or meta tag is needed on this route.
3. Left menu: **Sitemaps**. If `https://egybi.com/sitemap.xml` is not listed, press **Submit sitemap**, paste `https://egybi.com/sitemap.xml`, press **Submit**.
4. Left menu: **URL Inspection**. Paste `https://egybi.com/` and press **Inspect**, then press **Live URL** (the live test). It should say the URL can be indexed. Write down the result.
5. Do the same live test for `https://egybi.com/robots.txt`, then for `https://egybi.com/fair-prices.html` and `https://egybi.com/ru/fair-prices.html`. A live test that fails with an error or "blocked" is the sign of the CDN problem in section 6.
6. Left menu: **AI Performance** (Bing launched this report in February 2026, per geotoolbox, cited in the plan). Note the number of citations and the pages cited, even if zero. This is the free AI-citation signal for the KPI tracker.
7. Left menu: **IndexNow**. The site already pings IndexNow on deploy with the key file `f5095e3d9b094929f94edda79d85f2b7.txt`; after 24–48 hours this should list recent submissions.

**If import is not possible** (for example a different Google account owns the property): choose **Add your site manually**, enter `https://egybi.com`, and pick **HTML Meta Tag** or **XML File**. Bing then shows a tag or a file named `BingSiteAuth.xml`. Do not edit the site yourself. Ask a Claude coding session on the repo, in these words: "Add the Bing verification below to the site and open a PR." Under that sentence paste the full meta tag, or attach BingSiteAuth.xml to the message. Merge the PR, wait for the deploy, then press **Verify** in Bing.

**Tell Claude:** "Bing is set up", with the four live-test results and the AI Performance numbers.

## 5. Yandex Webmaster (about 10 minutes, for the /ru/ pages)

1. Open https://webmaster.yandex.com and sign in with a Yandex ID (create one if needed).
2. Press **Add site** (the "+" button), enter `https://egybi.com`, press **Add**.
3. Yandex offers three ways to verify: **Meta tag**, **HTML file**, **DNS record**. Choose **HTML file**: download the file it offers (its name starts with `yandex_` and ends `.html`). Or choose **Meta tag** and copy the full tag.
4. Ask a Claude coding session on the repo: "Add the Yandex verification below to the site root and open a PR." Attach the yandex_ file to the message, or paste the meta tag under the sentence. Merge, wait for the deploy, then press **Check** in Yandex.
5. Left menu: **Indexing → Sitemap files**. Paste `https://egybi.com/sitemap.xml`, press **Add**. Processing takes up to two weeks.
6. Left menu: **Site information → Regionality**. Set the region to **Egypt**, because the site is about places in Egypt. Yandex may ask for a page that proves the region; give `https://egybi.com/ru/about.html`. If it refuses, leave the region unset; that does no harm for an information site.
7. Left menu: **Indexing → Reindex pages**. Submit `https://egybi.com/ru/` , `https://egybi.com/ru/fair-prices.html`, `https://egybi.com/ru/arriving-in-egypt.html` and `https://egybi.com/ru/visit.html`.

**Tell Claude:** "Yandex is verified", and in two weeks the number of pages Yandex shows as in search.

## 6. The crawler check — what was found and what to do

**What was tested.** On 2026-11-19, requests sent from a cloud machine with the user-agent of each major search and AI crawler were made to `/`, `/fair-prices.html` and `/ru/fair-prices.html`.

**What came back.** Requests claiming to be **Googlebot, OAI-SearchBot, PerplexityBot, Claude-SearchBot and YandexBot got 200** on all three pages. Requests claiming to be **Bingbot and Applebot sometimes got a 403** from Hostinger's CDN (response header `server: hcdn`). Repeat requests then all returned 200.

**What it most likely means.** The CDN checks whether a request that calls itself Bingbot or Applebot really comes from Microsoft's or Apple's IP ranges. A cloud machine is neither, so blocking it is correct behaviour and protects the site from scrapers in disguise. It does not prove the real Bingbot is blocked.

**How to confirm.** Bing's **URL Inspection → Live URL** test in section 4 is sent from Microsoft's own crawler. If it reports the page as fetchable for `/`, `/robots.txt`, `/fair-prices.html` and `/ru/fair-prices.html`, the real Bingbot gets through and nothing needs changing. Applebot cannot be tested the same way; if Bing passes, assume Applebot is handled the same way.

**If the real Bingbot is blocked** (the live test fails with a fetch error, "blocked" or a 403):

1. Log in to https://hpanel.hostinger.com, open **Websites**, and press **Dashboard** (or **Manage**) next to egybi.com.
2. In the left menu open **Performance → CDN**. Look on that page for a security or bot section; the labels have changed over time, so look for anything called **Bot protection**, **Security level**, **Block AI bots / crawlers**, or **Under attack mode**. Switch off any setting that blocks or challenges bots, or lower the security level one step. Leave DDoS protection on.
3. On the same CDN page press **Flush cache** (or **Purge cache**).
4. In the left menu open **Security** and check for a bot or firewall setting that blocks crawlers by name; switch it off if present.
5. Wait 15 minutes and repeat the Bing live test. If it still fails, switch the CDN off for 30 minutes, test again, and switch it back on. If the test passes only with the CDN off, open a Hostinger live chat and say: "Hostinger CDN returns 403 to Bing's URL Inspection live test on egybi.com. Please allowlist verified Bingbot and Applebot." Record what they change.

**Tell Claude** the outcome either way. Claude then records it in [[Security Posture & Audit Log]] and, if anything changed, re-runs the header check from a coding session.

## 7. Checkout on Payhip with PayPal and PayTabs

Payhip's free plan lists PayTabs as a gateway for Egypt sellers and also supports PayPal (Payhip blog, cited in the plan). Payhip's help says PayTabs is connected under Payment Details, and that Payhip's default currency must match the PayTabs account currency (Payhip Help: Connect PayTabs, in the research notes). Two things are unconfirmed and must be checked on screen: whether an individual without a commercial registration can open PayTabs Egypt, and whether Payhip still collects EU and UK VAT on PayTabs checkouts.

1. **PayPal first** (the fastest gateway). On https://www.paypal.com/eg open or upgrade your account to a **Business** account. Confirm under **Wallet** how you can withdraw: PayPal Egypt pays out to an Egypt-issued Visa card or a US bank account (PayPal Egypt, cited in the plan). Note the withdrawal fee shown.
2. **Payhip account.** Sign up at https://payhip.com with hello@egybi.com. Choose the **Free** plan.
3. **Store settings.** Open **Settings → Account settings**: store name "EgyBI", support email hello@egybi.com. Set the **default currency to USD**.
4. **Connect PayPal.** **Settings → Payment details** (or **Payment gateways**) → **Connect PayPal** → log in to the Business account → approve.
5. **PayTabs** (optional second gateway). Apply at https://site.paytabs.com/en/egypt. If they ask for a commercial registration you do not have, stop here; PayPal alone is enough to open the shop. If approved, check the account currency. If it is EGP and Payhip's default is USD, they do not match and Payhip will not accept the connection; ask PayTabs whether a USD account is possible before connecting. When it matches, in Payhip go to **Settings → Payment details → PayTabs**, paste the **Profile ID** and **Server Key** from the PayTabs merchant dashboard, and save.
6. **Tax form.** When Payhip asks for tax details, fill in the non-US form (usually W-8BEN).
7. **Create the product.** **Products → Add new product → Digital product**. Upload `the-papyrus-egypt-dossier.pdf`. Price **12 USD**. Paste the title, subtitle, description, bullets, contents and FAQ from section 1. Add the tags. Cover image: a screenshot of the PDF's cover and one site sheet, not a photo of a monument from the web.
8. **After purchase.** If Payhip offers a redirect or custom thank-you URL in the product's advanced options, set it to `https://egybi.com/dossier.html?bought=1` so the purchase goal can be counted. If it does not, leave it; the Payhip sales report is the record.
9. **The $49 check.** Add a second product, type **Coaching** or **Digital product** with no file, named "Egypt plan check — written review in 48 hours", price 49 USD, description copied from ask.html. The site's flow stays as it is: the buyer emails first, and you reply with this product link only once you know you can help.
10. **Test purchase.** Buy the pack yourself with a real card or PayPal, check the download email arrives and the PDF opens on a phone, then refund yourself from **Sales**.
11. **Copy the product link** Payhip shows under **Share** (it begins `https://payhip.com/b/`).

**The buy button is already built (2026-11-20).** `site/assets/store.js` and `site/data/store.json` ship with the link empty, so the page keeps saying "not on sale". When the Payhip product page exists, open `site/data/store.json`, paste its `https://payhip.com/...` address into `pack.url`, and either push it yourself or tell a coding session "Set the pack URL to <the address> and open a PR". The button then appears in English, Arabic and Russian, counts `pack_buy_click`, and the thank-you line shows on `dossier.html?bought=1` (set that as Payhip's "redirect after purchase" address: `https://egybi.com/dossier.html?bought=1`). Only `https` links on payhip.com or gumroad.com are accepted.
