// Render the card HTML files to PNG, and make the two name-studio cards from
// a real screenshot of egybi.com's hieroglyphs.html (served locally).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [, , htmlDir, outDir, siteBase] = process.argv;

(async () => {
  const browser = await chromium.launch();
  // 1) Real studio output for the name "SARAH" (a common name; shows the tool, not a person).
  const st = await browser.newPage({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 2 });
  await st.goto(siteBase + '/hieroglyphs.html', { waitUntil: 'networkidle' });
  await st.fill('#glyphName', 'Sarah');
  await st.dispatchEvent('#glyphName', 'input');
  try { await st.click('#glyphForm button[type=submit]', { timeout: 2000 }); } catch (e) {}
  await st.waitForTimeout(1500);
  // The studio's own "save as PNG" export: the exact image a visitor shares.
  const shot = path.join(htmlDir, 'studio-sarah.png');
  const [dl] = await Promise.all([st.waitForEvent('download', { timeout: 15000 }), st.click('#glyphPng')]);
  await dl.saveAs(shot);
  const note = (await st.textContent('#glyphNote').catch(() => '')) || '';
  fs.writeFileSync(path.join(htmlDir, 'studio-note.txt'), note.trim());
  await st.close();

  const img = 'data:image/png;base64,' + fs.readFileSync(shot).toString('base64');
  const tpl = fs.readFileSync(path.join(htmlDir, 'pin03-entry-tickets.html'), 'utf8');
  const head = tpl.slice(0, tpl.indexOf('<body>'));
  const brand = (tag) => `<div class="foot"><div class="src">A phonetic transliteration from the 24 single-consonant signs (Gardiner's uniliteral list), not a translation. Made with the free name studio on egybi.com.</div><div class="brand"><span class="g">&#x132F9;</span>egybi.com <small>· ${tag}</small></div></div>`;
  const cards = {
    'pin09-name-in-hieroglyphs': [1000, 1500, `<div class="kicker">Free · your name in hieroglyphs</div><h1 style="font-size:80px">What your name looks like on a temple wall</h1><div class="lead">Type a name, get the signs, then find them on real walls in Egypt.</div><div style="margin-top:40px;text-align:center;background:rgba(255,255,255,.5);border-radius:8px;padding:30px"><img src="${img}" style="width:100%"></div>${brand('Egypt, honestly')}`],
    'cover02-name-hieroglyphs': [1080, 1920, `<div style="padding-top:120px"></div><div class="kicker" style="font-size:34px">Comment your name</div><h1 style="font-size:112px;margin-top:30px">Your name in hieroglyphs</h1><div style="margin-top:80px;text-align:center;background:rgba(255,255,255,.5);border-radius:8px;padding:40px"><img src="${img}" style="width:100%"></div><div class="lead" style="font-size:42px;margin-top:50px">I'll write the next ones in the comments.</div>${brand('Egypt, honestly')}`],
  };
  for (const [name, [w, h, body]] of Object.entries(cards)) {
    const doc = head.replace(/width: \d+px; height: \d+px;/, `width: ${w}px; height: ${h}px;`) + `<body><div class="frame">${body}</div></body></html>`;
    fs.writeFileSync(path.join(htmlDir, name + '.html'), doc);
  }

  // 2) Render every card at its own size.
  for (const f of fs.readdirSync(htmlDir).filter((f) => f.endsWith('.html')).sort()) {
    const src = fs.readFileSync(path.join(htmlDir, f), 'utf8');
    const m = src.match(/html, body \{ width: (\d+)px; height: (\d+)px; \}/);
    const [w, h] = m ? [+m[1], +m[2]] : [1000, 1500];
    const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.goto('file://' + path.join(htmlDir, f), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    // Fail loudly if anything overflows the frame (text cut off at the bottom).
    const over = await p.evaluate(() => {
      const fr = document.querySelector('.frame').getBoundingClientRect();
      const foot = document.querySelector('.foot');
      const kids = [...document.querySelectorAll('.frame > *:not(.foot)')];
      const lastBottom = Math.max(...kids.map((k) => k.getBoundingClientRect().bottom));
      return { lastBottom, footTop: foot ? foot.getBoundingClientRect().top : fr.bottom };
    });
    const flag = over.lastBottom > over.footTop - 10 ? '  OVERLAP' : '';
    await p.screenshot({ path: path.join(outDir, f.replace('.html', '.png')) });
    console.log(f, `${w}x${h}`, `content ends ${Math.round(over.lastBottom)} / footer ${Math.round(over.footTop)}${flag}`);
    await p.close();
  }
  await browser.close();
})();
