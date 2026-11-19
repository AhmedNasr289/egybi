#!/usr/bin/env node
/* When the map library does not load (2026-11-19, maps plan stage 2).

   A blocked script or a stale offline cache can leave a page without
   leaflet.js. visit.js used to return before loading any data, so the whole
   heat page stayed blank, and the planner's map box stayed empty with no word
   of why. With leaflet.js blocked, at phone width:

     1. visit.html: the map box says the map could not load, and the month
        table still fills from visit-climate.json. MAP FALLBACK MISSING /
        TABLES EMPTY WITHOUT THE MAP.
     2. plan.html: the map box says the map could not load, and the site
        buttons are still there. MAP FALLBACK MISSING.
     3. With leaflet.js allowed, the same pages draw their maps (a control:
        the check must be able to tell the two apart). NO MAP WITH THE LIBRARY.

   Exits 1 on any failure. */
const { chromium, executablePath, BASE } = require('./env');

(async () => {
  const b = await chromium.launch({ executablePath });
  let fails = 0;
  const fail = (m) => { console.log('FAIL ' + m); fails++; };

  for (const block of [true, false]) {
    const ctx = await b.newContext({ viewport: { width: 375, height: 800 } });
    await ctx.route('**/*', (r) => {
      const u = r.request().url();
      if (block && /\/vendor\/leaflet\.js/.test(u)) return r.abort();
      return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort();
    });
    const p = await ctx.newPage();
    const tag = block ? 'without leaflet.js' : 'with leaflet.js';

    await p.goto(BASE + '/visit.html');
    const v = await p.waitForFunction(() => {
      const rows = document.querySelectorAll('#monthBody tr').length;
      return rows ? { rows, box: (document.getElementById('visitMap') || {}).textContent || '',
        leaflet: !!document.querySelector('#visitMap.leaflet-container') } : null;
    }, null, { timeout: 15000 }).then((h) => h.jsonValue(), () => null);
    if (!v) fail(`TABLES EMPTY WITHOUT THE MAP: visit.html ${tag} - the month table never filled`);
    else if (block && !/could not load/.test(v.box)) fail(`MAP FALLBACK MISSING: visit.html ${tag} map box reads "${v.box.slice(0, 80)}"`);
    else if (!block && !v.leaflet) fail(`NO MAP WITH THE LIBRARY: visit.html ${tag} drew no map`);
    else console.log(`visit.html ${tag}: ${v.rows} table rows, ${block ? 'fallback message shown' : 'map drawn'}`);

    await p.goto(BASE + '/plan.html');
    const pl = await p.waitForFunction(() => {
      const chips = document.querySelectorAll('#siteChips button, #siteChips a').length;
      return chips ? { chips, box: (document.getElementById('planMap') || {}).textContent || '',
        leaflet: !!document.querySelector('#planMap.leaflet-container') } : null;
    }, null, { timeout: 15000 }).then((h) => h.jsonValue(), () => null);
    if (!pl) fail(`MAP FALLBACK MISSING: plan.html ${tag} - no site buttons appeared`);
    else if (block && !/could not load/.test(pl.box)) fail(`MAP FALLBACK MISSING: plan.html ${tag} map box reads "${pl.box.slice(0, 80)}"`);
    else if (!block && !pl.leaflet) fail(`NO MAP WITH THE LIBRARY: plan.html ${tag} drew no map`);
    else console.log(`plan.html ${tag}: ${pl.chips} site buttons, ${block ? 'fallback message shown' : 'map drawn'}`);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? `${fails} failure(s)` : 'map-fallback: both pages work and say so without the map library');
  process.exit(fails ? 1 : 0);
})();
