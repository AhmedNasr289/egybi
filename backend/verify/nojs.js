/* "Content must not depend on a script that may never run."

   [data-aos] blocks are hidden by egybi.css only while <html> has .js, and only
   until motion.js marks them .is-in as they enter the view (study S4; AOS
   used to do this and is no longer loaded). Measured 2026-11-15 with scripts
   blocked, before the S1 guard: Explore hid 106 blocks (2,557 words), About 33
   (837), Home 32 (764).

   The page head adds .js while scripts run, and removes it if motion.js has not
   started (html.mo-ready) within 4 s. This checks three things, on every page
   whose HTML carries [data-aos]:

     1. JavaScript disabled: no [data-aos] element may be transparent.
     2. JavaScript on, motion.js blocked (a script failure): after the 4 s
        fallback, no [data-aos] element may be transparent.
     3. JavaScript on and working, the page scrolled top to bottom: every
        [data-aos] element must have been revealed (none STUCK HIDDEN).
     4. A fling, one jump to the bottom: every block above the bottom of the
        screen must be revealed (none STUCK AFTER A FLING).

   Exits 1 on any hidden block, and also when it found too few blocks to mean
   anything (a check that inspected nothing must not pass). */
const fs = require('fs');
const path = require('path');
const { chromium, executablePath, BASE } = require('./env');

const SITE = path.join(__dirname, '..', '..', 'site');
const ALL = fs.readdirSync(SITE).filter(f => f.endsWith('.html') &&
  fs.readFileSync(path.join(SITE, f), 'utf8').includes('data-aos='));
// ONLY lets the mutation harness drive one page, through the same code path.
const PAGES = process.env.ONLY ? process.env.ONLY.split(',') : ALL;
const MIN_BLOCKS = process.env.ONLY ? 5 : 100;
const REVEALER = 'assets/motion.js';

