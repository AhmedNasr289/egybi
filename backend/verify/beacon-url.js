#!/usr/bin/env node
/* Runs site/assets/analytics.js in a stub browser and checks WHERE its
   page-view beacon goes. From pages at the root and in folders, it must reach
   the one real endpoint, /api/hit.php.

   Why it exists: until 2026-11-09 the beacon used the bare relative
   'api/hit.php'. The browser resolves that against the PAGE, so the 153 pages
   in visit/, papyrus/ and practice/ posted to visit/api/hit.php (a 404) and
   none of their views was ever counted. No check looked at the resolved
   address, only at the file.

   Exit 1 on any wrong address. A control runs the old line and must be caught,
   so this check is proven able to fail. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const src = fs.readFileSync(path.join(root, 'site', 'assets', 'analytics.js'), 'utf8');
const ORIGIN = 'https://egybi.com';
const WANT = ORIGIN + '/api/hit.php';

function beaconFor(code, pagePath) {
  const sent = [];
  const page = new URL(pagePath, ORIGIN);
  const sandbox = {
    URL,
    Blob: function Blob() {},
    JSON,
    location: { hostname: page.hostname, pathname: page.pathname, href: page.href },
    navigator: {
      doNotTrack: '0',
      // A browser resolves a relative beacon URL against the page; do the same.
      sendBeacon: (u) => { sent.push(new URL(u, page.href).href); return true; },
    },
    document: {
      referrer: '',
      currentScript: { src: new URL('/assets/analytics.js', ORIGIN).href },
      addEventListener: () => {},
    },
    fetch: () => Promise.resolve(),
  };
  sandbox.window = sandbox;
  vm.runInNewContext(code, sandbox);
  return sent;
}

const PAGES = ['/', '/prices.html', '/visit/giza.html', '/papyrus/a-nile-of-wheat.html', '/practice/arrivals-growth-2023-to-2025.html'];
let bad = 0;
for (const p of PAGES) {
  const sent = beaconFor(src, p);
  const ok = sent.length === 1 && sent[0] === WANT;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${p} -> ${sent.join(', ') || '(nothing sent)'}`);
}

// Control: the pre-fix line must be caught on a folder page, or this check
// cannot see the fault it was written for.
const old = src.replace(/var url = [^\n]*\n/, "var url = 'api/hit.php';\n").replace(/var me = [^\n]*\n/, '');
const ctl = beaconFor(old, '/visit/giza.html');
const caught = !(ctl.length === 1 && ctl[0] === WANT);
console.log(`${caught ? 'ok  ' : 'FAIL'} control: the old relative URL is caught (it sent ${ctl.join(', ')})`);
if (!caught) bad++;

if (bad) { console.log(`${bad} problem(s)`); process.exit(1); }
console.log(`beacon resolves to ${WANT} from ${PAGES.length} pages, root and folders`);
