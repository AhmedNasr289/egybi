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
  // "Were you quoted a price?" (2026-11-18): where a quoted amount sits
  // against one row's published range. Pure, and exported before anything
  // else so backend/verify/fair-verdict.js can test it without a page.
  // Returns null when the row has no figure to compare against: the helper
  // then says so instead of guessing.
  function verdict(amount, low, high) {
    if (!(amount >= 0) || low == null) return null;
    var top = high == null ? low : high;
    if (amount > top) return { kind: 'above', pct: Math.round((amount - top) / top * 100) };
    if (amount < low) return { kind: 'below', pct: Math.round((low - amount) / low * 100) };
    return { kind: 'inside', pct: 0 };
  }
  window.EGYBI = window.EGYBI || {};
  window.EGYBI.fairVerdict = verdict;
  var T = window.EGYBI && window.EGYBI.trip;
  if (!T) return;
  var esc = T.esc;
  // Strings from fair-prices.json go through t() too: the build adds every
  // visible field of that file to the Arabic and Russian tables
  // (backend/pipeline/pages/i18n.py, data_keys), so a translated page shows
  // the whole sheet in its own language. tt() passes null and '' through.
  var t = (window.EGYBI && window.EGYBI.t) || function (s) { return s; };
  function tt(s) { return s ? t(s) : s; }
  function $(id) { return document.getElementById(id); }
  var D = { fp: null, prices: null, fx: null }, CUR = 'USD';
  var BASKET = ['idsc-2', 'idsc-1', 'idsc-82', 'idsc-188', 'idsc-79', 'idsc-65', 'idsc-63', 'idsc-880', 'idsc-326'];
  var UNIT = { 'كيلو': 'kg', 'لتر': 'litre', 'بيضة': 'one egg', 'واحدة': 'each', 'كرتونة': 'carton' };
  // Literal t() calls, so the build can find and require each translation.
  // The names come from the daily feed and can change, so they are not
  // translated here; a unit outside this list shows in English.
  function per(u) {
    switch (UNIT[u] || u) {
      case 'kg': return t('per kg');
      case 'litre': return t('per litre');
      case 'one egg': return t('per egg');
      case 'each': return t('each');
      case 'carton': return t('per carton');
      default: return 'per ' + (UNIT[u] || u);
    }
  }
  function settle(p) { return p.then(function (v) { return v; }, function () { return null; }); }

  function conv(n, from) {
    if (n == null) return null;
    var egp = from === 'EGP' ? n : n * (T.rate(D.fx, from) || NaN);
    if (CUR === 'EGP') return egp;
    var r = T.rate(D.fx, CUR);
    return r ? egp / r : null;
  }
  // Amounts and dates in the page's own form (2026-11-19). Arabic pages write
  // pounds as egfmt.js does everywhere else ("١٠٠–٢٠٠ جنيه") and other
  // currencies with Arabic-Indic digits; Russian and English pages keep
  // "EGP 100–200". A checked date is written as the site writes dates, never
  // as raw ISO ("2026-10-09").
  var LANG = document.documentElement.getAttribute('lang') || 'en';
  var SYM = { USD: '$', EUR: '€', GBP: '£' };
  function arFmt() { var F = window.EGYBI && window.EGYBI.fmt; return LANG === 'ar' && F ? F : null; }
  function places(n) { return n >= 100 ? 0 : (n >= 10 ? 1 : 2); }
  function money(n, cur) {
    var F = arFmt();
    if (!F || n == null || !isFinite(n)) return T.money(n, cur);
    if (cur === 'EGP') return F.money(n, 'ar');
    return F.isolate((SYM[cur] || cur + ' ') + F.num(n, 'ar', places(n)));
  }
  function range(lo, hi, cur) {
    if (lo == null && hi == null) return null;
    if (hi == null) return money(lo, cur) + '+';
    if (lo === hi) return money(lo, cur);
    var F = arFmt();
    if (F && isFinite(lo) && isFinite(hi)) {
      if (cur === 'EGP') return F.moneyRange(lo, hi, 'ar');
      var d = places(Math.max(Math.abs(lo), Math.abs(hi)));
      return F.isolate((SYM[cur] || cur + ' ') + F.num(lo, 'ar', d) + '–' + F.num(hi, 'ar', d));
    }
    return T.money(lo, cur) + '–' + T.money(hi, cur).replace(/^[^\d]+/, '');
  }
  function curName(cur) { return LANG === 'ar' && cur === 'EGP' ? 'جنيه' : cur; }
  function when(d) {
    if (!d) return '';
    return /^\d{4}-\d\d-\d\d/.test(String(d)) ? T.fmtDate(String(d)) : pageNum(d);
  }

  function renderGroups() {
    var host = $('fpGroups');
    if (!host) return;
    if (!D.fp) { host.innerHTML = '<p class="chart-cap">' + esc(t('The price sheet could not be loaded.')) + '</p>'; return; }
    host.innerHTML = D.fp.groups.map(function (g) {
      return '<div class="sheet" style="margin-top:18px;"><h3 style="margin:0 0 10px;color:var(--blue-deep);">' + esc(tt(g.title)) + '</h3>' +
        (g.note ? '<p class="chart-cap" style="margin:0 0 10px;">' + esc(tt(g.note)) + '</p>' : '') +
        '<div class="fp-wrap"><table class="fp-table"><thead><tr><th scope="col">' + esc(t('What')) + '</th><th scope="col" class="num">' + esc(t('As published')) + '</th>' +
        '<th scope="col" class="num">' + esc(t('In %s today').replace('%s', CUR)) + '</th><th scope="col">' + esc(t('Who says so')) + '</th></tr></thead><tbody>' +
        g.rows.map(function (r) {
          var pub = range(r.low, r.high, r.currency);
          var mine = pub == null || CUR === r.currency ? (pub == null ? null : '—') : range(conv(r.low, r.currency), conv(r.high, r.currency), CUR);
          return '<tr data-row="' + esc(r.key) + '"><td><strong>' + esc(tt(r.item)) + '</strong><span class="fp-src">' + esc(tt(r.unit)) + '</span>' +
            (r.note ? '<span class="fp-src">' + esc(tt(r.note)) + '</span>' : '') +
            (r.conflict ? '<span class="fp-conflict">' + esc(t('Sources disagree:')) + ' ' + esc(tt(r.conflict)) + '</span>' : '') +
            (r.official_url ? '<span class="fp-src">' + esc(t('Official site:')) + ' <a href="' + esc(r.official_url) + '" rel="noopener">' + esc(r.official_url.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</a></span>' : '') + '</td>' +
            '<td class="num" data-label="' + esc(t('As published')) + '">' + (pub == null ? '<span class="fp-none">' + esc(t('no checkable figure')) + '</span>' : esc(pub)) + '</td>' +
            '<td class="num" data-label="' + esc(t('In %s today').replace('%s', CUR)) + '">' + (mine == null ? '—' : esc(mine)) + '</td>' +
            '<td data-label="' + esc(t('Who says so')) + '">' + (r.source_url ? '<a href="' + esc(r.source_url) + '" rel="noopener">' + esc(r.source) + '</a>' : esc(tt(r.source))) +
            '<span class="fp-src">' + esc(tt(r.kind || '')) + (r.published ? ' &middot; ' + esc(r.published === 'undated' ? t('undated') : when(r.published)) : '') +
            (r.checked ? ' &middot; ' + esc(t('checked')) + ' ' + esc(when(r.checked)) : '') + '</span></td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }).join('');
    $('fpCap').textContent = t('Compiled') + ' ' + T.fmtDate(D.fp.as_of) + '. ' + tt(D.fp.note);
  }

  function renderMarket() {
    var host = $('fpMarket');
    if (!host) return;
    var p = D.prices && D.prices.retail;
    if (!p) { host.innerHTML = '<p class="chart-cap">' + esc(t('The market prices could not be loaded.')) + '</p>'; return; }
    var by = {};
    p.items.forEach(function (i) { by[i.slug] = i; });
    var rows = BASKET.map(function (k) { return by[k]; }).filter(Boolean);
    var arPage = document.documentElement.lang === 'ar';
    host.innerHTML = '<div class="fp-wrap"><table class="fp-table"><thead><tr><th scope="col">' + esc(t('Item')) + '</th><th scope="col" class="num">' + esc(t('Average, EGP')) + '</th>' +
      '<th scope="col" class="num">' + esc(t('Range across the country, EGP')) + '</th><th scope="col" class="num">' + esc(t('Average in %s').replace('%s', CUR)) + '</th></tr></thead><tbody>' +
      rows.map(function (i) {
        // The Arabic page shows the Cabinet's own Arabic name alone; the
        // others keep the English name with the Arabic beside it.
        return '<tr><td>' + (arPage ? '<strong>' + esc(i.name_ar) + '</strong>'
          : '<strong>' + esc(i.name_en) + '</strong> <span lang="ar" dir="rtl" class="fp-src" style="display:inline;">' + esc(i.name_ar) + '</span>') +
          '<span class="fp-src">' + esc(per(i.unit)) + '</span></td>' +
          '<td class="num" data-label="' + esc(t('Average, EGP')) + '">' + esc(money(i.avg, 'EGP')) + '</td><td class="num" data-label="' + esc(t('Range across the country, EGP')) + '">' + esc(range(i.min, i.max, 'EGP')) + '</td>' +
          '<td class="num" data-label="' + esc(t('Average in %s').replace('%s', CUR)) + '">' + (CUR === 'EGP' ? '—' : esc(money(conv(i.avg, 'EGP'), CUR))) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    var src = D.prices.source || {};
    // Built from plain-text pieces so each can go through t() (a translated
    // string may not carry markup); the links are added around them here.
    $('fpMarketCap').innerHTML = esc(t('Source:')) + ' ' + esc(arPage && src.name_ar ? src.name_ar : src.name_en) +
      ' (<a href="' + esc(src.url) + '" rel="noopener">agriprice.gov.eg</a>). ' +
      esc(t('Retail prices dated %d, %n items.').replace('%d', T.fmtDate(p.as_of)).replace('%n', p.count)) + ' ' +
      esc(t('These are what shops charge residents across Egypt’s governorates. Treat them as a floor for what a market stall should ask, not as a tourist price.')) +
      ' <a href="' + T.url('prices.html') + '">' + esc(t('All %n items, updated daily').replace('%n', p.count)) + ' &rarr;</a>';
  }

  function renderRate() {
    var el = $('fpRate');
    if (!el || !D.fx) return;
    var r = T.rate(D.fx, CUR);
    if (CUR === 'EGP') { el.textContent = t('Showing Egyptian pounds only.'); return; }
    // The source's name and note in the page's language: fx-today.json carries
    // Arabic ones; the English note is the same sentence every day, so it is
    // a literal t() call, and any other note stays as the file gives it.
    var src = D.fx.source || {}, F = arFmt();
    var name = LANG === 'ar' && src.name_ar ? src.name_ar
      : src.name_en === 'ExchangeRate-API (open access)' ? t('ExchangeRate-API (open access)') : (src.name_en || t('market rate'));
    var note = LANG === 'ar' && src.note_ar ? src.note_ar
      : src.note_en === 'Market reference rates, not the Central Bank of Egypt official fixing.'
        ? t('Market reference rates, not the Central Bank of Egypt official fixing.') : (src.note_en || '');
    el.textContent = t('1 %c = %r, %s, %d.').replace('%c', CUR).replace('%r', F && r != null ? F.rate(r, 'ar') : T.rateText(r))
      .replace('%s', name).replace('%d', T.fmtDate(D.fx.as_of)) + ' ' + note;
  }

  // The quote checker: one select of the rows that carry a figure, one
  // amount in that row's own currency, one sentence back. Nothing is sent.
  function pageNum(n) {
    var F = window.EGYBI && window.EGYBI.fmt;
    return F && document.documentElement.lang === 'ar' ? F.digits(String(n), 'ar') : String(n);
  }
  function rowsWithFigures() {
    var out = [];
    (D.fp ? D.fp.groups : []).forEach(function (g) {
      g.rows.forEach(function (r) { if (r.low != null) out.push(r); });
    });
    return out;
  }
  function renderCheckList() {
    var sel = $('fpCheckItem');
    if (!sel || !D.fp) return;
    sel.innerHTML = rowsWithFigures().map(function (r) {
      return '<option value="' + esc(r.key) + '">' + esc(tt(r.item)) + ' (' + esc(tt(r.unit)) + (LANG === 'ar' ? '، ' : ', ') + esc(curName(r.currency)) + ')</option>';
    }).join('');
    renderCheck();
  }
  function renderCheck() {
    var sel = $('fpCheckItem'), inp = $('fpCheckAmount'), out = $('fpCheckOut');
    if (!sel || !inp || !out) return;
    var r = rowsWithFigures().filter(function (x) { return x.key === sel.value; })[0];
    if (!r) { out.textContent = ''; return; }
    var raw = String(inp.value || '').replace(',', '.');
    var v = raw === '' ? null : verdict(parseFloat(raw), r.low, r.high);
    var rg = range(r.low, r.high, r.currency);
    if (!v) { out.textContent = t('Type the price you were asked, in %c.').replace('%c', curName(r.currency)); return; }
    var msg = v.kind === 'inside' ? t('Inside the published range of %r.')
      : v.kind === 'above' ? t('About %p% above the top of the published range of %r.')
      : t('About %p% below the published range of %r.');
    out.textContent = msg.replace('%p', pageNum(v.pct)).replace('%r', rg) + ' ' +
      t('The range is what one named source publishes, %s; it is not a fixed price.').replace('%s', r.source_url ? r.source : tt(r.source));
    out.setAttribute('data-verdict', v.kind);
  }

  function renderAll() { renderRate(); renderGroups(); renderMarket(); renderCheckList(); }

  function init() {
    var sel = $('fpCur');
    if (!sel) return;
    sel.addEventListener('change', function () { CUR = sel.value; renderAll(); });
    if ($('fpCheckItem')) {
      $('fpCheckItem').addEventListener('change', renderCheck);
      $('fpCheckAmount').addEventListener('input', renderCheck);
    }
    Promise.all([settle(T.getJSON('data/fair-prices.json')), settle(T.getJSON('data/prices-today.json')),
                 settle(T.getJSON('data/fx-today.json'))]).then(function (r) {
      D.fp = r[0]; D.prices = r[1]; D.fx = r[2];
      renderAll();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
