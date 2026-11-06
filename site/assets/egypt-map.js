/* EgyBI — Egypt governorate choropleth (BI-grade, offline) via Leaflet.
   Renders window.EGYBI_EGYPT_GEO (bundled geoBoundaries EGY ADM1 + KB data) as a
   vector choropleth — NO tile layer, so there are zero runtime external calls and
   it works on a strict static/same-origin deploy. Colours by QUANTILE bin (6 blue
   shades) so a skewed metric (Cairo's 10.5M vs Sinai's 146k) stays readable, the
   way Power BI / Tableau bin skewed geodata. Hover highlights a governorate gold
   and shows its real value; a custom HTML legend lists each bin's value range. */
(function () {
  window.EGYBI_MAP = { map: null, layer: null, metric: 'population', breaks: null };

  /* OPTIONAL MAPKIT ENHANCEMENTS, RESOLVED AT THE MOMENT OF USE.
     See the identical note in geospatial.js: on 2026-08-10 a call to a mapkit
     function the deployed mapkit.js did not yet define threw during init and
     blanked an entire map page. An enhancement is looked up when it is called
     and stands down quietly when it is absent, and the copy lives here rather
     than in a shared file because a shared file can be exactly as stale as the
     one that caused this. */
  function mkx(name) {
    var mk = window.EGYBI && window.EGYBI.mapkit;
    var fn = mk && mk[name];
    return typeof fn === 'function' ? fn : function () { return null; };
  }

  var METRICS = {
    population: { label: 'Population (2023)', fmt: function (v) { return (v / 1e6).toFixed(2) + ' M'; } },
    density:    { label: 'Density', fmt: function (v) { return Math.round(v).toLocaleString('en-GB') + ' /km²'; } },
    urban_pct:  { label: 'Urban population', fmt: function (v) { return v.toFixed(1) + '% urban'; } },
    growth:     { label: 'Growth 2017→2023', fmt: function (v) { return (v >= 0 ? '+' : '') + v.toFixed(1) + '%'; } },
    area_km2:   { label: 'Area', fmt: function (v) { return Math.round(v).toLocaleString('en-GB') + ' km²'; } }
  };
  var RAMP = ['#E3EAF5', '#B9C9E4', '#8AA6D0', '#5B82BC', '#2E5AA0', '#0E2A5E']; // light -> --blue-deep

  function quantileBreaks(values, n) {
    var s = values.slice().sort(function (a, b) { return a - b; });
    var breaks = [];
    for (var i = 1; i < n; i++) { breaks.push(s[Math.floor(i / n * s.length)]); }
    return breaks;
  }
  function binIndex(v, breaks) {
    for (var i = 0; i < breaks.length; i++) { if (v <= breaks[i]) return i; }
    return breaks.length;
  }
  function colorFor(v) { return RAMP[binIndex(v, window.EGYBI_MAP.breaks)]; }

  function baseStyle(feature) {
    return { fillColor: colorFor(feature.properties[window.EGYBI_MAP.metric]),
             weight: 1, opacity: 1, color: '#FCF8EC', fillOpacity: 0.92 };
  }

  function buildLegend(el, metric, breaks, values) {
    if (!el) return;
    var m = METRICS[metric];
    var edges = [Math.min.apply(null, values)].concat(breaks).concat([Math.max.apply(null, values)]);
    var html = '<div class="map-legend-title">' + m.label + '</div><div class="map-legend-row">';
    for (var i = 0; i < RAMP.length; i++) {
      var lo = edges[i], hi = edges[i + 1];
      var range = (i === RAMP.length - 1) ? (m.fmt(lo) + '+') : (m.fmt(lo) + ' – ' + m.fmt(hi));
      html += '<span class="map-legend-item"><span class="sw" style="background:' + RAMP[i] + '"></span>' + range + '</span>';
    }
    el.innerHTML = html + '</div>';
  }

  function tipHtml(p, metric) {
    return '<strong>' + p.name + '</strong><br>' + METRICS[metric].label + ': ' + METRICS[metric].fmt(p[metric]);
  }

  function setMetric(metric, legendId) {
    window.EGYBI_MAP.metric = metric;
    var feats = window.EGYBI_EGYPT_GEO.features;
    var values = feats.map(function (f) { return f.properties[metric]; });
    window.EGYBI_MAP.breaks = quantileBreaks(values, 6);
    window.EGYBI_MAP.layer.setStyle(baseStyle);
    window.EGYBI_MAP.layer.eachLayer(function (layer) {
      layer.setTooltipContent(tipHtml(layer.feature.properties, metric));
    });
    buildLegend(document.getElementById(legendId), metric, window.EGYBI_MAP.breaks, values);
  }

  window.initEgyptMap = function (mapId, legendId, toggleSelector) {
    if (!window.L || !window.EGYBI_EGYPT_GEO) return;
    var geo = window.EGYBI_EGYPT_GEO, feats = geo.features;
    var rm = window.EGYBI ? window.EGYBI.reduceMotion : false;
    window.EGYBI_MAP.metric = 'population';
    window.EGYBI_MAP.breaks = quantileBreaks(feats.map(function (f) { return f.properties.population; }), 6);

    var map = window.EGYBI.mapkit.create(mapId, {
      doubleClickZoom: false,
      locator: window.EGYBI_EGYPT_GEO || null,
      credit: ['geoboundaries', 'capmas'],
      label: 'Choropleth map of Egypt’s 27 governorates coloured by the '
           + 'selected metric. Tab to a governorate for its value.'
    });
    if (!map) return;
    window.EGYBI_MAP.map = map;

    mkx('outline')(map, geo);
    var layer = L.geoJSON(geo, {
      style: baseStyle,
      onEachFeature: function (feature, lyr) {
        lyr.bindTooltip(tipHtml(feature.properties, 'population'), { sticky: true, direction: 'top', className: 'egypt-map-tip' });
        lyr.on({
          mouseover: function (e) { e.target.setStyle({ weight: 2, color: '#7A5E10', fillColor: '#C9A227', fillOpacity: 0.95 }); e.target.bringToFront(); },
          mouseout: function (e) { window.EGYBI_MAP.layer.resetStyle(e.target); }
        });
      }
    }).addTo(map);
    window.EGYBI_MAP.layer = layer;

    // The last unlabelled map on the site. Every other surface got names on
    // 2026-08-09 and this one was missed, which mattered more here than
    // anywhere else: a choropleth's entire claim is that SOME governorates are
    // darker than others, and a reader who cannot tell which shape is which has
    // been shown a pattern with no way to name what is in it. The hover card
    // said so, and only to a mouse.
    mkx('addLabels')(map, layer, function (p) { return p && p.name; },
                                  { minPx: 62, maxLabels: 16, className: 'mk-label-sm' });

    map.fitBounds(layer.getBounds(), { padding: [6, 6] });

    /* The choropleth §4a was written for. One tab stop into the map, arrow keys
       move geographically, selections are announced, and the same numbers are
       published as a table so a screen reader gets data rather than colour. */
    var current = 'population';
    window.EGYBI.mapkit.choropleth(map, layer, {
      describe: function (f) {
        var pr = f.properties;
        return pr.name + ': ' + METRICS[current].label + ' ' + METRICS[current].fmt(pr[current]);
      },
      table: function () {
        var cols = Object.keys(METRICS);
        var head = cols.map(function (k) {
          return '<th scope="col">' + METRICS[k].label + '</th>';
        }).join('');
        var rows = geo.features.map(function (f) {
          var pr = f.properties;
          return '<tr><th scope="row">' + pr.name + '</th>' + cols.map(function (k) {
            return '<td>' + METRICS[k].fmt(pr[k]) + '</td>';
          }).join('') + '</tr>';
        }).join('');
        return '<table><caption>Egypt governorate indicators — the same data the map shows'
          + '</caption><thead><tr><th scope="col">Governorate</th>' + head
          + '</tr></thead><tbody>' + rows + '</tbody></table>';
      }
    });
    /* A GOVERNORATE YOU CAN REACH WITHOUT HITTING IT.

       Fourteen of the twenty-seven measure under 24px wide at 390px — Gharbia
       is 11x14 — and the shapes are the real shapes of the country, so no
       styling makes them bigger. WCAG 2.5.8 permits a small target where an
       equivalent full-size control does the same job on the same page.

       What tapping a governorate GIVES a sighted reader here is its value, so
       that is what this returns: pick a name, read the number, and the shape
       is focused on the map so the two stay tied together. The sr-only table
       mapkit publishes is the same data, but a table only a screen reader can
       reach is no help at all to the person holding the phone.

       Deliberately a near-copy of the Atlas picker rather than a shared
       helper: the two do different things on selection — the Atlas flies and
       opens a detail panel, this reads out a value — and folding them together
       would mean a parameterised abstraction over two call sites, which is
       more coupling than either page is asking for. */
    (function buildPicker() {
      var sel = document.getElementById('egyptMapPick');
      var out = document.getElementById('egyptMapPickOut');
      if (!sel) return;
      var entries = [];
      layer.eachLayer(function (l) { entries.push({ name: l.feature.properties.name, layer: l }); });
      entries.sort(function (a, b) { return a.name.localeCompare(b.name); });
      entries.forEach(function (e, i) {
        var o = document.createElement('option');
        o.value = String(i); o.textContent = e.name;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () {
        var e = entries[+sel.value];
        if (!e) { if (out) out.textContent = ''; return; }
        var m = window.EGYBI_MAP.metric;
        var pr = e.layer.feature.properties;
        if (out) out.textContent = METRICS[m].label + ': ' + METRICS[m].fmt(pr[m]);
        var el = e.layer.getElement && e.layer.getElement();
        if (el) el.focus();
      });
    }());

    window.EGYBI.mapkit.setHome(map, layer.getBounds());
    buildLegend(document.getElementById(legendId), 'population', window.EGYBI_MAP.breaks,
                feats.map(function (f) { return f.properties.population; }));

    if (toggleSelector) {
      document.querySelectorAll(toggleSelector).forEach(function (btn) {
        btn.addEventListener('click', function () {
          document.querySelectorAll(toggleSelector).forEach(function (b) { b.classList.remove('on'); });
          btn.classList.add('on');
          setMetric(btn.getAttribute('data-metric'), legendId);
        });
      });
    }
    // recompute size once layout settles (Leaflet needs a sized container)
    setTimeout(function () { map.invalidateSize(); map.fitBounds(layer.getBounds(), { padding: [6, 6] }); }, 250);
  };
})();
