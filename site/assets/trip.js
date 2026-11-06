/* trip.js — the shared core of the trip companion (2026-10-09).

   The home briefing, the route planner, the fair-price page and the name
   studio all answer one traveller's questions about ONE trip, so they share
   one small store and one set of helpers rather than four copies that drift.

   WHAT IS STORED, AND WHERE. Dates, the list of stops and a name for the
   dossier cover live in this browser's localStorage and nowhere else: nothing
   is sent to a server, there is no account, and clearing site data clears it.
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

  /* ------------------------------------------------------------- the data */
  var cache = {};
  function getJSON(path) {
    if (!cache[path]) {
      cache[path] = fetch(path, { cache: 'no-cache' }).then(function (r) {
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
    if (F() && typeof d === 'string' && d) return F().dateOrRaw(d, 'en', 'compact');
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
  var BANDS = [
    { max: 22, colour: '#2C6FAD', label: 'under 22 °C' },
    { max: 28, colour: '#4FA3A5', label: '22–28 °C' },
    { max: 34, colour: '#C9A227', label: '28–34 °C' },
    { max: 39, colour: '#D97B2B', label: '34–39 °C' },
    { max: Infinity, colour: '#B23A0F', label: '39 °C and above' }
  ];
  function band(t) {
    if (t == null) return null;
    for (var i = 0; i < BANDS.length; i++) if (t < BANDS[i].max) return BANDS[i];
    return BANDS[BANDS.length - 1];
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
    load: load, save: save, blank: blank, getJSON: getJSON,
    parse: parse, iso: iso, addDays: addDays, today: today, nights: nights,
    fmtDate: fmtDate, monthsOf: monthsOf, defaultDates: defaultDates,
    BANDS: BANDS, band: band, inkOn: inkOn, monthRow: monthRow,
    km: km, nearestSite: nearestSite, NEAR_KM: NEAR_KM,
    eventsIn: eventsIn, rate: rate, rateText: rateText, money: money,
    MONTHS: MONTHS, SHORT: SHORT, esc: esc
  };
}());
