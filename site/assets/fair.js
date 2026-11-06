/* fair.js — "What should it cost?"

   Two kinds of figure, kept visibly apart because they are not equally good:
     1. TRAVELLER PRICES from fair-prices.json — tips, entry, rides — as named
        guides and operators publish them. No official list exists for most of
        these, so every row shows who said it, when, and any source that
        disagrees, and a row with no checkable figure says so.
     2. MARKET PRICES from prices-today.json — the Cabinet's IDSC retail feed,
        refreshed daily. Official, and what a shop counter charges residents.
   Both are converted at fx-today.json's rate; the converted figure moves with
   the rate, the quote underneath does not. */
(function () {
  'use strict';
  var T = window.EGYBI && window.EGYBI.trip;
  if (!T) return;
  var esc = T.esc;
  function $(id) { return document.getElementById(id); }
  var D = { fp: null, prices: null, fx: null }, CUR = 'USD';
  var BASKET = ['idsc-2', 'idsc-1', 'idsc-82', 'idsc-188', 'idsc-79', 'idsc-65', 'idsc-63', 'idsc-880', 'idsc-326'];
  var UNIT = { 'كيلو': 'kg', 'لتر': 'litre', 'بيضة': 'one egg', 'واحدة': 'each', 'كرتونة': 'carton' };
  function settle(p) { return p.then(function (v) { return v; }, function () { return null; }); }

  function conv(n, from) {
    if (n == null) return null;
    var egp = from === 'EGP' ? n : n * (T.rate(D.fx, from) || NaN);
    if (CUR === 'EGP') return egp;
    var r = T.rate(D.fx, CUR);
    return r ? egp / r : null;
  }
  function range(lo, hi, cur) {
    if (lo == null && hi == null) return null;
    if (hi == null) return T.money(lo, cur) + '+';
    return lo === hi ? T.money(lo, cur) : T.money(lo, cur) + '–' + T.money(hi, cur).replace(/^[^\d]+/, '');
  }

  function renderGroups() {
    var host = $('fpGroups');
    if (!host) return;
    if (!D.fp) { host.innerHTML = '<p class="chart-cap">The price sheet could not be loaded.</p>'; return; }
    host.innerHTML = D.fp.groups.map(function (g) {
      return '<div class="sheet" style="margin-top:18px;"><h3 style="margin:0 0 10px;color:var(--blue-deep);">' + esc(g.title) + '</h3>' +
        '<div class="fp-wrap"><table class="fp-table"><thead><tr><th scope="col">What</th><th scope="col" class="num">As published</th>' +
        '<th scope="col" class="num">In ' + esc(CUR) + ' today</th><th scope="col">Who says so</th></tr></thead><tbody>' +
        g.rows.map(function (r) {
          var pub = range(r.low, r.high, r.currency);
          var mine = pub == null || CUR === r.currency ? (pub == null ? null : '—') : range(conv(r.low, r.currency), conv(r.high, r.currency), CUR);
          return '<tr><td><strong>' + esc(r.item) + '</strong><span class="fp-src">' + esc(r.unit) + '</span>' +
            (r.note ? '<span class="fp-src">' + esc(r.note) + '</span>' : '') +
            (r.conflict ? '<span class="fp-conflict">Sources disagree: ' + esc(r.conflict) + '</span>' : '') +
            (r.official_url ? '<span class="fp-src">Official: <a href="' + esc(r.official_url) + '" rel="noopener">' + esc(r.official_url.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</a></span>' : '') + '</td>' +
            '<td class="num">' + (pub == null ? '<span class="fp-none">no checkable figure</span>' : esc(pub)) + '</td>' +
            '<td class="num">' + (mine == null ? '—' : esc(mine)) + '</td>' +
            '<td>' + (r.source_url ? '<a href="' + esc(r.source_url) + '" rel="noopener">' + esc(r.source) + '</a>' : esc(r.source)) +
            '<span class="fp-src">' + esc(r.kind || '') + (r.published ? ' &middot; ' + esc(r.published) : '') + '</span></td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }).join('');
    $('fpCap').textContent = 'Compiled ' + T.fmtDate(D.fp.as_of) + '. ' + D.fp.note;
  }

  function renderMarket() {
    var host = $('fpMarket');
    if (!host) return;
    var p = D.prices && D.prices.retail;
    if (!p) { host.innerHTML = '<p class="chart-cap">The market prices could not be loaded.</p>'; return; }
    var by = {};
    p.items.forEach(function (i) { by[i.slug] = i; });
    var rows = BASKET.map(function (k) { return by[k]; }).filter(Boolean);
    host.innerHTML = '<div class="fp-wrap"><table class="fp-table"><thead><tr><th scope="col">Item</th><th scope="col" class="num">Average, EGP</th>' +
      '<th scope="col" class="num">Range across the country, EGP</th><th scope="col" class="num">Average in ' + esc(CUR) + '</th></tr></thead><tbody>' +
      rows.map(function (i) {
        return '<tr><td><strong>' + esc(i.name_en) + '</strong> <span lang="ar" dir="rtl" class="fp-src" style="display:inline;">' + esc(i.name_ar) + '</span>' +
          '<span class="fp-src">per ' + esc(UNIT[i.unit] || i.unit) + '</span></td>' +
          '<td class="num">' + esc(T.money(i.avg, 'EGP')) + '</td><td class="num">' + esc(T.money(i.min, 'EGP') + '–' + T.money(i.max, 'EGP').replace('EGP ', '')) + '</td>' +
          '<td class="num">' + (CUR === 'EGP' ? '—' : esc(T.money(conv(i.avg, 'EGP'), CUR))) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    var src = D.prices.source || {};
    $('fpMarketCap').innerHTML = 'Source: ' + esc(src.name_en) + ' (<a href="' + esc(src.url) + '" rel="noopener">agriprice.gov.eg</a>), retail prices dated ' +
      esc(T.fmtDate(p.as_of)) + ', ' + p.count + ' items. These are what shops charge residents across Egypt&rsquo;s governorates &mdash; a floor for what a market stall should ask, not a tourist price. <a href="prices.html">All ' + p.count + ' items, daily &rarr;</a>';
  }

  function renderRate() {
    var el = $('fpRate');
    if (!el || !D.fx) return;
    var r = T.rate(D.fx, CUR);
    el.textContent = CUR === 'EGP' ? 'Showing Egyptian pounds only.'
      : '1 ' + CUR + ' = ' + T.rateText(r) + ' — ' + ((D.fx.source || {}).name_en || 'market rate') + ', ' + T.fmtDate(D.fx.as_of) + '. ' + ((D.fx.source || {}).note_en || '');
  }

  function renderAll() { renderRate(); renderGroups(); renderMarket(); }

  function init() {
    var sel = $('fpCur');
    if (!sel) return;
    sel.addEventListener('change', function () { CUR = sel.value; renderAll(); });
    Promise.all([settle(T.getJSON('data/fair-prices.json')), settle(T.getJSON('data/prices-today.json')),
                 settle(T.getJSON('data/fx-today.json'))]).then(function (r) {
      D.fp = r[0]; D.prices = r[1]; D.fx = r[2];
      renderAll();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
