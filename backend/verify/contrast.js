/* WCAG contrast measured against the background actually painted behind each
   text node, walking up until an opaque ancestor is found. A token that passes
   against the palette can still fail on the surface it lands on. */
const { chromium, executablePath, BASE, LOGDIR } = require('./env');
const fs = require('fs');
const B = BASE;
const PAGES = fs.readdirSync('site').filter(f => f.endsWith('.html'))
  .concat(['practice/your-first-select.html', 'papyrus/nineteen-million.html']);

(async () => {
  const b = await chromium.launch({ executablePath });
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  await p.route('**/*', r => { const u = r.request().url();
    return (u.startsWith(B) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort(); });
  let total = 0, fails = [], cleared = [], worst = 99;
  for (const path of PAGES) {
    await p.goto(`${B}/${path}`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1300);
    const r = await p.evaluate(() => {
      const lum = c => { const [r,g,b]=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});
        return 0.2126*r+0.7152*g+0.0722*b; };
      const parse = s => (s.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
      // A section can paint its ground entirely in background-image — every hero
      // here does, via a radial-gradient — and getComputedStyle().backgroundColor
      // reports transparent for those. Walking past them lands on the cream body
      // and scores white heading text at 1.04:1, which is what the first version
      // of this check reported. So gradients are resolved, and EVERY colour stop
      // in one is treated as a candidate ground: the ratio kept is the WORST
      // across the gradient, because text has to stay legible over all of it.
      const bgsOf = el => { for (let n=el;n;n=n.parentElement) {
          const cs=getComputedStyle(n);
          const img=cs.backgroundImage;
          if (img && img!=='none') {
            const stops=[...img.matchAll(/rgba?\(([^)]+)\)/g)]
              .map(m=>m[1].split(',').slice(0,3).map(Number))
              .filter(c=>c.length===3 && c.every(v=>!isNaN(v)));
            if (stops.length) return stops;
          }
          const c=cs.backgroundColor; const a=(c.match(/[\d.]+/g)||[])[3];
          if (c && c!=='transparent' && c!=='rgba(0, 0, 0, 0)' && (a===undefined||+a>0.9)) return [parse(c)];
        } return [[255,255,255]]; };
      const out=[], seen=new Set(); let flag=0;
      document.querySelectorAll('body *').forEach(el => {
        const txt=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('');
        if (txt.length<3) return;
        const cs=getComputedStyle(el);
        if (cs.display==='none'||cs.visibility==='hidden'||+cs.opacity<0.05) return;
        const size=parseFloat(cs.fontSize), bold=+cs.fontWeight>=700;
        const large=size>=24||(size>=18.66&&bold);
        const bgs=bgsOf(el), fg=parse(cs.color); const a=lum(fg);
        let ratio=99, bg=bgs[0];
        for (const cand of bgs) { const c=lum(cand);
          const r=(Math.max(a,c)+0.05)/(Math.min(a,c)+0.05);
          if (r<ratio) { ratio=r; bg=cand; } }
        const key=el.tagName+cs.color+cs.fontSize+JSON.stringify(bg);
        if (seen.has(key)) return; seen.add(key);
        const need=large?3:4.5;
        // Worst-stop is deliberately conservative: it asks whether the text
        // would still pass at the brightest point of the gradient, which may be
        // nowhere near where the text actually sits. That is the right cheap
        // filter, but it is an approximation, and a standing false alarm is how
        // a check stops being read. Mark what it flags so a second pass can
        // measure the pixels genuinely painted behind it.
        let mark=null;
        if (ratio<need) { mark='c'+(flag++); el.setAttribute('data-ctr-flag', mark); }
        out.push({ tag:el.tagName.toLowerCase()+(typeof el.className==='string'&&el.className?'.'+el.className.split(' ')[0]:''),
                   size:size.toFixed(0), ratio:+ratio.toFixed(2), bg:JSON.stringify(bg), need, mark,
                   fg, sample:txt.slice(0,32) });
      });
      return out;
    });
    total += r.length;
    for (const x of r) {
      if (x.ratio >= x.need) { worst = Math.min(worst, x.ratio); continue; }
      // Pixel truth. Screenshot the element, then read it back through a canvas
      // inside the page — no image decoder needed — and take the most common
      // colour in the crop as the ground genuinely painted behind the glyphs.
      let real = null;
      if (x.mark) {
        try {
          const shot = await p.locator(`[data-ctr-flag="${x.mark}"]`).screenshot({ timeout: 8000 });
          real = await p.evaluate(async (dataUrl) => {
            const img = new Image(); img.src = dataUrl; await img.decode();
            const cv = document.createElement('canvas');
            cv.width = img.width; cv.height = img.height;
            cv.getContext('2d').drawImage(img, 0, 0);
            const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
            const hist = new Map();
            for (let i = 0; i < d.length; i += 4) {
              const k = `${d[i]},${d[i+1]},${d[i+2]}`;
              hist.set(k, (hist.get(k) || 0) + 1);
            }
            let best = null, n = -1;
            for (const [k, v] of hist) if (v > n) { n = v; best = k; }
            return best.split(',').map(Number);
          }, 'data:image/png;base64,' + shot.toString('base64'));
        } catch (e) { real = null; }
      }
      if (real) {
        const L = c => { const [r0,g0,b0]=c.map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);});
          return 0.2126*r0+0.7152*g0+0.0722*b0; };
        const a = L(x.fg), c = L(real);
        const trueRatio = +(((Math.max(a,c)+0.05)/(Math.min(a,c)+0.05))).toFixed(2);
        if (trueRatio >= x.need) { cleared.push({page:path, ...x, trueRatio, real}); worst = Math.min(worst, trueRatio); continue; }
        fails.push({page:path, ...x, trueRatio, real});
      } else {
        fails.push({page:path, ...x, trueRatio:null});
      }
    }
  }
  console.log(`pages measured          : ${PAGES.length}`);
  console.log(`distinct text styles    : ${total}`);
  console.log(`lowest PASSING ratio    : ${worst.toFixed(2)}:1`);
  console.log(`below the AA threshold  : ${fails.length}`);
  fails.slice(0,25).forEach(f => console.log(`   ${f.page} ${f.tag} ${f.size}px  ${f.ratio}:1 (needs ${f.need}) on bg ${f.bg}`
    + (f.trueRatio === null ? '  [could not screenshot — worst-stop figure]' : `  pixel-measured ${f.trueRatio}:1`)
    + `  "${f.sample}"`));
  if (cleared.length) {
    console.log(`\nflagged by the worst-stop approximation, cleared by pixel measurement (${cleared.length}):`);
    cleared.forEach(f => console.log(`   ${f.page} ${f.tag} ${f.size}px  approximated ${f.ratio}:1 against ${f.bg},`
      + ` actually painted on [${f.real}] -> ${f.trueRatio}:1  "${f.sample}"`));
  }
  await b.close();
})();
