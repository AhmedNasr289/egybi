# 10 Connected Tools — First Readings, 2026-11-20

> The first read-only jobs run with the connectors you added today: Hostinger, OpenRush, Ahrefs, vidIQ, Firecrawl and Supermetrics. Nothing was posted, sent, bought or changed on any account. Back to [[Home]] · tool list: `09 Tools and Connectors.md`.

Every figure below names its tool and the date it was read, 20 Nov 2026. Search volumes are monthly estimates for the **United States** (OpenRush has no Russia market). They are vendor estimates, not counts.

## 1. Crawlers: Bing, Apple and GPTBot are refused on the homepage

Tested with curl on 20 Nov 2026 at 15:2x UTC, sending each crawler's published user-agent.

| Crawler | `/` | `/fair-prices.html` |
|---|---|---|
| Googlebot, YandexBot, DuckDuckBot | 200 | 200 |
| OAI-SearchBot, PerplexityBot, ClaudeBot | 200 | 200 |
| **bingbot** | **403** | 200 |
| **Applebot** | **403** | 200 |
| **GPTBot** | **429** | 200 |

- **Why it matters:**
  - Bing's index feeds ChatGPT search and Copilot.
  - Applebot feeds Siri and Spotlight.
  - Only the homepage is affected; inner pages pass.
- **Caveat:** these requests came from this sandbox, not from Microsoft's or Apple's addresses. A CDN that checks the requesting address may block fakes and still let the real crawlers through. Status: **unverified for real crawlers**. The test that settles it is the URL Inspection tool in Bing Webmaster Tools, run on `https://egybi.com/`.
- **Hostinger:** the CDN is on and the server cache is off (`hosting_websites_get-settings`). The Hostinger API has no bot-protection setting to read or change. If Bing's inspection also fails, ask Hostinger support to allow verified bingbot and Applebot on the CDN.

## 2. DNS: a Google verification record already exists

Read with Hostinger `dns_records_list`:
- `@ TXT "google-site-verification=e3MBrGkt1v4JSKAhhkqgXy1qFDrDUUjWpTvhw4S6OcI"` is present.
- There is no Bing record (`MS=…`) and no Yandex record (`yandex-verification: …`).

What to do:
1. In Search Console, open the `egybi.com` Domain property. If it already says "verified", Phase 0's Google step is done. If not, press Verify and the existing record should pass.
2. For Bing Webmaster Tools, the fastest route is "Import from Google Search Console", which needs no DNS change.
3. For Yandex Webmaster, choose DNS verification and copy the code. I can add the TXT record with the Hostinger connector, but it is a change to your DNS, so it needs your yes first. It cannot affect mail: the record is a new TXT entry, and the SPF, DKIM and MX records stay as they are.

## 3. AI citations: the baseline is zero

- **OpenRush `inspect_ai_visibility`** (Google AI Overview, US): egybi.com has **0 citations**, which is what you'd expect for a new site. Confidence 0.4 per the tool.
- **Ahrefs Domain Rating** (free endpoint): **0.0**.
- **Sources Google AI Overview cites** for "egypt travel cost" (OpenRush `discover_ai_citations`, US, top 10 of 20):

| Rank | Domain | Citations | Share |
|---|---|---|---|
| 1 | youtube.com | 1,384 | 19.8% |
| 2 | reddit.com | 720 | 10.3% |
| 3 | facebook.com | 624 | 8.9% |
| 4 | tripadvisor.com | 536 | 7.7% |
| 5 | google.com | 504 | 7.2% |
| 6 | egypttoursportal.com | 432 | 6.2% |
| 7 | expedia.com | 336 | 4.8% |
| 8 | en.wikipedia.org | 336 | 4.8% |
| 9 | instagram.com | 264 | 3.8% |
| 10 | tourradar.com | 264 | 3.8% |

**What this means for the plan:**
- The top three cited sources are YouTube, Reddit and Facebook. Together they make up 39% of citations.
- That supports what the calendar already does: recorded videos (`03`) and helpful Reddit answers with a disclosed link.
- It is a reason to put the three video scripts ahead of more pins.
- Re-run the same two calls on 1 Jan 2027, at the day-84 review, to see whether the count moved.

## 4. Search demand for the pages EgyBI already has

All figures are monthly US searches from OpenRush `research_keywords` (mode "suggestions"), read 20 Nov 2026.

| Seed | Top phrase | Volume | Peak month in the last 12 | EgyBI page |
|---|---|---|---|---|
| best time to visit egypt | best time to visit egypt | 5,400 | 9,900 (Nov 2025, Jan 2026) | `/visit/*.html` weather by month |
| pyramids of giza tickets | pyramids of giza tickets | 720 | 1,600 (Nov 2025) | `/fair-prices.html` |
| ramadan egypt | egypt during ramadan | 480 | 2,900 (Feb 2026) | holidays calendar |
| egypt trip cost | how much does a trip to egypt cost | 260 | 320 (Nov 2025, Jan 2026) | `/fair-prices.html`, `/dossier.html` |
| tipping in egypt | tipping in egypt | 210 | 390 (Jan 2026) | `/fair-prices.html` |

