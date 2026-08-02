/* EgyBI — "The Vanishing Economy": a standalone, no-signup SQL investigation.
   ---------------------------------------------------------------------------
   THE HONESTY DECISION (deliberate, and the reason this case is not a murder
   mystery). SQL Murder Mystery and SQL Noir — the two artifacts this format is
   modelled on — are outright fiction: invented victims, invented suspects,
   invented crime scenes. That works for them. It would quietly corrode the one
   thing EgyBI has, which is that every number on the site is real, sourced and
   traceable, with disputes flagged rather than smoothed away.

   So this is NOT fiction wrapped around real data. It is a genuine analytical
   investigation whose finding is real: between 2022 and 2024 Egypt's GDP
   measured in US dollars fell about 18%, while the very same GDP measured in
   Egyptian pounds rose about 68%. Both figures are true. The gap is the
   exchange rate, not the economy. The "case" framing is honest because there
   genuinely is a puzzle in the data — no invented narrative detail appears
   anywhere, and a reader can verify every figure against the cited source.

   WHERE THE CASE STOPS, AND WHY. It deliberately does NOT compute "real GDP"
   by deflating with CPI. Doing that with these numbers implies the economy
   CONTRACTED, which contradicts the World Bank's own real-growth series — CPI
   is not the GDP deflator, and using one for the other is a real methodological
   error that would hand the reader a false conclusion. The final step names
   that limit instead of papering over it. Teaching someone what their data
   cannot answer is more useful than a tidy fake resolution.

   Data comes from window.EGYBI_SANDBOX_SQL in challenges.js — the same cited
   tables the 123 challenges use, so there is one source of truth rather than a
   duplicated copy that could drift. Runs entirely client-side via sql.js. */
