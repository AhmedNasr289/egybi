/* EgyBI — the hieroglyph layer.
   ---------------------------------------------------------------------------
   A small, fixed vocabulary of REAL Egyptian signs, each used for a reason
   rather than as decoration. Every glyph a visitor can see is explainable:
   hovering or focusing any [data-glyph] reveals its name, meaning and
   transliteration, and about.html carries the full legend.

   Font note: the Egyptian Hieroglyphs block (U+13000) is absent from the system
   fonts on iOS, Android and macOS, so these would render as empty boxes for most
   visitors. We load a SUBSET of Noto Sans Egyptian Hieroglyphs containing only
   the signs below — about 12 KB — which makes them render everywhere.

   The ankh used to be U+2625, which lives in Miscellaneous Symbols and is the
   generic modern ankh rather than a hieroglyph; because no font reliably carries
   it, it had to be hand-drawn as SVG. The true hieroglyphic ankh is U+132F9
   (Gardiner S34), in the same block as every other sign here, and Noto does
   carry it — so it is now a real sign like the rest, and the bespoke SVG branch
   is gone. The logo and favicon stay SVG, since a favicon cannot rely on a
   webfont, but they are drawn from the S34 form rather than invented.

   Sources for names/meanings: Gardiner's sign list categories and the Unicode
   Egyptian Hieroglyphs chart. Where a sign's meaning is debated we say so. */
(function () {
  var GLYPHS = {
    ankh:   { c: '\u{132F9}',   name: 'Ankh',            gardiner: 'S34', tr: 'ʿnḫ',   meaning: 'Life. Held to the nose of a king to grant the breath of life.' },
    scribe: { c: '\u{13000}',   name: 'Seated man',      gardiner: 'A1',  tr: 'j',     meaning: 'A seated person — the sign used for a scribe, a man, or the pronoun “I”.' },
    eye:    { c: '\u{13080}',   name: 'Eye of Horus',    gardiner: 'D10', tr: 'wḏꜣt',  meaning: 'The wedjat — protection and restored wholeness. Horus’s eye, healed after being torn out.' },
    maat:   { c: '\u{13184}',   name: 'Feather of Maat', gardiner: 'H6',  tr: 'mꜣʿt',  meaning: 'Truth, order and balance. The heart was weighed against this feather.' },
    scarab: { c: '\u{131A3}',   name: 'Scarab',          gardiner: 'L1',  tr: 'ḫpr',   meaning: 'To become, to come into being. The beetle rolling the sun into each new morning.' },
    reed:   { c: '\u{131CB}',   name: 'Reed',            gardiner: 'M17', tr: 'j',     meaning: 'A single reed — the alphabetic sign j, and the plant writing itself was made from.' },
    ra:     { c: '\u{131F3}',   name: 'Sun disc',        gardiner: 'N5',  tr: 'rʿ',    meaning: 'The sun, and the god Ra. Also simply “day”.' },
    was:    { c: '\u{13300}',   name: 'Was sceptre',     gardiner: 'S40', tr: 'wꜣs',   meaning: 'Power and dominion. Carried by gods and kings.' },
    scroll: { c: '\u{133DB}',   name: 'Papyrus scroll',  gardiner: 'Y1',  tr: 'mḏꜣt',  meaning: 'A sealed papyrus roll — writing, records, and knowledge itself.' }
  };
  window.EGYBI_GLYPHS = GLYPHS;

  // The subset font is loaded by a static <link> in each page head — a
  // dynamically injected stylesheet did not reliably register its @font-face.

  // Fill any <span data-glyph="eye"> with the sign plus an accessible explanation.
  function paint(root) {
    (root || document).querySelectorAll('[data-glyph]').forEach(function (el) {
      var g = GLYPHS[el.getAttribute('data-glyph')];
      if (!g || el.dataset.painted) return;
      el.dataset.painted = '1';
      el.classList.add('glyph');
      el.textContent = g.c;
      var label = g.name + ' (' + g.tr + ') — ' + g.meaning;
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', label);
      el.setAttribute('tabindex', '0');          // reachable by keyboard, not just hover
      el.setAttribute('data-tip', g.name + ' · ' + g.tr + ' — ' + g.meaning);
    });
  }

  // Signs reveal as though being carved — once, when scrolled to. Skipped
  // entirely under prefers-reduced-motion (not merely shortened).
  (function carve() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;
    function watch() {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add('carved');
          io.unobserve(en.target);
        });
      }, { rootMargin: '0px 0px -8% 0px' });
      document.querySelectorAll('.glyph-rule .glyph, .glyph-card .gl-sign').forEach(function (el) {
        el.classList.add('glyph-carve'); io.observe(el);
      });
    }
    if (document.readyState !== 'loading') watch();
    else document.addEventListener('DOMContentLoaded', watch);
  })();

  window.EGYBI_PAINT_GLYPHS = paint;

  // Several pages build their content after load — the challenge list, the blog
  // cards, the price tables. A sign inside one of those templates would stay an
  // empty span forever, because nothing called paint() a second time. Watching
  // for new [data-glyph] nodes fixes that once for every renderer, present and
  // future, instead of asking each one to remember. paint() skips anything
  // already carrying data-painted, so repeating it is cheap and idempotent.
  function watchForNewGlyphs() {
    if (!('MutationObserver' in window)) return;
    var queued = false;
    new MutationObserver(function (records) {
      if (queued) return;
      var worth = records.some(function (r) {
        return [].some.call(r.addedNodes, function (n) {
          return n.nodeType === 1 &&
                 (n.hasAttribute('data-glyph') || n.querySelector('[data-glyph]'));
        });
      });
      if (!worth) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; paint(); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  function start() { paint(); watchForNewGlyphs(); }

  if (document.readyState !== 'loading') start();
  else document.addEventListener('DOMContentLoaded', start);
})();
