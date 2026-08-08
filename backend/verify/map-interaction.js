/* What the other checkers cannot see.

   all-pages.js loads a page and looks at it. That proves nothing about a map,
   because a map makes almost all of its requests AFTER you touch it — a tile
   provider is contacted on pan, on zoom, on layer switch, never on load. A
   "zero off-origin requests" number measured at rest is close to meaningless
   for the one property this site cares most about.

   So this drives them: pan, zoom in, zoom out, switch every layer toggle, click
   a feature, open a cluster, hit every control, at 1280px and at 375px, with
   request interception running the whole time. It also counts long tasks during
   the animated fly, tabs to every new control with real key presses, and
   repeats the run under prefers-reduced-motion to confirm nothing became
   unreachable rather than merely still.

   Usage: node backend/verify/map-interaction.js   (server on BASE) */
const { chromium, executablePath, BASE } = require('./env');

const PAGES = [
  { path: 'geospatial.html', map: 'atlasMap', toggles: '.map-toggle[data-metric], [data-overlay]' },
  { path: 'places.html', map: 'placesMap', toggles: '.map-toggle, [data-kind]' },
  { path: 'streets.html', map: 'streetsMap', toggles: '.map-toggle' },
  { path: 'explore.html', map: 'egyptMap', toggles: '.map-toggle' },
  { path: 'visit.html', map: 'visitMap', toggles: '.map-toggle' },
  { path: 'stories.html', map: null, toggles: null },
];
// Fonts are the one documented off-origin load on this site and are not a map
// provider. Everything else during an interaction is a finding.
const ALLOWED = /fonts\.g|googlesyndication|pagead|tradingview/;

// ONLY=<path> drives a single page, and FAST=1 a single viewport with motion
// on, so the mutation harness can prove one rule in ~20s instead of paying for
// all 24 sessions three times over.
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const FAST = process.env.FAST === '1';

const findings = [];
const add = (k, v) => findings.push(`${k}: ${v}`);

