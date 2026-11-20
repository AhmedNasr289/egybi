/* hieroglyphs.js — the name studio. Spelling is in cartouche.js; this file is
   the page: the live preview, the sign-by-sign table, saving to the dossier,
   and a PNG drawn on a canvas in the browser (nothing is uploaded). */
(function () {
  'use strict';
  var C = window.EGYBI && window.EGYBI.cartouche, T = window.EGYBI && window.EGYBI.trip;
  if (!C) return;
  var esc = (window.EGYBI && window.EGYBI.escapeHtml) || function (s) { return s; };
  // The page's own words go through t(), so the /ar/ and /ru/ studios read in
  // their language (until 2026-11-20 they were English on every page).
  var t = (window.EGYBI && window.EGYBI.t) || function (s) { return s; };
  function $(id) { return document.getElementById(id); }

  function render() {
    var name = $('glyphName').value.trim().slice(0, 30);
    var out = $('glyphOut'), tbl = $('glyphTable'), note = $('glyphNote');
    var r = C.spell(name);
    if (!r.signs.length) {
      out.innerHTML = '<p class="chart-cap">' + esc(t('Type a name in Latin letters to see it spelled.')) + '</p>';
      tbl.innerHTML = ''; note.textContent = ''; $('glyphSave').disabled = true; $('glyphPng').disabled = true; $('glyphCopy').disabled = true;
      return;
    }
    out.innerHTML = C.html(name, 'cartouche-lg');
    tbl.innerHTML = '<thead><tr><th scope="col">' + esc(t('Sign')) + '</th><th scope="col">' + esc(t('Sound')) + '</th><th scope="col">' + esc(t('Gardiner')) + '</th><th scope="col">' + esc(t('What it pictures')) + '</th></tr></thead><tbody>' +
      r.signs.map(function (x) {
        return '<tr><td class="g" aria-hidden="true">' + x.sign.ch + '</td><td>' + esc(x.sign.val) + '</td><td>' + esc(x.sign.g) + '</td><td>' + esc(x.sign.pic) + '</td></tr>';
      }).join('') + '</tbody>';
    var uniq = r.skipped.filter(function (c, i, a) { return a.indexOf(c) === i && c.trim(); });
    note.textContent = uniq.length ? t('Not spelled (no Latin letter): %s').replace('%s', uniq.join(' ')) : '';
    $('glyphSave').disabled = !T; $('glyphPng').disabled = false; $('glyphCopy').disabled = false;
  }

  function savePng() {
    var name = $('glyphName').value.trim().slice(0, 30), r = C.spell(name);
    if (!r.signs.length) return;
    var text = r.signs.map(function (x) { return x.sign.ch; }).join('');
    var draw = function () {
      var cv = document.createElement('canvas'), ctx = cv.getContext('2d');
      var size = 96;
      ctx.font = size + 'px "EgyBI Glyphs"';
      var w = Math.ceil(ctx.measureText(text).width);
      cv.width = w + 200; cv.height = 300;
      ctx = cv.getContext('2d');
      ctx.fillStyle = '#F6EEDC'; ctx.fillRect(0, 0, cv.width, cv.height);
      // the oval and its tie
      var x0 = 40, y0 = 60, x1 = cv.width - 70, y1 = 220, rad = (y1 - y0) / 2;
      ctx.strokeStyle = '#7A5E10'; ctx.lineWidth = 8; ctx.fillStyle = '#FCF8EC';
      ctx.beginPath();
      ctx.moveTo(x0 + rad, y0); ctx.lineTo(x1 - rad, y0); ctx.arc(x1 - rad, y0 + rad, rad, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(x0 + rad, y1); ctx.arc(x0 + rad, y0 + rad, rad, Math.PI / 2, Math.PI * 1.5);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#7A5E10'; ctx.fillRect(x1 + 14, y0 + 18, 10, y1 - y0 - 36);
      ctx.fillStyle = '#14110C'; ctx.font = size + 'px "EgyBI Glyphs"'; ctx.textBaseline = 'middle';
      ctx.fillText(text, (x0 + x1 - w) / 2, (y0 + y1) / 2 + 4);
      ctx.font = '600 18px Inter, sans-serif'; ctx.fillStyle = '#6a6252';
      ctx.fillText(name + ' — phonetic transliteration · egybi.com/hieroglyphs.html', 40, 270);
      cv.toBlob(function (b) {
        if (!b) return;
        var a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = 'cartouche-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      });
    };
    if (document.fonts && document.fonts.load) document.fonts.load('96px "EgyBI Glyphs"', text).then(draw, draw);
    else draw();
  }

  // Copy the signs as plain Unicode text (people search for "name in
  // hieroglyphics copy paste"). The clipboard call must run inside the click.
  // If the browser refuses, the signs are shown selected so a long press or
  // Ctrl+C copies them.
  function copyText() {
    var r = C.spell($('glyphName').value.trim().slice(0, 30));
    if (!r.signs.length) return;
    var text = r.signs.map(function (x) { return x.sign.ch; }).join('');
    var msg = $('glyphSaved');
    var fallback = function () {
      msg.textContent = t('Your browser did not allow copying. The signs are selected below: copy them with Ctrl+C or a long press.');
      var span = document.createElement('span');
      span.className = 'g'; span.textContent = ' ' + text;
      msg.appendChild(span);
      var range = document.createRange(); range.selectNodeContents(span);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    };
    try {
      navigator.clipboard.writeText(text).then(function () {
        msg.textContent = t('Copied. Paste the signs anywhere; they show where a hieroglyph font is installed.');
      }, fallback);
    } catch (e) { fallback(); }
  }

  function init() {
    var inp = $('glyphName');
    if (!inp) return;
    var saved = T ? T.load() : null;
    inp.value = (saved && saved.name) || 'Cleopatra';
    inp.addEventListener('input', render);
    $('glyphSave').addEventListener('click', function () {
      var tr = T.load(); tr.name = inp.value.trim().slice(0, 40); T.save(tr);
      $('glyphSaved').textContent = t('Saved. It will be on the cover of your dossier in the planner.');
    });
    $('glyphPng').addEventListener('click', savePng);
    $('glyphCopy').addEventListener('click', copyText);
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
