#!/usr/bin/env node
/* The planner's leg cards in a real page (2026-11-17). leg-rows.js tests which
   legs get rows; this tests what the reader sees. A saved Giza -> Karnak trip
   must show, between the two stops:

     1. ROWS: the four cited train rows (Bashtil sleepers, sleeper fares, US-dollar fares,
        where to buy), each linking its source and saying when it was checked.
        LEG ROWS NOT SHOWN.
     2. LANGUAGE: on ar/plan.html and ru/plan.html the distance line and the
        rows read in that language, with the number in the page's digits.
        LEG LEFT IN ENGLISH.
     3. NOTHING GUESSED: a Karnak -> Philae trip (Luxor to Aswan, a leg no
        cited row covers) shows the distance line and no rows.
        ROWS INVENTED FOR AN UNCOVERED LEG.
     4. SUMMARY AND DIGITS: the trip summary under the map and each stop's
        month-by-month heat line are in the page's language (July named in
        it), and on ar/plan.html they and a July heat warning use Arabic-Indic
        digits only. SUMMARY / STOP CARD LEFT IN ENGLISH / WESTERN DIGITS.

   Exits 1 on any failure. */
const { chromium, executablePath, BASE } = require('./env');

const KEY = 'egybi.trip.v1';
const stop = (id, name, lat, lon) => ({ id, name, lat, lon, days: 1 });
const GIZA = stop('site:giza', 'The Giza Pyramids', 29.9773, 31.1325);
const KARNAK = stop('site:karnak', 'Karnak Temple', 25.7188, 32.6573);
const PHILAE = stop('site:philae', 'Philae Temple', 24.0256, 32.8843);

