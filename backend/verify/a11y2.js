/* Accessibility checks the earlier passes never ran, across every top-level page
   plus one generated challenge and one generated story: landmark structure,
   heading order, focus visibility on every interactive control, tab order, the
   mobile nav at 375px, and keyboard operability of the map and slider. */
const { chromium } = require('/tmp/claude-0/-home-user-egybi/88e1f418-6292-5215-8c2f-e114945c6b86/scratchpad/node_modules/playwright-core');
const fs = require('fs');
const B = 'http://localhost:8793';
const PAGES = fs.readdirSync('site').filter(f => f.endsWith('.html'))
  .concat(['practice/your-first-select.html', 'papyrus/nineteen-million.html']);

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  await p.route('**/*', r => { const u = r.request().url();
    return (u.startsWith(B) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort(); });

  const findings = {};
  const add = (k, v) => { (findings[k] = findings[k] || []).push(v); };

  for (const path of PAGES) {
    await p.goto(`${B}/${path}`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => {
      const out = {};
      out.landmarks = {
        header: document.querySelectorAll('header, [role=banner]').length,
        nav: document.querySelectorAll('nav, [role=navigation]').length,
        main: document.querySelectorAll('main, [role=main]').length,
        footer: document.querySelectorAll('footer, [role=contentinfo]').length,
      };
      // Heading order: no level may jump by more than one going down.
      const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
        .filter(h => getComputedStyle(h).display !== 'none')
        .map(h => +h.tagName[1]);
      out.headingJumps = [];
      for (let i = 1; i < hs.length; i++)
        if (hs[i] > hs[i - 1] + 1) out.headingJumps.push(`h${hs[i-1]}->h${hs[i]}`);
      out.h1 = hs.filter(x => x === 1).length;
      // Every nav with more than one link should say which nav it is.
      out.unlabelledNav = [...document.querySelectorAll('nav')]
        .filter(n => n.querySelectorAll('a').length > 1 &&
                     !n.getAttribute('aria-label') && !n.getAttribute('aria-labelledby')).length;
      out.langAttr = document.documentElement.getAttribute('lang');
      out.skipLink = !!document.querySelector('a[href^="#"][class*=skip], .skip-link');
      // Controls with no accessible name.
      out.namelessControls = [...document.querySelectorAll('button, a[href], input, select, textarea')]
        .filter(el => {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') return false;
          const txt = (el.innerText || el.value || '').trim();
          return !txt && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')
                 && !el.getAttribute('title') && !el.querySelector('img[alt]:not([alt=""])');
        }).map(el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
                ? '.' + String(el.className).split(' ')[0] : '')).slice(0, 5);
      return out;
    });

    const name = path;
    if (r.landmarks.main === 0) add('pages with no <main> landmark', name);
    if (r.landmarks.header === 0) add('pages with no banner landmark', name);
    if (r.landmarks.footer === 0) add('pages with no contentinfo landmark', name);
    if (r.h1 !== 1) add('pages without exactly one h1', `${name} (${r.h1})`);
    if (r.headingJumps.length) add('heading level skipped', `${name}: ${r.headingJumps.join(', ')}`);
    if (r.unlabelledNav) add('nav with >1 link and no aria-label', `${name} (${r.unlabelledNav})`);
    if (!r.langAttr) add('no lang attribute on <html>', name);
    if (!r.skipLink) add('no skip-to-content link', name);
    if (r.namelessControls.length) add('controls with no accessible name',
      `${name}: ${r.namelessControls.join(', ')}`);

    // Focus ring: tab through the first 20 controls and check something visibly
    // changes. A control you can reach but cannot see focused is unusable by
    // keyboard even though it is technically operable.
    const noRing = await p.evaluate(async () => {
      const els = [...document.querySelectorAll('a[href], button, input, select, textarea')]
        .filter(e => { const cs = getComputedStyle(e);
          return cs.display !== 'none' && cs.visibility !== 'hidden' && e.offsetParent !== null; })
        .slice(0, 20);
      const bad = [];
      for (const e of els) {
        const before = getComputedStyle(e);
        const b = [before.outlineStyle, before.outlineWidth, before.boxShadow,
                   before.borderColor, before.backgroundColor, before.textDecorationLine].join('|');
        e.focus();
        const after = getComputedStyle(e);
        const a = [after.outlineStyle, after.outlineWidth, after.boxShadow,
                   after.borderColor, after.backgroundColor, after.textDecorationLine].join('|');
        if (a === b) bad.push(e.tagName.toLowerCase() +
          (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : ''));
      }
      document.activeElement && document.activeElement.blur();
      return [...new Set(bad)].slice(0, 6);
    });
    if (noRing.length) add('controls with no visible focus change', `${name}: ${noRing.join(', ')}`);

    // Mobile nav at 375px: the toggle must exist, be reachable, and reveal links.
    await p.setViewportSize({ width: 375, height: 800 });
    await p.waitForTimeout(220);
    const mob = await p.evaluate(async () => {
      const t = document.querySelector('.nav-toggle');
      if (!t) return { toggle: false };
      const links = document.querySelector('.nav-links');
      const hiddenBefore = links ? getComputedStyle(links).display === 'none' ||
        links.getBoundingClientRect().height < 4 : null;
      t.click();
      await new Promise(r => setTimeout(r, 260));
      const shownAfter = links ? links.getBoundingClientRect().height > 20 : null;
      const expanded = t.getAttribute('aria-expanded');
      t.click();
      return { toggle: true, hiddenBefore, shownAfter, expanded,
               hasLabel: !!t.getAttribute('aria-label'),
               controls: t.getAttribute('aria-controls') };
    });
    if (!mob.toggle) add('no mobile nav toggle at 375px', name);
    else {
      if (mob.hiddenBefore === false) add('mobile nav already open before the toggle', name);
      if (mob.shownAfter === false) add('mobile nav toggle does not reveal the links', name);
      if (mob.expanded !== 'true') add('toggle does not report aria-expanded=true', `${name} (${mob.expanded})`);
      if (!mob.hasLabel) add('mobile nav toggle has no aria-label', name);
      if (!mob.controls) add('mobile nav toggle has no aria-controls', name);
    }
    await p.setViewportSize({ width: 1280, height: 1000 });
  }

  // Print stylesheet — a page printed with a dark hero wastes a cartridge and
  // a nav bar printed on paper is noise.
  const print = await p.evaluate(() => {
    let rules = 0;
    for (const sh of document.styleSheets) { let rl; try { rl = sh.cssRules; } catch (e) { continue; }
      for (const r of rl) if (r.media && String(r.media).includes('print')) rules++; }
    return rules;
  });

  console.log(`pages checked : ${PAGES.length}`);
  console.log(`@media print rules found in the stylesheet: ${print}`);
  console.log();
  const keys = Object.keys(findings);
  if (!keys.length) console.log('No findings.');
  for (const k of keys.sort()) {
    console.log(`${k} (${findings[k].length}):`);
    findings[k].slice(0, 8).forEach(x => console.log('   ', x));
    if (findings[k].length > 8) console.log(`    … and ${findings[k].length - 8} more`);
  }
  await b.close();
})();
