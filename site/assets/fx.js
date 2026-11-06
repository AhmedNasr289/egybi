/* fx.js — renders the currency band on prices.html from the daily FX pipeline
   (site/data/fx-today.json + fx-history.json, written by fetch_fx.py). Market
   reference rates, updated daily — labelled clearly as not the CBE official
   fixing. Progressive + graceful: if the data isn't there yet (before the first
   daily run), it shows a short honest "coming after the next update" note rather
   than a broken empty grid. Rising EGP-value of a currency = the pound bought
   less of it = pound weaker, coloured danger (matches the prices page's "up = you
   pay more" semantics).

   The band is Arabic copy on both prices pages, so its numbers follow the
   site's Arabic rules (EGYBI.fmt, assets/egfmt.js): Arabic-Indic digits, the
   rate always to two decimals, the date with the Egyptian month name, and
   each number in a left-to-right isolate. Each card also carries the rate in
   English ("EGP 54.77") for readers of the English page. */
(function () {
  'use strict';
  var grid = document.getElementById('fxGrid');
  var note = document.getElementById('fxNote');
  if (!grid) return;

  var esc = (window.EGYBI && EGYBI.escapeHtml) ? EGYBI.escapeHtml
    : function (s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; };
  var F = window.EGYBI && EGYBI.fmt;

  function spark(pts) {
    var v = pts.map(function (p) { return p.egp; }).filter(function (x) { return x != null; });
    if (v.length < 2) return '';
    var mn = Math.min.apply(null, v), mx = Math.max.apply(null, v), rng = (mx - mn) || 1;
    var step = 100 / (v.length - 1);
    var coords = v.map(function (val, i) {
      return (i * step).toFixed(1) + ',' + (3 + 24 * (1 - (val - mn) / rng)).toFixed(1);
    });
    var rising = v[v.length - 1] >= v[0];
    var col = rising ? 'var(--danger)' : 'var(--success)';
    var last = coords[coords.length - 1].split(',');
    return '<svg class="fx-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">' +
      '<polyline points="' + coords.join(' ') + '" fill="none" stroke="' + col + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="2" fill="' + col + '"/></svg>';
  }

  Promise.all([
    fetch('data/fx-today.json').then(function (r) { if (!r.ok) throw new Error('no fx'); return r.json(); }),
    fetch('data/fx-history.json').then(function (r) { return r.ok ? r.json() : { series: {} }; }).catch(function () { return { series: {} }; })
  ]).then(function (res) {
    var data = res[0], hist = (res[1] && res[1].series) || {};
    if (!data.rates || !data.rates.length) throw new Error('empty');
    if (!F) throw new Error('egfmt.js did not load');
    grid.innerHTML = data.rates.map(function (it) {
      var pts = hist[it.code] || [];
      var c = it.change_pct || 0;
      var cls = c > 0 ? 'up' : (c < 0 ? 'down' : 'flat');
      var chg = c ? F.pct(c, 'ar', 2) : '—';
      return '<div class="fx-card">' +
        '<div class="fx-top"><span class="fx-code">' + esc(it.code) + '</span>' +
        '<span class="fx-name" dir="auto">' + esc(it.name_ar) + '<span class="en">' + esc(it.name_en) + '</span></span></div>' +
        '<div class="fx-val">' + F.isolate(F.fixed(it.egp, 'ar', 2)) + ' <span class="cur">جنيه</span></div>' +
        '<div class="fx-en" lang="en" dir="ltr">' + esc(it.code) + ' 1 = ' + F.rate(it.egp, 'en') + '</div>' +
        '<div class="fx-row"><span class="fx-chg ' + cls + '" title="مقارنة بآخر تحديث">' + chg + '</span>' + spark(pts) + '</div>' +
        '</div>';
    }).join('');
    var s = data.source || {};
    note.innerHTML = 'آخر تحديث <time datetime="' + esc(data.as_of) + '">' + esc(F.date(data.as_of, 'ar')) + '</time> · ' +
      F.digits('1', 'ar') + ' وحدة من كل عملة = كام جنيه · المصدر: ' +
      '<a href="' + esc(s.url || '#') + '" target="_blank" rel="noopener">' + esc(s.name_en || 'ExchangeRate-API') + '</a>. ' +
      esc(s.note_ar || 'أسعار استرشادية من السوق، وليست السعر الرسمي للبنك المركزي.');
  }).catch(function () {
    // No data yet (before the first daily run) — honest, tidy fallback.
    grid.innerHTML = '';
    if (note) note.innerHTML = 'أسعار العملات هتظهر هنا بعد أول تحديث يومي للأسعار. <span dir="ltr">(Currency rates appear here after the first daily update.)</span>';
  });
})();
