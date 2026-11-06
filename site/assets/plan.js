/* plan.js — the route planner and the printable Papyrus dossier.

   The reader builds a list of stops; the page answers, for each one, what the
   data actually holds: the measured heat in the months of the trip (from the
   nearest NASA POWER site, and only if one is within 60 km), the ground
   elevation where SRTM has it, and the straight-line distance from the last
   stop. Distances are labelled as straight lines everywhere because that is
   what they are — the floor on a journey, never the road.

   The map is the site's usual tile-free map: outlines and points from files in
   this repository, zero requests to any map provider. The plan lives in this
   browser's localStorage only (see trip.js). */
(function () {
  'use strict';
  var T = window.EGYBI && window.EGYBI.trip;
  if (!T) return;
  var esc = T.esc;
  function $(id) { return document.getElementById(id); }
  function mkx(name) {
    var mk = window.EGYBI && window.EGYBI.mapkit;
    var fn = mk && mk[name];
    return typeof fn === 'function' ? fn : function () { return null; };
  }

  var D = { climate: null, terrain: null, places: null, calendar: null };
  var S = { trip: T.load(), map: null, pins: null, line: null, sites: null, byLabel: {} };
  if (!S.trip.start || !S.trip.end) {
    var dd = T.defaultDates();
    S.trip.start = dd.start; S.trip.end = dd.end;
  }
  function save() { T.save(S.trip); }
  function settle(p) { return p.then(function (v) { return v; }, function () { return null; }); }
  function mainMonth() {
    var ms = T.monthsOf(S.trip.start, S.trip.end);
    return ms.length ? ms.slice().sort(function (a, b) { return b.days - a.days; })[0].month : null;
  }

  /* ---------------------------------------------------------------- dates */
  function initForm() {
    var s = $('planStart'), e = $('planEnd'), n = $('planName'), f = $('planForm'), note = $('planNote');
    s.value = S.trip.start; e.value = S.trip.end; n.value = S.trip.name || '';
    f.addEventListener('submit', function (ev) { ev.preventDefault(); });
    function apply() {
      if (!T.parse(s.value) || !T.parse(e.value)) { note.className = 'form-note error'; note.textContent = 'Pick both dates.'; return; }
      if (T.parse(e.value) < T.parse(s.value)) { note.className = 'form-note error'; note.textContent = 'The leaving date is before the arriving date.'; return; }
      note.className = 'form-note'; note.textContent = '';
      S.trip.start = s.value; S.trip.end = e.value; save(); renderAll();
    }
    s.addEventListener('change', apply); e.addEventListener('change', apply);
    n.addEventListener('input', function () { S.trip.name = n.value.slice(0, 40); save(); renderDossier(); });
  }

  /* ------------------------------------------------------------------ map */
  function initMap() {
    if (!window.L || !window.EGYBI.mapkit) return;
    var m = window.EGYBI.mapkit.create('planMap', {
      locator: window.EGYBI_EGYPT_GEO || null,
      credit: ['geoboundaries', 'osm', 'power'],
      label: 'Map of Egypt showing the stops in your plan, numbered in order'
    });
    if (!m) return;
    mkx('outline')(m, window.EGYBI_EGYPT_GEO);
    var land = L.geoJSON(window.EGYBI_EGYPT_GEO, {
      style: function () { return { color: '#C7BCA1', weight: 1, fillColor: '#EFE7D4', fillOpacity: 1 }; },
      interactive: false
    }).addTo(m);
    mkx('addLabels')(m, land, function (p) { return p && p.name; },
                     { minPx: 62, maxLabels: 14, className: 'mk-label-sm' });
    var home = L.latLngBounds([[22.0, 24.7], [31.7, 36.9]]);
    m.fitBounds(home, { padding: [10, 10] });
    window.EGYBI.mapkit.setHome(m, home);
    S.map = m;
  }

  function paintMap() {
    if (!S.map) return;
    if (S.sites) S.map.removeLayer(S.sites);
    if (S.pins) S.map.removeLayer(S.pins);
    if (S.line) S.map.removeLayer(S.line);
    var mm = mainMonth();
    // The 18 measured sites, coloured by heat in the trip's main month, as a
    // quiet layer the reader can click to add.
    S.sites = L.layerGroup();
    ((D.climate && D.climate.sites) || []).forEach(function (site) {
      var r = mm == null ? null : T.monthRow(site, mm);
      var bd = T.band(r && r.t_daily_max);
      var dot = L.circleMarker([site.lat, site.lon], {
        radius: 7, weight: 2, color: '#fff', fillColor: bd ? bd.colour : '#8a8a8a', fillOpacity: 0.85
      });
      dot.bindTooltip('<strong>' + esc(site.name) + '</strong><br>' +
        (r && r.t_daily_max != null ? T.MONTHS[mm] + ': about ' + Math.round(r.t_daily_max) + ' °C by day' : '') +
        '<br>Click to add', { direction: 'top' });
      dot.on('click', function () { addSite(site.key); });
      S.sites.addLayer(dot);
    });
    S.sites.addTo(S.map);
    // The plan itself: numbered pins joined by a dashed straight line.
    S.pins = L.layerGroup();
    var pts = [];
    S.trip.stops.forEach(function (st, i) {
      var icon = L.divIcon({ className: 'plan-pin', html: '<b>' + (i + 1) + '</b>', iconSize: [26, 26], iconAnchor: [13, 13] });
      var mk = L.marker([st.lat, st.lon], { icon: icon, keyboard: false, title: (i + 1) + '. ' + st.name });
      mk.bindTooltip((i + 1) + '. ' + esc(st.name), { direction: 'top', offset: [0, -12] });
      S.pins.addLayer(mk);
      pts.push([st.lat, st.lon]);
    });
    S.pins.addTo(S.map);
    if (pts.length > 1) {
      S.line = L.polyline(pts, { color: '#0E2A5E', weight: 2.5, dashArray: '6 7', opacity: 0.8, interactive: false }).addTo(S.map);
    } else S.line = null;
  }

  /* ---------------------------------------------------------------- stops */
  /* A "planner use" - the pivot's one metric - is a visit that adds a stop.
     Every way in (the chips, the search, a link from Places or a visit page)
     goes through addStop, so the event is sent here and only here.
     EGYBI_TRACK (analytics.js) sends each event at most once per page load and
     carries no identity; if analytics did not load, or the reader has
     Do-Not-Track on, nothing is sent and nothing breaks. */
  function track(event) {
    if (typeof window.EGYBI_TRACK === 'function') window.EGYBI_TRACK(event);
  }
  function addStop(st) {
    if (S.trip.stops.some(function (x) { return x.id === st.id; })) {
      announce(st.name + ' is already in your plan.'); return;
    }
    st.days = st.days || 1;
    S.trip.stops.push(st); save(); renderAll();
    announce(st.name + ' added as stop ' + S.trip.stops.length + '.');
    track('plan_stop_added');
    if (S.trip.stops.length >= 2) track('plan_route_built');
  }
  function addSite(key) {
    var site = ((D.climate && D.climate.sites) || []).filter(function (s) { return s.key === key; })[0];
    if (site) addStop({ id: 'site:' + key, name: site.name, name_ar: site.name_ar, lat: site.lat, lon: site.lon, days: 1 });
  }
  function announce(msg) { var a = $('planLive'); if (a) a.textContent = msg; }

  function initChips() {
    var host = $('siteChips');
    if (!host || !D.climate) return;
    host.innerHTML = D.climate.sites.map(function (s) {
      return '<button type="button" class="chip" data-site="' + esc(s.key) + '">' + esc(s.name) + '</button>';
    }).join('');
    host.addEventListener('click', function (e) {
      var b = e.target.closest('[data-site]');
      if (b) addSite(b.getAttribute('data-site'));
    });
  }

  var KIND = { antiquity: 'ancient site', museum: 'museum', settlement: 'town or city', airport: 'airport' };
  function initSearch() {
    var dl = $('placeOptions'), inp = $('placeSearch'), btn = $('placeAdd');
    if (!dl || !D.places) return;
    var seen = {};
    dl.innerHTML = D.places.places.map(function (p) {
      var label = p.name + ' — ' + (KIND[p.kind] || p.kind) + (p.gov ? ', ' + p.gov : '');
      if (seen[label]) return '';
      seen[label] = 1; S.byLabel[label] = p;
      return '<option value="' + esc(label) + '"></option>';
    }).join('');
    function go() {
      var p = S.byLabel[inp.value];
      if (!p) { announce('Choose a place from the list as you type.'); return; }
      addStop({ id: 'place:' + p.name + '@' + p.lat.toFixed(3) + ',' + p.lon.toFixed(3), name: p.name, name_ar: p.name_ar,
                lat: p.lat, lon: p.lon, kind: p.kind, gov: p.gov, days: 1 });
      inp.value = '';
    }
    btn.addEventListener('click', go);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  }

  function heatFor(st) {
    var near = T.nearestSite(D.climate, st), mm = T.monthsOf(S.trip.start, S.trip.end);
    if (!near) return { text: 'No measured climate site within ' + T.NEAR_KM + ' km, so no heat figure is shown.', rows: [] };
    var rows = mm.map(function (x) {
      var r = T.monthRow(near.site, x.month);
      return r ? { month: x.month, max: r.t_daily_max, min: r.t_daily_min, rain: r.rain_mm_day } : null;
    }).filter(Boolean);
    var where = near.km < 3 ? '' : ' (measured at ' + near.site.name + ', ' + Math.round(near.km) + ' km away)';
    var text = rows.map(function (r) {
      return T.MONTHS[r.month] + ': about ' + Math.round(r.max) + ' °C by day, ' + Math.round(r.min) + ' °C at night';
    }).join('; ') + where + '.';
    return { text: text, rows: rows, site: near.site };
  }
  function elevationFor(st) {
    if (!D.terrain || st.id.indexOf('site:') !== 0) return null;
    var k = st.id.slice(5);
    var t = D.terrain.sites.filter(function (s) { return s.key === k; })[0];
    return t ? t.elevation_m : null;
  }

  function renderStops() {
    var ul = $('stopList'), sum = $('planSum');
    if (!ul) return;
    var st = S.trip.stops;
    if (!st.length) {
      ul.innerHTML = '<li class="sheet stop" style="display:block;"><p style="margin:0;">No stops yet. Click a site on the map, use the buttons above, or search the 897 mapped places.</p></li>';
    } else {
      ul.innerHTML = st.map(function (x, i) {
        var h = heatFor(x), first = h.rows[0], bd = first ? T.band(first.max) : null;
        var leg = i > 0 ? '<p class="leg">&darr; ' + Math.round(T.km(st[i - 1], x)) + ' km in a straight line from ' + esc(st[i - 1].name) + '</p>' : '';
        return leg + '<li class="sheet stop">' +
          '<span class="stop-n" aria-hidden="true">' + (i + 1) + '</span>' +
          '<div><h3>' + esc(x.name) + (x.name_ar ? ' <span class="v-ar" lang="ar" dir="rtl">' + esc(x.name_ar) + '</span>' : '') + '</h3>' +
          (bd ? '<span class="heat-chip" style="background:' + bd.colour + ';color:' + T.inkOn(bd.colour) + '">' + Math.round(first.max) + '&nbsp;°C</span> ' : '') +
          '<p>' + esc(h.text) + '</p></div>' +
          '<div class="stop-ctl"><label class="sr-only" for="days' + i + '">Days at ' + esc(x.name) + '</label>' +
          '<input id="days' + i + '" type="number" min="1" max="30" value="' + (x.days || 1) + '" data-days="' + i + '"> <span aria-hidden="true">days</span>' +
          '<button type="button" class="icon-btn" data-up="' + i + '" aria-label="Move ' + esc(x.name) + ' earlier"' + (i === 0 ? ' disabled' : '') + '>&uarr;</button>' +
          '<button type="button" class="icon-btn" data-down="' + i + '" aria-label="Move ' + esc(x.name) + ' later"' + (i === st.length - 1 ? ' disabled' : '') + '>&darr;</button>' +
          '<button type="button" class="icon-btn" data-del="' + i + '" aria-label="Remove ' + esc(x.name) + '">&times;</button></div></li>';
      }).join('');
    }
    var days = st.reduce(function (a, x) { return a + (+x.days || 0); }, 0);
    var nights = T.nights(S.trip.start, S.trip.end);
    var total = st.length > 1 ? st.slice(1).reduce(function (a, x, i) { return a + T.km(st[i], x); }, 0) : 0;
    sum.textContent = st.length + ' stop' + (st.length === 1 ? '' : 's') + ' · ' + days + ' day' + (days === 1 ? '' : 's') +
      ' assigned to a trip of ' + nights + ' night' + (nights === 1 ? '' : 's') +
      (total ? ' · ' + Math.round(total).toLocaleString('en-US') + ' km of straight lines between them' : '') +
      (days > nights + 1 ? ' — that is more days than the trip has.' : '.');
  }
  function initStopEvents() {
    var ul = $('stopList');
    ul.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var st = S.trip.stops, i;
      if (b.hasAttribute('data-del')) { i = +b.getAttribute('data-del'); announce(st[i].name + ' removed.'); st.splice(i, 1); }
      else if (b.hasAttribute('data-up')) { i = +b.getAttribute('data-up'); if (i > 0) st.splice(i - 1, 0, st.splice(i, 1)[0]); }
      else if (b.hasAttribute('data-down')) { i = +b.getAttribute('data-down'); if (i < st.length - 1) st.splice(i + 1, 0, st.splice(i, 1)[0]); }
      else return;
      save(); renderAll();
    });
    ul.addEventListener('change', function (e) {
      var inp = e.target.closest('[data-days]');
      if (!inp) return;
      var v = Math.max(1, Math.min(30, parseInt(inp.value, 10) || 1));
      S.trip.stops[+inp.getAttribute('data-days')].days = v;
      save(); renderStops(); renderDossier();
    });
  }

  /* -------------------------------------------------------------- dossier */
  function renderDossier() {
    var host = $('dossier');
    if (!host) return;
    var st = S.trip.stops, cart = window.EGYBI.cartouche;
    var name = (S.trip.name || '').trim();
    var ev = T.eventsIn(D.calendar, S.trip.start, S.trip.end);
    var cover = '<div class="sheet dossier-cover" style="text-align:center;padding:34px 22px;">' +
      '<span class="seal" aria-hidden="true"><span data-glyph="ankh"></span></span>' +
      '<p class="kicker">The Papyrus &middot; trip dossier</p>' +
      (name && cart ? '<div style="margin:6px 0 14px;">' + cart.html(name, 'cartouche-lg') + '</div>' : '') +
      '<h2 style="margin:0 0 6px;">' + (name ? esc(name) + '&rsquo;s Egypt' : 'Your Egypt') + '</h2>' +
      '<p style="margin:0;color:var(--ink-soft);">' + esc(T.fmtDate(S.trip.start)) + ' &ndash; ' + esc(T.fmtDate(S.trip.end)) +
      ' &middot; ' + st.length + ' stop' + (st.length === 1 ? '' : 's') + '</p></div>';
    var stops = st.map(function (x, i) {
      var h = heatFor(x), el = elevationFor(x);
      var leg = i > 0 ? Math.round(T.km(st[i - 1], x)) + ' km in a straight line from ' + esc(st[i - 1].name) + '. ' : '';
      return '<div class="sheet" style="margin-top:16px;"><p class="kicker">Stop ' + (i + 1) + ' &middot; ' + (x.days || 1) + ' day' + ((x.days || 1) === 1 ? '' : 's') + '</p>' +
        '<h3 style="margin:0 0 8px;color:var(--blue-deep);">' + esc(x.name) + (x.name_ar ? ' <span class="v-ar" lang="ar" dir="rtl">' + esc(x.name_ar) + '</span>' : '') + '</h3>' +
        '<p style="margin:0 0 6px;">' + leg + esc(h.text) + (el != null ? ' Ground elevation ' + Math.round(el) + ' m (SRTM).' : '') + '</p>' +
        '<p class="chart-cap" style="margin:0;">' + x.lat.toFixed(4) + ', ' + x.lon.toFixed(4) + (x.gov ? ' &middot; ' + esc(x.gov) : '') + '</p></div>';
    }).join('');
    var events = ev.length ? '<div class="sheet" style="margin-top:16px;"><p class="kicker">Inside your dates</p><ul class="event-list">' +
      ev.map(function (e) {
        return '<li><strong>' + esc(e.name) + '</strong> &middot; ' + esc(T.fmtDate(e.start)) +
          (e.start !== (e.end_latest || e.end) ? ' &ndash; ' + esc(T.fmtDate(e.end_latest || e.end)) : '') +
          (e.status === 'expected' ? '<span class="expected">expected</span>' : '') + '</li>';
      }).join('') + '</ul></div>' : '';
    var sources = '<p class="chart-cap" style="margin-top:18px;">Heat: ' + esc((D.climate || {}).source || 'NASA POWER') +
      ', mean daily maximum and minimum ' + esc((D.climate || {}).normal_window || '2001–2020') + ' — a long-run average, not a forecast. ' +
      'Places: OpenStreetMap contributors (ODbL). Holidays: calendar.json, compiled ' + esc(T.fmtDate((D.calendar || {}).as_of)) +
      ', Islamic dates expected. Distances are straight lines, not roads. Printed from egybi.com/plan.html.</p>';
    host.innerHTML = cover + (st.length ? stops : '<p class="chart-cap" style="margin-top:14px;">Add stops above and they appear here, one sheet each.</p>') + events + sources;
  }

  function renderAll() { renderStops(); paintMap(); renderDossier(); }

  function init() {
    initForm(); initMap(); initStopEvents();
    $('printPlan').addEventListener('click', function () { window.print(); });
    $('clearPlan').addEventListener('click', function () {
      if (!S.trip.stops.length) return;
      S.trip.stops = []; save(); renderAll(); announce('All stops removed.');
    });
    Promise.all([
      settle(T.getJSON('data/visit-climate.json')), settle(T.getJSON('data/visit-terrain.json')),
      settle(T.getJSON('data/geo-places.json')), settle(T.getJSON('data/calendar.json'))
    ]).then(function (r) {
      D.climate = r[0]; D.terrain = r[1]; D.places = r[2]; D.calendar = r[3];
      initChips(); initSearch();
      var q = new URLSearchParams(location.search);
      if (q.get('add')) addSite(q.get('add'));
      // From a place card on places.html: name and coordinates in the URL.
      var lat = parseFloat(q.get('lat')), lon = parseFloat(q.get('lon'));
      if (q.get('place') && isFinite(lat) && isFinite(lon) && lat > 21 && lat < 32.5 && lon > 24 && lon < 37.5) {
        addStop({ id: 'place:' + q.get('place').slice(0, 80) + '@' + lat.toFixed(3) + ',' + lon.toFixed(3),
                  name: q.get('place').slice(0, 80), lat: lat, lon: lon,
                  gov: (q.get('gov') || '').slice(0, 40) || undefined, kind: (q.get('kind') || '').slice(0, 20) || undefined, days: 1 });
      }
      if (q.get('add') || q.get('place')) history.replaceState(null, '', location.pathname);
      renderAll();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
