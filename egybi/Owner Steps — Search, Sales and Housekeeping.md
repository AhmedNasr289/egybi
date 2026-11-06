# Owner Steps — Search, Sales and Housekeeping

> The jobs on the [[Growth Plan — Traffic and the Photo Layer]] that only Ahmed can do, written as click-by-click steps. Written 2026-11-06. Each section ends with what to tell Claude when it is done, because several Claude-owned items are waiting on these. Back to [[Home]] · see [[Affiliate Plan — Egyptian Handmade]] · [[Traffic Baseline & Analytics]].

Commands are for **Windows PowerShell 5.1** (one command per block; no `&&`). Do all of this on your own computer, not the TP work laptop.

## 1. Search setup (Growth Plan A1–A3)

### A1 · Bing Webmaster Tools (about 5 minutes)

1. Open <https://www.bing.com/webmasters> and sign in with a Microsoft account.
2. Choose **Import your sites from Google Search Console**. Allow access to the Google account that owns egybi.com in Search Console.
3. Tick **egybi.com** and press **Import**. Importing verifies the site and brings its sitemap with it, so no file or DNS record is needed.
4. Open **Sitemaps**. Check that `https://egybi.com/sitemap.xml` is listed. If it is not, choose **Submit sitemap** and paste that address.
5. Open **IndexNow** (under Settings or URL Submission, depending on the layout). The site already announces changed pages through IndexNow on every deploy, using the key file `f5095e3d9b094929f94edda79d85f2b7.txt`. After 24–48 hours this screen should list recent submissions from egybi.com.

**Tell Claude:** "Bing is set up". After two days, also tell Claude how many URLs the IndexNow screen shows.

### A2 · Search Console baseline (about 15 minutes)

Every later traffic decision is judged against this reading, so take it before anything else changes.

1. Open <https://search.google.com/search-console> and select the **egybi.com** property.
2. Open **Performance → Search results**. Set **Date: Last 3 months**, then tick all four boxes: Total clicks, Total impressions, Average CTR, Average position.
3. Write the four totals into the **Search Console readings** table in [[Traffic Baseline & Analytics]].
4. Press **Export → Download CSV**. The zip holds Queries.csv and Pages.csv: the top queries and top pages. Keep the zip, or paste the top 20 of each into the chat and Claude will add them to the note.
5. Open **Indexing → Pages**. Write down **Indexed** and **Not indexed**. The site has 155 generated pages plus the hand-written ones, so a large "Not indexed" figure is worth knowing now.

**Tell Claude:** the four totals and the two indexing figures, or attach the CSVs.

### A3 · Submit the Arabic prices page (about 3 minutes)

1. In Search Console, paste `https://egybi.com/prices-ar.html` into the **Inspect any URL** bar at the top and press Enter.
2. If it says **URL is not on Google**, press **Test live URL** first. It should report "URL is available to Google". Then press **Request indexing** and wait for the confirmation (about a minute).
3. Do the same for the two new data pages: `https://egybi.com/egypt-weather-by-month.html`, and `https://egybi.com/egypt-public-holidays.html` once PR #71 is merged. Search Console allows roughly ten indexing requests a day, so three is fine.
4. Inspect `prices-ar.html` again in about a week.

**Tell Claude:** when the inspection says **URL is on Google**. That is the gate for B2 (the 18 Arabic `visit/` pages).

## 2. Due by 2026-11-15

### 2a · The employment-contract check (about 30 minutes, reading)

The $49 plan review is a paid service, so it is outside work. Before selling it, read:

1. **Your employment contract.** Search it for: *outside employment*, *secondary activity*, *other business*, *conflict of interest*, *exclusive*, *non-compete*, *intellectual property* (some contracts claim anything you create, even off hours), *confidential information*.
2. **The code of conduct or employee handbook** the contract refers to. The outside-work rule often lives there, not in the contract.
3. Note what you find in one of three forms:
   - "nothing restricts it";
   - "allowed with notice or permission";
   - "not allowed".

   If permission is needed, ask HR **in writing** and keep the reply.
4. Keep the side business fully separate: your own computer, your own accounts, your own time, and no TP data, clients or tools.

This is the only gate on the $49 review. The same check covers affiliate income and the $12 dossier, because they are outside income too. It is not legal advice; if a clause is unclear, ask a lawyer.

**Tell Claude:** which of the three outcomes it is. Do not paste the contract text.

### 2b · The $12 dossier listing

The full pack does not exist yet: `dossier.html` says "in preparation". **Claude is building the pack files first**: the 18 site climate sheets, the fair-price pocket card, the Arabic phrase card and the packing list by month, as a print-ready PDF. Claude will tell you when it is ready to upload. Meanwhile:

