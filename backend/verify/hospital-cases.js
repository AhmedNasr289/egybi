#!/usr/bin/env node
/* The planner's nearest-hospital line (trip.js nearestHospital, 2026-11-20),
   tested without a page against the real geo-health.json.

   OpenStreetMap's hospital tag also covers clinics, doctors' practices and a
   physiotherapy centre, so only a point whose own name says hospital counts.
   Beyond 50 km the planner says no hospital is mapped near the stop instead
   of naming a far one as if it were close. Exit 1 on any mismatch. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
// The smallest page trip.js needs to load (see leg-rows.js).
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
if (!T || typeof T.nearestHospital !== 'function') {
  console.log('FAIL trip.js does not export nearestHospital');
  process.exit(1);
}
const data = (n) => JSON.parse(fs.readFileSync(path.join(root, 'site', 'data', n), 'utf8'));
const health = data('geo-health.json');
const climate = data('visit-climate.json');
const site = (k) => climate.sites.find((x) => x.key === k);

let fails = 0;
const check = (name, ok, got) => {
  if (ok) console.log('ok   ' + name);
  else { fails++; console.log('FAIL ' + name + '  got ' + JSON.stringify(got)); }
};

const giza = T.nearestHospital(health, site('giza'));
check('Giza: a named hospital within 5 km', giza && giza.near && giza.km < 5 && /hospital|مستشف/i.test(giza.name), giza);

const siwa = T.nearestHospital(health, site('siwa'));
check('Siwa: no hospital mapped within 50 km', siwa && !siwa.near && siwa.km > T.HOSPITAL_NEAR_KM, siwa);

const at = { lat: 27.2, lon: 33.8 };
const misTagged = { points: [
  { n: 'Phisical Therapy Center', lat: 27.2001, lon: 33.8001, k: 'h' },
  { n: 'عيادة الدكتور', lat: 27.2002, lon: 33.8002, k: 'h' },
  { n: '', lat: 27.2003, lon: 33.8003, k: 'h' },
  { n: 'Red Sea Hospital', lat: 27.3, lon: 33.8, k: 'c' },
] };
check('a physiotherapy centre, a clinic, an unnamed point and a clinic-kind point are not hospitals',
  T.nearestHospital(misTagged, at) === null, T.nearestHospital(misTagged, at));

const arabic = { points: [{ n: 'مستشفى الغردقة العام', lat: 27.21, lon: 33.8, k: 'h' }] };
const ar = T.nearestHospital(arabic, at);
check('an Arabic-named hospital counts, about 1 km away', ar && ar.near && Math.round(ar.km) === 1, ar);

check('no data gives no line', T.nearestHospital(null, at) === null && T.nearestHospital({}, at) === null, null);

// Every measured site gets an answer from the real data.
const missing = climate.sites.filter((s) => !T.nearestHospital(health, s)).map((s) => s.key);
check('every measured site has a nearest named hospital', missing.length === 0, missing);

console.log(fails ? `${fails} failure(s)` : 'hospital-cases: nearest named hospital, the 50 km rule and the mis-tagged points');
process.exit(fails ? 1 : 0);
