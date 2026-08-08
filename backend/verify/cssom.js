/* Classes present in the live DOM with no CSS rule behind them. Only the browser
   can answer this: half the markup is painted by renderers after load, and grep
   cannot resolve a selector list, a media query or a nested rule. */
const { chromium, executablePath, BASE, LOGDIR } = require('./env');
const fs = require('fs');
const B = BASE;
const PAGES = fs.readdirSync('site').filter(f => f.endsWith('.html'))
  .concat(['practice/your-first-select.html', 'papyrus/nineteen-million.html']);
// Injected by third-party embeds and styled by them, not by this stylesheet.
const IGNORE = /^(aos|leaflet|cm-|chartjs|swiper|gsl|tradingview)/;

/* A class with no CSS rule is only a defect if it was MEANT to paint something.
   Plenty are selector hooks — community.js does querySelectorAll('.community-form')
   — and reporting those beside the genuinely dead ones buries the signal, which
   is the same mistake the footer-drift check was making. So read every script
   this site ships and treat a class named in one as a hook. */
const HOOKS = (() => {
  const names = new Set();
  const scan = t => {
    for (const m of t.matchAll(/querySelector(?:All)?\(\s*['"`]([^'"`]+)/g))
      for (const c of m[1].matchAll(/\.([\w-]+)/g)) names.add(c[1]);
    for (const m of t.matchAll(/classList\.\w+\(\s*['"`]([\w-]+)/g)) names.add(m[1]);
    for (const m of t.matchAll(/closest\(\s*['"`]\.([\w-]+)/g)) names.add(m[1]);
  };
  const walk = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${e.name}`;
      if (e.isDirectory()) { if (e.name !== 'vendor') walk(full); }
      else if (/\.(js|html)$/.test(e.name)) scan(fs.readFileSync(full, 'utf8'));
    }
  };
  walk('site');
  return names;
})();

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
  const hooks = [...all].filter(([c]) => HOOKS.has(c));
  const dead = [...all].filter(([c]) => !HOOKS.has(c));
  console.log(`pages inspected: ${PAGES.length}`);
  console.log(`classes in the DOM with no CSS rule and no script using them: ${dead.length}`);
  for (const [c, where] of dead.sort()) console.log(`   .${c.padEnd(24)} ${where.slice(0,4).join(', ')}`);
  console.log(`\nno CSS rule, but a script selects them — hooks, not defects (${hooks.length}):`);
  console.log('   ' + hooks.map(([c]) => '.' + c).sort().join(', '));
  await b.close();
})();