1. Choose the shop: **Payhip** or **Lemon Squeezy** (both plans named it). Before creating anything, open each one's **payout settings or payout FAQ** and confirm that an Egypt-resident seller can be paid, and how (PayPal, Stripe, bank). This is the same rule as for affiliates: no listing until payout to Egypt is confirmed in writing or on screen.
2. Create the account, and fill in the tax details it asks for. A non-US seller usually completes a **W-8BEN**; the platform guides you through it.
3. When Claude hands over the PDF, create a product:
   - **Title:** "The Papyrus Egypt Dossier".
   - **Price:** USD 12.
   - **Files:** the PDF.
   - **Description:** Claude will draft it from the dossier page.
4. Copy the product's checkout link.

**Tell Claude:** the checkout link, and which payout method the platform confirmed. Claude then replaces "in preparation" on `dossier.html` with the link, in a PR, which goes live only when you approve the merge.

### 2c · Affiliate applications

The full research and ranked order are in [[Affiliate Plan — Egyptian Handmade]]. For each programme, in the order that note gives:

1. Apply with:
   - **site:** `https://egybi.com`;
   - **audience:** "English-speaking travellers planning a trip to Egypt";
   - **traffic:** the numbers from A2. Be honest that the site is small; most programmes accept small sites with real content.
2. Before you accept the terms, find the country or payout section. **Write down, word for word, whether it pays a publisher resident in Egypt and by what method.** If the terms do not say, ask support in writing: "I live in Egypt. Can you pay me, and by which method (bank transfer, Payoneer or PayPal)?"
3. Keep each answer: a screenshot of the payout screen, or the support email.

**Tell Claude:** the programme name, approved or not, and the payout answer. Claude builds the links, with the disclosure line, only for programmes where that answer is yes.

## 3. Housekeeping

### 3a · Close the stale failure alerts (about 2 minutes)

Each alert below has been followed by a successful run of the same workflow, so the failure it reports no longer stands. Claude cannot close issues: the safety classifier refuses that action.

| Issue | Workflow | Proof it has recovered |
|---|---|---|
| #42 | Refresh Egypt data | Run 41438387866 succeeded 2026-11-02 |
| #52 | Build Atlas geo layers | Run 41633786024 succeeded 2026-11-03 |
| #56 | Refresh daily prices | Run 42055658071 succeeded 2026-11-05 |
| #72 | Test (pipeline) | Opened by Claude's own unused import on PR #71; run 42225501770 passed on the fix 2026-11-06 |

In a browser, open each issue → **Close with comment** → paste the proof from the table.

Or in PowerShell, one at a time:

```powershell
gh issue close 42 --repo AhmedNasr289/egybi --reason completed --comment "Stale: Refresh Egypt data has succeeded since (run 41438387866, 2026-11-02)."
```

```powershell
gh issue close 52 --repo AhmedNasr289/egybi --reason completed --comment "Stale: Build Atlas geo layers has succeeded since (run 41633786024, 2026-11-03)."
```

```powershell
gh issue close 56 --repo AhmedNasr289/egybi --reason completed --comment "Stale: Refresh daily prices has succeeded since (run 42055658071, 2026-11-05)."
```

```powershell
gh issue close 72 --repo AhmedNasr289/egybi --reason completed --comment "Fixed in 94ca52d; Test (pipeline) run 42225501770 passed."
```

Leave the three **Send The Papyrus** issues (#55, #57, #60) open. They are reminders to send a newsletter, not failures, and sending is yours to decide.

### 3b · Run "Refresh street report card" by hand

Its last scheduled run (2026-10-05) was killed at the two-hour limit with nothing committed and no alert. PR #70 fixed all three parts:

- it now stops itself at 80 minutes;
- it gives up on a district after two failed connections;
- a timeout now raises an alert.

This run is the first real test of those fixes.

1. Open **GitHub → AhmedNasr289/egybi → Actions → Refresh street report card → Run workflow**.
2. Leave the branch as **main** and set **planner_notes** to **no**. "yes" needs the paid Anthropic key and is not needed now.
3. Press **Run workflow**.

Or in PowerShell:

```powershell
gh workflow run refresh-streets.yml --repo AhmedNasr289/egybi --ref main -f planner_notes=no
```

It takes 20–80 minutes. Any of three outcomes is useful:

- **green with a commit**, which refreshes the report card;
- **green with fewer districts**, where the log says which ones the budget or the connection breaker stopped;
- **an alert issue**, which now opens instead of failing silently.

**Tell Claude:** "street run done". Claude will read the run log and check the report card on the live site.