(async () => {
  const b = await chromium.launch({ executablePath });
  const local = r => { const u = r.request().url();
    return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort(); };
  const hidden = async (p) => p.evaluate(() => {
    const els = [...document.querySelectorAll('[data-aos]')];
    const bad = els.filter(e => +getComputedStyle(e).opacity < 0.05);
    // Name each hidden block, so a red run says which one and why, not only how many.
    const where = bad.slice(0, 8).map(e => {
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      let clip = '', a = e.parentElement;
      for (; a && a !== document.body; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (s.display === 'none' || a.hidden) { clip = 'inside hidden ' + a.tagName.toLowerCase() + (a.id ? '#' + a.id : ''); break; }
        if (s.overflow !== 'visible' || s.overflowX !== 'visible') { clip = 'inside overflow:' + s.overflow + ' ' + a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') + '.' + String(a.className).split(' ')[0]; break; }
      }
      return `${e.tagName.toLowerCase()}.${String(e.className).replace(/ /g, '.')} "${(e.textContent || '').trim().slice(0, 40)}" ` +
        `${Math.round(r.width)}x${Math.round(r.height)} at y=${Math.round(r.top + scrollY)} x=${Math.round(r.left)} ` +
        `transition=${cs.transitionProperty}/${cs.transitionDuration} ${clip}`;
    });
    return { total: els.length, hidden: bad.length, where };
  });

  let fails = 0, seen = 0;
  for (const page of PAGES) {
    // 1. JavaScript disabled
    const off = await b.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const p1 = await off.newPage();
    await p1.route('**/*', local);
    await p1.goto(`${BASE}/${page}`, { waitUntil: 'domcontentloaded' });
    await p1.waitForTimeout(300);
    const a = await hidden(p1);
    // Counters: the HTML itself must carry the real figure. A count-up only
    // animates it, so without JavaScript, or when the animation never starts
    // (a fling past it), a reader sees the number and not "0" (2026-11-16:
    // 17 counters on about.html and explore.html said 0, e.g. "0 feature films").
    const cnt = await p1.evaluate(() => {
      const fmt = d => { const v = parseFloat(d.count), dp = parseInt(d.decimals || '0', 10);
        const n = d.sep ? v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }) : v.toFixed(dp);
        return (d.prefix || '') + n + (d.suffix || ''); };
      const els = [...document.querySelectorAll('.num[data-count]')];
      return { total: els.length, wrong: els.filter(e => e.textContent.trim() !== fmt(e.dataset))
        .map(e => `"${e.textContent.trim()}" should read "${fmt(e.dataset)}"`) };
    });
    await off.close();
    seen += a.total;
    if (cnt.wrong.length) { fails++; console.log(`COUNTER WRONG WITHOUT JS  ${page}: ${cnt.wrong.length} of ${cnt.total}: ${cnt.wrong.slice(0, 4).join('; ')}`); }
    if (a.hidden) { fails++; console.log(`HIDDEN WITHOUT JS  ${page}: ${a.hidden} of ${a.total} [data-aos] blocks transparent`); a.where.forEach(w => console.log('      ' + w)); }

    // 2. JavaScript on, the revealing script blocked
    const on = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const p2 = await on.newPage();
    await p2.route('**/*', r => r.request().url().includes(REVEALER) ? r.abort() : local(r));
    await p2.goto(`${BASE}/${page}`, { waitUntil: 'domcontentloaded' });
    await p2.waitForTimeout(4800);   // past the 4 s fallback in the page head
    const c = await hidden(p2);
    await on.close();
    if (c.hidden) { fails++; console.log(`HIDDEN WHEN THE REVEAL SCRIPT FAILS  ${page}: ${c.hidden} of ${c.total} [data-aos] blocks transparent`); c.where.forEach(w => console.log('      ' + w)); }

    // 3. JavaScript on and working: scroll through, then nothing may stay hidden
    const ok = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const p3 = await ok.newPage();
    await p3.route('**/*', local);
    await p3.goto(`${BASE}/${page}`, { waitUntil: 'domcontentloaded' });
    await p3.waitForTimeout(600);
    await p3.evaluate(async () => {
      for (let y = 0; y <= document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90));
      }
    });
    await p3.waitForTimeout(1100);   // 0.6 s transition plus at most 0.3 s delay
    const d = await hidden(p3);
    const ready = await p3.evaluate(() => document.documentElement.classList.contains('mo-ready'));
    // 4. A fling: one jump straight to the bottom, as a fast flick on a slow
    //    phone does. The observer never sees the blocks in between cross the
    //    screen, so only the sweep in motion.js can reveal them. Every block
    //    whose top is above the bottom of the screen must be revealed.
    const p4 = await ok.newPage();
    await p4.route('**/*', local);
    await p4.goto(`${BASE}/${page}`, { waitUntil: 'domcontentloaded' });
    await p4.waitForTimeout(600);
    await p4.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p4.waitForTimeout(1100);
    const f = await p4.evaluate(() => {
      const els = [...document.querySelectorAll('[data-aos]')].filter(e => e.getBoundingClientRect().top < innerHeight);
      return { total: els.length, hidden: els.filter(e => +getComputedStyle(e).opacity < 0.05).length };
    });
    await ok.close();
    if (f.hidden) { fails++; console.log(`STUCK AFTER A FLING  ${page}: ${f.hidden} of ${f.total} [data-aos] blocks above the screen never revealed after one jump to the bottom`); }
    if (d.hidden) { fails++; console.log(`STUCK HIDDEN  ${page}: ${d.hidden} of ${d.total} [data-aos] blocks never revealed after scrolling (mo-ready=${ready})`); d.where.forEach(w => console.log('      ' + w)); }

    if (!a.hidden && !c.hidden && !d.hidden && !f.hidden) console.log(`ok    ${page}: ${a.total} [data-aos] blocks visible without JS, without the reveal script, after scrolling, and after a fling`);
  }
  await b.close();

  if (seen < MIN_BLOCKS) {
    console.log(`VACUOUS: only ${seen} [data-aos] blocks across ${PAGES.length} page(s); expected at least ${MIN_BLOCKS}. ` +
                'The check inspected too little to mean anything.');
    process.exit(1);
  }
  console.log(fails ? `no-JS check: ${fails} page state(s) hide content` :
                      `no-JS check: ${PAGES.length} page(s), ${seen} blocks, nothing hidden`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
