/* EgyBI — Cairo Street Report Card (/streets.html).
   ---------------------------------------------------------------------------
   Renders three things from JSON committed by backend/pipeline/fetch_streets.py:
     1. a tile-free Leaflet choropleth of district boundaries, coloured by the
        selected network metric (same vector-only approach as the Atlas — zero
        runtime calls to any map service);
     2. orientation roses drawn client-side as SVG from 36 numbers per district,
        which is why the payload stays tiny instead of shipping street geometry;
     3. a comparison table + drill-down + the 15-minute access panel.

   Every layer degrades honestly: if its JSON has not been generated yet, the
   section says so plainly rather than rendering an empty shell that looks like
   a result of zero. */
(function () {
  'use strict';

  var RAMP = ['#E3EAF5', '#B9C9E4', '#8AA6D0', '#5B82BC', '#2E5AA0', '#0E2A5E'];
  var GOLD = '#C9A227', GOLD_INK = '#7A5E10', HALO = '#FFFFFF';

  /* Metric definitions. `good` says which direction is better for a walkable,
     connected street network — used only to label the legend honestly, never
     to score a district as "good" or "bad" outright. */
  var METRICS = {
    intersection_density_km2: {
      label: 'Intersection density', unit: '/km²', good: 'high',
      fmt: function (v) { return Math.round(v) + '/km²'; },
      what: 'Junctions per square kilometre. More intersections means more route choices, shorter blocks and a network that stays usable when one street is blocked.'
    },
    dead_end_share_pct: {
      label: 'Dead ends', unit: '%', good: 'low',
      fmt: function (v) { return v.toFixed(1) + '%'; },
      what: 'Share of street ends that go nowhere. Cul-de-sacs calm traffic on the street itself, but push every trip back onto a few collector roads.'
    },
    street_density_km_km2: {
      label: 'Street density', unit: 'km/km²', good: 'high',
      fmt: function (v) { return v.toFixed(1) + ' km/km²'; },
      what: 'Kilometres of street per square kilometre. A rough measure of how finely the land is subdivided.'
    },
    mean_street_length_m: {
      label: 'Mean segment', unit: 'm', good: 'low',
      fmt: function (v) { return Math.round(v) + ' m'; },
      what: 'Average distance between junctions. Short segments mean small, walkable blocks; long ones mean superblocks you have to walk around.'
    },
    streets_per_node_avg: {
      label: 'Streets per junction', unit: '', good: 'high',
      fmt: function (v) { return v.toFixed(2); },
      what: 'Average number of streets meeting at each node. Near 4 is a crossroads grid; near 2.5 means many bends and dead ends rather than true junctions.'
    },
    circuity_avg: {
      label: 'Circuity', unit: '×', good: 'low',
      fmt: function (v) { return v.toFixed(3) + '×'; },
      what: 'How much further you travel along streets than the straight-line distance. 1.00 would be a perfect straight shot; higher means detours.'
    },
    orientation_entropy: {
      label: 'Orientation entropy', unit: '', good: 'low',
      fmt: function (v) { return v.toFixed(2); },
      what: 'How disordered the street directions are. A perfect grid scores about 1.39; a fully random network approaches 3.58. Lower means more grid-like.'
    }
  };
  var ORDER = ['intersection_density_km2', 'dead_end_share_pct', 'street_density_km_km2',
               'mean_street_length_m', 'streets_per_node_avg', 'circuity_avg', 'orientation_entropy'];

  var S = { card: null, access: null, notes: null, bounds: null,
            map: null, layer: null, metric: 'intersection_density_km2', selected: null };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return (window.EGYBI && EGYBI.escapeHtml) ? EGYBI.escapeHtml(s) : String(s); }
  function load(u) {
    return fetch(u, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(r.status); return r.json();
    });
  }
  function byKey(k) {
    for (var i = 0; i < S.card.districts.length; i++)
      if (S.card.districts[i].key === k) return S.card.districts[i];
    return null;
  }

  /* ---------------------------------------------------------- colour scale */
  function scale(metric) {
    var vals = S.card.districts.map(function (d) { return d[metric]; })
                               .filter(function (v) { return typeof v === 'number'; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    return function (v) {
      if (typeof v !== 'number' || hi === lo) return RAMP[2];
      var t = (v - lo) / (hi - lo);
      // "good" direction only decides which end of the ramp is dark, so the
      // darkest colour always means "more of the thing the metric rewards".
      if (METRICS[metric].good === 'low') t = 1 - t;
      return RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))];
    };
  }

  /* ---------------------------------------------------------- the map */
  function initMap() {
    if (!window.L || !S.bounds || !$('streetsMap')) return;
    var rm = window.EGYBI ? window.EGYBI.reduceMotion : false;
    S.map = L.map('streetsMap', {
      zoomControl: true, attributionControl: false, scrollWheelZoom: false,
      doubleClickZoom: false, dragging: true, keyboard: false,
      fadeAnimation: !rm, zoomAnimation: !rm
    });
    paintMap();
    setTimeout(function () {
      S.map.invalidateSize();
      if (S.layer) S.map.fitBounds(S.layer.getBounds(), { padding: [12, 12] });
    }, 240);
  }

  function paintMap() {
    if (!S.map) return;
    if (S.layer) S.map.removeLayer(S.layer);
    var col = scale(S.metric), m = METRICS[S.metric];
    S.layer = L.geoJSON(S.bounds, {
      style: function (f) {
        var d = byKey(f.properties.key);
        return { fillColor: d ? col(d[S.metric]) : '#ddd', weight: 1.5,
                 color: '#FCF8EC', opacity: 1, fillOpacity: 0.9 };
      },
      onEachFeature: function (f, lyr) {
        var d = byKey(f.properties.key);
        if (!d) return;
        lyr.bindTooltip('<strong>' + esc(d.name) + '</strong><br>' + esc(d.era) +
                        '<br>' + m.label + ': <strong>' + m.fmt(d[S.metric]) + '</strong>',
                        { sticky: true, direction: 'top', className: 'egypt-map-tip' });
        lyr.on({
          mouseover: function (e) { e.target.setStyle({ weight: 3, color: GOLD_INK }); e.target.bringToFront(); },
          mouseout: function (e) { S.layer.resetStyle(e.target); },
          click: function () { select(d.key); }
        });
      }
    }).addTo(S.map);
    S.map.fitBounds(S.layer.getBounds(), { padding: [12, 12] });
    paintLegend();
  }

  function paintLegend() {
    var el = $('streetsLegend'); if (!el) return;
    var m = METRICS[S.metric];
    var vals = S.card.districts.map(function (d) { return d[S.metric]; })
                               .filter(function (v) { return typeof v === 'number'; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    var loLbl = m.good === 'low' ? m.fmt(hi) : m.fmt(lo);
    var hiLbl = m.good === 'low' ? m.fmt(lo) : m.fmt(hi);
    el.innerHTML = '<div class="map-legend-title">' + esc(m.label) + '</div>' +
      '<div class="ramp-row"><span class="ramp-end">' + esc(loLbl) + '</span>' +
      RAMP.map(function (c) { return '<span class="ramp-sw" style="background:' + c + '"></span>'; }).join('') +
      '<span class="ramp-end">' + esc(hiLbl) + '</span></div>' +
      '<p class="ramp-note">' + esc(m.what) + '</p>';
  }

  /* ---------------------------------------------------------- orientation rose
     36 bins × 10°. Compass bearing 0 = north = straight up, so the screen
     angle is (bearing − 90) because SVG angles run clockwise from east. */
  function rose(bins, size, fill) {
    if (!bins || !bins.length) return '';
    var r = size / 2 - 2, cx = size / 2, cy = size / 2;
    var max = Math.max.apply(null, bins) || 1;
    var w = 360 / bins.length, parts = [];
    for (var i = 0; i < bins.length; i++) {
      if (bins[i] <= 0) continue;
      var len = (bins[i] / max) * r;
      var a0 = (i * w - 90) * Math.PI / 180, a1 = ((i + 1) * w - 90) * Math.PI / 180;
      parts.push('M' + cx.toFixed(1) + ' ' + cy.toFixed(1) +
                 ' L' + (cx + len * Math.cos(a0)).toFixed(1) + ' ' + (cy + len * Math.sin(a0)).toFixed(1) +
                 ' A' + len.toFixed(1) + ' ' + len.toFixed(1) + ' 0 0 1 ' +
                 (cx + len * Math.cos(a1)).toFixed(1) + ' ' + (cy + len * Math.sin(a1)).toFixed(1) + ' Z');
    }
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" class="rose" aria-hidden="true">' +
           '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" class="rose-ring"/>' +
           '<path d="' + parts.join(' ') + '" fill="' + fill + '"/></svg>';
  }

  /* ---------------------------------------------------------- sections */
  function paintRoses() {
    var el = $('roseGrid'); if (!el) return;
    el.innerHTML = S.card.districts.map(function (d) {
      var H = d.orientation_entropy;
      return '<figure class="rose-card' + (S.selected === d.key ? ' on' : '') +
             '" data-key="' + esc(d.key) + '" tabindex="0" role="button">' +
             rose(d.orientation_bins, 150, GOLD) +
             '<figcaption><strong>' + esc(d.name) + '</strong>' +
             '<span class="rc-era">' + esc(d.era) + '</span>' +
             '<span class="rc-h">entropy ' + (H == null ? '—' : H.toFixed(2)) + '</span>' +
             '</figcaption></figure>';
    }).join('');
    el.querySelectorAll('.rose-card').forEach(function (c) {
      c.addEventListener('click', function () { select(c.dataset.key); });
      c.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(c.dataset.key); }
      });
    });
  }

  function paintTable() {
    var tb = $('cardTableBody'); if (!tb) return;
    var rows = S.card.districts.slice().sort(function (a, b) {
      return b.intersection_density_km2 - a.intersection_density_km2;
    });
    tb.innerHTML = rows.map(function (d) {
      return '<tr data-key="' + esc(d.key) + '"><td>' + esc(d.name) +
             '<span class="td-era">' + esc(d.era) + '</span></td>' +
             ORDER.map(function (k) {
               var v = d[k];
               return '<td>' + (typeof v === 'number' ? METRICS[k].fmt(v) : '—') + '</td>';
             }).join('') + '</tr>';
    }).join('');
    tb.querySelectorAll('tr').forEach(function (tr) {
      tr.addEventListener('click', function () { select(tr.dataset.key); });
    });
  }

  function paintDetail() {
    var el = $('districtDetail'); if (!el) return;
    if (!S.selected) { el.hidden = true; return; }
    var d = byKey(S.selected); if (!d) { el.hidden = true; return; }
    var acc = S.access && S.access.districts.filter(function (a) { return a.key === d.key; })[0];
    var note = S.notes && S.notes.districts && S.notes.districts[d.key];

    var metricRows = ORDER.map(function (k) {
      var v = d[k];
      return '<div class="dd-row"><span>' + esc(METRICS[k].label) + '</span><strong>' +
             (typeof v === 'number' ? METRICS[k].fmt(v) : '—') + '</strong></div>';
    }).join('');

    var accHtml = '';
    if (acc) {
      accHtml = '<h4>Walking access</h4><div class="dd-access">' +
        Object.keys(acc.access).map(function (kind) {
          var a = acc.access[kind];
          return '<div class="acc-cell"><span class="ac-k">' + esc(kind) + '</span>' +
                 (a ? '<strong>' + a.within_15min_pct.toFixed(0) + '%</strong><span class="ac-s">within 15 min · median ' +
                      a.median_min.toFixed(0) + ' min</span>'
                    : '<strong>—</strong><span class="ac-s">none mapped in OSM</span>') +
                 '</div>';
        }).join('') + '</div>' +
        '<p class="dd-note">Counted from OSM: ' +
        Object.keys(acc.amenity_counts).map(function (k) {
          return acc.amenity_counts[k] + ' ' + k; }).join(', ') +
        '. A low score can mean few facilities <em>or</em> few mapped facilities — this data cannot tell them apart.</p>';
    }

    var noteHtml = note
      ? '<h4>Planner&rsquo;s note <span class="ai-tag">AI-generated</span></h4>' +
        '<p class="dd-ai">' + esc(note) + '</p>' +
        '<p class="dd-note">Written by a language model <em>from the numbers above</em>, which are shown next to it so you can check every claim. It is a reading of the metrics, not professional planning advice.</p>'
      : '';

    el.innerHTML = '<h3>' + esc(d.name) + ' <span class="dd-ar">' + esc(d.name_ar) + '</span></h3>' +
      '<p class="dd-era">' + esc(d.era) + ' &middot; ' + d.area_km2.toLocaleString() + ' km²</p>' +
      '<p class="dd-why">' + esc(d.why) + '</p>' +
      '<div class="dd-split"><div>' + rose(d.orientation_bins, 190, GOLD) +
      '<p class="dd-note" style="text-align:center">Street orientation &mdash; length of road facing each compass direction</p></div>' +
      '<div class="dd-metrics">' + metricRows + '</div></div>' +
      accHtml + noteHtml;
    el.hidden = false;
  }

  function select(key) {
    S.selected = key;
    paintRoses(); paintDetail();
    document.querySelectorAll('#cardTableBody tr').forEach(function (tr) {
      tr.classList.toggle('on', tr.dataset.key === key);
    });
    var el = $('districtDetail');
    if (el && !el.hidden) el.scrollIntoView({
      behavior: (window.EGYBI && EGYBI.reduceMotion) ? 'auto' : 'smooth', block: 'nearest' });
  }

  function paintAccessSection() {
    var host = $('accessGrid'), empty = $('accessEmpty');
    if (!host) return;
    if (!S.access) { if (empty) empty.hidden = false; host.innerHTML = ''; return; }
    if (empty) empty.hidden = true;
    var rows = S.access.districts.slice().sort(function (a, b) {
      return b.mean_within_15min_pct - a.mean_within_15min_pct; });
    host.innerHTML = rows.map(function (a) {
      var pct = a.mean_within_15min_pct;
      return '<div class="acc-card" data-key="' + esc(a.key) + '">' +
        '<div class="acc-name">' + esc(a.name) + '</div>' +
        '<div class="acc-bar"><span style="width:' + Math.max(2, Math.min(100, pct)) + '%"></span></div>' +
        '<div class="acc-pct">' + pct.toFixed(0) + '%</div>' +
        '<div class="acc-sub">of walkable street within 15 minutes of a mapped hospital, clinic, school or pharmacy</div>' +
        '</div>';
    }).join('');
    host.querySelectorAll('.acc-card').forEach(function (c) {
      c.addEventListener('click', function () { select(c.dataset.key); });
    });
  }

  function paintMeta() {
    var el = $('streetsMeta'); if (!el) return;
    var bits = [];
    if (S.card) bits.push('Street network: OSM via OSMnx, built ' + esc(S.card.as_of) +
                          ' &mdash; ' + S.card.districts.length + ' districts.');
    if (S.access) bits.push('Access layer built ' + esc(S.access.as_of) + '.');
    if (!S.notes) bits.push('Planner&rsquo;s notes have not been generated for this build.');
    if (S.card && S.card.skipped && S.card.skipped.length)
      bits.push('<strong>Skipped:</strong> ' + esc(S.card.skipped.join('; ')) + '.');
    el.innerHTML = bits.join(' ');
  }

  function showEmpty(msg) {
    ['reportCardBody', 'roseSection', 'mapSection'].forEach(function (id) {
      var el = $(id); if (el) el.hidden = true;
    });
    var e = $('cardEmpty');
    if (e) { e.hidden = false; e.innerHTML = msg; }
  }

  /* ---------------------------------------------------------- init */
  function init() {
    if (!$('streetsMap') && !$('cardTableBody')) return;
    Promise.allSettled([
      load('data/streets-districts.json'),
      load('data/streets-boundaries.json'),
      load('data/streets-access.json'),
      load('data/streets-notes.json')
    ]).then(function (r) {
      if (r[0].status === 'fulfilled') S.card = r[0].value;
      if (r[1].status === 'fulfilled') S.bounds = r[1].value;
      if (r[2].status === 'fulfilled') S.access = r[2].value;
      if (r[3].status === 'fulfilled') S.notes = r[3].value;

      if (!S.card || !S.card.districts || !S.card.districts.length) {
        showEmpty('The street-network data has not been generated yet. It appears here after the first ' +
                  '<strong>“Refresh street report card”</strong> run &mdash; the page is built and waiting, ' +
                  'not broken. Nothing is shown until there are real measurements to show.');
        paintAccessSection(); paintMeta();
        return;
      }
      var e = $('cardEmpty'); if (e) e.hidden = true;

      document.querySelectorAll('.metric-toggle').forEach(function (b) {
        b.addEventListener('click', function () {
          document.querySelectorAll('.metric-toggle').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          S.metric = b.dataset.metric;
          paintMap();
        });
      });

      paintTable(); paintRoses(); paintAccessSection(); paintMeta();
      if (S.bounds) initMap(); else { var ms = $('mapSection'); if (ms) ms.hidden = true; }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
