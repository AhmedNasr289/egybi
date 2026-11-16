/* "The briefing map shows where the sites are and how hot they are, and its
   motion carries that, not decoration." (2026-11-16)

   On index.html, every other host blocked:
   1. With motion allowed:
      - the map is inlined with all 18 sites: MAP NOT INLINED;
      - each dot has the colour of its own card's heat band for the briefing
        month, computed here from the page's own trip.js and figures:
        MAP COLOURS WRONG;
      - when the briefing is reached the dots come in north to south, one after
        another (animation delays ascend with the generator's order, and that
        order descends in latitude): NO MAP MOTION / MAP ORDER WRONG;
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
  const compare = (exp, act) => Object.keys(exp.colours).filter(k => exp.colours[k] && (act[k] || '').toLowerCase() !== exp.colours[k].toLowerCase());

  // ---- 1. motion allowed ------------------------------------------------------
  {
    const ctx = await b.newContext({ reducedMotion: 'no-preference', viewport: { width: 1280, height: 900 } });
    await block(ctx);
    const p = await ctx.newPage();
    await p.goto(BASE + '/index.html');
    let inlined = true;
    try { await p.waitForSelector('#siteMap svg circle.s', { state: 'attached', timeout: 10000 }); } catch (e) { inlined = false; }
    const n = inlined ? await p.$$eval('#siteMap svg circle.s', cs => cs.length) : 0;
    if (!inlined || n !== 18) fail(`MAP NOT INLINED: ${n} dots on the inlined map, expected 18`);
    else console.log('ok   the map is inlined with 18 sites');

    // Reach the briefing, then read the motion while it runs.
    await p.evaluate(() => document.getElementById('siteMap').scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(150);
    const mo = await p.evaluate(() => {
      const cs = [...document.querySelectorAll('#siteMap svg circle.s')];
      const props = new Set();
      const rows = cs.map(c => {
        const a = c.getAnimations();
        a.forEach(x => (x.effect.getKeyframes() || []).forEach(k => Object.keys(k).forEach(p => props.add(p))));
        return { key: c.getAttribute('data-key'), order: +c.getAttribute('data-order'), anims: a.length,
                 delay: a.length ? a[0].effect.getTiming().delay : null };
      });
      return { rows, props: [...props] };
    });
    if (inlined) {
      if (mo.rows.some(r => !r.anims)) fail(`NO MAP MOTION: ${mo.rows.filter(r => !r.anims).length} of ${mo.rows.length} dots do not animate when reached`);
      else console.log('ok   the dots animate when the briefing is reached');
      const byOrder = mo.rows.slice().sort((x, y) => x.order - y.order);
      const lat = await p.evaluate(() => { const o = {}; window.EGYBI.heat.sites.forEach(s => { o[s.key] = s.lat; }); return o; });
      const latOk = byOrder.every((r, i) => i === 0 || lat[r.key] <= lat[byOrder[i - 1].key]);
      const delayOk = byOrder.every((r, i) => i === 0 || (r.delay != null && r.delay > byOrder[i - 1].delay));
      if (!latOk || !delayOk) fail(`MAP ORDER WRONG: north-to-south ${latOk ? 'ok' : 'broken'}, delays ${delayOk ? 'ascend' : 'do not ascend'}`);
      else console.log('ok   north to south, one after another');
      const bad = mo.props.filter(x => !['offset', 'easing', 'composite', 'computedOffset', 'opacity', 'transform'].includes(x));
      if (bad.length) fail('MAP ANIMATES LAYOUT: ' + bad.join(', '));
      else console.log('ok   opacity and transform only');
    }

    await p.waitForTimeout(2600);
    const after = await p.evaluate(() => [...document.querySelectorAll('#siteMap svg circle.s')].filter(c => parseFloat(getComputedStyle(c).opacity) < 0.99).length);
    if (inlined && after) fail(`MAP DOTS STAY HIDDEN: ${after} dots not fully shown after the sweep`);

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
  }

  // ---- 2. reduced motion --------------------------------------------------------
  {
    const ctx = await b.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
    await block(ctx);
    const p = await ctx.newPage();
    await p.goto(BASE + '/index.html');
    try { await p.waitForSelector('#siteMap svg circle.s', { state: 'attached', timeout: 10000 }); } catch (e) { /* counted below */ }
    await p.evaluate(() => document.getElementById('siteMap').scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      const cs = [...document.querySelectorAll('#siteMap svg circle.s')];
      return { n: cs.length, anims: cs.reduce((s, c) => s + c.getAnimations().length, 0),
               hidden: cs.filter(c => parseFloat(getComputedStyle(c).opacity) < 0.99).length };
    });
    if (!r.n) fail('MAP NOT INLINED: no map under reduced motion');
    else if (r.anims || r.hidden) fail(`MAP MOTION UNDER REDUCED MOTION: ${r.anims} animations, ${r.hidden} dots hidden`);
    else console.log('ok   reduced motion: the coloured map at once, nothing moves');
    await ctx.close();
  }

  // ---- 3. without JavaScript ----------------------------------------------------
  {
    const ctx = await b.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    await block(ctx);
    const p = await ctx.newPage();
    await p.goto(BASE + '/index.html');
    const img = await p.$('#siteMap img');
    if (img) { await img.scrollIntoViewIfNeeded(); await p.waitForTimeout(800); }
    const r = await p.evaluate(() => {
      const i = document.querySelector('#siteMap img');
      if (!i) return null;
      const rc = i.getBoundingClientRect(), cs = getComputedStyle(i);
      return { h: rc.height, w: rc.width, loaded: i.complete && i.naturalWidth > 0, shown: cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.99 };
    });
    if (!r || !r.loaded || !r.shown || r.h < 150) fail('MAP HIDDEN WITHOUT JS: ' + JSON.stringify(r));
    else console.log(`ok   without JavaScript the map is an image, ${Math.round(r.w)}x${Math.round(r.h)}px`);
    await ctx.close();
  }

  await b.close();
  if (fails) { console.log(`\n${fails} briefing-map failure(s)`); process.exit(1); }
  console.log('\nbriefing map: in place, coloured from the briefing, north to south, still without motion or JS');
})().catch(e => { console.error(e); process.exit(1); });
