/* "The year strip on When to go shows every site's year, and its motion
   carries the months in order." (2026-11-16)

   On visit.html, every other host blocked:
   1. With motion allowed, loaded with the table below the fold:
      - the table has every measured site by twelve months: YEAR STRIP MISSING;
      - with 60px of it on screen, every cell on screen is shown after the
        sweep: YEAR EMPTY ON SCREEN;
      - every cell's animationstart is recorded from page load: the twelve
        months start in order, January first, at least 30 ms apart:
        YEAR NOT IN ORDER;
      - only opacity and transform animate: YEAR ANIMATES LAYOUT;
      - scrolled through, every cell ends fully shown: YEAR STAYS HIDDEN.
   2. Under reduced motion: no animation starts and every cell is shown at
      once: YEAR MOTION UNDER REDUCED MOTION.
   3. Without JavaScript: the whole table is there and shown:
      YEAR HIDDEN WITHOUT JS.

   Exits 1 on any failure. */
const { chromium, executablePath, BASE } = require('./env');

const recorder = () => {
  window.__yearStarts = [];
  document.addEventListener('animationstart', e => {
    const td = e.target;
    if (!td || !td.matches || !td.matches('[data-year-strip] .hc-table td')) return;
    const a = td.getAnimations()[0];
    const props = a ? [...new Set((a.effect.getKeyframes() || []).flatMap(k => Object.keys(k)))] : [];
    window.__yearStarts.push({ m: +getComputedStyle(td).getPropertyValue('--m'), t: performance.now(), props });
  }, true);
};

(async () => {
  const b = await chromium.launch({ executablePath });
  let fails = 0;
  const fail = m => { console.log('FAIL ' + m); fails++; };
  const block = async ctx => ctx.route('**/*', r => {
    const u = r.request().url();
    return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort();
  });
  const cells = () => {
    const t = document.querySelector('[data-year-strip] .hc-table');
    if (!t) return null;
    return { rows: t.querySelectorAll('tbody tr').length, cells: t.querySelectorAll('tbody td').length,
             hidden: [...t.querySelectorAll('tbody td')].filter(c => +getComputedStyle(c).opacity < 0.99).length };
  };

  // ---- 1. motion allowed ----------------------------------------------------
  {
    const ctx = await b.newContext({ reducedMotion: 'no-preference', viewport: { width: 1280, height: 600 } });
    await block(ctx);
    await ctx.addInitScript(recorder);
    const p = await ctx.newPage();
    await p.goto(BASE + '/visit.html');
    await p.waitForTimeout(800);
    const c0 = await p.evaluate(cells);
    if (!c0 || c0.rows < 18 || c0.cells !== c0.rows * 12) fail('YEAR STRIP MISSING: ' + JSON.stringify(c0));
    else console.log(`ok   the year strip holds ${c0.rows} sites x 12 months`);

    const below = await p.evaluate(() => document.querySelector('[data-year-strip] .hc-table').getBoundingClientRect().top - innerHeight);
    await p.evaluate(() => { const t = document.querySelector('[data-year-strip] .hc-table'); window.scrollTo(0, t.getBoundingClientRect().top + scrollY - innerHeight + 60); });
    await p.waitForTimeout(1800);
    const peek = await p.evaluate(() => {
      const tds = [...document.querySelectorAll('[data-year-strip] .hc-table tbody td')];
      const on = tds.filter(c => { const r = c.getBoundingClientRect(); return r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; });
      return { on: on.length, hidden: on.filter(c => +getComputedStyle(c).opacity < 0.99).length };
    });
    if (below <= 0) fail(`YEAR EMPTY ON SCREEN: could not set the case up, the table was on screen at load (${Math.round(below)}px)`);
    else if (!peek.on) fail('YEAR EMPTY ON SCREEN: no cell came into view with 60px of the table showing');
    else if (peek.hidden) fail(`YEAR EMPTY ON SCREEN: ${peek.hidden} of the ${peek.on} cells on screen stay hidden`);
    else console.log(`ok   with 60px of the table showing, its ${peek.on} cells on screen are shown`);

    const starts = await p.evaluate(() => window.__yearStarts || []);
    const first = {};
    starts.forEach(s => { if (!(s.m in first) || s.t < first[s.m]) first[s.m] = s.t; });
    const months = Object.keys(first).map(Number).sort((x, y) => x - y);
    const ordered = months.length === 12 && months.every((m, i) => i === 0 || first[m] - first[months[i - 1]] >= 30);
    if (!ordered) fail(`YEAR NOT IN ORDER: ${months.length} months started; ` + months.map(m => m + '@' + Math.round(first[m] - first[months[0]])).join(' '));
    else console.log(`ok   the months come in January to December over ${Math.round(first[11] - first[0])} ms`);
    const bad = [...new Set(starts.flatMap(s => s.props))].filter(x => !['offset', 'easing', 'composite', 'computedOffset', 'opacity', 'transform'].includes(x));
    if (bad.length) fail('YEAR ANIMATES LAYOUT: ' + bad.join(', '));
    else if (starts.length) console.log('ok   opacity and transform only');

    await p.evaluate(() => document.querySelector('[data-year-strip]').scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(1600);
    const end = await p.evaluate(cells);
    if (!end || end.hidden) fail(`YEAR STAYS HIDDEN: ${end ? end.hidden : '?'} cells not fully shown after the sweep`);
    else console.log('ok   every cell is shown after the sweep');
    await ctx.close();
  }

  // ---- 2. reduced motion ------------------------------------------------------
  {
    const ctx = await b.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
    await block(ctx);
    await ctx.addInitScript(recorder);
    const p = await ctx.newPage();
    await p.goto(BASE + '/visit.html');
    await p.evaluate(() => { const s = document.querySelector('[data-year-strip]'); if (s) s.scrollIntoView({ block: 'center' }); });
    await p.waitForTimeout(1200);
    const c = await p.evaluate(cells);
    const n = await p.evaluate(() => (window.__yearStarts || []).length);
    if (!c || n || c.hidden) fail(`YEAR MOTION UNDER REDUCED MOTION: ${n} animation starts, ${c ? c.hidden : '?'} cells hidden`);
    else console.log('ok   reduced motion: the whole year at once, nothing moves');
    await ctx.close();
  }

  // ---- 3. without JavaScript --------------------------------------------------
  {
    const ctx = await b.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    await block(ctx);
    const p = await ctx.newPage();
    await p.goto(BASE + '/visit.html');
    await p.evaluate(() => { const s = document.querySelector('[data-year-strip]'); if (s) s.scrollIntoView({ block: 'center' }); });
    await p.waitForTimeout(500);
    const c = await p.evaluate(cells);
    if (!c || c.rows < 18 || c.hidden) fail('YEAR HIDDEN WITHOUT JS: ' + JSON.stringify(c));
    else console.log(`ok   without JavaScript all ${c.cells} cells are shown`);
    await ctx.close();
  }

  await b.close();
  if (fails) { console.log(`\n${fails} year-strip failure(s)`); process.exit(1); }
  console.log('\nyear strip: every site by every month, in order, still without motion or JS');
})().catch(e => { console.error(e); process.exit(1); });
