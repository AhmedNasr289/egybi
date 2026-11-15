/* "A visit page's month tables must fit a phone without sideways scrolling."

   Measured 2026-11-15 on the live Giza page at 390px: the table box was 289px
   wide, the climate table needed 392px and the light table 369px, so the record
   heat and the sunset sat off-screen behind a sideways scroll that nothing
   announced. overflow.js cannot see this: it deliberately accepts any table
   inside a scrolling wrapper, and it only sweeps the top-level pages.

   egybi.css (study S3) shows three-letter months and tighter cells under 430px.
   This opens every visit/*.html at 360, 375 and 390px and fails when any
   .fp-wrap's content is wider than the wrapper itself.

   Exits 1 on any table that scrolls, and also when it measured too few tables
   to mean anything (a check that inspected nothing must not pass). */
const fs = require('fs');
const path = require('path');
const { chromium, executablePath, BASE } = require('./env');

const DIR = path.join(__dirname, '..', '..', 'site', 'visit');
const ALL = fs.readdirSync(DIR).filter(f => f.endsWith('.html') &&
  fs.readFileSync(path.join(DIR, f), 'utf8').includes('class="fp-wrap"')).map(f => 'visit/' + f);
// ONLY lets the mutation harness drive one page, through the same code path.
const PAGES = process.env.ONLY ? process.env.ONLY.split(',') : ALL;
const WIDTHS = [360, 375, 390];
const MIN_TABLES = PAGES.length * WIDTHS.length * 2;   // two tables per visit page
const TOL = 1;   // sub-pixel rounding

(async () => {
  const b = await chromium.launch({ executablePath });
  let fails = 0, seen = 0;
  for (const w of WIDTHS) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
    const p = await ctx.newPage();
    await p.route('**/*', r => { const u = r.request().url();
      return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort(); });
    for (const page of PAGES) {
      await p.goto(`${BASE}/${page}`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(300);
      const r = await p.evaluate((tol) => [...document.querySelectorAll('.fp-wrap')].map(el => ({
        id: (el.closest('section') && el.closest('section').querySelector('h2[id]') || {}).id || '?',
        wrap: el.clientWidth, need: el.scrollWidth, scrolls: el.scrollWidth > el.clientWidth + tol })), TOL);
      seen += r.length;
      const bad = r.filter(x => x.scrolls);
      if (bad.length) {
        fails += bad.length;
        bad.forEach(x => console.log(`TABLE SCROLLS  ${page} at ${w}px: #${x.id} needs ${x.need}px in a ${x.wrap}px box`));
      }
    }
    await ctx.close();
  }
  await b.close();

  if (seen < MIN_TABLES) {
    console.log(`VACUOUS: measured ${seen} tables across ${PAGES.length} page(s) at ${WIDTHS.length} widths; ` +
                `expected at least ${MIN_TABLES}. The check inspected too little to mean anything.`);
    process.exit(1);
  }
  console.log(fails ? `visit tables: ${fails} table(s) need sideways scrolling` :
                      `visit tables: ${PAGES.length} page(s) x ${WIDTHS.join('/')}px, ${seen} tables, all fit`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