(async () => {
  const b = await chromium.launch({ executablePath });
  const ctx = await b.newContext();
  await ctx.route('**/*', r => {
    const u = r.request().url();
    return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort();
  });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(String(e)));
  let fails = 0;
  const fail = (m) => { console.log('FAIL ' + m); fails++; };

  async function legsOf(path, stops, start, end) {
    await p.goto(BASE + '/plan.html');
    await p.evaluate(([k, s, a, z]) => localStorage.setItem(k, JSON.stringify({ start: a, end: z, name: '', stops: s })),
      [KEY, stops, start || null, end || null]);
    await p.goto(BASE + '/' + path);
    await p.waitForFunction(n => document.querySelectorAll('#stopList .stop-n').length === n, stops.length, { timeout: 15000 })
      .catch(() => {});
    // The rows arrive with the data files; give them the same 15 s.
    await p.waitForFunction(() => document.querySelector('#stopList p.leg'), null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(500);
    return p.evaluate(() => ({
      leg: (document.querySelector('#stopList p.leg') || {}).textContent || '',
      rows: Array.from(document.querySelectorAll('#stopList ul.leg-how li')).map(li => ({
        text: li.textContent, href: (li.querySelector('a') || {}).href || '' })),
      sum: (document.getElementById('planSum') || {}).textContent || '',
      heat: Array.from(document.querySelectorAll('#stopList .heat-warn')).map(e => e.textContent),
      cards: Array.from(document.querySelectorAll('#stopList li.stop div > p:not(.heat-warn)')).map(e => e.textContent),
    }));
  }

  // 1. English
  const en = await legsOf('plan.html', [GIZA, KARNAK]);
  const want = ['Bashtil', 'US$110', 'US dollars', 'agency'];
  if (en.rows.length !== 4) fail(`LEG ROWS NOT SHOWN: Giza -> Karnak shows ${en.rows.length} row(s), wanted 4`);
  else if (!want.every((w, i) => en.rows[i].text.includes(w))) fail('LEG ROWS NOT SHOWN: rows ' + JSON.stringify(en.rows.map(r => r.text)));
  else if (!en.rows.every(r => r.href.startsWith('https://www.seat61.com/') && /checked 20\d\d-\d\d-\d\d/.test(r.text)))
    fail('LEG ROWS NOT SHOWN with a source and a checked date: ' + JSON.stringify(en.rows));
  else console.log('ok   Giza -> Karnak shows the 4 cited train rows, each with its source and date');
  if (!/^\D*\d+ km in a straight line from The Giza Pyramids$/.test(en.leg.trim())) fail('distance line reads ' + JSON.stringify(en.leg));

  // 2. Arabic and Russian
  const ar = await legsOf('ar/plan.html', [GIZA, KARNAK]);
  if (!/[٠-٩]+ كم بخطّ مستقيم من/.test(ar.leg) || /\d/.test(ar.leg.replace(/[٠-٩]/g, '')))
    fail('LEG LEFT IN ENGLISH (ar): ' + JSON.stringify(ar.leg));
  else if (ar.rows.length !== 4 || !ar.rows[0].text.includes('بشتيل')) fail('LEG LEFT IN ENGLISH (ar rows): ' + JSON.stringify(ar.rows.map(r => r.text)));
  else console.log('ok   ar/plan.html: the distance in Arabic digits and the rows in Arabic');
  const ru = await legsOf('ru/plan.html', [GIZA, KARNAK]);
  if (!/\d+ км по прямой от/.test(ru.leg)) fail('LEG LEFT IN ENGLISH (ru): ' + JSON.stringify(ru.leg));
  else if (ru.rows.length !== 4 || !ru.rows[0].text.includes('Баштиль')) fail('LEG LEFT IN ENGLISH (ru rows): ' + JSON.stringify(ru.rows.map(r => r.text)));
  else console.log('ok   ru/plan.html: the distance and the rows in Russian');

  // 4. The summary and the digits. Karnak in July reaches the top heat band,
  // so the warning (with its opening time) is on the page to be read.
  const arJuly = await legsOf('ar/plan.html', [GIZA, KARNAK], '2027-07-10', '2027-07-14');
  const western = (x) => /[0-9A-Za-z]/.test(x.replace(/The Giza Pyramids|Karnak Temple/g, ''));
  if (!arJuly.sum || western(arJuly.sum)) fail('SUMMARY LEFT IN ENGLISH / WESTERN DIGITS (ar): ' + JSON.stringify(arJuly.sum));
  else if (!arJuly.heat.length || arJuly.heat.some(western)) fail('WESTERN DIGITS in the Arabic heat warning: ' + JSON.stringify(arJuly.heat));
  else if (!arJuly.cards.length || arJuly.cards.some(western) || !arJuly.cards.every(c => c.includes('يوليو')))
    fail('STOP CARD LEFT IN ENGLISH (ar): ' + JSON.stringify(arJuly.cards));
  else console.log('ok   ar/plan.html: summary, stop cards and heat warning in Arabic with Arabic-Indic digits');
  const ruJuly = await legsOf('ru/plan.html', [GIZA, KARNAK], '2027-07-10', '2027-07-14');
  const ruSumBad = !/Остановок: 2/.test(ruJuly.sum) || /[A-Za-z]/.test(ruJuly.sum);
  if (ruSumBad) fail('SUMMARY LEFT IN ENGLISH (ru): ' + JSON.stringify(ruJuly.sum));
  // Russian writes the unit as °C too (the first CI run of this check read
  // that C as English), so the unit and the stop names are taken out first.
  const ruLatin = (c) => /[A-Za-z]/.test(c.replace(/°C|The Giza Pyramids|Karnak Temple/g, ''));
  if (!ruJuly.cards.length || !ruJuly.cards.every(c => c.includes('Июль') && !ruLatin(c)))
    fail('STOP CARD LEFT IN ENGLISH (ru): ' + JSON.stringify(ruJuly.cards));
  else if (!ruSumBad) console.log('ok   ru/plan.html: summary and stop cards in Russian');

  // 3. An uncovered leg
  const up = await legsOf('plan.html', [KARNAK, PHILAE]);
  if (!up.leg.includes('km in a straight line')) fail('distance line missing on Karnak -> Philae: ' + JSON.stringify(up.leg));
  else if (up.rows.length) fail('ROWS INVENTED FOR AN UNCOVERED LEG: ' + JSON.stringify(up.rows.map(r => r.text)));
  else console.log('ok   Karnak -> Philae (no cited row) shows the distance alone');

  if (errors.length) fail('page errors: ' + errors.join(' | '));
  await b.close();
  console.log(fails ? fails + ' failure(s)' : 'leg-cards: all checks pass');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
