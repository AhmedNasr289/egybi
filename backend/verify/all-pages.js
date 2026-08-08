/* Drive every page in site/ — all 16 top-level, all 123 challenges, all 12
   stories. Reports only what went wrong, plus a per-group tally. */
const { chromium, executablePath, BASE, LOGDIR } = require('./env');
const fs = require('fs');
const LOG = require('path').join(LOGDIR, 'pages.log');
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
  const b = await chromium.launch({ executablePath });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const bad = [], noSiteNav = [];
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
      // This asked "does .nav-links contain links", which is not the failure
      // that matters — the failure is a reader who cannot get anywhere from
      // here. The retired-section notices carry no site nav on purpose and
      // still offer four ways onward, and the old rule called that a problem.
      // So: an empty .nav-links container IS an authoring bug wherever one
      // exists, and separately every page must offer some onward link at all.
      // geoBoundaries is CC BY 4.0: the citation and a link to the deed are a
      // condition of using the geometry, and they must be visible on the page
      // carrying the map without any interaction. This is the one rule here
      // that is a legal obligation rather than a quality bar, which is exactly
      // why it belongs in the build and not in anyone's memory.
      // WHAT COUNTS AS USING THE GEOMETRY. This asked only "is there a Leaflet
      // map", which was true of the obligation right up until the home page
      // started drawing the national outline on the flag. That outline is
      // dissolved from the same geoBoundaries file, so index.html owes the
      // same attribution while carrying no map at all — a licence breach the
      // old question could not see. Ask instead whether the page renders
      // anything DERIVED from the dataset, by any of the three routes that
      // exist: a live map, the bundled boundary asset, or the silhouette.
      maps: document.querySelectorAll('.leaflet-container').length
        + document.querySelectorAll('script[src*="egypt-geo"]').length
        + document.querySelectorAll('img[src*="egypt-silhouette"]').length,
      creditVisible: [...document.querySelectorAll('[data-geo-credit], .map-credit, .site-footer')]
        .filter(function (el) {
          var s = getComputedStyle(el);
          return s.display !== 'none' && s.visibility !== 'hidden';
        })
        .some(function (el) {
          return /geoboundaries\.org/i.test(el.innerHTML);
        }),
      deedLinked: !!document.querySelector('a[href*="creativecommons.org/licenses/by/4.0"]'),
      hasNavEl: !!document.querySelector('.nav-links'),
      navLinks: document.querySelectorAll('.nav-links a').length,
      onward: new Set([...document.querySelectorAll('a[href]')]
        .map(a => a.getAttribute('href'))
        .filter(h => h && !/^(#|mailto:|tel:|javascript:)/.test(h) &&
                     !/^https?:/.test(h))).size,
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
    if (m.maps && !m.creditVisible) problems.push('geoBoundaries geometry rendered with no visible credit (CC BY 4.0 breach)');
    if (m.maps && !m.deedLinked) problems.push('geoBoundaries credit does not link the CC BY 4.0 deed');
    if (m.hasNavEl && m.navLinks === 0) problems.push('a .nav-links container with no links in it');
    if (m.onward === 0) problems.push('dead end: no link to any other page');
    if (!m.hasNavEl) noSiteNav.push(path);
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
  // Reported as a number, not a fault: a page may legitimately carry no site
  // nav, but a jump from two to twenty means the shell stopped rendering
  // somewhere and nobody would see it if this were silent.
  console.log(`pages with no site nav : ${noSiteNav.length}${noSiteNav.length ? ' (' + noSiteNav.join(', ') + ')' : ''}`);
  console.log(`\nproblems        : ${bad.length}`);
  bad.forEach(x => console.log('  ' + x));
  await b.close();
  process.exit(bad.length ? 1 : 0);
})();
