# SEO, GEO, digital PR, partnerships and marketplaces for EgyBI (researched 2026-11-19)

Method note: about 18 web searches, run on 2026-11-19. Most snippets come from SEO/PR vendor blogs, which have commercial reasons to inflate numbers. Primary docs are flagged where found (Google Search Central, OpenAI, Perplexity, Google Business Profile help, Gumroad help, Muck Rack). The direct fetch of developers.openai.com failed because the session network does not allow that host, so OpenAI wording comes from search snippets of its own docs page. Treat every vendor percentage as indicative, not settled.

## 1. SEO in 2026 with AI Overviews: what still works for a small travel site

### Takeaway
Travel informational queries are among the most exposed to AI Overviews (AIO), and position-1 click-through rate on AIO queries has fallen sharply. Google officially says no special optimisation is needed beyond normal SEO. For a site of about 89 URLs, the levers that still work are: crawlability (the Hostinger bot-check is a real risk), original dated data, freshness, and avoiding anything that looks like scaled templated pages. Bing matters disproportionately because it feeds ChatGPT and Copilot.

### Cited Findings
- **Randomised field experiment.** AIO cut organic clicks on triggered queries by 38%, with user experience ratings unchanged. — [Search Engine Journal](https://www.searchenginejournal.com/ai-overviews-cut-organic-clicks-38-field-study-finds/)
- **Ahrefs (vendor).** Position-1 CTR on AIO keywords fell from 7.3% (Mar 2024) to 2.6% (Mar 2025) to 1.6% (Dec 2025). — via [searchlab.nl aggregator, updated 6 Nov 2026](https://searchlab.nl/en/statistics/ai-overviews-sge-statistics-2026)
- **Seer Interactive (vendor).** AIO-query organic CTR rose 85% from Dec 2025 to Feb 2026, from a very low base. Seer calls it "leveling off", not a recovery. — [DesignRush](https://news.designrush.com/ai-overview-ctr-recovers-organic-search-loses-ground); [Stellar Search](https://www.stellarsearch.co.uk/insight/ai-overviews-ctr-61-drop-signs-of-recovery-or-both)
- **Travel-specific figures conflict:**
  - One agency dataset puts AIO appearance on travel/hospitality queries at 74% (Mar 2026), with a -36% YoY organic traffic loss. — [Visionary Marketing](https://visionary-marketing.co.uk/blog/ai-overviews-traffic-impact-2026)
  - Another aggregator gives travel at -17% on AIO queries. — [searchlab.nl](https://searchlab.nl/en/statistics/ai-overviews-sge-statistics-2026)
  - BrightEdge put travel AIO saturation at 38% (May 2025). — same aggregator
  - These sources do not reconcile and their methods are unclear.
- **Google primary doc, "AI features and your website".** There are "no additional requirements to appear in AI Overviews or AI Mode, nor other special optimizations necessary". The core checklist:
  - allow crawling in robots.txt **and by any CDN or hosting infrastructure**
  - make content findable through internal links
  - provide a good page experience
  - AI-feature appearances are counted in Search Console totals
  - nosnippet and max-snippet apply to AI features
  - [Google Search Central](https://developers.google.com/search/docs/appearance/ai-features)
- **Second Google doc, "Optimizing your website for generative AI features on Google Search" (15 May 2026).** Reportedly says these features use the same index and ranking systems, and that no special file (such as llms.txt) is required. Seen only via third-party write-ups. — [SEJ](https://www.searchenginejournal.com/googles-official-advice-on-optimizing-for-ai-overviews-ai-mode/547341/); [ppc.land](https://ppc.land/googles-new-guide-for-ai-search-what-seo-really-needs-now/)
- **Spam updates in 2026.** Google ran June, August and September spam updates. Scaled content abuse was in scope for the 24 Sep 2026 update. One August case study involved a site with 1.5M+ URLs treated as scaled content abuse despite human involvement. The policy is technology-neutral: it is about many low-value pages, however they are made. — [ppc.land on 3rd 2026 spam update](https://ppc.land/googles-third-spam-update-of-2026-hits-every-language-and-region/); [GSQI case studies](https://gsqi.com/marketing-blog/august-2026-google-spam-update-case-studies/); [ppc.land scaled content abuse](https://ppc.land/scaled-content-abuse/)
- **hreflang (Google doc).** Google's doc on localized versions is the reference. Common practice:
  - every language version lists every other version plus itself, reciprocally
  - an x-default page is added as the fallback
  - Google's 2023 blog says x-default is underused and shows how it routes unmatched users
  - The claim that Google ignores the whole cluster when tags are not reciprocal comes from a tool vendor and is not confirmed by Google.
  - [Google: localized versions](https://developers.google.com/search/docs/advanced/crawling/localized-versions); [Google blog: x-default](https://developers.google.com/search/blog/2023/05/x-default)
- **Bing and ChatGPT.** SEO-industry analyses estimate roughly 70–87%+ of ChatGPT Search citations trace back to Bing's index. These are vendor estimates, not OpenAI statements.
  - Common advice: verify in Bing Webmaster Tools, submit the sitemap, push URLs via IndexNow.
  - Bing Webmaster Tools launched an "AI Performance" report (public preview, 10 Feb 2026) showing Copilot/Bing AI citations of your pages.
  - [icoda](https://icoda.io/ai/chatgpt-seo-visibility/); [Stackmatix](https://www.stackmatix.com/blog/bing-webmaster-tools-chatgpt); [geotoolbox](https://geotoolbox.ai/blog/bing-webmaster-tools)

### Inferences
- **The Hostinger bot-check page is probably the single highest-priority technical fix.** Google explicitly names CDN/hosting blocking as a barrier. A JS challenge served to Googlebot, Bingbot, OAI-SearchBot or PerplexityBot would suppress indexing and AI citation at the same time. Check server logs and Bing/Google URL Inspection for challenge responses, then whitelist verified bot IPs or turn off the bot-fight mode.
- **The 18 per-site "hours and weather by month" pages fit the scaled-content risk pattern only if they are thin and templated.** Keep them, but make each one unique:
  - site-specific cited facts (ticket price with date, crowd timing, shade or heat notes)
  - a visible "last verified" date
  - original data
  - Do not multiply them into hundreds of programmatic variants (site × month × language) without unique substance.
- **Trilingual hreflang (en/ar/ru plus x-default→en) is low-effort and worth verifying.** Arabic and Russian travel queries probably face less competition and less AIO saturation than English, though no source measured this. That makes RU (Russian is a major source market for Egypt tourism) and AR potentially easier wins.
- **Yandex:** no 2026 source was found. It is plausibly relevant for the RU pages. IndexNow already covers Yandex, as it is an IndexNow participant (from general knowledge, unverified here).
- **Bing Webmaster Tools AI Performance report** is a free way to see whether Copilot cites EgyBI, which is useful because traffic is tiny.

### Gaps
- No rigorous travel-only AIO CTR study. Travel figures conflict (−17% vs −36%).
- Could not read Google's 15 May 2026 generative-AI guide directly.
- No 2026 data on Yandex share among Russian travellers to Egypt.
- No data on AIO frequency for Arabic or Russian queries.

## 2. GEO: crawlers, llms.txt, citable content structures, third-party mentions

### Takeaway
Allow the search/citation bots (OAI-SearchBot, PerplexityBot, Claude-SearchBot, Bingbot, Googlebot, Applebot). The training-only tokens (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended) are an owner preference and do not gate citations. llms.txt shows no measurable citation effect in 2025–26 studies; it costs nothing, but do not expect anything from it. What correlates with being cited: freshness or recent updates, clear heading structure and lists, original data, and presence on the third-party platforms LLMs lean on (Reddit, Wikipedia, YouTube).

### Cited Findings
- **OpenAI (primary doc, via search snippet).** OAI-SearchBot is used to surface websites in ChatGPT search. Sites that opt out "will not be shown in ChatGPT search answers, though can still appear as navigational links". OpenAI recommends allowing it. robots.txt changes take about 24 hours to take effect. GPTBot is the training crawler and is controlled independently. ChatGPT-User is not used to decide Search inclusion. — [OpenAI bots docs](https://developers.openai.com/api/docs/bots)
- **OpenAI revised its crawler docs.** It dropped robots.txt compliance language for ChatGPT-User. This is a secondary report. — [ppc.land](https://ppc.land/openai-revises-chatgpt-crawler-documentation-with-significant-policy-changes/)
- **Perplexity (primary doc).** It recommends allowing PerplexityBot to appear in results and publishes IP ranges. Perplexity-User is a user-triggered fetcher that "generally ignores robots.txt". Secondary sources say neither bot is used for training. — [Perplexity crawlers doc](https://docs.perplexity.ai/docs/resources/perplexity-crawlers.md)
- **Anthropic.** Third-party directories say Anthropic documents three agents, each controlled independently:
  - ClaudeBot (training)
  - Claude-SearchBot (search)
  - Claude-User (user-triggered)
  - "anthropic-ai" and "Claude-Web" are legacy names.
  - I did not confirm this against Anthropic's own page. — [anagram.ai](https://www.anagram.ai/blog/ai-crawler-user-agent-list-2026-14-bots-and-robotstxt-tokens-to-know); [eseospace](https://eseospace.com/blog/ai-crawlers-robots-txt/)
- **Google-Extended and Applebot-Extended are robots.txt control tokens, not separate crawlers:**
  - Google-Extended governs Gemini training/grounding and does not affect Search inclusion or ranking.
  - Blocking it does **not** remove content from AI Overviews. nosnippet does that.
  - Pages that disallow Applebot-Extended can still appear in Apple search results.
  - [robotstxt.com](https://robotstxt.com/ai); [geotoolbox](https://geotoolbox.ai/blog/ai-crawlers)
- **llms.txt:**
  - SE Ranking (vendor), about 300k domains (Nov 2025): no correlation between llms.txt and AI citation frequency. The model predicted better with the variable removed. — [SEJ](https://www.searchenginejournal.com/llms-txt-shows-no-clear-effect-on-ai-citations-based-on-300k-domains/); [SE Ranking](https://visible.seranking.com/blog/llms-txt/)
  - Trakkr: llms.txt present on 13.3% of 37,894 AI-cited domains (Mar 2026). — [Something Inc summary](https://somethinginc.com/blog/does-llms-txt-work-2026-data/)
  - Several sources say Google has stated llms.txt does not affect Search or AI Overviews, but the date and form of that statement are inconsistent and unverified.
- **Freshness:**
  - Seer Interactive: 75% of LLM-cited pages were updated within the past year and 88% within two years. Only 42% were *published* within the year, so updates count. — [Seer](https://www.seerinteractive.com/insights/study-content-recencys-impact-on-ai-visibility-in-2026)
  - Ahrefs (about 17M citations, secondhand): AI-cited content is about 25.7% fresher than organic results. The viral "4.3x more cited if fresh" figure has no traceable primary study. — [nogood.io](https://nogood.io/blog/content-freshness-ai-citations/)
  - AuthorityTech (vendor): 50% of AI citations come from content less than 13 weeks old. — [authoritytech](https://authoritytech.io/blog/content-freshness-seo-ai-2026)
- **Structure (AirOps, vendor).** 68.7% of ChatGPT-cited pages follow a logical heading hierarchy, 87% use a single H1, and about 80% include lists. Ahrefs (secondhand) found word count barely correlates with citation. — [AirOps 2026 State of AI Search](https://www.airops.com/report/the-2026-state-of-AI-search); [ppc.land 23 factors](https://ppc.land/23-factors-that-actually-get-your-content-cited-by-ai-search-engines/)
- **Third-party platforms:**
  - Semrush: Reddit and Wikipedia were ChatGPT's top two cited domains, even after a sharp drop in Sep 2025. — [Semrush](https://www.semrush.com/blog/most-cited-domains-ai/)
  - Profound (680M citations, Aug 2024–Jun 2025, via secondary summary): Reddit was 46.7% of Perplexity's top-10 sources and 21% of Google AIO's; Wikipedia was 47.9% of ChatGPT's top-10.
  - Search Engine Land warns that the "you need a Reddit/Wikipedia strategy" conclusion is misleading at domain level. — [Search Engine Land](https://searchengineland.com/reddit-wikipedia-what-drives-ai-recommendations-472580); [SEL: Reddit/YouTube/LinkedIn most cited](https://searchengineland.com/ai-search-engines-cite-reddit-youtube-and-linkedin-most-study-473138)
  - Semrush with Worldcom (May 2026): 6 of the top 15 cited domains are social, video or community platforms. — [Worldcom/Semrush PDF](https://worldcomgroup.com/wp-content/uploads/2026/06/Worldcom-with-Semrush-Report-Where-Trust-Surfaces-2026-Final.pdf)

### Inferences
- **Recommended robots.txt:**
  - Keep "allow all".
  - Explicitly list Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Claude-User and Applebot.
  - Decide on the training tokens (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended) as a values question. For a tiny site that wants to be *known*, allowing training is a mild plus, because models learn "EgyBI = Egypt prices/hours source".
- **Ship llms.txt only as a cheap curated index of the data pages.** Do not count it as a lever.
- **EgyBI's dated, cited fair-prices page and daily EGP and food-price series are well suited to citation**: fresh, numeric, sourced. Two changes help:
  - Put a one-sentence answer and the figure near the top of each page.
  - Use a visible "Updated YYYY-MM-DD" stamp, matching dateModified in JSON-LD.
- **Reddit (r/EgyptTravel, r/travel, r/digitalnomad) is likely the highest-leverage third-party surface for citations.** Answer questions genuinely, with data, and link only when it directly answers the question.

### Gaps
- Could not fetch OpenAI or Anthropic crawler docs directly, so the exact current UA tokens need verifying on the vendors' pages.
- No study isolating what gets *travel* sites cited.
- No primary data on Gemini or Copilot citation sources specifically.

## 3. Digital PR, data journalism and expert-quote platforms

### Takeaway
Journalists still rely on pitches; Muck Rack 2026 says most of their work starts with one. They overwhelmingly discard off-beat pitches, and they value original data. EgyBI's dated, cited datasets are a strong fit if each pitch is narrow, timely and beat-matched. The HARO successors have fragmented: Source of Sources is free; Qwoted and Featured are freemium or paid with unclear tiers.

### Cited Findings
- **Muck Rack State of Journalism 2026.** Released 19 Mar 2026; 1,044 journalists surveyed 30 Jan–2 Mar 2026, 897 responses analysed. 82% of journalists use AI. — [GlobeNewswire release](https://www.globenewswire.com/news-release/2026/3/19/3259178/0/en/Muck-Rack-s-2026-State-of-Journalism-Report-Finds-82-of-Journalists-Use-AI.html); [report PDF](https://media.muckrack.com/documents/State_of_Journalism_2026_1.pdf); [muckrack.com/stateofjournalism](https://muckrack.com/stateofjournalism/)
- **Secondary write-ups of the report:**
  - 86% say at least some of their work began with a PR pitch.
  - Figures on pitch relevance conflict: 43% vs 47% say pitches are seldom or never relevant, and an 88% "immediately disregard off-beat pitches" figure circulates.
  - Original research and data, and access to sources, rank among the most valued pitch elements.
  - [PR Daily](https://www.prdaily.com/journalists-want-your-help-but-say-most-pitches-miss-the-mark/); [UMN UMarComm](https://umarcomm.umn.edu/blog/2026/04/13/pitching-journalists-muck-racks-state-journalism-2026); [Matter](https://www.matternow.com/blog/examining-muck-racks-state-of-journalism-in-2026-report/)
- **HARO landscape.** Connectively (ex-HARO) shut down on 9 Dec 2024. Featured.com bought the HARO brand in Apr 2025 and relaunched it as paid. — [blckalpaca](https://blckalpaca.at/en/knowledge-base/seo-geo/off-page-seo-link-building/haro-alternatives-2026-featured-qwoted-and-source-of-sources)
- **Source of Sources** (Peter Shankman): free. — [Siege Media](https://www.siegemedia.com/marketing/haro-alternatives)
- **Qwoted:** a free plan exists. Paid prices are reported as "$49/mo" or "$149/mo", which conflict. — [stork.ai](https://www.stork.ai/blog/haro-alternatives-2026); [Backlinko](https://backlinko.com/haro-alternatives)
- **Featured.com:** paid tiers reported at €49+ or $99/mo, which conflict. One guide warns many links land on Featured's own content network rather than tier-one outlets. — [eseospace](https://eseospace.com/blog/haro-alternatives-for-link-building-in-2026-7-platforms-to-earn-editorial-links/)
- **Wikipedia.** COI guidance tells editors to avoid linking from articles to their own organisation's website (see WP:Spam), to be cautious about citing their own work, and to propose citations on the talk page instead. Several marketing guides say adding links to sites you own or represent breaches the External Links guideline. I read drafts and mirrors, not the live policy text. — [WP:COI draft](https://www.wikipedia.org/wiki/Wikipedia:Conflict_of_interest/draft); [Simple WP:COI](https://simple.wikipedia.com/wiki/Wikipedia:COI); [eseospace on Wikidata/Wikipedia for GEO](https://eseospace.com/blog/wikidata-and-wikipedia-for-geo/)

### Inferences
- **Pitch structure** (inferred from Muck Rack's emphasis on relevance and data):
  - One finding in the subject line, e.g. "EGP lost X% vs USD since July 2026; a koshary now costs Y".
  - Two or three numbers, method, sources and dates.
  - A link to the embeddable SVG chart, with free reuse and attribution.
  - An offer of a Cairo-based quote.
  - Under 150 words, sent to the specific reporter who covers economy or tourism. Do not use a generic desk address.
- **Outlet fit:**
  - Ahrefs-style economics desks at Ahram Online, Egypt Independent and Egyptian Streets suit the pound and food-price stories. Arabic-language versions open Al-Masry Al-Youm and Masrawy.
  - Lonely Planet, Condé Nast Traveller and Time Out suit service angles: heat at Abu Simbel by month, entry-ticket price rises with dates, "what things really cost".
  - Time the pitches to news hooks: ticket-price announcements, devaluations, the summer heat wave, the Grand Egyptian Museum news cycle.
- **Expert-quote platforms:** start with free Source of Sources and Qwoted's free tier, and position the owner as "Cairo-based travel-data analyst". Skip paid Featured until a free channel has proven out.
- **Wikipedia:** do not add EgyBI links yourself. Suggest on talk pages only where EgyBI is the best citable source for a dated figure. Better still, get the data cited by a news outlet that Wikipedia editors then use. Wikidata (official website property for the entity) is out of scope until EgyBI itself is notable.

### Gaps
- No Egypt-specific journalist survey or outlet acceptance rates found.
- Could not verify Featured or Qwoted pricing or free-tier limits as of Nov 2026.
- No data on Help a B2B Writer in 2026.
- No travel-newsletter pitching benchmarks found.

## 4. Partnerships and link-earning (local, guides, bloggers, academia, communities, Google Maps)

### Takeaway
Google Business Profile is **not available** to EgyBI as an online-only site. The local route is physical distribution through partners (QR cards at hostels and guesthouses) and partner mentions or embeds. I found no studies quantifying hostel QR or Egyptology-department partnerships, so these are untested tactics to measure with UTM-tagged QR codes.

### Cited Findings
- **Google Business Profile.** Online-only businesses with no physical location customers visit, and no in-person visits to customers, are ineligible. — [Google Business Profile eligibility guidelines](https://support.google.com/business/answer/13763036); [GBP policies overview](https://support.google.com/business/answer/13762416?hl=en)
- **Google's AI features doc** stresses discoverability through links and internal links as the base requirement for appearing in AI features. — [Google Search Central](https://developers.google.com/search/docs/appearance/ai-features)
- **Third-party mention platforms** (Reddit, YouTube, community sites) dominate LLM citations, so mentions there matter beyond backlinks. — [Semrush/Worldcom 2026](https://worldcomgroup.com/wp-content/uploads/2026/06/Worldcom-with-Semrush-Report-Where-Trust-Surfaces-2026-Final.pdf)

### Inferences
- **Hostels and guesthouses (Cairo, Luxor, Aswan, Dahab):** offer a free co-branded A6 QR card or poster ("today's fair prices + site hours"), with a UTM per property. Ask for a link from their "local tips" page in return; that link is a genuine local backlink. The partners do not need GBP; theirs already exist and can list EgyBI in their own posts.
- **Licensed guides and tour operators:** offer embeddable price and heat widgets, or a "verified by a licensed guide" quote line. That gives them content and gives EgyBI a link plus E-E-A-T signals.
- **Travel bloggers:** the SVG charts with attribution links are the natural link-earning asset ("embed this chart"). Guest posts should carry original data, not generic copy, to avoid looking like link schemes.
- **Egyptology departments** (Cairo University, AUC, Ain Shams): the hieroglyph name studio and the cited opening-hours data may suit outreach or student-resource pages. Unproven.
- **Expat and nomad communities** (Facebook groups, r/cairo, Dahab nomad groups) and newsletter swaps: contribute data answers. These double as GEO third-party mentions.

### Gaps
- No case studies or conversion data on QR cards in hostels.
- No data on Egypt tour-operator partnership terms.
- No evidence on .edu link likelihood for Egyptology departments.

## 5. Marketplaces for a $12 digital travel pack, and newsletter growth

### Takeaway
Etsy, Payhip and Gumroad all support itinerary-style digital downloads. Gumroad Discover reportedly takes a much larger cut (about 30%, secondary sources). I found **no credible unit-sales benchmarks** for travel itineraries; treat every "$10k/month" claim as marketing. For the newsletter, beehiiv's Recommendations and Boosts are the most documented cross-promo engine, but all figures are vendor-reported.

### Cited Findings
- **Payhip** markets a free storefront for travel itineraries plus listing on its marketplace. — [Payhip](https://payhip.com/sell-travel-itineraries)
- **Fees** (third-party, verify on each platform): Etsy about 6.5% plus listing fee; Gumroad 2.9–10% + $0.30; Payhip 0–5%. One vendor estimates net on a $12 guide at about $10.41 on Etsy and about $9.65 via a direct Gumroad link. — [insightagent](https://www.insightagent.app/guides/where-to-sell-digital-products-etsy-vs-other-platforms); [inkfluenceai](https://www.inkfluenceai.com/how-to-sell-travel-guides)
- **Price points:** travel planners listed at about $7–19 on Etsy; Notion travel templates on Gumroad mostly at $8–10 with few or no reviews. These are listings, not sales. — [marketsy.ai Gumroad trends](https://marketsy.ai/tools/gumroad-trends/category/Notion%20travel)
- **Gumroad Discover:**
  - The official help article says payout settings must be filled in.
  - Third-party sources add: at least $10 of prior sales, a risk review, products priced at $100 or less, and a flat 30% fee on Discover sales.
  - [Gumroad help: Discover](https://gumroad.com/help/article/79-gumroad-discover); [lilachbullock fees](https://www.lilachbullock.com/gumroad-fees/)
- **Volume:** no credible travel-itinerary sales benchmark found. One Gumroad seller anecdote reports 5,800 sales since 2020 across simple products, not travel. — [travelpayouts overview](https://travelpayouts.com/blog/selling-digital-products)
- **beehiiv (vendor) 2026 State of Newsletters:** newsletters using Recommendations grew 2.75x faster on average; Boosts added an average of 84 subscribers per month. Boosts cost about $1–3 per subscriber (third-party; about $1.63 average). — [beehiiv State of Newsletters 2026](https://www.beehiiv.com/blog/beehiiv-the-state-of-newsletters-2026); [beehiiv Recommendations](https://www.beehiiv.com/grow/recommendations)
- **Substack:** creators credit community and recommendation tools for subscriber gains. Third-party review: Substack sent 32M new subscribers to writers in Q4 2025, with no breakdown by recommendation. — [Digiday](https://digiday.com/media/substack-creators-attribute-their-boost-in-subscribers-to-the-platforms-community-tools)

### Inferences
- **Etsy** has the strongest buyer search intent for "Egypt itinerary", but it is crowded. **Payhip** is cheapest as the canonical store. **Gumroad Discover** is a low-cost extra listing once the $10 threshold is met.
- **Amazon KDP:** not researched in depth. It suits a printable or e-book version and adds a high-authority listing that LLMs may cite.
- Plan for single-digit to low-tens of sales a month until organic traffic grows. This is an inference from the absence of benchmarks and the few reviews on comparable listings, not a sourced figure.
- **Newsletter, seasonal Oct–Apr peak:**
  - Lead magnet: a free "Egypt prices & heat cheat-sheet" PDF from the data pages.
  - Use the beehiiv Recommendations network to swap with Middle East or budget-travel newsletters.
  - Add a referral reward, e.g. 3 referrals unlocks the $12 pack.
  - Ask hostel QR cards to point to signup.

### Gaps
- No realistic 2026 sales data for Egypt or travel itinerary packs on any marketplace.
- No independent (non-beehiiv) data on Recommendations or Boosts effectiveness.
- Amazon KDP travel-guide economics not researched.
- No travel-newsletter-specific growth benchmarks found.
