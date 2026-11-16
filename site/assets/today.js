/* EgyBI — "Today at this site" on the visit pages (Round 4, R4-1, 2026-11-16).

   A tourist on the day wants three answers: when does the light start and end
   today, how hot does a normal afternoon get this month, and how long is left.
   Everything here is computed in the browser from what the page already holds:

   - Sun: the NOAA Global Monitoring Laboratory equations, the same ones
     backend/pipeline/sun_times.py uses for the monthly table (sunrise and
     sunset at zenith 90.833 deg, golden light while the sun is under 6 deg).
     backend/verify/today-sun.js checks this port against the Python for all 18
     sites on 12 dates, to within a minute.
   - Clock: Egypt time from the browser's own time-zone database
     (Intl, "Africa/Cairo"), so summer time is the database's rule, never ours.
   - Heat: the site's monthly normal for the current month, labelled a normal,
     never a forecast.
   Nothing is invented: no opening hours, prices or crowd levels.
   Without JavaScript the card keeps its static sentence pointing to the table. */
(function (root) {
  'use strict';
  var RAD = Math.PI / 180, SUNRISE_ZENITH = 90.833, GOLDEN_ELEVATION = 6.0;

  function dayOfYear(y, m, d) {
    return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;
  }
  function leap(y) { return (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)); }
  function terms(y, m, d, utcMin) {
    var g = 2 * Math.PI / (leap(y) ? 366 : 365) * (dayOfYear(y, m, d) - 1 + (utcMin / 60 - 12) / 24);
    var eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g)
             - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    var decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g)
             - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g)
             - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    return [eq, decl];
  }
  /* UTC minutes after midnight of the crossing, refined three times as the Python does. */
  function crossing(y, m, d, lat, lon, zenith, morning) {
    var t = 720;
    for (var i = 0; i < 3; i++) {
      var tr = terms(y, m, d, t), latR = lat * RAD;
      var cosHa = Math.cos(zenith * RAD) / (Math.cos(latR) * Math.cos(tr[1])) - Math.tan(latR) * Math.tan(tr[1]);
      if (cosHa < -1 || cosHa > 1) return null;
      var ha = Math.acos(cosHa) / RAD;
      t = 720 - 4 * (lon + (morning ? ha : -ha)) - tr[0];
    }
    return t;
  }
  /* The four edges of the day as UTC epoch milliseconds, for a calendar date in Egypt. */
  function dayLight(lat, lon, y, m, d) {
    var base = Date.UTC(y, m - 1, d), zg = 90 - GOLDEN_ELEVATION;
    var out = {
      sunrise: crossing(y, m, d, lat, lon, SUNRISE_ZENITH, true),
      goldenMorningEnd: crossing(y, m, d, lat, lon, zg, true),
      goldenEveningStart: crossing(y, m, d, lat, lon, zg, false),
      sunset: crossing(y, m, d, lat, lon, SUNRISE_ZENITH, false)
    };
    for (var k in out) { if (out[k] == null) return null; out[k] = base + out[k] * 60000; }
    return out;
  }
  var api = { dayLight: dayLight };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  root.EgybiSun = api;

  // ---- the card -------------------------------------------------------------
  if (typeof document === 'undefined') return;
  var card = document.querySelector('[data-today]');
  if (!card || !window.Intl) return;
  var lat = parseFloat(card.getAttribute('data-lat')), lon = parseFloat(card.getAttribute('data-lon'));
  var normals = [];
  try { normals = JSON.parse(card.getAttribute('data-normals') || '[]'); } catch (e) { normals = []; }
  if (!isFinite(lat) || !isFinite(lon)) return;
  var TZ = 'Africa/Cairo';
  var hm = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
  var dayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
  var parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function egyptDate(ms) { var p = parts.format(new Date(ms)).split('-'); return { y: +p[0], m: +p[1], d: +p[2] }; }
  function span(ms) {
    var min = Math.max(0, Math.round(ms / 60000)), h = Math.floor(min / 60), mm = min % 60;
    return (h ? h + ' h ' : '') + mm + ' min';
  }

  var body = card.querySelector('.today-body') || card;
  function render() {
    var now = Date.now(), t = egyptDate(now);
    var L = dayLight(lat, lon, t.y, t.m, t.d);
    if (!L) return;
    body.textContent = '';
    body.appendChild(el('p', 'today-date', dayFmt.format(new Date(now)) + ' · ' + hm.format(new Date(now)) + ' in Egypt'));
    var grid = el('dl', 'today-grid');
    [['Sunrise', L.sunrise], ['Golden light until', L.goldenMorningEnd],
     ['Golden light from', L.goldenEveningStart], ['Sunset', L.sunset]].forEach(function (r) {
      var cell = el('div', 'today-cell');
      cell.appendChild(el('dt', null, r[0]));
      cell.appendChild(el('dd', null, hm.format(new Date(r[1]))));
      grid.appendChild(cell);
    });
    body.appendChild(grid);
    var status;
    if (now < L.sunrise) status = 'Before sunrise. The sun rises in ' + span(L.sunrise - now) + '.';
    else if (now < L.goldenMorningEnd) status = 'Golden light now, for another ' + span(L.goldenMorningEnd - now) + '.';
    else if (now < L.goldenEveningStart) status = 'Golden light returns in ' + span(L.goldenEveningStart - now) + '; sunset in ' + span(L.sunset - now) + '.';
    else if (now < L.sunset) status = 'Golden light now. Sunset in ' + span(L.sunset - now) + '.';
    else {
      var tm = egyptDate(now + 86400000), N = dayLight(lat, lon, tm.y, tm.m, tm.d);
      status = 'After sunset.' + (N ? ' Tomorrow the sun rises at ' + hm.format(new Date(N.sunrise)) + '.' : '');
    }
    body.appendChild(el('p', 'today-status', status));
    var n = normals[t.m - 1];
    if (n && n.length === 2) {
      body.appendChild(el('p', 'today-heat', 'A normal ' + MONTHS[t.m - 1] + ' afternoon here reaches about ' + n[0] +
        ' °C, and a normal night falls to about ' + n[1] + ' °C. A long-run normal, not a forecast.'));
    }
  }
  render();
  card.setAttribute('data-today-ready', '1');
  setInterval(render, 60000);
}(typeof window !== 'undefined' ? window : this));
