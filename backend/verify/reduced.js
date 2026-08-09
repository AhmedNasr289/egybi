/* "Reduced motion means no animation, never reduced functionality."
   Load each page twice — normal and reduced — and compare what a reader ends
   up with. Content must match; animation must be gone. */
const { chromium, executablePath, BASE, LOGDIR } = require('./env');
const B = BASE;
const ALL = ['404.html','index.html','visit.html','explore.html','geospatial.html','places.html',
             'invest.html','stories.html','streets.html','case.html','prices.html','stocks.html',
             'blog.html','about.html','community.html','privacy.html',
             'practice/your-first-select.html','papyrus/nineteen-million.html'];
// ONLY lets the mutation harness drive one page instead of eighteen, each of
// which is loaded twice. Same code path and same assertions — a mutation case
// that exercised a copy of this logic would prove nothing about the tool that
// actually runs.
const PAGES = process.env.ONLY ? process.env.ONLY.split(',') : ALL;

(async () => {
  const b = await chromium.launch({ executablePath });
  const measure = async (ctx, path) => {
    const p = await ctx.newPage({ viewport: { width: 1280, height: 950 } });
    await p.route('**/*', r => { const u = r.request().url();
      return (u.startsWith(B)||u.startsWith('data:')||u.startsWith('blob:')) ? r.continue() : r.abort(); });
    await p.goto(`${B}/${path}`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1800);
    // AOS reveals on a throttled scroll listener. Stepping faster than it can
    // fire leaves elements at opacity 0 and makes NORMAL mode look broken —
    // that exact mistake produced a false failure earlier today. 400px steps
    // with a 170ms pause is slow enough that the result means something.
    await p.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y); await new Promise(r => setTimeout(r, 170));
      }
      window.scrollTo(0, 0);
    });
    await p.waitForTimeout(900);
    const m = await p.evaluate(() => {
      const vis = [...document.querySelectorAll('body *')].filter(e => {
        const s = getComputedStyle(e);
        return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.01;
      });
      const animated = [...document.querySelectorAll('body *')].filter(e => {
        const s = getComputedStyle(e);
        return (s.animationName !== 'none' && s.animationDuration !== '0s') ||
               (s.transitionDuration !== '0s' && s.transitionProperty !== 'none' &&
                parseFloat(s.transitionDuration) > 0.05);
      }).length;
      // Anything still transparent after load is content a reader cannot see.
      const invisibleAos = [...document.querySelectorAll('[data-aos]')]
        .filter(e => +getComputedStyle(e).opacity < 0.05).length;
      return { text: document.body.innerText.replace(/\s+/g,' ').trim().length,
               links: document.querySelectorAll('a[href]').length,
               buttons: document.querySelectorAll('button, input, select').length,
               visible: vis.length, animated, invisibleAos,
               chips: document.querySelectorAll('.on-this-page a').length };
    });
    await p.close();
    return m;
  };
  const normal = await b.newContext();
  const reduced = await b.newContext({ reducedMotion: 'reduce' });
  console.log('page                              text Δ   links  btns  chips | animated(norm→red)  hidden-aos');
  console.log('-'.repeat(96));
  let bad = 0;
  for (const path of PAGES) {
    const n = await measure(normal, path), r = await measure(reduced, path);
    const dText = Math.abs(n.text - r.text);
    const lost = (r.links < n.links) || (r.buttons < n.buttons) || (r.chips < n.chips) || dText > 40;
    // A page that keeps animating under reduce IS the failure this file is
    // named after, and until now the tool only printed it in the margin. Every
    // one of the 17 pages measures 0 here, so promoting it to a failure costs
    // nothing today and is the only reason it will still be 0 later.
    const stillMoving = r.animated > 0;
    if (lost || r.invisibleAos > 0 || stillMoving) bad++;
    console.log(`${path.padEnd(33)} ${String(dText).padStart(5)}  ${String(r.links).padStart(5)} ${String(r.buttons).padStart(5)} ${String(r.chips).padStart(5)} |`
      + ` ${String(n.animated).padStart(4)} → ${String(r.animated).padStart(4)}${stillMoving?'  <-- still animating':''}`
      // A hidden reveal needs its own marker. It was printed as a bare number
      // in this column, which meant a mutation case could only anchor on the
      // summary counter — and that counter also moves for LOST CONTENT, so the
      // case could not tell the two failures apart.
      + `      ${r.invisibleAos}${r.invisibleAos?'   <-- HIDDEN REVEAL':''}${lost?'   <-- LOST CONTENT':''}`);
  }
  console.log(`\npages where reduced motion lost content, hid a reveal, or kept animating: ${bad}`);
  await b.close();
  process.exit(bad ? 1 : 0);
})();
