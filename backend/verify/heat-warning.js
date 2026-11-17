#!/usr/bin/env node
/* The planner's heat warning (trip.js heatWarning, 2026-11-17), tested without
   a page. A stop warns only when its hottest trip month reaches the top heat
   band (39 °C or more, judged on the whole degree the reader sees), and says
   when the gates open if the site's opening hours are known.

   Hand cases pin the band edge (38.4 shows as 38 and does not warn; 38.6 shows
   as 39 and does) and the opening-time pick; two cases use the real data files,
   so a renamed site key or a changed hours line that loses its time is caught.
   Exit 1 on any mismatch. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
// The smallest page trip.js needs to load: at load it reads its own script
// address, the twins meta tag and the page's lang (trip.js lines 57-65), and
// touches nothing else until a function is called.
const ctx = {
  window: {}, console, URL,
  document: { currentScript: null, querySelector: () => null,
              documentElement: { getAttribute: () => 'en' } },
};
ctx.window.window = ctx.window;
vm.createContext(ctx);
for (const f of ['egfmt.js', 'trip.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'site', 'assets', f), 'utf8'), ctx, { filename: f });
}
const T = ctx.window.EGYBI && ctx.window.EGYBI.trip;
if (!T || typeof T.heatWarning !== 'function') {
  console.log('FAIL trip.js does not export heatWarning');
  process.exit(1);
}

const data = (n) => JSON.parse(fs.readFileSync(path.join(root, 'site', 'data', n), 'utf8'));
const hours = {};
for (const g of data('opening-hours.json').groups) for (const r of g.rows) hours[r.key] = r.hours;
const site = (k) => data('visit-climate.json').sites.find((s) => s.key === k);
const rowsFor = (k, months) => months.map((m) => {
  const r = site(k).months.find((x) => x.month === m);
  return { month: m - 1, max: r.t_daily_max };
});

const cases = [
  ['top band, hours known', [{ month: 6, max: 41 }], 'Opens 06:00, last entry 16:00', { t: 41, opens: '06:00' }],
  ['below the top band', [{ month: 4, max: 38.4 }], 'Opens 06:00', null],
  ['rounds into the top band', [{ month: 4, max: 38.6 }], 'Opens 06:00', { t: 39, opens: '06:00' }],
  ['hottest month decides', [{ month: 2, max: 30 }, { month: 6, max: 40.2 }, { month: 3, max: 35 }], null, { t: 40, opens: null }],
  ['no hours known', [{ month: 6, max: 42 }], null, { t: 42, opens: null }],
  ['first time in a longer line', [{ month: 7, max: 39 }], 'The monastery: 08:45 to 12:45, closed on Sundays', { t: 39, opens: '08:45' }],
  ['no rows', [], 'Opens 06:00', null],
  ['real data: Karnak in July', rowsFor('karnak', [7]), hours.karnak, { t: 41, opens: '06:00' }],
  ['real data: Karnak in January', rowsFor('karnak', [1]), hours.karnak, null],
];

let bad = 0;
for (const [name, rows, h, want] of cases) {
  const got = T.heatWarning(rows, h);
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    bad++;
    console.log(`FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
}
console.log(bad ? `heatWarning: ${bad} of ${cases.length} cases failed` : `heatWarning: all ${cases.length} cases match`);
process.exit(bad ? 1 : 0);
