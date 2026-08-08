/* WCAG contrast measured against the background actually painted behind each
   text node, walking up until an opaque ancestor is found. A token that passes
   against the palette can still fail on the surface it lands on. */
const { chromium } = require('/tmp/claude-0/-home-user-egybi/88e1f418-6292-5215-8c2f-e114945c6b86/scratchpad/node_modules/playwright-core');
const fs = require('fs');
const B = 'http://localhost:8793';
const PAGES = fs.readdirSync('site').filter(f => f.endsWith('.html'))
  .concat(['practice/your-first-select.html', 'papyrus/nineteen-million.html']);

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  await p.route('**/*', r => { const u = r.request().url();
    return (u.startsWith(B) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort(); });
  let total = 0, fails = [], worst = 99;
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
      const out=[], seen=new Set();
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
        out.push({ tag:el.tagName.toLowerCase()+(typeof el.className==='string'&&el.className?'.'+el.className.split(' ')[0]:''),
                   size:size.toFixed(0), ratio:+ratio.toFixed(2), bg:JSON.stringify(bg), need:large?3:4.5, sample:txt.slice(0,32) });
      });
      return out;
    });
    total += r.length;
    for (const x of r) { if (x.ratio < x.need) fails.push({page:path, ...x});
                         if (x.ratio >= x.need) worst = Math.min(worst, x.ratio); }
  }
  console.log(`pages measured          : ${PAGES.length}`);
  console.log(`distinct text styles    : ${total}`);
  console.log(`lowest PASSING ratio    : ${worst.toFixed(2)}:1`);
  console.log(`below the AA threshold  : ${fails.length}`);
  fails.slice(0,25).forEach(f => console.log(`   ${f.page} ${f.tag} ${f.size}px  ${f.ratio}:1 (needs ${f.need}) on bg ${f.bg}  "${f.sample}"`));
  await b.close();
})();
