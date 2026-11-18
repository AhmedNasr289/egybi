#!/usr/bin/env node
/* The "Were you quoted a price?" helper on fair-prices.html (fair.js
   fairVerdict, 2026-11-18), tested without a page. A quote at either end of
   a published range is inside it; above the top or below the bottom says by
   how much, as a share of that edge; a row with no figure, or no amount,
   gives no verdict, so the page asks for one instead of guessing. One case
   uses the real fair-prices.json, so a row that loses its figures is caught.
   Exit 1 on any mismatch. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const ctx = { window: {}, console, document: { readyState: 'complete' } };
ctx.window.window = ctx.window;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'site', 'assets', 'fair.js'), 'utf8'), ctx, { filename: 'fair.js' });
const V = ctx.window.EGYBI && ctx.window.EGYBI.fairVerdict;
if (typeof V !== 'function') { console.log('FAIL fair.js does not export fairVerdict'); process.exit(1); }

const fp = JSON.parse(fs.readFileSync(path.join(root, 'site', 'data', 'fair-prices.json'), 'utf8'));
const row = (k) => fp.groups.flatMap((g) => g.rows).find((r) => r.key === k);
const felucca = row('tip-felucca');

const cases = [
  ['the bottom of the range is inside it', V(50, 50, 100), { kind: 'inside', pct: 0 }],
  ['the top of the range is inside it', V(100, 50, 100), { kind: 'inside', pct: 0 }],
  ['double the top is 100% above', V(200, 50, 100), { kind: 'above', pct: 100 }],
  ['a quarter under the bottom is 25% below', V(75, 100, 200), { kind: 'below', pct: 25 }],
  ['a single figure (no high) is its own range', V(130, 100, null), { kind: 'above', pct: 30 }],
  ['no amount: no verdict', V(NaN, 50, 100), null],
  ['a row with no figure: no verdict', V(80, null, null), null],
  ['the real felucca tip: 300 EGP is 50% above its top', felucca ? V(300, felucca.low, felucca.high) : 'no felucca row',
   felucca && felucca.high === 200 ? { kind: 'above', pct: 50 } : 'felucca top is no longer 200: update this case'],
];

let bad = 0;
for (const [name, got, want] of cases) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${JSON.stringify(got)}${ok ? '' : ` (wanted ${JSON.stringify(want)})`}`);
  if (!ok) bad++;
}
console.log(bad ? `fairVerdict: ${bad} mismatch(es)` : `fairVerdict: all ${cases.length} cases match`);
process.exit(bad ? 1 : 0);
