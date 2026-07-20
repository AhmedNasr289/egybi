# EgyBI — Launch Posts & Growth Kit

Ready-to-post copy for launch day. **Every number here is verified** against the
live build (123 challenges = 41 Easy / 53 Medium / 29 Hard, 15 sectors, 61 tables
/ 838 rows). Keep it that way — the whole product promise is "every fact real
and cited," so the marketing has to hold the same standard.

**The core hook:** *a SQL practice platform where every dataset is real, cited
Egyptian history and economics — not `employees` and `orders` toy tables.*

---

## 1 · LinkedIn — THE POST TO PUBLISH (search-aware version, 2026-07-20)

Every figure re-verified against the live database on 2026-07-20. If any changes,
change this too — the product's whole claim is that its numbers are real, so the
marketing cannot be the one place that slips.

### Read this before optimising further

A LinkedIn post is a **weak SEO asset** and it is worth being honest about that.
It can rank for your brand name and it does get indexed from a public profile,
but it will not outrank a dedicated page for "sql practice" — nothing on
LinkedIn will. The pages that actually earn search traffic are already built:
**123 challenge pages** at `/practice/<slug>.html`, each targeting a distinct
query intent ("rank the longest reigns", "year-over-year GDP change (window
function)"), plus 12 story pages and the sitemap's 144 URLs.

So this post is optimised in the order that actually pays:
1. **Engagement first** — on LinkedIn, reach comes from comments and dwell time,
   not keywords. A keyword-stuffed opener would be seen by fewer people, which
   costs more traffic than any term it could win.
2. **Keywords woven in second** — the terms people really search (practice SQL,
   learn SQL, window functions, joins, CTEs, data engineering, business
   intelligence) appear naturally in the body, where they help LinkedIn's own
   search and Google's snippet without deadening the copy.
3. **Hashtags last** — LinkedIn's native topic discovery. Four, not fifteen.

The first ~155 characters are what shows before "…see more", and what Google
tends to lift as the snippet. The hook is built to land inside that window.

---

> Thirty-three ancient Egyptian obelisks survive. Only fifteen are still in
> Egypt. Nine are in Italy. The tallest one standing anywhere is in Rome, not
> Luxor.
>
> And the largest ever cut never rose at all — it cracked in the Aswan quarry
> and has been lying there ever since, nearly 42 metres of granite.
>
> I learned that by running a SQL query, not by reading an article. That is the
> whole idea.
>
> Every SQL course I took handed me the same invented `employees` table. So I
> built the opposite, solo, nights and weekends: a free SQL practice platform
> where every dataset is real, cited Egyptian data. Pharaoh reigns and dynasties.
> Suez Canal traffic. GDP, inflation, tourism arrivals. The New Administrative
> Capital, Benban solar, the startup scene. Today's food prices, pulled daily
> from the Egyptian Cabinet's own portal. Antiquity to this morning, every row
> carrying its source.
>
> 123 auto-graded SQL challenges across 15 sectors — 41 Easy, 53 Medium, 29
> Hard — from a first SELECT through joins, CTEs and window functions. Each one
> shows you the schema and sample rows before you start, so you are never
> guessing at column names. 61 tables, 838 rows.
>
> And where sources genuinely disagree — Egypt's population is 116 million or
> 107 million, depending on who counted — both are kept and the gap flagged, not
> quietly resolved into the tidier number.
>
> It runs entirely in your browser — SQLite compiled to WebAssembly, so your
> query never reaches a server. No signup, free, and you are solving roughly
> four seconds after landing.
>
> You do not have to write a query, though. There are 23 charts and 12 data
> stories to read. It is not a history site, but if you came for Egypt rather
> than SQL — the history, or where the country is actually heading — there is
> something here worth your time.
>
> If you teach SQL, are learning it, or hire for data roles — I would genuinely
> value your read on the difficulty curve. I suspect my window-function set is
> too easy.
>
> #SQL #DataEngineering #BusinessIntelligence #Egypt

---

### First comment (post this immediately after)

LinkedIn suppresses posts carrying an external link, so the link goes here, then
gets edited into the post about an hour later once reach has settled. This
comment is also indexable, so it carries the terms the post itself keeps light:

> The obelisk numbers in the post are not trivia I looked up — they are the
> answer to one of the challenges, so you can run the query yourself:
> https://egybi.com/practice/obelisks-still-in-egypt.html
>
> And if you would rather not write SQL, the same stones are a five-minute read:
> https://egybi.com/papyrus/the-stones-that-left.html
>
> All 123 challenges have their own page, so you can jump straight to a
> technique — window functions, CTEs, anti-joins, running totals — and each one
> explains the schema before you start. Free, no signup, runs in the browser.

Note the challenge pages live at `/practice/<slug>.html`, **not** `/challenge/` —
an earlier draft of this section named a path that does not exist. Both URLs
above were checked live (200).

---

### Posting notes

- **Tue–Thu, ~9–11am Cairo.**
- **Answer every reply for the first two hours.** This matters more than the
  copy, the keywords and the hashtags combined.
- The closing question is not decoration — it is what earns comments, and
  comments are what earn reach. Ask it sincerely and reply properly.
- No emojis. The audience is senior data people.
- **The higher-leverage SEO action is not this post.** Submit
  `https://egybi.com/sitemap.xml` in Google Search Console. 144 URLs that
  currently rank for nothing will start being crawled, and those pages — unlike
  a LinkedIn post — compound.

---

## 2 · Reddit

**Read each subreddit's self-promo rules first.** Reddit punishes anything that
smells like marketing. Be a person, disclose it's yours, lead with the artifact.

### r/SQL and r/learnSQL
**Title:** `I built a free SQL practice site where every dataset is real Egyptian history and economics instead of fake "employees" tables`

