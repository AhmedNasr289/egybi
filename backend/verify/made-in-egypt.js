#!/usr/bin/env node
/* Made in Egypt in a real page (2026-11-18). coverage.py holds the data file
   to its rules; this tests what a reader sees, at phone width (375 px):

     1. THE PAGE: made-in-egypt.html, ar/ and ru/, shows one card for every
        item in made-in-egypt.json, each with a source link and a checked
        date, the no-payment line, and nothing wider than the screen.
        CARDS MISSING / NO SOURCE / NO DISCLOSURE / WIDER THAN THE SCREEN.
     2. MADE NEAR HERE: visit/siwa.html links every item made near Siwa, and
        each link lands on a card that exists. NEAR LINK BROKEN.
     3. THE PLANNER: a saved trip with a Siwa stop shows the items made near
        it on the stop card, linking to the page in the planner's language;
        on ar/plan.html and ru/plan.html the line is in that language.
        PLANNER STOP WITHOUT MADE NEAR HERE / LEFT IN ENGLISH.

   Exits 1 on any failure. */
const fs = require('fs');
const path = require('path');
const { chromium, executablePath, BASE } = require('./env');

const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'site', 'data', 'made-in-egypt.json'), 'utf8'));
const ROWS = DATA.groups.flatMap((g) => g.rows);
const NEAR_SIWA = ROWS.filter((r) => (r.near || []).includes('siwa')).map((r) => r.key);
const KEY = 'egybi.trip.v1';
const SIWA = { id: 'site:siwa', name: 'Siwa Oasis', lat: 29.2032, lon: 25.5195, days: 1 };
const SCRIPT = { 'ar/': /[؀-ۿ]/, 'ru/': /[Ѐ-ӿ]/ };

(async () => {
  const b = await chromium.launch({ executablePath });
  const ctx = await b.newContext({ viewport: { width: 375, height: 800 } });
  await ctx.route('**/*', (r) => {
    const u = r.request().url();
    return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort();
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  let fails = 0;
  const fail = (m) => { console.log('FAIL ' + m); fails++; };

  // 1. the page, in three languages
  for (const lang of ['', 'ar/', 'ru/']) {
    await p.goto(BASE + '/' + lang + 'made-in-egypt.html');
    const got = await p.evaluate(() => ({
      cards: Array.from(document.querySelectorAll('article.mie-card')).map((a) => ({
        key: a.getAttribute('data-item'),
        src: !!a.querySelector('.mie-src a[href^="https://"]'),
        date: !!a.querySelector('.mie-src time[datetime]'),
      })),
      disclose: ((document.querySelector('.mie-disclose') || {}).textContent || '').trim(),
      wide: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    const where = (lang || 'en/') + 'made-in-egypt.html';
    const keys = new Set(got.cards.map((c) => c.key));
    const missing = ROWS.filter((r) => !keys.has(r.key)).map((r) => r.key);
    if (missing.length) fail(`CARDS MISSING: ${where} has no card for ${missing.join(', ')}`);
    for (const c of got.cards) {
      if (!c.src) fail(`NO SOURCE: ${where} card ${c.key} has no source link`);
      if (!c.date) fail(`NO SOURCE: ${where} card ${c.key} has no checked date`);
    }
    if (!got.disclose) fail(`NO DISCLOSURE: ${where} does not say EgyBI takes no payment`);
    else if (lang && !SCRIPT[lang].test(got.disclose)) fail(`NO DISCLOSURE: ${where} states it in English: "${got.disclose.slice(0, 80)}"`);
    if (got.wide > 1) fail(`WIDER THAN THE SCREEN: ${where} scrolls sideways by ${got.wide}px at 375px`);
    console.log(`${where}: ${got.cards.length} cards, ${ROWS.length} items in the data`);
  }

  // 2. Made near here on a visit page
  await p.goto(BASE + '/visit/siwa.html');
  const chips = await p.evaluate(() => Array.from(document.querySelectorAll('#made-near a.chip')).map((a) => a.getAttribute('href')));
  const linked = chips.map((h) => h.split('#')[1]);
  for (const k of NEAR_SIWA) if (!linked.includes(k)) fail(`NEAR LINK BROKEN: visit/siwa.html does not link ${k}`);
  for (const k of linked) if (!ROWS.some((r) => r.key === k)) fail(`NEAR LINK BROKEN: visit/siwa.html links #${k}, which is no card`);
  console.log(`visit/siwa.html: ${chips.length} made-near link(s)`);

  // 3. the planner's stop card
  for (const lang of ['', 'ar/', 'ru/']) {
    await p.goto(BASE + '/plan.html');
    await p.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify({ start: null, end: null, name: '', stops: s })), [KEY, [SIWA]]);
    await p.goto(BASE + '/' + lang + 'plan.html');
    await p.waitForFunction(() => document.querySelector('#stopList p.made-near'), null, { timeout: 15000 }).catch(() => {});
    const line = await p.evaluate(() => {
      const e = document.querySelector('#stopList p.made-near');
      return e ? { text: e.textContent, hrefs: Array.from(e.querySelectorAll('a')).map((a) => a.href) } : null;
    });
    const where = (lang || 'en/') + 'plan.html';
    if (!line) { fail(`PLANNER STOP WITHOUT MADE NEAR HERE: ${where}, Siwa stop`); continue; }
    if (line.hrefs.length !== NEAR_SIWA.length) fail(`PLANNER STOP WITHOUT MADE NEAR HERE: ${where} links ${line.hrefs.length} of ${NEAR_SIWA.length} items`);
    for (const h of line.hrefs) {
      if (!h.includes('/' + lang + 'made-in-egypt.html#')) fail(`PLANNER STOP WITHOUT MADE NEAR HERE: ${where} links ${h}, not the ${lang || 'English '}page`);
    }
    if (lang && (/[A-Za-z]{3,}/.test(line.text) || !SCRIPT[lang].test(line.text))) {
      fail(`LEFT IN ENGLISH: ${where} made-near line reads "${line.text.slice(0, 120)}"`);
    }
    console.log(`${where}: ${line.text.slice(0, 90)}`);
  }

  if (errors.length) fail('page errors: ' + errors.slice(0, 3).join(' | '));
  await b.close();
  console.log(fails ? `${fails} failure(s)` : 'made-in-egypt: page, visit links and planner stop all present');
  process.exit(fails ? 1 : 0);
})();
