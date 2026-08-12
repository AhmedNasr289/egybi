/* Can a thumb hit it?

   Everything else in this directory asks whether a control WORKS. This asks
   whether a reader can reach it, which is a different question and the one the
   site kept failing. On 2026-08-10 the gazetteer drew its pins at 8x8 — a
   third of the 24x24 WCAG 2.5.8 asks of a touch target — so Places showed
   thirteen locations on its opening phone view that could be seen and not
   opened. Nothing here noticed, because a small button is not an error: it
   renders, it responds to a synthetic click, it throws nothing. It is simply
   too small for a finger, and only a measurement finds that.

   THREE RULES, in descending order of how bad the failure is.

   ZERO SIZE. A control with no width or height cannot be activated by anybody,
   by any means. Always a defect.

   COVERED. A control whose own centre point belongs to some other element is
   intercepted: the reader aims at it and hits whatever is on top. Descendants
   do not count — a <span> inside a button is the button.

   UNDER 24px, unless an equivalent full-size control does the same job on the
   same page. That exception is WCAG's, not an excuse invented here, and it is
   the honest resolution for map geometry: fourteen of Egypt's twenty-seven
   governorates render under 24px wide at 390px — Gharbia is 11x14 — and they
   cannot be enlarged, because they are the real shapes of the country. The
   answer is a second route to the same thing, so Explore and the Atlas each
   carry a governorate picker. This file REQUIRES that picker to exist before
   it will forgive the paths, which is what stops the exception becoming a
   licence to leave any small target alone.

   Measured at 390px. A target that clears 24px on a phone clears it
   everywhere, and the phone is where the reader complained. */
const { chromium, executablePath, BASE } = require('./env');
const B = BASE;
const MIN = 24;

const PAGES = ['index.html', 'explore.html', 'geospatial.html', 'places.html',
               'invest.html', 'streets.html', 'visit.html', 'stories.html',
               'case.html', 'prices.html', 'stocks.html', 'blog.html',
               'about.html', 'community.html', 'privacy.html', 'tracks.html',
               'practice.html', '404.html'];
const PICK = process.env.ONLY ? process.env.ONLY.split(',') : null;
const TARGETS = PICK ? PAGES.filter(p => PICK.includes(p)) : PAGES;

// A page that draws map geometry as buttons, and the selector for the
// full-size control that must reach the same features. Named per page rather
// than sniffed, so removing a picker breaks this list visibly.
const EQUIVALENT = {
  'explore.html': '#egyptMapPick',
  'geospatial.html': '#govPick',
  // Every located project is also a row in #ivTable, at full size, carrying
  // the same published figures, status and source the marker opens. The pins
  // each have a 30px hit circle beneath them, but around Ain Sokhna four
  // separate locations sit close enough that a finger aimed at one can land on
  // its neighbour — and a neighbouring target is not this target. Rather than
  // pretend otherwise, the table is named as the equivalent route, which is
  // what it already was.
  'invest.html': '#ivTable',
};

/* Classes that ARE a control's tap target without being the control.

   The investor pins are 12-18px and cannot grow — at country zoom the four
   around Ain Sokhna already nearly touch, and tap-sized pins would merge into
   one blob. So each carries an invisible 30px circle underneath it with the
   same click and the same tooltip, and the honest question stops being "how
   big is the pin" and becomes "how far from its centre can a finger land and
   still open the project".

   Measuring the visible element alone answers the first question and reports a
   failure that is not real; measuring the painted area answers the second.
   Anything listed here must genuinely activate the control it sits under —
   this is a statement about behaviour, and the mutation case for this file
   removes the hit circles to prove the check is not just trusting the name. */
const HIT_HELPERS = ['iv-hit'];

