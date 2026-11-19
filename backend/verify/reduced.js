/* "Reduced motion means no animation, never reduced functionality."
   Load each page twice — normal and reduced — and compare what a reader ends
   up with. Content must match; animation must be gone. */
const { chromium, executablePath, BASE, LOGDIR } = require('./env');
const B = BASE;
const ALL = ['404.html','index.html','visit.html','explore.html','geospatial.html','places.html',
             'invest.html','stories.html','streets.html','case.html','prices.html',
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
    // Read hidden reveals EARLY too, before the page head's 4 s no-AOS fallback
    // (study S1). Under reduce, AOS is disabled, so after 4 s that fallback
    // shows everything anyway, and a reading taken only after the slow scroll
    // below could no longer see a missing reduced-motion rule. Measured on
    // PR #119: mutation case 13 went FAILS TO CATCH for exactly that reason,
    // while a reduced-motion reader would really have faced ~4 s of blank blocks.
    const earlyInvisibleAos = await p.evaluate(() => [...document.querySelectorAll('[data-aos]')]
      .filter(e => +getComputedStyle(e).opacity < 0.05).length);
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
      // Text a READER gets, which is not the same as every character in the
      // DOM. Map labels are divIcon markers inside an aria-hidden pane, so
      // their text lands in body.innerText while being, by construction, hidden
      // from assistive technology. How many of them draw depends on the map
      // view, so the count differed harmlessly between the two runs and
      // stories.html reported LOST CONTENT with a delta of 87 characters and
      // nothing actually lost.
      //
      // Measuring on a clone with aria-hidden subtrees removed asks the
      // question this file means to ask. It does relax the check for anything
      // wrongly marked aria-hidden — that is the cost, and it is the right
      // trade: content a screen reader is told to ignore is not content whose
      // disappearance this checker should be policing.
      //
      // data-view-dependent is the same argument for a region that IS read
      // aloud. The story readout on stories.html reports whichever district
      // the reader has scrolled to — 179 characters for the summary, 264 for
      // 6th of October, 410 for Downtown — so the two runs settle on different
      // steps and the page measured a 127-character delta while losing
      // nothing. Length equality is a sound proxy for lost content on a static
      // page and the wrong one for a region whose content is view state.
      //
      // Only the TEXT comparison skips these. links, buttons and chips are
      // still counted across the whole document, so a region that quietly
      // dropped a control under reduced motion is still caught — which is the
      // half of this check that actually protects a reader.
      var _c = document.body.cloneNode(true);
      _c.querySelectorAll('[aria-hidden="true"], [data-view-dependent="true"]')
        .forEach(function (e) { e.remove(); });
      return { text: _c.textContent.replace(/\s+/g,' ').trim().length,
               links: document.querySelectorAll('a[href]').length,
               buttons: document.querySelectorAll('button, input, select').length,
               visible: vis.length, animated, invisibleAos,
               chips: document.querySelectorAll('.on-this-page a').length };
    });
    await p.close();
    // Either reading counts: hidden at first look is hidden.
    m.invisibleAos = Math.max(m.invisibleAos, earlyInvisibleAos);
    return m;
  };
  const normal = await b.newContext();
  const reduced = await b.newContext({ reducedMotion: 'reduce' });
  console.log('page                              text Δ   links  btns  chips | animated(norm→red)  hidden-aos');
  console.log('-'.repeat(96));
  let bad = 0;
  for (const path of PAGES) {
    const n = await measure(normal, path), r = await measure(reduced, path);
    // The guarantee that does not depend on the reveal script (study S4 part 2):
    // with motion.js slow or blocked, a reduced-motion reader must still see
    // every block at once, before the head's 4 s fallback. Only egybi.css's
    // reduced-motion rule provides that; motion.js would otherwise mask it by
    // revealing everything itself, which is how mutation case 13 went blind.
    {
      const p = await reduced.newPage({ viewport: { width: 1280, height: 950 } });
      await p.route('**/*', rt => { const u = rt.request().url();
        if (u.includes('assets/motion.js')) return rt.abort();
        return (u.startsWith(B)||u.startsWith('data:')||u.startsWith('blob:')) ? rt.continue() : rt.abort(); });
      await p.goto(`${B}/${path}`, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(1200);
      const blocked = await p.evaluate(() => [...document.querySelectorAll('[data-aos]')]
        .filter(e => +getComputedStyle(e).opacity < 0.05).length);
      await p.close();
      r.invisibleAos = Math.max(r.invisibleAos, blocked);
    }
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
