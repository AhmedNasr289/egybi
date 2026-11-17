# EgyBI English review: ru.tsv column 1

Read all 955 English units (the first column of `backend/i18n/ru.tsv`) on 2026-11-17. 79 proposals were applied in the PR that adds this file, plus the follow-ons 722 (via `backend/pipeline/pages/visit.py`), 741, 529 and 531; the Arabic and Russian for all 83 lines were rewritten to the new English. Every row was checked by a script against the original line: the same HTML tags, the same numbers and dates, titles under 60 characters and meta descriptions under 160. A deliberate mutation (one dropped link, one changed figure) made the check fail, so it does catch those changes.

## Proposals by problem

| Problem | Rows |
|---|---|
| JARGON (data, GIS or build terms a traveller would not know) | 29 (+2 also REPEAT) |
| STIFF (system voice, verbless fragments, convoluted) | 28 |
| REPEAT (slogan or sentence pattern reused across pages) | 13 (+2 also JARGON) |
| TONE (could worry or talk down to a first-time visitor) | 4 |
| FILLER (words that add nothing) | 3 |

## The main patterns, with counts

Counts are lines in the English column that contain the pattern.

1. **"X, not Y" and "rather than" framing.** `, not ` is in 32 lines and `rather than` in 19. One use per page is a voice. Thirty is a tic, and it makes the site sound like it is always arguing with someone. The worst cases are slogans: "measured, not marketed" (434, 528), "measured, not asserted" (268, 884, 885), "Arguments, not dashboards" (261), "Not a themed skin" (30) and "the subject here, not a theme" (287).
2. **The "disagreement" slogan.** "Flagged rather than smoothed away", "never smoothed" and "the tidier number" turn up in 4, 43, 57, 94 (the footer, so it is on every page), 240, 277, 284 and 578. `tidy`/`tidier` alone is in 6 lines. Say it once, plainly: "where sources disagree, we show both."
3. **Build status shown to visitors.** Ten lines expose the build: "has not been generated yet", "next pipeline run", "Run the visitor-layer build to populate it" (508, 513), "Build Atlas geo layers" (721). A traveller cannot run a build. These should say "not ready yet, please check back soon."
4. **"Honest" used as a label.** It is in 14 lines: "How this page is honest" (723), "an Honest Cartouche" (367), "the next most honest thing" (343), "Two tools can honestly give" (385). If you keep calling yourself honest, readers start to wonder why. Showing the source is enough.
5. **Em-dash asides.** There are 210 em-dashes across 168 of the 955 lines, and 33 lines have two or more. Many are bolted-on asides that would read better as a second sentence. Most proposals that touch a dash-heavy line split it.
6. **Engineering and GIS jargon on traveller pages.** "tile-free" (6 lines), "climatology / reanalysis / normals" (6), "normalised" (5), "BI dashboards", "quantile bins", "dissolved from the same geometry", "zero runtime requests", "merged". Source names and licences (ODbL, MERRA-2, SRTM, CC BY 4.0) are kept, because they are attributions. Only the explaining words around them change.
7. **Colon-then-reveal openers.** "Nothing invented:", "A useful floor:", "The coming month measured:", "Not opinions about which is better planned:" (425, 356, 295/411, 841).

Also worth knowing:
- "Governorate" appears in 38 lines and is never explained. Proposal 692 adds "(its provinces)" once, on the Atlas page.
- "genuinely" (6 lines) and "actually" (19 lines) are mostly filler.

## Before and after

**435 (visit page intro)**
- Before: "No adjectives, no &ldquo;best time to visit&rdquo;: the measurements, and your own judgement about the heat."
- After: "We will not tell you the &ldquo;best time to visit&rdquo;; we show you the numbers so you can decide how much heat suits you."

**508 (visit page, visitor-facing)**
- Before: "The cross-section layer has not been generated yet. Run the visitor-layer build to populate it."
- After: "The cross-sections are not ready yet. Please check back soon."

**94 (site footer, every page)**
- Before: "Every figure is real and cited, and where sources genuinely disagree the dispute is flagged rather than smoothed away."
- After: "Every figure has a source, and where sources disagree, we show both."

**356 (fair prices)**
- Before: "A useful floor: a fruit stall asking several times the top of the range is not quoting a resident&rsquo;s price."
- After: "A useful check: a fruit stall asking several times the top of this range is not quoting the price a local would pay."

**728 (Atlas health disclaimer; meaning kept)**
- Before: "This page is <strong>informational and educational only</strong>. The health layer is not a care directory … for real medical needs use official health-ministry channels."
- After: "This page is <strong>for information and learning only</strong>. The health layer is not a list of where to get care … if you need medical help, use the official health-ministry channels."

**870 (street report card)**
- Before: "They are written down here because a metric you cannot interrogate is a metric you should not trust."
- After: "They are written down here so you can see exactly how each number was made."

**841 (street report card intro)**
- Before: "Not opinions about which is better planned: <strong>intersection density, …</strong>, computed from open street data with the method written down."
- After: "We do not judge which is better planned. We measure <strong>intersection density, …</strong> from open street data, and the method is written down below."

## Lines left alone on purpose

- **Privacy text (105-127, 951).** It is already plain. I only proposed wording fixes where the meaning stays exactly the same (102, 129).
- **Contributor and roadmap rows (585-604).** These are written for developers, not travellers.
- **The "What this cannot tell you" closers (769, 785, 800, 954).** They repeat on purpose and are useful.
- **Follow-ons, applied:** 722 (same opening sentence as 652, written by `visit.py`), 741 (now "Not ready yet"), 529 and 531 ("NASA's long-term climate averages", no "tile-free").
- **Possibly stale claim, not proposed.** 604 calls the newsletter store "the one place the site writes". Accounts and travellers' notes now also write data, so the owner should confirm this line.

## Style note for future English

- **Voice.** Write like a knowledgeable friend in Cairo talking to someone who has never been. Use "we" and "you". Describe what the reader will see or do, not what the system holds ("shows how hot a normal afternoon gets", not "shows what the data holds").
- **Sentence length.** Keep most sentences under about 25 words, with one idea each. If a sentence needs two em-dashes, make it two sentences. Allow at most one em-dash aside per paragraph.
- **Contrast.** Use "not X but Y" at most once per page, and never in titles or meta descriptions. State the positive claim on its own ("What Egypt is really like, month by month").
- **Sources.** Name the source in a normal clause, after the claim: "from NASA's climate records", "Egypt's statistics agency, CAPMAS, counted about 107 million". Explain an acronym the first time it appears on a page. Licence names go in the attribution line, not in the sentence.
- **Uncertainty.** Say it once, plainly: "where sources disagree, we show both". Don't use "honest", "genuinely", "tidy" or "invented" as reassurance. The sources do that job.
- **Unfinished sections.** Never show build or pipeline language. Write "not ready yet, please check back soon."
- **Safety and health.** Write full, calm sentences that point to the official source ("please check the official sources"), not curt fragments.
- **Jargon test.** If a first-time visitor would need to look a word up (circuity, quantile, normalised, tile-free, climatology), replace it with a plain word. If the term must stay, add a short gloss in brackets.
