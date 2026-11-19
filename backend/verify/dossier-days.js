#!/usr/bin/env node
/* The day-by-day dossier (2026-11-19, maps plan stage 4).

   With a saved trip of three stops (Giza 2 days, Karnak 2 days, Abu Simbel
   1 day) arriving on 10 December 2026, the dossier on plan.html, ar/ and ru/,
   at phone width, must give:

     1. each stop its own dates, counted from the arrival day in stop order:
        10-11 Dec, 12-13 Dec, 14 Dec. DOSSIER DATES WRONG.
     2. the Ministry's opening hours on the Giza sheet ("Opens 07:00", or its
        translation with the same time). DOSSIER HOURS MISSING.
     3. a sunrise and sunset line on every sheet, with two clock times.
        DOSSIER SUN MISSING.
     4. on the Arabic and Russian pages, those lines in that language.
        DOSSIER LEFT IN ENGLISH.

   Exits 1 on any failure. */
const { chromium, executablePath, BASE } = require('./env');

const KEY = 'egybi.trip.v1';
const TRIP = { start: '2026-12-10', end: '2026-12-15', name: 'Check', stops: [
  { id: 'site:giza', name: 'Giza Pyramids', lat: 29.9792, lon: 31.1342, days: 2 },
  { id: 'site:karnak', name: 'Karnak', lat: 25.7188, lon: 32.6573, days: 2 },
  { id: 'site:abu-simbel', name: 'Abu Simbel', lat: 22.3372, lon: 31.6258, days: 1 }] };
const WANT = [['2026-12-10', '2026-12-11'], ['2026-12-12', '2026-12-13'], ['2026-12-14', '2026-12-14']];
const CLOCK = /[0-9٠-٩]{1,2}:[0-9٠-٩]{2}/g;

(async () => {
  const b = await chromium.launch({ executablePath });
  const ctx = await b.newContext({ viewport: { width: 375, height: 800 } });
  await ctx.route('**/*', (r) => {
    const u = r.request().url();
    return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort();
  });
  const p = await ctx.newPage();
  let fails = 0;
  const fail = (m) => { console.log('FAIL ' + m); fails++; };

  for (const lang of ['', 'ar/', 'ru/']) {
    await p.goto(BASE + '/plan.html');
    await p.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, TRIP]);
    await p.goto(BASE + '/' + lang + 'plan.html');
    const where = (lang || 'en/') + 'plan.html';
    const got = await p.waitForFunction(() => {
      const w = Array.from(document.querySelectorAll('#dossier .dossier-when'));
      return w.length === 3 && document.querySelector('#dossier .dossier-hours') ? {
        when: w.map((e) => [e.getAttribute('data-from'), e.getAttribute('data-to')]),
        hours: Array.from(document.querySelectorAll('#dossier .dossier-hours')).map((e) => e.textContent),
        sun: Array.from(document.querySelectorAll('#dossier .dossier-sun')).map((e) => e.textContent),
        // Each stop sheet ends with its coordinates (plan.js coords, 2026-11-19).
        coords: Array.from(document.querySelectorAll('#dossier .sheet > .chart-cap:last-child')).map((e) => e.textContent)
          .filter((c) => /[0-9٠-٩]{2}[.٫][0-9٠-٩]{4}/.test(c)),
      } : null;
    }, null, { timeout: 15000 }).then((h) => h.jsonValue(), () => null);
    if (!got) { fail(`DOSSIER DATES WRONG: ${where} - no three dated stop sheets with hours appeared`); continue; }
    got.when.forEach((w, i) => {
      if (w[0] !== WANT[i][0] || w[1] !== WANT[i][1]) fail(`DOSSIER DATES WRONG: ${where} stop ${i + 1} runs ${w[0]} to ${w[1]}, expected ${WANT[i][0]} to ${WANT[i][1]}`);
    });
    const giza = (got.hours[0] || '').replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
    if (!/\b0?7:00\b/.test(giza)) fail(`DOSSIER HOURS MISSING: ${where} Giza sheet reads "${got.hours[0]}"`);
    if (got.sun.length !== 3) fail(`DOSSIER SUN MISSING: ${where} has ${got.sun.length} sun line(s) for 3 stops`);
    got.sun.forEach((s, i) => { if ((s.match(CLOCK) || []).length < 2) fail(`DOSSIER SUN MISSING: ${where} stop ${i + 1} sun line has no times: "${s.slice(0, 100)}"`); });
    if (lang === 'ar/' && got.coords.some((c) => /[0-9]\.[0-9]/.test(c))) fail(`DOSSIER DIGITS WRONG: ${where} coordinates in Western digits "${got.coords.join(' | ').slice(0, 120)}"`);
    if (!got.coords.length) fail(`DOSSIER DIGITS WRONG: ${where} - no stop coordinates found`);
    if (lang && /Opening hours|sunrise|sunset|Opens /.test(got.hours.join(' ') + got.sun.join(' '))) {
      fail(`DOSSIER LEFT IN ENGLISH: ${where} reads "${(got.hours[0] + ' | ' + got.sun[0]).slice(0, 160)}"`);
    }
    console.log(`${where}: ${got.when.map((w) => w.join('..')).join(', ')}; ${got.sun[0].slice(0, 90)}`);
  }
  await b.close();
  console.log(fails ? `${fails} failure(s)` : 'dossier-days: dated sheets with hours and the sun in three languages');
  process.exit(fails ? 1 : 0);
})();
