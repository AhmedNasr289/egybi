/* Drive every page in site/ — all 16 top-level, all 123 challenges, all 12
   stories. Reports only what went wrong, plus a per-group tally. */
const { chromium } = require('/tmp/claude-0/-home-user-egybi/88e1f418-6292-5215-8c2f-e114945c6b86/scratchpad/node_modules/playwright-core');
const fs = require('fs');
const BASE = 'http://localhost:8793';
const LOG = '/tmp/claude-0/-home-user-egybi/88e1f418-6292-5215-8c2f-e114945c6b86/scratchpad/pages.log';
fs.writeFileSync(LOG, '');
const ALLOWED_EXTERNAL = /fonts\.g|googlesyndication|pagead|tradingview/;

const top = fs.readdirSync('site').filter(f => f.endsWith('.html'));
const prac = fs.readdirSync('site/practice').filter(f => f.endsWith('.html')).map(f => 'practice/' + f);
const pap = fs.readdirSync('site/papyrus').filter(f => f.endsWith('.html')).map(f => 'papyrus/' + f);
const ALL = [...top, ...prac, ...pap];
// ONLY lets the mutation harness drive one page instead of 152. Same code path,
// same assertions — testing a copy of the logic would prove nothing about the
// tool that actually runs.
const PAGES = process.env.ONLY ? process.env.ONLY.split(',') : ALL;

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const bad = [];
  let n = 0, mapPages = 0;
  const t0 = Date.now();

  for (const path of PAGES) {
    const errs = [], f404 = [], ext = [];
    const onErr = e => errs.push(String(e).slice(0, 120));
    const onResp = r => { if (r.status() >= 400) f404.push(r.status() + ' ' + r.url().split('/').pop()); };
    const onReq = r => { const u = r.url();
      if (!u.startsWith(BASE) && !u.startsWith('data:') && !ALLOWED_EXTERNAL.test(u)) ext.push(new URL(u).host); };
    p.on('pageerror', onErr); p.on('response', onResp); p.on('request', onReq);

    let resp = null;
    try { resp = await p.goto(`${BASE}/${path}`, { waitUntil: 'load', timeout: 15000 }); }
    catch (e) { bad.push(path + '  ->  goto failed: ' + String(e).slice(0, 80)); p.off('pageerror', onErr); p.off('response', onResp); p.off('request', onReq); n++; continue; }
    await p.waitForTimeout(250);
    const m = await p.evaluate(() => ({
      stuck: (document.body.innerText.match(/Loading[…\.]|Loading the/g) || []).length,
      h1: document.querySelectorAll('h1').length,
      title: (document.title || '').length,
      canonical: !!document.querySelector('link[rel=canonical]'),
      noindex: !!document.querySelector('meta[name=robots][content*=noindex]'),
      maps: document.querySelectorAll('.leaflet-container').length,
      emptyNav: document.querySelectorAll('.nav-links a').length,
      // Chips are GENERATED from section[id][data-nav] by wayfinding.js, so a
      // chip's target always exists by construction and "orphaned chip" was a
      // check that could never fire. These are the authoring mistakes that can:
      // a section meant to be navigable that the selector silently skips for
      // want of an id, an empty label, and a mount with nothing to list.
      orphanChips: [...document.querySelectorAll('.on-this-page a')]
        .filter(a => !document.querySelector(a.getAttribute('href'))).length,
      navNoId: [...document.querySelectorAll('section[data-nav]')]
        .filter(s => !s.id).length,
      navBlankLabel: [...document.querySelectorAll('section[id][data-nav]')]
        .filter(s => !(s.getAttribute('data-nav') || '').trim()).length,
      navMountEmpty: (document.querySelector('nav.on-this-page[data-wayfinding]')
        && document.querySelectorAll('section[id][data-nav]').length === 0) ? 1 : 0,
    }));
    await p.setViewportSize({ width: 375, height: 800 });
    await p.waitForTimeout(80);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await p.setViewportSize({ width: 1280, height: 900 });

    if (m.maps) mapPages++;
    const problems = [];
    if (!resp || resp.status() !== 200) problems.push('status ' + (resp ? resp.status() : 'none'));
    if (errs.length) problems.push('console: ' + errs.join(' / '));
    if (f404.length) problems.push('http: ' + [...new Set(f404)].join(','));
    if (ext.length) problems.push('external: ' + [...new Set(ext)].join(','));
    if (ov > 0) problems.push('overflow ' + ov + 'px @375');
    if (m.stuck) problems.push('stuck on Loading x' + m.stuck);
    if (m.h1 !== 1) problems.push('h1 count ' + m.h1);
    if (!m.title) problems.push('no <title>');
    // A noindex page must NOT claim a canonical: it is a status, not a
    // document, and a canonical would invite the crawler it is refusing.
    // Any page that is not noindex still has to have one.
    if (!m.canonical && !m.noindex) problems.push('no canonical');
    if (m.canonical && m.noindex) problems.push('noindex page also claims a canonical');
    if (m.emptyNav === 0) problems.push('no nav links');
    if (m.orphanChips) problems.push('orphan sub-nav chips: ' + m.orphanChips);
    if (m.navNoId) problems.push('section[data-nav] with no id (silently gets no chip): ' + m.navNoId);
    if (m.navBlankLabel) problems.push('section[data-nav] with a blank label: ' + m.navBlankLabel);
    if (m.navMountEmpty) problems.push('on-this-page mount with no sections to list');
    if (problems.length) bad.push(path + '  ->  ' + problems.join(' | '));

    p.off('pageerror', onErr); p.off('response', onResp); p.off('request', onReq);
    fs.appendFileSync(LOG, `${++n}/${PAGES.length} ${path}${problems.length ? '  <<< ' + problems.join(' | ') : ''}\n`);
  }

  console.log(`\ndriven          : ${n} pages in ${((Date.now()-t0)/1000).toFixed(0)}s`);
  console.log(`  top-level     : ${top.length}`);
  console.log(`  challenges    : ${prac.length}`);
  console.log(`  stories       : ${pap.length}`);
  console.log(`  (404.html is inside the top-level set)`);
  console.log(`pages with maps : ${mapPages} (tile-free — any provider call would show as external)`);
  console.log(`\nproblems        : ${bad.length}`);
  bad.forEach(x => console.log('  ' + x));
  await b.close();
  process.exit(bad.length ? 1 : 0);
})();
