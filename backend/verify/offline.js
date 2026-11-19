/* "With no signal, the planner still opens with the reader's trip."

   site/sw.js (Round 4, R4-7) keeps copies of opened pages on the device. This
   opens plan.html with a saved trip, lets the worker take control and cache
   what the page loaded, then cuts the network and checks:

     1. OFFLINE PLAN NOT SHOWN: reloading plan.html offline must render the
        saved stops from the cached page and scripts.
     2. OFFLINE PAGE MISSING: a page never opened must show the built-in
        offline note with a link to the planner, not a browser error.
     3. ACCOUNT DATA CACHED: nothing under /auth/ or /api/ may be in any cache.
     4. STALE WHEN ONLINE: back online, a page must come from the network: a
        marker the test adds to the cached copy must not be what is shown.

   Exits 1 on any failure. */
const { chromium, executablePath, BASE } = require('./env');

const KEY = 'egybi.trip.v1';
const TRIP = { start: '2026-12-10', end: '2026-12-14', name: 'Offline test',
  stops: [{ id: 'site:luxor', name: 'Luxor', lat: 25.687, lon: 32.639, days: 2 },
          { id: 'site:aswan', name: 'Aswan', lat: 24.089, lon: 32.899, days: 2 }] };

(async () => {
  const b = await chromium.launch({ executablePath });
  const ctx = await b.newContext({ serviceWorkers: 'allow' });   // this check IS the worker
  // Same-origin only, as every checker here: a third-party host must not be needed.
  await ctx.route('**/*', r => { const u = r.request().url();
    return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort(); });
  const p = await ctx.newPage();
  let fails = 0;
  const fail = m => { console.log('FAIL ' + m); fails++; };

  await p.goto(BASE + '/plan.html');
  await p.evaluate(([k, t]) => localStorage.setItem(k, JSON.stringify(t)), [KEY, TRIP]);
  await p.reload();
  // The worker announces when it has cached what the page loaded.
  const ready = await p.waitForFunction(() => /opens offline/.test((document.getElementById('offlineNote') || {}).textContent || ''),
    null, { timeout: 30000 }).then(() => true).catch(() => false);
  if (!ready) fail('OFFLINE PLAN NOT SHOWN: the worker never reported caching the planner');
  // A controlled load, so the page's own requests also pass through the worker.
  await p.reload();
  await p.waitForFunction(() => document.querySelectorAll('#stopList .stop-n').length === 2, null, { timeout: 20000 }).catch(() => {});
  const controlled = await p.evaluate(() => !!navigator.serviceWorker.controller);
  if (!controlled) fail('OFFLINE PLAN NOT SHOWN: the page is not controlled by the worker');

  // 3: nothing private in any cache, even after opening an account URL directly
  await p.goto(BASE + '/auth/auth.php?action=me').catch(() => {});
  await p.goto(BASE + '/api/notes.php?action=list').catch(() => {});
  await p.goto(BASE + '/index.html?verify=0123456789abcdef&add=giza').catch(() => {});
  await p.goto(BASE + '/plan.html');
  await p.waitForTimeout(800);
  const cached = await p.evaluate(async () => {
    const out = [];
    for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) { const x = new URL(r.url); out.push(x.pathname + x.search); }
    return out;
  });
  const privateHits = cached.filter(u => /^\/(auth|api)\//.test(u) || /[?&](verify|reset)=/.test(u));
  if (privateHits.length) fail('ACCOUNT DATA CACHED: ' + privateHits.join(', '));
  else console.log(`ok   ${cached.length} files cached, none under /auth/ or /api/`);

  // 1 + 2: offline
  await ctx.setOffline(true);
  await p.reload().catch(() => {});
  const n = await p.waitForFunction(() => document.querySelectorAll('#stopList .stop-n').length, null, { timeout: 15000 })
    .then(h => h.jsonValue()).catch(() => 0);
  if (n !== 2) fail('OFFLINE PLAN NOT SHOWN: ' + n + ' stops rendered offline');
  else console.log('ok   offline: plan.html opened with the saved 2 stops');

  await p.goto(BASE + '/invest.html').catch(() => {});
  const off = await p.evaluate(() => ({ h1: (document.querySelector('h1') || {}).textContent || '',
    link: !!document.querySelector('a[href="/plan.html"]') })).catch(() => ({ h1: '', link: false }));
  if (!/offline/i.test(off.h1) || !off.link) fail('OFFLINE PAGE MISSING: an unopened page showed "' + off.h1 + '"');
  else console.log('ok   offline: an unopened page shows the offline note with a link to the planner');

  // 4: online again, the network wins over the cached copy
  await ctx.setOffline(false);
  await p.goto(BASE + '/plan.html');
  await p.evaluate(async () => {
    for (const k of await caches.keys()) {
      const c = await caches.open(k);
      for (const r of await c.keys()) if (new URL(r.url).pathname === '/plan.html')
        await c.put(r, new Response('<!doctype html><title>STALE-MARKER</title><h1>STALE-MARKER</h1>', { headers: { 'Content-Type': 'text/html' } }));
    }
  });
  await p.reload();
  const title = await p.title();
  if (/STALE-MARKER/.test(title)) fail('STALE WHEN ONLINE: the cached copy was shown while the network was up');
  else console.log('ok   online: the page came from the network, not the cache');

  await b.close();
  console.log(fails ? fails + ' failure(s)' : 'offline: all checks pass');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
