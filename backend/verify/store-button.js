#!/usr/bin/env node
/* The $12 pack's buy button (site/assets/store.js), driven in Chromium against the
   real dossier pages, with data/store.json replaced per case by request interception.

   Why it exists (2026-11-20): the store opens by pasting one URL into store.json.
   The failure modes worth catching are a page that shows a buy button while nothing
   is on sale, one that still says "not on sale" after the URL is set, a button that
   points anywhere other than the shop, and Arabic/Russian pages with English labels.

   Needs the site served:  python3 -m http.server 8793 --directory site
   Exit 1 on any failure. */
'use strict';
const { chromium, executablePath } = require('./env');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://127.0.0.1:8793';
const real = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'site', 'data', 'store.json'), 'utf8'));
const withUrl = (u) => JSON.stringify({ ...real, pack: { ...real.pack, url: u } });
const PAYHIP = 'https://payhip.com/b/AbC12';

async function run(browser, page, storeBody, query = '') {
  const p = await browser.newPage();
  await p.route('**/data/store.json*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: storeBody }));
  await p.goto(BASE + page + query, { waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  const out = await p.evaluate(() => {
    const card = document.querySelectorAll('#versions .sheet.offer')[1];
    const btn = card && card.querySelector('a[data-ev="pack_buy_click"]');
    return {
      text: card ? card.textContent : '',
      tag: !!(card && card.querySelector('.status-tag')),
      href: btn ? btn.getAttribute('href') : null,
      label: btn ? btn.textContent : null,
      thanks: card && card.querySelector('[role="status"]') ? card.querySelector('[role="status"]').textContent : null,
    };
  });
  await p.close();
  return out;
}

(async () => {
  const browser = await chromium.launch({ executablePath });
  let bad = 0;
  const check = (ok, msg) => { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); };

  // 1. As committed: the url is empty, so nothing changes.
  let r = await run(browser, '/dossier.html', JSON.stringify(real));
  check(r.href === null && r.tag && /not on sale yet/.test(r.text), 'empty url: no button, "In preparation" and "not on sale" kept');

  // 2. A Payhip url opens the store, in each language.
  const want = { '/dossier.html': real.pack.label.en, '/ar/dossier.html': real.pack.label.ar, '/ru/dossier.html': real.pack.label.ru };
  for (const [pg, label] of Object.entries(want)) {
    r = await run(browser, pg, withUrl(PAYHIP));
    check(r.href === PAYHIP && r.label === label && !r.tag, `${pg}: button to Payhip labelled "${r.label}"`);
    check(!/not on sale yet|لم تُطرح للبيع|пока не продаётся/.test(r.text), `${pg}: the not-on-sale sentence is gone once on sale`);
  }

  // 3. Anything that is not https on payhip.com or gumroad.com is refused.
  for (const u of ['http://payhip.com/b/x', 'https://payhip.com.evil.example/b/x', 'javascript:alert(1)', 'https://example.com/']) {
    r = await run(browser, '/dossier.html', withUrl(u));
    check(r.href === null && /not on sale yet/.test(r.text), `refused url ${u}`);
  }

  // 4. The return from checkout thanks the buyer.
  r = await run(browser, '/ru/dossier.html', withUrl(PAYHIP), '?bought=1');
  check(r.thanks === real.pack.thanks.ru, '/ru/dossier.html?bought=1 shows the Russian thank-you line');

  await browser.close();
  if (bad) { console.log(`${bad} problem(s)`); process.exit(1); }
  console.log('store button: hidden while not on sale, live in three languages once set, shop-only links');
})();
