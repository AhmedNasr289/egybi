/* EgyBI — the visitor layer.
   ---------------------------------------------------------------------------
   Answers the two questions a first-time visitor to Egypt actually asks, in
   the order they ask them: what is there, and what will it be like when I go.

   Everything on this page is computed from three files in this repository —
   visit-climate.json (NASA POWER), visit-terrain.json (NASA SRTM) and
   geo-heritage.json (UNESCO) — plus the bundled governorate outlines. No
   figure is typed into the markup, because a typed figure becomes a false
   claim the first time a pipeline reruns.

   TILE-FREE, like every other map here: outlines from EGYBI_EGYPT_GEO, points
   from repo JSON, zero runtime requests to any map provider.

   WHAT THIS PAGE REFUSES TO DO
   It does not describe any site in prose. There is no sourced, licence-clear
   dataset of "what Karnak feels like", so writing that would mean inventing
   atmosphere and setting it beside measured figures, where it would read as
   equally sourced. Each site shows what the data holds — where it is, how high,
   how hot each month, whether UNESCO lists it — and links onward. A visitor is
   better served by a real August temperature than by an adjective.

   It also does not rank or recommend. "Best time to visit" is a judgement that
   depends on heat tolerance, budget and crowds, none of which are in the data.
   The month picker shows the measurement and lets the reader decide.

   Degrades honestly: if the pipeline has not run yet, the map still draws Egypt
   and each section says which layer is missing, rather than rendering zeros
   that look like a country with no weather.
*/
(function () {
  'use strict';

  var GOLD = '#C9A227', GOLD_INK = '#8A6D1E', BLUE = '#17408B', INK = '#1C1C1C';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
  var SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var S = { climate: null, terrain: null, heritage: null, map: null,
            layer: null, month: null, selected: null };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n, d) {
    return n == null ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: d == null ? 0 : d });
  }

  function load(path) {
    return fetch(path, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error(path + ' ' + r.status);
      return r.json();
    });
  }

  /* ------------------------------------------------------------- the map */
  function baseMap(id) {
    var m = L.map(id, { zoomControl: true, attributionControl: false,
                        scrollWheelZoom: false });
    L.geoJSON(window.EGYBI_EGYPT_GEO, {
      style: function () {
        return { color: '#C7BCA1', weight: 1, fillColor: '#EFE7D4', fillOpacity: 1 };
      },
      interactive: false
    }).addTo(m);
    m.fitBounds([[22.0, 24.7], [31.7, 36.9]], { padding: [10, 10] });
    return m;
  }

  /* Heat is the one thing that genuinely changes the shape of a trip to Egypt,
     so the marker colour encodes the selected month's mean daily maximum. The
     bands are stated on the page in °C rather than as "good"/"bad" — 38 °C is
     unbearable to one visitor and unremarkable to another, and the data cannot
     tell which one is reading. */
  function heatColour(t) {
    if (t == null) return '#9A9A9A';
    if (t < 20) return '#2C6FAD';
    if (t < 26) return '#4FA3A5';
    if (t < 32) return '#C9A227';
    if (t < 38) return '#D97B2B';
    return '#B23A0F';
  }

  function monthOf(site, mi) {
    if (!site || !site.months) return null;
    for (var i = 0; i < site.months.length; i++) {
      if (site.months[i].month === mi + 1) return site.months[i];
    }
    return null;
  }

  function paintMap() {
    if (!S.map || !S.climate) return;
    if (S.layer) { S.map.removeLayer(S.layer); S.layer = null; }
    var g = L.layerGroup();
    S.climate.sites.forEach(function (site) {
      var m = monthOf(site, S.month);
      var t = m ? m.t_max : null;
      var mk = L.circleMarker([site.lat, site.lon], {
        radius: 8, weight: 2, color: '#fff', opacity: 1,
        fillColor: heatColour(t), fillOpacity: 0.95
      });
      mk.bindTooltip(
        '<strong>' + esc(site.name) + '</strong><br>' +
        (t == null ? 'no reading for this month'
                   : MONTHS[S.month] + ' mean daily max ' + fmt(t, 0) + ' °C'),
        { direction: 'top' });
      mk.on('click', function () { select(site.key); });
      g.addLayer(mk);
    });
    S.layer = g.addTo(S.map);
  }

  /* ------------------------------------------------------- the month picker */
  function paintMonthPicker() {
    var host = $('monthPicker');
    if (!host) return;
    host.innerHTML = SHORT.map(function (m, i) {
      return '<button type="button" class="mo-btn' + (i === S.month ? ' on' : '') +
             '" data-m="' + i + '" aria-pressed="' + (i === S.month) + '">' + m + '</button>';
    }).join('');
    host.querySelectorAll('.mo-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        S.month = parseInt(b.dataset.m, 10);
        paintMonthPicker(); paintMap(); paintMonthTable(); paintDetail();
      });
    });
  }

  function paintMonthTable() {
    var tb = $('monthBody'), cap = $('monthCap');
    if (!tb) return;
    if (!S.climate) return;
    var rows = S.climate.sites.slice().map(function (s) {
      var m = monthOf(s, S.month);
      return { s: s, t: m ? m.t_max : null, lo: m ? m.t_min : null,
               rain: m ? m.rain_mm_day : null };
    }).sort(function (a, b) {
      if (a.t == null) return 1; if (b.t == null) return -1;
      return b.t - a.t;
    });
    tb.innerHTML = rows.map(function (r) {
      return '<tr data-key="' + esc(r.s.key) + '">' +
        '<td>' + esc(r.s.name) + '<span class="v-gov">' + esc(r.s.gov) + '</span></td>' +
        '<td class="num"><span class="v-chip" style="background:' + heatColour(r.t) + '">' +
          (r.t == null ? '—' : fmt(r.t, 0) + '°') + '</span></td>' +
        '<td class="num">' + (r.lo == null ? '—' : fmt(r.lo, 0) + '°') + '</td>' +
        '<td class="num">' + (r.rain == null ? '—' : fmt(r.rain, 1)) + '</td>' +
        '<td>' + (r.s.unesco ? '<span class="v-un">World Heritage</span>' : '') + '</td>' +
        '</tr>';
    }).join('');
    tb.querySelectorAll('tr').forEach(function (tr) {
      tr.addEventListener('click', function () { select(tr.dataset.key); });
    });

    if (cap) {
      var hot = rows.filter(function (r) { return r.t != null; });
      if (hot.length) {
        var hi = hot[0], lo = hot[hot.length - 1];
        cap.innerHTML = 'In <strong>' + MONTHS[S.month] + '</strong>, the mean daily maximum ' +
          'across these ' + hot.length + ' sites runs from <strong>' + fmt(lo.t, 0) + ' °C</strong> at ' +
          esc(lo.s.name) + ' to <strong>' + fmt(hi.t, 0) + ' °C</strong> at ' + esc(hi.s.name) +
          ' — a spread of ' + fmt(hi.t - lo.t, 0) + ' degrees within one country, on the same day of the year.';
      }
    }
  }

  /* ------------------------------------------------------------ the detail */
  function select(key) {
    S.selected = key;
    paintDetail();
    var el = $('siteDetail');
    if (el && !el.hidden) {
      el.scrollIntoView({ behavior: (window.EGYBI && EGYBI.reduceMotion) ? 'auto' : 'smooth',
                          block: 'nearest' });
    }
  }

  function paintDetail() {
    var el = $('siteDetail');
    if (!el) return;
    if (!S.selected || !S.climate) { el.hidden = true; return; }
    var site = null;
    S.climate.sites.forEach(function (s) { if (s.key === S.selected) site = s; });
    if (!site) { el.hidden = true; return; }

    var terr = null;
    if (S.terrain) {
      S.terrain.sites.forEach(function (t) { if (t.key === site.key) terr = t; });
    }

    // Cross-check the UNESCO flag against the fetched heritage list rather than
    // trusting the flag in the site table. If the two disagree the fetched file
    // wins, because that one has a source.
    var listed = null;
    if (S.heritage && Array.isArray(S.heritage.sites)) {
      var names = S.heritage.sites.map(function (h) { return (h.name || '').toLowerCase(); });
      listed = names.some(function (n) {
        var a = site.name.toLowerCase();
        return n.indexOf(a) !== -1 || a.indexOf(n) !== -1;
      });
    }

    var bars = site.months.map(function (m) {
      var t = m.t_max;
      var h = t == null ? 2 : Math.max(2, Math.round((t - 5) / 45 * 100));
      return '<div class="v-bar' + (m.month - 1 === S.month ? ' on' : '') + '" title="' +
             MONTHS[m.month - 1] + ': ' + (t == null ? 'no reading' : fmt(t, 0) + ' °C') + '">' +
             '<span style="height:' + h + '%;background:' + heatColour(t) + '"></span>' +
             '<em>' + SHORT[m.month - 1][0] + '</em></div>';
    }).join('');

    var now = monthOf(site, S.month);
    el.hidden = false;
    el.innerHTML =
      '<h3>' + esc(site.name) + ' <span class="v-ar">' + esc(site.name_ar || '') + '</span></h3>' +
      '<p class="v-sub">' + esc(site.gov) + ' governorate &middot; ' +
        site.lat.toFixed(4) + '°N, ' + site.lon.toFixed(4) + '°E' +
        (terr ? ' &middot; ' + fmt(terr.elevation_m, 0) + ' m above sea level' : '') +
        (listed === true ? ' &middot; <strong>UNESCO World Heritage</strong>' : '') +
      '</p>' +
      '<div class="v-year">' + bars + '</div>' +
      '<p class="v-cap">Mean daily maximum by month. ' +
        (now && now.t_max != null
          ? '<strong>' + MONTHS[S.month] + ': ' + fmt(now.t_max, 0) + ' °C by day, ' +
            fmt(now.t_min, 0) + ' °C at night' +
            (now.rain_mm_day != null ? ', ' + fmt(now.rain_mm_day, 1) + ' mm of rain a day on average' : '') +
            '.</strong>'
          : 'No reading for the selected month.') +
      '</p>' +
      '<p class="v-note">These are modelled long-run averages from NASA POWER, not a forecast and ' +
        'not station readings. They describe what the month is usually like here; they say nothing ' +
        'about the day you travel.' +
        (terr ? ' Elevation is sampled from NASA SRTM 30 m at this site&rsquo;s own coordinates.' : '') +
      '</p>';
  }

  /* ------------------------------------------------------------ terrain bit */
  function paintTerrain() {
    var host = $('terrainList'), lead = $('terrainLead');
    if (!host) return;
    if (!S.terrain) return;
    var rows = S.terrain.sites.slice().sort(function (a, b) {
      return b.elevation_m - a.elevation_m;
    });
    var hi = rows[0], lo = rows[rows.length - 1];
    var span = hi.elevation_m - lo.elevation_m;
    if (lead) {
      lead.innerHTML = 'Across these ' + rows.length + ' sites the ground rises from <strong>' +
        fmt(lo.elevation_m, 0) + ' m</strong> at ' + esc(lo.name) + ' to <strong>' +
        fmt(hi.elevation_m, 0) + ' m</strong> at ' + esc(hi.name) + ' &mdash; ' + fmt(span, 0) +
        ' metres of relief. Every figure is a radar measurement of the actual land surface, ' +
        'not a rendering of it.';
    }
    host.innerHTML = rows.map(function (r) {
      var w = Math.max(1.5, (r.elevation_m - Math.min(0, lo.elevation_m)) / (span || 1) * 100);
      return '<div class="v-terr" data-key="' + esc(r.key) + '">' +
        '<span class="v-tn">' + esc(r.name) + '</span>' +
        '<span class="v-tb"><i style="width:' + w.toFixed(1) + '%"></i></span>' +
        '<span class="v-tv">' + fmt(r.elevation_m, 0) + ' m</span></div>';
    }).join('');
    host.querySelectorAll('.v-terr').forEach(function (d) {
      d.addEventListener('click', function () { select(d.dataset.key); });
    });
  }

  /* --------------------------------------------------------------- sources */
  function paintMeta() {
    var el = $('visitMeta');
    if (!el) return;
    var bits = [];
    if (S.climate) {
      bits.push('Climate normals: <strong>' + esc(S.climate.source) + '</strong>, built ' +
                esc(S.climate.as_of) + '. ' + esc(S.climate.license) + '.');
      if (S.climate.missing && S.climate.missing.length) {
        bits.push('<strong>No climate reading returned for:</strong> ' +
                  esc(S.climate.missing.join(', ')) + '. Shown as unknown, never as zero.');
      }
    }
    if (S.terrain) {
      bits.push('Elevation: <strong>' + esc(S.terrain.source) + '</strong>, built ' +
                esc(S.terrain.as_of) + '. ' + esc(S.terrain.license) + '.');
    }
    if (S.heritage) {
      bits.push('World Heritage status: <strong>UNESCO World Heritage Centre</strong>, built ' +
                esc(S.heritage.as_of) + '.');
    }
    el.innerHTML = bits.join(' ');
  }

  /* ------------------------------------------------------------ empty state */
  function showEmpty(which) {
    which.forEach(function (id) {
      var e = $(id);
      if (e) e.hidden = false;
    });
  }

  /* ------------------------------------------------------------------ init */
  function init() {
    if (!window.L || !window.EGYBI_EGYPT_GEO) return;

    // Default to the month the reader is actually in — a visitor checking in
    // August wants August first, not January.
    S.month = new Date().getMonth();

    var box = $('visitMap');
    if (box) S.map = baseMap('visitMap');

    Promise.allSettled([
      load('data/visit-climate.json'),
      load('data/visit-terrain.json'),
      load('data/geo-heritage.json')
    ]).then(function (r) {
      // A layer file always exists so the page never 404s, but an
      // ungenerated one carries generated:false and an empty sites array.
      // Treat that as ABSENT rather than as a layer with nothing in it —
      // otherwise the page paints an empty table that reads like a finding.
      function usable(x) {
        return x && x.generated !== false && Array.isArray(x.sites) && x.sites.length ? x : null;
      }
      if (r[0].status === 'fulfilled') S.climate = usable(r[0].value);
      if (r[1].status === 'fulfilled') S.terrain = usable(r[1].value);
      if (r[2].status === 'fulfilled') S.heritage = r[2].value;

      if (S.climate) {
        paintMonthPicker(); paintMap(); paintMonthTable();
        var c = $('siteCount'); if (c) c.textContent = S.climate.sites.length;
      } else {
        showEmpty(['climateEmpty']);
      }
      if (S.terrain) paintTerrain(); else showEmpty(['terrainEmpty']);
      paintMeta();

      if (window.EGYBI_SCROLLY && S.map) wireStory();
    });
  }

  /* The scrollytelling run uses the SHARED engine in scrolly.js rather than a
     second one. Each step names a region and the map goes there; the prose
     carries the argument so a reader without JS loses nothing but the movement. */
  function wireStory() {
    var G = window.EGYBI_SCROLLY;
    G.register('visitMap', {
      whole:  function (map) { G.goTo(map, [26.8, 30.8], 6); },
      delta:  function (map) { G.goTo(map, [30.9, 31.0], 8); },
      valley: function (map) { G.goTo(map, [25.7, 32.6], 9); },
      nubia:  function (map) { G.goTo(map, [22.9, 32.2], 8); },
      desert: function (map) { G.goTo(map, [28.5, 27.0], 7); },
      sinai:  function (map) { G.goTo(map, [28.7, 34.0], 8); }
    }, S.map);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
