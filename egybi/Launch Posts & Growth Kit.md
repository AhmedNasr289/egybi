# EgyBI — Launch Posts & Growth Kit

Ready-to-post copy for launch day. **Every number here is verified** against the
live build (97 challenges = 35 Easy / 42 Medium / 20 Hard, 15 sectors, 58 tables
/ 837 rows). Keep it that way — the whole product promise is "every fact real
and cited," so the marketing has to hold the same standard.

**The core hook:** *a SQL practice platform where every dataset is real, cited
Egyptian history and economics — not `employees` and `orders` toy tables.*

---

## 1 · LinkedIn (primary channel — post this first)

> Every SQL tutorial I ever did made me query the same fake `employees` table.
>
> So I built the opposite.
>
> EgyBI is a SQL practice platform where every dataset is **real, cited Egyptian
> data** — pharaoh reigns and dynasties, Suez Canal traffic, GDP and inflation
> series, tourism arrivals, governorate demographics, even daily retail food
> prices from the Cabinet's own price portal.
>
> 97 auto-graded challenges (35 easy → 20 hard) across 15 sectors. It runs
> entirely in your browser — your SQL never touches a server — so you can start
> solving in about 4 seconds with no signup.
>
> There's XP, daily streaks, and a rank ladder borrowed from the scribes who did
> Egypt's original data work: Apprentice Scribe → Cord-Stretcher → Master Scribe
> → Keeper of the House of Life → Vizier of Data.
>
> It's free. I built it solo, nights and weekends.
>
> If you're learning SQL, teaching it, or hiring for data roles — I'd genuinely
> value your feedback on the challenge quality.
>
> 👉 egybi.com

*Notes: post Tue–Thu, ~9–11am Cairo. Put the link in the FIRST comment if you
want more reach (LinkedIn suppresses external links), then edit it into the post
after an hour. Reply to every comment in the first 2 hours.*

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
> - 97 auto-graded challenges: 35 easy, 42 medium, 20 hard, across 15 sectors
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
> 97 auto-graded challenges across 15 sectors, 58 tables / 837 rows.
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
97 auto-graded challenges, free, no signup → egybi.com

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

1. **Never inflate a number.** 97 challenges, 15 sectors, 58 tables, 837 rows.
   If it changes, update this file.
2. **Disclose you built it**, every time. It converts better than pretending.
3. **Ask a real question** in each post — it earns comments, and comments earn
   reach.
4. **Answer every reply for the first 2 hours.** This matters more than the copy.
5. **Don't post everywhere on the same day.** LinkedIn first, then one subreddit,
   then Show HN a few days later — so you can fix issues between waves.
6. **Watch the analytics** (`/api/insights.php?key=…`) to see which channel
   actually sends people, then double down on that one.