(async () => {
  const b = await chromium.launch({ executablePath });
  const rows = [];
  for (const page of TARGETS) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.route('**/*', r => { const u = r.request().url();
      return (u.startsWith(B) || u.startsWith('data:') || u.startsWith('blob:'))
        ? r.continue() : r.abort(); });
    await p.goto(`${B}/${page}`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3500);
    // Let every scroll reveal fire, so nothing is measured mid-animation at
    // whatever size a transition happens to have reached.
    await p.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90));
      }
      window.scrollTo(0, 0);
    });
    await p.waitForTimeout(900);

    const r = await p.evaluate(({ MIN, equivalentSel, hitHelpers }) => {
      const hasEquivalent = equivalentSel
        ? !!document.querySelector(equivalentSel) : false;
      const zero = [], covered = [], small = [], exempt = [], padded = [];
      const els = [...document.querySelectorAll(
        'button, select, input[type=checkbox], input[type=radio], [role="button"]')];
      for (const e of els) {
        if (e.disabled) continue;
        const s = getComputedStyle(e);
        if (s.display === 'none' || s.visibility === 'hidden') continue;
        // Inside a container the page has deliberately hidden — a completion
        // state, a closed panel — is not on screen, so it is not a target yet.
        if (e.closest('[hidden]')) continue;

        const label = (e.getAttribute('aria-label') || e.textContent || '')
          .trim().slice(0, 34) || `<${e.tagName.toLowerCase()}>`;
        const box = e.getBoundingClientRect();
        if (box.width < 1 || box.height < 1) { zero.push(label); continue; }

        // behavior: 'instant' is load-bearing, not tidiness. egybi.css sets
        // `html { scroll-behavior: smooth }`, so this call ANIMATES over a few
        // hundred milliseconds while the very next line reads the rectangle —
        // at the pre-scroll position. elementFromPoint then samples stale
        // coordinates, and what sits at those coordinates is very often
        // `.site-header`, which is position: sticky at z-index 1100 and
        // therefore on top of everything near the viewport top.
        //
        // That is the whole of the "tap-targets.js fails for unknown reasons"
        // history: explore.html reported COVERED(18) with the coverer named as
        // DIV.bar — which is not a chart bar, it is `.site-header .bar` — and
        // the page was never at fault. It is intermittent because the scroll
        // animation races the measurement loop, and it shows up on the page
        // with the most controls because that page rolls the dice most often.
        //
        // The corroboration is that reduced.js has never seen it: under
        // prefers-reduced-motion the stylesheet switches to
        // `scroll-behavior: auto`, which makes this same call instant.
        //
        // 'instant' overrides the CSS for this one call, which restores what
        // line 116 always meant to do — measure the element where it ends up.
        e.scrollIntoView({ block: 'center', behavior: 'instant' });
        const b2 = e.getBoundingClientRect();
        const top = document.elementFromPoint(b2.left + b2.width / 2,
                                              b2.top + b2.height / 2);
        if (top && top !== e && !e.contains(top) && !top.contains(e)) {
          covered.push(`${label} <- ${top.tagName}.${(top.getAttribute('class') || '').split(' ')[0]}`);
        }
        if (b2.width < MIN || b2.height < MIN) {
          const isGeometry = e.namespaceURI === 'http://www.w3.org/2000/svg';
          const entry = `${label} ${Math.round(b2.width)}x${Math.round(b2.height)}`;
          // Does a MIN-sized square centred on this control land on the
          // control or on something that activates it? Four cardinal points at
          // the edge of that square: enough to catch a target that is narrow in
          // one axis, which is the common case.
          const cx = b2.left + b2.width / 2, cy = b2.top + b2.height / 2;
          const d = MIN / 2 - 1;
          const reaches = [[d, 0], [-d, 0], [0, d], [0, -d]].every(([dx, dy]) => {
            const at = document.elementFromPoint(cx + dx, cy + dy);
            if (!at) return false;
            if (at === e || e.contains(at) || at.contains(e)) return true;
            return hitHelpers.some(c => at.classList && at.classList.contains(c));
          });
          if (reaches) padded.push(entry);
          else if (isGeometry && hasEquivalent) exempt.push(entry);
          else small.push(entry);
        }
      }
      return { zero, covered, small, exempt, padded, hasEquivalent,
               wanted: !!equivalentSel };
    }, { MIN, equivalentSel: EQUIVALENT[page] || null, hitHelpers: HIT_HELPERS });

    rows.push({ page, ...r });
    await p.close();
  }

  console.log(`=== tap targets at 390px (minimum ${MIN}x${MIN}) ===`);
  let bad = 0;
  for (const r of rows) {
    const bits = [];
    if (r.zero.length) bits.push(`ZERO-SIZE(${r.zero.length}): ${r.zero.slice(0, 4).join(', ')}`);
    if (r.covered.length) bits.push(`COVERED(${r.covered.length}): ${r.covered.slice(0, 3).join(' ; ')}`);
    if (r.small.length) bits.push(`UNDER-${MIN}px(${r.small.length}): ${r.small.slice(0, 4).join(', ')}`);
    // A page that needs an equivalent and has lost it fails, even if every
    // small target it excuses is otherwise unchanged. Losing the picker is how
    // the exception would quietly stop being earned.
    if (r.wanted && !r.hasEquivalent) bits.push('EQUIVALENT CONTROL MISSING');
    if (bits.length) { bad++; console.log(`${r.page.padEnd(17)} ${bits.join('  |  ')}`); }
    else {
      const notes = [];
      if (r.exempt.length) notes.push(`${r.exempt.length} map shape(s) under ${MIN}px, reachable via ${EQUIVALENT[r.page]}`);
      if (r.padded.length) notes.push(`${r.padded.length} small control(s) with a ${MIN}px+ hit area behind them`);
      if (notes.length) console.log(`${r.page.padEnd(17)} ok — ${notes.join('; ')}`);
    }
  }
  console.log(`\npages with a target a reader cannot reliably hit: ${bad}`);
  await b.close();
  process.exit(bad ? 1 : 0);
})();
