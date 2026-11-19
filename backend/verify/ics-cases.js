#!/usr/bin/env node
/* The planner's calendar file (ics.js, 2026-11-18), tested without a page.
   Stops are placed one after another from the arrival date, each lasting the
   days the reader gave it (an all-day event ends the day after it closes,
   RFC 5545 DTEND); text is escaped; long lines are folded at 75 octets;
   every line ends CRLF; no arrival date or no stops gives no file.
   Exit 1 on any mismatch. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');
const ctx = { window: {}, console, unescape, encodeURIComponent };
ctx.window.window = ctx.window;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'site', 'assets', 'ics.js'), 'utf8'), ctx, { filename: 'ics.js' });
const I = ctx.window.EGYBI && ctx.window.EGYBI.ics;
if (!I || typeof I.build !== 'function') { console.log('FAIL ics.js does not export build'); process.exit(1); }

const now = new Date(Date.UTC(2026, 10, 18, 12, 0, 0));
const trip = { start: '2026-12-16', stops: [
  { id: 'site:giza', name: 'The Giza Pyramids', days: 2 },
  { id: 'site:karnak', name: 'Karnak Temple, Luxor; East Bank', days: 3 },
] };
const out = I.build(trip, { now, note: 'Planned on egybi.com' });
const lines = out ? out.split('\r\n') : [];
const longName = { start: '2026-12-16', stops: [{ id: 'x', name: 'Ä'.repeat(60), days: 1 }] };
const folded = I.build(longName, { now }) || '';

let bad = 0;
const check = (name, ok, got) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ': ' + got}`); if (!ok) bad++; };
check('a file is made for a trip with an arrival date', !!out, out);
check('the first stop starts on the arrival date', lines.includes('DTSTART;VALUE=DATE:20261216'), lines.join('|'));
check('a two-day stop ends the day after its last day', lines.includes('DTEND;VALUE=DATE:20261218'), lines.join('|'));
check('the second stop starts when the first ends', lines.includes('DTSTART;VALUE=DATE:20261218') && lines.includes('DTEND;VALUE=DATE:20261221'), lines.join('|'));
check('commas and semicolons in a name are escaped', lines.includes('SUMMARY:Karnak Temple\\, Luxor\\; East Bank'), lines.join('|'));
check('every line ends CRLF and the file ends with one', out.endsWith('\r\n') && !/[^\r]\n/.test(out), JSON.stringify(out.slice(-20)));
check('two events, one calendar', (out.match(/BEGIN:VEVENT/g) || []).length === 2 && out.startsWith('BEGIN:VCALENDAR'), out.slice(0, 40));
check('a long line is folded into lines of at most 75 octets',
  folded.split('\r\n').every((l) => Buffer.byteLength(l, 'utf8') <= 75) && folded.includes('\r\n '), folded);
check('no arrival date: no file', I.build({ stops: trip.stops }, { now }) === null, 'a file');
check('no stops: no file', I.build({ start: '2026-12-16', stops: [] }, { now }) === null, 'a file');
console.log(bad ? `ics: ${bad} mismatch(es)` : 'ics: all cases match');
process.exit(bad ? 1 : 0);
