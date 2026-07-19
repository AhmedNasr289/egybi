/* EgyBI — the hieroglyph layer.
   ---------------------------------------------------------------------------
   A small, fixed vocabulary of REAL Egyptian signs, each used for a reason
   rather than as decoration. Every glyph a visitor can see is explainable:
   hovering or focusing any [data-glyph] reveals its name, meaning and
   transliteration, and about.html carries the full legend.

   Font note: the Egyptian Hieroglyphs block (U+13000) is absent from the system
   fonts on iOS, Android and macOS, so these would render as empty boxes for most
   visitors. We load a SUBSET of Noto Sans Egyptian Hieroglyphs containing only
   the signs below — about 12 KB — which makes them render everywhere. The ankh
   (U+2625) sits in Miscellaneous Symbols and is widely supported, but we include
   it in the subset too so the whole set shares one shape language.

   Sources for names/meanings: Gardiner's sign list categories and the Unicode
   Egyptian Hieroglyphs chart. Where a sign's meaning is debated we say so. */
(function () {
  var GLYPHS = {
    ankh:   { c: '☥', svg: true, name: 'Ankh',      gardiner: 'S34', tr: 'ʿnḫ',   meaning: 'Life. Held to the nose of a king to grant the breath of life.' },
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
      if (g.svg) {
        // Drawn, not typed — no font on earth is guaranteed to carry this one.
        el.innerHTML = '<svg viewBox="0 0 100 100" class="glyph-svg" aria-hidden="true">' +
          '<path d="M50 55 C40 55 30 45 28 32 C26 15 38 6 50 6 C62 6 74 15 72 32 C70 45 60 55 50 55 Z" fill="none" stroke="currentColor" stroke-width="11" stroke-linejoin="round"/>' +
          '<rect x="44.5" y="53" width="11" height="41" rx="5.5" fill="currentColor"/>' +
          '<rect x="16" y="59" width="68" height="11" rx="5.5" fill="currentColor"/></svg>';
      } else {
        el.textContent = g.c;
      }
      var label = g.name + ' (' + g.tr + ') — ' + g.meaning;
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', label);
      el.setAttribute('tabindex', '0');          // reachable by keyboard, not just hover
      el.setAttribute('data-tip', g.name + ' · ' + g.tr + ' — ' + g.meaning);
    });
  }
  window.EGYBI_PAINT_GLYPHS = paint;

  if (document.readyState !== 'loading') paint();
  else document.addEventListener('DOMContentLoaded', function () { paint(); });
})();
