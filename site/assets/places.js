/* EgyBI — Places: an Egypt-wide gazetteer on a tile-free map.
   ---------------------------------------------------------------------------
   Reads site/data/geo-places.json, built by backend/pipeline/fetch_geo_layers.py
   from OpenStreetMap. Four kinds: cities, towns, airports with an IATA code,
   and archaeological sites.

   TILE-FREE, like every other map here. The governorate outlines come from the
   bundled EGYBI_EGYPT_GEO, and the places come from a JSON file in this repo.
   Nothing on this page contacts a map provider at runtime — no basemap, no
   tile server, no third-party request. That is a deliberate property of the
   site, not an accident of not having got round to a basemap yet.

   WHAT THIS PAGE REFUSES TO DO. It does not sort places into "oases", "Red Sea
   resorts" or "canal cities". Those groupings would be ours rather than the
   data's, and once written next to sourced figures they read as sourced too.
   Each place shows what OSM records — its kind, its name, its coordinates —
   plus the governorate computed by point-in-polygon. The geography a reader
   wants is visible on the map, which is where geography belongs.

   Degrades honestly: if geo-places.json has not been generated yet, the map
   still draws Egypt and the page says the layer is missing rather than
   rendering an empty list that looks like a country with no cities in it.
*/
(function () {
  'use strict';

  var GOLD = '#C9A227', GOLD_INK = '#8A6D1E', BLUE = '#17408B', INK = '#1C1C1C';

  // One colour per kind, chosen to stay distinguishable on the pale governorate
  // fill and to survive the site's dark/light surface alternation.
  var KIND = {
    settlement: { label: 'Cities & towns', colour: BLUE,    r: 4 },
    airport:    { label: 'Airports',       colour: '#0F7B6C', r: 5 },
    antiquity:  { label: 'Ancient sites',  colour: '#B23A0F', r: 3.5 }
  };

  var S = { map: null, data: null, layers: {}, active: { settlement: true, airport: true, antiquity: false }, sel: null };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return (window.EGYBI && EGYBI.escapeHtml) ? EGYBI.escapeHtml(s) : String(s == null ? '' : s); }

  function fmt(n) { return typeof n === 'number' ? n.toLocaleString('en-US') : '—'; }

  function initMap() {
    if (!window.L || !window.EGYBI_EGYPT_GEO) return false;
    S.map = L.map('placesMap', {
      zoomControl: true, attributionControl: false, scrollWheelZoom: false
    });
    // Points must sit above the governorate polygons even while one is hovered
    // and brought to front, which is what these panes are for.
    S.map.createPane('pts').style.zIndex = 640;
    S.base = L.geoJSON(window.EGYBI_EGYPT_GEO, {
      style: function () {
        return { color: '#FFFFFF', weight: 1, fillColor: '#DDE3EC', fillOpacity: 0.85 };
      },
      onEachFeature: function (f, lyr) {
        lyr.bindTooltip(esc(f.properties.name), { sticky: true });
      }
    }).addTo(S.map);
    S.map.fitBounds(S.base.getBounds(), { padding: [6, 6] });
    setTimeout(function () {
      S.map.invalidateSize();
      S.map.fitBounds(S.base.getBounds(), { padding: [6, 6] });
    }, 250);
    return true;
  }

  function drawKind(kind) {
    if (S.layers[kind]) { S.map.removeLayer(S.layers[kind]); delete S.layers[kind]; }
    if (!S.active[kind]) return;
    var spec = KIND[kind];
    var group = L.layerGroup([], { pane: 'pts' });
    S.data.places.filter(function (p) { return p.kind === kind; }).forEach(function (p) {
      var m = L.circleMarker([p.lat, p.lon], {
        pane: 'pts', radius: spec.r, color: '#FFFFFF', weight: 0.9,
        fillColor: spec.colour, fillOpacity: 0.92
      });
      m.bindTooltip('<strong>' + esc(p.name) + '</strong>' +
        (p.gov ? '<br>' + esc(p.gov) : ''), { direction: 'top' });
      m.on('click', function () { select(p); });
      group.addLayer(m);
    });
    group.addTo(S.map);
    S.layers[kind] = group;
  }

  function select(p) {
    S.sel = p;
    var el = $('placeDetail'); if (!el) return;
    var spec = KIND[p.kind] || { label: p.kind };
    var bits = [];
    bits.push('<div class="pd-row"><span>Kind</span><strong>' +
      esc(spec.label.replace(/s$/, '')) + (p.place ? ' · ' + esc(p.place) : '') + '</strong></div>');
    bits.push('<div class="pd-row"><span>Governorate</span><strong>' +
      (p.gov ? esc(p.gov) : 'not assigned') + '</strong></div>');
    bits.push('<div class="pd-row"><span>Coordinates</span><strong>' +
      p.lat.toFixed(4) + ', ' + p.lon.toFixed(4) + '</strong></div>');
    if (p.iata) bits.push('<div class="pd-row"><span>IATA code</span><strong>' + esc(p.iata) + '</strong></div>');
    if (typeof p.population_osm === 'number') {
      // Always with the caveat attached — this is a community-maintained tag,
      // not a census figure, and presenting it bare would be a false precision.
      bits.push('<div class="pd-row"><span>Population</span><strong>' + fmt(p.population_osm) +
        '</strong></div><p class="pd-note">As tagged in OpenStreetMap. Community-maintained and ' +
        'often years out of date — not an official census figure.</p>');
    }

    // Nearest World Heritage site, computed from the Atlas layer if it is
    // loaded. Straight-line distance, and the label says so: it is not a
    // travel distance and must not be read as one.
    if (S.heritage && S.heritage.length) {
      var best = null;
      S.heritage.forEach(function (h) {
        var dx = (h.lon - p.lon) * 96.5, dy = (h.lat - p.lat) * 111.0;   // km at ~30°N
        var d = Math.sqrt(dx * dx + dy * dy);
        if (!best || d < best.d) best = { h: h, d: d };
      });
      if (best) {
        bits.push('<div class="pd-row"><span>Nearest World Heritage site</span><strong>' +
          esc(best.h.name.split('–')[0].trim()) + ' · ' + Math.round(best.d) + ' km</strong></div>' +
          '<p class="pd-note">Straight-line distance, not travel distance.</p>');
      }
    }

    el.innerHTML = '<h3>' + esc(p.name) + (p.name_ar ? ' <span class="pd-ar">' + esc(p.name_ar) + '</span>' : '') + '</h3>' +
      '<div class="pd-grid">' + bits.join('') + '</div>' +
      '<p class="pd-note">Source: OpenStreetMap, as of ' + esc(S.data.as_of) +
      '. Governorate computed by point-in-polygon against the bundled boundaries.</p>';
    el.hidden = false;
    S.map.setView([p.lat, p.lon], Math.max(S.map.getZoom(), 8));
    el.scrollIntoView({ behavior: (window.EGYBI && EGYBI.reduceMotion) ? 'auto' : 'smooth', block: 'nearest' });
  }

  function renderList() {
    var q = ($('placeSearch') && $('placeSearch').value || '').trim().toLowerCase();
    var gov = $('placeGov') ? $('placeGov').value : '';
    var out = S.data.places.filter(function (p) {
      if (!S.active[p.kind]) return false;
      if (gov && p.gov !== gov) return false;
      if (q && p.name.toLowerCase().indexOf(q) === -1 &&
          (p.name_ar || '').toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var body = $('placeList'); if (!body) return;
    $('placeCount').textContent = out.length.toLocaleString('en-US');
    body.innerHTML = out.slice(0, 300).map(function (p) {
      return '<tr data-k="' + esc(p.kind) + '"><td>' + esc(p.name) + '</td>' +
        '<td>' + esc((KIND[p.kind] || {}).label || p.kind) + '</td>' +
        '<td>' + (p.gov ? esc(p.gov) : '—') + '</td>' +
        '<td class="num">' + (typeof p.population_osm === 'number' ? fmt(p.population_osm) : '—') + '</td></tr>';
    }).join('');
    if (out.length > 300) {
      body.innerHTML += '<tr><td colspan="4" class="pd-note">Showing the first 300 of ' +
        out.length.toLocaleString('en-US') + '. Narrow it with the search box or a governorate.</td></tr>';
    }
    Array.prototype.forEach.call(body.querySelectorAll('tr[data-k]'), function (tr, i) {
      tr.addEventListener('click', function () { select(out[i]); });
    });
  }

  function wireControls() {
    Object.keys(KIND).forEach(function (kind) {
      var btn = document.querySelector('[data-kind="' + kind + '"]');
      if (!btn) return;
      btn.classList.toggle('on', !!S.active[kind]);
      btn.setAttribute('aria-pressed', String(!!S.active[kind]));
      btn.addEventListener('click', function () {
        S.active[kind] = !S.active[kind];
        btn.classList.toggle('on', S.active[kind]);
        btn.setAttribute('aria-pressed', String(S.active[kind]));
        drawKind(kind); renderList();
      });
    });
    ['placeSearch', 'placeGov'].forEach(function (id) {
      var el = $(id); if (el) el.addEventListener('input', renderList);
    });
  }

  function fillGovs() {
    var sel = $('placeGov'); if (!sel) return;
    var seen = {};
    S.data.places.forEach(function (p) { if (p.gov) seen[p.gov] = 1; });
    Object.keys(seen).sort().forEach(function (g) {
      var o = document.createElement('option'); o.value = g; o.textContent = g; sel.appendChild(o);
    });
  }

  function empty(msg) {
    var e = $('placesEmpty'); if (e) { e.textContent = msg; e.hidden = false; }
    ['placesControls', 'listSection'].forEach(function (id) {
      var el = $(id); if (el) el.hidden = true;
    });
  }

  function start() {
    if (!initMap()) { empty('The map library did not load, so this page cannot draw Egypt.'); return; }
    // Heritage is optional context for the "nearest site" line; the page works
    // without it, so its failure is swallowed rather than surfaced.
    fetch('data/geo-heritage.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (h) { if (h && h.sites) S.heritage = h.sites; })
      .catch(function () {});

    fetch('data/geo-places.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(function (d) {
        S.data = d;
        var c = d.counts || {};
        $('placesMeta').innerHTML =
          'OpenStreetMap, as of ' + esc(d.as_of) + ' · ' +
          fmt(c.settlement) + ' cities and towns · ' + fmt(c.airport) + ' airports · ' +
          fmt(c.antiquity) + ' ancient sites';
        $('placesNote').textContent = d.note || '';
        // Coverage gap, stated where a reader will see it. The pipeline checks
        // a fixed list of major Egyptian cities on every build and ships the
        // result, so this is the CURRENT gap rather than a remembered one.
        // Older files predate the check, hence the guard.
        var cov = d.coverage_check, ce = $('placesCoverage');
        if (ce && cov) {
          ce.innerHTML = '<strong>' + cov.present_n + ' of ' + cov.benchmark_n +
            ' benchmark cities are in this gazetteer.</strong> ' +
            (cov.absent && cov.absent.length
              ? 'Absent right now: <em>' + cov.absent.map(esc).join(', ') + '</em>. ' + esc(cov.note)
              : 'None are missing at this build.');
          ce.hidden = false;
        }
        $('placesPopNote').textContent = d.population_note || '';
        fillGovs(); wireControls();
        Object.keys(KIND).forEach(drawKind);
        renderList();
      })
      .catch(function () {
        empty('The places layer has not been generated yet. It appears automatically after the ' +
              'next “Build Atlas geo layers” run. The map of Egypt above already works.');
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
