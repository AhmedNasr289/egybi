/* Classes present in the live DOM with no CSS rule behind them. Only the browser
   can answer this: half the markup is painted by renderers after load, and grep
   cannot resolve a selector list, a media query or a nested rule. */
const { chromium, executablePath, BASE, LOGDIR } = require('./env');
const fs = require('fs');
const B = BASE;
const PAGES = fs.readdirSync('site').filter(f => f.endsWith('.html'))
  .concat(['practice/your-first-select.html', 'papyrus/nineteen-million.html']);
const IGNORE = /^(aos|leaflet|cm-|chartjs|swiper|gsl)/;

(async () => {
  const b = await chromium.launch({ executablePath });
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  await p.route('**/*', r => { const u = r.request().url();
    return (u.startsWith(B) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort(); });
  const all = new Map();
  for (const path of PAGES) {
    await p.goto(`${B}/${path}`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1400);
    const un = await p.evaluate(() => {
      const styled = new Set();
      const walk = rules => { for (const r of rules) {
        if (r.selectorText) for (const m of r.selectorText.matchAll(/\.([\w-]+)/g)) styled.add(m[1]);
        if (r.cssRules) walk(r.cssRules); } };
      for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch (e) {} }
      const used = new Map();
      document.querySelectorAll('*').forEach(el => {
        if (typeof el.className !== 'string') return;
        el.classList.forEach(c => { if (!styled.has(c)) used.set(c, (used.get(c) || 0) + 1); });
      });
      return [...used.entries()];
    });
    for (const [c, n] of un) {
      if (IGNORE.test(c)) continue;
      if (!all.has(c)) all.set(c, []);
      all.get(c).push(`${path}×${n}`);
    }
  }
  console.log(`pages inspected: ${PAGES.length}`);
  console.log(`classes in the DOM with no CSS rule: ${all.size}`);
  for (const [c, where] of [...all].sort()) console.log(`   .${c.padEnd(24)} ${where.slice(0,4).join(', ')}`);
  await b.close();
})();
