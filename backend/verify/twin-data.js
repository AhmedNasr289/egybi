/* "The Arabic and Russian copies load the same data as the English page."
   (2026-11-17)

   The translated pages live one folder down (ar/, ru/). Their scripts used
   to fetch 'data/visit-climate.json' relative to the PAGE, which from
   ar/index.html is ar/data/... - a 404 and an empty briefing - and the links
   the scripts write (visit.html#month, prices.html, account.html) pointed at
   ar/visit.html, a page that has no translated copy. trip.js now resolves both
   against its own address (always assets/).

   For each of index, plan and fair-prices, in English, Arabic and Russian,
   every other host blocked:
   - no same-origin request answers 400 or more: TWIN REQUEST FAILED;
   - every data/*.json request goes to the site's data/ folder:
     TWIN DATA FROM WRONG FOLDER;
   - each page's data reached the page (home: the rate table and the
     briefing; prices: the price groups; planner: the climate file):
     TWIN DATA NOT LOADED;
   - every link a script wrote to a page without a translated copy points at
     the site root's copy: TWIN LINK WRONG FOLDER.

   Exits 1 on any failure. */
const { chromium, executablePath, BASE } = require('./env');

const PAGES = ['index.html', 'plan.html', 'fair-prices.html'];
const LANGS = ['', 'ar/', 'ru/'];
// pages a script links to that have no translated copy
const ROOTED = ['visit.html', 'prices.html', 'account.html'];

(async () => {
  const b = await chromium.launch({ executablePath });
  let fails = 0;
  const fail = m => { console.log('FAIL ' + m); fails++; };
  for (const lang of LANGS) {
    for (const page of PAGES) {
      const where = (lang || 'en/') + page;
      const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
      await ctx.route('**/*', r => {
        const u = r.request().url();
        return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort();
      });
      const p = await ctx.newPage();
      const bad = [], data = [];
      p.on('response', r => {
        const u = r.url();
        if (!u.startsWith(BASE)) return;
        if (r.status() >= 400) bad.push(r.status() + ' ' + u.slice(BASE.length));
        if (/\.json(\?|$)/.test(u)) data.push({ path: new URL(u).pathname, status: r.status() });
      });
      await p.goto(`${BASE}/${lang}${page}`, { waitUntil: 'load' });
      await p.waitForLoadState('networkidle').catch(() => {});

      if (bad.length) fail(`TWIN REQUEST FAILED: ${where} got ${bad.slice(0, 4).join(', ')}`);
      const wrong = data.filter(d => !d.path.startsWith('/data/'));
      if (wrong.length) fail(`TWIN DATA FROM WRONG FOLDER: ${where} asked for ${wrong.map(d => d.path).join(', ')}`);

      let loaded;
      if (page === 'index.html') {
        loaded = await p.waitForFunction(() => {
          const rate = document.querySelector('#rateBox table');
          const lead = document.getElementById('briefLead');
          return !!rate && !!lead && !/…|\.\.\./.test(lead.textContent);
        }, null, { timeout: 8000 }).then(() => true, () => false);
      } else if (page === 'fair-prices.html') {
        loaded = await p.waitForFunction(() => {
          const g = document.getElementById('fpGroups');
          return !!g && g.children.length > 0;
        }, null, { timeout: 8000 }).then(() => true, () => false);
      } else {
        loaded = data.some(d => d.path === '/data/visit-climate.json' && d.status === 200);
      }
      if (!loaded) fail(`TWIN DATA NOT LOADED: ${where} (data requests: ${data.map(d => d.status + ' ' + d.path).join(', ') || 'none'})`);

      const links = await p.evaluate(rooted => [...document.querySelectorAll('main a[href]')]
        .map(a => a.href)
        .filter(h => rooted.some(n => new URL(h).pathname.endsWith('/' + n))), ROOTED);
      const off = links.filter(h => !ROOTED.some(n => new URL(h).pathname === '/' + n));
      if (off.length) fail(`TWIN LINK WRONG FOLDER: ${where} links to ${off.map(h => new URL(h).pathname).join(', ')}`);

      console.log(`${where}: ${data.length} data file(s), ${links.length} rooted link(s), ${bad.length} failed request(s)`);
      await ctx.close();
    }
  }
  await b.close();
  if (fails) { console.log(`\n${fails} twin-data failure(s)`); process.exit(1); }
  console.log('\ntwin-data: every page in every language loads its data from data/ and links rooted pages at the root');
})();
