/* "The browser-platform features do what they say, and only that." (Round 5)

   Three built-in browser features EgyBI turned on on 2026-11-16, each checked
   in a real Chromium against the static site:

     M1  Page to page: a same-site navigation cross-fades (a cross-document
         view transition), and never for a reader who asked for reduced
         motion. Read from the `pagereveal` event on the page arrived at.
         NO PAGE TRANSITION / TRANSITION UNDER REDUCED MOTION.
     M2  Next page early: hovering a link to another EgyBI page prefetches it
         (Speculation Rules, read through Chrome's own Preload events), and a
         link to /account.html or /api/ is never prefetched.
         NO PREFETCH / PREFETCHED PRIVATE.
     M5  Offline everywhere: an ordinary page (not the planner) registers the
         offline worker. NO WORKER ON PAGES.

   Exits 1 on any failure. */
const { chromium, executablePath, BASE } = require('./env');

(async () => {
  const b = await chromium.launch({ executablePath });
  let fails = 0;
  const fail = m => { console.log('FAIL ' + m); fails++; };
  const local = r => { const u = r.request().url();
    return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort(); };

  // ---- M1: the cross-fade, and none under reduced motion ---------------------
  for (const reduce of [false, true]) {
    const ctx = await b.newContext({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
    await ctx.route('**/*', local);
    await ctx.addInitScript(() => {
      window.addEventListener('pagereveal', e => { window.__vt = !!e.viewTransition; });
    });
    const p = await ctx.newPage();
    await p.goto(BASE + '/about.html');
    await p.waitForTimeout(400);
    await Promise.all([p.waitForURL('**/plan.html'), p.evaluate(() => {
      const a = document.createElement('a'); a.href = 'plan.html'; a.id = '__go'; document.body.appendChild(a); a.click();
    })]);
    await p.waitForTimeout(400);
    const vt = await p.evaluate(() => window.__vt);
    if (!reduce && vt !== true) fail('NO PAGE TRANSITION: about -> plan arrived with viewTransition=' + vt);
    else if (reduce && vt !== false) fail('TRANSITION UNDER REDUCED MOTION: viewTransition=' + vt);
    else console.log(`ok   ${reduce ? 'reduced motion: no' : 'a'} cross-fade from about to plan (viewTransition=${vt})`);
    await ctx.close();
  }

  // ---- M2: hover prefetches EgyBI pages, never private ones -------------------
  {
    const ctx = await b.newContext();
    await ctx.route('**/*', local);
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    const seen = [];
    cdp.on('Preload.prefetchStatusUpdated', e => seen.push(e.prefetchUrl + ' ' + e.status));
    await cdp.send('Preload.enable');
    await p.goto(BASE + '/about.html');
    await p.waitForTimeout(500);
    await p.evaluate(() => {
      for (const [id, href] of [['__a', 'stories.html'], ['__b', 'account.html'], ['__c', 'api/notes.php?action=list'], ['__d', 'auth/auth.php?action=me']]) {
        const a = document.createElement('a'); a.id = id; a.href = href; a.textContent = id;
        a.style.cssText = 'display:block;position:fixed;left:20px;top:' + (100 + 50 * id.charCodeAt(2) % 4) + 'px;padding:10px;background:#fff;z-index:99999';
        document.body.appendChild(a);
      }
    });
    for (const id of ['__b', '__c', '__d', '__a']) { await p.hover('#' + id); await p.waitForTimeout(700); }
    await p.waitForTimeout(1200);
    const good = seen.filter(s => /\/stories\.html /.test(s) && /Ready|Success|Running|Pending/.test(s));
    const bad = seen.filter(s => /\/account\.html |\/api\/|\/auth\//.test(s));
    if (!good.length) fail('NO PREFETCH: hovering stories.html prefetched nothing (' + (seen.join(' | ') || 'no Preload events') + ')');
    else console.log('ok   hovering a link prefetched it: ' + good[good.length - 1]);
    if (bad.length) fail('PREFETCHED PRIVATE: ' + bad.join(' | '));
    else console.log('ok   account.html, /api/ and /auth/ links were not prefetched');
    await ctx.close();
  }

  // ---- M5: an ordinary page registers the offline worker ----------------------
  {
    const ctx = await b.newContext();
    await ctx.route('**/*', local);
    const p = await ctx.newPage();
    await p.goto(BASE + '/stories.html');
    const sw = await p.evaluate(() => Promise.race([
      navigator.serviceWorker.ready.then(r => r.active && r.active.scriptURL),
      new Promise(r => setTimeout(() => r(null), 10000))]));
    if (!sw || !/\/sw\.js$/.test(sw)) fail('NO WORKER ON PAGES: stories.html registered ' + sw);
    else console.log('ok   stories.html registered the offline worker (' + sw.replace(BASE, '') + ')');
    await ctx.close();
  }

  await b.close();
  console.log(fails ? fails + ' failure(s)' : 'platform: all checks pass');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
