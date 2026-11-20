const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const [,, coverHtml, outDir, tag] = process.argv;
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2,
    recordVideo: { dir: outDir, size: { width: 540, height: 960 } } });
  const p = await ctx.newPage();
  // 1) the hook card, scaled to the phone viewport
  await p.goto('file://' + coverHtml, { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: 'html{zoom:0.5}' });
  await p.waitForTimeout(3000);
  // 2) the real fair-prices page, scrolled through tipping and entry tickets
  await p.goto('http://127.0.0.1:8793/fair-prices.html', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  for (let i = 0; i < 18; i++) { await p.mouse.wheel(0, 140); await p.waitForTimeout(280); }
  await p.waitForTimeout(1200);
  const v = p.video(); await ctx.close(); await b.close();
  fs.renameSync(await v.path(), path.join(outDir, tag + '.webm'));
})();
