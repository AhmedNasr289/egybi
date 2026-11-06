/* egfmt.js: Egyptian formatting for the browser, exposed as EGYBI.fmt.

   The same rules as backend/pipeline/pages/egfmt.py, which writes the
   generated pages. backend/pipeline/tests/egfmt_cases.json holds the cases
   both must reproduce byte for byte (backend/verify/egfmt-cases.js runs them
   against this file), so the two cannot drift apart.

   English: Western digits, "EGP 1,234", "6 Nov 2026", 24-hour time.
   Arabic:  Arabic-Indic digits, "١٬٢٣٤ جنيه", "٦ نوفمبر ٢٠٢٦", "٧:٠٥ م".
   In Arabic a number, range or percentage sits in a left-to-right isolate
   (U+2066 ... U+2069); without it "+13.5%" shows as "%13.5+".

   Digits and grouping are composed here rather than by Intl.NumberFormat,
   whose Arabic output differs between browsers (some add invisible direction
   marks), which would break the byte-for-byte match. Intl is used only to
   read a timestamp in Cairo time. Rounding is half away from zero, on the
   decimal string, so 1.005 rounds to 1.01 as it does in the Python twin. */
(function (root) {
  'use strict';
  var LRI = '\u2066', PDI = '\u2069';
  var AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  var AR_THOUSANDS = '٬', AR_DECIMAL = '٫', AR_PERCENT = '٪';
  var MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  var MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو',
    'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var POUND_AR = 'جنيه';

  function lang_(lang) {
    if (lang !== 'en' && lang !== 'ar') throw new Error("lang must be 'en' or 'ar', not " + lang);
    return lang;
  }
  function isolate(s) { return LRI + s + PDI; }
  function digits(s, lang) {
    return lang_(lang) === 'ar' ? String(s).replace(/[0-9]/g, function (d) { return AR[+d]; }) : String(s);
  }

  /* Half away from zero, via the exponent form of the decimal string, so
     1.005 is rounded as 100.5 (not 100.49999...) like Python's Decimal. */
  function round(x, places) {
    var n = Number(x);
    if (!isFinite(n)) throw new Error('not a number: ' + x);
    var a = Math.abs(n);
    var r = Number(Math.round(Number(a + 'e' + places)) + 'e-' + places);
    return n < 0 ? -r : r;
  }

  function fixed(x, lang, places) {
    var r = round(x, places);
    var neg = r < 0;
    var parts = Math.abs(r).toFixed(places).split('.');
    var intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    var s = parts.length > 1 ? intPart + '.' + parts[1] : intPart;
    if (lang_(lang) === 'ar') s = s.replace(/,/g, AR_THOUSANDS).replace('.', AR_DECIMAL);
    s = digits(s, lang);
    return neg && r !== 0 ? '-' + s : s;
  }

  function num(x, lang, maxPlaces) {
    if (maxPlaces == null) maxPlaces = 2;
    var s = fixed(x, lang, maxPlaces);
    var dec = lang === 'ar' ? AR_DECIMAL : '.';
    var zero = lang === 'ar' ? AR[0] : '0';
    if (s.indexOf(dec) !== -1) {
      while (s.charAt(s.length - 1) === zero) s = s.slice(0, -1);
      if (s.charAt(s.length - 1) === dec) s = s.slice(0, -1);
    }
    return s;
  }

  function moneyPlaces(egp) { return Math.abs(Number(egp)) >= 100 ? 0 : 2; }

  function money(egp, lang) {
    var v = num(egp, lang, moneyPlaces(egp));
    return lang_(lang) === 'en' ? 'EGP ' + v : isolate(v) + ' ' + POUND_AR;
  }

  function moneyRange(lo, hi, lang) {
    if (Number(lo) === Number(hi)) return money(lo, lang);
    var places = moneyPlaces(Math.max(Math.abs(Number(lo)), Math.abs(Number(hi))));
    var r = num(lo, lang, places) + '–' + num(hi, lang, places);
    return lang_(lang) === 'en' ? 'EGP ' + r : isolate(r) + ' ' + POUND_AR;
  }

  function rate(egpPerUnit, lang) {
    var v = fixed(egpPerUnit, lang, 2);
    return lang_(lang) === 'en' ? 'EGP ' + v : isolate(v) + ' ' + POUND_AR;
  }

  function pct(change, lang, places) {
    if (change == null) return '';
    if (places == null) places = 1;
    var r = round(change, places);
    var v = num(Math.abs(r), lang, places);
    var body = lang_(lang) === 'en' ? v + '%' : isolate(v + AR_PERCENT);
    if (r === 0) return body;
    return (r > 0 ? '▲ ' : '▼ ') + body;
  }

  /* {y, m, d, hh, mm, isDate}. A bare YYYY-MM-DD is a calendar date and is
     not moved; anything with a time is an instant, read in Cairo time. */
  var cairo = null;
  function parse(value) {
    var s = String(value).trim();
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return { y: +m[1], m: +m[2], d: +m[3], isDate: true };
    if (!/(Z|[+-]\d{2}:?\d{2})$/.test(s)) throw new Error('a timestamp needs a UTC offset to be put in Cairo time: ' + s);
    var t = new Date(s);
    if (isNaN(t)) throw new Error('not a date: ' + s);
    if (!cairo) {
      cairo = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', year: 'numeric', month: 'numeric',
        day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });
    }
    var p = {};
    cairo.formatToParts(t).forEach(function (x) { p[x.type] = x.value; });
    return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour % 24, mm: +p.minute, isDate: false };
  }

  function date(value, lang, style) {
    style = style || 'compact';
    if (style !== 'compact' && style !== 'prose') throw new Error("style must be 'compact' or 'prose', not " + style);
    var d = parse(value);
    if (lang_(lang) === 'ar') return digits(d.d + ' ' + MONTHS_AR[d.m - 1] + ' ' + d.y, 'ar');
    var mon = style === 'compact' ? MONTHS_EN[d.m - 1].slice(0, 3) : MONTHS_EN[d.m - 1];
    return d.d + ' ' + mon + ' ' + d.y;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function time(value, lang) {
    var t = parse(value);
    if (t.isDate) throw new Error('a time needs a timestamp, not a date: ' + value);
    if (lang_(lang) === 'en') return pad(t.hh) + ':' + pad(t.mm);
    var h12 = t.hh % 12 || 12;
    return digits(h12 + ':' + pad(t.mm), 'ar') + ' ' + (t.hh < 12 ? 'ص' : 'م');
  }

  var api = { isolate: isolate, digits: digits, fixed: fixed, num: num, money: money,
    moneyRange: moneyRange, rate: rate, pct: pct, date: date, time: time,
    MONTHS_EN: MONTHS_EN, MONTHS_AR: MONTHS_AR };
  root.EGYBI = root.EGYBI || {};
  root.EGYBI.fmt = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
