/* Did the map actually draw anything?

   On 2026-08-10 the Atlas on egybi.com was a blank white rectangle with
   "Loading layers…" frozen underneath it. One line was responsible:

     window.EGYBI.mapkit.outline is not a function
       at init (assets/geospatial.js:302)

   The host was serving a mapkit.js older than the page module calling into it.
   A coastline halo is decoration, but calling a function that does not exist
   throws, the throw aborted init before a single layer had been fetched, and a
   missing ornament took down the whole page.

   Twenty-seven mutation-tested checkers ran green throughout, and they were all
   correct to. Every one of them runs against this repository, where the files
   are by construction in sync. The defect existed only in the combination of
   files the HOST was serving. No amount of checking a consistent tree finds a
   fault that only appears in an inconsistent one.

   So this file asks two questions.

   FIRST, THE PLAIN ONE. Every map page must finish loading with geometry on
   screen and no loading placeholder left behind. That is the invariant the
   screenshot violated, and nothing here asserted it: all-pages.js watches for
   console errors, contrast checks colours, map-interaction checks keyboard and
   off-origin — but a map that silently drew nothing would have passed all of
   them, because rendering zero paths is not an error, it is an absence.

   SECOND, AND THIS IS THE ONE THAT MATTERS. With SKEW_MAPKIT set to an older
   copy of mapkit.js, every request for mapkit.js is answered with that older
   file while everything else stays current — a partial deploy, reproduced. The
   pages must still render. This is the only check here that can see the class
   of bug that actually happened, because it is the only one that stops assuming
   the deployed files agree with each other.

   That second mode is also the definition of "optional". A shared helper is
   optional if and only if the pages still work without it, and this is how that
   claim gets tested rather than asserted in a comment. */
const { chromium, executablePath, BASE } = require('./env');
const fs = require('fs');
const B = BASE;

// Page, map container, and how long to wait for it to settle. Explicit rather
// than discovered, so a new map page that forgets to appear here is a visible
// omission in a diff rather than a silent gap.
const MAPS = [
  ['explore.html',    '#egyptMap'],
  ['geospatial.html', '#atlasMap'],
  ['places.html',     '#placesMap'],
  ['invest.html',     '#investMap'],
  ['streets.html',    '#streetsMap'],
  ['visit.html',      '#visitMap'],
  ['stories.html',    '#mapRibbon'],
];
const PICK = process.env.ONLY ? process.env.ONLY.split(',') : null;
const TARGETS = PICK ? MAPS.filter(m => PICK.includes(m[0])) : MAPS;

// An older mapkit.js to serve in place of the current one, reproducing the
// partial deploy that caused the outage.
const SKEW = process.env.SKEW_MAPKIT || '';
const SKEW_BODY = SKEW ? fs.readFileSync(SKEW, 'utf8') : null;

(async () => {
  const b = await chromium.launch({ executablePath });
  const rows = [];
  for (const [page, sel] of TARGETS) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    const thrown = [];
    p.on('pageerror', e => thrown.push(e.message));
    await p.route('**/*', route => {
      const u = route.request().url();
      if (SKEW_BODY && /\/assets\/mapkit\.js(\?|$)/.test(u)) {
        return route.fulfill({ status: 200, contentType: 'application/javascript',
                               body: SKEW_BODY });
      }
      return (u.startsWith(B) || u.startsWith('data:') || u.startsWith('blob:'))
        ? route.continue() : route.abort();
    });
    await p.goto(`${B}/${page}`, { waitUntil: 'domcontentloaded' });
    // Long enough for the fetched layers and the deferred fitBounds timers.
    await p.waitForTimeout(5000);
    const r = await p.evaluate(({ sel }) => {
      const box = document.querySelector(sel);
      if (!box) return { missing: true };
      // A placeholder still on screen after the page has settled. Bounded in
      // length so a paragraph merely containing the word is not mistaken for
      // one, and required to be visible, because these pages legitimately keep
      // hidden templates around.
      const stuck = [...document.querySelectorAll('body *')]
        .filter(e => !e.children.length)
        .filter(e => {
          const t = (e.textContent || '').trim();
          if (!/^loading\b/i.test(t) || t.length > 40) return false;
          const s = getComputedStyle(e);
          return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.01;
        })
        .map(e => (e.textContent || '').trim());
      return {
        paths: box.querySelectorAll('path').length,
        markers: box.querySelectorAll('.leaflet-marker-icon').length,
        stuck,
      };
    }, { sel });
    rows.push({ page, sel, thrown, ...r });
    await p.close();
  }

  console.log(SKEW ? `mapkit.js replaced with ${SKEW}\n` : '');
  console.log('page / container            paths  markers  thrown   still "Loading…"');
  console.log('-'.repeat(88));
  let bad = 0;
  for (const r of rows) {
    const id = `${r.page} ${r.sel}`.padEnd(28);
    if (r.missing) { console.log(`${id} -- container not found --`); bad++; continue; }
    const fail = r.paths === 0 || r.stuck.length > 0 || r.thrown.length > 0;
    if (fail) bad++;
    console.log(`${id} ${String(r.paths).padStart(5)}  ${String(r.markers).padStart(7)}`
      + `  ${String(r.thrown.length).padStart(6)}   ${r.stuck.length ? JSON.stringify(r.stuck[0]) : '-'}`
      + (r.paths === 0 ? '   <-- MAP DREW NOTHING' : '')
      + (r.stuck.length ? '   <-- STUCK LOADING' : '')
      + (r.thrown.length ? '   <-- UNCAUGHT: ' + r.thrown[0].slice(0, 60) : ''));
  }
  console.log(`\nmap pages that failed to render: ${bad}`);
  await b.close();
  process.exit(bad ? 1 : 0);
})();
