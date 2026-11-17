/* "Every page's header offers Community, and the header fits." (2026-11-16)

   Community was dropped from the header in the October travel-first pivot
   (df3f49c) and never came back when travellers' notes made it a traveller
   feature. This check keeps it there, and keeps the longer row from
   overflowing:

   1. Static, every page in site/ with a main nav: the nav links to
      community.html, labelled Community, right after Stories:
      COMMUNITY MISSING.
   2. In the browser, on a hand-written page, a generated page, a visit page
      and community.html itself, with every other host blocked (so the row is
      measured in the fallback font, wider than Inter — the worst case):
      - from 1280px the desktop row shows every link on one line, inside the
        bar and the window: HEADER OVERFLOW;
      - below 1280px the menu button shows and its menu offers Community:
        COMMUNITY NOT IN MENU (and HEADER OVERFLOW if the page scrolls
        sideways);
      - on community.html its own link is highlighted: NO ACTIVE HIGHLIGHT.

   Exits 1 on any failure. */
const fs = require('fs');
const path = require('path');

const SITE = path.join(__dirname, '..', '..', 'site');
const PAGES = ['about.html', 'stories.html', 'visit/giza.html', 'community.html', 'ar/about.html', 'ru/about.html', 'ar/index.html', 'ru/plan.html'];
// Each language's row from the width it fits at (assets/i18n.css): English
// from 1280px, Arabic from 1440px, Russian from 1600px; the menu below.
const WIDTHS = {
  en: { desktop: [1280, 1366, 1920], menu: [390, 1024, 1279] },
  ar: { desktop: [1440, 1920], menu: [390, 1279, 1439] },
  ru: { desktop: [1600, 1920], menu: [390, 1279, 1599] },
};
const langOf = pg => (/^(ar|ru)\//.exec(pg) || [0, 'en'])[1];

let fails = 0;
const fail = m => { console.log('FAIL ' + m); fails++; };

// ---- 1. static: every main nav carries the link -----------------------------
function htmlFiles(dir) {
  const out = [];
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) { if (n !== 'assets') out.push(...htmlFiles(p)); }
    else if (n.endsWith('.html')) out.push(p);
  }
  return out;
}
let navs = 0;
const missing = [];
for (const f of htmlFiles(SITE)) {
  const t = fs.readFileSync(f, 'utf8');
  const a = t.indexOf('id="navLinks"');
  if (a < 0) continue;
  navs++;
  const nav = t.slice(a, t.indexOf('</nav>', a));
  // Stories, then Community, as the next link.
  // Any label: the Arabic and Russian twins carry translated ones.
  if (!/stories\.html"[^>]*>[^<]+<\/a>\s*<a href="(?:\.\.\/|\/)?community\.html">[^<]+<\/a>/.test(nav)) {
    missing.push(path.relative(SITE, f).replace(/\\/g, '/'));
  }
}
if (!navs) fail('COMMUNITY MISSING: no page with a main nav was found under ' + SITE);
else if (missing.length) fail(`COMMUNITY MISSING: ${missing.length} of ${navs} headers lack Community after Stories: ${missing.slice(0, 8).join(', ')}`);
else console.log(`ok   all ${navs} headers link Community right after Stories`);

// ---- 2. in the browser --------------------------------------------------------
(async () => {
  // Loaded here, so the static half above runs even where no browser is installed.
  const { chromium, executablePath, BASE } = require('./env');
  const b = await chromium.launch({ executablePath });
  for (const pg of PAGES) {
    const { desktop: DESKTOP, menu: MENU } = WIDTHS[langOf(pg)];
    for (const w of [...DESKTOP, ...MENU]) {
      const ctx = await b.newContext({ viewport: { width: w, height: 800 } });
      await ctx.route('**/*', r => {
        const u = r.request().url();
        return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort();
      });
      const p = await ctx.newPage();
      await p.goto(BASE + '/' + pg);
      await p.waitForTimeout(600);
      const m = await p.evaluate(async (desktop) => {
        const bar = document.querySelector('.site-header .bar');
        const nav = document.getElementById('navLinks');
        const acts = document.querySelector('.nav-actions');
        const tog = document.querySelector('.nav-toggle');
        if (!bar || !nav || !tog) return { missing: true };
        const comm = [...nav.querySelectorAll('a')].find(a => /community\.html$/.test(a.getAttribute('href')));
        const r = {
          toggle: getComputedStyle(tog).display !== 'none',
          docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          active: !!(comm && comm.classList.contains('active')),
          hasComm: !!comm
        };
        if (desktop) {
          const vis = [...nav.children].filter(a => getComputedStyle(a).display !== 'none');
          const cs = getComputedStyle(bar);
          const inner = bar.getBoundingClientRect().right - parseFloat(cs.paddingRight);
          r.navOverflow = nav.scrollWidth - nav.clientWidth;
          r.rows = new Set(vis.map(a => Math.round(a.getBoundingClientRect().top))).size;
          r.actsPast = acts ? Math.round(acts.getBoundingClientRect().right - inner) : 0;
          r.commShown = !!(comm && comm.getBoundingClientRect().width > 0);
        } else {
          tog.click();
          await new Promise(res => setTimeout(res, 250));
          const rc = comm ? comm.getBoundingClientRect() : null;
          r.commShown = !!(rc && rc.height > 0 && rc.width > 0 && rc.right <= innerWidth + 1);
          tog.click();
        }
        return r;
      }, DESKTOP.includes(w));
      await ctx.close();
      const at = `${pg} @${w}px`;
      if (m.missing) { fail(`COMMUNITY MISSING: ${at} has no header nav or menu button`); continue; }
      if (!m.hasComm) fail(`COMMUNITY MISSING: ${at} header has no Community link`);
      if (m.docOverflow > 1) fail(`HEADER OVERFLOW: ${at} scrolls sideways by ${m.docOverflow}px`);
      if (DESKTOP.includes(w)) {
        if (m.toggle) fail(`HEADER OVERFLOW: ${at} shows the menu button where the desktop row belongs`);
        if (m.navOverflow > 1 || m.rows !== 1 || m.actsPast > 1 || !m.commShown) {
          fail(`HEADER OVERFLOW: ${at} links overflow ${m.navOverflow}px, ${m.rows} rows, actions ${m.actsPast}px past the bar, Community ${m.commShown ? 'shown' : 'hidden'}`);
        }
      } else {
        if (!m.toggle) fail(`HEADER OVERFLOW: ${at} has no menu button, so the desktop row is squeezed`);
        else if (!m.commShown) fail(`COMMUNITY NOT IN MENU: ${at} the opened menu does not show Community`);
      }
      if (pg === 'community.html' && w === 1280 && !m.active) fail('NO ACTIVE HIGHLIGHT: community.html does not mark its own link');
    }
    console.log(`ok   ${pg} checked at ${[...DESKTOP, ...MENU].join(', ')}px`);
  }
  await b.close();
  if (fails) { console.log(`\n${fails} header failure(s)`); process.exit(1); }
  console.log('\nheader: Community in every header; the row fits from 1280px; the menu carries it below');
})().catch(e => { console.error(e); process.exit(1); });
