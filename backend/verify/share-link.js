/* "A shared trip opens as it was sent, and never silently replaces the reader's own."

   The planner's Share button (plan.js, Round 4 R4-6) puts the whole trip in
   the link's #fragment, which is never sent to a server. This checks, in the
   real page:

     1. ROUND TRIP: 40 generated trips (Arabic names, 1-30 stops, dates or
        none) encode and decode back to the same trip. Exit message
        SHARE ROUND TRIP BROKEN.
     2. REFUSED: malformed links decode to null: a stop outside Egypt, 31
        stops, a wrong version, bad dates, garbage text. SHARE ACCEPTS BAD LINK.
     3. EMPTY PLAN: plan.html#t=... with nothing saved shows the shared stops,
        and the #t= is removed from the address bar. SHARED TRIP NOT SHOWN.
     4. OWN PLAN KEPT: with a saved trip, the link asks first; "Keep my plan"
        leaves the saved trip exactly as it was, and "Open the shared trip"
        replaces it. OWN PLAN OVERWRITTEN / SHARED TRIP NOT SHOWN.
     5. ESCAPED: a shared stop named with markup renders as text.
        MARKUP INJECTED.

   Exits 1 on any failure. */
const { chromium, executablePath, BASE } = require('./env');

const KEY = 'egybi.trip.v1';
const sameTrip = (a, b) => JSON.stringify(a) === JSON.stringify(b);

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

  await p.goto(BASE + '/plan.html');
  await p.waitForFunction(() => window.EgybiShare, null, { timeout: 15000 });

  // 1 + 2: the codec, in the page
  const codec = await p.evaluate(() => {
    const S = window.EgybiShare, out = { mismatches: [], accepted: [] };
    let seed = 7;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const names = ['Giza', 'Karnak', 'الأقصر', 'Saint Catherine', 'Abu Simbel', 'دير المدينة', 'Siwa "oasis" & <lake>'];
    for (let t = 0; t < 40; t++) {
      const n = 1 + Math.floor(rnd() * 30), stops = [];
      for (let i = 0; i < n; i++) {
        const s = { id: 'site:' + i + ':' + t, name: names[(i + t) % names.length],
                    lat: Math.round((22 + rnd() * 9) * 1000) / 1000, lon: Math.round((25 + rnd() * 11) * 1000) / 1000,
                    days: 1 + Math.floor(rnd() * 5) };
        if (i % 3 === 0) s.name_ar = 'موقع ' + i;
        stops.push(s);
      }
      const trip = { start: t % 2 ? '2026-12-0' + (1 + t % 9) : null, end: t % 2 ? '2026-12-2' + (t % 9) : null,
                     name: t % 4 ? 'Trip ' + t : '', stops };
      const back = S.decode(S.encode(trip));
      if (JSON.stringify(back) !== JSON.stringify(trip)) out.mismatches.push(t);
    }
    const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const ok = [['g', 'Giza', 29.979, 31.134, 2, '']];
    const bad = {
      outside: { v: 1, s: '', e: '', n: '', p: [['x', 'Paris', 48.85, 2.35, 1, '']] },
      tooMany: { v: 1, s: '', e: '', n: '', p: Array.from({ length: 31 }, () => ok[0]) },
      version: { v: 2, s: '', e: '', n: '', p: ok },
      date: { v: 1, s: 'tomorrow', e: '', n: '', p: ok },
      days: { v: 1, s: '', e: '', n: '', p: [['g', 'Giza', 29.979, 31.134, 0, '']] }
    };
    for (const k in bad) if (S.decode(enc(bad[k])) !== null) out.accepted.push(k);
    if (S.decode('not*base64') !== null) out.accepted.push('garbage');
    if (S.decode(enc({ v: 1, s: '', e: '', n: '', p: ok })) === null) out.accepted.push('VALID ONE REFUSED');
    return out;
  });
  if (codec.mismatches.length) fail('SHARE ROUND TRIP BROKEN on trips ' + codec.mismatches.join(','));
  else console.log('ok   40 generated trips round-trip exactly');
  if (codec.accepted.length) fail('SHARE ACCEPTS BAD LINK: ' + codec.accepted.join(', '));
  else console.log('ok   6 malformed links refused, a valid one accepted');

  const shared = { start: '2026-12-10', end: '2026-12-17', name: 'Nile week',
    stops: [{ id: 'site:luxor', name: 'Luxor <img src=x onerror=window.__pwned=1>', lat: 25.687, lon: 32.639, days: 3 },
            { id: 'site:aswan', name: 'Aswan', lat: 24.089, lon: 32.899, days: 2, name_ar: 'أسوان' }] };
  const code = await p.evaluate(t => window.EgybiShare.encode(t), shared);

  // 3: empty plan
  // about:blank between loads: a goto that changes only the #fragment would not reload the page.
  await p.evaluate(k => localStorage.removeItem(k), KEY);
  await p.goto('about:blank');
  await p.goto(BASE + '/plan.html#t=' + code);
  await p.waitForFunction(() => document.querySelectorAll('#stopList .stop-n').length === 2, null, { timeout: 15000 })
    .catch(() => {});
  const s3 = await p.evaluate(k => ({ n: document.querySelectorAll('#stopList .stop-n').length, hash: location.hash,
    saved: JSON.parse(localStorage.getItem(k) || 'null'), imgs: document.querySelectorAll('#stopList img').length,
    pwned: !!window.__pwned, text: document.getElementById('stopList').textContent }), KEY);
  if (s3.n !== 2 || !s3.saved || s3.saved.stops.length !== 2) fail('SHARED TRIP NOT SHOWN on an empty plan (' + s3.n + ' stops)');
  else if (s3.hash) fail('SHARED TRIP NOT SHOWN cleanly: the #t= stayed in the address bar');
  else console.log('ok   empty plan: 2 shared stops shown and saved, hash removed');
  if (s3.imgs || s3.pwned || !s3.text.includes('<img src=x')) fail('MARKUP INJECTED: a shared stop name became markup');
  else console.log('ok   a shared stop named with markup renders as text');

  // 4: own plan kept unless the reader chooses
  const mine = { start: '2027-01-05', end: '2027-01-09', name: 'Mine', stops: [{ id: 'site:giza', name: 'Giza', lat: 29.979, lon: 31.134, days: 2 }] };
  await p.evaluate(([k, t]) => localStorage.setItem(k, JSON.stringify(t)), [KEY, mine]);
  await p.goto('about:blank');
  await p.goto(BASE + '/plan.html#t=' + code);
  const banner = p.locator('#sharedBanner');
  await banner.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  const asked = await banner.isVisible();
  const before = await p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  if (!asked) fail('OWN PLAN OVERWRITTEN: no question was asked');
  if (!sameTrip(before, mine)) fail('OWN PLAN OVERWRITTEN before the reader chose');
  if (asked) {
    await p.getByRole('button', { name: 'Keep my plan' }).click();
    const kept = await p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
    if (!sameTrip(kept, mine)) fail('OWN PLAN OVERWRITTEN after "Keep my plan"');
    else console.log('ok   saved plan asked first, and "Keep my plan" kept it unchanged');
  }
  await p.goto('about:blank');
  await p.goto(BASE + '/plan.html#t=' + code);
  await banner.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  if (await banner.isVisible()) {
    await p.getByRole('button', { name: 'Open the shared trip' }).click();
    const now = await p.evaluate(k => ({ t: JSON.parse(localStorage.getItem(k)), n: document.querySelectorAll('#stopList .stop-n').length,
      name: document.getElementById('planName').value }), KEY);
    if (now.n !== 2 || now.t.stops.length !== 2 || now.t.name !== 'Nile week' || now.name !== 'Nile week')
      fail('SHARED TRIP NOT SHOWN after "Open the shared trip"');
    else console.log('ok   "Open the shared trip" replaced the plan and its name');
  }

  if (errors.length) fail('page errors: ' + errors.join(' | '));
  await b.close();
  console.log(fails ? fails + ' failure(s)' : 'share-link: all checks pass');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
