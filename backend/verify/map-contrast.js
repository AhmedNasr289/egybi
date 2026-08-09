/* Can you tell where the country is?

   On 2026-08-09 every map on this site drew Egypt's boundary in white on a
   cream background: #FFFFFF against --papyrus #F6EEDC, which measures 1.15:1.
   The base land fill scored 1.06-1.12:1 against the same ground. So the
   coastline was not a faint line, it was no line, and the country read as a
   pale slab with cluster numbers floating on it. Reported as "I can't see the
   maps well", and correct.

   Twenty-five mutation-tested checkers ran green through all of it. That is
   the point of this file. contrast.js walks TEXT nodes; an SVG stroke is not
   text, so nothing here ever looked at the one colour pair that decides
   whether a tile-free map is a map at all. A tile-free site has no basemap
   underneath to carry the shape — the geometry we draw is the entire picture,
   and if its ink does not separate from its ground there is nothing on screen.

   THE RULE, deliberately narrow. Every page that draws Egypt must paint a
   COUNTRY-WIDE stroke that clears 3:1 against the map container's own
   background. Not every stroke: a hairline between two filled governorates is
   legitimately light, because the fills either side already differ. One
   boundary has no fill on the far side of it — the coast — and that one has to
   carry itself. 3:1 is what WCAG 1.4.11 asks of a non-text boundary.

   "Country-wide" is doing real work in that sentence. The first version asked
   only for SOME stroke over 3:1, and Streets passed it on the 1.5px gold ring
   around one selected district while its coastline sat at 1.15:1 — a rule
   satisfied by an accent that says nothing about whether the country has an
   edge. A boundary drawn on a handful of paths is a highlight; the outline of
   Egypt is drawn on all 27 governorates. So only strokes covering at least
   MIN_PATHS of them are eligible to satisfy this, and the accents are printed
   underneath as context rather than counted as evidence.

   OPACITY IS MEASURED, NOT ASSUMED. The coastline is drawn as a halo under the
   fills at stroke-opacity 0.62, so its raw colour is not what a reader sees.
   Compositing it over the container background first is the difference between
   testing the CSS and testing the picture; skip that and this file would pass
   a stroke that is invisible in practice. */
const { chromium, executablePath, BASE } = require('./env');
const B = BASE;

// Every page with a map, and the container to measure inside. Kept explicit
// rather than discovered, so a new map page that forgets to appear here is a
// visible omission in a diff rather than a silent gap in coverage.
// index.html is deliberately absent: the animated flag there is an inline SVG,
// not a Leaflet map. Listing it produced a "container not found" failure that
// was a defect in this file rather than in the site.
const MAPS = [
  ['explore.html',    '#egyptMap'],
  ['geospatial.html', '#atlasMap'],
  ['places.html',     '#placesMap'],
  ['invest.html',     '#investMap'],
  ['streets.html',    '#streetsMap'],
  ['visit.html',      '#visitMap'],
  ['visit.html',      '#reliefMap'],
  ['stories.html',    '#mapRibbon'],
];
// ONLY lets the mutation harness drive one page instead of eight. Same code
// path and same assertion — a case that exercised a copy of this logic would
// prove nothing about the tool that actually runs.
const PICK = process.env.ONLY ? process.env.ONLY.split(',') : null;
const TARGETS = PICK ? MAPS.filter(m => PICK.includes(m[0])) : MAPS;

const NEED = 3.0;
const MIN_PATHS = 15;   // a country-wide boundary, not a per-feature accent

