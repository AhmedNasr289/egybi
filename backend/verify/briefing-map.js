/* "The briefing map shows where the sites are and how hot they are, and its
   motion carries that, not decoration." (2026-11-16)

   On index.html, every other host blocked:
   1. With motion allowed:
      - the map is inlined with all 18 sites: MAP NOT INLINED;
      - each dot has the colour of its own card's heat band for the briefing
        month, computed here from the page's own trip.js and figures:
        MAP COLOURS WRONG;
      - the dots come in north to south, one after another: every dot's
        animationstart is recorded from page load, and in the last sweep they
        start in the generator's order, at least 30 ms apart, an order that
        descends in latitude: NO MAP MOTION / MAP ORDER WRONG;
      - the animation touches opacity and transform only: MAP ANIMATES LAYOUT;
      - afterwards every dot is fully shown: MAP DOTS STAY HIDDEN;
      - the caption names the coolest and hottest afternoon: NO MAP SUMMARY;
      - new dates (a July trip) recolour the dots for July: MAP NOT UPDATED.
   2. Under reduced motion: no animation, every dot shown at once:
      MAP MOTION UNDER REDUCED MOTION.
   3. Without JavaScript: the map is still there as an image:
      MAP HIDDEN WITHOUT JS.

   Exits 1 on any failure. */
const { chromium, executablePath, BASE } = require('./env');

