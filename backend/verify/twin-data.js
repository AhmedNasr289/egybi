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
   (since 2b also visit, places, geospatial and community, whose scripts go
   through EGYBI.url in egybi.js)
   - every data/*.json and api/*.php request goes to the site's own data/,
     api/ or auth/ folder:
     TWIN DATA FROM WRONG FOLDER;
   - each page's data reached the page (home: the rate table and the
     briefing; prices: the price groups; planner: the climate file):
     TWIN DATA NOT LOADED;
   - every link a script wrote to a page without a translated copy points at
     the site root's copy: TWIN LINK WRONG FOLDER.

   Exits 1 on any failure. */
const fs = require('fs');
const path = require('path');
const { chromium, executablePath, BASE } = require('./env');
const SITE = path.join(__dirname, '..', '..', 'site');

const PAGES = ['index.html', 'plan.html', 'fair-prices.html', 'visit.html', 'places.html', 'geospatial.html', 'community.html',
               'stories.html', 'streets.html'];
// the file each page must load, for the pages with no on-screen marker below
const NEEDS = {
  'plan.html': '/data/visit-climate.json',
  'visit.html': '/data/visit-climate.json',
  'places.html': '/data/geo-places.json',
  'geospatial.html': '/data/geo-health.json',
  'community.html': '/api/community.php',
  'stories.html': '/data/geo-health.json',
  'streets.html': '/data/streets-districts.json',
};
const LANGS = ['', 'ar/', 'ru/'];
// pages a script links to that have no translated copy
// pages the scripts write links to; a link must stay in the reader's
// language when that page has a copy there, and go to the root when not
const ROOTED = ['visit.html', 'prices.html', 'account.html'];
const hasTwin = (lang, name) => !!lang && fs.existsSync(path.join(SITE, lang, name));

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
        if (/\.(json|php)(\?|$)/.test(u)) data.push({ path: new URL(u).pathname, status: r.status() });
      });
      await p.goto(`${BASE}/${lang}${page}`, { waitUntil: 'load' });
      await p.waitForLoadState('networkidle').catch(() => {});

      if (bad.length) fail(`TWIN REQUEST FAILED: ${where} got ${bad.slice(0, 4).join(', ')}`);
      const wrong = data.filter(d => !/^\/(data|api|auth)\//.test(d.path));
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
        loaded = data.some(d => d.path === NEEDS[page] && d.status === 200);
      }
      if (!loaded) fail(`TWIN DATA NOT LOADED: ${where} (data requests: ${data.map(d => d.status + ' ' + d.path).join(', ') || 'none'})`);

      const links = await p.evaluate(rooted => [...document.querySelectorAll('main a[href]')]
        .map(a => a.href)
        .filter(h => rooted.some(n => new URL(h).pathname.endsWith('/' + n))), ROOTED);
      const off = links.filter(h => {
        const p = new URL(h).pathname, name = p.split('/').pop();
        return p !== (hasTwin(lang, name) ? '/' + lang + name : '/' + name);
      });
      if (off.length) fail(`TWIN LINK WRONG FOLDER: ${where} links to ${off.map(h => new URL(h).pathname).join(', ')}`);

      // The visit page (2026-11-18): the month caption visit.js writes reads
      // in the page's language; English stays English.
      if (page === 'visit.html' && loaded) {
        const cap = await p.waitForFunction(() => {
          const c = document.getElementById('monthCap');
          return c && c.textContent.trim() ? c.textContent.trim() : null;
        }, null, { timeout: 8000 }).then(h => h.jsonValue(), () => '');
        const eng = /a normal afternoon|degrees within one country|sites runs from/;
        if (!cap) fail(`TWIN DATA NOT LOADED: ${where} - the month caption stayed empty`);
        else if (lang && eng.test(cap)) fail(`TWIN SCRIPT TEXT IN ENGLISH: ${where} month caption reads "${cap.slice(0, 160)}"`);
        // On Arabic pages the site names come from the climate file's name_ar,
        // so the caption has no Latin letter at all (2026-11-18).
        else if (lang === 'ar/' && /[A-Za-z]/.test(cap)) fail(`TWIN SCRIPT TEXT IN ENGLISH: ${where} month caption names a site in English: "${cap.slice(0, 160)}"`);
        else if (!lang && !/^In \w+, a normal afternoon/.test(cap)) fail(`TWIN SCRIPT TEXT IN ENGLISH: the English month caption changed to "${cap.slice(0, 160)}"`);
        else console.log(`${where}: month caption in the page's language`);
      }

      // The places page (2026-11-18): the summary line and an opened place
      // card read in the page's language; English stays English.
      if (page === 'places.html' && loaded) {
        await p.waitForFunction(() => document.querySelector('#placeList tr[data-k]'), null, { timeout: 8000 }).catch(() => {});
        const row = await p.$('#placeList tr[data-k]');
        if (row) await row.click();
        const card = await p.evaluate(() => ({
          meta: (document.getElementById('placesMeta') || {}).textContent || '',
          card: (document.getElementById('placeDetail') || {}).textContent || '',
        }));
        const eng = /OpenStreetMap, as of|Going there|Governorate|Coordinates|Open in OpenStreetMap|\+ Add to my trip plan/;
        const all = card.meta + ' | ' + card.card;
        if (!card.card) fail(`TWIN DATA NOT LOADED: ${where} - no place card opened`);
        else if (lang && eng.test(all)) fail(`TWIN SCRIPT TEXT IN ENGLISH: ${where} place card reads "${all.slice(0, 160)}"`);
        else if (!lang && !/Going there/.test(card.card)) fail(`TWIN SCRIPT TEXT IN ENGLISH: the English place card changed to "${card.card.slice(0, 160)}"`);
        else console.log(`${where}: place card in the page's language`);
      }

      // Text the header scripts write (stage 4a): in Arabic and Russian it
      // comes from assets/i18n/<lang>.js; in English it stays English.
      const chromeText = await p.evaluate(() => {
        const s = document.getElementById('signinBtn'), o = document.querySelector('.otp-label');
        return { signin: s ? s.textContent.trim() : null, otp: o ? o.textContent.trim() : null };
      });
      const english = { signin: 'Sign in', otp: 'On this page' };
      for (const k of Object.keys(english)) {
        const v = chromeText[k];
        if (v === null) continue;
        if (lang && v === english[k]) fail(`TWIN SCRIPT TEXT IN ENGLISH: ${where} shows "${v}"`);
        if (!lang && v !== english[k]) fail(`TWIN SCRIPT TEXT IN ENGLISH: the English ${page} shows "${v}" for "${english[k]}"`);
      }
      if (lang && chromeText.signin === null) fail(`TWIN SCRIPT TEXT IN ENGLISH: ${where} has no sign-in button to check`);

      // The sign-in dialog (stage 4b), opened on the home page in each language.
      if (page === 'index.html') {
        const dlg = await p.click('#signinBtn').then(() => p.waitForFunction(() => {
          const h = document.getElementById('authTitle');
          return h && h.textContent.trim() ? { title: h.textContent.trim(),
            email: (document.querySelector('label[for="authEmail"]') || {}).textContent || '' } : null;
        }, null, { timeout: 8000 })).then(h => h.jsonValue(), () => null);
        if (!dlg) fail(`TWIN SCRIPT TEXT IN ENGLISH: ${where} - the sign-in dialog did not open`);
        else if (lang && (dlg.title === 'Welcome back' || dlg.email === 'Email')) fail(`TWIN SCRIPT TEXT IN ENGLISH: ${where} dialog shows "${dlg.title}" / "${dlg.email}"`);
        else if (!lang && (dlg.title !== 'Welcome back' || dlg.email !== 'Email')) fail(`TWIN SCRIPT TEXT IN ENGLISH: the English dialog shows "${dlg.title}" / "${dlg.email}"`);
        else console.log(`${where}: sign-in dialog "${dlg.title}" / "${dlg.email}"`);
      }

      console.log(`${where}: ${data.length} data file(s), ${links.length} rooted link(s), ${bad.length} failed request(s), sign-in "${chromeText.signin}", on-this-page "${chromeText.otp}"`);
      await ctx.close();
    }
  }
  await b.close();
  if (fails) { console.log(`\n${fails} twin-data failure(s)`); process.exit(1); }
  console.log('\ntwin-data: every page in every language loads its data from data/ and links rooted pages at the root');
})();
