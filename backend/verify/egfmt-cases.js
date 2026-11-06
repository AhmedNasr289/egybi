#!/usr/bin/env node
/* Runs backend/pipeline/tests/egfmt_cases.json against site/assets/egfmt.js.
   The Python twin (pages/egfmt.py) runs the same file in
   tests/test_egfmt.py, so a rule changed in one formatter and not the other
   fails here or there. Exit 1 on any mismatch, printing each one with the
   invisible isolate characters made visible. */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const fmt = require(path.join(root, 'site', 'assets', 'egfmt.js'));
const { cases } = JSON.parse(fs.readFileSync(path.join(root, 'backend', 'pipeline', 'tests', 'egfmt_cases.json'), 'utf8'));
const NAMES = { money_range: 'moneyRange', date_or_raw: 'dateOrRaw' };
const show = (s) => JSON.stringify(s).replace(/\u2066/g, '<LRI>').replace(/\u2069/g, '<PDI>');

let bad = 0;
for (const c of cases) {
  const fn = fmt[NAMES[c.fn] || c.fn];
  let got;
  try {
    if (typeof fn !== 'function') throw new Error('no such function in egfmt.js: ' + c.fn);
    got = fn(...c.args);
  } catch (e) {
    got = 'THREW ' + e.message;
  }
  if (got !== c.out) {
    bad++;
    console.log(`FAIL ${c.fn}(${c.args.map((a) => JSON.stringify(a)).join(', ')}): got ${show(got)}, want ${show(c.out)}`);
  }
}
if (cases.length < 40) { console.log(`FAIL only ${cases.length} cases loaded; the file was expected to hold 40 or more`); bad++; }
console.log(bad ? `egfmt.js: ${bad} of ${cases.length} cases failed` : `egfmt.js: all ${cases.length} cases match`);
process.exit(bad ? 1 : 0);
