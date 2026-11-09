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
  /* A dataset's date, written as the site writes dates ("3 November 2026",
     EGYBI.fmt in assets/egfmt.js), never as raw ISO. Falls back to the
     value as written if egfmt.js did not load. */
  function asOf(v) {
    var F = window.EGYBI && window.EGYBI.fmt;
    return F ? F.dateOrRaw(v, 'en', 'prose') : (v == null ? '' : String(v));
  }

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
      // `good: 'low'` here is a DISPLAY CONVENTION, not a quality claim — it
      // only puts the more directionally concentrated districts at the dark end
      // of the ramp. Low entropy is not "better": a radial plan is deliberate,
      // walkable and scores high. See the caveat printed under the roses.
      label: 'Orientation entropy', unit: '', good: 'low',
      fmt: function (v) { return v.toFixed(2); },
      what: 'How concentrated the street directions are. A four-way grid puts nearly all its length into two opposing pairs and scores about 1.39; bearings spread evenly around the compass approach 3.58. A high score can mean disorder or a deliberate radial plan — this number alone cannot tell you which.'
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
    S.map = window.EGYBI.mapkit.create('streetsMap', {
      doubleClickZoom: false,
      locator: window.EGYBI_EGYPT_GEO || null,
      credit: ['geoboundaries', 'osm'],
      label: 'Map of the measured Egyptian districts, shaded by the selected '
           + 'street-network metric. Tab to a district and press Enter for its figures.'
    });
    if (!S.map) return;

    /* The ten measured districts run from New Alamein on the north coast to
       Luxor 600 km south, so fitting all of them puts the eight Cairo districts
       at a few pixels across. That was not a bug — the extent was correct — but
       the result read as specks of nothing on an empty ground, because there was
       no country underneath to locate them against.

       Drawing Egypt's governorates as a pale base fixes the legibility without
       touching the extent: the same view now says "ten districts, here, in this
       country" instead of "some marks". It also gives the locator inset an
       outline to draw, which it silently had none of before. */
    if (window.EGYBI_EGYPT_GEO) {
      // Paler than the districts on purpose — but "paler" had become "absent".
      // Its white boundary measured 1.15:1 against the page, so the country
      // that is meant to say "ten districts, HERE" had no outline of its own.
      // The halo restores the coast without darkening the internal borders,
      // which would have put the base back into competition with the districts.
      mkx('outline')(S.map, window.EGYBI_EGYPT_GEO);
      S.base = L.geoJSON(window.EGYBI_EGYPT_GEO, {
        interactive: false,          // context, not a target — never steal a click
        // Deliberately flatter and paler than the districts. The first version
        // reused the Places base style, which is the SAME fill and stroke the
        // districts use, so ten measured districts vanished into the country
        // behind them.
        style: function () {
          return { color: '#FFFFFF', weight: 0.8, fillColor: '#E7ECF3', fillOpacity: 0.75 };
        }
      }).addTo(S.map);
      S.base.bringToBack();
    }
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
        lyr.bindTooltip('<strong>' + esc(d.name) + '</strong>' +
          (d.boundary_source === 'hand-drawn' ? ' <em>(hand-drawn extent)</em>' : '') + '<br>' + esc(d.era) +
                        '<br>' + m.label + ': <strong>' + m.fmt(d[S.metric]) + '</strong>',
                        { sticky: true, direction: 'top', className: 'egypt-map-tip' });
        lyr.on({
          mouseover: function (e) { e.target.setStyle({ weight: 3, color: GOLD_INK }); e.target.bringToFront(); },
          mouseout: function (e) { S.layer.resetStyle(e.target); },
          click: function () { select(d.key); }
        });
      }
    }).addTo(S.map);
    if (S.pins) S.map.removeLayer(S.pins);
    S.pins = L.layerGroup();
    S.layer.eachLayer(function (lyr) {
      var d = byKey(lyr.feature.properties.key);
      if (!d) return;
      var c = lyr.getBounds().getCenter();
      var pin = L.circleMarker(c, {
        radius: 6, fillColor: col(d[S.metric]), fillOpacity: 0.95,
        color: GOLD_INK, weight: 1.5
      });
      pin.bindTooltip('<strong>' + esc(d.name) + '</strong><br>' + m.label +
                      ': <strong>' + m.fmt(d[S.metric]) + '</strong>',
                      { direction: 'top', className: 'egypt-map-tip' });
      pin._dName = d.name;          // read by the label layer
      pin.on('click', function () { select(d.key); });
      pin.on('mouseover', function () { pin.setStyle({ radius: 8, color: GOLD }); });
      pin.on('mouseout', function () { pin.setStyle({ radius: 6, color: GOLD_INK }); });
      S.pins.addLayer(pin);
    });
    S.pins.addTo(S.map);
    // Name the districts. fitBounds spans all ten, which reach from Matrouh to
    // the Red Sea, so the map sits at nearly country scale and the pins are ten
    // near-identical dots crowded around Cairo — a picture that tells a reader
    // nothing about which district is which. Ten labels is a small enough set
    // to show at every zoom rather than gating them.
    mkx('addLabels')(S.map, S.pins, function (props, l) {
      return l && l._dName;
    }, { maxLabels: 20 });
    S.map.fitBounds(S.layer.getBounds(), { padding: [12, 12] });
    window.EGYBI.mapkit.setHome(S.map, S.layer.getBounds());
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
    paintRoseSpread();
  }

  /* The finding the roses make but a reader can miss: the districts barely
     differ on this metric. Computed from the data rather than written down,
     so it stays true when the pipeline reruns and cannot become a stale
     claim about numbers that have since moved. */
  function paintRoseSpread() {
    var el = $('roseSpread'); if (!el) return;
    var hs = S.card.districts
      .map(function (d) { return d.orientation_entropy; })
      .filter(function (h) { return typeof h === 'number'; });
    if (hs.length < 2) { el.textContent = ''; return; }
    var lo = Math.min.apply(null, hs), hi = Math.max.apply(null, hs);
    var GRID = Math.log(4), MAX = Math.log(36);          // 1.386 … 3.584
    var share = (hi - lo) / (MAX - GRID) * 100;
    el.innerHTML = 'Read the numbers together before reading any one of them. ' +
      'Across the ' + hs.length + ' districts measured here, entropy runs from <strong>' +
      lo.toFixed(2) + '</strong> to <strong>' + hi.toFixed(2) + '</strong> &mdash; a spread of ' +
      (hi - lo).toFixed(2) + ', or <strong>' + share.toFixed(0) + '%</strong> of the ' +
      GRID.toFixed(2) + '&ndash;' + MAX.toFixed(2) + ' range. ' +
      (share < 25
        ? 'They are clustered near the high end, which is the actual finding: <strong>none of these districts is a grid by this measure</strong>, khedivial Downtown included. The textbook contrast between a planned grid and an organic tangle does not appear in Cairo, and a metric this flat should not be used to rank the districts against each other. The differences that do separate them are in the other six columns.'
        : 'That is a wide enough spread for the differences between districts to be meaningful.');
  }

  /* The dead-end story, computed rather than asserted.
     The stock critique of desert new towns is that they are cul-de-sac sprawl,
     and the measured data does not support it here. Whatever it does support,
     it should say for itself — so this splits the districts at a fixed
     threshold, names both groups from the data, and prints what it finds. If a
     future run changes the pattern, the sentence changes with it. */
  function paintDeadEndFinding() {
    var el = $('deadEndFinding'); if (!el || !S.card) return;
    var rows = S.card.districts
      .filter(function (d) { return typeof d.dead_end_share_pct === 'number'; })
      .slice().sort(function (a, b) { return b.dead_end_share_pct - a.dead_end_share_pct; });
    if (rows.length < 4) { el.textContent = ''; return; }

    var hi = rows[0], lo = rows[rows.length - 1];
    // Districts at least twice the lowest share — an arbitrary but stated line,
    // chosen because a factor of two is a difference a reader can see.
    var outliers = rows.filter(function (d) { return d.dead_end_share_pct >= 2 * lo.dead_end_share_pct; });
    var names = outliers.map(function (d) { return esc(d.name); });

    el.innerHTML =
      '<strong>The cul-de-sac story is not in this data.</strong> Dead-end share runs from <strong>' +
      lo.dead_end_share_pct.toFixed(1) + '%</strong> at ' + esc(lo.name) + ' to <strong>' +
      hi.dead_end_share_pct.toFixed(1) + '%</strong> at ' + esc(hi.name) + '. ' +
      (outliers.length && outliers.length < rows.length - 1
        ? 'The ' + (outliers.length === 1 ? 'one district' : outliers.length + ' districts') +
          ' at or above twice the lowest share &mdash; ' + names.join(', ') + ' &mdash; ' +
          (outliers.length === 1 ? 'is' : 'are') + ' not the newest here. ' +
          'The desert and coastal new towns, the ones a cul-de-sac critique is usually aimed at, ' +
          'sit near the bottom. What separates them from the older districts is <em>coarseness</em>, ' +
          'not disconnection: far fewer junctions per square kilometre and much longer blocks, ' +
          'which is a different criticism and has to be argued differently.'
        : 'The districts do not separate cleanly on this metric.') +
      ' Era labels are ours; the numbers are not.';
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
      // Three states, kept distinct. A category can have facilities (a
      // percentage), have none mapped (a real zero), or never have answered
      // (null). Printing an unanswered query as "0" would state a count we
      // never obtained, which is the one thing this site must not do.
      var un = acc.unanswered || [];
      var isUn = function (k) { return un.indexOf(k) !== -1; };
      accHtml = '<h4>Walking access</h4>' +
        (acc.carried && acc.measured_on
          ? '<p class="dd-note"><strong>Measured ' + esc(asOf(acc.measured_on)) + '.</strong> The latest ' +
            'build could not re-measure this district, so these are its last measured figures.</p>'
          : '') +
        '<div class="dd-access">' +
        Object.keys(acc.access).map(function (kind) {
          var a = acc.access[kind], body;
          if (a) {
            body = '<strong>' + a.within_15min_pct.toFixed(0) + '%</strong><span class="ac-s">within 15 min · median ' +
                   a.median_min.toFixed(0) + ' min</span>';
          } else if (isUn(kind)) {
            body = '<strong>?</strong><span class="ac-s">not retrieved this build</span>';
          } else {
            body = '<strong>—</strong><span class="ac-s">none mapped in OSM</span>';
          }
          return '<div class="acc-cell"><span class="ac-k">' + esc(kind) + '</span>' + body + '</div>';
        }).join('') + '</div>' +
        '<p class="dd-note">Counted from OSM: ' +
        Object.keys(acc.amenity_counts).map(function (k) {
          var n = acc.amenity_counts[k];
          return (n === null || n === undefined ? 'not retrieved' : n) + ' ' + k; }).join(', ') +
        '. A low score can mean few facilities <em>or</em> few mapped facilities — this data cannot tell them apart.' +
        (un.length
          ? ' <strong>' + esc(un.join(' and ')) + ' did not return a result on this build</strong>, so ' +
            (un.length === 1 ? 'that category is' : 'those categories are') +
            ' shown as unknown rather than as zero, and the score above averages the ' +
            (Object.keys(acc.access).length - un.length) + ' that answered.'
          : '') +
        '</p>' +
        (acc.no_amenities_mapped
          ? '<p class="dd-note dd-drawn"><strong>Nothing of these four kinds is mapped here.</strong> ' +
            'Every query returned an answer and every answer was empty, so this is a statement about ' +
            'OpenStreetMap coverage in this district, not about whether the district has clinics or ' +
            'schools. It almost certainly has both.</p>'
          : '');
    }

    // Downtown Cairo is the one district whose outline is ours rather than
    // OSM's, because OSM has none. Saying so beside its numbers — not only in
    // the method section far below — is the whole condition on drawing it.
    var boundaryHtml = d.boundary_source === 'hand-drawn'
      ? '<p class="dd-note dd-drawn"><strong>Hand-drawn extent.</strong> OpenStreetMap has no ' +
        'polygon for this district under any name or tag — every match we found was a landmark ' +
        '<em>inside</em> it (a palace, a courthouse, a theatre) rather than the district itself. ' +
        'This outline is drawn from its known edges: the Nile, Ramses, Port Said Street and ' +
        'Sayyida Zeinab. Every other district here uses OSM’s own polygon. Because the ' +
        'per-km² figures depend on where that line falls, these are the numbers on this page ' +
        'most sensitive to a judgement call.</p>'
      : '';

    var noteHtml = note
      ? '<h4>Planner&rsquo;s note <span class="ai-tag">AI-generated</span></h4>' +
        '<p class="dd-ai">' + esc(note) + '</p>' +
        '<p class="dd-note">Written by a language model <em>from the numbers above</em>, which are shown next to it so you can check every claim. It is a reading of the metrics, not professional planning advice.</p>'
      : '';

    el.innerHTML = '<h3>' + esc(d.name) + ' <span class="dd-ar">' + esc(d.name_ar) + '</span></h3>' +
      '<p class="dd-era">' + esc(d.era) + ' &middot; ' + d.area_km2.toLocaleString('en-GB') + ' km²</p>' +
      '<p class="dd-why">' + esc(d.why) + '</p>' + boundaryHtml +
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

  /* A district the latest build could not re-measure keeps its last-good row,
     and says from when. Without this a reader would take an August figure for
     this week's. */
  function carriedNote(a) {
    return a.carried && a.measured_on
      ? ' &middot; <strong>measured ' + esc(asOf(a.measured_on)) + '</strong>; the latest build could not re-measure it'
      : '';
  }

  function paintAccessSection() {
    var host = $('accessGrid'), empty = $('accessEmpty');
    if (!host) return;
    if (!S.access) { if (empty) empty.hidden = false; host.innerHTML = ''; return; }
    if (empty) empty.hidden = true;
    // A district with nothing of these four kinds mapped has a null mean, not a
    // zero. Sorting it as 0 would be arithmetically convenient and wrong: it
    // would rank below districts we actually measured, implying we measured it
    // and found the worst access. It sorts to the end and says what it is.
    var num = function (a) {
      return typeof a.mean_within_15min_pct === 'number' ? a.mean_within_15min_pct : -1; };
    var rows = S.access.districts.slice().sort(function (a, b) { return num(b) - num(a); });
    host.innerHTML = rows.map(function (a) {
      var pct = a.mean_within_15min_pct;
      if (typeof pct !== 'number') {
        return '<div class="acc-card" data-key="' + esc(a.key) + '">' +
          '<div class="acc-name">' + esc(a.name) + '</div>' +
          '<div class="acc-bar"><span style="width:2%"></span></div>' +
          '<div class="acc-pct">no data</div>' +
          '<div class="acc-sub">no hospital, clinic, school or pharmacy is mapped inside this ' +
          'boundary, so there is nothing to measure a walk to &mdash; a gap in OpenStreetMap, ' +
          'not a finding about the district' + carriedNote(a) + '</div></div>';
      }
      var un = (a.unanswered || []).length;
      return '<div class="acc-card" data-key="' + esc(a.key) + '">' +
        '<div class="acc-name">' + esc(a.name) + '</div>' +
        '<div class="acc-bar"><span style="width:' + Math.max(2, Math.min(100, pct)) + '%"></span></div>' +
        '<div class="acc-pct">' + pct.toFixed(0) + '%</div>' +
        '<div class="acc-sub">of walkable street within 15 minutes of a mapped hospital, clinic, school or pharmacy' +
        (un ? ' &middot; averaged over the ' + (4 - un) + ' categories that returned a result this build' : '') +
        carriedNote(a) + '</div></div>';
    }).join('');
    host.querySelectorAll('.acc-card').forEach(function (c) {
      c.addEventListener('click', function () { select(c.dataset.key); });
    });
  }

  function paintMeta() {
    var el = $('streetsMeta'); if (!el) return;
    var bits = [];
    if (S.card) bits.push('Street network: OSM via OSMnx, built ' + esc(asOf(S.card.as_of)) +
                          ' &mdash; ' + S.card.districts.length + ' districts.');
    if (S.access) {
      var carried = S.access.districts.filter(function (a) { return a.carried; });
      bits.push('Access layer built ' + esc(asOf(S.access.as_of)) +
        (carried.length
          ? ' &mdash; ' + carried.length + ' of ' + S.access.districts.length +
            ' districts could not be re-measured and keep an earlier measurement, dated on each.'
          : '.'));
    }
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

      paintTable(); paintDeadEndFinding(); paintRoses(); paintAccessSection(); paintMeta();
      if (S.bounds) initMap(); else { var ms = $('mapSection'); if (ms) ms.hidden = true; }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
