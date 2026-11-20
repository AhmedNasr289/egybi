# 09 Tools and Connectors

> What each marketing tool would do for this campaign once connected, and what is already working. Checked 2026-11-20 with ListConnectors, SearchMcpRegistry, SearchPlugins and SearchSkills. Back to [[Home]] · plan: `reports/EgyBI marketing and distribution plan.md`.

## Already working in Claude sessions

| Tool | Used for |
|---|---|
| Google Sheets, Drive | The campaign spreadsheet (Calendar, Scorecard, KPIs, Weekly log) and the Drive folder with images, videos, kit docs and the `.ics` dates |
| GitHub | PRs, CI runs, merges (after CI passes) |
| Canva, Figma | Available for design edits; the data cards are built from site data by `images/_build` instead, so every figure matches the site |
| Higgsfield | Uploads work (`upload.higgsfield.ai` allowed); the Virality Predictor needs a paid plan |
| Notion | Available; not used, since the vault in this repo is the record |
| Claude Data dashboard | https://claude.ai/artifact/WB3QgSdERac3KdnC6hR7DZ, reading the spreadsheet live |

## Connected but missing a permission

| Connector | Fix | Unlocks |
|---|---|---|
| Gmail | claude.ai → Settings → Connectors → Gmail → reconnect and allow drafts/compose | The 10 pitches in `04` saved as drafts (never sent without you) |
| Google Calendar | Same, allow creating events | The five key dates (29 Nov, 8 Dec, 1 Jan, 8 Feb, 31 Mar) on your calendar; until then import `egybi-campaign-dates.ics` |

## Recommended to connect (cards shown 2026-11-20)

| Connector | Job in this plan |
|---|---|
| **Hostinger Connector** | egybi.com is on Hostinger: add the DNS TXT records that verify Search Console, Bing Webmaster Tools and Yandex Webmaster; check the CDN bot-protection setting behind the Bingbot/Applebot 403s |
| **Ahrefs** | Real keyword volumes in EN/RU/AR, competitor rankings, and Brand Radar: which domains AI answers cite (the 20-prompt panel in `06`) |
| **OpenRush** (or Ubersuggest, cheaper) | Keyword research, rank tracking for the 18 site pages, `discover_ai_citations` |
| **Supermetrics** (or Windsor.ai) | Read Search Console and social analytics into the Weekly log once accounts exist |
| **vidIQ** | Research Egypt-travel short videos and hooks before recording the scripts in `03` |
| **Firecrawl** | Read pages this sandbox cannot reach: subreddit rules, TGStat chat sizes, Etsy listings, competitor pages |
| **Intuit Mailchimp** (or beehiiv) | Only if The Papyrus moves off the site's own mailer: the five welcome emails in `05` as an automation |
| **PayPal** | Check payouts and payments once the $12 pack sells through PayPal on Payhip |

## Recommended plugins (card shown 2026-11-20)

| Plugin | Job |
|---|---|
| **Marketing** (Anthropic) | `campaign-plan`, `seo-audit`, `competitive-brief`, `email-sequence`, `performance-report` skills for the weekly reading and the monthly review |
| **Social Media Skills** | Platform-specific growth, `ai-search-optimization`, `batch-content-plan` for refreshing the calendar after week 6 |
| **Ayrshare** | Schedule the approved Calendar rows to Pinterest, LinkedIn, X, Instagram, TikTok and more in one place, from the Calendar tab, after your approval of each |

## Plugin servers that fail to connect here

They fail because this cloud environment's network blocks their hosts (ERR_PROXY_TUNNEL), not because anything is misconfigured.
- **Adobe for creativity**: `adobe-creativity.adobe.io` added to the `egybi` environment on 2026-11-20. Plugin servers connect when a session starts, so it works from the next session (after an Adobe sign-in): social-size variations and Adobe Express designs.
- **Slack, Asana, Linear, Atlassian, Intercom, Amplitude, Hex, Definite, PagerDuty:** not used by this campaign, so their hosts were left blocked.

## Network hosts allowed in the `egybi` environment, and why

`egybi.com`, `www.egybi.com` (crawler checks, deploy checks) · `suggestqueries.google.com`, `suggest.yandex.ru` (autocomplete demand mining) · `upload.higgsfield.ai` (video upload) · `www.mota.gov.eg` (the Ministry ticket price list) · `adobe-creativity.adobe.io` (Adobe plugin). Requests to add `www.reddit.com`, `old.reddit.com`, `tgstat.ru` and `trends.google.com` were refused by the environments service; Firecrawl is the route for those.