(async () => {
  const b = await chromium.launch({ executablePath });
  let fails = 0;
  const fail = m => { console.log('FAIL ' + m); fails++; };
  // Each section runs on its own. A Playwright call that throws used to end
  // the whole script, so every later section went unread: in main's mutation
  // pass (run 43948810613) the no-JS section never printed, and the case
  // that hides the map without JavaScript went uncaught. A crash is now a
  // named failure and the next section still runs.
  const section = async (name, fn) => {
    try { await fn(); } catch (e) { fail(`SECTION "${name}" CRASHED: ${String(e).split('\n')[0]}`); }
  };
  const block = async ctx => ctx.route('**/*', r => {
    const u = r.request().url();
    return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort();
  });

  // The colour each dot should have, from the page's own figures.
  const expected = () => {
    const T = window.EGYBI.trip, h = window.EGYBI.heat;
    if (!T || !h) return null;
    const out = {};
    h.sites.forEach(s => { const m = T.monthRow(s, h.month) || {}; const bd = T.band(m.t_daily_max); out[s.key] = bd ? bd.colour : null; });
    return { month: h.month, colours: out };
  };
  const actual = () => {
    const o = {};
    document.querySelectorAll('#siteMap svg circle.s').forEach(c => { o[c.getAttribute('data-key')] = c.getAttribute('fill'); });
    return o;
  };
  // Every dot's animationstart from the first moment of the page, with the
  // properties its keyframes touch. Reading getAnimations() at one instant was
  // the first version, and it missed the sweep in CI (run 43922770714): at
  // 1280x900 the map is on screen at load, so the sweep had already played and
  // finished before the check scrolled to it, and a finished animation is no
  // longer listed. Events are recorded whenever the sweep plays.
  const recorder = () => {
    window.__mapStarts = [];
    document.addEventListener('animationstart', e => {
      const c = e.target;
      if (!c || !c.matches || !c.matches('#siteMap circle.s')) return;
      const a = c.getAnimations()[0];
      const props = a ? [...new Set((a.effect.getKeyframes() || []).flatMap(k => Object.keys(k)))] : [];
      // t is when the animation was SCHEDULED to start (its start time plus
      // its delay), not when this event happened to be delivered: on a busy
      // runner two starts 70 ms apart can arrive in the same frame, which read
      // as "all at once" on a correct page (runs 43971112849, 43971142792).
      const sched = a && a.startTime != null ? a.startTime + (a.effect.getTiming().delay || 0) : null;
      window.__mapStarts.push({ key: c.getAttribute('data-key'), order: +c.getAttribute('data-order'),
                                t: sched != null ? sched : performance.now(), at: performance.now(), props });
    }, true);
  };
  const compare = (exp, act) => Object.keys(exp.colours).filter(k => exp.colours[k] && (act[k] || '').toLowerCase() !== exp.colours[k].toLowerCase());

  // ---- 1. motion allowed ------------------------------------------------------
  await section('motion', async () => {
    const ctx = await b.newContext({ reducedMotion: 'no-preference', viewport: { width: 1280, height: 900 } });
    await block(ctx);
    await ctx.addInitScript(recorder);
    const p = await ctx.newPage();
    await p.goto(BASE + '/index.html');
    let inlined = true;
    try { await p.waitForSelector('#siteMap svg circle.s', { state: 'attached', timeout: 10000 }); } catch (e) { inlined = false; }
    const n = inlined ? await p.$$eval('#siteMap svg circle.s', cs => cs.length) : 0;
    if (!inlined || n !== 18) fail(`MAP NOT INLINED: ${n} dots on the inlined map, expected 18`);
    else console.log('ok   the map is inlined with 18 sites');

    // Reach the briefing and let the sweep finish, then read what played.
    await p.evaluate(() => document.getElementById('siteMap').scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(2600);
    const after = await p.evaluate(() => [...document.querySelectorAll('#siteMap svg circle.s')].filter(c => parseFloat(getComputedStyle(c).opacity) < 0.99).length);
    if (inlined && after) fail(`MAP DOTS STAY HIDDEN: ${after} dots not fully shown after the sweep`);

    const starts = await p.evaluate(() => window.__mapStarts || []);
    if (inlined) {
      const keys = new Set(starts.map(s => s.key));
      if (keys.size < 18) fail(`NO MAP MOTION: ${18 - keys.size} of 18 dots never animated (${starts.length} animation starts recorded)`);
      else console.log(`ok   every dot animated (${starts.length} starts recorded, ${Math.round(starts.length / 18)} sweep(s))`);
      // The last sweep: its 18 starts, in time order, must run north to south,
      // one after another (at least 30 ms apart; they are set 70 ms apart).
      // the latest start of each dot, so a sweep that replays cannot mix in
      const latest = {};
      starts.forEach(s => { if (!latest[s.key] || s.at >= latest[s.key].at) latest[s.key] = s; });
      const last = Object.values(latest).sort((x, y) => x.t - y.t);
      const lat = await p.evaluate(() => { const o = {}; window.EGYBI.heat.sites.forEach(s => { o[s.key] = s.lat; }); return o; });
      const inOrder = last.length === 18 && last.every((s, i) => i === 0 || s.order > last[i - 1].order);
      const spaced = last.length === 18 && last.every((s, i) => i === 0 || s.t - last[i - 1].t >= 30);
      const byOrder = last.slice().sort((x, y) => x.order - y.order);
      const latOk = byOrder.every((s, i) => i === 0 || lat[s.key] <= lat[byOrder[i - 1].key]);
      const gaps = last.slice(1).map((s, i) => Math.round(s.t - last[i].t));
      if (!inOrder || !spaced || !latOk) fail(`MAP ORDER WRONG: started in order ${inOrder}, one after another ${spaced}, north to south ${latOk}; ` +
        `${last.length} dots, orders ${last.map(s => s.order).join(',')}, gaps ms ${gaps.join(',')}`);
      else console.log(`ok   north to south, one after another (${Math.round(last[17].t - last[0].t)} ms from first to last)`);
      const bad = [...new Set(starts.flatMap(s => s.props))].filter(x => !['offset', 'easing', 'composite', 'computedOffset', 'opacity', 'transform'].includes(x));
      if (bad.length) fail('MAP ANIMATES LAYOUT: ' + bad.join(', '));
      else console.log('ok   opacity and transform only');
    }

    const exp = await p.evaluate(expected), act = await p.evaluate(actual);
    if (!exp) fail('MAP COLOURS WRONG: the briefing figures never reached the page');
    else {
      const wrong = compare(exp, act);
      if (wrong.length) fail(`MAP COLOURS WRONG: ${wrong.length} dots not in their card's band (${wrong.slice(0, 4).join(', ')})`);
      else console.log(`ok   every dot has its card's band for month ${exp.month + 1}`);
    }
    const cap = await p.evaluate(() => (document.getElementById('siteMapSummary') || {}).textContent || '');
    if (!/afternoon runs from -?\d+ °C at .+ to -?\d+ °C at /.test(cap)) fail(`NO MAP SUMMARY: "${cap}"`);
    else console.log('ok   ' + cap.trim());

    // New dates: a July trip, next year so the date is never in the past.
    const y = new Date().getUTCFullYear() + 1;
    await p.fill('#tripStart', `${y}-07-10`);
    await p.fill('#tripEnd', `${y}-07-17`);
    await p.click('#tripForm button[type=submit]');
    await p.waitForTimeout(900);
    const exp2 = await p.evaluate(expected), act2 = await p.evaluate(actual);
    if (!exp2 || exp2.month !== 6) fail(`MAP NOT UPDATED: the briefing month is ${exp2 && exp2.month + 1}, not July`);
    else {
      const wrong = compare(exp2, act2);
      if (wrong.length) fail(`MAP NOT UPDATED: ${wrong.length} dots keep the old colours for July`);
      else console.log('ok   July dates recolour every dot');
    }
    await ctx.close();
  });

  // ---- 1b. a map just showing above the fold ------------------------------------
  // At 1280x900 the map starts below the fold. A reader who has scrolled until
  // only its top edge shows must see the dots on that edge, not an empty coast
  // (the first version waited for 35% of the map). Load with the map entirely
  // below the fold, bring 60px of it into view, and every dot on screen must
  // be shown: MAP EMPTY ON SCREEN.
  await section('fold', async () => {
    const ctx = await b.newContext({ reducedMotion: 'no-preference', viewport: { width: 1280, height: 420 } });
    await block(ctx);
    const p = await ctx.newPage();
    await p.goto(BASE + '/index.html');
    try { await p.waitForSelector('#siteMap svg circle.s', { state: 'attached', timeout: 10000 }); } catch (e) { /* counted below */ }
    const below = await p.evaluate(() => document.getElementById('siteMap').getBoundingClientRect().top - innerHeight);
    await p.evaluate(() => { const f = document.getElementById('siteMap'); window.scrollTo({ top: f.getBoundingClientRect().top + scrollY - innerHeight + 60, behavior: 'instant' }); });
    // 'instant': the site scrolls smoothly (egybi.css); a gliding scroll
    // brings the map into view late and the reading would see half a sweep.
    await p.waitForTimeout(2600);
    const r = await p.evaluate(() => {
      const cs = [...document.querySelectorAll('#siteMap svg circle.s')];
      const on = cs.filter(c => { const b = c.getBoundingClientRect(); return b.height > 0 && b.bottom > 0 && b.top < innerHeight; });
      return { on: on.length, hidden: on.filter(c => +getComputedStyle(c).opacity < 0.99).length,
               peek: Math.round(innerHeight - document.getElementById('siteMap').getBoundingClientRect().top) };
    });
    if (below <= 0) fail(`MAP EMPTY ON SCREEN: could not set the case up, the map was already on screen at load (${Math.round(below)}px)`);
    else if (!r.on) fail(`MAP EMPTY ON SCREEN: no dot came into view with ${r.peek}px of the map showing`);
    else if (r.hidden) fail(`MAP EMPTY ON SCREEN: with ${r.peek}px of the map showing, ${r.hidden} of the ${r.on} dots on screen stay hidden`);
    else console.log(`ok   with ${r.peek}px of the map showing, its ${r.on} dots on screen are shown`);
    await ctx.close();
  });

  // ---- 2. reduced motion --------------------------------------------------------
  await section('reduced motion', async () => {
    const ctx = await b.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
    await block(ctx);
    await ctx.addInitScript(recorder);
    const p = await ctx.newPage();
    await p.goto(BASE + '/index.html');
    try { await p.waitForSelector('#siteMap svg circle.s', { state: 'attached', timeout: 10000 }); } catch (e) { /* counted below */ }
    await p.evaluate(() => document.getElementById('siteMap').scrollIntoView({ block: 'center' }));
    // A whole sweep's worth of time (17 x 70 ms + 550 ms), so motion that
    // starts at any point is recorded rather than missed by one early reading.
    await p.waitForTimeout(2600);
    const r = await p.evaluate(() => {
      const cs = [...document.querySelectorAll('#siteMap svg circle.s')];
      const svg = document.querySelector('#siteMap svg');
      return { n: cs.length, anims: cs.reduce((s, c) => s + c.getAnimations().length, 0) + (window.__mapStarts || []).length,
               hidden: cs.filter(c => parseFloat(getComputedStyle(c).opacity) < 0.99).length,
               cls: svg ? svg.getAttribute('class') : null };
    });
    console.log(`     reduced motion: ${r.n} dots, ${r.anims} animations seen, ${r.hidden} hidden, class "${r.cls}"`);
    if (!r.n) fail('MAP NOT INLINED: no map under reduced motion');
    else if (r.anims || r.hidden) fail(`MAP MOTION UNDER REDUCED MOTION: ${r.anims} animations, ${r.hidden} dots hidden`);
    else console.log('ok   reduced motion: the coloured map at once, nothing moves');
    await ctx.close();
  });

  // ---- 3. without JavaScript ----------------------------------------------------
  await section('no JavaScript', async () => {
    const ctx = await b.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    await block(ctx);
    const p = await ctx.newPage();
    await p.goto(BASE + '/index.html');
    const img = await p.$('#siteMap img');
    // Not img.scrollIntoViewIfNeeded(): that waits for the image to become
    // visible, so with the image hidden it timed out and threw instead of
    // reporting MAP HIDDEN WITHOUT JS.
    if (img) { await p.evaluate(() => document.getElementById('siteMap').scrollIntoView({ block: 'center' })); await p.waitForTimeout(800); }
    const r = await p.evaluate(() => {
      const i = document.querySelector('#siteMap img');
      if (!i) return null;
      const rc = i.getBoundingClientRect(), cs = getComputedStyle(i);
      return { h: rc.height, w: rc.width, loaded: i.complete && i.naturalWidth > 0, shown: cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.99 };
    });
    if (!r || !r.loaded || !r.shown || r.h < 150) fail('MAP HIDDEN WITHOUT JS: ' + JSON.stringify(r));
    else console.log(`ok   without JavaScript the map is an image, ${Math.round(r.w)}x${Math.round(r.h)}px`);
    await ctx.close();
  });

  await b.close();
  if (fails) { console.log(`\n${fails} briefing-map failure(s)`); process.exit(1); }
  console.log('\nbriefing map: in place, coloured from the briefing, north to south, still without motion or JS');
})().catch(e => { console.error(e); process.exit(1); });
