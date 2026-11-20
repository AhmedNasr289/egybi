// Raw, silent screen recordings of egybi.com for video scripts (b), (c), (d)
// in 03 Video Scripts.md. Phone-sized (540x960, upscaled to 1080x1920 by
// ffmpeg afterwards). Add the on-screen text and your own voice in CapCut or
// Clipchamp; nothing here is generated imagery, only the site itself.
// Usage: node record_scripts.js <site-base-url> <out-dir> [b|c|d]
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const [, , BASE, OUT, ONLY] = process.argv;
const sleep = (p, ms) => p.waitForTimeout(ms);
async function go(p, url) { await p.goto(BASE + url, { waitUntil: 'load', timeout: 30000 }); await sleep(p, 1200); }
async function scrollTo(p, sel, ms = 1500) {
  await p.locator(sel).first().scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
  await sleep(p, ms);
}
async function wheel(p, n, dy = 120, ms = 260) { for (let i = 0; i < n; i++) { await p.mouse.wheel(0, dy); await sleep(p, ms); } }

const SCRIPTS = {
  // (b) Your name in hieroglyphs: type a demo name, show the signs, the honest note, save.
  b: async (p) => {
    await go(p, '/hieroglyphs.html');
    await scrollTo(p, '#studio', 2000);
    await p.click('#glyphName');
    await p.fill('#glyphName', '');
    for (const ch of 'Sarah') { await p.keyboard.type(ch); await sleep(p, 450); }
    await p.dispatchEvent('#glyphName', 'input');
    try { await p.click('#glyphForm button[type=submit]', { timeout: 1500 }); } catch (e) {}
    await sleep(p, 2500);
    await scrollTo(p, '#glyphNote', 3500);
    await scrollTo(p, '#signs', 4000);
    await wheel(p, 6);
    await scrollTo(p, '#glyphOut', 3000);
  },
  // (c) When is Karnak or Abu Simbel too hot: the table, then Karnak's hours.
  c: async (p) => {
    await go(p, '/egypt-weather-by-month.html');
    await scrollTo(p, 'table', 3000);
    await scrollTo(p, 'tr:has-text("Karnak")', 5000);
    await scrollTo(p, 'tr:has-text("Abu Simbel")', 5000);
    await scrollTo(p, 'tr:has-text("Philae")', 5000);
    await go(p, '/visit/karnak.html');
    await wheel(p, 8, 120, 400);
    await sleep(p, 2500);
    await go(p, '/egypt-weather-by-month.html');
    await scrollTo(p, 'table', 1000);
    await wheel(p, 10, 80, 350);
  },
  // (d) Why almost all of Egypt lives on 4% of it: the governorate map.
  d: async (p) => {
    await go(p, '/explore.html');
    await scrollTo(p, '#egyptMap', 4000);
    await wheel(p, 4, 120, 600);
    await sleep(p, 3000);
    await scrollTo(p, 'text=Top 8 of 27 governorates', 5000);
    await scrollTo(p, '#egyptMap', 4000);
  },
  // Calendar rows recorded the same way (raw footage; add text and voice yourself).
  '2026-12-30-arrival': async (p) => { await go(p, '/arriving-in-egypt.html'); await scrollTo(p, '#entry', 4000); await wheel(p, 12, 110, 450); },
  '2027-01-30-tipping': async (p) => { await go(p, '/fair-prices.html'); await scrollTo(p, 'text=Tips, entry and rides', 2500); await wheel(p, 16, 110, 450); },
  '2027-02-11-holidays-giza': async (p) => { await go(p, '/egypt-public-holidays.html'); await scrollTo(p, 'table', 3500); await wheel(p, 8, 110, 450); await go(p, '/visit/giza.html'); await wheel(p, 8, 120, 450); },
  '2027-02-25-abu-simbel': async (p) => { await go(p, '/visit/abu-simbel.html'); await sleep(p, 2500); await wheel(p, 14, 110, 450); },
  '2027-03-18-philae': async (p) => { await go(p, '/visit/philae.html'); await sleep(p, 2500); await wheel(p, 14, 110, 450); },
  '2027-03-25-giza-camel': async (p) => { await go(p, '/visit/giza.html'); await wheel(p, 10, 110, 450); await go(p, '/fair-prices.html'); await scrollTo(p, 'text=Camel', 4000); },
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  for (const [tag, run] of Object.entries(SCRIPTS)) {
    if (ONLY && tag !== ONLY) continue;
    const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2,
      recordVideo: { dir: OUT, size: { width: 540, height: 960 } } });
    const p = await ctx.newPage();
    try { await run(p); } catch (e) { console.error('script', tag, String(e).split('\n')[0]); }
    const v = p.video(); await ctx.close();
    fs.renameSync(await v.path(), path.join(OUT, 'raw-' + tag + '.webm'));
    console.log('recorded', tag);
  }
  await b.close();
})();