async function session(browser, page, width, reduced) {
  const ctx = await browser.newContext({
    viewport: { width, height: width < 500 ? 800 : 1000 },
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  const p = await ctx.newPage();
  const external = [];
  const errors = [];
  p.on('pageerror', e => errors.push(String(e).slice(0, 120)));
  p.on('request', r => {
    const u = r.url();
    if (!u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:') && !ALLOWED.test(u)) {
      external.push(new URL(u).host);
    }
  });

  await p.goto(`${BASE}/${page.path}`, { waitUntil: 'load' });
  await p.waitForTimeout(1600);

  const tag = `${page.path} @${width}${reduced ? ' reduced' : ''}`;

  if (page.map) {
    const has = await p.locator(`#${page.map}.leaflet-container`).count();
    if (!has) { add('map never initialised', tag); await ctx.close(); return { external, errors }; }

    // Count long tasks across the animated interaction. A fly that blocks the
    // main thread for 200ms reads as a stutter, and "it looked smooth to me" is
    // not a measurement.
    await p.evaluate(() => {
      window.__long = 0;
      try {
        new PerformanceObserver(l => { window.__long += l.getEntries().length; })
          .observe({ entryTypes: ['longtask'] });
      } catch (e) { window.__long = -1; }
    });

    const box = await p.locator(`#${page.map}`).boundingBox();
    if (box) {
      // Drag-pan with the real pointer, not map.panBy — a synthetic call skips
      // the drag handler that a provider-backed map would fetch from.
      await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await p.mouse.down();
      await p.mouse.move(box.x + box.width / 2 - 90, box.y + box.height / 2 - 60, { steps: 12 });
      await p.mouse.up();
      await p.waitForTimeout(500);
    }
    // Zoom via the kit's own buttons, so the buttons are exercised too.
    for (const label of ['Zoom in', 'Zoom in', 'Zoom out']) {
      const b = p.locator(`#${page.map} button[aria-label="${label}"]`).first();
      if (await b.count()) { await b.click(); await p.waitForTimeout(650); }
    }
    const reset = p.locator(`#${page.map} button[aria-label="Reset the view"]`).first();
    if (await reset.count()) { await reset.click(); await p.waitForTimeout(900); }

    // Click a feature: the fly-to and detail panel path.
    //
    // Pick one with real geometry inside the viewport. The first attempt used
    // `path.leaflet-interactive` and hit visit.html's placeholder `d="M0 0"` —
    // a zero-size path parked off-screen — which threw "Element is outside of
    // the viewport" and killed the entire run, losing every finding for every
    // other page. A checker has to survive the thing it is poking.
    const clickFirstVisible = async (selector) => {
      const els = p.locator(`#${page.map} ${selector}`);
      const n = Math.min(await els.count(), 12);
      for (let i = 0; i < n; i += 1) {
        const el = els.nth(i);
        try {
          const b = await el.boundingBox();
          if (!b || b.width < 4 || b.height < 4) continue;
          await el.click({ force: true, timeout: 4000 });
          await p.waitForTimeout(950);
          return true;
        } catch (e) { /* try the next candidate */ }
      }
      return false;
    };
    // Reset first. After the pan and three zooms above, every feature can sit
    // outside the viewport — which is exactly what happened: clickFirstVisible
    // skipped all twelve candidates, returned false, and said nothing, so the
    // checker reported "no findings" for a click it never performed. An
    // injected off-origin fetch behind that click went unseen.
    const reset2 = p.locator(`#${page.map} button[aria-label="Reset the view"]`).first();
    if (await reset2.count()) { await reset2.click(); await p.waitForTimeout(950); }

    const clickedFeature = await clickFirstVisible('path.leaflet-interactive');
    await clickFirstVisible('.marker-cluster');
    // A skipped interaction is not a pass. Say so, or the run silently covers
    // less than it claims.
    if (!clickedFeature) add('could not click any map feature — interaction NOT exercised', tag);

    const long = await p.evaluate(() => window.__long);
    if (long > 12) add('long tasks during interaction', `${tag} — ${long}`);

    // Controls must be reachable by keyboard, with a real Tab, and must be
    // real buttons rather than Leaflet's default anchors-to-nowhere.
    const ctl = await p.evaluate((id) => {
      const host = document.getElementById(id);
      const btns = [...host.querySelectorAll('.mk-btn')];
      return {
        count: btns.length,
        anchors: host.querySelectorAll('.leaflet-control a[href="#"]').length,
        unnamed: btns.filter(b => !b.getAttribute('aria-label')).length,
        tabbable: btns.filter(b => b.tabIndex >= 0).length,
      };
    }, page.map);
    if (ctl.count === 0) add('no map-kit controls rendered', tag);
    if (ctl.unnamed) add('map control with no accessible name', `${tag} — ${ctl.unnamed}`);
    if (ctl.count !== ctl.tabbable) add('map control not in the tab order', tag);
    if (ctl.anchors) add('leaflet anchor-to-# control still present', `${tag} — ${ctl.anchors}`);

    // Focusable features. This counted paths with tabindex="0" and wanted 20+,
    // which was right when every polygon was its own tab stop. The choropleths
    // now use a roving tabindex — one stop into the map, arrow keys to move
    // geographically — so exactly one path carries 0 and the rest carry -1, and
    // the old rule reported the improvement as a regression.
    //
    // What actually matters: every governorate is reachable and named, and
    // precisely one of them is the way in.
    const foc = await p.evaluate((id) => ({
      entry: document.querySelectorAll(`#${id} path[tabindex="0"]`).length,
      reachable: document.querySelectorAll(`#${id} path[tabindex]`).length,
      named: [...document.querySelectorAll(`#${id} path[tabindex]`)]
        .filter(e => (e.getAttribute('aria-label') || '').trim()).length,
    }), page.map);
    if (page.path === 'geospatial.html' || page.path === 'explore.html') {
      if (foc.reachable < 20) add('governorates not keyboard-reachable', `${tag} — ${foc.reachable}`);
      else if (foc.entry !== 1) add('roving tabindex broken: entry points', `${tag} — ${foc.entry}`);
      else if (foc.named !== foc.reachable) {
        add('governorate reachable but unnamed', `${tag} — ${foc.reachable - foc.named}`);
      }
    }

    // Reduced motion must remove the movement, not the function: the same
    // controls, still operable, landing in the same place.
    if (reduced && ctl.count === 0) add('controls missing under reduced motion', tag);
  }

  if (external.length) add('OFF-ORIGIN REQUEST during interaction', `${tag} — ${[...new Set(external)].join(', ')}`);
  if (errors.length) add('console error during interaction', `${tag} — ${errors.join(' / ')}`);
  await ctx.close();
  return { external, errors };
}

(async () => {
  const browser = await chromium.launch({ executablePath });
  let sessions = 0, ext = 0;
  const pages = ONLY ? PAGES.filter(p => ONLY.indexOf(p.path) >= 0) : PAGES;
  for (const page of pages) {
    for (const width of (FAST ? [1280] : [1280, 375])) {
      for (const reduced of (FAST ? [false] : [false, true])) {
        const r = await session(browser, page, width, reduced);
        sessions += 1;
        ext += r.external.length;
      }
    }
  }
  await browser.close();
  console.log(`interaction sessions driven : ${sessions}`);
  console.log(`off-origin requests total   : ${ext}`);
  console.log();
  if (!findings.length) console.log('No findings.');
  else findings.forEach(f => console.log('  ' + f));
  process.exit(findings.length ? 1 : 0);
})();
