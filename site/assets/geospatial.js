/* EgyBI — Atlas (Egypt Spatial Watch): multi-layer governorate map.
   Base choropleth reuses the bundled window.EGYBI_EGYPT_GEO (geoBoundaries EGY
   ADM1, CC-BY 4.0 + CAPMAS-sourced KB metrics) exactly like the Explore map —
   vector-only Leaflet, NO tile layer, zero runtime map-service calls. On top it
   joins three occasionally-refreshed layers fetched as same-origin JSON
   (site/data/geo-*.json, built by backend/pipeline/fetch_geo_layers.py):
   health facilities + school counts (OSM/Overpass, ODbL) and Egypt's UNESCO
   World Heritage sites. Each layer degrades gracefully: if its JSON isn't
   generated yet, its toggle stays disabled with an honest note instead of an
   empty pretend-layer. */
(function () {
  'use strict';

  var RAMP = ['#E3EAF5', '#B9C9E4', '#8AA6D0', '#5B82BC', '#2E5AA0', '#0E2A5E'];
  var GOLD = '#C9A227', GOLD_INK = '#7A5E10';

  var METRICS = {
    population: { label: 'Population (2023)', fmt: function (v) { return (v / 1e6).toFixed(2) + ' M'; } },
    density:    { label: 'Density', fmt: function (v) { return Math.round(v).toLocaleString() + ' /km²'; } },
    urban_pct:  { label: 'Urban population', fmt: function (v) { return v.toFixed(1) + '% urban'; } },
    growth:     { label: 'Growth 2017→2023', fmt: function (v) { return (v >= 0 ? '+' : '') + v.toFixed(1) + '%'; } },
    area_km2:   { label: 'Area', fmt: function (v) { return Math.round(v).toLocaleString() + ' km²'; } },
    health:     { label: 'Mapped health facilities', fmt: function (v) { return v.toLocaleString() + ' facilities'; }, joined: true },
    schools:    { label: 'Mapped schools', fmt: function (v) { return v.toLocaleString() + ' schools'; }, joined: true }
  };

  var S = { map: null, layer: null, metric: 'population', breaks: null,
            joined: {},              // gov name -> {health, schools}
            health: null, schools: null, heritage: null,
            healthLayer: null, heritageLayer: null };

  /* ---------------------------------------------------------- helpers */
  function $(id) { return document.getElementById(id); }
  function quantileBreaks(values, n) {
    var s = values.slice().sort(function (a, b) { return a - b; });
    var breaks = [];
    for (var i = 1; i < n; i++) breaks.push(s[Math.floor(i / n * s.length)]);
    return breaks;
  }
  function binIndex(v, breaks) {
    for (var i = 0; i < breaks.length; i++) if (v <= breaks[i]) return i;
    return breaks.length;
  }
  function metricValue(p, metric) {
    if (METRICS[metric].joined) {
      var j = S.joined[p.name];
      return j ? j[metric] : 0;
    }
    return p[metric];
  }
  function colorFor(v) { return RAMP[binIndex(v, S.breaks)]; }
  function baseStyle(feature) {
    return { fillColor: colorFor(metricValue(feature.properties, S.metric)),
             weight: 1, opacity: 1, color: '#FCF8EC', fillOpacity: 0.92 };
  }
  function loadJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }

  /* ---------------------------------------------------------- legend */
  function buildLegend(metric, values) {
    var el = $('atlasLegend');
    if (!el) return;
    var m = METRICS[metric];
    var edges = [Math.min.apply(null, values)].concat(S.breaks).concat([Math.max.apply(null, values)]);
    var html = '<div class="map-legend-title">' + m.label + '</div><div class="map-legend-row">';
    for (var i = 0; i < RAMP.length; i++) {
      var range = (i === RAMP.length - 1) ? (m.fmt(edges[i]) + '+') : (m.fmt(edges[i]) + ' – ' + m.fmt(edges[i + 1]));
      html += '<span class="map-legend-item"><span class="sw" style="background:' + RAMP[i] + '"></span>' + range + '</span>';
    }
    el.innerHTML = html + '</div>';
  }

  function tipHtml(p, metric) {
    return '<strong>' + p.name + '</strong><br>' + METRICS[metric].label + ': ' +
           METRICS[metric].fmt(metricValue(p, metric));
  }

  function setMetric(metric) {
    S.metric = metric;
    var feats = window.EGYBI_EGYPT_GEO.features;
    var values = feats.map(function (f) { return metricValue(f.properties, metric); });
    S.breaks = quantileBreaks(values, 6);
    S.layer.setStyle(baseStyle);
    S.layer.eachLayer(function (l) { l.setTooltipContent(tipHtml(l.feature.properties, metric)); });
    buildLegend(metric, values);
  }

  /* ---------------------------------------------------------- detail panel */
  function showDetail(p) {
    var el = $('govDetail');
    if (!el) return;
    var j = S.joined[p.name] || {};
    var rows = [
      ['Population (2023)', METRICS.population.fmt(p.population)],
      ['Area', METRICS.area_km2.fmt(p.area_km2)],
      ['Density', METRICS.density.fmt(p.density)],
      ['Urban share', METRICS.urban_pct.fmt(p.urban_pct)],
      ['Growth 2017→2023', METRICS.growth.fmt(p.growth)]
    ];
    if (S.health) rows.push(['Mapped health facilities', (j.health || 0).toLocaleString() +
      ' (' + (j.hospitals || 0) + ' hospitals, ' + (j.clinics || 0) + ' clinics)']);
    if (S.schools) rows.push(['Mapped schools', (j.schools || 0).toLocaleString()]);
    el.innerHTML = '<h3>' + p.name + '</h3>' + rows.map(function (r) {
      return '<div class="gd-row"><span>' + r[0] + '</span><strong>' + r[1] + '</strong></div>';
    }).join('') + '<p class="gd-note">Facility &amp; school counts are OSM-mapped totals — relative pattern, not official registries.</p>';
    el.hidden = false;
  }

  /* ---------------------------------------------------------- overlays */
  function addHealthOverlay() {
    if (!S.health || S.healthLayer) return;
    var canvas = L.canvas({ padding: 0.3 });
    var g = L.layerGroup();
    S.health.points.forEach(function (pt) {
      L.circleMarker([pt.lat, pt.lon], {
        renderer: canvas, radius: pt.k === 'h' ? 3.5 : 2,
        color: pt.k === 'h' ? '#0E2A5E' : '#5B82BC',
        weight: 1, fillOpacity: 0.7, opacity: 0.85
      }).bindTooltip((pt.n || (pt.k === 'h' ? 'Hospital' : 'Clinic')) +
                     (pt.n ? (pt.k === 'h' ? ' (hospital)' : ' (clinic)') : ''),
                     { direction: 'top', className: 'egypt-map-tip' }).addTo(g);
    });
    S.healthLayer = g;
  }

  function addHeritageOverlay() {
    if (!S.heritage || S.heritageLayer) return;
    var g = L.layerGroup();
    S.heritage.sites.forEach(function (s) {
      L.circleMarker([s.lat, s.lon], {
        radius: 8, color: GOLD_INK, fillColor: GOLD, weight: 2, fillOpacity: 0.95
      }).bindTooltip('<strong>' + s.name + '</strong><br>' + s.category +
                     ' — inscribed ' + s.year,
                     { direction: 'top', className: 'egypt-map-tip' }).addTo(g);
    });
    S.heritageLayer = g;
  }

  function toggleOverlay(which, btn) {
    var layer = which === 'health' ? S.healthLayer : S.heritageLayer;
    if (!layer) return;
    if (S.map.hasLayer(layer)) { S.map.removeLayer(layer); btn.classList.remove('on'); }
    else { layer.addTo(S.map); btn.classList.add('on'); }
  }

  /* ---------------------------------------------------------- table */
  function buildTable() {
    var tb = $('govTableBody');
    if (!tb) return;
    var feats = window.EGYBI_EGYPT_GEO.features.slice()
      .sort(function (a, b) { return b.properties.population - a.properties.population; });
    tb.innerHTML = feats.map(function (f) {
      var p = f.properties, j = S.joined[p.name] || {};
      return '<tr><td>' + p.name + '</td>' +
        '<td>' + (p.population / 1e6).toFixed(2) + ' M</td>' +
        '<td>' + Math.round(p.density).toLocaleString() + '</td>' +
        '<td>' + (S.health ? (j.health || 0).toLocaleString() : '—') + '</td>' +
        '<td>' + (S.schools ? (j.schools || 0).toLocaleString() : '—') + '</td></tr>';
    }).join('');
  }

  /* ---------------------------------------------------------- heritage cards */
  function buildHeritageCards() {
    var wrap = $('heritageCards');
    if (!wrap) return;
    if (!S.heritage) {
      $('heritageEmpty').hidden = false;
      return;
    }
    wrap.innerHTML = S.heritage.sites.map(function (s) {
      return '<div class="wh-card"><div class="wh-year">' + s.year + ' · ' + s.category + '</div>' +
             '<h3>' + s.name + '</h3>' +
             '<p class="wh-coords">' + s.lat.toFixed(2) + '°N, ' + s.lon.toFixed(2) + '°E</p></div>';
    }).join('');
    var meta = $('heritageMeta');
    if (meta) meta.textContent = 'Source: ' + S.heritage.source + ' — as of ' + S.heritage.as_of + '.';
  }

  /* ---------------------------------------------------------- data notes */
  function setLayerNote() {
    var el = $('layerNote');
    if (!el) return;
    var missing = [];
    if (!S.health) missing.push('health facilities');
    if (!S.schools) missing.push('schools');
    if (!S.heritage) missing.push('heritage sites');
    if (!missing.length) {
      var d = [S.health.as_of, S.schools.as_of, S.heritage.as_of].sort()[0];
      el.innerHTML = 'All layers loaded. OSM layers © OpenStreetMap contributors (ODbL); oldest layer refresh: ' + d + '.';
      return;
    }
    el.innerHTML = '<strong>' + missing.join(', ') + '</strong> ' +
      (missing.length === 1 ? 'layer is' : 'layers are') +
      ' not generated yet — they appear automatically after the first “Build Atlas geo layers” run. The governorate map below already works.';
  }

  /* ---------------------------------------------------------- init */
  function init() {
    if (!window.L || !window.EGYBI_EGYPT_GEO || !$('atlasMap')) return;
    var rm = window.EGYBI ? window.EGYBI.reduceMotion : false;
    var feats = window.EGYBI_EGYPT_GEO.features;
    S.breaks = quantileBreaks(feats.map(function (f) { return f.properties.population; }), 6);

    S.map = L.map('atlasMap', {
      zoomControl: true, attributionControl: false, scrollWheelZoom: false,
      doubleClickZoom: false, dragging: true, keyboard: false,
      fadeAnimation: !rm, zoomAnimation: !rm
    });
    S.layer = L.geoJSON(window.EGYBI_EGYPT_GEO, {
      style: baseStyle,
      onEachFeature: function (feature, lyr) {
        lyr.bindTooltip(tipHtml(feature.properties, 'population'),
                        { sticky: true, direction: 'top', className: 'egypt-map-tip' });
        lyr.on({
          mouseover: function (e) { e.target.setStyle({ weight: 2, color: GOLD_INK, fillColor: GOLD, fillOpacity: 0.95 }); e.target.bringToFront(); },
          mouseout: function (e) { S.layer.resetStyle(e.target); },
          click: function () { showDetail(feature.properties); }
        });
      }
    }).addTo(S.map);
    S.map.fitBounds(S.layer.getBounds(), { padding: [6, 6] });
    buildLegend('population', feats.map(function (f) { return f.properties.population; }));
    buildTable();

    document.querySelectorAll('.map-toggle[data-metric]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.disabled) return;
        document.querySelectorAll('.map-toggle[data-metric]').forEach(function (b) { b.classList.remove('on'); });
        btn.classList.add('on');
        setMetric(btn.getAttribute('data-metric'));
      });
    });
    document.querySelectorAll('[data-overlay]').forEach(function (btn) {
      btn.addEventListener('click', function () { toggleOverlay(btn.getAttribute('data-overlay'), btn); });
    });

    // Layer JSONs — each optional, each unlocking its own UI when present.
    Promise.allSettled([
      loadJSON('data/geo-health.json'),
      loadJSON('data/geo-schools.json'),
      loadJSON('data/geo-heritage.json')
    ]).then(function (res) {
      if (res[0].status === 'fulfilled') S.health = res[0].value;
      if (res[1].status === 'fulfilled') S.schools = res[1].value;
      if (res[2].status === 'fulfilled') S.heritage = res[2].value;

      feats.forEach(function (f) {
        var n = f.properties.name;
        var h = S.health ? (S.health.by_gov[n] || { hospitals: 0, clinics: 0 }) : {};
        S.joined[n] = {
          hospitals: h.hospitals || 0, clinics: h.clinics || 0,
          health: (h.hospitals || 0) + (h.clinics || 0),
          schools: S.schools ? (S.schools.by_gov[n] || 0) : 0
        };
      });

      if (S.health) {
        var hb = document.querySelector('[data-metric="health"]');
        if (hb) { hb.disabled = false; hb.removeAttribute('title'); }
        var ho = document.querySelector('[data-overlay="health"]');
        if (ho) { ho.disabled = false; ho.removeAttribute('title'); }
        addHealthOverlay();
      }
      if (S.schools) {
        var sb = document.querySelector('[data-metric="schools"]');
        if (sb) { sb.disabled = false; sb.removeAttribute('title'); }
      }
      if (S.heritage) {
        var hg = document.querySelector('[data-overlay="heritage"]');
        if (hg) { hg.disabled = false; hg.removeAttribute('title'); }
        addHeritageOverlay();
        S.heritageLayer.addTo(S.map);           // heritage on by default — only 7 gold points
        var hgBtn = document.querySelector('[data-overlay="heritage"]');
        if (hgBtn) hgBtn.classList.add('on');
      }
      setLayerNote();
      buildTable();
      buildHeritageCards();
    });

    setTimeout(function () { S.map.invalidateSize(); S.map.fitBounds(S.layer.getBounds(), { padding: [6, 6] }); }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
