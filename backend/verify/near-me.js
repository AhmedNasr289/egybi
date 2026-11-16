/* "Near me puts the closest places first, and the position never leaves the browser."

   places.html's Near me button (Round 4, R4-8) asks the browser for the
   reader's position and sorts the list by straight-line distance. With
   Chromium's position fixed at the Giza plateau, this checks:

     1. SORTED: after pressing it, the "From you" column shows, the distances
        read in ascending order, and the first place is within 25 km of Giza.
        NEAR ME NOT SORTED.
     2. PRIVATE: no request the page makes after the press carries the
        coordinates (in the URL or the body). LOCATION SENT.
     3. UNDONE: pressing "Stop using my location" hides the column and restores
        the original order. NOT RESTORED.
     4. REFUSED: with the permission denied, the page says so and the list keeps
        its order. NO REFUSAL NOTE.

   Exits 1 on any failure. */
const { chromium, executablePath, BASE } = require('./env');

const GIZA = { latitude: 29.9792, longitude: 31.1342 };
const toKm = s => { const m = /([\d,.]+)\s*(m|km)$/.exec(s.trim()); if (!m) return NaN;
  const v = parseFloat(m[1].replace(/,/g, '')); return m[2] === 'm' ? v / 1000 : v; };

(async () => {
  const b = await chromium.launch({ executablePath });
  let fails = 0;
  const fail = m => { console.log('FAIL ' + m); fails++; };
  const local = r => { const u = r.request().url();
    return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort(); };
  const rows = p => p.$$eval('#placeList tr[data-k]', trs => trs.map(tr => [...tr.cells].map(td => td.textContent)));

  // ---- 1-3: permission granted -------------------------------------------------
  const ctx = await b.newContext({ geolocation: GIZA, permissions: ['geolocation'] });
  await ctx.route('**/*', local);
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(String(e)));
  await p.goto(BASE + '/places.html');
  await p.waitForFunction(() => document.querySelectorAll('#placeList tr[data-k]').length > 20, null, { timeout: 20000 });
  const before = (await rows(p)).map(r => r[0]);
  const btn = p.locator('#nearMe');
  if (!(await btn.isVisible())) { fail('NEAR ME NOT SORTED: the button is not shown'); }
  else {
    const sent = [];
    p.on('request', r => { const s = r.url() + ' ' + (r.postData() || '');
      if (/29\.97|31\.13/.test(s)) sent.push(r.url()); });
    await btn.click();
    await p.waitForFunction(() => !document.getElementById('distTh').hidden, null, { timeout: 10000 }).catch(() => {});
    const r1 = await rows(p);
    const d = r1.map(r => toKm(r[4] || ''));
    const sorted = d.length > 20 && d.every((x, i) => !isNaN(x) && (i === 0 || x >= d[i - 1]));
    if (!sorted) fail('NEAR ME NOT SORTED: distances ' + d.slice(0, 6).join(', '));
    else if (!(d[0] <= 25)) fail('NEAR ME NOT SORTED: the nearest place is ' + d[0] + ' km from Giza');
    else console.log(`ok   ${d.length} rows nearest first; nearest "${r1[0][0]}" at ${r1[0][4]}`);
    const note = await p.textContent('#nearNote');
    if (!/Nearest first/.test(note) || !/never receives it/.test(note)) fail('NEAR ME NOT SORTED: the note says "' + note + '"');
    await p.waitForTimeout(1500);
    if (sent.length) fail('LOCATION SENT in ' + sent.slice(0, 3).join(' | '));
    else console.log('ok   no request after the press carried the coordinates');

    await btn.click();
    const r2 = (await rows(p)).map(r => r[0]);
    const hiddenTh = await p.$eval('#distTh', th => th.hidden);
    if (!hiddenTh || JSON.stringify(r2) !== JSON.stringify(before)) fail('NOT RESTORED after "Stop using my location"');
    else console.log('ok   "Stop using my location" restored the order and hid the column');
  }
  if (errors.length) fail('page errors: ' + errors.join(' | '));
  await ctx.close();

  // ---- 4: permission refused ---------------------------------------------------
  const ctx2 = await b.newContext({ permissions: [] });
  await ctx2.route('**/*', local);
  const q = await ctx2.newPage();
  await q.goto(BASE + '/places.html');
  await q.waitForFunction(() => document.querySelectorAll('#placeList tr[data-k]').length > 20, null, { timeout: 20000 });
  const b4 = (await rows(q)).map(r => r[0]);
  await q.locator('#nearMe').click();
  await q.waitForFunction(() => /not given|could not be found/.test(document.getElementById('nearNote').textContent), null, { timeout: 15000 })
    .catch(() => {});
  const note4 = await q.textContent('#nearNote');
  const a4 = (await rows(q)).map(r => r[0]);
  if (!/not given|could not be found/.test(note4)) fail('NO REFUSAL NOTE: the note says "' + note4 + '"');
  else if (JSON.stringify(a4) !== JSON.stringify(b4)) fail('NO REFUSAL NOTE: the list changed order after a refusal');
  else console.log('ok   a refused permission is explained and the list keeps its order');
  await ctx2.close();

  await b.close();
  console.log(fails ? fails + ' failure(s)' : 'near-me: all checks pass');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
