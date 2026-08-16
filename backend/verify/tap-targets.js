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
  // Same argument as invest.html, arrived at from the other direction. The
  // gazetteer draws 873 places and they cluster: at country zoom a marker's
  // centre lands on a neighbouring marker's icon, which is a neighbouring
  // target and not this one. #placeList is every one of them as a full-size
  // searchable row, which is the route that already worked.
  'places.html': '#placeList',
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

// With animation disabled the scroll commits synchronously; this is margin for
// sticky elements re-pinning, not for a transition to finish.
const SETTLE = 60;

(async () => {
  const b = await chromium.launch({ executablePath });
  const rows = [];
  for (const page of TARGETS) {
    /* REDUCED MOTION, and it is the fix rather than a preference.

       Scrolling was never the problem. Measured on explore.html, scrollY is
       identical (34940) and the button's top identical (403) at every wait from
       0ms to 1200ms — the scroll commits instantly. What changes is what
       elementFromPoint finds at that unmoving point:

           0ms    P.                 covered=true
           80ms   P.                 covered=true
           300ms  DIV.card           covered=true
           700ms  BUTTON.query-btn   covered=false
           1200ms BUTTON.query-btn   covered=false

       Arriving in a new region fires AOS's reveals, and for the ~700ms they
       animate the topmost element at a fixed point is an ancestor rather than
       the control. So the checker was hit-testing a page mid-transition and
       reporting the reveal's own wrapper as a coverer — which is how
       explore.html's two "Query this yourself" buttons were called COVERED by a
       <p> and kept CI red from 2026-08-13.

       Waiting 700ms per control would cost roughly two extra minutes on
       prices.html alone. Removing the animation is both faster and
       deterministic, and the site already has the mechanism: under
       prefers-reduced-motion egybi.css switches to `scroll-behavior: auto` and
       AOS stops animating, which reduced.js independently confirms leaves the
       content identical — same links, same buttons, same chips, text delta 0.
       A tap target's size and stacking do not depend on motion, so this
       measures the same thing on a page that has stopped moving. */
    const p = await b.newPage({ viewport: { width: 390, height: 844 },
                                reducedMotion: 'reduce' });
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

    /* SCROLL, SETTLE, THEN MEASURE — and the settle has to happen in Node.

       The previous fix here was right about the cause and wrong about the cure.
       egybi.css sets `html { scroll-behavior: smooth }`, so scrollIntoView
       animates while the next line reads the rectangle; passing
       behavior: 'instant' was supposed to override that for this one call.
       Measured, it does not: with the whole loop inside a single evaluate,
       explore.html still reports its two "Query this yourself" buttons as
       COVERED by a <p>, at 390px and at 1280px alike. Scroll the same button,
       wait 1200ms, and elementFromPoint returns BUTTON.query-btn — the button
       itself. So the page was never at fault and the checker has been failing
       CI since 2026-08-13 over a defect that is not there.

       A checker that reports a reachable control as unreachable is worse than
       no checker: it trains everyone to ignore a red build, and this one had
       already been red often enough that the habit was forming.

       The measurement therefore moves out of one big evaluate into three steps
       per element — scroll, settle, read — because only Node can wait. The
       settle is a real timeout rather than a rAF or a promise inside evaluate:
       a setTimeout returned from page.evaluate is a promise Playwright can
       garbage-collect, which this project has already hit once. */
    const hasEquivalent = await p.evaluate(
      sel => (sel ? !!document.querySelector(sel) : false),
      EQUIVALENT[page] || null);

    // Tag every candidate once, so the per-element steps can find them again
    // without re-running the filter and risking a different set each pass.
    const ids = await p.evaluate(() => {
      const out = [];
      const els = [...document.querySelectorAll(
        'button, select, input[type=checkbox], input[type=radio], [role="button"]')];
      els.forEach((e, i) => {
        if (e.disabled) return;
        const s = getComputedStyle(e);
        if (s.display === 'none' || s.visibility === 'hidden') return;
        // Inside a container the page has deliberately hidden — a completion
        // state, a closed panel — is not on screen, so it is not a target yet.
        if (e.closest('[hidden]')) return;
        e.setAttribute('data-tt', String(i));
        out.push(String(i));
      });
      return out;
    });

    const r = { zero: [], covered: [], small: [], exempt: [], padded: [],
                coveredExempt: [], hasEquivalent,
                wanted: !!(EQUIVALENT[page]) };

    for (const id of ids) {
      await p.evaluate((i) => {
        const e = document.querySelector('[data-tt="' + i + '"]');
        if (e) e.scrollIntoView({ block: 'center', behavior: 'instant' });
      }, id);
      await p.waitForTimeout(SETTLE);
      const one = await p.evaluate(({ i, MIN, hitHelpers, hasEquivalent }) => {
        const e = document.querySelector('[data-tt="' + i + '"]');
        if (!e) return null;
        const out = [];
        const label = (e.getAttribute('aria-label') || e.textContent || '')
          .trim().slice(0, 34) || `<${e.tagName.toLowerCase()}>`;
        const b2 = e.getBoundingClientRect();
        if (b2.width < 1 || b2.height < 1) return [['zero', label]];

        const top = document.elementFromPoint(b2.left + b2.width / 2,
                                              b2.top + b2.height / 2);
        if (top && top !== e && !e.contains(top) && !top.contains(e)) {
          const entry = `${label} <- ${top.tagName}.${(top.getAttribute('class') || '').split(' ')[0]}`;
          // Coverage BY ANOTHER MAP FEATURE is the same problem the UNDER-24px
          // rule already forgives, reached from the other direction. Egypt's
          // governorates are concave — the centre of Qena's bounding box is
          // inside Qalyubia — and at country zoom a pin's centre lands on the
          // pin beside it. Neither is fixable by enlarging the target, because
          // these are the real shapes and positions of the country. So the
          // exemption is the same and so is its price: it applies ONLY where an
          // equivalent full-size control exists. Ask WHERE the coverer lives,
          // not what it is called — a bare <i> inside a marker icon carries no
          // leaflet class of its own, but closest() places it in the map pane.
          const isMapFeature = !!top.closest('.leaflet-pane')
                               || top.namespaceURI === 'http://www.w3.org/2000/svg';
          out.push([isMapFeature && hasEquivalent ? 'coveredExempt' : 'covered', entry]);
        }
        if (b2.width < MIN || b2.height < MIN) {
          const isGeometry = e.namespaceURI === 'http://www.w3.org/2000/svg';
          const entry = `${label} ${Math.round(b2.width)}x${Math.round(b2.height)}`;
          // Does a MIN-sized square centred on this control land on the control
          // or on something that activates it? Four cardinal points at the edge
          // of that square: enough to catch a target narrow in one axis, which
          // is the common case.
          const cx = b2.left + b2.width / 2, cy = b2.top + b2.height / 2;
          const d = MIN / 2 - 1;
          const reaches = [[d, 0], [-d, 0], [0, d], [0, -d]].every(([dx, dy]) => {
            const at = document.elementFromPoint(cx + dx, cy + dy);
            if (!at) return false;
            if (at === e || e.contains(at) || at.contains(e)) return true;
            return hitHelpers.some(c => at.classList && at.classList.contains(c));
          });
          out.push([reaches ? 'padded' : (isGeometry && hasEquivalent ? 'exempt' : 'small'), entry]);
        }
        return out;
      }, { i: id, MIN, hitHelpers: HIT_HELPERS, hasEquivalent });
      if (one) for (const [kind, entry] of one) r[kind].push(entry);
    }

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
      if (r.coveredExempt.length) notes.push(`${r.coveredExempt.length} map feature(s) overlapped by another, reachable via ${EQUIVALENT[r.page]}`);
      if (r.padded.length) notes.push(`${r.padded.length} small control(s) with a ${MIN}px+ hit area behind them`);
      if (notes.length) console.log(`${r.page.padEnd(17)} ok — ${notes.join('; ')}`);
    }
  }
  console.log(`\npages with a target a reader cannot reliably hit: ${bad}`);
  await b.close();
  process.exit(bad ? 1 : 0);
})();
