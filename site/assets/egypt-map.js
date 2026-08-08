/* EgyBI — Egypt governorate choropleth (BI-grade, offline) via Leaflet.
   Renders window.EGYBI_EGYPT_GEO (bundled geoBoundaries EGY ADM1 + KB data) as a
   vector choropleth — NO tile layer, so there are zero runtime external calls and
   it works on a strict static/same-origin deploy. Colours by QUANTILE bin (6 blue
   shades) so a skewed metric (Cairo's 10.5M vs Sinai's 146k) stays readable, the
   way Power BI / Tableau bin skewed geodata. Hover highlights a governorate gold
   and shows its real value; a custom HTML legend lists each bin's value range. */
(function () {
  window.EGYBI_MAP = { map: null, layer: null, metric: 'population', breaks: null };

  var METRICS = {
    population: { label: 'Population (2023)', fmt: function (v) { return (v / 1e6).toFixed(2) + ' M'; } },
    density:    { label: 'Density', fmt: function (v) { return Math.round(v).toLocaleString() + ' /km²'; } },
    urban_pct:  { label: 'Urban population', fmt: function (v) { return v.toFixed(1) + '% urban'; } },
    growth:     { label: 'Growth 2017→2023', fmt: function (v) { return (v >= 0 ? '+' : '') + v.toFixed(1) + '%'; } },
    area_km2:   { label: 'Area', fmt: function (v) { return Math.round(v).toLocaleString() + ' km²'; } }
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

    map.fitBounds(layer.getBounds(), { padding: [6, 6] });
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
