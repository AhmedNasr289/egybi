/* "Content must not depend on a script that may never run."

   AOS's own CSS hides every [data-aos] block at opacity 0, and only its script
   reveals it. Measured 2026-11-15 on the live site with scripts blocked:
   Explore hid 106 blocks (2,557 words), About 33 (837), Home 32 (764).

   egybi.css now shows [data-aos] unless <html> has .js. The page head adds
   .js while scripts run, and removes it if AOS has not started within 4 s.
   This checks both halves, on every page whose HTML carries [data-aos]:

     1. JavaScript disabled: no [data-aos] element may be transparent.
     2. JavaScript on, AOS's script blocked (a CDN or script failure): after
        the 4 s fallback, no [data-aos] element may be transparent.

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

(async () => {
  const b = await chromium.launch({ executablePath });
  const local = r => { const u = r.request().url();
    return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort(); };
  const hidden = async (p) => p.evaluate(() => {
    const els = [...document.querySelectorAll('[data-aos]')];
    return { total: els.length,
             hidden: els.filter(e => +getComputedStyle(e).opacity < 0.05).length };
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
    await off.close();
    seen += a.total;
    if (a.hidden) { fails++; console.log(`HIDDEN WITHOUT JS  ${page}: ${a.hidden} of ${a.total} [data-aos] blocks transparent`); }

    // 2. JavaScript on, AOS blocked
    const on = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const p2 = await on.newPage();
    await p2.route('**/*', r => r.request().url().includes('vendor/aos.js') ? r.abort() : local(r));
    await p2.goto(`${BASE}/${page}`, { waitUntil: 'domcontentloaded' });
    await p2.waitForTimeout(4800);   // past the 4 s fallback in the page head
    const c = await hidden(p2);
    await on.close();
    if (c.hidden) { fails++; console.log(`HIDDEN WHEN AOS FAILS  ${page}: ${c.hidden} of ${c.total} [data-aos] blocks transparent`); }

    if (!a.hidden && !c.hidden) console.log(`ok    ${page}: ${a.total} [data-aos] blocks visible without JS and without AOS`);
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
