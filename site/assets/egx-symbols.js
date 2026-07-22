/* egx-symbols.js — the single source of EGX companies for the whole site.
   Both the stocks page (picker + ticker + mini-charts) and the homepage
   ticker read this one list, so a company added or fixed here updates
   everywhere. Only real, well-known EGX ticker codes are listed; any other
   valid EGX ticker still works via the stocks-page free-text field. The codes
   are worth a live spot-check on TradingView. Information/education only. */
(function () {
  'use strict';
  var LIST = [
    // Banks & financial services
    { t: 'COMI', en: 'Commercial International Bank (CIB)', ar: 'البنك التجاري الدولي', s: 'Banks' },
    { t: 'HRHO', en: 'EFG Holding (Hermes)', ar: 'المجموعة المالية هيرميس القابضة', s: 'Financials' },
    { t: 'QNBE', en: 'QNB Alahli', ar: 'بنك قطر الوطني الأهلي', s: 'Banks' },
    { t: 'ADIB', en: 'Abu Dhabi Islamic Bank Egypt', ar: 'مصرف أبوظبي الإسلامي مصر', s: 'Banks' },
    { t: 'CIEB', en: 'Crédit Agricole Egypt', ar: 'كريدي أجريكول مصر', s: 'Banks' },
    { t: 'SAUD', en: 'Al Baraka Bank Egypt', ar: 'بنك البركة مصر', s: 'Banks' },
    { t: 'FAIT', en: 'Faisal Islamic Bank of Egypt', ar: 'بنك فيصل الإسلامي المصري', s: 'Banks' },
    { t: 'HDBK', en: 'Housing & Development Bank', ar: 'بنك التعمير والإسكان', s: 'Banks' },
    { t: 'EGBE', en: 'Egyptian Gulf Bank', ar: 'البنك المصري الخليجي', s: 'Banks' },
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
    { t: 'GBCO', en: 'GB Corp (GB Auto)', ar: 'جي بي كورب', s: 'Automotive' },
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

  // Spotlight set (spread across sectors) for the ticker tape and mini-charts.
  var FEATURED = ['COMI', 'HRHO', 'QNBE', 'SWDY', 'ETEL', 'FWRY', 'TMGH', 'MNHD',
                  'JUFO', 'EFID', 'ISPH', 'ABUK', 'SKPC', 'EAST', 'AMOC', 'ORWE'];

  var byTicker = {};
  LIST.forEach(function (r) { byTicker[r.t] = r; });

  // Build a TradingView ticker tape into an element from shared tickers.
  // (Self-contained: creates its own widget script, so any page can call it.)
  function tickerTape(elId, tickers) {
    var el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = '';
    var w = document.createElement('div');
    w.className = 'tradingview-widget-container__widget';
    el.appendChild(w);
    var cr = document.createElement('div');
    cr.className = 'tradingview-widget-copyright';
    var a = document.createElement('a');
    a.href = 'https://www.tradingview.com/'; a.rel = 'noopener nofollow'; a.target = '_blank';
    a.textContent = 'Data by TradingView';
    cr.appendChild(a); el.appendChild(cr);
    var syms = (tickers || FEATURED).map(function (t) {
      return byTicker[t] ? { proName: 'EGX:' + t, title: t } : null;
    }).filter(Boolean);
    var s = document.createElement('script');
    s.type = 'text/javascript'; s.async = true;
    s.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    s.textContent = JSON.stringify({ symbols: syms, showSymbolLogo: true, isTransparent: true, displayMode: 'adaptive', colorTheme: 'light', locale: 'en' });
    el.appendChild(s);
  }

  window.EGYBI_EGX = { list: LIST, featured: FEATURED, byTicker: byTicker, tickerTape: tickerTape };
})();
