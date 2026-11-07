#!/usr/bin/env node
/* shots.js: visual evidence, not a check.

   Every other script in this folder answers a yes/no question about the
   rendered site. None of them shows a person what a page LOOKS like, and the
   workstation cannot either: local servers are blocked there, and the browser
   pane opens a local page as a snapshot without its stylesheet. So this saves
   full-page screenshots of the pages that carry the site's main layouts, at a
   desktop and a phone width, into the run's log folder, which the workflow
   uploads as an artifact. Read them with `gh run download <id>`.

   It exits 0 unless the browser itself fails: a screenshot is for a person to
   judge, and an image cannot be graded here. */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium, executablePath, BASE, LOGDIR } = require('./env');

const PAGES = [
  'index.html',
  'papyrus/the-pound-and-a-cup-of-tea.html',   // a Papyrus issue on its sheet
  'prices.html',
  'prices-ar.html',                            // the right-to-left page
  'visit/giza.html',
  'egypt-public-holidays.html',
  'egyptian-pound-since-july.html',            // a data story with the <picture> phone chart
];
const WIDTHS = [1280, 390];

(async () => {
  const out = path.join(LOGDIR || 'verify-logs', 'shots');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath });
  let n = 0;
  for (const page of PAGES) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 }, reducedMotion: 'reduce' });
      const p = await ctx.newPage();
      try {
        await p.goto(`${BASE}/${page}`, { waitUntil: 'load', timeout: 30000 });
        await p.waitForTimeout(800);
        const file = path.join(out, `${page.replace(/[\/.]/g, '_')}-${width}.png`);
        await p.screenshot({ path: file, fullPage: true });
        n++;
      } catch (e) {
        console.log(`could not capture ${page} @${width}: ${String(e).slice(0, 120)}`);
      }
      await ctx.close();
    }
  }
  await browser.close();
  console.log(`screenshots saved: ${n} of ${PAGES.length * WIDTHS.length}, in ${out}`);
})().catch((e) => { console.error(e); process.exit(1); });
