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
  /* A governorate's name as the site spells it ("Fayoum"), for DISPLAY
     only; the data's own spelling stays the join key. */
  function gv(n) {
    var F = window.EGYBI && window.EGYBI.fmt;
    return F ? F.govName(n, document.documentElement.getAttribute('lang') || 'en') : (n == null ? '' : String(n));
  }
  var T = window.EGYBI && window.EGYBI.trip;
  if (!T) return;
  var esc = T.esc;
  // Translated text for what this script writes; the build collects every
  // quoted call to it here into the Arabic and Russian tables (pages/i18n.py).
  var t = (window.EGYBI && window.EGYBI.t) || function (s) { return s; };
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
      if (!T.parse(s.value) || !T.parse(e.value)) { note.className = 'form-note error'; note.textContent = t('Pick both dates.'); return; }
      if (T.parse(e.value) < T.parse(s.value)) { note.className = 'form-note error'; note.textContent = t('The leaving date is before the arriving date.'); return; }
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
      label: t('Map of Egypt showing the stops in your plan, numbered in order')
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
        (r && r.t_daily_max != null ? esc(t('%m: about %x °C by day').replace('%m', T.monthName(mm))
          .replace('%x', pageDigits(Math.round(r.t_daily_max)))) : '') +
        '<br>' + esc(t('Click to add')), { direction: 'top' });
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
      announce(t('Already in your plan: %s.').replace('%s', st.name)); return;
    }
    st.days = st.days || 1;
    S.trip.stops.push(st); save(); renderAll();
    announce(t('Added as stop %n: %s.').replace('%n', pageDigits(S.trip.stops.length)).replace('%s', st.name));
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
      var label = p.name + ' — ' + (KIND[p.kind] || p.kind) + (p.gov ? ', ' + gv(p.gov) : '');
      if (seen[label]) return '';
      seen[label] = 1; S.byLabel[label] = p;
      return '<option value="' + esc(label) + '"></option>';
    }).join('');
    function go() {
      var p = S.byLabel[inp.value];
      if (!p) { announce(t('Choose a place from the list as you type.')); return; }
      addStop({ id: 'place:' + p.name + '@' + p.lat.toFixed(3) + ',' + p.lon.toFixed(3), name: p.name, name_ar: p.name_ar,
                lat: p.lat, lon: p.lon, kind: p.kind, gov: p.gov, days: 1 });
      inp.value = '';
    }
    btn.addEventListener('click', go);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
  }

  function heatFor(st) {
    var near = T.nearestSite(D.climate, st), mm = T.monthsOf(S.trip.start, S.trip.end);
    if (!near) return { text: t('No measured climate site within %n km, so no heat figure is shown.').replace('%n', pageDigits(T.NEAR_KM)), rows: [] };
    var rows = mm.map(function (x) {
      var r = T.monthRow(near.site, x.month);
      return r ? { month: x.month, max: r.t_daily_max, min: r.t_daily_min, rain: r.rain_mm_day } : null;
    }).filter(Boolean);
    var where = near.km < 3 ? '' : ' (' + t('measured at %s, %n km away').replace('%s', near.site.name)
      .replace('%n', pageDigits(Math.round(near.km))) + ')';
    var text = rows.map(function (r) {
      return t('%m: about %x °C by day, %y °C at night').replace('%m', T.monthName(r.month))
        .replace('%x', pageDigits(Math.round(r.max))).replace('%y', pageDigits(Math.round(r.min)));
    }).join(T.pageLang() === 'ar' ? '؛ ' : '; ') + where + '.';
    return { text: text, rows: rows, site: near.site };
  }
  // Opening hours for a stop that is one of the measured visitor sites
  // (id 'site:<key>'), from opening-hours.json; null when none are known.
  function hoursFor(st) {
    if (!D.hours || st.id.indexOf('site:') !== 0) return null;
    var k = st.id.slice(5), out = null;
    (D.hours.groups || []).forEach(function (g) {
      (g.rows || []).forEach(function (r) { if (r.key === k) out = r.hours; });
    });
    return out;
  }
  function elevationFor(st) {
    if (!D.terrain || st.id.indexOf('site:') !== 0) return null;
    var k = st.id.slice(5);
    var t = D.terrain.sites.filter(function (s) { return s.key === k; })[0];
    return t ? t.elevation_m : null;
  }

  // A stop whose hottest trip month reaches the top heat band gets one line
  // saying so, and when the gates open, so an early visit can be planned.
  // A number or clock time written into the page's language: Arabic pages
  // get Arabic-Indic digits, like the rest of the Arabic site; other pages
  // get the plain digits. egfmt formats only 'en' and 'ar' and throws on
  // anything else, so the page's lang is never handed to it directly.
  function pageDigits(x) {
    var F = window.EGYBI && window.EGYBI.fmt;
    var ar = document.documentElement.getAttribute('lang') === 'ar';
    return F && ar ? F.digits(String(x), 'ar') : String(x);
  }
  function heatWarnHtml(h, st) {
    var w = T.heatWarning(h.rows, hoursFor(st));
    if (!w) return '';
    return '<p class="heat-warn"><strong>' +
      esc(t('Very hot for your dates: a normal afternoon here reaches about %t °C.').replace('%t', pageDigits(w.t))) + '</strong>' +
      (w.opens ? ' ' + esc(t('The site opens at %h, so you can visit before the afternoon heat.').replace('%h', pageDigits(w.opens))) : '') +
      '</p>';
  }
  // The leg into a stop: its straight-line distance, then how to travel it
  // when a cited row of arrival.json covers it (getting-around.json names
  // which). Each row keeps its own source and the date it was checked.
  function legText(a, b) {
    // pageDigits, never egfmt with the page's lang: that threw on 'ru' and
    // stopped the Russian stop list drawing (leg-cards.js, 17 Nov 2026).
    return t('%n km in a straight line from %s')
      .replace('%n', pageDigits(Math.round(T.km(a, b))))
      // An Arabic page names the stop in Arabic when the data has the name.
      .replace('%s', T.pageLang() === 'ar' && a.name_ar ? a.name_ar : a.name);
  }
  function arrivalRow(k) {
    var out = null;
    ((D.arrival || {}).groups || []).forEach(function (g) {
      (g.rows || []).forEach(function (r) { if (r.key === k) out = r; });
    });
    return out;
  }
  function legHowHtml(a, b) {
    var rows = T.legRows(D.guide, D.climate, a, b).map(arrivalRow).filter(Boolean);
    if (!rows.length) return '';
    return '<ul class="leg leg-how" style="list-style:none;padding:0;margin-top:2px;">' + rows.map(function (r) {
      return '<li><strong>' + esc(t(r.label)) + ':</strong> ' + esc(t(r.value)) + ' &middot; ' +
        (r.source_url ? '<a href="' + esc(r.source_url) + '" rel="noopener">' + esc(r.source) + '</a>' : esc(t(r.source))) +
        // The check date as the page writes dates ("17 ноября 2026", Arabic digits
        // on Arabic pages), after the page's own comma.
        (r.checked ? (T.pageLang() === 'ar' ? '، ' : ', ') + esc(t('checked')) + ' ' + esc(T.fmtDate(r.checked)) : '') + '</li>';
    }).join('') + '</ul>';
  }
  function renderStops() {
    var ul = $('stopList'), sum = $('planSum');
    if (!ul) return;
    var st = S.trip.stops;
    if (!st.length) {
      ul.innerHTML = '<li class="sheet stop" style="display:block;"><p style="margin:0;">' + esc(t('No stops yet. Click a site on the map, use the buttons above, or search the 897 mapped places.')) + '</p></li>';
    } else {
      ul.innerHTML = st.map(function (x, i) {
        var h = heatFor(x), first = h.rows[0], bd = first ? T.band(first.max) : null;
        var leg = i > 0 ? '<p class="leg">&darr; ' + esc(legText(st[i - 1], x)) + '</p>' + legHowHtml(st[i - 1], x) : '';
        return leg + '<li class="sheet stop">' +
          '<span class="stop-n" aria-hidden="true">' + (i + 1) + '</span>' +
          '<div><h3>' + esc(x.name) + (x.name_ar ? ' <span class="v-ar" lang="ar" dir="rtl">' + esc(x.name_ar) + '</span>' : '') + '</h3>' +
          (bd ? '<span class="heat-chip" style="background:' + bd.colour + ';color:' + T.inkOn(bd.colour) + '">' + pageDigits(Math.round(first.max)) + '&nbsp;' + esc(t('°C')) + '</span> ' : '') +
          '<p>' + esc(h.text) + '</p>' + heatWarnHtml(h, x) + '</div>' +
          '<div class="stop-ctl"><label class="sr-only" for="days' + i + '">' + esc(t('Days at %s').replace('%s', x.name)) + '</label>' +
          '<input id="days' + i + '" type="number" min="1" max="30" value="' + (x.days || 1) + '" data-days="' + i + '"> <span aria-hidden="true">' + esc(t('days')) + '</span>' +
          '<button type="button" class="icon-btn" data-up="' + i + '" aria-label="' + esc(t('Move %s earlier').replace('%s', x.name)) + '"' + (i === 0 ? ' disabled' : '') + '>&uarr;</button>' +
          '<button type="button" class="icon-btn" data-down="' + i + '" aria-label="' + esc(t('Move %s later').replace('%s', x.name)) + '"' + (i === st.length - 1 ? ' disabled' : '') + '>&darr;</button>' +
          '<button type="button" class="icon-btn" data-del="' + i + '" aria-label="' + esc(t('Remove %s').replace('%s', x.name)) + '">&times;</button></div></li>';
      }).join('');
    }
    var days = st.reduce(function (a, x) { return a + (+x.days || 0); }, 0);
    var nights = T.nights(S.trip.start, S.trip.end);
    var total = st.length > 1 ? st.slice(1).reduce(function (a, x, i) { return a + T.km(st[i], x); }, 0) : 0;
    // Labelled parts ("Stops: 2") rather than an English sentence with an
    // English plural, so Arabic and Russian read naturally at any count.
    var parts = [t('Stops: %n').replace('%n', pageDigits(st.length)),
                 t('Days planned: %n').replace('%n', pageDigits(days)),
                 t('Nights in the trip: %n').replace('%n', pageDigits(nights))];
    if (total) parts.push(t('Straight-line distance between stops: %n km').replace('%n', pageDigits(Math.round(total))));
    sum.textContent = parts.join(' · ') + (days > nights + 1 ? ' ' + t('That is more days than the trip has.') : '');
  }
  function initStopEvents() {
    var ul = $('stopList');
    ul.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var st = S.trip.stops, i;
      if (b.hasAttribute('data-del')) { i = +b.getAttribute('data-del'); announce(t('Removed: %s.').replace('%s', st[i].name)); st.splice(i, 1); }
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
      '<p class="kicker">' + t('The Papyrus &middot; trip dossier') + '</p>' +
      (name && cart ? '<div style="margin:6px 0 14px;">' + cart.html(name, 'cartouche-lg') + '</div>' : '') +
      '<h2 style="margin:0 0 6px;">' + (name ? t('%s&rsquo;s Egypt').replace('%s', esc(name)) : esc(t('Your Egypt'))) + '</h2>' +
      '<p style="margin:0;color:var(--ink-soft);">' + esc(T.fmtDate(S.trip.start)) + ' &ndash; ' + esc(T.fmtDate(S.trip.end)) +
      ' &middot; ' + esc(t('Stops: %n').replace('%n', pageDigits(st.length))) + '</p></div>';
    var stops = st.map(function (x, i) {
      var h = heatFor(x), el = elevationFor(x);
      var leg = i > 0 ? esc(legText(st[i - 1], x)) + '. ' : '';
      return '<div class="sheet" style="margin-top:16px;"><p class="kicker">' + esc(t('Stop %n').replace('%n', pageDigits(i + 1))) + ' &middot; ' +
        esc(t('Days: %n').replace('%n', pageDigits(x.days || 1))) + '</p>' +
        '<h3 style="margin:0 0 8px;color:var(--blue-deep);">' + esc(x.name) + (x.name_ar ? ' <span class="v-ar" lang="ar" dir="rtl">' + esc(x.name_ar) + '</span>' : '') + '</h3>' +
        '<p style="margin:0 0 6px;">' + leg + esc(h.text) + (el != null ? ' ' + esc(t('Ground elevation %n m (SRTM).').replace('%n', pageDigits(Math.round(el)))) : '') + '</p>' +
        '<p class="chart-cap" style="margin:0;">' + x.lat.toFixed(4) + ', ' + x.lon.toFixed(4) + (x.gov ? ' &middot; ' + esc(gv(x.gov)) : '') + '</p></div>';
    }).join('');
    var events = ev.length ? '<div class="sheet" style="margin-top:16px;"><p class="kicker">' + esc(t('Inside your dates')) + '</p><ul class="event-list">' +
      ev.map(function (e) {
        return '<li><strong>' + esc(t(e.name)) + '</strong> &middot; ' + esc(T.fmtDate(e.start)) +
          (e.start !== (e.end_latest || e.end) ? ' &ndash; ' + esc(T.fmtDate(e.end_latest || e.end)) : '') +
          (e.status === 'expected' ? '<span class="expected">' + esc(t('expected')) + '</span>' : '') + '</li>';
      }).join('') + '</ul></div>' : '';
    var sources = '<p class="chart-cap" style="margin-top:18px;">' +
      esc(t('Heat: %s, mean daily maximum and minimum %w — a long-run average, not a forecast.')
        .replace('%s', (D.climate || {}).source || 'NASA POWER').replace('%w', pageDigits((D.climate || {}).normal_window || '2001–2020'))) + ' ' +
      esc(t('Places: OpenStreetMap contributors (ODbL). Holidays: calendar.json, compiled %d, Islamic dates expected. Distances are straight lines, not roads. Printed from egybi.com/plan.html.')
        .replace('%d', T.fmtDate((D.calendar || {}).as_of))) + '</p>';
    host.innerHTML = cover + (st.length ? stops : '<p class="chart-cap" style="margin-top:14px;">' + esc(t('Add stops above and they appear here, one sheet each.')) + '</p>') + events + sources;
  }

  function renderAll() { renderStops(); paintMap(); renderDossier(); }

  /* Save to my account (2026-11-09). Optional: the trip stays in this browser
     either way. A signed-out reader gets the sign-in dialog first, and the
     save finishes once they are in. The saved trip's id is kept in the trip
     (savedId), so saving again updates it rather than making a copy. */
  function initSave() {
    var btn = $('saveTrip'), note = $('saveNote');
    if (!btn) return;
    var pending = false;
    function say(msg, kind) { note.textContent = msg; note.className = 'form-note' + (kind ? ' ' + kind : ''); }
    function title() {
      var t = S.trip;
      if (t.name) return t.name.slice(0, 120);
      if (t.start) return window.EGYBI.t ? window.EGYBI.t('Trip from %d').replace('%d', T.fmtDate(t.start)) : 'Trip from ' + T.fmtDate(t.start);
      return window.EGYBI.t ? window.EGYBI.t('My Egypt trip') : 'My Egypt trip';
    }
    function doSave(A) {
      if (!S.trip.stops.length && !S.trip.start) { say(t('Add your dates or a stop first.'), 'error'); return; }
      btn.disabled = true; say(t('Saving…'));
      var data = JSON.parse(JSON.stringify(S.trip)); delete data.savedId;
      A.api('trips-save', 'POST', { id: S.trip.savedId || '', title: title(), data: data }).then(function (r) {
        var d = r.data || {};
        if (d.ok) {
          S.trip.savedId = d.id; save();
          note.className = 'form-note ok';
          note.innerHTML = esc(t('Saved.')) + ' <a href="' + T.url('account.html') + '">' + esc(t('See your trips')) + '</a>.';
        } else if (r.status === 404 && S.trip.savedId) {
          // The saved copy was deleted elsewhere: save it as a new trip.
          delete S.trip.savedId; save(); doSave(A); return;
        } else {
          say(d.message || t('Could not save the trip.'), 'error');
        }
        btn.disabled = false;
      }).catch(function () { say(t('Could not reach the account service.'), 'error'); btn.disabled = false; });
    }
    btn.addEventListener('click', function () {
      window.EGYBI.account.load().then(function (A) {
        if (A.user) { doSave(A); return; }
        pending = true;
        A.open('in', t('Sign in or create a free account to save this trip.'));
      }).catch(function () { say(t('The account service could not be reached. Please try again.'), 'error'); });
    });
    window.addEventListener('egybi:account', function (e) {
      if (pending && e.detail && e.detail.user) { pending = false; window.EGYBI.account.load().then(doSave); }
    });
  }

  /* Share this trip (Round 4, R4-6, 2026-11-16). The whole trip travels in the
     link's #fragment, which a browser never sends to any server, so sharing
     stores and logs nothing. Opening a shared link never overwrites the
     reader's own plan without asking. EgybiShare is exposed for share-link.js,
     the check that round-trips random trips through it. */
  var SHARE_V = 1, SHARE_MAX_STOPS = 30;
  function b64urlEncode(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlDecode(s) {
    var b = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    var bin = atob(b), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function encodeTrip(t) {
    return b64urlEncode(JSON.stringify({
      v: SHARE_V, s: t.start || '', e: t.end || '', n: (t.name || '').slice(0, 40),
      p: (t.stops || []).slice(0, SHARE_MAX_STOPS).map(function (x) {
        return [String(x.id || '').slice(0, 140), String(x.name || '').slice(0, 80),
                Math.round(x.lat * 1000) / 1000, Math.round(x.lon * 1000) / 1000,
                Math.max(1, Math.min(30, x.days | 0 || 1)), x.name_ar ? String(x.name_ar).slice(0, 80) : ''];
      })
    }));
  }
  /* Anything that is not a well-formed trip inside Egypt is refused whole. */
  function decodeTrip(code) {
    var o;
    try { o = JSON.parse(b64urlDecode(code)); } catch (e) { return null; }
    if (!o || o.v !== SHARE_V || !Array.isArray(o.p) || o.p.length > SHARE_MAX_STOPS) return null;
    var date = /^\d{4}-\d{2}-\d{2}$/;
    if ((o.s && !date.test(o.s)) || (o.e && !date.test(o.e))) return null;
    var stops = [];
    for (var i = 0; i < o.p.length; i++) {
      var p = o.p[i];
      if (!Array.isArray(p) || typeof p[0] !== 'string' || typeof p[1] !== 'string') return null;
      var lat = +p[2], lon = +p[3], days = p[4] | 0;
      if (!(lat > 21 && lat < 32.5 && lon > 24 && lon < 37.5) || days < 1 || days > 30) return null;
      var st = { id: p[0].slice(0, 140), name: p[1].slice(0, 80), lat: lat, lon: lon, days: days };
      if (p[5]) st.name_ar = String(p[5]).slice(0, 80);
      stops.push(st);
    }
    return { start: o.s || null, end: o.e || null, name: typeof o.n === 'string' ? o.n.slice(0, 40) : '', stops: stops };
  }
  window.EgybiShare = { encode: encodeTrip, decode: decodeTrip };

  function initShare() {
    var btn = $('shareTrip'), note = $('shareNote');
    if (!btn) return;
    function say(msg, kind) { note.textContent = msg; note.className = 'form-note' + (kind ? ' ' + kind : ''); }
    btn.addEventListener('click', function () {
      if (!S.trip.stops.length) { say(t('Add a stop first, then share.'), 'error'); return; }
      var url = location.origin + location.pathname + '#t=' + encodeTrip(S.trip);
      if (navigator.share) {
        navigator.share({ title: S.trip.name || t('My Egypt trip'), text: t('My Egypt trip on EgyBI'), url: url })
          .then(function () { say(t('Shared.'), 'ok'); })
          .catch(function () { /* the reader closed the sheet */ });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          say(t('Link copied. Anyone who opens it sees this trip; nothing is stored on EgyBI.'), 'ok');
        }, function () { say(t('Copy this link: %u').replace('%u', url)); });
      } else {
        say(t('Copy this link: %u').replace('%u', url));
      }
    });
  }

  function takeShared() {
    var m = /^#t=([A-Za-z0-9_-]{1,8000})$/.exec(location.hash);
    if (!m) return;
    var shared = decodeTrip(m[1]);
    var banner = $('sharedBanner');
    history.replaceState(null, '', location.pathname + location.search);
    if (!shared) { if (banner) { banner.hidden = false; banner.textContent = t('That shared link could not be read, so your own plan is unchanged.'); } return; }
    function apply() {
      S.trip = { start: shared.start, end: shared.end, name: shared.name, stops: shared.stops };
      save();
      $('planStart').value = S.trip.start || ''; $('planEnd').value = S.trip.end || ''; $('planName').value = S.trip.name || '';
      renderAll();
    }
    if (!S.trip.stops.length) { apply(); return; }
    if (!banner) return;
    banner.hidden = false; banner.textContent = '';
    var msg = document.createElement('p');
    msg.textContent = t('Someone shared a trip with you. Stops: %n. Open it in place of your own plan?').replace('%n', pageDigits(shared.stops.length));
    var yes = document.createElement('button'); yes.type = 'button'; yes.className = 'btn btn-primary'; yes.textContent = t('Open the shared trip');
    var no = document.createElement('button'); no.type = 'button'; no.className = 'btn btn-ghost'; no.textContent = t('Keep my plan');
    yes.addEventListener('click', function () { apply(); banner.hidden = true; });
    no.addEventListener('click', function () { banner.hidden = true; });
    var row = document.createElement('div'); row.className = 'cta-row'; row.appendChild(yes); row.appendChild(no);
    banner.appendChild(msg); banner.appendChild(row);
  }

  /* Offline (Round 4, R4-7, 2026-11-16). Register the site's service worker
     (/sw.js) from the planner, then hand it the files this page has already
     loaded, so the very first visit works with no signal. Nothing is sent
     anywhere: the copies live in this browser's cache. */
  function initOffline() {
    var note = $('offlineNote');
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    function go() {
      navigator.serviceWorker.register('/sw.js').then(function () { return navigator.serviceWorker.ready; })
        .then(function (reg) {
          var mine = location.origin;
          var urls = [location.pathname].concat((performance.getEntriesByType('resource') || [])
            .map(function (r) { return r.name; })
            .filter(function (u) { return u.indexOf(mine + '/') === 0 && !/\/(auth|api)\//.test(u); }));
          navigator.serviceWorker.addEventListener('message', function (ev) {
            if (ev.data && ev.data.type === 'cached' && note) {
              note.textContent = t('This planner now opens offline on this device, with your saved trip.');
            }
          });
          var w = navigator.serviceWorker.controller || reg.active;
          if (w) w.postMessage({ type: 'cache-these', urls: urls });
        }).catch(function () { /* no offline copy; the planner works as before */ });
    }
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
  }

  function init() {
    initForm(); initMap(); initStopEvents();
    $('printPlan').addEventListener('click', function () { window.print(); });
    initSave();
    initShare();
    initOffline();
    $('clearPlan').addEventListener('click', function () {
      if (!S.trip.stops.length) return;
      S.trip.stops = []; save(); renderAll(); announce(t('All stops removed.'));
    });
    Promise.all([
      settle(T.getJSON('data/visit-climate.json')), settle(T.getJSON('data/visit-terrain.json')),
      settle(T.getJSON('data/geo-places.json')), settle(T.getJSON('data/calendar.json')),
      settle(T.getJSON('data/opening-hours.json')), settle(T.getJSON('data/getting-around.json')),
      settle(T.getJSON('data/arrival.json'))
    ]).then(function (r) {
      D.climate = r[0]; D.terrain = r[1]; D.places = r[2]; D.calendar = r[3]; D.hours = r[4];
      D.guide = r[5]; D.arrival = r[6];
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
      takeShared();
      // A shared link opened in a tab already on the planner changes only the hash.
      window.addEventListener('hashchange', takeShared);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
