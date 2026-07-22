# Stock Market Page & EGX Data

> **✅ BUILT & SHIPPED 2026-07-20 → 21.** A free, FRA-compliant Egyptian stock-market page at `site/stocks.html`. TradingView **widget embeds** do all the data work — TradingView serves and licenses the data, EgyBI redistributes none of its own, so there is **no key, no pipeline, no scraping** and no market-data licence needed. Back to [[Home]] · full history in [[Changelog]].

## Why widgets, not a data feed
A feasibility/legal review ruled out the naive version: scraping Mubasher/Investing/TradingView or redistributing real-time EGX data breaks provider ToS, needs a paid market-data licence, and risks **Egypt's Financial Regulatory Authority (FRA)** line on giving investment advice. The compliant path is embedding TradingView's own widgets and staying strictly on the **"information & education, not advice"** side — no buy/sell/target/"signal" calls, and deliberately **no TradingView technical-analysis Buy/Sell gauge** (it reads as a recommendation). The site's only CSP is `frame-ancestors 'self'; upgrade-insecure-requests`, which does **not** block outbound embeds.

## The page, section by section (`site/stocks.html`)
Design-system + wayfinding + sticky sub-nav (9 chips). Sections: **Overview** (ticker tape) · **Blue chips** (12-month mini-charts) · **Live chart** (search any EGX symbol) · **Screener** · **Fundamentals** (the picker) · **Glossary** · **For traders** · **Query it** (SQL tie-in) · **Fine print** (disclaimer).

- **Fundamentals picker** — an accessible combobox (`assets/stocks.js`) to choose **any** EGX stock: search by ticker, **English or Arabic** name across **56 curated companies**, browse by **~10 grouped sector chips**, or free-type any valid `EGX:XXXX`. Selecting one re-instantiates three TradingView widgets — **symbol-info**, **company-profile**, **financials** — persists the choice to `localStorage` and a shareable **`?stock=`** URL, and shows a graceful inline error on an invalid symbol. CIB (COMI) is server-rendered as the no-JS/default baseline.
- **Education layer** — a bilingual (EN/Arabic) **glossary** (P/E, P/B, ROE, dividend yield, EPS, RSI, …), a per-metric **"how to read these numbers"** guide (`<details>`, with the common misreading of each), and a **"evaluate a company in 5 minutes"** walkthrough tying the glossary to the on-page widgets. All framed as education, never advice.
- **Disclaimer** — EgyBI is **not FRA-licensed**; figures via TradingView may be delayed; confirm against official EGX disclosures; TradingView attribution kept per their widget terms.

## One shared company source (the important architecture bit)
**`assets/egx-symbols.js`** is the single source of EGX companies for the whole site — the 56-company list (ticker · English · Arabic · sector), the `FEATURED` spotlight set, and a self-contained `tickerTape()` helper, exposed as `window.EGYBI_EGX`. It drives:
- the stocks page's **picker, ticker tape, and 12-month mini-charts** (via `stocks.js`, which reads the shared list; its inline copy is a fallback only), and
- a **live EGX ticker on the homepage** (`site/index.html`, "Live markets" strip).

Fix a ticker or an Arabic name **once** in `egx-symbols.js` and the homepage ticker, stocks ticker, mini-charts, and picker all update. Only real, well-known EGX codes are listed; any other valid ticker still works via free-text.

## Known-tricky details & fixes
- **Screener** must use `"defaultScreen":"general"`, **not** `"most_capitalized"` — that preset applies USD market-cap/volume filters no EGX company clears, so it showed "No symbols match your criteria." Fixed live.
- **Ticker-code spot-check (2026-07-21):** verified codes against TradingView/african-markets/Investing.com and corrected two — **`AUTO` → `GBCO`** (GB Auto rebranded to GB Corp) and **`EGBE`** relabelled from "Export Development Bank" to its true company **Egyptian Gulf Bank** (Export Dev Bank trades as EXPA). If any other symbol shows "invalid" live, correct that one entry in `egx-symbols.js`.
- **Sandbox limit:** TradingView is network-blocked in the dev sandbox, so widgets and exact symbols can only be render-confirmed on egybi.com. All of the above were confirmed live by Ahmed.

## Deferred / next (needs input)
A free EOD-data vendor that actually covers EGX → a `fetch_stocks.py` daily pipeline → an owned, cited EGX dataset with computed indicators → EGX SQL challenges. Gated on confirming a free vendor covers EGX (EODHD/Twelve Data/Alpha Vantage testers exist but weren't confirmed). Until then the page stays widgets-only.
