/* EgyBI — blog posts (data-driven).
   Add a post by prepending an object here — newest first. Each: id, title, date
   (ISO), tag, excerpt, and body (HTML string, kept simple: <p>, <ul>, <strong>,
   <a>). The blog page renders the list + full articles from this array, so no
   HTML surgery is needed to publish. Keep facts cited, like everything else. */
window.EGYBI_POSTS = [
  {
    id: 'fifty-eight-tables',
    title: 'From 12 to 58 tables: growing a knowledge base without lying',
    date: '2026-07-19',
    tag: 'Build',
    excerpt: 'The EgyBI database started at 12 tables of ancient-Egypt data. It is now 58, spanning economy, energy, water, transport, culture, sport, defence and more — and the one rule that never bent was that every figure stays real and cited.',
    body:
      '<p>When EgyBI began, the knowledge base was a dozen tables: pharaohs, monuments, a little tourism and economics. Today it is <strong>58 tables and ~840 cited rows</strong>, from the 2017 census by governorate to Egypt&rsquo;s arms-import shares.</p>' +
      '<p>Growth like that usually means quality drifts. Ours did not, because of one non-negotiable rule: <strong>every fact is real and carries a source URL, and where sources genuinely disagree we store the disagreement.</strong> The database literally has a <code>note</code> column on most tables whose job is to flag disputes.</p>' +
      '<p>Concrete examples from the latest additions: Egypt&rsquo;s wheat self-sufficiency is stored as 44.6% (CAPMAS) <em>with</em> a note that USDA-implied estimates run higher; the logistics ranking is 57th vs 58th depending on whether you read the press or Egypt&rsquo;s own SIS; the religion split is explicitly labelled an estimate because the census does not record it. None of that is smoothed over.</p>' +
      '<p>That is the whole thesis of the platform: you can practise real SQL <em>and</em> trust what you learn about the country, because the data was never invented to be convenient.</p>'
  },
  {
    id: 'offline-egypt-map',
    title: 'Building a Power-BI-grade Egypt map that works offline',
    date: '2026-07-15',
    tag: 'Engineering',
    excerpt: 'The Explore page has an interactive choropleth of all 27 governorates with five metric layers — and it makes zero external calls at runtime. Here is how, and the false start that got us there.',
    body:
      '<p>We wanted the kind of map a Power BI or Tableau report would build: a real geographic choropleth of Egypt&rsquo;s 27 governorates, coloured by the data, with hover tooltips and a legend.</p>' +
      '<p>The catch: EgyBI is a static site on shared hosting, and the map must not depend on a live tile server or API at runtime. So the boundaries (from <a href="https://www.geoboundaries.org/" target="_blank" rel="noopener">geoBoundaries</a>, CC-BY 4.0) are <strong>bundled into a JS asset with the governorate data baked into each feature</strong>, and we render only vector polygons — no tile layer at all.</p>' +
      '<p>The first attempt used a Chart.js geo plugin; its projection refused to fit Egypt&rsquo;s bounds and every governorate rendered on top of every other. We switched to <strong>Leaflet</strong>, which fits bounds trivially, and it worked immediately. Lesson logged: pick the tool built for the job.</p>' +
      '<p>The map now toggles five layers — population, density, urban %, growth 2017&rarr;2023, and area — using quantile colour bins so Cairo&rsquo;s 10.5M does not wash out South Sinai&rsquo;s 146k. Growth lights up the desert frontier; urban % lights up the fully-urban city governorates. Every value matches the underlying knowledge base exactly (we verified all 27 with a script).</p>'
  },
  {
    id: 'wheat-paradox',
    title: 'The wheat paradox: Egypt grows 9 million tonnes and still imports the most',
    date: '2026-07-11',
    tag: 'Data story',
    excerpt: 'Egypt is a serious farming nation and simultaneously the world&rsquo;s largest wheat importer. The numbers behind that apparent contradiction are a small masterclass in reading data in context.',
    body:
      '<p>Pull the FAOSTAT series and Egypt looks like an agricultural powerhouse: roughly <strong>9 million tonnes of wheat a year</strong>, a top-5 global tomato grower, the world&rsquo;s top orange exporter.</p>' +
      '<p>Now pull the trade data: Egypt is also the <strong>world&rsquo;s largest wheat importer</strong>, buying ~13 million tonnes in 2025.</p>' +
      '<p>Both are true. With ~106 million people to feed and a farmable strip confined to the Nile valley and delta, domestic output simply cannot close the gap — self-sufficiency sits around 44%. It is a textbook reminder that a single big number (&ldquo;9M tonnes&rdquo;) means little without the denominator (mouths) and the counterfactual (imports).</p>' +
      '<p>You can query this yourself on the <a href="practice.html">Practice</a> page: the <code>crop_production</code> and <code>food_facts</code> tables are right there, cited to FAOSTAT and CAPMAS.</p>'
  },
  {
    id: 'how-the-data-stays-fresh',
    title: 'How the data stays fresh (and honest): our automation',
    date: '2026-07-05',
    tag: 'Automation',
    excerpt: 'A read-only site still needs to keep its numbers current. We do it with a small World Bank fetch pipeline, a map-build step, and a human review gate — never a silent overwrite.',
    body:
      '<p>Static reference data goes stale. Ours is kept current by a couple of deliberately small automations.</p>' +
      '<p>A <strong>World Bank fetch pipeline</strong> pulls a curated allowlist of indicators (GDP, life expectancy, internet use, and more), transforms them into the project&rsquo;s cited seed-SQL format, and writes an idempotent <code>seed_auto.sql</code>. It has a <code>--dry-run</code> mode that diffs the fresh values against what is already in the database, so a person sees exactly what changed before anything lands.</p>' +
      '<p>A <strong>map-build script</strong> regenerates the offline Egypt-map asset whenever governorate data changes, joining the boundaries to the latest figures automatically.</p>' +
      '<p>The rule that ties it together: automation proposes, a human approves. New data lands via a reviewable change, not a silent overwrite &mdash; the same discipline that keeps every figure cited also keeps every refresh accountable. Read more on the <a href="community.html">Community</a> page.</p>'
  }
];
