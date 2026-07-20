# Traffic Baseline & Analytics

> The pre-launch traffic baseline, recorded **2026-07-20 11:59 UTC** — before the LinkedIn launch post went out. Without a number written down before the event, "the post worked" is unfalsifiable. This note is that number, plus how to take a reading and which figures are honest. Back to [[Home]] · see [[Launch Posts & Growth Kit]] · [[Security Posture & Audit Log]].

## The baseline — 2026-07-20 11:59 UTC, pre-launch

| Metric | Value |
|---|---|
| **Visitors · 7d** | **37** |
| Views · today | 156 |
| Views · 30d | 156 |
| Views · all time | 156 |
| Registered users | 1 |
| Newsletter subscribers | 2 |
| Community submissions | 0 |

**Pages**

| Path | Views |
|---|---|
| `/` | 77 |
| `/explore.html` | 25 |
| `/prices.html` | 13 |
| `/practice.html` | 13 |
| `/about.html` | 9 |
| `/tracks.html` | 9 |
| `/community.html` | 5 |
| `/blog.html` | 5 |

**Referrers**

| Source | Views |
|---|---|
| Direct / none | 122 |
| LinkedIn (web) | 16 |
| Facebook (mobile) | 7 |
| LinkedIn (Android) | 5 |
| Instagram | 4 |
| Facebook (link) | 1 |
| **Google** | **1** |

## What this baseline says

**33 social referrals with nothing posted yet.** LinkedIn, Facebook and Instagram traffic is arriving organically, presumably from the profile and from people sharing the link. That is the number the launch post has to beat, and it is not zero — so a modest post-launch bump is not proof of anything.

**The first Google referral appeared today.** One view, but it is the first evidence that the [[Security Posture & Audit Log]]-era SEO work (sitemap submission, entity signals, the www redirect) is being indexed at all. Worth watching more than the social numbers, because search traffic compounds and a LinkedIn post does not.

**Visitors are not bouncing.** 156 views across 37 people is over four pages each, and `/explore.html` at 25 is the clear second stop. That is the "here for Egypt, not for SQL" path — evidence the audience the rewritten launch post now addresses is already showing up on its own.

## How to take a reading

- **Traffic:** `https://egybi.com/api/insights.php?key=<ANALYTICS_KEY>`
- **Store counts:** `https://egybi.com/auth/auth.php?action=health&key=<ANALYTICS_KEY>` — users, progress, sessions, newsletter, community, hits
- **Community moderation:** `https://egybi.com/api/moderate.php?key=<ANALYTICS_KEY>`

The key is the `ANALYTICS_KEY` env var. It travels in the query string, so it lands in server access logs and browser history — **rotate it periodically and never paste those URLs anywhere public.**

## What counts, and what does not

- **Bots and Do-Not-Track are excluded.** The beacon skips any User-Agent matching `bot|crawl|spider|slurp|bing|preview|monitor|curl|wget|python-requests|headless`, and honours `DNT: 1`.
- **The beacon only fires from page JavaScript.** Fetching a page with `curl` creates no hit at all, so command-line checking never inflates these numbers.
- **"Visitors" is deliberately rough** — distinct daily one-way hashes of (IP + UA + day + secret). No cookies, and the hash rotates daily, so the same person on two days counts twice and cannot be tracked across days. Treat it as a floor, not a headcount.
- **Capped at 600 hits/day per IP**, with 180-day retention. A NAT'd office sharing one address could in principle clip; analytics undercounting is the deliberate failure mode.
- **`/index.html` folds into `/`** at both write and read time, so the homepage is one row rather than two.

## Known distortions in this baseline

1. **All-time equals today.** History effectively starts 2026-07-20. The beacon used to write to SQLite inside `_private/`, which every deploy destroyed — see [[Security Posture & Audit Log]]. Only durable MySQL storage persists, so there is no earlier data to compare against. From here it accumulates properly.
2. **"Direct / none" at 122 is overstated as a category.** It absorbs every request with no referrer: links opened from messaging apps, email clients, pasted URLs, and most privacy-conscious browsers. The true social share is higher than the 33 shown.
3. **Test noise has been removed.** A `/verify-probe` hit row, a `throttle-probe@example.com` newsletter row, and community probe rows were all created during security testing and deleted. The figures above are real traffic.
4. **Five community rows disappeared unexplained** earlier the same day. Durability was subsequently proven (a written row survived a forced deploy) and `community_notes`/`hits` were added to the health counts so a recurrence is visible. Cause never established — noted so a future gap is not assumed to be normal.

## Readings log

Add a row each time. The point is day-over-day comparison against a number recorded *before* the thing being measured.

| Date (UTC) | Visitors 7d | Views today | Users | Subs | Note |
|---|---|---|---|---|---|
| 2026-07-20 11:59 | 37 | 156 | 1 | 2 | **Pre-launch baseline.** LinkedIn post not yet published. First Google referral appeared. |
