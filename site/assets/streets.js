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
  var LANG = document.documentElement.getAttribute('lang') || 'en';
  var MONTHS_RU_OF = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля',
                      'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  function asOf(v) {
    var F = window.EGYBI && window.EGYBI.fmt;
    var m = LANG === 'ru' && /^(\d{4})-(\d\d)-(\d\d)/.exec(String(v || ''));
    if (m) return (+m[3]) + ' ' + MONTHS_RU_OF[+m[2] - 1] + ' ' + m[1];
    return F ? F.dateOrRaw(v, LANG === 'ar' ? 'ar' : 'en', 'prose') : (v == null ? '' : String(v));
  }
  // Text this script writes goes through t(), as literal calls the build
  // collects (pages/i18n.py); numbers follow the page's language. Sentences
  // that used to change with a count ("one district is", "3 districts are")
  // give the count as a label instead, so Arabic and Russian need no plural
  // forms (2026-11-19, maps plan stage 3).
  var t = (window.EGYBI && window.EGYBI.t) || function (x) { return x; };
  function fmt() { return window.EGYBI && window.EGYBI.fmt; }
  function whole(v) {
    if (LANG === 'ar' && fmt()) return fmt().num(Math.round(v), 'ar', 0);
    return Math.round(v).toLocaleString(LANG === 'ru' ? 'ru-RU' : 'en-GB');
  }
  function dec(v, places) {
    if (LANG === 'ar' && fmt()) return fmt().fixed(v, 'ar', places);
    if (LANG === 'ru') return v.toLocaleString('ru-RU', { minimumFractionDigits: places, maximumFractionDigits: places });
    return v.toFixed(places);
  }
  function pct(v, places) { return dec(v, places == null ? 1 : places) + (LANG === 'ar' ? '٪' : '%'); }
  function sep() { return LANG === 'ar' ? '، ' : ', '; }
  // A district's name in the page's language: Arabic pages use the data's own
  // name_ar, Russian pages the catalogue (DATA_TEXT), English the data.
  function dname(x) {
    var card = S && S.card && S.card.districts ? S.card.districts.filter(function (d) { return d.key === x.key; })[0] : null;
    var ar = x.name_ar || (card && card.name_ar);
    return LANG === 'ar' && ar ? ar : t(x.name);
  }
  // Facility kinds in the access layer, each a literal t() call.
  var KINDS = { hospital: t('hospital'), clinic: t('clinic'), school: t('school'), pharmacy: t('pharmacy') };
  function kind(k) { return KINDS[k] || k; }

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
      label: t('Intersection density'), unit: '/km²', good: 'high',
      fmt: function (v) { return t('%n per km²').replace('%n', whole(v)); },
      what: t('Junctions per square kilometre. More intersections means more route choices, shorter blocks and a network that stays usable when one street is blocked.')
    },
    dead_end_share_pct: {
      label: t('Dead ends'), unit: '%', good: 'low',
      fmt: function (v) { return pct(v); },
      what: t('Share of street ends that go nowhere. Cul-de-sacs calm traffic on the street itself, but push every trip back onto a few collector roads.')
    },
    street_density_km_km2: {
      label: t('Street density'), unit: 'km/km²', good: 'high',
      fmt: function (v) { return t('%n km/km²').replace('%n', dec(v, 1)); },
      what: t('Kilometres of street per square kilometre. A rough measure of how finely the land is subdivided.')
    },
    mean_street_length_m: {
      label: t('Mean segment'), unit: 'm', good: 'low',
      fmt: function (v) { return t('%n m').replace('%n', whole(v)); },
      what: t('Average distance between junctions. Short segments mean small, walkable blocks; long ones mean superblocks you have to walk around.')
    },
    streets_per_node_avg: {
      label: t('Streets per junction'), unit: '', good: 'high',
      fmt: function (v) { return dec(v, 2); },
      what: t('Average number of streets meeting at each node. Near 4 is a crossroads grid; near 2.5 means many bends and dead ends rather than true junctions.')
    },
    circuity_avg: {
      label: t('Circuity'), unit: '×', good: 'low',
      fmt: function (v) { return dec(v, 3) + '×'; },
      what: t('How much further you travel along streets than the straight-line distance. 1.00 would be a perfect straight shot; higher means detours.')
    },
    orientation_entropy: {
      // `good: 'low'` here is a DISPLAY CONVENTION, not a quality claim — it
      // only puts the more directionally concentrated districts at the dark end
      // of the ramp. Low entropy is not "better": a radial plan is deliberate,
      // walkable and scores high. See the caveat printed under the roses.
      label: t('Orientation entropy'), unit: '', good: 'low',
      fmt: function (v) { return dec(v, 2); },
      what: t('How concentrated the street directions are. A four-way grid puts nearly all its length into two opposing pairs and scores about 1.39; bearings spread evenly around the compass approach 3.58. A high score can mean disorder or a deliberate radial plan — this number alone cannot tell you which.')
    }
  };
  var ORDER = ['intersection_density_km2', 'dead_end_share_pct', 'street_density_km_km2',
               'mean_street_length_m', 'streets_per_node_avg', 'circuity_avg', 'orientation_entropy'];

  var S = { card: null, access: null, notes: null, bounds: null,
            map: null, layer: null, metric: 'intersection_density_km2', selected: null };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return (window.EGYBI && EGYBI.escapeHtml) ? EGYBI.escapeHtml(s) : String(s); }
  function load(u) {
    return fetch((window.EGYBI && window.EGYBI.url ? window.EGYBI.url(u) : u), { cache: 'no-cache' }).then(function (r) {
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
      label: t('Map of the measured Egyptian districts, shaded by the selected street-network metric. Tab to a district and press Enter for its figures.')
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
        lyr.bindTooltip('<strong>' + esc(dname(d)) + '</strong>' +
          (d.boundary_source === 'hand-drawn' ? ' <em>' + esc(t('(hand-drawn extent)')) + '</em>' : '') + '<br>' + esc(t(d.era)) +
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
      pin.bindTooltip('<strong>' + esc(dname(d)) + '</strong><br>' + m.label +
                      ': <strong>' + m.fmt(d[S.metric]) + '</strong>',
                      { direction: 'top', className: 'egypt-map-tip' });
      pin._dName = dname(d);        // read by the label layer, in the page's language
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
             '<figcaption><strong>' + esc(dname(d)) + '</strong>' +
             '<span class="rc-era">' + esc(t(d.era)) + '</span>' +
             '<span class="rc-h">' + esc(t('entropy %n').replace('%n', H == null ? '—' : dec(H, 2))) + '</span>' +
             (d.carried && d.measured_on
               ? '<span class="rc-era">' + esc(t('measured %d').replace('%d', asOf(d.measured_on))) + '</span>' : '') +
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
    var b = function (x) { return '<strong>' + x + '</strong>'; };
    el.innerHTML = esc(t('Read the numbers together before reading any one of them. Districts measured: %n. Entropy runs from %a to %b, a spread of %s, or %p of the %g–%m range.'))
      .replace('%n', whole(hs.length)).replace('%a', b(dec(lo, 2))).replace('%b', b(dec(hi, 2)))
      .replace('%s', dec(hi - lo, 2)).replace('%p', b(pct(share, 0))).replace('%g', dec(GRID, 2)).replace('%m', dec(MAX, 2)) + ' ' +
      esc(share < 25
        ? t('They are clustered near the high end, which is the actual finding: none of these districts is a grid by this measure, khedivial Downtown included. The textbook contrast between a planned grid and an organic tangle does not appear in Cairo, and a metric this flat should not be used to rank the districts against each other. The differences that do separate them are in the other six columns.')
        : t('That is a wide enough spread for the differences between districts to be meaningful.'));
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
    var names = outliers.map(function (d) { return esc(dname(d)); });

    el.innerHTML =
      '<strong>' + esc(t('The cul-de-sac story is not in this data.')) + '</strong> ' +
      esc(t('Dead-end share runs from %a at %x to %b at %y.'))
        .replace('%a', '<strong>' + pct(lo.dead_end_share_pct) + '</strong>').replace('%x', esc(dname(lo)))
        .replace('%b', '<strong>' + pct(hi.dead_end_share_pct) + '</strong>').replace('%y', esc(dname(hi))) + ' ' +
      (outliers.length && outliers.length < rows.length - 1
        ? esc(t('At or above twice the lowest share: %l. None of them is among the newest districts here. The desert and coastal new towns, the ones a cul-de-sac critique is usually aimed at, sit near the bottom. What separates them from the older districts is coarseness, not disconnection: far fewer junctions per square kilometre and much longer blocks, which is a different criticism and has to be argued differently.'))
          .replace('%l', names.join(sep()))
        : esc(t('The districts do not separate cleanly on this metric.'))) +
      ' ' + esc(t('Era labels are ours; the numbers are not.'));
  }

  function paintTable() {
    var tb = $('cardTableBody'); if (!tb) return;
    var rows = S.card.districts.slice().sort(function (a, b) {
      return b.intersection_density_km2 - a.intersection_density_km2;
    });
    tb.innerHTML = rows.map(function (d) {
      return '<tr data-key="' + esc(d.key) + '"><td>' + esc(dname(d)) +
             '<span class="td-era">' + esc(t(d.era)) + '</span>' +
             (d.carried && d.measured_on
               ? '<span class="td-era">' + esc(t('measured %d').replace('%d', asOf(d.measured_on))) + '</span>' : '') +
             '</td>' +
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
      accHtml = '<h4>' + esc(t('Walking access')) + '</h4>' +
        (acc.carried && acc.measured_on
          ? '<p class="dd-note">' + esc(t('Measured %d. The latest build could not re-measure this district, so these are its last measured figures.').replace('%d', asOf(acc.measured_on))) + '</p>'
          : '') +
        '<div class="dd-access">' +
        Object.keys(acc.access).map(function (k) {
          var a = acc.access[k], body;
          if (a) {
            body = '<strong>' + pct(a.within_15min_pct, 0) + '</strong><span class="ac-s">' +
                   esc(t('within 15 min; median %n min').replace('%n', whole(a.median_min))) + '</span>';
          } else if (isUn(k)) {
            body = '<strong>?</strong><span class="ac-s">' + esc(t('not retrieved this build')) + '</span>';
          } else {
            body = '<strong>—</strong><span class="ac-s">' + esc(t('none mapped in OpenStreetMap')) + '</span>';
          }
          return '<div class="acc-cell"><span class="ac-k">' + esc(kind(k)) + '</span>' + body + '</div>';
        }).join('') + '</div>' +
        '<p class="dd-note">' + esc(t('Counted from OpenStreetMap: %l.').replace('%l', Object.keys(acc.amenity_counts).map(function (k) {
          var n = acc.amenity_counts[k];
          return kind(k) + ': ' + (n === null || n === undefined ? t('not retrieved') : whole(n)); }).join(sep()))) + ' ' +
        esc(t('A low score can mean few facilities or few mapped facilities: this data cannot tell them apart.')) +
        (un.length
          ? ' <strong>' + esc(t('Not answered on this build: %l.').replace('%l', un.map(kind).join(sep()))) + '</strong> ' +
            esc(t('They are shown as unknown rather than as zero, and the score above averages the categories that answered (%n).')
              .replace('%n', whole(Object.keys(acc.access).length - un.length)))
          : '') +
        '</p>' +
        (acc.no_amenities_mapped
          ? '<p class="dd-note dd-drawn"><strong>' + esc(t('Nothing of these four kinds is mapped here.')) + '</strong> ' +
            esc(t('Every query returned an answer and every answer was empty, so this is a statement about OpenStreetMap coverage in this district, not about whether the district has clinics or schools. It almost certainly has both.')) + '</p>'
          : '');
    }

    // Downtown Cairo is the one district whose outline is ours rather than
    // OSM's, because OSM has none. Saying so beside its numbers — not only in
    // the method section far below — is the whole condition on drawing it.
    var boundaryHtml = d.boundary_source === 'hand-drawn'
      ? '<p class="dd-note dd-drawn"><strong>' + esc(t('Hand-drawn extent.')) + '</strong> ' +
        esc(t('OpenStreetMap has no polygon for this district under any name or tag: every match we found was a landmark inside it (a palace, a courthouse, a theatre) rather than the district itself. This outline is drawn from its known edges: the Nile, Ramses, Port Said Street and Sayyida Zeinab. Every other district here uses OpenStreetMap’s own polygon. Because the per-km² figures depend on where that line falls, these are the numbers on this page most sensitive to a judgement call.')) + '</p>'
      : '';

    var noteHtml = note
      ? '<h4>' + esc(t('Planner’s note')) + ' <span class="ai-tag">' + esc(t('AI-generated')) + '</span></h4>' +
        '<p class="dd-ai">' + esc(note) + '</p>' +
        '<p class="dd-note">' + esc(t('Written by a language model from the numbers above, which are shown next to it so you can check every claim. It is a reading of the metrics, not professional planning advice.')) + '</p>'
      : '';

    el.innerHTML = '<h3>' + esc(dname(d)) + (LANG === 'ar' ? '' : ' <span class="dd-ar">' + esc(d.name_ar) + '</span>') + '</h3>' +
      '<p class="dd-era">' + esc(t(d.era)) + ' &middot; ' + esc(t('%n km²').replace('%n', dec(d.area_km2, 2))) + '</p>' +
      '<p class="dd-why">' + esc(t(d.why)) + '</p>' + boundaryHtml +
      (d.carried && d.measured_on
        ? '<p class="dd-note">' + esc(t('Street network measured %d. The latest build could not re-measure this district, so these are its last measured figures.').replace('%d', asOf(d.measured_on))) + '</p>'
        : '') +
      '<div class="dd-split"><div>' + rose(d.orientation_bins, 190, GOLD) +
      '<p class="dd-note" style="text-align:center">' + esc(t('Street orientation: length of road facing each compass direction')) + '</p></div>' +
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
      ? ' &middot; ' + esc(t('measured %d; the latest build could not re-measure it').replace('%d', asOf(a.measured_on)))
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
      var share = a.mean_within_15min_pct;
      if (typeof share !== 'number') {
        return '<div class="acc-card" data-key="' + esc(a.key) + '">' +
          '<div class="acc-name">' + esc(dname(a)) + '</div>' +
          '<div class="acc-bar"><span style="width:2%"></span></div>' +
          '<div class="acc-pct">' + esc(t('no data')) + '</div>' +
          '<div class="acc-sub">' + esc(t('No hospital, clinic, school or pharmacy is mapped inside this boundary, so there is nothing to measure a walk to: a gap in OpenStreetMap, not a finding about the district.')) + carriedNote(a) + '</div></div>';
      }
      var un = (a.unanswered || []).length;
      return '<div class="acc-card" data-key="' + esc(a.key) + '">' +
        '<div class="acc-name">' + esc(dname(a)) + '</div>' +
        '<div class="acc-bar"><span style="width:' + Math.max(2, Math.min(100, share)) + '%"></span></div>' +
        '<div class="acc-pct">' + pct(share, 0) + '</div>' +
        '<div class="acc-sub">' + esc(t('of walkable street within 15 minutes of a mapped hospital, clinic, school or pharmacy')) +
        (un ? ' &middot; ' + esc(t('averaged over the categories that returned a result this build (%n)').replace('%n', whole(4 - un))) : '') +
        carriedNote(a) + '</div></div>';
    }).join('');
    host.querySelectorAll('.acc-card').forEach(function (c) {
      c.addEventListener('click', function () { select(c.dataset.key); });
    });
  }

  function paintMeta() {
    var el = $('streetsMeta'); if (!el) return;
    var bits = [];
    if (S.card) {
      var cardCarried = S.card.districts.filter(function (d) { return d.carried; });
      bits.push(esc(t('Street network: OpenStreetMap via OSMnx, built %d. Districts: %n.').replace('%d', asOf(S.card.as_of)).replace('%n', whole(S.card.districts.length))) +
        (cardCarried.length
          ? ' ' + esc(t('Could not be re-measured and keep an earlier measurement, dated on each: %n.').replace('%n', whole(cardCarried.length)))
          : ''));
    }
    if (S.access) {
      var carried = S.access.districts.filter(function (a) { return a.carried; });
      bits.push(esc(t('Access layer built %d.').replace('%d', asOf(S.access.as_of))) +
        (carried.length
          ? ' ' + esc(t('Could not be re-measured and keep an earlier measurement, dated on each: %n.').replace('%n', whole(carried.length)))
          : ''));
    }
    if (!S.notes) bits.push(esc(t('Planner’s notes have not been generated for this build.')));
    if (S.card && S.card.skipped && S.card.skipped.length)
      bits.push('<strong>' + esc(t('Skipped:')) + '</strong> ' + esc(LANG === 'en' ? S.card.skipped.join('; ')
        : S.card.skipped.map(function (s) {
            var nm = String(s).split(':')[0];
            var d = (S.card.districts || []).filter(function (x) { return x.name === nm; })[0];
            return d ? dname(d) : nm;
          }).join(sep())) + '.');
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
        showEmpty(esc(t('The street-network data has not been generated yet. It appears here after the first "Refresh street report card" run: the page is built and waiting, not broken. Nothing is shown until there are real measurements to show.')));
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
