/* EgyBI — the three data stories on stories.html.
   ---------------------------------------------------------------------------
   Each story is a tile-free Leaflet map driven by EGYBI_SCROLLY. The prose in
   the HTML is the story; these functions only move the map to match it, so a
   reader without JavaScript loses the illustration and keeps the argument.

   Every figure shown here is computed IN THE BROWSER from data already in the
   repository — the bundled governorate boundaries with their CAPMAS
   attributes, geo-health.json, and streets-districts.json. Nothing is typed in
   as a literal, which means these numbers cannot drift away from their source.
*/
(function () {
  'use strict';

  var GOLD = '#C9A227', GOLD_INK = '#8A6D1E', BLUE = '#17408B';
  var SCROLLY = window.EGYBI_SCROLLY;
  if (!window.L || !window.EGYBI_EGYPT_GEO || !SCROLLY) return;

  var GEO = window.EGYBI_EGYPT_GEO;
  var props = GEO.features.map(function (f) { return f.properties; });
  var totPop = props.reduce(function (a, p) { return a + p.population; }, 0);
  var totArea = props.reduce(function (a, p) { return a + p.area_km2; }, 0);

  function fmt(n, d) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: d || 0 }); }
  function put(id, txt) { var e = document.getElementById(id); if (e) e.textContent = txt; }

  function baseMap(id) {
    /* Deliberately NOT routed through mapkit, and deliberately still inert.
       Considered making these interactive with the rest and decided against it.

       These maps sit inside a data story and illustrate the sentence beside
       them — the prose already states every figure the shape encodes. Giving
       them zoom buttons, a locator and tab stops would add a second focus stop
       per paragraph for a reader who gains nothing by landing there, and would
       invite panning away from the one view the sentence is about. An
       illustration that can be moved off its subject is worse than one that
       cannot.

       So they keep dragging:false, keyboard:false and aria-hidden: nothing to
       operate, nothing announced twice. The interactive maps on the Atlas,
       Places, Streets, Explore and Visit are where a reader goes to explore;
       this is where they go to read. If a story ever carries a figure the
       prose does NOT state, this decision should be revisited for that map. */
    var m = L.map(id, { zoomControl: false, attributionControl: false,
                        scrollWheelZoom: false, dragging: false, keyboard: false });
    // The map repeats what the prose says, so it is hidden from screen readers
    // rather than made to narrate itself.
    var c = m.getContainer(); c.setAttribute('aria-hidden', 'true');
    return m;
  }

  /* ------------------------------------------------------------------ 1. THE RIBBON
     Thesis: half of Egypt's people live on 2.4% of its land. */
  (function ribbon() {
    var el = document.getElementById('mapRibbon'); if (!el) return;
    var m = baseMap('mapRibbon');
    var layer = L.geoJSON(GEO, { style: function () {
      return { color: '#fff', weight: 0.8, fillColor: '#E4E8EF', fillOpacity: 0.9 };
    } }).addTo(m);
    m.fitBounds(layer.getBounds(), { padding: [8, 8] });
    setTimeout(function () { m.invalidateSize(); m.fitBounds(layer.getBounds(), { padding: [8, 8] }); }, 260);

    // Densest-first, accumulating until half the population is covered.
    var byDens = props.slice().sort(function (a, b) { return b.density - a.density; });
    var cum = 0, half = [];
    for (var i = 0; i < byDens.length && cum < totPop / 2; i++) { cum += byDens[i].population; half.push(byDens[i].name); }
    var halfArea = byDens.slice(0, half.length).reduce(function (a, p) { return a + p.area_km2; }, 0);
    var sparse = props.filter(function (p) { return p.density < 25; });
    var sparseArea = sparse.reduce(function (a, p) { return a + p.area_km2; }, 0);
    var sparsePop = sparse.reduce(function (a, p) { return a + p.population; }, 0);

    // Figures written into the prose from the data, never typed as literals.
    put('rbHalfN', half.length);
    put('rbHalfArea', fmt(100 * halfArea / totArea, 1) + '%');
    put('rbSparseN', sparse.length);
    put('rbSparseArea', fmt(100 * sparseArea / totArea, 1) + '%');
    put('rbSparsePop', fmt(100 * sparsePop / totPop, 1) + '%');
    put('rbTotPop', fmt(totPop));
    put('rbTotArea', fmt(totArea));

    function paint(fn) {
      layer.setStyle(function (f) { return fn(f.properties); });
    }
    SCROLLY.register('mapRibbon', {
      whole: function () {
        paint(function () { return { color: '#fff', weight: 0.8, fillColor: '#E4E8EF', fillOpacity: 0.9 }; });
        SCROLLY.goTo(m, [26.8, 30.0], 5);
      },
      dense: function () {
        paint(function (p) {
          return half.indexOf(p.name) > -1
            ? { color: '#fff', weight: 1, fillColor: BLUE, fillOpacity: 0.92 }
            : { color: '#fff', weight: 0.8, fillColor: '#E9ECF1', fillOpacity: 0.65 };
        });
        SCROLLY.goTo(m, [29.8, 31.1], 6);
      },
      empty: function () {
        paint(function (p) {
          return p.density < 25
            ? { color: '#fff', weight: 1, fillColor: GOLD, fillOpacity: 0.85 }
            : { color: '#fff', weight: 0.8, fillColor: '#E9ECF1', fillOpacity: 0.6 };
        });
        SCROLLY.goTo(m, [26.5, 30.0], 5);
      },
      both: function () {
        paint(function (p) {
          if (half.indexOf(p.name) > -1) return { color: '#fff', weight: 1, fillColor: BLUE, fillOpacity: 0.92 };
          if (p.density < 25) return { color: '#fff', weight: 1, fillColor: GOLD, fillOpacity: 0.8 };
          return { color: '#fff', weight: 0.8, fillColor: '#E9ECF1', fillOpacity: 0.7 };
        });
        SCROLLY.goTo(m, [26.8, 30.0], 5);
      }
    }, m);
  })();

  /* ------------------------------------------------------- 2. WHAT THE MAP KNOWS
     Thesis: the health layer measures MAPPING, not healthcare. */
  (function mapped() {
    var el = document.getElementById('mapHealth'); if (!el) return;
    var m = baseMap('mapHealth');
    var layer = L.geoJSON(GEO, { style: function () {
      return { color: '#fff', weight: 0.8, fillColor: '#E4E8EF', fillOpacity: 0.9 };
    } }).addTo(m);
    m.fitBounds(layer.getBounds(), { padding: [8, 8] });
    setTimeout(function () { m.invalidateSize(); m.fitBounds(layer.getBounds(), { padding: [8, 8] }); }, 260);

    fetch('data/geo-health.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (h) {
        if (!h) { put('hlNote', 'The health layer has not been built yet, so this story shows the map without it.'); return; }
        var pop = {};
        props.forEach(function (p) { pop[p.name] = p.population; });
        var rate = {};
        Object.keys(h.by_gov).forEach(function (g) {
          var n = h.by_gov[g].hospitals + h.by_gov[g].clinics;
          if (pop[g]) rate[g] = 1e6 * n / pop[g];
        });
        var vals = Object.keys(rate).map(function (g) { return { g: g, r: rate[g] }; })
                         .sort(function (a, b) { return a.r - b.r; });
        var lo = vals[0], hi = vals[vals.length - 1];
        put('hlTotal', fmt(h.total));
        put('hlAsOf', h.as_of);
        put('hlHi', hi.g); put('hlHiR', fmt(hi.r, 1));
        put('hlLo', lo.g); put('hlLoR', fmt(lo.r, 1));
        put('hlRatio', fmt(hi.r / lo.r) + '×');

        var max = hi.r;
        function ramp(v) {
          if (v == null) return '#E9ECF1';
          var t = Math.min(1, Math.sqrt(v / max));            // sqrt so the tail does not flatten everything
          var stops = ['#EEF1F6', '#C6D2E4', '#8FA6C9', '#4F6FA5', '#17408B'];
          return stops[Math.min(stops.length - 1, Math.floor(t * stops.length))];
        }
        SCROLLY.register('mapHealth', {
          flat: function () {
            layer.setStyle(function () { return { color: '#fff', weight: 0.8, fillColor: '#E4E8EF', fillOpacity: 0.9 }; });
            SCROLLY.goTo(m, [26.8, 30.0], 5);
          },
          rate: function () {
            layer.setStyle(function (f) {
              return { color: '#fff', weight: 0.8, fillColor: ramp(rate[f.properties.name]), fillOpacity: 0.95 };
            });
            SCROLLY.goTo(m, [26.8, 30.0], 5);
          },
          sinai: function () {
            layer.setStyle(function (f) {
              var on = f.properties.name === hi.g;
              return { color: on ? GOLD_INK : '#fff', weight: on ? 2.4 : 0.8,
                       fillColor: on ? GOLD : ramp(rate[f.properties.name]), fillOpacity: on ? 0.95 : 0.5 };
            });
            SCROLLY.goTo(m, [28.8, 33.8], 7);
          },
          delta: function () {
            layer.setStyle(function (f) {
              var on = f.properties.name === lo.g;
              return { color: on ? GOLD_INK : '#fff', weight: on ? 2.4 : 0.8,
                       fillColor: on ? '#B23A0F' : ramp(rate[f.properties.name]), fillOpacity: on ? 0.95 : 0.5 };
            });
            SCROLLY.goTo(m, [30.9, 30.6], 8);
          }
        }, m);
      })
      .catch(function () { put('hlNote', 'The health layer could not be loaded, so this story shows the map without it.'); });
  })();

  /* ------------------------------------------------- 3. A CENTURY OF STREET PLANS
     Thesis: planning eras leave measurable geometric fingerprints. */
  (function streets() {
    var el = document.getElementById('mapStreets'); if (!el) return;
    var m = baseMap('mapStreets');
    var layer = L.geoJSON(GEO, { style: function () {
      return { color: '#fff', weight: 0.8, fillColor: '#E4E8EF', fillOpacity: 0.85 };
    } }).addTo(m);
    m.fitBounds(layer.getBounds(), { padding: [8, 8] });
    setTimeout(function () { m.invalidateSize(); m.fitBounds(layer.getBounds(), { padding: [8, 8] }); }, 260);

    Promise.all([
      fetch('data/streets-districts.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }),
      fetch('data/streets-boundaries.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; })
    ]).then(function (res) {
      var d = res[0], b = res[1];
      if (!d || !b) { put('stNote', 'The street report card has not been built yet, so this story shows the map without it.'); return; }
      var byKey = {}; d.districts.forEach(function (r) { byKey[r.key] = r; });
      var polys = L.geoJSON(b, { style: function () {
        return { color: GOLD_INK, weight: 1.4, fillColor: GOLD, fillOpacity: 0.35 };
      } }).addTo(m);

      var sorted = d.districts.slice().sort(function (a, b2) { return a.intersection_density_km2 - b2.intersection_density_km2; });
      var lo = sorted[0], hi = sorted[sorted.length - 1];
      put('stN', d.districts.length);
      put('stAsOf', d.as_of);
      put('stHi', hi.name); put('stHiD', fmt(hi.intersection_density_km2, 0));
      put('stLo', lo.name); put('stLoD', fmt(lo.intersection_density_km2, 0));
      put('stRatio', fmt(hi.intersection_density_km2 / lo.intersection_density_km2, 1) + '×');
      var drawn = d.districts.filter(function (r) { return r.boundary_source === 'hand-drawn'; });
      put('stDrawn', drawn.length ? drawn.map(function (r) { return r.name; }).join(', ') : 'none');

      function focus(key) {
        var f = null;
        polys.eachLayer(function (l) { if (l.feature.properties.key === key) f = l; });
        polys.setStyle(function (feat) {
          var on = feat.properties.key === key;
          return { color: on ? GOLD_INK : '#9AA7BC', weight: on ? 2.6 : 1,
                   fillColor: on ? GOLD : '#B9C4D6', fillOpacity: on ? 0.6 : 0.18 };
        });
        if (f) m.fitBounds(f.getBounds(), { padding: [40, 40], animate: !SCROLLY.reduced() });
      }
      SCROLLY.register('mapStreets', {
        all: function () {
          polys.setStyle(function () { return { color: GOLD_INK, weight: 1.4, fillColor: GOLD, fillOpacity: 0.35 }; });
          m.fitBounds(layer.getBounds(), { padding: [8, 8], animate: !SCROLLY.reduced() });
        },
        oldest: function () { focus('downtown'); },
        newest: function () { focus(byKey['new-alamein'] ? 'new-alamein' : 'new-cairo'); },
        biggest: function () { focus('6th-october'); }
      }, m);
    }).catch(function () {
      put('stNote', 'The street report card could not be loaded, so this story shows the map without it.');
    });
  })();
})();
