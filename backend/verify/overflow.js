/* Real horizontal-overflow detection at 375px.

   The old check compared documentElement.scrollWidth with clientWidth. This site
   sets `body { overflow-x: clip }` on purpose — overflow-x:hidden would turn body
   into a scroll container and kill the sticky header — and clip makes that
   difference permanently 0. The check could never fire on any page.

   What matters to a reader is whether content is CUT OFF: an element extending
   past the viewport whose ancestors cannot be scrolled to reveal it. An element
   inside an overflow-x:auto wrapper is fine — that is a deliberately scrollable
   table. So walk up from each offender looking for a scrollable ancestor, and
   only report the ones with nowhere to scroll. */
const { chromium } = require('/tmp/claude-0/-home-user-egybi/88e1f418-6292-5215-8c2f-e114945c6b86/scratchpad/node_modules/playwright-core');
const fs = require('fs');
const B = 'http://localhost:8793';
const PAGES = fs.readdirSync('site').filter(f => f.endsWith('.html'))
  .concat(['practice/your-first-select.html', 'papyrus/nineteen-million.html']);
const TOL = 2;   // sub-pixel rounding and 1px borders are not overflow

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 375, height: 800 } });
  await p.route('**/*', r => { const u = r.request().url();
    return (u.startsWith(B) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort(); });
  let bad = 0;
  for (const path of PAGES) {
    await p.goto(`${B}/${path}`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1800);
    const r = await p.evaluate((tol) => {
      const vw = document.documentElement.clientWidth;
      // Contained by an ancestor means not a page-level problem: either the
      // wrapper scrolls (a deliberately scrollable table) or it clips (Leaflet
      // oversizes its SVG pane on purpose and hides the excess). Only content
      // with no such ancestor is actually cut off for the reader.
      const contained = el => {
        for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
          const cs = getComputedStyle(n);
          const ox = cs.overflowX;
          const nrc = n.getBoundingClientRect();
          const nOver = Math.max(nrc.right - vw, -nrc.left);
          if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth + 1) return true;
          if ((ox === 'hidden' || ox === 'clip') && nOver <= 2) return true;
        }
        return false;
      };
      const scrollableAncestor = contained;
      const out = [];
      document.querySelectorAll('body *').forEach(el => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        if (cs.position === 'fixed') return;              // overlays are their own thing
        const rc = el.getBoundingClientRect();
        if (rc.width === 0 || rc.height === 0) return;
        // Absolutely positioned entirely off-screen to the left is the standard
        // hidden-until-focused idiom, which is what the skip link uses. That is
        // deliberately out of view, not content clipped away from a reader.
        if (cs.position === 'absolute' && rc.right <= 0) return;
        const over = Math.max(rc.right - vw, -rc.left);
        if (over <= tol) return;
        if (scrollableAncestor(el)) return;               // reachable by scrolling its wrapper
        // Only report the outermost offender in a chain, or the list is noise.
        if (el.parentElement) {
          const prc = el.parentElement.getBoundingClientRect();
          if (Math.max(prc.right - vw, -prc.left) > tol && !scrollableAncestor(el.parentElement)) return;
        }
        out.push({ tag: el.tagName.toLowerCase() +
                     (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : ''),
                   over: Math.round(over), text: (el.innerText || '').trim().slice(0, 40) });
      });
      return { vw, out };
    }, TOL);
    if (r.out.length) {
      bad++;
      console.log(`${path}  (viewport ${r.vw}px)`);
      r.out.slice(0, 5).forEach(o => console.log(`    ${o.tag}  +${o.over}px past the edge  "${o.text}"`));
      if (r.out.length > 5) console.log(`    … and ${r.out.length - 5} more`);
    }
  }
  console.log(`\npages checked: ${PAGES.length}   with content clipped off-screen: ${bad}`);
  await b.close();
  process.exit(bad ? 1 : 0);
})();