> I got tired of practising SQL against invented `employees` / `orders` data, so
> I spent the last few months building a practice site on real, sourced data
> instead — pharaoh reigns and dynasties, Suez Canal traffic, GDP/inflation
> series, tourism arrivals, governorate census figures, and daily retail food
> prices pulled from the Egyptian Cabinet's price portal.
>
> - 123 auto-graded challenges: 41 easy, 53 medium, 29 hard, across 15 sectors
> - Runs fully in-browser (sql.js) — your query never hits a server, and there's
>   no signup to start solving
> - Every answer ends with a sourced "did you know" note tied to the data
> - Free. I'm the solo dev.
>
> Where I'd love feedback: are the medium/hard problems actually at the right
> difficulty? I think my window-function set may be too easy.
>
> egybi.com

### r/dataengineering
Same body, but lead with the pipeline angle — that crowd cares about the plumbing:

> …the data isn't a static dump: a scheduled job refreshes World Bank indicators
> monthly and Egyptian retail prices daily, rebuilds the SQLite knowledge base,
> and auto-deploys. Happy to talk about the ingestion design.

**Other subs:** r/BusinessIntelligence, r/analytics, r/Egypt (community angle —
"I turned Egypt's open data into a SQL playground"), r/SideProject.

---

## 3 · Show HN (Hacker News)

**Title:** `Show HN: SQL practice on real, cited Egyptian data (runs in the browser)`

> I built a SQL practice platform where every table is real, sourced data about
> Egypt — dynasties and pharaoh reigns, Suez Canal traffic, GDP and inflation,
> tourism, governorate demographics, daily retail prices — rather than synthetic
> `employees`/`orders` tables.
>
> 123 auto-graded challenges across 15 sectors, 61 tables / 838 rows.
>
> Technical bits that may interest HN:
> - No framework and no build step — vanilla HTML/CSS/JS on shared PHP hosting.
> - Queries execute client-side via sql.js (SQLite compiled to WASM), so there's
>   no server-side SQL execution to sandbox, and no signup to start.
> - The knowledge base ships as a committed SQLite file; scheduled jobs refresh
>   World Bank indicators monthly and Egyptian retail prices daily, rebuild the
>   DB with an integrity check, and auto-deploy only if it passes.
> - Analytics are first-party and cookieless (daily-rotating hashes, no IPs
>   stored), so there's no consent banner.
>
> It's free. Feedback on the challenge difficulty curve especially welcome.

*Post Tue–Thu ~8–10am US Eastern. Stay in the thread and answer everything.*

---

## 4 · X / Twitter (thread)

1/ Every SQL course makes you query a fake `employees` table.
I built one where the data is real: pharaoh dynasties, Suez Canal traffic, GDP,
tourism, daily Egyptian food prices. 🇪🇬
123 auto-graded challenges, free, no signup → egybi.com

2/ It runs entirely in your browser. sql.js (SQLite via WASM) executes your
query client-side — nothing hits a server. You're solving ~4 seconds after
landing.

3/ There's XP, daily streaks, and a rank ladder from Egypt's original data
workers: Apprentice Scribe → Cord-Stretcher → Master Scribe → Keeper of the
House of Life → Vizier of Data.

4/ Every dataset is cited, and the live ones stay live: World Bank indicators
refresh monthly, Egyptian retail prices daily — auto-rebuilt and deployed.

5/ Free, solo-built. If you teach SQL or hire for data roles, I'd love your read
on the difficulty curve. egybi.com

---

## 4b · The obelisk hook (strongest single-fact opener)

Added since the kit was written, and the most shareable fact in the database.
Works as a standalone post on any channel, and needs no product pitch:

> Thirty-three ancient Egyptian obelisks survive.
> Only fifteen are still in Egypt.
>
> Nine stand in Italy. Four in the UK. One each in France, the US, Turkey,
> Poland and Vatican City.
>
> The tallest still standing anywhere is in Rome, not Luxor.
> The largest ever cut never rose at all — it cracked in the Aswan quarry
> and lies there still, at nearly 42 metres.
>
> I put the whole table online so you can query it yourself: egybi.com

Pair it with the full write-up at egybi.com/papyrus/the-stones-that-left.html
— that page is a real URL now, so it can be shared on its own.

## 5 · Where else (from the GTM plan)

- **Egyptian / MENA data + BPO LinkedIn groups** — the local angle is genuinely
  novel there.
- **ITIDA / Cairo tech communities**, GDG Cairo, "Data Engineers Egypt" groups.
- **dev.to / Medium / Hashnode** — repost the Show HN body as a build-log post.
- **The Papyrus newsletter** — announce to existing subscribers first.
- **Individual demo links** — a single striking chart (tourism recovery, EGP
  inflation, pharaoh reign lengths) shared standalone often travels further than
  the product link.

---

## 6 · Rules of engagement

1. **Never inflate a number.** 123 challenges, 15 sectors, 61 tables, 838 rows.
   If it changes, update this file.
2. **Disclose you built it**, every time. It converts better than pretending.
3. **Ask a real question** in each post — it earns comments, and comments earn
   reach.
4. **Answer every reply for the first 2 hours.** This matters more than the copy.
5. **Don't post everywhere on the same day.** LinkedIn first, then one subreddit,
   then Show HN a few days later — so you can fix issues between waves.
6. **Every challenge and post now has its own URL** — share a specific one
   (egybi.com/practice/the-five-tallest-obelisks.html) rather than only the
   homepage when a particular problem or story fits the audience.
7. **Watch the analytics** (`/api/insights.php?key=…`) to see which channel
   actually sends people, then double down on that one.
