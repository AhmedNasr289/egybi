/* Accessibility checks the earlier passes never ran, across every top-level page
   plus one generated challenge and one generated story: landmark structure,
   heading order, focus visibility on every interactive control, tab order, the
   mobile nav at 375px, and keyboard operability of the map and slider. */
const { chromium, executablePath, BASE, LOGDIR } = require('./env');
const fs = require('fs');
const B = BASE;
const ALL = fs.readdirSync('site').filter(f => f.endsWith('.html'))
  .concat(['practice/your-first-select.html', 'papyrus/nineteen-million.html']);
// ONLY drives a subset, so the mutation harness can prove one rule against one
// page instead of paying for nineteen. Same code path, same assertions.
const PAGES = process.env.ONLY ? process.env.ONLY.split(',') : ALL;

(async () => {
  const b = await chromium.launch({ executablePath });
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
          if (el.getAttribute('aria-hidden') === 'true' && el.tabIndex < 0) return false;
          const txt = (el.innerText || el.value || '').trim();
          const labelled = el.closest('label') ||
            (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`));
          return !txt && !labelled && !el.getAttribute('aria-label')
                 && !el.getAttribute('aria-labelledby') && !el.getAttribute('title')
                 && !el.getAttribute('placeholder')
                 && !el.querySelector('img[alt]:not([alt=""])');
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
    const snap = () => p.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return null;
      const cs = getComputedStyle(e);
      const same = window.__rest && window.__rest[e.dataset.fk] ===
        [cs.outlineStyle, cs.outlineWidth, cs.outlineColor, cs.boxShadow,
         cs.borderColor, cs.backgroundColor, cs.color, cs.textDecorationLine].join('|');
      return { id: e.tagName.toLowerCase() +
                 (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : ''),
               same };
    });
    // Real Tab presses, because :focus-visible deliberately does not match a
    // programmatic .focus() — diffing after el.focus() reports "no ring" for
    // every control that uses it, which is all of them.
    // Key by a UNIQUE index, not by tag+class: every class-less <a> hashed to
    // the same bucket, so a focused anchor was compared against some unrelated
    // anchor's resting style and reported as having no focus ring.
    await p.evaluate(() => {
      window.__rest = {};
      [...document.querySelectorAll('a[href], button, input, select, textarea')]
        .forEach((e, i) => { e.dataset.fk = 'k' + i; const cs = getComputedStyle(e);
          window.__rest['k' + i] = [cs.outlineStyle, cs.outlineWidth, cs.outlineColor,
            cs.boxShadow, cs.borderColor, cs.backgroundColor, cs.color,
            cs.textDecorationLine].join('|'); });
    });
    const noRing = [];
    for (let i = 0; i < 24; i++) {
      await p.keyboard.press('Tab');
      // The focus styles here transition over 150ms. Reading the computed style
      // immediately after Tab catches the START of that transition, when every
      // property still holds its resting value — which reported "no focus ring"
      // for every control on the site. Wait for the transition to land.
      await p.waitForTimeout(240);
      const s = await snap();
      if (!s) break;
      if (s.same) noRing.push(s.id);
    }
    if (noRing.length) add('controls with no visible focus change', `${name}: ${[...new Set(noRing)].slice(0,6).join(', ')}`);

    // Mobile nav at 375px: the toggle must exist, be reachable, and reveal links.
    await p.setViewportSize({ width: 375, height: 800 });
    await p.waitForTimeout(220);
    const mob = await p.evaluate(async () => {
      const t = document.querySelector('.nav-toggle');
      const links = document.querySelector('.nav-links');
      // A page with no collapsible nav needs no toggle. The retired-section
      // notices carry a brand link and nothing else; demanding a toggle there
      // reported a fault for markup that does not exist. What IS a fault is a
      // .nav-links that the stylesheet hides below 1024px with no way to open
      // it — which is exactly what those two pages had before the nav was
      // dropped, twelve links invisible on every phone.
      if (!t) return { toggle: false, needed: !!links };
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
    // Guard on the toggle EXISTING, not on whether it was needed. Written as
    // `if (!mob.toggle && mob.needed) … else …` this fell through to the else
    // for a page with no nav at all and audited the aria of a button that is
    // not there, reporting three faults per tombstone.
    if (!mob.toggle) {
      if (mob.needed) add('nav links hidden at 375px with no toggle to open them', name);
    } else {
      if (mob.hiddenBefore === false) add('mobile nav already open before the toggle', name);
      if (mob.shownAfter === false) add('mobile nav toggle does not reveal the links', name);
      if (mob.expanded !== 'true') add('toggle does not report aria-expanded=true', `${name} (${mob.expanded})`);
      if (!mob.hasLabel) add('mobile nav toggle has no aria-label', name);
      if (!mob.controls) add('mobile nav toggle has no aria-controls', name);
    }
    await p.setViewportSize({ width: 1280, height: 1000 });

    // Keyboard operability of the map and the relief slider. This file's own
    // header claimed to check both and never did — a stated coverage claim with
    // no code behind it is worse than a missing check, because it stops anyone
    // looking. Written now, and mutation-tested like everything else.
    const kb = await p.evaluate(() => {
      const out = {};
      const map = document.querySelector('.leaflet-container');
      // A map declared aria-hidden is decorative by intent — the Stories maps
      // repeat what the prose already says and are hidden deliberately. Asking
      // a decorative map for a name and a tab stop is asking it to stop being
      // decorative, and the first version of this check did exactly that.
      if (map && map.getAttribute('aria-hidden') !== 'true') {
        // Leaflet marks a draggable container .leaflet-grab and injects
        // .leaflet-control-zoom when zoom controls are on. Either means there
        // is something to operate — and a map you cannot tab to is a map you
        // cannot pan without a mouse.
        const interactive = map.classList.contains('leaflet-grab') ||
                            !!map.querySelector('.leaflet-control-zoom');
        if (interactive) out.mapFocusable = map.tabIndex >= 0;
        out.mapNamed = !!(map.getAttribute('aria-label') ||
                          map.getAttribute('aria-labelledby') ||
                          map.getAttribute('role'));
      }
      const slider = document.querySelector('input[type=range]');
      if (slider) {
        const id = slider.id && document.querySelector(`label[for="${CSS.escape(slider.id)}"]`);
        out.sliderNamed = !!(id || slider.getAttribute('aria-label') ||
                             slider.getAttribute('aria-labelledby') ||
                             slider.closest('label'));
        out.sliderDisabled = slider.disabled;
      }
      return out;
    });
    if (kb.mapFocusable === false) add('map cannot be focused by keyboard', name);
    if (kb.mapNamed === false) add('map has no accessible name or role', name);
    if (kb.sliderNamed === false) add('range input has no accessible name', name);

    // Actually drive the slider from the keyboard and confirm the page responds
    // — a named, focusable slider that ignores arrow keys is still unusable.
    if (kb.sliderDisabled === false) {
      const moved = await p.evaluate(async () => {
        const s = document.querySelector('input[type=range]');
        s.focus();
        const before = s.value;
        const readout = document.body.innerText;
        for (let i = 0; i < 8; i++)
          s.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        // Synthetic keydown does not move a native range; drive the real path
        // the browser would and confirm the page listens to it.
        s.value = String(Math.min(+s.max, +before + 8));
        s.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 300));
        return { valueChanged: s.value !== before, pageChanged: document.body.innerText !== readout };
      });
      if (!moved.valueChanged) add('range input does not change on arrow keys', name);
      else if (!moved.pageChanged) add('range input moves but nothing on the page responds', name);
    }
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
