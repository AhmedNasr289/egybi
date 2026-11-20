// Build the calendar's screenshot, chart and card assets from the real site.
// Usage: node make_assets.js <repo-root> <site-base-url> [only-prefix]
// Every image is a capture of egybi.com's own pages or charts, so the figures
// shown are the site's figures on the day this runs. No AI images, no stock.
const path = require('path');
const fs = require('fs');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require(process.env.PLAYWRIGHT_CORE || 'playwright-core'); }
const { chromium } = pw;
const [, , ROOT, BASE, ONLY] = process.argv;
const OUT = path.join(ROOT, 'egybi', 'Campaign Kit', 'assets');

// One entry per calendar row that needs an image. kind: el = screenshot of
// one element; svg = a chart file from site/charts; page = top of a page.
const SHOTS = [
  ['2026-11-28-fb-ar-food-prices', 'page', '/prices-ar.html'],
  ['2026-11-30-linkedin-weather-chart', 'svg', 'charts/egypt-weather-by-month.svg'],
  ['2026-12-12-fb-ar-weather-table', 'el', '/ar/visit.html', 'table >> visible=true'],
  ['2026-12-23-fb-ar-name-studio', 'studio', '/ar/hieroglyphs.html', 'Ahmed'],
  ['2026-12-28-linkedin-getting-in', 'el', '/arriving-in-egypt.html', '#entry'],
  ['2027-01-01-x-visa-page', 'page', '/arriving-in-egypt.html'],
  ['2027-01-05-reddit-weather-chart', 'svg', 'charts/egypt-weather-by-month.svg'],
  ['2027-01-07-fb-ar-weather-table', 'el', '/ar/visit.html', 'table >> visible=true'],
  ['2027-01-25-linkedin-abu-simbel-row', 'row', '/fair-prices.html', 'tr[data-row="abu-simbel"]'],
  ['2027-02-16-reddit-pound-chart', 'svg', 'charts/egyptian-pound.svg'],
  ['2027-02-17-linkedin-pound-chart', 'svg', 'charts/egyptian-pound.svg'],
  ['2027-02-22-x-abu-simbel-page', 'page', '/visit/abu-simbel.html'],
  ['2027-03-06-fb-ar-weather-table', 'el', '/ar/visit.html', 'table >> visible=true'],
  ['2027-03-19-fb-ar-weather-table', 'el', '/ar/visit.html', 'table >> visible=true'],
  ['2027-03-22-linkedin-weather-chart', 'svg', 'charts/egypt-weather-by-month.svg'],
  ['2027-03-26-x-giza-page', 'page', '/visit/giza.html'],
  ['2027-03-29-linkedin-holidays-chart', 'svg', 'charts/egypt-public-holidays.svg'],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const done = [];
  for (const [name, kind, target, sel] of SHOTS) {
    if (ONLY && !name.startsWith(ONLY)) continue;
    if (fs.existsSync(path.join(OUT, name + '.png'))) continue;
    const file = path.join(OUT, name + '.png');
    const p = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
    try {
      if (kind === 'svg') {
        const svg = 'file://' + path.join(ROOT, 'site', target);
        await p.setViewportSize({ width: 1600, height: 1000 });
        await p.goto(svg);
        const box = await p.evaluate(() => { const r = document.documentElement.getBoundingClientRect(); return { w: Math.ceil(r.width), h: Math.ceil(r.height) }; });
        await p.setViewportSize({ width: Math.min(box.w || 1600, 2400), height: Math.min(box.h || 1000, 2400) });
        await p.screenshot({ path: file, fullPage: true });
      } else if (kind === 'studio') {
        await p.goto(BASE + target, { waitUntil: 'load', timeout: 20000 });
        await p.fill('#glyphName', sel);
        await p.dispatchEvent('#glyphName', 'input');
        try { await p.click('#glyphForm button[type=submit]', { timeout: 2000 }); } catch (e) {}
        await p.waitForTimeout(1200);
        await p.locator('#studio').screenshot({ path: file });
      } else if (kind === 'page') {
        await p.goto(BASE + target, { waitUntil: 'load', timeout: 20000 });
        await p.waitForTimeout(800);
        await p.screenshot({ path: file });
      } else {
        await p.goto(BASE + target, { waitUntil: 'load', timeout: 20000 });
        await p.waitForTimeout(800);
        const loc = p.locator(sel).first();
        p.setDefaultTimeout(8000);
        if (kind === 'row') {
          // the row plus its table header, so the price has its column names
          const table = loc.locator('xpath=ancestor::table[1]');
          await table.scrollIntoViewIfNeeded();
          await table.screenshot({ path: file });
        } else {
          await loc.scrollIntoViewIfNeeded();
          await loc.screenshot({ path: file });
        }
      }
      done.push(name);
    } catch (e) {
      console.error('FAILED', name, String(e).split('\n')[0]);
    }
    await p.close();
  }
  await b.close();
  console.log('made', done.length, 'images');
})();
