#!/usr/bin/env node
/* The planner's leg cards (trip.js legRows, 2026-11-17), tested without a
   page. getting-around.json names areas by the measured sites they sit near,
   and the legs between areas that a cited row of arrival.json describes. A
   leg shows those rows; every other leg shows its distance alone.

   Cases use the real data files, so a renamed site, a radius that stops
   reaching a stop, or a leg that names a row arrival.json no longer has is
   caught here, as well as by coverage.py. Exit 1 on any mismatch. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
// The smallest page trip.js needs to load (see heat-warning.js).
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
if (!T || typeof T.legRows !== 'function') {
  console.log('FAIL trip.js does not export legRows');
  process.exit(1);
}

const data = (n) => JSON.parse(fs.readFileSync(path.join(root, 'site', 'data', n), 'utf8'));
const guide = data('getting-around.json');
const climate = data('visit-climate.json');
const arrival = data('arrival.json');
const rowKeys = new Set(arrival.groups.flatMap((g) => g.rows.map((r) => r.key)));
const site = (k) => {
  const s = climate.sites.find((x) => x.key === k);
  if (!s) { console.log(`FAIL visit-climate.json has no site ${k}`); process.exit(1); }
  return { lat: s.lat, lon: s.lon };
};
// Places that are not measured sites, as the planner gets them from the map.
const ASWAN_TOWN = { lat: 24.0889, lon: 32.8998 };   // Aswan railway station area
const FAYOUM = { lat: 29.3084, lon: 30.8428 };

const TRAIN = ['train-bashtil', 'train-fares', 'train-tickets'];
const cases = [
  ['Giza to Karnak takes the Cairo-Luxor sleeper rows', site('giza'), site('karnak'), TRAIN],
  ['the same leg read backwards gives the same rows', site('karnak'), site('giza'), TRAIN],
  ['Historic Cairo to Philae takes the Cairo-Aswan rows', site('islamic-cairo'), site('philae'), TRAIN],
  ['Aswan town to Abu Simbel takes the desert road row', ASWAN_TOWN, site('abu-simbel'), ['abu-simbel-road']],
  ['Karnak to Valley of the Kings is one area: no rows', site('karnak'), site('valley-kings'), []],
  ['Luxor to Aswan has no cited row: no rows', site('karnak'), site('philae'), []],
  ['Fayoum is in no area: no rows', FAYOUM, site('karnak'), []],
  ['Giza to Abu Simbel has no cited row: no rows', site('giza'), site('abu-simbel'), []],
];

let bad = 0;
for (const [name, a, b, want] of cases) {
  const got = Array.from(T.legRows(guide, climate, a, b));
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${JSON.stringify(got)}${ok ? '' : ' (wanted ' + JSON.stringify(want) + ')'}`);
}
for (const leg of guide.legs) {
  for (const k of leg.rows) {
    if (!rowKeys.has(k)) { bad++; console.log(`FAIL leg ${leg.between} names row ${k}, which arrival.json does not have`); }
  }
}
if (bad) { console.log(`legRows: ${bad} mismatch(es)`); process.exit(1); }
console.log(`legRows: all ${cases.length} cases match`);