**Reading:**
- **"Best time to visit"** is 20× larger than any price phrase, and it peaks in November and January. That is now and in six weeks.
  - The weather-by-month pages should lead the December posts.
  - Each pin title should start with "Best time to visit …".
- **Ramadan** demand jumps about 6× in the month it starts: 480 normally, 2,900 in Feb 2026.
  - Ramadan 2027 is expected to begin around 8 Feb 2027. That date is an estimate, since the start depends on the moon sighting.
  - The 8 Feb key date in the calendar is right.
  - The Ramadan post should be ready by late January.
- **Phrases that look like Giza tickets but are not:**
  - "pyramids of giza tickets" also covers concert tickets ("tiësto …", "anyma …").
  - Use "entry ticket price" wording, not just "tickets".

## 5. YouTube hooks (vidIQ, read 20 Nov 2026)

- "travel to egypt": about 13,755 searches a month, competition 24/100.
- "egypt travel": about 9,000 a month.
- "egypt travel tips": under 750 a month.
- The most-searched Egypt *questions* on YouTube are history and explainer questions, not logistics. Three explainer questions are growing quickly:
  - "why 95% of egypt lives along the nile": +81.8%
  - "how egypt is building a 310 km artificial river…": +90.2%
  - "how ancient egypt cooled water in 50°c desert heat": +86.8%
- **Suggestion:** a fourth short video in the data-explainer style, made from charts already on `/explore.html`.
  - It needs no footage of monuments, so the no-AI-monuments rule is kept.
  - Its title still needs checking that every figure in it is on the site.

vidIQ balance: 160 of 170 credits left (this research used 10).

## 6. Site audit (OpenRush `audit_site`, 15 pages sampled out of 88 in the sitemap)

- **Score:** 97.8. No high-severity issues.
- **"Thin content" on `/ar/`, `/ar/ask.html` and `/ru/ask.html`: a counting artefact, not a real problem.**
  - The tool counted 25–33 words on these pages.
  - Counted locally with the same method as the English pages, they hold 1,184, 379 and 409 words.
  - The tool appears to miss Arabic and Russian words.
  - No action.
- **`/ar/` "no internal links":** the same sampling artefact, since the language switcher links it from every page.
- **Missing alt on `egypt-silhouette.svg`:** the image is decorative, so it correctly has `alt=""`. No action.

## 7. Hostinger agent-readiness scan

**Score: 74/100, grade C.** Scanned 20 Nov 2026 at 15:24 UTC.

| Area | Score |
|---|---|
| Crawl permission | 17/20 |
| Findability | 16/16 |
| Readability | 18/18 |
| Structured data | 12/14 |
| Commercial legibility | 11/12 |
| Agent-native content | 0/10 |
| Agent interaction | 0/10 |

Gaps worth fixing, all code changes on the site (a follow-up PR after #214 merges):

| Fix | Points |
|---|---|
| **`/llms.txt`**: a short Markdown summary of the site with links to its key pages. Low cost, aimed straight at AI answers. | +4 to +7 |
| **`Content-Signal` line in `robots.txt`**, e.g. `search=yes, ai-input=yes, ai-train=no`. Which values to use is your call. | +3 |
| **A "Contact" link on the homepage**: the mailto exists, but no link is labelled contact. | +1 |

Skipped:
- WebMCP tools, an MCP server card and Markdown negotiation: too much effort for a static site at this stage.
- Telephone and address in the Organization schema: personal data, so it is your call. A sole-trader site normally leaves them out.

## 8. What did not work

- **Reddit rules:** Firecrawl does not support reddit.com, and its Reddit search provider ignored the subreddit filter. I rated that result "bad", which refunded 1 credit.
  - Live subreddit rules stay **unverified**.
  - Read the sidebar of each subreddit before its first post.
  - Search shows r/EgyptTravelTips bans self-promotion and affiliate links outright. Do not post links there.
- **Telegram chat sizes:** TGStat pages do not show member counts to a scraper. Still **unverified**.
  - One figure found: the VK group "Египет Хургада Шарм Эль Шейх" shows **76.2K subscribers** (`vk.ru/egypt_oteli`, search snippet read 20 Nov 2026). It is a candidate for the Russian weekly card, if its rules allow posts by people who aren't advertisers.
- **Supermetrics:** connected, but Google Search Console inside Supermetrics is "NOT_AUTHENTICATED". It needs your sign-in through Supermetrics' own login link before it can read search data, and that only helps once the Search Console property is verified.
- **Ahrefs:** free plan. Only Domain Rating is open; keyword volumes and Brand Radar need a paid plan, so OpenRush covered keywords.