(function () {
  'use strict';

  window.EGYBI_CASE = {
    slug: 'vanishing-economy',
    steps: [
      {
        title: 'The disappearance',
        question: 'Egypt’s GDP, measured in current US dollars, is in the <code>indicators</code> table under the name <code>GDP (current US$)</code>. List every year and its value, oldest first.',
        hint: 'One table, one filter, one sort. <code>WHERE name = \'GDP (current US$)\'</code> and then <code>ORDER BY year</code>.',
        starter: 'SELECT year, value\nFROM indicators\nWHERE name = \'GDP (current US$)\'\nORDER BY year;',
        solution: "SELECT year, value FROM indicators WHERE name = 'GDP (current US$)' ORDER BY year;",
        orderMatters: true,
        reveal: 'There it is. GDP climbs steadily to <strong>$476.75bn in 2022</strong> — then falls two years running, to <strong>$395.93bn</strong> and <strong>$389.06bn</strong>. On this evidence alone, Egypt’s economy looks like it went into reverse.'
      },
      {
        title: 'How big was the fall?',
        question: 'Put a number on it. Return the percentage change in GDP from <strong>2022 to 2024</strong>, rounded to one decimal place, as a single column named <code>pct_change</code>.',
        hint: 'You need two rows of the same table at once. Join <code>indicators</code> to itself — one copy filtered to 2022, the other to 2024 — then compute <code>(new - old) / old * 100</code>.',
        starter: 'SELECT ROUND(\n         (b.value - a.value) / a.value * 100, 1\n       ) AS pct_change\nFROM indicators a\nJOIN indicators b\n  ON b.name = a.name AND b.year = 2024\nWHERE a.name = \'GDP (current US$)\'\n  AND a.year = 2022;',
        solution: "SELECT ROUND((b.value - a.value) / a.value * 100, 1) AS pct_change FROM indicators a JOIN indicators b ON b.name = a.name AND b.year = 2024 WHERE a.name = 'GDP (current US$)' AND a.year = 2022;",
        orderMatters: false,
        reveal: 'A <strong>18.4% fall in two years</strong>. For context, that is the kind of number you would expect from a severe recession, a war, or a collapse in a country’s main export. None of those happened to Egypt in 2023–24. Something else is going on.'
      },
      {
        title: 'The first suspect',
        question: 'That GDP figure is denominated in <strong>US dollars</strong> — so anything that changes the value of the Egyptian pound changes it too, even if not a single extra loaf of bread is baked. Pull the exchange rate for 2022 through 2024 from the <code>exchange_rate</code> table.',
        hint: 'A plain <code>SELECT</code> with <code>WHERE year BETWEEN 2022 AND 2024</code>, sorted by year.',
        starter: 'SELECT year, egp_per_usd\nFROM exchange_rate\nWHERE year BETWEEN 2022 AND 2024\nORDER BY year;',
        solution: 'SELECT year, egp_per_usd FROM exchange_rate WHERE year BETWEEN 2022 AND 2024 ORDER BY year;',
        orderMatters: true,
        reveal: 'The pound went from <strong>24.72</strong> to <strong>50.85</strong> per dollar. A dollar came to cost <strong>2.06&times;</strong> as many pounds — the pound lost about <strong>51%</strong> of its dollar value across the same two years the economy appeared to shrink. That timing is not a coincidence.'
      },
      {
        title: 'Measure the same economy in pounds',
        question: 'If the yardstick is the problem, change the yardstick. Join GDP to the exchange rate by year and convert each figure into <strong>billions of Egyptian pounds</strong>, for 2022–2024. Return <code>year</code> and the converted value rounded to 2 decimals as <code>gdp_egp_bn</code>.',
        hint: 'Multiply, don’t divide: the GDP figure is in dollars and <code>egp_per_usd</code> tells you how many pounds one dollar is worth. Join <code>indicators</code> to <code>exchange_rate</code> <code>ON i.year = e.year</code>.',
        starter: 'SELECT i.year,\n       ROUND(i.value * e.egp_per_usd, 2) AS gdp_egp_bn\nFROM indicators i\nJOIN exchange_rate e ON e.year = i.year\nWHERE i.name = \'GDP (current US$)\'\n  AND i.year BETWEEN 2022 AND 2024\nORDER BY i.year;',
        solution: "SELECT i.year, ROUND(i.value * e.egp_per_usd, 2) AS gdp_egp_bn FROM indicators i JOIN exchange_rate e ON e.year = i.year WHERE i.name = 'GDP (current US$)' AND i.year BETWEEN 2022 AND 2024 ORDER BY i.year;",
        orderMatters: true,
        reveal: 'Measured in pounds, the same economy in the same years goes <strong>up</strong> every single year: 11,785 → 12,234 → 19,784 billion EGP. Nothing about the country changed between your last query and this one. Only the unit did.'
      },
      {
        title: 'The verdict',
        question: 'Put both readings side by side so the contradiction is undeniable. Return one row with two columns: <code>usd_pct_change</code> and <code>egp_pct_change</code>, each the 2022→2024 change rounded to one decimal.',
        hint: 'Extend your step-2 self-join: bring in <code>exchange_rate</code> twice as well, once for each year, so you can compute the pound figure alongside the dollar one in the same row.',
        starter: 'SELECT\n  ROUND((u24.value - u22.value) / u22.value * 100, 1) AS usd_pct_change,\n  ROUND((u24.value * e24.egp_per_usd - u22.value * e22.egp_per_usd)\n        / (u22.value * e22.egp_per_usd) * 100, 1) AS egp_pct_change\nFROM indicators u22\nJOIN indicators u24 ON u24.name = u22.name AND u24.year = 2024\nJOIN exchange_rate e22 ON e22.year = u22.year\nJOIN exchange_rate e24 ON e24.year = u24.year\nWHERE u22.name = \'GDP (current US$)\'\n  AND u22.year = 2022;',
        solution: "SELECT ROUND((u24.value - u22.value) / u22.value * 100, 1) AS usd_pct_change, ROUND((u24.value * e24.egp_per_usd - u22.value * e22.egp_per_usd) / (u22.value * e22.egp_per_usd) * 100, 1) AS egp_pct_change FROM indicators u22 JOIN indicators u24 ON u24.name = u22.name AND u24.year = 2024 JOIN exchange_rate e22 ON e22.year = u22.year JOIN exchange_rate e24 ON e24.year = u24.year WHERE u22.name = 'GDP (current US$)' AND u22.year = 2022;",
        orderMatters: false,
        reveal: '<strong>−18.4% and +67.9%.</strong> One economy, two years, two true numbers, opposite signs. Neither is a lie and neither is the whole truth — each is an answer to a question about a <em>currency</em> that has been mistaken for a question about an <em>economy</em>.'
      },
      {
        title: 'What the data still can’t tell you',
        question: 'One loose end. Both of your figures are <strong>nominal</strong> — neither adjusts for prices rising. Pull the inflation rate for 2023 and 2024 from the <code>inflation</code> table and see what you are up against.',
        hint: 'The simplest query in the case: <code>WHERE year IN (2023, 2024)</code>.',
        starter: 'SELECT year, rate_pct\nFROM inflation\nWHERE year IN (2023, 2024)\nORDER BY year;',
        solution: 'SELECT year, rate_pct FROM inflation WHERE year IN (2023, 2024) ORDER BY year;',
        orderMatters: true,
        reveal: 'Roughly <strong>a third in each year</strong>. So the +67.9% in pounds is mostly prices rising, not output rising. And here is where an honest investigation stops: you <em>cannot</em> simply divide by these CPI figures to get "real" GDP. CPI measures a consumer basket; deflating GDP requires the GDP deflator, a different series. Doing it with CPI here would tell you Egypt’s economy <em>contracted</em> — which contradicts the World Bank’s own real-growth data. The right conclusion is not a number you can compute from this table. It is knowing which number you would need to go and get.'
      }
    ]
  };
})();
