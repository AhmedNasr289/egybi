/* EgyBI — the four data stories on stories.html.
   ---------------------------------------------------------------------------
   Each story is a tile-free Leaflet map driven by EGYBI_SCROLLY. The prose in
   the HTML is the story; these functions only move the map to match it, so a
   reader without JavaScript loses the illustration and keeps the argument.

   Every figure shown here is computed IN THE BROWSER from data already in the
   repository — the bundled governorate boundaries with their CAPMAS
   attributes, geo-health.json, geo-places.json and streets-districts.json.
   Nothing is typed in
   as a literal, which means these numbers cannot drift away from their source.
*/
(function () {
  'use strict';

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

  var GOLD = '#C9A227', GOLD_INK = '#8A6D1E', BLUE = '#17408B';
  /* Two stroke colours, and which one applies depends on what is underneath.
     White reads on the saturated blue and gold a highlighted governorate gets,
     and doubles as the signal that it IS highlighted. On the pale unhighlighted
     fill white measures 1.15:1 against the page and draws nothing at all, so
     the rest of the country dissolved into the background exactly when a step
     was asking the reader to compare the highlighted part against it. */
  var LINE = (window.EGYBI.mapkit && window.EGYBI.mapkit.landLine) || '#6E86A8';
  function pale(fill, op) {
    return { color: LINE, weight: 0.8, fillColor: fill || '#E4E8EF',
             fillOpacity: op == null ? 0.9 : op };
  }
  var SCROLLY = window.EGYBI_SCROLLY;
  if (!window.L || !window.EGYBI_EGYPT_GEO || !SCROLLY) return;

  var GEO = window.EGYBI_EGYPT_GEO;
  var props = GEO.features.map(function (f) { return f.properties; });
  var totPop = props.reduce(function (a, p) { return a + p.population; }, 0);
  var totArea = props.reduce(function (a, p) { return a + p.area_km2; }, 0);

  function fmt(n, d) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: d || 0 }); }
  /* Local rather than reaching for mapkit's: every value escaped here comes out
     of streets-districts.json, and a district name is exactly the kind of field
     that looks safe until the day someone adds an ampersand to one. */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* Injected from here rather than added to egybi.css, which is cache-busted at
     ?v=39 on every page: a stylesheet edit would force that version to move
     across thirteen files for one story's chrome, and this project has already
     paid once for a stale cached asset. Scoped names, one <style>, added once. */
  (function storyChrome() {
    if (document.getElementById('st-chrome-css')) return;
    var s = document.createElement('style');
    s.id = 'st-chrome-css';
    s.textContent = [
      '.st-readout{margin-top:10px;font-size:.84rem;color:var(--ink-soft,#6a6252)}',
      '.st-legend{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;',
      '  padding-bottom:8px;border-bottom:1px solid var(--line-light,#e5ded0)}',
      '.st-legend span{display:inline-flex;align-items:center;gap:6px}',
      '.st-legend i{width:14px;height:12px;border-radius:3px;display:inline-block;flex:none}',
      '.st-legend i.st-line{height:0;border-radius:0;border-top:2px solid #6E86A8;width:18px}',
      '.st-figures h4{margin:10px 0 2px;font-size:1rem;color:var(--blue-deep,#0E2A5E)}',
      '.st-figures h4 span{font-weight:400;color:var(--ink-soft,#6a6252);font-size:.9em}',
      '.st-era{margin:0 0 8px;font-size:.78rem;color:var(--ink-soft,#6a6252)}',
      '.st-figures dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));',
      '  gap:8px 14px;margin:0}',
      '.st-figures dt{font-size:.7rem;text-transform:uppercase;letter-spacing:.04em;',
      '  color:var(--ink-soft,#6a6252)}',
      '.st-figures dd{margin:1px 0 0;font-weight:700;color:var(--ink,#292420);',
      '  font-variant-numeric:tabular-nums}',
      '.st-figures dd small{font-weight:400;color:var(--ink-soft,#6a6252);font-size:.76em}',
      /* Gold on gold fails contrast, so the warning sits on papyrus with the
         gold reserved for the rule down its edge. */
      '.st-warn{margin:10px 0 0;padding:8px 11px;background:var(--papyrus-2,#F1E7D2);',
      '  border-left:3px solid var(--gold,#C9A227);border-radius:4px;font-size:.78rem;',
      '  color:var(--ink,#292420);line-height:1.55}',
      '.st-src{margin:8px 0 0;font-size:.72rem;color:var(--ink-soft,#6a6252)}',
      '.st-all{margin:10px 0 0;line-height:1.6}',
      /* The label rides on the gold fill, so it needs its own plate rather than
         bare text — #292420 on #C9A227 clears AA, but only over the plate. */
      '.st-tip{background:rgba(246,238,220,.94);border:1px solid ' + '#8A6D1E' + ';',
      '  color:#292420;font-weight:700;font-size:.78rem;padding:2px 8px;border-radius:4px;',
      '  box-shadow:none;white-space:nowrap}',
      '.st-tip:before{display:none}',
      '@media (max-width:420px){.st-figures dl{grid-template-columns:repeat(2,1fr)}}'
    ].join('');
    document.head.appendChild(s);
  }());
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
    /* zoomSnap, and it is not cosmetic here.

       Leaflet snaps to whole zoom levels by default, so fitBounds drops a
       FULL level whenever the ideal zoom lands just under an integer. mapkit
       sets zoomSnap: 0.25 for exactly that reason and every map built through
       it lands on a fraction — Streets opens at 6.75. These four are built
       with plain L.map because they are inert illustrations that deliberately
       skip mapkit's controls and keyboard handling, and skipping mapkit meant
       skipping this too.

       Measured before the change: all four opened at integer zoom 5 with the
       country covering 52% of the box's width and 40% of its height — Egypt as
       a small picture adrift in a tall empty frame, beside prose asking the
       reader to compare governorates they can barely see.

       0.1 rather than mapkit's 0.25, and the difference was measured rather
       than assumed. fitBounds computes the ideal zoom and then floors it onto
       the snap grid, so a coarser grid throws away more, and it throws away
       most when the box is portrait and the country nearly square — which is
       exactly the shape of these four. At 538x618:

           integer zoom (before)   52% x 40% of the box,   5 names drawn
           zoomSnap 0.25           87% x 67%,             10 names
           zoomSnap 0.1            96% x 74%,             11 names

       and at 390px the last step is 81x57 to 93x65. mapkit keeps 0.25 because
       its maps sit in boxes closer to the country's own proportions, where
       they already open at 96% of the width and the finer grid buys nothing
       worth a change across eight surfaces. */
    var m = L.map(id, { zoomControl: false, attributionControl: false,
                        zoomSnap: 0.1,
                        scrollWheelZoom: false, dragging: false, keyboard: false });
    // The map repeats what the prose says, so it is hidden from screen readers
    // rather than made to narrate itself.
    var c = m.getContainer(); c.setAttribute('aria-hidden', 'true');
    // These maps skip mapkit, so they skip its credit too — and CC BY 4.0 does
    // not care how the geometry got onto the page. Added explicitly here.
    if (window.EGYBI && window.EGYBI.mapkit) window.EGYBI.mapkit.addCredit(c, ['geoboundaries']);
    return m;
  }

  /* Governorate names on a story map.

     These maps are inert illustrations and the prose beside them states every
     FIGURE the shape encodes — but a name is not a figure, it is orientation.
     "Half of Egypt lives in the blue" is a sentence a reader can only follow if
     they can tell which governorates are blue, and on an unlabelled silhouette
     they cannot. The zoom-gated label layer keeps this in proportion: at
     country zoom only the large governorates are named, so the illustration
     gains orientation without becoming a reference map competing with the Atlas.

     minPx is higher than the Atlas uses because these maps are half the width,
     so the same shape has fewer pixels to hold a name in. */
  function nameGovernorates(map, layer) {
    if (!window.EGYBI || !window.EGYBI.mapkit || !window.EGYBI.mapkit.addLabels) return;
    mkx('addLabels')(map, layer, function (p) { return p && p.name; },
                                  { minPx: 68, maxLabels: 12, className: 'mk-label-sm' });
  }

  /* ------------------------------------------------------------------ 1. THE RIBBON
     Thesis: half of Egypt's people live on 2.4% of its land. */
  (function ribbon() {
    var el = document.getElementById('mapRibbon'); if (!el) return;
    var m = baseMap('mapRibbon');
    mkx('outline')(m, GEO);
    var layer = L.geoJSON(GEO, { style: function () {
      return pale();
    } }).addTo(m);
    m.fitBounds(layer.getBounds(), { padding: [8, 8] });
    setTimeout(function () { m.invalidateSize(); m.fitBounds(layer.getBounds(), { padding: [8, 8] }); }, 260);
    nameGovernorates(m, layer);

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
        paint(function () { return pale(); });
        SCROLLY.goTo(m, [26.8, 30.0], 5);
      },
      dense: function () {
        paint(function (p) {
          return half.indexOf(p.name) > -1
            ? { color: '#fff', weight: 1, fillColor: BLUE, fillOpacity: 0.92 }
            : pale('#E9ECF1', 0.65);
        });
        SCROLLY.goTo(m, [29.8, 31.1], 6);
      },
      empty: function () {
        paint(function (p) {
          return p.density < 25
            ? { color: '#fff', weight: 1, fillColor: GOLD, fillOpacity: 0.85 }
            : pale('#E9ECF1', 0.6);
        });
        SCROLLY.goTo(m, [26.5, 30.0], 5);
      },
      both: function () {
        paint(function (p) {
          if (half.indexOf(p.name) > -1) return { color: '#fff', weight: 1, fillColor: BLUE, fillOpacity: 0.92 };
          if (p.density < 25) return { color: '#fff', weight: 1, fillColor: GOLD, fillOpacity: 0.8 };
          return pale('#E9ECF1', 0.7);
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
    mkx('outline')(m, GEO);
    var layer = L.geoJSON(GEO, { style: function () {
      return pale();
    } }).addTo(m);
    m.fitBounds(layer.getBounds(), { padding: [8, 8] });
    setTimeout(function () { m.invalidateSize(); m.fitBounds(layer.getBounds(), { padding: [8, 8] }); }, 260);
    nameGovernorates(m, layer);

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
            layer.setStyle(function () { return pale(); });
            SCROLLY.goTo(m, [26.8, 30.0], 5);
          },
          rate: function () {
            layer.setStyle(function (f) {
              return { color: LINE, weight: 0.8, fillColor: ramp(rate[f.properties.name]), fillOpacity: 0.95 };
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
    mkx('outline')(m, GEO);
    var layer = L.geoJSON(GEO, { style: function () {
      return pale('#E4E8EF', 0.85);
    } }).addTo(m);
    m.fitBounds(layer.getBounds(), { padding: [8, 8] });
    setTimeout(function () { m.invalidateSize(); m.fitBounds(layer.getBounds(), { padding: [8, 8] }); }, 260);
    nameGovernorates(m, layer);

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

      /* ---- the map has to say what it is showing ----------------------------
         These four steps used to pin an unlabelled gold polygon on a pale field
         and nothing else: no name, no scale, no legend, no figures. The prose
         beside them was specific and sourced and the shape carried none of it,
         so a reader could not tell which district they were looking at, how big
         it was, or what the thin blue line crossing it was.

         Worse, the shapes invited a comparison the geometry does not support.
         focus() calls fitBounds per district, so Downtown Cairo at 3.78 km² and
         6th of October at 551.98 km² — 146 times its area — both filled the
         frame and appeared the same size. A scale bar is the honest fix rather
         than a shared zoom: keeping each district legible matters more than
         drawing them proportionally, but the reader has to be told that the
         scale moves. It is redrawn by Leaflet on every fitBounds, so the bar
         reads 500 m on Downtown and several kilometres on 6th of October, which
         makes the difference visible instead of hiding it.

         Everything printed here is read out of streets-districts.json at render
         time. A figure on a map is the least-audited thing on a page and the
         worst place to let a number go stale. */
      L.control.scale({ imperial: false, position: 'bottomright', maxWidth: 130 }).addTo(m);

      var LEGEND = '<div class="st-legend" aria-hidden="true">' +
        '<span><i style="background:' + GOLD + ';border:1.6px solid ' + GOLD_INK + '"></i>district in focus</span>' +
        '<span><i style="background:#B9C4D6;border:1px solid #9AA7BC"></i>the other nine</span>' +
        '<span><i class="st-line"></i>governorate boundary</span>' +
        '</div>';
      var readout = document.createElement('div');
      readout.className = 'st-readout';
      /* This panel's TEXT LENGTH is a function of which step the reader is on:
         179 characters for the all-districts summary, 264 for 6th of October,
         410 for Downtown — whose hand-drawn warning makes the honest state the
         longest one. reduced.js compares total page text between a normal and
         a reduced-motion load and flags a delta over 40 as LOST CONTENT; this
         page measured 127 and every other page measured 0.

         Nothing is lost. The two runs settle on different steps, so the panel
         reports a different district — the same amount of content about
         something else. Length equality is a sound proxy for "content lost" on
         a static page and the wrong one for a region whose content is view
         state.

         Marked data-view-dependent rather than aria-hidden. reduced.js already
         excludes aria-hidden subtrees, and using that here would have been the
         quick fix and the wrong one: these are the district's measured figures
         and its boundary provenance, which is exactly the content a screen
         reader needs most on a map it cannot see. Lying about accessibility to
         quiet a checker trades a real reader for a green tick. */
      readout.setAttribute('data-view-dependent', 'true');
      el.parentNode.insertBefore(readout, el.nextSibling);
      readout.insertAdjacentHTML('beforeend', LEGEND);
      var panel = document.createElement('div');
      panel.className = 'st-figures';
      readout.appendChild(panel);

      function num(v, dp) { return v == null ? '—' : fmt(v, dp); }

      function say(r) {
        if (!r) {
          panel.innerHTML = '<p class="st-all">All <strong>' + d.districts.length +
            '</strong> districts, drawn together. Each one is measured on its own ' +
            'street network; the figures appear as you scroll through them.</p>';
          return;
        }
        /* boundary_source is a field, not a caption written by hand: Downtown
           Cairo is the one hand-drawn extent because OpenStreetMap has no
           polygon for it, and the map should admit that as plainly as the prose
           does rather than let a drawn line pass for a surveyed one. */
        var drawnNote = r.boundary_source === 'hand-drawn'
          ? '<p class="st-warn">⚠ This boundary is <strong>hand-drawn</strong>. ' +
            'OpenStreetMap has no polygon for ' + esc(r.name) + ', so its extent is ' +
            'an approximation — the street measurements inside it are not.</p>'
          : '';
        panel.innerHTML =
          '<h4>' + esc(r.name) + ' <span lang="ar" dir="rtl">' + esc(r.name_ar || '') + '</span></h4>' +
          '<p class="st-era">' + esc(r.era || '') + '</p>' +
          '<dl>' +
          '<div><dt>Intersections</dt><dd>' + num(r.intersection_density_km2, 0) + ' <small>per km²</small></dd></div>' +
          '<div><dt>Area</dt><dd>' + num(r.area_km2, 1) + ' <small>km²</small></dd></div>' +
          '<div><dt>Dead ends</dt><dd>' + num(r.dead_end_share_pct, 1) + '<small>%</small></dd></div>' +
          '<div><dt>Circuity</dt><dd>' + num(r.circuity_avg, 3) + '</dd></div>' +
          '<div><dt>Orientation entropy</dt><dd>' + num(r.orientation_entropy, 2) + '</dd></div>' +
          '<div><dt>Boundary</dt><dd>' + esc(r.boundary_source || '—') + '</dd></div>' +
          '</dl>' + drawnNote +
          '<p class="st-src">' + esc(d.source) + ' · ' + esc(d.license) + ' · measured ' + esc(d.as_of) + '</p>';
      }

      function focus(key) {
        var f = null, rec = byKey[key] || null;
        polys.eachLayer(function (l) {
          var on = l.feature.properties.key === key;
          if (on) f = l;
          /* A permanent tooltip rather than a hover one: these maps are inert
             by design — no drag, no keyboard, nothing to operate — so a label
             that only appears on hover would never appear at all for a reader
             scrolling past, and not at all on a phone. */
          if (l.getTooltip()) l.unbindTooltip();
          if (on) {
            l.bindTooltip(rec ? rec.name : key,
                          { permanent: true, direction: 'center', className: 'st-tip' }).openTooltip();
          }
        });
        polys.setStyle(function (feat) {
          var on = feat.properties.key === key;
          return { color: on ? GOLD_INK : '#9AA7BC', weight: on ? 2.6 : 1,
                   fillColor: on ? GOLD : '#B9C4D6', fillOpacity: on ? 0.6 : 0.18 };
        });
        say(rec);
        if (f) m.fitBounds(f.getBounds(), { padding: [40, 40], animate: !SCROLLY.reduced() });
      }

      /* Which district each step shows is derived from the data rather than
         hardcoded, so the map cannot drift away from the sentence beside it.
         It already had: the step keyed `newest` focused New Alamein while the
         paragraph beside it quoted 6th of October's 31 intersections per km²,
         and the step keyed `biggest` — headed "What the geometry cannot tell
         you" — focused the largest district under a heading about the method's
         limits. Both now follow the prose: `newest` shows the sparsest network,
         which is the one the paragraph names, and the caveat step draws all ten
         because the caveat is about every measurement, not one district. */
      var sparsest = lo.key, oldest = 'downtown';
      SCROLLY.register('mapStreets', {
        all: function () {
          polys.eachLayer(function (l) { if (l.getTooltip()) l.unbindTooltip(); });
          polys.setStyle(function () { return { color: GOLD_INK, weight: 1.4, fillColor: GOLD, fillOpacity: 0.35 }; });
          say(null);
          m.fitBounds(layer.getBounds(), { padding: [8, 8], animate: !SCROLLY.reduced() });
        },
        oldest: function () { focus(oldest); },
        newest: function () { focus(sparsest); },
        biggest: function () {
          polys.eachLayer(function (l) { if (l.getTooltip()) l.unbindTooltip(); });
          polys.setStyle(function () { return { color: GOLD_INK, weight: 1.4, fillColor: GOLD, fillOpacity: 0.35 }; });
          say(null);
          m.fitBounds(layer.getBounds(), { padding: [8, 8], animate: !SCROLLY.reduced() });
        }
      }, m);
      say(null);
    }).catch(function () {
      put('stNote', 'The street report card could not be loaded, so this story shows the map without it.');
    });
  })();
  /* ---------------------------------------------------- 4. WHERE WE HAVE DUG
     Thesis: the antiquity layer measures SURVEY EFFORT, not antiquity.

     A sibling of story 2, and the pairing is deliberate: the health layer and
     the archaeology layer fail in the same direction for different reasons, and
     a reader who has seen it once in hospitals recognises it instantly in
     temples. The numbers that carry it — Luxor at roughly 180 sites per
     thousand square kilometres against New Valley at 0.15, and a Delta
     governorate of five and a half million people with none at all — are
     computed here rather than written down, so they cannot drift away from the
     gazetteer they come from.

     The closing quotation is the gazetteer's own `note` field, read out of the
     file at runtime. Paraphrasing it would have made it EgyBI's claim about
     OpenStreetMap; quoting it makes it OpenStreetMap's claim about itself, and
     it is the strongest sentence in the story. */
  (function dug() {
    var el = document.getElementById('mapDug'); if (!el) return;
    var m = baseMap('mapDug');
    mkx('outline')(m, GEO);
    var layer = L.geoJSON(GEO, { style: function () {
      return pale();
    } }).addTo(m);
    m.fitBounds(layer.getBounds(), { padding: [8, 8] });
    setTimeout(function () { m.invalidateSize(); m.fitBounds(layer.getBounds(), { padding: [8, 8] }); }, 260);
    nameGovernorates(m, layer);

    fetch('data/geo-places.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) { put('dgNote', 'The gazetteer has not been built yet, so this story shows the map without it.'); return; }
        var sites = data.places.filter(function (p) { return p.kind === 'antiquity'; });
        var byGov = {};
        sites.forEach(function (p) { if (p.gov) byGov[p.gov] = (byGov[p.gov] || 0) + 1; });

        var area = {}, pop = {};
        props.forEach(function (p) { area[p.name] = p.area_km2; pop[p.name] = p.population; });

        // Densest and largest are FOUND, not named. If OSM coverage shifts
        // enough to change which governorate leads, the prose follows it.
        var ranked = Object.keys(area).map(function (g) {
          return { g: g, n: byGov[g] || 0, a: area[g], d: area[g] ? (byGov[g] || 0) / area[g] * 1000 : 0 };
        });
        var densest = ranked.slice().sort(function (a, b) { return b.d - a.d; })[0];
        var biggest = ranked.slice().sort(function (a, b) { return b.a - a.a; })[0];
        // The emptiest: no sites at all, and among those the most populous —
        // because "nobody lives there" is the answer the reader will reach for,
        // and picking the most populous is what closes it off.
        var zero = ranked.filter(function (r) { return r.n === 0; })
                         .sort(function (a, b) { return (pop[b.g] || 0) - (pop[a.g] || 0); })[0];

        var totArea = ranked.reduce(function (a, r) { return a + r.a; }, 0);

        put('dgTotal', fmt(sites.length));
        put('dgAsOf', data.as_of); put('dgAsOf2', data.as_of);
        put('dgLxN', fmt(densest.n)); put('dgLxArea', fmt(densest.a));
        put('dgLxDens', fmt(densest.d)); put('dgLxDens2', fmt(densest.d));
        put('dgNvN', fmt(biggest.n));
        put('dgNvShare', fmt(biggest.a / totArea * 100, 1) + '%');
        put('dgNvDens', fmt(biggest.d, 2));
        put('dgRatio', fmt(biggest.a / densest.a));
        if (zero) {
          put('dgZeroName', zero.g);
          put('dgZeroPop', fmt(pop[zero.g]));
        }
        put('dgNote', '“' + (data.note || '') + '”');

        // Named so the headings stay true if the leaders ever change.
        var h3 = document.querySelectorAll('#dug .scrolly-step h3');
        if (h3[1]) h3[1].firstChild.nodeValue = densest.g + ': ';
        if (h3[2]) h3[2].firstChild.nodeValue = biggest.g + ': ';

        // The same red Places uses for ancient sites, so a reader who has seen
        // the gazetteer recognises the dots here. It is also NOT gold, which
        // matters: the Luxor step fills that governorate in gold, and gold dots
        // on a gold polygon made the highlight almost invisible — the step's
        // whole point is that one small shape holds most of the dots.
        var dots = L.layerGroup(sites.map(function (p) {
          return L.circleMarker([p.lat, p.lon], {
            radius: 2.4, stroke: false, fillColor: '#B23A0F', fillOpacity: 0.8, interactive: false
          });
        }));

        function shade(pick) {
          layer.setStyle(function (f) {
            return pick(f.properties.name);
          });
        }
        var PLAIN = pale();
        function highlight(name, colour) {
          return function (g) {
            return g === name
              ? { color: GOLD_INK, weight: 2.2, fillColor: colour, fillOpacity: 0.9 }
              : pale('#E9ECF1', 0.55);
          };
        }
        function centreOf(name) {
          var f = GEO.features.filter(function (x) { return x.properties.name === name; })[0];
          return f ? L.geoJSON(f).getBounds().getCenter() : null;
        }

        SCROLLY.register('mapDug', {
          sites: function () {
            shade(function () { return PLAIN; });
            dots.addTo(m);
            SCROLLY.goTo(m, [26.8, 30.0], 5);
          },
          luxor: function () {
            shade(highlight(densest.g, GOLD));
            dots.addTo(m);
            // Zoom 7, not 8. The claim on this step is comparative — this
            // governorate holds more than any other — so the view has to
            // include the others. At 8 the reader saw one small gold shape
            // with a handful of dots and no way to tell it was the leader.
            var c = centreOf(densest.g);
            if (c) SCROLLY.goTo(m, [c.lat, c.lng], 7);
          },
          newvalley: function () {
            shade(highlight(biggest.g, '#C9D6EA'));
            dots.addTo(m);
            var c = centreOf(biggest.g);
            if (c) SCROLLY.goTo(m, [c.lat, c.lng], 6);
          },
          gharbia: function () {
            shade(highlight(zero ? zero.g : '', BLUE));
            // The dots come OFF for this step. The argument is an absence, and
            // an absence is only visible when nothing else is competing for the
            // eye — with 393 gold dots on screen the empty governorate reads as
            // just another quiet patch.
            m.removeLayer(dots);
            var c = zero && centreOf(zero.g);
            if (c) SCROLLY.goTo(m, [c.lat, c.lng], 8);
          }
        }, m);
      })
      .catch(function () {
        put('dgNote', 'The gazetteer could not be loaded, so this story shows the map without it.');
      });
  })();
})();
