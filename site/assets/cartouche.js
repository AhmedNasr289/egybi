/* cartouche.js — a name, spelled in Egyptian hieroglyphs (2026-10-09).

   WHAT THIS IS, STATED PLAINLY BECAUSE EVERY RIVAL TOOL BLURS IT.
   This is a PHONETIC TRANSLITERATION, not a translation. Ancient Egyptian had
   no letters for most vowels and spelled words with a mix of sound-signs and
   meaning-signs; nobody in antiquity would have written "Emma" or "Ahmed" this
   way. What it does is the modern convention Egyptology teaching uses for
   writing a foreign name: each sound is matched to one of the 24 "uniliteral"
   signs of Gardiner's sign list — the signs that stand for a single
   consonant — with the usual stand-ins for vowels (vulture for a, reed for
   e and i, quail chick for o and u). The page says this in words above the
   result, not in a footnote.

   Signs come from the Unicode Egyptian Hieroglyphs block and render with a
   self-hosted subset of Noto Sans Egyptian Hieroglyphs (SIL OFL 1.1, licence
   shipped beside the font) — no font service is called. */
(function () {
  'use strict';

  /* Each sign: the character, its Gardiner number, what it depicts, and the
     transliteration value Egyptologists give it. */
  var S = {
    A:  { ch: '\u{1313F}', g: 'G1',  pic: 'Egyptian vulture', val: 'ꜣ' },
    I:  { ch: '\u{131CB}', g: 'M17', pic: 'flowering reed',  val: 'i' },
    Y:  { ch: '\u{131CC}', g: 'M17A', pic: 'two reeds',      val: 'y' },
    W:  { ch: '\u{13171}', g: 'G43', pic: 'quail chick',     val: 'w' },
    B:  { ch: '\u{130C0}', g: 'D58', pic: 'foot',            val: 'b' },
    P:  { ch: '\u{132AA}', g: 'Q3',  pic: 'stool',           val: 'p' },
    F:  { ch: '\u{13191}', g: 'I9',  pic: 'horned viper',    val: 'f' },
    M:  { ch: '\u{13153}', g: 'G17', pic: 'owl',             val: 'm' },
    N:  { ch: '\u{13216}', g: 'N35', pic: 'ripple of water', val: 'n' },
    R:  { ch: '\u{1308B}', g: 'D21', pic: 'mouth',           val: 'r' },
    H:  { ch: '\u{13254}', g: 'O4',  pic: 'reed shelter',    val: 'h' },
    KH: { ch: '\u{1340D}', g: 'Aa1', pic: 'placenta (?)',    val: 'ḫ' },
    S:  { ch: '\u{132F4}', g: 'S29', pic: 'folded cloth',    val: 's' },
    Z:  { ch: '\u{13283}', g: 'O34', pic: 'door bolt',       val: 'z' },
    SH: { ch: '\u{13219}', g: 'N37', pic: 'pool',            val: 'š' },
    Q:  { ch: '\u{1320E}', g: 'N29', pic: 'hill slope',      val: 'q' },
    K:  { ch: '\u{133A1}', g: 'V31', pic: 'basket with handle', val: 'k' },
    G:  { ch: '\u{133BC}', g: 'W11', pic: 'jar stand',       val: 'g' },
    T:  { ch: '\u{133CF}', g: 'X1',  pic: 'bread loaf',      val: 't' },
    TJ: { ch: '\u{1337F}', g: 'V13', pic: 'tethering rope',  val: 'ṯ' },
    D:  { ch: '\u{130A7}', g: 'D46', pic: 'hand',            val: 'd' },
    DJ: { ch: '\u{13193}', g: 'I10', pic: 'cobra',           val: 'ḏ' }
  };

  /* Letters and letter-pairs to signs. Pairs are matched first, so "sh" is
     the pool and not cloth-then-shelter. Doubled letters collapse ("Anna" is
     one n), because the script did not write length that way either. */
  var PAIRS = { sh: ['SH'], ch: ['TJ'], tj: ['TJ'], kh: ['KH'], dj: ['DJ'],
                ph: ['F'], th: ['T'], ck: ['K'], qu: ['Q', 'W'], ee: ['Y'],
                oo: ['W'], ou: ['W'] };
  var SINGLE = { a: ['A'], b: ['B'], d: ['D'], e: ['I'], f: ['F'], g: ['G'],
                 h: ['H'], i: ['I'], j: ['DJ'], k: ['K'], l: ['R'], m: ['M'],
                 n: ['N'], o: ['W'], p: ['P'], q: ['Q'], r: ['R'], s: ['S'],
                 t: ['T'], u: ['W'], v: ['F'], w: ['W'], x: ['K', 'S'],
                 y: ['Y'], z: ['Z'] };

  /* Latin letters only, accents folded ("José" -> jose). Anything else —
     digits, Arabic script, punctuation — is reported back rather than
     silently dropped, so the reader knows what was not spelled. */
  function normalise(name) {
    return String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  function spell(name) {
    var s = normalise(name), out = [], skipped = [], i = 0, prev = null;
    while (i < s.length) {
      var c = s[i];
      if (c === ' ' || c === '-' || c === '\'') { i++; prev = null; continue; }
      if (!/[a-z]/.test(c)) { skipped.push(c); i++; continue; }
      if (c === prev) { i++; continue; }               // doubled letter
      var two = s.substr(i, 2), keys;
      if (PAIRS[two]) { keys = PAIRS[two]; i += 2; prev = two[1]; }
      else {
        // c is k before a, o, u and s before e, i, y — as English reads it.
        if (c === 'c') keys = /[eiy]/.test(s[i + 1] || '') ? ['S'] : ['K'];
        else keys = SINGLE[c];
        i++; prev = c;
      }
      keys.forEach(function (k) { out.push({ key: k, sign: S[k], from: two }); });
    }
    return { signs: out, skipped: skipped };
  }

  /* The cartouche as markup: the oval loop with the tie at its end, the way a
     royal name is enclosed on the monuments. The signs are a single text run
     so a screen reader is given the name and the transliteration instead. */
  function html(name, cls) {
    var r = spell(name);
    if (!r.signs.length) return '';
    var esc = (window.EGYBI && window.EGYBI.escapeHtml) || function (x) { return x; };
    var glyphs = r.signs.map(function (x) { return x.sign.ch; }).join('');
    var tr = r.signs.map(function (x) { return x.sign.val; }).join('');
    return '<span class="cartouche' + (cls ? ' ' + cls : '') + '" role="img" aria-label="' +
      esc(name) + ' in hieroglyphs, transliterated ' + esc(tr) + '">' +
      // Sized to fit: a long name shrinks rather than pushing the page
      // sideways on a phone. Each sign is close to 1em wide.
      '<span class="cartouche-signs" aria-hidden="true" style="font-size:min(var(--cartouche-max,2.6rem), calc((100vw - 130px) / ' +
      Math.max(r.signs.length, 1) + '))">' + glyphs + '</span>' +
      '<span class="cartouche-tie" aria-hidden="true"></span></span>';
  }

  window.EGYBI = window.EGYBI || {};
  window.EGYBI.cartouche = { spell: spell, html: html, signs: S };
}());
