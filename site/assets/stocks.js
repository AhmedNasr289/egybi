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

  // Curated EGX names (ticker · English · Arabic · sector). Only real,
  // well-known EGX ticker codes are listed — any other valid EGX ticker can
  // still be typed free-hand, and these codes are worth a live spot-check on
  // TradingView. Order is roughly by how actively traded / familiar.
  var EGX = [
    // Banks & financial services
    { t: 'COMI', en: 'Commercial International Bank (CIB)', ar: 'البنك التجاري الدولي', s: 'Banks' },
    { t: 'HRHO', en: 'EFG Holding (Hermes)', ar: 'المجموعة المالية هيرميس القابضة', s: 'Financials' },
    { t: 'QNBE', en: 'QNB Alahli', ar: 'بنك قطر الوطني الأهلي', s: 'Banks' },
    { t: 'ADIB', en: 'Abu Dhabi Islamic Bank Egypt', ar: 'مصرف أبوظبي الإسلامي مصر', s: 'Banks' },
    { t: 'CIEB', en: 'Crédit Agricole Egypt', ar: 'كريدي أجريكول مصر', s: 'Banks' },
    { t: 'SAUD', en: 'Al Baraka Bank Egypt', ar: 'بنك البركة مصر', s: 'Banks' },
    { t: 'FAIT', en: 'Faisal Islamic Bank of Egypt', ar: 'بنك فيصل الإسلامي المصري', s: 'Banks' },
    { t: 'HDBK', en: 'Housing & Development Bank', ar: 'بنك التعمير والإسكان', s: 'Banks' },
    { t: 'EGBE', en: 'Export Development Bank of Egypt', ar: 'البنك المصري لتنمية الصادرات', s: 'Banks' },
    { t: 'CICH', en: 'CI Capital Holding', ar: 'سي آي كابيتال القابضة', s: 'Financials' },
    { t: 'BTFH', en: 'Beltone Holding', ar: 'بلتون القابضة', s: 'Financials' },
    { t: 'CCAP', en: 'Qalaa Holdings (Citadel Capital)', ar: 'القلعة للاستشارات المالية', s: 'Financials' },
    { t: 'EFIH', en: 'e-finance for Digital & Financial Investments', ar: 'إي فاينانس للاستثمارات المالية والرقمية', s: 'Fintech' },
    { t: 'FWRY', en: 'Fawry for Banking Technology', ar: 'فوري لتكنولوجيا البنوك والمدفوعات', s: 'Fintech' },
    { t: 'EKHO', en: 'Egypt Kuwait Holding', ar: 'القابضة المصرية الكويتية', s: 'Holding' },
    // Real estate & construction
    { t: 'TMGH', en: 'Talaat Moustafa Group', ar: 'مجموعة طلعت مصطفى القابضة', s: 'Real estate' },
    { t: 'MNHD', en: 'Madinet Masr (Madinet Nasr Housing)', ar: 'مدينة نصر للإسكان والتعمير', s: 'Real estate' },
    { t: 'PHDC', en: 'Palm Hills Developments', ar: 'بالم هيلز للتعمير', s: 'Real estate' },
    { t: 'HELI', en: 'Heliopolis Housing & Development', ar: 'مصر الجديدة للإسكان والتعمير', s: 'Real estate' },
    { t: 'OCDI', en: 'SODIC (Sixth of October Development)', ar: 'سوديك للتعمير', s: 'Real estate' },
    { t: 'EMFD', en: 'Emaar Misr for Development', ar: 'إعمار مصر للتنمية', s: 'Real estate' },
    { t: 'ORHD', en: 'Orascom Development Egypt', ar: 'أوراسكوم للتنمية مصر', s: 'Real estate' },
    { t: 'CIRA', en: 'Cairo Investment & Real Estate (CIRA)', ar: 'كايرو للاستثمار والتنمية العقارية', s: 'Real estate' },
    { t: 'AMER', en: 'Amer Group Holding', ar: 'مجموعة عامر القابضة', s: 'Real estate' },
    { t: 'ORAS', en: 'Orascom Construction', ar: 'أوراسكوم للإنشاءات', s: 'Construction' },
    // Building materials, cement & heavy industry
    { t: 'ARCC', en: 'Arabian Cement', ar: 'الأسمنت العربية', s: 'Building materials' },
    { t: 'MBSC', en: 'Misr Beni Suef Cement', ar: 'أسمنت مصر بني سويف', s: 'Building materials' },
    { t: 'SVCE', en: 'South Valley Cement', ar: 'أسمنت جنوب الوادي', s: 'Building materials' },
    { t: 'SCEM', en: 'Sinai Cement', ar: 'أسمنت سيناء', s: 'Building materials' },
    { t: 'ESRS', en: 'Ezz Steel', ar: 'حديد عز', s: 'Industrials' },
    { t: 'SWDY', en: 'Elsewedy Electric', ar: 'السويدي إليكتريك', s: 'Industrials' },
    // Food, beverage & consumer
    { t: 'JUFO', en: 'Juhayna Food Industries', ar: 'جهينة للصناعات الغذائية', s: 'Food & bev' },
    { t: 'EFID', en: 'Edita Food Industries', ar: 'إيديتا للصناعات الغذائية', s: 'Food & bev' },
    { t: 'DOMT', en: 'Arabian Food Industries (Domty)', ar: 'العربية للمنتجات الغذائية دومتي', s: 'Food & bev' },
    { t: 'OLFI', en: 'Obour Land for Food Industries', ar: 'عبور لاند للصناعات الغذائية', s: 'Food & bev' },
    { t: 'SUGR', en: 'Delta Sugar', ar: 'الدلتا للسكر', s: 'Food & bev' },
    { t: 'EAST', en: 'Eastern Company', ar: 'الشرقية إيسترن كومباني', s: 'Consumer' },
    // Healthcare & pharma
    { t: 'ISPH', en: 'Ibnsina Pharma', ar: 'ابن سينا فارما', s: 'Healthcare' },
    { t: 'CLHO', en: 'Cleopatra Hospitals Group', ar: 'كليوباترا للخدمات الطبية', s: 'Healthcare' },
    { t: 'IDHC', en: 'Integrated Diagnostics Holdings', ar: 'القابضة للتشخيص المتكامل', s: 'Healthcare' },
    { t: 'PHAR', en: 'Egyptian Int’l Pharmaceuticals (EIPICO)', ar: 'إيبيكو للصناعات الدوائية', s: 'Healthcare' },
    { t: 'RMDA', en: 'Rameda (Tenth of Ramadan Pharma)', ar: 'راميدا للصناعات الدوائية', s: 'Healthcare' },
    { t: 'SPMD', en: 'Speed Medical', ar: 'سبيد ميديكال', s: 'Healthcare' },
    // Telecom, technology & automotive
    { t: 'ETEL', en: 'Telecom Egypt (WE)', ar: 'المصرية للاتصالات', s: 'Telecom' },
    { t: 'RAYA', en: 'Raya Holding', ar: 'راية القابضة', s: 'Technology' },
    { t: 'MTIE', en: 'MM Group for Industry & Trade', ar: 'إم إم جروب للصناعة والتجارة', s: 'Technology' },
    { t: 'AUTO', en: 'GB Corp (GB Auto)', ar: 'جي بي كورب', s: 'Automotive' },
    // Chemicals, fertilizers & energy
    { t: 'SKPC', en: 'Sidi Kerir Petrochemicals (Sidpec)', ar: 'سيدي كرير للبتروكيماويات', s: 'Petrochemicals' },
    { t: 'ABUK', en: 'Abu Qir Fertilizers', ar: 'أبو قير للأسمدة والصناعات الكيماوية', s: 'Fertilizers' },
    { t: 'MFPC', en: 'Misr Fertilizers Production (MOPCO)', ar: 'مصر لإنتاج الأسمدة موبكو', s: 'Fertilizers' },
    { t: 'EGCH', en: 'Egyptian Chemical Industries (KIMA)', ar: 'كيما للصناعات الكيماوية', s: 'Chemicals' },
    { t: 'AMOC', en: 'Alexandria Mineral Oils (AMOC)', ar: 'الإسكندرية للزيوت المعدنية', s: 'Energy' },
    // Tourism, textiles & logistics
    { t: 'EGTS', en: 'Egyptian for Tourism Resorts', ar: 'المصرية للمنتجعات السياحية', s: 'Tourism' },
    { t: 'ORWE', en: 'Oriental Weavers', ar: 'النساجون الشرقيون للسجاد', s: 'Textiles' },
    { t: 'KABO', en: 'El Nasr Clothing & Textiles (Kabo)', ar: 'النصر للملابس والمنسوجات كابو', s: 'Textiles' },
    { t: 'ETRS', en: 'Egyptian Transport (EGYTRANS)', ar: 'المصرية للنقل والتجارة إيجيترانز', s: 'Logistics' }
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
  var CAP = 12;
  function filter(q) {
    q = (q || '').trim().toLowerCase();
    if (!q) return EGX.slice(0, CAP);
    var out = [];
    for (var i = 0; i < EGX.length && out.length < CAP; i++) {
      var r = EGX[i];
      if (r.t.toLowerCase().indexOf(q) !== -1 ||
          r.en.toLowerCase().indexOf(q) !== -1 ||
          r.ar.indexOf(q) !== -1) {
        out.push(r);
      }
    }
    return out;
  }

  // Sector browse: chips that reveal every company in one broad group, so a
  // newcomer who doesn't know tickers can still explore. The fine-grained
  // per-stock sector still shows on each result row; these chips roll the
  // sectors up into a handful of clean buckets so the row isn't overwhelming.
  var GROUP = {
    'Banks': 'Banks', 'Financials': 'Financials', 'Fintech': 'Financials', 'Holding': 'Financials',
    'Real estate': 'Real estate', 'Construction': 'Real estate',
    'Building materials': 'Industrials', 'Industrials': 'Industrials',
    'Food & bev': 'Consumer & food', 'Consumer': 'Consumer & food',
    'Healthcare': 'Healthcare',
    'Telecom': 'Tech & telecom', 'Technology': 'Tech & telecom', 'Automotive': 'Tech & telecom',
    'Petrochemicals': 'Energy & chemicals', 'Fertilizers': 'Energy & chemicals', 'Chemicals': 'Energy & chemicals', 'Energy': 'Energy & chemicals',
    'Tourism': 'Tourism & travel', 'Logistics': 'Tourism & travel', 'Textiles': 'Textiles'
  };
  function grp(s) { return GROUP[s] || s; }
  var sectorsEl = document.getElementById('sp-sectors');
  function renderSectors() {
    if (!sectorsEl) return;
    var order = [], counts = {};
    EGX.forEach(function (r) { var g = grp(r.s); if (!(g in counts)) order.push(g); counts[g] = (counts[g] || 0) + 1; });
    sectorsEl.innerHTML = order.map(function (g) {
      return '<button type="button" class="sp-sector" data-group="' + g.replace(/"/g, '&quot;') +
        '">' + g + ' <span class="c">' + counts[g] + '</span></button>';
    }).join('');
    sectorsEl.querySelectorAll('.sp-sector').forEach(function (b) {
      b.addEventListener('click', function () {
        var g = b.dataset.group;
        var on = b.classList.contains('on');
        sectorsEl.querySelectorAll('.sp-sector').forEach(function (x) { x.classList.remove('on'); });
        if (on) { closeList(); return; }
        b.classList.add('on');
        input.value = '';
        openList(EGX.filter(function (r) { return grp(r.s) === g; }));
        input.focus();
      });
    });
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

  function clearSectorChips() { if (sectorsEl) sectorsEl.querySelectorAll('.sp-sector.on').forEach(function (x) { x.classList.remove('on'); }); }
  input.addEventListener('input', function () { clearSectorChips(); openList(filter(input.value)); });
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

  // --- shared spotlight: the ticker tape and the 12-month mini-chart grid are
  // both built here from the one EGX company list, so the whole page has a
  // single source of companies. FEATURED curates which names to spotlight
  // (a spread across sectors); every symbol/name still comes from EGX. -----
  var FEATURED = ['COMI', 'HRHO', 'QNBE', 'SWDY', 'ETEL', 'FWRY', 'TMGH', 'MNHD',
                  'JUFO', 'EFID', 'ISPH', 'ABUK', 'SKPC', 'EAST', 'AMOC', 'ORWE'];

  function buildTicker() {
    var host = document.getElementById('tvw-ticker');
    if (!host) return;
    var syms = FEATURED.map(function (t) { return byTicker[t] ? { proName: 'EGX:' + t, title: t } : null; }).filter(Boolean);
    buildWidget(host, TV + 'embed-widget-ticker-tape.js',
      { symbols: syms, showSymbolLogo: true, isTransparent: true, displayMode: 'adaptive', colorTheme: 'light', locale: 'en' }, false);
  }

  function buildMinis() {
    var host = document.getElementById('tvw-minis');
    if (!host) return;
    host.innerHTML = '';
    FEATURED.slice(0, 8).forEach(function (t) {
      if (!byTicker[t]) return;
      var card = document.createElement('div'); card.className = 'tv-card tv-mini';
      var cont = document.createElement('div'); cont.className = 'tradingview-widget-container';
      card.appendChild(cont); host.appendChild(card);
      buildWidget(cont, TV + 'embed-widget-mini-symbol-overview.js',
        { symbol: 'EGX:' + t, width: '100%', height: '100%', locale: 'en', dateRange: '12M', colorTheme: 'light', isTransparent: true, autosize: true }, true);
    });
  }

  // --- init: shared ?stock= wins, then saved choice, else the COMI already
  // rendered server-side (no rebuild needed for the default). -------------
  (function init() {
    renderSectors();
    buildTicker();
    buildMinis();
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
