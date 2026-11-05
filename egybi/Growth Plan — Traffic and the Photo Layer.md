# Growth Plan: Traffic and the Photo Layer

> **Status:** CURRENT, written 2026-11-04. It does **not** replace [[The Pivot — Egypt, Honestly]]. It is the delivery plan for it: how the trip companion gets the visitors its income table assumes, and how a travellers' photo layer is added once there are visitors to add it for. Back to [[Home]]. Measured state: [[Traffic Baseline & Analytics]]. Log of what shipped: [[Changelog]].

## 1. Where things stand (measured 2026-11-04)

**Built and live** (from the pivot, 2026-10-09):
- `index.html` "When are you going?" briefing, `plan.html`, `fair-prices.html`, `hieroglyphs.html`, `dossier.html`, `ask.html`.
- 18 generated per-site pages under `visit/` (NASA climate normals, month by month).
- Daily prices and FX, the Atlas, Places (873 entries on one map page), Data Stories, the Street Report Card.

**Shipped 2026-11-04** (PRs #61, #62, #63, all verified on egybi.com after merging):

| What | Effect |
|---|---|
| `TouristAttraction` JSON-LD on the 18 `visit/` pages (name, Arabic name, coordinates, governorate) | Search engines can tie each page to the real place |
| Honest sitemap `<lastmod>` per page (`backend/pipeline/sitemap_lastmod.py`) | Was: all 50 URLs dated the generator's last run. Now: each page's own last change; the prices pages follow the data |
| IndexNow (`site/f5095e3d9b094929f94edda79d85f2b7.txt` + `indexnow_ping.py`) | Bing, Yandex, Seznam and Naver are told about changed URLs after every push. First real ping: HTTP 202 for 3 URLs |
| `tsparticles` removed from index, explore, about | About 170 KB of decoration gone; `explore.html` was loading it with nothing to draw into |
| **`prices-ar.html`**: Arabic prices page, generated daily from `prices.html` (`build_prices_pages.py`) | First Arabic page on the site; `hreflang` en/ar on both |
| Static "today's biggest moves" summary on both prices pages | A crawler now receives real prices without running JavaScript |
| `verify-browser` timeout 35 → 50 min | The suite had grown into its cap; one page more made it time out with every step green |
| `.github/scripts/push-with-regenerate.sh` | After the 2026-11-04 race that lost a day's prices (see [[Changelog]]): generated files are rebuilt on the latest `main`, never rebased |

**Checked and fine:** www → non-www and http → https are single 301s; Facebook, LinkedIn, X, Pinterest, WhatsApp and Bing crawlers receive the real page and its preview tags, not the bot-check page; every sitemap page has one H1, a canonical and sane title and description lengths.

**Not known, and needed before any traffic claim:**
- A current traffic reading. The last row in [[Traffic Baseline & Analytics]] is 2026-07-20 (37 visitors in 7 days).
- Search Console figures since the pivot.

**Blocked on Ahmed** (from the pivot's week 0; this is the critical path to any income):
1. Employment-contract check for the paid $49 review.
2. A Payhip (PayTabs) or Lemon Squeezy listing for the $12 dossier. Until then `dossier.html` says "coming".
3. Affiliate programmes (Awin/GetYourGuide, Impact/Airalo, SafetyWing, CJ/Booking): each must confirm, in its own dashboard, payout to an Egypt resident before a single link ships.

## 2. The one metric, and the dates that judge it

The pivot set the metric, and this plan keeps it: **planner uses per week, and the share of them that buy**. Alongside it, weekly:

| Signal | Where it is read | Why |
|---|---|---|
| Planner uses / week | `api/insights.php` (key-gated, see [[Traffic Baseline & Analytics]]) | The pivot's metric |
| Search clicks and impressions, split by page, **and by Arabic vs English page** | Search Console | Whether the SEO work is landing; `prices-ar.html` is the first test of the Arabic bet |
| Referrers | `api/insights.php` | Which distribution channel is earning its hours |
| Newsletter subscribers | health endpoint | The list the dossier and the review sell to |

**Dates already set by the pivot** (day 0 = 2026-10-09). These stand:

| Date | Check | Rule |
|---|---|---|
| **2026-11-20** (day 42) | ≥ 300 planner uses in total and ≥ 1 sale | Continue; otherwise work the distribution table harder |
| **2027-01-01** (day 84) | Run-rate | ≥ $100 a month → continue into peak season; < $30 → stop building, keep the free tools live |

⚠️ Day 42 cannot pass on "≥ 1 sale" while nothing can be bought. If the blocked items above are not done by **2026-11-15**, the honest reading on 11-20 is "not tested", not "failed".

## 3. Workstreams

Owner **C** = built in a Claude session (branch → PR → CI → merge; every merge to `main` is a production deploy). Owner **A** = Ahmed only (accounts, money, public posting, anything under his name).

### A. Technical SEO (mostly done)
| # | Item | Owner | Status |
|---|---|---|---|
| A1 | Verify egybi.com in **Bing Webmaster Tools** (import from Search Console takes a minute) | A | Open. IndexNow is already reporting to Bing; Webmaster Tools shows what it does with it |
| A2 | Take the Search Console baseline (impressions, clicks, top 20 queries, top 20 pages) and add a row to [[Traffic Baseline & Analytics]] | A | Open. Nothing below can be judged without it |
| A3 | Submit `prices-ar.html` in Search Console (URL inspection → request indexing) | A | Open |
| A4 | Internal links: each Places card and each Atlas UNESCO site links to its `visit/` page where one exists | C | Next after B1 |
| A5 | Image sitemap entries for `visit/` pages | C | Waits for photos (workstream E) |

### B. Content that only this site can make
| # | Item | Owner | Status |
|---|---|---|---|
| B1 | **"Best time to photograph"** on each `visit/` page: sunrise, sunset and golden-hour windows per month, computed from the site's coordinates in Egypt's own clock (including summer time). Serves the photographer audience the photo layer will need, and no competitor shows it with a source | C | **In progress (this session)** |
| B2 | **Arabic `visit/` pages** (18), generated like `prices-ar.html` | C | After B1; judge on A3's Search Console result first |
| B3 | Arabic fair-price card (already in the pivot's months 4–12) | C | After B2 |
| B4 | One data story every two weeks, with an embeddable chart or map that carries a link back | C drafts, A publishes | Open |

### C. Distribution (Ahmed's weekly hours; the pivot's weeks 7–12 table, kept)
About **7 h a week** (judgement), fixed slots so it survives a full-time job:

| Slot | Work | Measure |
|---|---|---|
| 2 h | Answer 5 real questions on r/EgyptTravel and the TripAdvisor Egypt forum with a sourced figure; link only where each forum's rules allow | Referrals from reddit / tripadvisor |
| 1 h | 5–10 Pinterest pins: fair-price cards, dossier sheets, `visit/` heat charts (Pinterest's own scheduler, free) | Outbound clicks |
| 1.5 h | One short (Reels / TikTok / Shorts): "what a camel ride at Giza should cost, with sources", "your name in hieroglyphs" | Profile visits → site |
| 1 h | One LinkedIn "Egypt in data" chart post (your professional audience; July's baseline already showed LinkedIn sending traffic unprompted) | Referrals from LinkedIn |
| 1 h | Read the metrics; add the weekly row; once a month, "The Papyrus: before you go" | Subscribers |
| 0.5 h | Reply to comments and messages | — |

**Rule:** a channel gets 6 weeks. If it brings under 10% of new visitors and no subscribers, its hours move to the best channel. Search is the exception and gets 3 months, because it lags.

**Never:** bought traffic or links, AdSense self-clicks, one link pasted across many groups, or mass AI-written pages (Google's scaled-content policy; and this site's identity was already rewritten once by its own page mix, see [[The Pivot — From SQL Practice to Encyclopaedia]]).

### D. Money (the pivot's lines; nothing new)
$49 review · $12 dossier · affiliate links only after confirmed Egypt payout · AdSense as is. The critical path is §1's three blocked items, all Ahmed's. Photo licensing joins only in workstream E's phase E3.

### E. The photo layer: travellers' photos on the places they took them
The idea: travellers and Egyptian photographers upload photos, each tied to a place on the map; the place pages get richer; later, photographers can sell licences and the site takes a share. It **serves the pivot** (a trip companion with real photos of each site), not a new identity.

**Gate before building anything:** day 84 says continue, **and** at least ~200 visitors a week (judgement). Before that, photos come only from Ahmed's own camera, added by hand as page content.

| Phase | What | Cost a month (judgement) |
|---|---|---|
| **E1, MVP, 4 weeks** | Invite-only upload. Processing **in the browser** (resize to WebP 400/1200/2048 and strip all EXIF, including GPS, by redrawing on a canvas); GPS read first with exifr (MIT) to suggest the nearest of the 873 places. Direct upload to **S3 + CloudFront** on the personal AWS account (CNAME in Hostinger DNS, no DNS move) by a presigned PUT that PHP signs. A keyboard-driven review page (50 photos in 15 minutes). Galleries on the `visit/` pages. Image sitemap. Display licence only; nothing sold | ≈ $0 |
| **E2, 3 months** | Open upload to signed-in users with a daily cap; "my trip map" with a share card; monthly contest per governorate | $0–2 |
| **E3, 12 months** | Licences for Ahmed's own photos first; contributor sales only after a lawyer has read the contributor agreement (royalty model, as Adobe Stock does, because merchant-of-record platforms generally refuse multi-seller marketplaces) | ≤ $10 |

**Constraints that shaped E1** (all learned on this project):
- Nothing uploaded may live in the deploy tree: every push replaces `public_html`, and `_private/` was wiped this way before. Photos go to S3, records to MySQL.
- Photo pages start `noindex,follow` and the place pages stay the indexed unit, so thousands of photo pages cannot redefine the site the way 123 challenge pages once did.
- Hostinger re-encodes images and challenges automated clients, so photos are served from CloudFront, never from Hostinger.
- **AWS bill protection before the first object:** MFA on root; Budgets alerts at $1 and $5; Cost Anomaly Detection; an IAM user limited to PutObject/GetObject on one bucket prefix. Whether the account is on the old 12-month free tier or the 2025 credits plan decides nothing here, because E1 costs under $1 either way (judgement), but write it down.
- **Egypt-specific:** commercial photography at antiquities sites and museums may need a Supreme Council of Antiquities permit; drones are effectively banned; photos of military sites are illegal. The review step rejects these; the contributor agreement states them. (Check with a lawyer before E3.)

**Data shaped now for agents later** (tables in E1): `photos`, `review_decisions` (append-only; `reviewer_type` human/agent, `reason_code`, `model_version`, `confidence`), `photo_meta` (versioned captions, `author_type`, `prompt_version`), `place_suggestions`, `reason_codes`, `contributor_agreements`, `events`. Every manual review decision becomes labelled data for a future agent to be graded against.

### F. Agents: deferred, each with a trigger
Nothing is automated until a measured number says it is worth it. Captions and keywords meanwhile: written with Claude interactively, in batches, and imported (the Max subscription does not include API use; unattended use under it is a terms question, not settled here).

| Agent | Turn it on when (judgement) | Runs on |
|---|---|---|
| Captions & keywords (AR/EN) | Captioning takes > 1.5 h a week, or > 100 approved photos a week | Claude (API if unattended use is not allowed) |
| Place from image (no GPS) | > 30% of uploads lack GPS and fixing them takes > 30 min a week | Claude |
| Safety intake (NSFW, faces, sensitive sites) | > 20 uploads a day from non-founders, or the first bad upload | Open-source models on GitHub Actions CPU |
| Weekly report | Reading the metrics by hand takes > 30 min | A plain script, not an agent |
| Duplicates / theft (pHash) | > 2,000 photos, or the first theft report | imagehash on Actions |
| Release check, pricing, sponsorship scout | First contributor sale / > 50 sales a month / > 20k visits a month to a cluster | — |

Every agent: fail closed (unreadable output goes to a human, never to "approved"); graded first against the recorded human decisions; a human signs off anything involving money, rights or publishing.

## 4. The next eight weeks

| Week of | Ahmed (A) | Claude sessions (C) |
|---|---|---|
| **2026-11-02** | A1–A3 (Bing, Search Console baseline, submit `prices-ar.html`); add the weekly row | B1 best-time-to-photograph on `visit/` (in progress) |
| **11-09** | §1 blocked items: contract check; Payhip/Lemon Squeezy listing for the dossier; affiliate applications noting Egypt payout | A4 internal links Places/Atlas → `visit/` |
| **11-16** | Start the distribution table (§3C) | B2 Arabic `visit/` pages, if A3 shows the Arabic page being indexed |
| **11-20** | **Day-42 check** (§2) | Prepare the readings for it |
| **11-23** | Distribution | B4 first data story + embeddable chart |
| **11-30** | Distribution; first "Papyrus: before you go" of the peak season | B3 Arabic fair-price card |
| **12-07** | Distribution | Fixes from what the readings show |
| **12-14** | Distribution; decide on E1's AWS setup (bill protection only, no build) | — |
| **2027-01-01** | **Day-84 check**: continue / stop (§2); if continue and ≥ ~200 visitors a week → start E1 | — |

## 5. Risks

| Risk | Mitigation |
|---|---|
| Nothing can be bought, so day 42 and 84 measure nothing | §1 blocked items first; read day 42 as "not tested" if they are not done |
| Distribution hours do not happen around a full-time job | Fixed weekly slots; the 6-week rule moves hours to what works; record actual hours in the weekly row |
| Search does not move | It gets 3 months; Arabic pages are the cheapest new surface; forums and Pinterest do not depend on Google |
| A bot job and a merge race on generated files again | Fixed 2026-11-04 by `push-with-regenerate.sh`; its first real run with data is the 2026-11-05 price refresh |
| The photo layer starts before there is anyone to upload | The E gate (§3E) |
| A "free" AWS service turns into a bill | Bill protection before the first object; CloudFront in front of S3; per-user upload caps |

## 6. Assumptions and open questions

1. All hours, visitor thresholds and costs marked *judgement* above are estimates, not measurements.
2. Current traffic is unknown since 2026-07-20; §2's first job is to measure it.
3. Whether the personal AWS account is on the old free tier or the 2025 credits plan (does not change E1's cost; decides how long "free" lasts).
4. Whether a personal computer is available for batch work (the TP laptop is not for personal projects).
5. Prices, fees and programme terms in the pivot note were read 2026-10-09 and change; re-check each one at the moment of signing up.
