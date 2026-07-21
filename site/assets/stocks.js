/* stocks.js — drives the Fundamentals stock picker on stocks.html.
   Lets a visitor choose ANY EGX stock; re-instantiates the TradingView
   symbol-info, company-profile and financials widgets for that symbol.
   TradingView embeds can't be updated in place, so each change clears the
   container and injects a fresh widget script. Progressive enhancement:
   the page ships with CIB (COMI) pre-rendered server-side, so it works
   with JS disabled; this script only takes over on interaction or when a
   shared/saved symbol differs. Information/education only — no advice. */
(function () {
  'use strict';

  // Curated most-traded EGX names (ticker · English · Arabic · sector).
  // Any other valid EGX ticker can still be typed free-hand.
  var EGX = [
    { t: 'COMI', en: 'Commercial International Bank (CIB)', ar: 'البنك التجاري الدولي', s: 'Banks' },
    { t: 'HRHO', en: 'EFG Holding (Hermes)', ar: 'المجموعة المالية هيرميس القابضة', s: 'Financial services' },
    { t: 'SWDY', en: 'Elsewedy Electric', ar: 'السويدي إليكتريك', s: 'Industrials' },
    { t: 'ETEL', en: 'Telecom Egypt (WE)', ar: 'المصرية للاتصالات', s: 'Telecom' },
    { t: 'FWRY', en: 'Fawry', ar: 'فوري للمدفوعات الإلكترونية', s: 'Fintech' },
    { t: 'TMGH', en: 'Talaat Moustafa Group', ar: 'مجموعة طلعت مصطفى القابضة', s: 'Real estate' },
    { t: 'EAST', en: 'Eastern Company', ar: 'الشرقية إيسترن كومباني', s: 'Consumer' },
    { t: 'SKPC', en: 'Sidi Kerir Petrochemicals (Sidpec)', ar: 'سيدي كرير للبتروكيماويات', s: 'Petrochemicals' },
    { t: 'ABUK', en: 'Abu Qir Fertilizers', ar: 'أبو قير للأسمدة والصناعات الكيماوية', s: 'Fertilizers' },
    { t: 'MFPC', en: 'Misr Fertilizers Production (MOPCO)', ar: 'مصر لإنتاج الأسمدة موبكو', s: 'Fertilizers' },
    { t: 'EFIH', en: 'e-finance', ar: 'إي فاينانس للاستثمارات المالية والرقمية', s: 'Fintech' },
    { t: 'EKHO', en: 'Egypt Kuwait Holding', ar: 'القابضة المصرية الكويتية', s: 'Holding' },
    { t: 'ORWE', en: 'Oriental Weavers', ar: 'النساجون الشرقيون للسجاد', s: 'Textiles' },
    { t: 'ESRS', en: 'Ezz Steel', ar: 'حديد عز', s: 'Steel' },
    { t: 'MNHD', en: 'Madinet Masr (Madinet Nasr Housing)', ar: 'مدينة نصر للإسكان والتعمير', s: 'Real estate' },
    { t: 'PHDC', en: 'Palm Hills Developments', ar: 'بالم هيلز للتعمير', s: 'Real estate' },
    { t: 'HELI', en: 'Heliopolis Housing', ar: 'مصر الجديدة للإسكان والتعمير', s: 'Real estate' },
    { t: 'JUFO', en: 'Juhayna Food Industries', ar: 'جهينة للصناعات الغذائية', s: 'Food & bev' },
    { t: 'EFID', en: 'Edita Food Industries', ar: 'إيديتا للصناعات الغذائية', s: 'Food & bev' },
    { t: 'ISPH', en: 'Ibnsina Pharma', ar: 'ابن سينا فارما', s: 'Healthcare' },
    { t: 'CLHO', en: 'Cleopatra Hospitals Group', ar: 'كليوباترا للخدمات الطبية', s: 'Healthcare' },
    { t: 'AMOC', en: 'Alexandria Mineral Oils (AMOC)', ar: 'الإسكندرية للزيوت المعدنية', s: 'Energy' },
    { t: 'SUGR', en: 'Delta Sugar', ar: 'الدلتا للسكر', s: 'Food & bev' },
    { t: 'QNBE', en: 'QNB Alahli', ar: 'بنك قطر الوطني الأهلي', s: 'Banks' },
    { t: 'ADIB', en: 'Abu Dhabi Islamic Bank Egypt', ar: 'مصرف أبوظبي الإسلامي مصر', s: 'Banks' },
    { t: 'CIEB', en: 'Crédit Agricole Egypt', ar: 'كريدي أجريكول مصر', s: 'Banks' }
  ];

  var byTicker = {};
  EGX.forEach(function (r) { byTicker[r.t] = r; });

  var input = document.getElementById('sp-input');
  var list = document.getElementById('sp-list');
  var nowEl = document.getElementById('sp-now');
  var errEl = document.getElementById('sp-err');
  var cInfo = document.getElementById('tvw-info');
  var cProfile = document.getElementById('tvw-profile');
  var cFin = document.getElementById('tvw-fin');
  if (!input || !list || !cInfo || !cProfile || !cFin) return; // not the stocks page

  var TV = 'https://s3.tradingview.com/external-embedding/';
  var active = -1;   // active option index in the current filtered list
  var current = [];  // current filtered rows

  // --- widget (re)builders -------------------------------------------------
  function buildWidget(container, src, config, tall) {
    container.innerHTML = '';
    var w = document.createElement('div');
    w.className = 'tradingview-widget-container__widget';
    if (tall) w.style.height = '100%';
    container.appendChild(w);
    var cr = document.createElement('div');
    cr.className = 'tradingview-widget-copyright';
    var a = document.createElement('a');
    a.href = 'https://www.tradingview.com/';
    a.rel = 'noopener nofollow';
    a.target = '_blank';
    a.textContent = 'Data by TradingView';
    cr.appendChild(a);
    container.appendChild(cr);
    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    s.src = src;
    s.textContent = JSON.stringify(config);
    container.appendChild(s);
  }

  function renderAll(symbol) {
    buildWidget(cInfo, TV + 'embed-widget-symbol-info.js',
      { symbol: symbol, width: '100%', locale: 'en', colorTheme: 'light', isTransparent: true }, false);
    buildWidget(cProfile, TV + 'embed-widget-symbol-profile.js',
      { symbol: symbol, width: '100%', height: 390, locale: 'en', colorTheme: 'light', isTransparent: true }, false);
    buildWidget(cFin, TV + 'embed-widget-financials.js',
      { colorTheme: 'light', isTransparent: true, largeChartUrl: '', displayMode: 'regular', width: '100%', height: '100%', symbol: symbol, locale: 'en' }, true);
  }

  // --- symbol handling -----------------------------------------------------
  function normalize(raw) {
    var v = (raw || '').trim().toUpperCase();
    if (!v) return '';
    if (v.indexOf(':') === -1) v = 'EGX:' + v;   // bare ticker → EGX:TICKER
    return v;
  }
  function tickerOf(sym) {
    var i = sym.indexOf(':');
    return i === -1 ? sym : sym.slice(i + 1);
  }
  var VALID = /^[A-Z0-9]{2,6}:[A-Z0-9.]{1,12}$/;

  function showError(msg) {
    if (!errEl) return;
    errEl.textContent = msg;
    errEl.hidden = false;
  }
  function clearError() { if (errEl) errEl.hidden = true; }

  function setCaption(sym) {
    if (!nowEl) return;
    var tk = tickerOf(sym);
    var row = byTicker[tk];
    if (row) {
      nowEl.innerHTML = 'Now viewing: <strong>' + row.en.replace(/</g, '&lt;') + ' · ' + tk +
        '</strong> <span class="sp-now-ar">' + row.ar + '</span>';
    } else {
      nowEl.innerHTML = 'Now viewing: <strong>' + sym.replace(/</g, '&lt;') + '</strong>';
    }
  }

  function persist(sym) {
    try { localStorage.setItem('egybi_stock', tickerOf(sym)); } catch (e) {}
    try {
      var u = new URL(window.location.href);
      u.searchParams.set('stock', tickerOf(sym));
      window.history.replaceState(null, '', u.toString());
    } catch (e) {}
  }

  // Apply a symbol: validate → rebuild widgets → caption → persist.
  function apply(raw, opts) {
    opts = opts || {};
    var sym = normalize(raw);
    if (!VALID.test(sym)) {
      showError('That doesn’t look like an EGX ticker. Try a code such as COMI, or EGX:COMI.');
      return false;
    }
    clearError();
    renderAll(sym);
    setCaption(sym);
    if (opts.persist !== false) persist(sym);
    return true;
  }

  // --- combobox ------------------------------------------------------------
  function filter(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) return EGX.slice(0, 8);
    var out = [];
    for (var i = 0; i < EGX.length && out.length < 8; i++) {
      var r = EGX[i];
      if (r.t.toLowerCase().indexOf(q) !== -1 ||
          r.en.toLowerCase().indexOf(q) !== -1 ||
          r.ar.indexOf(q) !== -1) {
        out.push(r);
      }
    }
    return out;
  }

  function openList(rows) {
    current = rows;
    active = -1;
    list.innerHTML = '';
    if (!rows.length) {
      var li = document.createElement('li');
      li.className = 'sp-empty';
      li.textContent = 'No match in the list — press Enter to try it as a ticker.';
      list.appendChild(li);
    } else {
      rows.forEach(function (r, i) {
        var li = document.createElement('li');
        li.className = 'sp-opt';
        li.id = 'sp-opt-' + i;
        li.setAttribute('role', 'option');
        li.dataset.ticker = r.t;
        li.innerHTML = '<span class="t">' + r.t + '</span><span class="n">' + r.en +
          ' <span class="ar">· ' + r.ar + '</span></span><span class="s">' + r.s + '</span>';
        li.addEventListener('mousedown', function (e) { e.preventDefault(); choose(r.t); });
        list.appendChild(li);
      });
    }
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function closeList() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }

  function highlight(i) {
    var opts = list.querySelectorAll('.sp-opt');
    opts.forEach(function (o) { o.classList.remove('active'); });
    if (i >= 0 && i < opts.length) {
      opts[i].classList.add('active');
      input.setAttribute('aria-activedescendant', opts[i].id);
      opts[i].scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function choose(ticker) {
    var row = byTicker[ticker];
    input.value = row ? (row.t + ' — ' + row.en) : ticker;
    closeList();
    apply(ticker);
  }

  input.addEventListener('input', function () { openList(filter(input.value)); });
  input.addEventListener('focus', function () { openList(filter(input.value)); });
  input.addEventListener('blur', function () { setTimeout(closeList, 120); });

  input.addEventListener('keydown', function (e) {
    var opts = list.hidden ? [] : list.querySelectorAll('.sp-opt');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (list.hidden) { openList(filter(input.value)); return; }
      active = Math.min(active + 1, opts.length - 1); highlight(active);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      active = Math.max(active - 1, 0); highlight(active);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && current[active]) { choose(current[active].t); }
      else if (input.value.trim()) {
        // Free-text: use whatever was typed as a symbol.
        if (apply(input.value)) closeList();
      }
    } else if (e.key === 'Escape') {
      closeList();
    }
  });

  // --- init: shared ?stock= wins, then saved choice, else the COMI already
  // rendered server-side (no rebuild needed for the default). -------------
  (function init() {
    var initial = null;
    try {
      var p = new URL(window.location.href).searchParams.get('stock');
      if (p) initial = p.toUpperCase();
    } catch (e) {}
    if (!initial) {
      try { initial = (localStorage.getItem('egybi_stock') || '').toUpperCase() || null; } catch (e) {}
    }
    if (!initial) initial = 'COMI';

    var row = byTicker[initial];
    input.value = row ? (row.t + ' — ' + row.en) : initial;

    if (initial === 'COMI') {
      setCaption('EGX:COMI');       // server already rendered COMI; just sync UI
    } else {
      apply(initial, { persist: false });
    }
  })();
})();
