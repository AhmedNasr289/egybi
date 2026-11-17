/* trip.js — the shared core of the trip companion (2026-10-09).

   The home briefing, the route planner, the fair-price page and the name
   studio all answer one traveller's questions about ONE trip, so they share
   one small store and one set of helpers rather than four copies that drift.

   WHAT IS STORED, AND WHERE. Dates, the list of stops and a name for the
   dossier cover live in this browser's localStorage, and clearing site data
   clears it. Nothing is sent to a server unless a signed-in reader presses
   "Save to my account" in the planner (plan.js, since 2026-11-09); accounts
   are optional and everything here works without one.
   Every read and write is wrapped, because private windows and blocked storage
   throw — the tools must still work for a single visit with nothing saved.

   NO FIGURE IS INVENTED HERE. Heat comes from visit-climate.json (NASA POWER),
   holidays from calendar.json, the rate from fx-today.json; each helper hands
   back the source with the number so the page can print both. */
(function () {
  'use strict';

  var KEY = 'egybi.trip.v1';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
                'August', 'September', 'October', 'November', 'December'];
  var SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
               'Oct', 'Nov', 'Dec'];
  /* Russian month names: nominative for a month on its own ("Июль: ..."),
     genitive inside a date ("17 ноября 2026"). Arabic names come from
     egfmt.js (MONTHS_AR), which also writes Arabic dates. */
  var MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль',
                   'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  var MONTHS_RU_OF = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля',
                      'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  function pageLang() {
    var l = (document.documentElement && document.documentElement.getAttribute('lang')) || 'en';
    return l === 'ar' || l === 'ru' ? l : 'en';
  }
  /* A number or clock time in the page's own digits: Arabic-Indic on Arabic
     pages, plain elsewhere. egfmt formats only 'en' and 'ar', so the page's
     lang is never handed to it directly. */
  function pageDigits(x) {
    var f = F();
    return pageLang() === 'ar' && f ? f.digits(String(x), 'ar') : String(x);
  }
  /* A month's name (0 = January) in the page's language. */
  function monthName(i) {
    var l = pageLang(), f = F();
    if (l === 'ar' && f && f.MONTHS_AR) return f.MONTHS_AR[i];
    if (l === 'ru') return MONTHS_RU[i];
    return MONTHS[i];
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ------------------------------------------------------------ the store */
  function blank() { return { start: null, end: null, stops: [], name: '' }; }
  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return blank();
      var t = JSON.parse(raw);
      if (!t || typeof t !== 'object') return blank();
      t.stops = Array.isArray(t.stops) ? t.stops : [];
      return t;
    } catch (e) { return blank(); }
  }
  function save(t) {
    try { window.localStorage.setItem(KEY, JSON.stringify(t)); return true; }
    catch (e) { return false; }
  }

  /* ------------------------------------------------------------- the data
     Paths like 'data/visit-climate.json' are the SITE's, not the page's: the
     Arabic and Russian copies live one folder down (ar/, ru/), where the bare
     relative path would ask for ar/data/... - a 404, an empty briefing. So
     they resolve against this script's own address, which is always assets/,
     the way analytics.js finds api/. url() does the same for links the
     scripts write to pages that have no translated copy. */
  var ME = document.currentScript && document.currentScript.src;
  var ROOT = ME ? new URL('../', ME).href : '';
  // A translated page lists the pages that have a copy in its language
  // (<meta name="egybi-twins">, written by the generator), so a link a
  // script writes to one of them stays in the reader's language. English
  // pages carry no list, and every link goes to the site root as before.
  var TWINS_META = document.querySelector('meta[name="egybi-twins"]');
  var TWINS = TWINS_META ? (TWINS_META.getAttribute('content') || '').split(/\s+/) : [];
  var LANG = document.documentElement.getAttribute('lang') || 'en';
  function url(path) {
    if (!ROOT || /^([a-z]+:|\/|#)/i.test(path)) return path;
    var file = path.split(/[?#]/)[0];
    if (LANG !== 'en' && TWINS.indexOf(file) !== -1) return new URL(LANG + '/' + path, ROOT).href;
    return new URL(path, ROOT).href;
  }
  var cache = {};
  function getJSON(path) {
    if (!cache[path]) {
      cache[path] = fetch(url(path), { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error(path + ' ' + r.status);
        return r.json();
      });
    }
    return cache[path];
  }

  /* ------------------------------------------------------------- dates ---
     Dates are handled as plain YYYY-MM-DD strings and compared as UTC
     midnights, so a traveller in any timezone gets the same day count. */
  function parse(d) {
    var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(d || '');
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function iso(ms) { return new Date(ms).toISOString().slice(0, 10); }
  function addDays(d, n) { return iso(parse(d) + n * 864e5); }
  function today() { return iso(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())); }
  function nights(start, end) {
    var a = parse(start), b = parse(end);
    return a == null || b == null ? null : Math.round((b - a) / 864e5);
  }
  /* Dates and EGP amounts follow the site's Egyptian rules (EGYBI.fmt,
     assets/egfmt.js) when it has loaded, and the old local format if not. */
  function F() { return window.EGYBI && window.EGYBI.fmt; }
  function fmtDate(d) {
    var l = pageLang();
    if (l === 'ru' && typeof d === 'string') {
      var m = /^(\d{4})-(\d\d)-(\d\d)/.exec(d);
      if (m) return (+m[3]) + ' ' + MONTHS_RU_OF[+m[2] - 1] + ' ' + m[1];
    }
    if (F() && typeof d === 'string' && d) return F().dateOrRaw(d, l === 'ar' ? 'ar' : 'en', 'compact');
    var ms = parse(d);
    if (ms == null) return '';
    var x = new Date(ms);
    return x.getUTCDate() + ' ' + SHORT[x.getUTCMonth()] + ' ' + x.getUTCFullYear();
  }
  /* The months a trip touches, each with the number of days spent in it, so a
     trip of 28 March to 6 April reports both months instead of one. */
  function monthsOf(start, end) {
    var a = parse(start), b = parse(end);
    if (a == null || b == null || b < a) return [];
    var out = {}, order = [];
    for (var t = a; t <= b; t += 864e5) {
      var m = new Date(t).getUTCMonth();
      if (!(m in out)) { out[m] = 0; order.push(m); }
      out[m]++;
    }
    return order.map(function (m) { return { month: m, days: out[m] }; });
  }
  /* A sensible default for a first visit: a week, starting in four weeks. */
  function defaultDates() {
    var s = addDays(today(), 28);
    return { start: s, end: addDays(s, 7) };
  }

  /* ----------------------------------------------------------- the heat --
     The same five bands and the same colours as the visitor page, so a dot
     means the same thing on every map on the site. */
  /* Banded on the WHOLE degree the reader sees (21.7 shows as 22 and is
     coloured as 22), with the weather page's integer labels, so "22–27 °C"
     cannot be misread at its edge the way "22–28" could. */
  var BANDS = [
    { max: 22, colour: '#2C6FAD', label: '21 °C or less' },
    { max: 28, colour: '#4FA3A5', label: '22–27 °C' },
    { max: 34, colour: '#C9A227', label: '28–33 °C' },
    { max: 39, colour: '#D97B2B', label: '34–38 °C' },
    { max: Infinity, colour: '#B23A0F', label: '39 °C or more' }
  ];
  function whole(t) { return F() ? F().whole(t) : Math.round(t); }
  function band(t) {
    if (t == null) return null;
    t = whole(t);
    for (var i = 0; i < BANDS.length; i++) if (t < BANDS[i].max) return BANDS[i];
    return BANDS[BANDS.length - 1];
  }
  /* The planner's heat warning (2026-11-17). Given a stop's month rows
     ({month, max}) for the trip, returns the hottest month's afternoon when it
     reaches the TOP band (39 °C or more, the band the weather page colours
     darkest), with the time the site's gates open if its opening hours are
     known: { t: 41, opens: '06:00' }. Otherwise null. A pure function, so
     backend/verify/heat-warning.js can test it without a page. */
  function heatWarning(rows, hours) {
    var top = BANDS[BANDS.length - 1], worst = null;
    (rows || []).forEach(function (r) {
      if (r && r.max != null && (worst == null || r.max > worst.max)) worst = r;
    });
    if (!worst || band(worst.max) !== top) return null;
    var m = /\b\d\d:\d\d\b/.exec(String(hours || ''));
    return { t: whole(worst.max), opens: m ? m[0] : null };
  }
  /* Text on a band: white only where it clears AA, as visit.js measured. */
  function inkOn(colour) {
    return (colour === '#2C6FAD' || colour === '#B23A0F') ? '#fff' : '#1C1C1C';
  }
  function monthRow(site, m) {
    var ms = (site && site.months) || [];
    for (var i = 0; i < ms.length; i++) if (ms[i].month === m + 1) return ms[i];
    return null;
  }

  /* Straight-line distance. Labelled as such wherever it is shown: it is the
     floor on a journey, never the road distance. */
  function km(a, b) {
    var R = 6371, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a.lat * rad) * Math.cos(b.lat * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  /* The measured climate site nearest a stop, if one is close enough that its
     normals honestly describe the stop. 60 km keeps Giza's figures off Fayoum
     and Luxor's off Aswan. */
  var NEAR_KM = 60;
  function nearestSite(climate, p) {
    var best = null, bestKm = Infinity;
    ((climate && climate.sites) || []).forEach(function (s) {
      var d = km(p, s);
      if (d < bestKm) { bestKm = d; best = s; }
    });
    return best && bestKm <= NEAR_KM ? { site: best, km: bestKm } : null;
  }

  /* How to travel a planner leg (2026-11-17). getting-around.json names a few
     areas by the measured sites they sit near, and the legs between areas that
     a cited row of arrival.json describes. legRows returns that leg's row keys
     for stops a and b, in either order, or [] when no cited row covers it, so
     the planner never guesses a route. Pure functions, so
     backend/verify/leg-rows.js can test them without a page. */
  function areaOf(guide, climate, p) {
    var sites = (climate && climate.sites) || [], hit = null;
    ((guide && guide.areas) || []).forEach(function (ar) {
      (ar.near || []).forEach(function (k) {
        var s = sites.filter(function (x) { return x.key === k; })[0];
        if (!hit && s && km(p, s) <= ar.radius_km) hit = ar.key;
      });
    });
    return hit;
  }
  function legRows(guide, climate, a, b) {
    var x = areaOf(guide, climate, a), y = areaOf(guide, climate, b);
    if (!x || !y || x === y) return [];
    var leg = ((guide && guide.legs) || []).filter(function (l) {
      var w = l.between || [];
      return (w[0] === x && w[1] === y) || (w[0] === y && w[1] === x);
    })[0];
    return leg ? (leg.rows || []).slice() : [];
  }

  /* ---------------------------------------------------------- holidays ---
     Every event whose window overlaps the trip, lunar ones flagged as
     expected. Overlap uses the widest edge of each range, so an Eid that might
     start the day after the trip ends is still mentioned. */
  function eventsIn(calendar, start, end) {
    var a = parse(start), b = parse(end);
    if (a == null || b == null) return [];
    return ((calendar && calendar.events) || []).filter(function (e) {
      var s = parse(e.start), t = parse(e.end_latest || e.end || e.start);
      return s != null && t != null && s <= b && t >= a;
    });
  }

  /* ---------------------------------------------------------- the rate --- */
  function rate(fx, code) {
    var rs = (fx && fx.rates) || [];
    for (var i = 0; i < rs.length; i++) if (rs[i].code === code) return rs[i].egp;
    return null;
  }
  /* An exchange rate: always two decimals, "EGP 54.77". */
  function rateText(r) {
    if (r == null || !isFinite(r)) return '—';
    return F() ? F().rate(r, 'en') : 'EGP ' + Number(r).toFixed(2);
  }
  function money(n, cur) {
    if (n == null) return '—';
    if (cur === 'EGP' && F() && isFinite(n)) return F().money(n, 'en');
    var d = n >= 100 ? 0 : (n >= 10 ? 1 : 2);
    return (cur === 'EGP' ? 'EGP ' : (cur === 'USD' ? '$' : cur === 'EUR' ? '€' : cur === 'GBP' ? '£' : cur + ' ')) +
      Number(n).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: 0 });
  }

  window.EGYBI = window.EGYBI || {};
  window.EGYBI.trip = {
    load: load, save: save, blank: blank, getJSON: getJSON, url: url,
    parse: parse, iso: iso, addDays: addDays, today: today, nights: nights,
    fmtDate: fmtDate, monthsOf: monthsOf, defaultDates: defaultDates,
    BANDS: BANDS, band: band, inkOn: inkOn, monthRow: monthRow, heatWarning: heatWarning,
    km: km, nearestSite: nearestSite, NEAR_KM: NEAR_KM, areaOf: areaOf, legRows: legRows,
    eventsIn: eventsIn, rate: rate, rateText: rateText, money: money, whole: whole,
    MONTHS: MONTHS, SHORT: SHORT, esc: esc, monthName: monthName, pageLang: pageLang, pageDigits: pageDigits
  };
}());
