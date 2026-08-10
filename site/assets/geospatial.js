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

  /* OPTIONAL MAPKIT ENHANCEMENTS, RESOLVED AT THE MOMENT OF USE.

     On 2026-08-10 the Atlas was a blank white rectangle on the live site with
     "Loading layers…" frozen under it, and the cause was one line:

       window.EGYBI.mapkit.outline is not a function
         at init (assets/geospatial.js:302)

     The host was serving a mapkit.js older than the page module calling into
     it. A coastline halo is decoration — the map is complete and readable
     without it — but calling a function that does not exist throws, the throw
     aborted init before it had fetched a single layer, and a missing ornament
     took down the entire page. Three data files were never even requested.

     So an enhancement is looked up when it is called and stands down quietly
     when it is absent. Resolved per call, not once at parse time, because a
     module cannot assume mapkit has finished loading when its own body runs;
     snapshotting at the top would silently disable labels on a page where they
     were available all along.

     Deliberately NOT factored into a shared file. Every shared file is exactly
     as capable of being stale as mapkit was, so a shared guard would need a
     guard. A copy that ships in the same file as its caller cannot be older
     than its caller. */
  function mkx(name) {
    var mk = window.EGYBI && window.EGYBI.mapkit;
    var fn = mk && mk[name];
    return typeof fn === 'function' ? fn : function () { return null; };
  }

  var RAMP = ['#E3EAF5', '#B9C9E4', '#8AA6D0', '#5B82BC', '#2E5AA0', '#0E2A5E'];
  var GOLD = '#C9A227', GOLD_INK = '#7A5E10';
  // Point overlays must read against ANY choropleth bin beneath them, from the
  // palest to #0E2A5E. Two rules make that work, and both matter:
  //   1) Markers use hues that are NOT in RAMP. The health layer originally
  //      reused #0E2A5E — the exact darkest bin — so in Cairo (269 facilities
  //      over a near-black polygon) the points were invisible.
  //   2) Every marker carries a light halo. A white stroke separates a dot
  //      from whatever sits under it, rather than relying on the base being
  //      pale, which is the standard cartographic fix for this problem.
  var HOSPITAL = '#B23A0F', CLINIC = '#E2703A', HALO = '#FFFFFF';
  var DIM_FILL = 0.45, FULL_FILL = 0.92;

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
  function overlayOn() {
    return !!((S.healthLayer && S.map.hasLayer(S.healthLayer)) ||
              (S.heritageLayer && S.map.hasLayer(S.heritageLayer)));
  }
  function baseStyle(feature) {
    // Fade the choropleth while points are shown, so markers sit clearly on
    // top instead of competing with the fill for the same ink.
    return { fillColor: colorFor(metricValue(feature.properties, S.metric)),
             weight: 1, opacity: 1, color: '#FCF8EC',
             fillOpacity: overlayOn() ? DIM_FILL : FULL_FILL };
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
  /* Clicking or pressing Enter on a governorate flies to it and fills the
     detail panel. The fly is what makes the map feel like a place rather than a
     picture; under reduced motion mapkit lands on exactly the same view with no
     travel, so the figures are equally reachable either way. */
  function activate(lyr, feature) {
    window.EGYBI.mapkit.flyTo(S.map, lyr, { padding: [40, 40] });
    showDetail(feature.properties);
    S.layer.eachLayer(function (l) {
      var el = l.getElement && l.getElement();
      if (el) {
        el.classList.toggle('mk-selected', l === lyr);
        el.setAttribute('aria-pressed', l === lyr ? 'true' : 'false');
      }
    });
  }

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
    var canvas = L.canvas({ padding: 0.3, pane: 'ptsHealth' });
    var g = L.layerGroup();
    // Draw clinics first so the larger hospital marks land on top of them.
    S.health.points.slice().sort(function (a, b) {
      return (a.k === 'h' ? 1 : 0) - (b.k === 'h' ? 1 : 0);
    }).forEach(function (pt) {
      var hosp = pt.k === 'h';
      L.circleMarker([pt.lat, pt.lon], {
        renderer: canvas,
        // The halo has to stay THIN relative to the radius. At r=2.8 with a
        // 1.1px stroke the white ring ate ~40% of the dot and overlapping
        // marks rendered as two-tone crescents rather than points.
        radius: hosp ? 4.5 : 3,
        fillColor: hosp ? HOSPITAL : CLINIC,
        color: HALO, weight: 0.9, opacity: 1,
        // Near-opaque: at 0.7–0.85 the warm fill blended with the blue
        // polygon underneath and read as muddy mauve instead of ochre.
        fillOpacity: hosp ? 0.95 : 0.9
      }).bindTooltip((pt.n || (hosp ? 'Hospital' : 'Clinic')) +
                     (pt.n ? (hosp ? ' (hospital)' : ' (clinic)') : ''),
                     { direction: 'top', className: 'egypt-map-tip' }).addTo(g);
    });
    S.healthLayer = g;
  }

  function addHeritageOverlay() {
    if (!S.heritage || S.heritageLayer) return;
    var g = L.layerGroup();
    S.heritage.sites.forEach(function (s) {
      // Only 7 of these, and they are the page's landmark symbol — a white
      // halo under the gold ring keeps them legible where two sites nearly
      // collide (Memphis/Giza sits ~16 km from Historic Cairo).
      L.circleMarker([s.lat, s.lon], {
        pane: 'ptsHeritage',
        radius: 8, color: HALO, fillColor: GOLD, weight: 3, fillOpacity: 0.98
      }).bindTooltip('<strong>' + s.name + '</strong><br>' + s.category +
                     ' — inscribed ' + s.year,
                     { direction: 'top', className: 'egypt-map-tip' })
        .setStyle({ color: HALO })
        .addTo(g);
      L.circleMarker([s.lat, s.lon], {
        pane: 'ptsHeritage',
        radius: 8, color: GOLD_INK, fill: false, weight: 1.2, interactive: false
      }).addTo(g);
    });
    S.heritageLayer = g;
  }

  function toggleOverlay(which, btn) {
    var layer = which === 'health' ? S.healthLayer : S.heritageLayer;
    if (!layer) return;
    if (S.map.hasLayer(layer)) { S.map.removeLayer(layer); btn.classList.remove('on'); }
    else { layer.addTo(S.map); btn.classList.add('on'); }
    S.layer.setStyle(baseStyle);   // re-apply dim/full fill for the new state
    buildOverlayKey();
  }

  /* Symbol key — the choropleth legend explains colour bins only, which left
     the dots unexplained. Shown only for overlays that are actually on. */
  function buildOverlayKey() {
    var el = $('atlasKey');
    if (!el) return;
    var bits = [];
    if (S.healthLayer && S.map.hasLayer(S.healthLayer)) {
      bits.push('<span class="mk-item"><span class="mk-dot" style="background:' + HOSPITAL + ';width:13px;height:13px;"></span>Hospital</span>' +
                '<span class="mk-item"><span class="mk-dot" style="background:' + CLINIC + ';width:9px;height:9px;"></span>Clinic</span>');
    }
    if (S.heritageLayer && S.map.hasLayer(S.heritageLayer)) {
      bits.push('<span class="mk-item"><span class="mk-dot" style="background:' + GOLD +
                ';width:15px;height:15px;box-shadow:0 0 0 2px ' + GOLD_INK + ' inset;"></span>World Heritage site</span>');
    }
    el.innerHTML = bits.length
      ? '<div class="map-legend-title">Points on the map</div><div class="mk-row">' + bits.join('') + '</div>'
      : '';
    el.hidden = !bits.length;
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

    // Built through the shared kit so the Atlas, the Street Report Card and
    // the Explore choropleth cannot drift apart again: same buttons, same
    // keyboard contract, same reduced-motion behaviour, all in one file.
    S.map = window.EGYBI.mapkit.create('atlasMap', {
      doubleClickZoom: false,
      locator: window.EGYBI_EGYPT_GEO,
      credit: ['geoboundaries', 'capmas', 'osm'],
      label: 'Interactive map of Egypt\u2019s 27 governorates. '
           + 'Tab to a governorate and press Enter for its figures.'
    });
    if (!S.map) return;
    // Dedicated panes so points ALWAYS sit above the polygons. Hovering a
    // governorate calls bringToFront() on it, which would otherwise raise the
    // polygon over the facility dots inside it and hide them mid-interaction.
    // Heritage sits above health: 7 landmarks should never be buried under
    // 963 facility dots.
    S.map.createPane('ptsHealth').style.zIndex = 640;
    S.map.createPane('ptsHeritage').style.zIndex = 650;
    mkx('outline')(S.map, window.EGYBI_EGYPT_GEO);
    S.layer = L.geoJSON(window.EGYBI_EGYPT_GEO, {
      style: baseStyle,
      onEachFeature: function (feature, lyr) {
        lyr.bindTooltip(tipHtml(feature.properties, 'population'),
                        { sticky: true, direction: 'top', className: 'egypt-map-tip' });
        lyr.on({
          // Emphasise with a heavy outline, NOT a gold flood fill. Gold is the
          // World Heritage symbol now, so reusing it for "hovered governorate"
          // made one colour mean two things — and the opaque fill hid the
          // facility points sitting inside that governorate.
          mouseover: function (e) {
            var base = overlayOn() ? DIM_FILL : FULL_FILL;
            e.target.setStyle({ weight: 2.5, color: GOLD_INK,
                                fillOpacity: Math.min(base + 0.15, 1) });
            e.target.bringToFront();
          },
          mouseout: function (e) { S.layer.resetStyle(e.target); },
          click: function () { activate(lyr, feature); }
        });
      }
    }).addTo(S.map);
    // Governorate names, drawn on the map itself. Without them this is a
    // silhouette quiz: a reader cannot tell Qena from Sohag without hovering,
    // and on a phone there is no hover at all. Names come from the bundled
    // geometry's own properties, so they cost no request and cannot drift from
    // the shapes they sit on. Small Delta governorates stay unlabelled until
    // the reader zooms far enough in for the name to fit — see addLabels.
    mkx('addLabels')(S.map, S.layer, function (p) { return p.name; });
    // One tab stop into the map, then arrow keys move geographically. This
    // replaces 27 individual tab stops in GeoJSON file order.
    window.EGYBI.mapkit.choropleth(S.map, S.layer, {
      describe: function (f) {
        var p = f.properties, j = S.joined[p.name] || {};
        return p.name + ': ' + METRICS[S.metric].label + ' ' +
               METRICS[S.metric].fmt(metricValue(p, S.metric));
      },
      activate: function (lyr) { activate(lyr, lyr.feature); },
      table: function () {
        var rows = window.EGYBI_EGYPT_GEO.features.map(function (f) {
          var p = f.properties;
          return '<tr><th scope="row">' + p.name + '</th><td>' +
            (p.population / 1e6).toFixed(2) + ' M</td><td>' + Math.round(p.density) +
            '</td><td>' + p.urban_pct.toFixed(1) + '%</td><td>' +
            (p.growth >= 0 ? '+' : '') + p.growth.toFixed(1) + '%</td><td>' +
            Math.round(p.area_km2) + '</td></tr>';
        }).join('');
        return '<table><caption>Egypt governorate indicators — the same data the map shows'
          + '</caption><thead><tr><th scope="col">Governorate</th>'
          + '<th scope="col">Population 2023</th><th scope="col">Density /km²</th>'
          + '<th scope="col">Urban %</th><th scope="col">Growth 2017–2023</th>'
          + '<th scope="col">Area km²</th></tr></thead><tbody>' + rows + '</tbody></table>';
      }
    });
    S.home = S.layer.getBounds();
    S.map.fitBounds(S.home, { padding: [6, 6] });
    window.EGYBI.mapkit.setHome(S.map, S.home);
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
        S.layer.setStyle(baseStyle);            // dim the fill now points are up
      }
      buildOverlayKey();
      setLayerNote();
      buildTable();
      buildHeritageCards();
    });

    setTimeout(function () { S.map.invalidateSize(); S.map.fitBounds(S.layer.getBounds(), { padding: [6, 6] }); }, 250);
  }

  /* NO EXCEPTION IN HERE MAY LEAVE A BLANK RECTANGLE AND THE WORD "LOADING".

     The guards above stop the specific failure that happened. This stops the
     shape of it. Whatever throws — a stale helper, a data file that changed
     shape, a Leaflet upgrade — the reader must end up with the country drawn
     and a sentence saying which part is missing, never a white box under a
     heading promising a map and a status line that says "Loading layers…"
     forever. A page frozen mid-load is worse than a page that admits a fault,
     because the reader cannot tell the difference between broken and slow.

     The fallback deliberately uses nothing but bundled geometry and plain
     Leaflet: no mapkit, no fetched layer, nothing that could be implicated in
     whatever just failed. If even that is impossible, the note still gets
     written, because the sentence matters more than the picture. */
  function degrade(err) {
    if (window.console && console.error) console.error('Atlas init failed:', err);
    var note = $('layerNote');
    if (note) {
      note.textContent = 'This map could not finish loading, so the layers above '
        + 'are unavailable. The governorate outline below is drawn from data '
        + 'bundled with the page. Please report this — the fault is ours.';
    }
    // The joined-metric and overlay chips are the ones that depend on a fetched
    // layer. They ship disabled and are enabled on arrival, so after a failure
    // they are already in the right state — but a failure PART WAY through
    // could have enabled some of them, and a chip that cannot do anything is
    // worse than a chip that says it cannot.
    var chips = document.querySelectorAll('[data-metric="health"], [data-metric="schools"], .ov-toggle');
    for (var i = 0; i < chips.length; i += 1) {
      chips[i].disabled = true;
      chips[i].title = 'Unavailable — this layer failed to load';
    }
    try {
      var box = $('atlasMap');
      if (!box || !window.L || !window.EGYBI_EGYPT_GEO) return;
      /* REUSE THE MAP IF ONE ALREADY EXISTS, and this is the part I got wrong
         first time. init() usually gets as far as creating the Leaflet
         instance before it dies, which stamps _leaflet_id on the container —
         so a fallback that refuses to touch an already-initialised container
         bails out exactly when it is needed and leaves the blank rectangle it
         was written to prevent. What is actually true is that the container
         may hold a map with no layers in it; the answer is to put the country
         into that map, and only build a new one if there is genuinely none. */
      var m = S.map;
      if (!m) {
        if (box._leaflet_id) return;
        m = L.map('atlasMap', { attributionControl: false });
      }
      var l = L.geoJSON(window.EGYBI_EGYPT_GEO, {
        style: function () {
          return { color: '#6E86A8', weight: 1, fillColor: '#DDE3EC', fillOpacity: 0.9 };
        }
      }).addTo(m);
      m.fitBounds(l.getBounds(), { padding: [6, 6] });
      m.invalidateSize();
    } catch (e2) {
      if (window.console && console.error) console.error('Atlas fallback failed too:', e2);
    }
  }

  function boot() {
    try { init(); } catch (err) { degrade(err); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