(async () => {
  const b = await chromium.launch({ executablePath });
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  await p.route('**/*', r => { const u = r.request().url();
    return (u.startsWith(B) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort(); });

  const rows = [];
  for (const [page, sel] of TARGETS) {
    await p.goto(`${B}/${page}`, { waitUntil: 'domcontentloaded' });
    // Leaflet builds paths only once the map has a view, and several of these
    // fit their bounds on a timer after that. Measuring early reports a map
    // with no geometry in it, which would read here as a pass.
    await p.waitForTimeout(3200);
    const r = await p.evaluate(({ sel }) => {
      const box = document.querySelector(sel);
      if (!box) return { missing: true };
      box.scrollIntoView({ block: 'center' });
      const parse = s => (s.match(/[\d.]+/g) || []).map(Number);
      const lum = c => { const [r, g, b] = c.slice(0, 3).map(v => { v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const cr = (x, y) => { const a = lum(x), z = lum(y);
        return (Math.max(a, z) + 0.05) / (Math.min(a, z) + 0.05); };
      // What is painted behind the geometry. The container itself may be
      // transparent, in which case the ground is whatever ancestor paints one.
      let bg = null;
      for (let n = box; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        const v = parse(c);
        if (v.length >= 3 && (v[3] === undefined || v[3] > 0.9)) { bg = v.slice(0, 3); break; }
      }
      if (!bg) bg = [255, 255, 255];

      const paths = [...box.querySelectorAll('path')];
      const seen = new Map();
      for (const el of paths) {
        const cs = getComputedStyle(el);
        const stroke = parse(cs.stroke);
        if (stroke.length < 3) continue;                    // stroke:none
        const w = parseFloat(cs.strokeWidth) || 0;
        if (w <= 0) continue;
        // Composite over the ground, because a half-transparent stroke is not the
        // colour the stylesheet names.
        const a = cs.strokeOpacity === '' ? 1 : parseFloat(cs.strokeOpacity);
        const op = isNaN(a) ? 1 : a;
        const eff = stroke.slice(0, 3).map((v, i) => Math.round(v * op + bg[i] * (1 - op)));
        const key = eff.join(',') + '|' + w.toFixed(2);
        if (!seen.has(key)) seen.set(key, { eff, w, ratio: +cr(eff, bg).toFixed(2), n: 0 });
        seen.get(key).n += 1;
      }
      const hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
      return {
        bg: hex(bg), paths: paths.length,
        strokes: [...seen.values()].sort((x, y) => y.ratio - x.ratio)
          .map(s => ({ colour: hex(s.eff), width: s.w, ratio: s.ratio, count: s.n })),
      };
    }, { sel });
    rows.push({ page, sel, ...r });
  }

  console.log('page / container            background   paths   best stroke              ratio');
  console.log('-'.repeat(96));
  let bad = 0;
  for (const r of rows) {
    const id = `${r.page} ${r.sel}`.padEnd(28);
    if (r.missing) { console.log(`${id} -- container not found --`); bad++; continue; }
    const eligible = r.strokes.filter(s => s.count >= MIN_PATHS);
    const best = eligible[0];
    if (!best) {
      console.log(`${id} ${r.bg}     ${String(r.paths).padStart(4)}   `
        + `-- no boundary drawn on ${MIN_PATHS}+ paths --   <-- NO COUNTRY OUTLINE`);
      bad++; continue;
    }
    const fail = best.ratio < NEED;
    if (fail) bad++;
    console.log(`${id} ${r.bg}     ${String(r.paths).padStart(4)}   `
      + `${best.colour} at ${String(best.width).padStart(4)}px  ${String(best.ratio).padStart(6)}:1`
      + `  (${best.count} paths)`
      + (fail ? `   <-- NO VISIBLE BOUNDARY (needs ${NEED}:1)` : ''));
    // The runners-up are printed because they are the interesting part when
    // this fails: they show what the map IS drawing instead.
    for (const s of r.strokes.filter(x => x !== best).slice(0, 3)) {
      console.log(`${' '.repeat(28)} ${' '.repeat(12)}       ${s.colour} at ${String(s.width).padStart(4)}px  ${String(s.ratio).padStart(6)}:1  (${s.count} paths)`);
    }
  }
  console.log(`\nmaps whose geometry does not separate from its own background: ${bad}`);
  await b.close();
  process.exit(bad ? 1 : 0);
})();
