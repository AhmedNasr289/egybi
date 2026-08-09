/* mapkit.js — the shared behaviour every map on EgyBI gets.

   There are six map surfaces across five files (Atlas, Street Report Card,
   Explore choropleth, the visitor and relief maps, Places, and the Stories
   illustrations). Each one had built its own Leaflet instance with its own
   options, so a fix to one never reached the other five — which is how three of
   them ended up mouse-only while two were fine. This module owns the parts that
   should never differ: the control set, keyboard operation, the reduced-motion
   contract, and the flying.

   Two rules run through all of it.

   ZERO PROVIDER CALLS. Every pixel comes from geometry already committed in the
   repo. Nothing here fetches a tile, a sprite, a font or a basemap, and the
   locator inset below is drawn from the same GeoJSON the map already has rather
   than from a second tile layer, which is the usual reason a minimap plugin
   reaches for the network.

   REDUCED MOTION MEANS NO ANIMATION, NEVER LESS FUNCTION. Every animated path
   here has a non-animated twin that lands in exactly the same state. flyTo
   becomes setView, a panel that slides becomes a panel that is simply there.
   Nothing is gated behind a transition, so nothing becomes unreachable. */
(function () {
  'use strict';

  var RM = function () {
    return !!(window.EGYBI && window.EGYBI.reduceMotion);
  };
  var esc = function (s) {
    return (window.EGYBI && window.EGYBI.escapeHtml)
      ? window.EGYBI.escapeHtml(s) : String(s == null ? '' : s);
  };

  /* ------------------------------------------------------------ controls --
     Leaflet's own controls are <a href="#"> elements. That is a real problem
     beyond style: a screen reader announces them as links to nowhere, and on
     some pages clicking one pushed a "#" onto the history. Everything added
     here is a real <button> with an aria-label, so it is tabbable, announced
     correctly, and fires on both Enter and Space without extra handling. */
  function button(label, glyph, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'mk-btn';
    b.setAttribute('aria-label', label);

    b.title = label;
    b.innerHTML = glyph;
    L.DomEvent.on(b, 'click', function (e) {
      L.DomEvent.stop(e);
      onClick();
    });
    // Without this a click on the control also reaches the map underneath and
    // pans it a pixel, which reads as the map twitching every time you zoom.
    L.DomEvent.disableClickPropagation(b);
    return b;
  }

  function barControl(position, buttons) {
    var C = L.Control.extend({
      onAdd: function () {
        var wrap = L.DomUtil.create('div', 'mk-bar leaflet-bar');
        buttons.forEach(function (b) { wrap.appendChild(b); });
        return wrap;
      }
    });
    return new C({ position: position });
  }

  /* ------------------------------------------------------------- locator --
     A minimap, drawn from the outline the page already loaded. The usual
     plugin (Leaflet-MiniMap) wants a second tile layer, which would put a
     provider call back into a site whose whole point is not making one. This
     draws the country outline once into an SVG and moves a rectangle over it,
     so it costs one extra element and no bytes over the wire.

     It is aria-hidden: it repeats the main map's position and would otherwise
     announce a second, confusing "map" to a screen reader. The position is
     already available to keyboard users through the map itself. */
  function addLocator(map, outline) {
    if (!outline || !outline.features || !outline.features.length) return null;
    var host = L.DomUtil.create('div', 'mk-locator');
    host.setAttribute('aria-hidden', 'true');
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');

    var b = L.geoJSON(outline).getBounds();
    var w = b.getEast() - b.getWest(), h = b.getNorth() - b.getSouth();
    var px = function (lng) { return ((lng - b.getWest()) / w) * 100; };
    var py = function (lat) { return ((b.getNorth() - lat) / h) * 100; };

    var d = '';
    outline.features.forEach(function (f) {
      var g = f.geometry;
      if (!g) return;
      var polys = g.type === 'Polygon' ? [g.coordinates]
        : g.type === 'MultiPolygon' ? g.coordinates : [];
      polys.forEach(function (poly) {
        // Outer ring only. The holes carry no information at this size and
        // doubling the path length for them costs frames on every move.
        var ring = poly[0];
        if (!ring) return;
        for (var i = 0; i < ring.length; i += 1) {
          d += (i ? 'L' : 'M') + px(ring[i][0]).toFixed(1) + ' ' + py(ring[i][1]).toFixed(1);
        }
        d += 'Z';
      });
    });
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'mk-loc-land');
    svg.appendChild(path);
    var rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('class', 'mk-loc-view');
    svg.appendChild(rect);
    host.appendChild(svg);

    var Ctl = L.Control.extend({
      onAdd: function () { return host; }
    });
    map.addControl(new Ctl({ position: 'bottomleft' }));

    function draw() {
      var v = map.getBounds();
      var x1 = Math.max(0, px(v.getWest())), x2 = Math.min(100, px(v.getEast()));
      var y1 = Math.max(0, py(v.getNorth())), y2 = Math.min(100, py(v.getSouth()));
      rect.setAttribute('x', x1.toFixed(1));
      rect.setAttribute('y', y1.toFixed(1));
      rect.setAttribute('width', Math.max(0.5, x2 - x1).toFixed(1));
      rect.setAttribute('height', Math.max(0.5, y2 - y1).toFixed(1));
      // Hide the inset when the viewport already shows the whole country —
      // a rectangle around everything tells the reader nothing.
      host.classList.toggle('mk-hide', (x2 - x1) > 97 && (y2 - y1) > 97);
    }
    map.on('move zoom viewreset', draw);
    draw();
    return host;
  }

  /* ---------------------------------------------------------- fullscreen --
     Hand-written against the native Fullscreen API rather than pulling in
     Leaflet.fullscreen. The plugin is ~4 KB to wrap an API that takes about
     fifteen lines, and it has not had a release in years; a dependency that
     needs watching should buy more than this one would. */
  function addFullscreen(map, container) {
    var target = container;
    if (!(target.requestFullscreen || target.webkitRequestFullscreen)) return;
    var btn = button('Show the map full screen', '⛶', function () {
      var doc = document.fullscreenElement || document.webkitFullscreenElement;
      if (doc) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        (target.requestFullscreen || target.webkitRequestFullscreen).call(target);
      }
    });
    map.addControl(barControl('topright', [btn]));
    document.addEventListener('fullscreenchange', function () {
      var on = document.fullscreenElement === target;
      btn.setAttribute('aria-label', on ? 'Leave full screen' : 'Show the map full screen');
      btn.title = btn.getAttribute('aria-label');
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      // Leaflet caches the container size; without this the map keeps the old
      // dimensions inside fullscreen and renders in a corner.
      setTimeout(function () { map.invalidateSize(); }, 120);
    });
  }

  /* --------------------------------------------------------------- flying */
  function flyTo(map, target, opts) {
    opts = opts || {};
    var bounds = target && target.getBounds ? target.getBounds() : null;
    if (RM()) {
      // The same destination, arrived at instantly. Reduced motion removes the
      // travel, not the ability to get there.
      if (bounds) map.fitBounds(bounds, { padding: opts.padding || [28, 28], animate: false });
      else if (target) map.setView(target, opts.zoom || map.getZoom(), { animate: false });
      return;
    }
    if (bounds) map.flyToBounds(bounds, { padding: opts.padding || [28, 28], duration: 0.75 });
    else if (target) map.flyTo(target, opts.zoom || map.getZoom(), { duration: 0.75 });
  }

  /* ------------------------------------------------------------- credit --
     geoBoundaries is CC BY 4.0. Attribution is a LICENCE CONDITION, not a
     courtesy, and the required form is the citation plus links to both the
     project and the deed.

     Every map here is built with attributionControl:false, because Leaflet's
     own control is an <a href="#"> that a screen reader announces as a link to
     nowhere. That flag suppressed the credit along with the control, so the
     site shipped out of compliance — on explore.html with no credit at all.

     So the credit is rendered as ordinary page content immediately after the
     map, OUTSIDE Leaflet entirely. Turning the attribution control off, or
     restyling it, or removing it, cannot take the credit with it. */
  var SOURCES = {
    geoboundaries: 'Boundaries: <a href="https://www.geoboundaries.org/" rel="noopener">geoBoundaries</a> '
      + '(Runfola et al., 2020), <a href="https://creativecommons.org/licenses/by/4.0/" '
      + 'rel="license noopener">CC BY 4.0</a>',
    capmas: 'Population and census figures: CAPMAS',
    osm: 'Places and facilities: &copy; <a href="https://www.openstreetmap.org/copyright" '
      + 'rel="noopener">OpenStreetMap contributors</a>, ODbL',
    srtm: 'Elevation: NASA SRTM via OpenTopoData',
    power: 'Climate normals: NASA POWER'
  };

  function addCredit(container, keys) {
    if (!keys || !keys.length) return null;
    // One credit per map, even if create() is ever called twice on a container.
    var prev = container.parentNode
      && container.parentNode.querySelector('.map-credit[data-for="' + container.id + '"]');
    if (prev) return prev;
    var el = document.createElement('p');
    el.className = 'map-credit';
    if (container.id) el.setAttribute('data-for', container.id);
    el.innerHTML = keys.map(function (k) { return SOURCES[k] || k; }).join(' &middot; ') + '.';
    container.insertAdjacentElement('afterend', el);
    return el;
  }

  /* --------------------------------------------------------- choropleth --
     The toolkit's §4a, adapted rather than pasted: it patches an
     initEgyptMap signature that has since changed, and the site now has three
     choropleths rather than one.

     Four things, and the last two matter most.

     A COLOUR TWEEN. Leaflet's SVG renderer draws GeoJSON as <path>, and fill
     is CSS-animatable, so one rule turns an instant setStyle repaint into a
     550ms tween. The tween is the information: it shows WHICH governorates
     moved when you switch metric, which an instant repaint hides. This works
     only on the SVG renderer — passing renderer: L.canvas() silently kills it
     with no error, which is exactly what someone optimising this later will
     reach for.

     A SOUTH-TO-NORTH REVEAL, so the map fills the way the Nile runs.

     ONE TAB STOP, NOT TWENTY-SEVEN. Every path was focusable, so a keyboard
     reader tabbed through 27 shapes in FILE order to reach the rest of the
     page. This is the standard roving-tabindex pattern: one stop enters the
     map, then arrow keys move GEOGRAPHICALLY — left goes to the nearest
     governorate to the west, not the previous line of GeoJSON.

     A TABLE OF THE SAME NUMBERS. Colour-encoded geometry cannot be read by a
     screen reader however much ARIA is layered on it. The honest answer is to
     publish the figures as a table and hide it visually, so a screen reader
     gets the data instead of a shape. */
  function choropleth(map, layer, spec) {
    if (!map || !layer || !spec) return;
    var el = map.getContainer();
    var feats = [];
    layer.eachLayer(function (l) { if (l.feature) feats.push(l); });
    if (!feats.length) return;

    var live = document.createElement('p');
    live.className = 'sr-only';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    el.insertAdjacentElement('afterend', live);

    if (spec.table) {
      var box = document.createElement('div');
      box.className = 'sr-only';
      box.innerHTML = spec.table();
      el.insertAdjacentElement('afterend', box);
    }

    var centre = function (l) { return l.getBounds().getCenter(); };
    var current = 0;

    /* Everything below touches l.getElement(), and Leaflet does not create a
       path's SVG element until the map has a view — the renderer has nothing
       to draw into before then. Callers here fit their bounds AFTER building
       the layer, so wiring immediately set tabindex on nothing at all and the
       map kept 27 unreachable shapes while reporting a live region and a
       table that both worked. Wait for the view. */
    map.whenReady(function () { requestAnimationFrame(wire); });

    function wire() {

    function focusIndex(i, announce) {
      if (i < 0 || i >= feats.length) return;
      current = i;
      feats.forEach(function (l, n) {
        var e = l.getElement && l.getElement();
        if (!e) return;
        e.setAttribute('tabindex', n === i ? '0' : '-1');
      });
      var e = feats[i].getElement && feats[i].getElement();
      if (e) e.focus();
      if (announce !== false) live.textContent = spec.describe(feats[i].feature);
    }

    // Nearest feature in a compass direction, so the keyboard follows the map
    // rather than the order the file happened to be written in.
    function step(dx, dy) {
      var from = centre(feats[current]);
      var best = -1, bestScore = Infinity;
      feats.forEach(function (l, n) {
        if (n === current) return;
        var c = centre(l);
        var ex = (c.lng - from.lng), ey = (c.lat - from.lat);
        var along = ex * dx + ey * dy;
        if (along <= 0) return;                       // wrong side entirely
        var across = Math.abs(ex * dy - ey * dx);     // perpendicular drift
        // Nearest in that direction, weighted to prefer straight ahead over a
        // diagonal. Written as `across * 2 - along` this REWARDED distance, so
        // pressing west from North Sinai jumped the length of the country to
        // Matrouh instead of stepping into the eastern Delta — a keyboard that
        // moves geographically, but wrongly, is worse than one that does not
        // claim to.
        var score = along + across * 2;
        if (score < bestScore) { bestScore = score; best = n; }
      });
      if (best >= 0) focusIndex(best);
    }

    feats.forEach(function (l, n) {
      var e = l.getElement && l.getElement();
      if (!e) return;
      e.setAttribute('role', 'button');
      e.setAttribute('tabindex', n === 0 ? '0' : '-1');
      e.setAttribute('aria-label', spec.describe(l.feature));
      L.DomEvent.on(e, 'focus', function () { current = n; });
      L.DomEvent.on(e, 'keydown', function (ev) {
        var k = ev.key;
        if (k === 'ArrowLeft')  { L.DomEvent.stop(ev); step(-1, 0); }
        else if (k === 'ArrowRight') { L.DomEvent.stop(ev); step(1, 0); }
        else if (k === 'ArrowUp')    { L.DomEvent.stop(ev); step(0, 1); }
        else if (k === 'ArrowDown')  { L.DomEvent.stop(ev); step(0, -1); }
        else if (k === 'Home')  { L.DomEvent.stop(ev); focusIndex(0); }
        else if (k === 'Enter' || k === ' ' || k === 'Spacebar') {
          L.DomEvent.stop(ev);
          if (spec.activate) spec.activate(feats[current]);
          live.textContent = spec.describe(feats[current].feature);
        }
      });
    });

    // South to north. Under reduced motion every shape is simply present —
    // the meaningful final state, never a blank frame.
    if (!RM()) {
      var order = feats.slice().sort(function (a, b) {
        return centre(a).lat - centre(b).lat;
      });
      order.forEach(function (l, i) {
        var e = l.getElement && l.getElement();
        if (!e) return;
        e.style.opacity = '0';
        e.style.transition = 'opacity .45s ease ' + Math.round(i * 22) + 'ms';
      });
      requestAnimationFrame(function () {
        order.forEach(function (l) {
          var e = l.getElement && l.getElement();
          if (e) e.style.opacity = '';
        });
      });
    }

    }

    return { announce: function (msg) { live.textContent = msg; } };
  }

  /* ------------------------------------------------------------ the map --- */
  function create(id, opts) {
    opts = opts || {};
    var rm = RM();
    var el = typeof id === 'string' ? document.getElementById(id) : id;
    if (!el) return null;

    var map = L.map(el, {
      zoomControl: false,          // replaced below with real buttons
      attributionControl: false,
      scrollWheelZoom: false,      // never hijack the page scroll
      doubleClickZoom: opts.doubleClickZoom !== false,
      dragging: opts.dragging !== false,
      keyboard: true,
      // A tile layer normally supplies the zoom range. These maps have no tile
      // layer at all — that is the point of the site — so maxZoom stays
      // Infinity, and anything that asks the map how far it zooms gets an
      // answer it cannot use. MarkerClusterGroup throws "Map has no maxZoom
      // specified" on construction, and because the caller wrapped its render
      // in a .catch that reports "the layer has not been generated yet", the
      // Places map showed a plausible, wrong explanation instead of the bug.
      maxZoom: opts.maxZoom || 18,
      // Leaflet snaps to whole zoom levels by default, so fitBounds picks the
      // largest INTEGER zoom that fits. When the ideal is just under a whole
      // level the map drops a full step and the country renders at ~70% of the
      // box — measured on the Atlas at 375px, where it left the country a
      // thumbnail in a mostly empty frame. Quarter steps let it actually fill.
      zoomSnap: 0.25,
      fadeAnimation: !rm,
      zoomAnimation: !rm,
      markerZoomAnimation: !rm,
      // Leaflet's inertia keeps panning after the pointer stops. That is
      // motion the reader did not ask for, so it goes with reduced motion.
      inertia: !rm
    });

    if (opts.controls !== false) {
      var zin = button('Zoom in', '+', function () { map.zoomIn(); });
      var zout = button('Zoom out', '−', function () { map.zoomOut(); });
      map.addControl(barControl('topright', [zin, zout]));

      if (opts.home) {
        map.addControl(barControl('topright', [button('Reset the view', '⟲', function () {
          if (opts.home.bounds) {
            if (rm) map.fitBounds(opts.home.bounds, { animate: false });
            else map.flyToBounds(opts.home.bounds, { duration: 0.6 });
          } else {
            if (rm) map.setView(opts.home.center, opts.home.zoom, { animate: false });
            else map.flyTo(opts.home.center, opts.home.zoom, { duration: 0.6 });
          }
          if (opts.onReset) opts.onReset();
        })]));
      }
      addFullscreen(map, el);
    }

    // The scale bar and the locator both read map.getBounds() the moment they
    // are added, and Leaflet throws "Set map center and zoom first" if no view
    // exists yet. Every caller here sets the view AFTER create() returns, so
    // these have to wait for it rather than assume it.
    map.whenReady(function () {
      if (opts.controls !== false) {
        L.control.scale({ imperial: false, position: 'bottomright', maxWidth: 120 }).addTo(map);
      }
      if (opts.locator) addLocator(map, opts.locator);
    });

    // The container is an interactive region, not a picture. role="img" made
    // it a leaf in the accessibility tree and hid every control inside it.
    el.setAttribute('role', 'region');
    if (opts.label) el.setAttribute('aria-label', opts.label);

    // Default to the boundary credit, because every map here draws the
    // geoBoundaries outline unless a caller says otherwise. Opting OUT has to
    // be deliberate and visible in the call, rather than opting in being
    // something a new map can simply forget.
    addCredit(el, opts.credit || ['geoboundaries']);

    return map;
  }

  /* ---------------------------------------------------------------- labels
     PLACE NAMES ON THE MAP, which every map here went without.

     These are tile-free maps: there is no basemap underneath carrying the
     names a reader expects, so an unlabelled polygon layer is a silhouette
     quiz. You could hover each shape for a tooltip, which is no help on a
     phone and no help at a glance, and it is the difference between a modern
     digital map and an outline printed in a paper atlas.

     WHY THIS IS ZOOM-GATED RATHER THAN ALWAYS ON. Egypt has 27 governorates
     and the Delta ones are small and tightly packed: drawn at country zoom,
     Cairo, Qalyubia, Gharbia, Monufia and Damietta overlap into an unreadable
     smear, and the labels make the map WORSE than no labels. So a label is
     drawn only when its own shape is big enough on screen to hold it —
     measured per feature, per zoom, in pixels — which means the big desert
     governorates are named immediately and the Delta names appear as you zoom
     into the Delta. That is the trade-off, and it is why this is not simply
     `permanent: true` on every tooltip.

     Labels are aria-hidden. They repeat the accessible name already on the
     feature, and a screen reader that reads every governorate twice is worse
     off than one that reads it once. */
  /* Where a name sits inside a shape.

     NOT the bounding-box centre: that is a point in a rectangle, and for a
     long coastal governorate the rectangle is mostly sea — the Red Sea label
     rendered out in the water beside the country rather than on it.

     NOT Leaflet's polygon getCenter() either, which was the obvious fix and
     throws "Must add layer to map before using getCenter()". It needs the map's
     projection, and labels are first drawn from whenReady, before every
     sub-layer is attached — it took the whole Atlas down to zero rendered
     paths. So the centroid is computed here from the ring's own coordinates,
     which needs no map and cannot throw.

     Area-weighted over the largest ring, then sanity-checked: if the centroid
     falls outside the ring (possible for a crescent), fall back to the bounds
     centre rather than shipping a label somewhere arbitrary. */
  function labelPoint(layer, bounds) {
    var rings;
    try { rings = layer.getLatLngs(); } catch (e) { return bounds.getCenter(); }
    if (!rings || !rings.length) return bounds.getCenter();
    // Polygon -> [ring]; MultiPolygon -> [[ring]]. Take the ring with the most
    // points, which for these shapes is the mainland rather than an islet.
    var flat = [];
    (function walk(a) {
      if (!a || !a.length) return;
      if (a[0] && typeof a[0].lat === 'number') { flat.push(a); return; }
      for (var i = 0; i < a.length; i += 1) walk(a[i]);
    }(rings));
    if (!flat.length) return bounds.getCenter();
    var ring = flat[0];
    for (var i = 1; i < flat.length; i += 1) {
      if (flat[i].length > ring.length) ring = flat[i];
    }
    var a2 = 0, cx = 0, cy = 0;
    for (var j = 0; j < ring.length; j += 1) {
      var p1 = ring[j], p2 = ring[(j + 1) % ring.length];
      var cross = p1.lng * p2.lat - p2.lng * p1.lat;
      a2 += cross;
      cx += (p1.lng + p2.lng) * cross;
      cy += (p1.lat + p2.lat) * cross;
    }
    if (!a2) return bounds.getCenter();
    var lng = cx / (3 * a2), lat = cy / (3 * a2);
    return bounds.contains([lat, lng]) ? L.latLng(lat, lng) : bounds.getCenter();
  }

  function addLabels(map, layer, textFn, opts) {
    opts = opts || {};
    var minPx = opts.minPx || 54;          // a shape narrower than this cannot hold a name
    var cls = 'mk-label' + (opts.className ? ' ' + opts.className : '');

    // A SEPARATE PANE OF MARKERS, not tooltips on the features. The first
    // version bound a permanent tooltip to each polygon, which meant unbinding
    // the rich hover tooltip the Atlas already had and rebinding it whenever
    // the label went away — two features fighting over one slot, and the
    // hover card lost. Labels live in their own pane instead: the geometry
    // keeps its tooltip, its click handler and its focus behaviour untouched.
    var pane = map.createPane('mkLabels');
    pane.style.zIndex = 660;
    pane.style.pointerEvents = 'none';     // paint, never a click target
    pane.setAttribute('aria-hidden', 'true');   // the name is already on the feature

    var group = L.layerGroup([], { pane: 'mkLabels' }).addTo(map);

    function refresh() {
      group.clearLayers();
      var view = map.getBounds();
      layer.eachLayer(function (l) {
        if (!l.getBounds) return;                 // points label themselves
        var b = l.getBounds();
        if (!view.intersects(b)) return;          // offscreen: nothing to draw
        var nw = map.latLngToLayerPoint(b.getNorthWest());
        var se = map.latLngToLayerPoint(b.getSouthEast());
        if (Math.abs(se.x - nw.x) < minPx || Math.abs(se.y - nw.y) < 16) return;
        var text = textFn(l.feature ? l.feature.properties : {}, l);
        if (!text) return;
        L.marker(labelPoint(l, b), {
          pane: 'mkLabels',
          interactive: false,
          keyboard: false,
          icon: L.divIcon({ className: cls, html: esc(text), iconSize: null })
        }).addTo(group);
      });
    }

    map.on('zoomend moveend', refresh);
    map.whenReady(function () { requestAnimationFrame(refresh); });
    return refresh;
  }

  /* The reset control needs the map's natural extent, which every caller only
     knows AFTER it has built its layers and fitted to them. So it is registered
     here rather than passed to create(). */
  function setHome(map, bounds, onReset) {
    if (!map || !bounds) return;
    // Callers repaint. streets.js rebuilds its layer on every metric change and
    // calls this each time, which added a second, third and fourth reset button
    // to the corner. Update the destination, add the control once.
    var first = !map._mkHome;
    map._mkHome = bounds;
    if (!first) return;
    map.addControl(barControl('topright', [button('Reset the view', '\u27F2', function () {
      if (RM()) map.fitBounds(map._mkHome, { padding: [10, 10], animate: false });
      else map.flyToBounds(map._mkHome, { padding: [10, 10], duration: 0.6 });
      if (onReset) onReset();
    })]));
  }

  window.EGYBI = window.EGYBI || {};
  window.EGYBI.mapkit = {
    create: create,
    setHome: setHome,
    flyTo: flyTo,
    button: button,
    barControl: barControl,
    choropleth: choropleth,
    addCredit: addCredit,
    addLabels: addLabels,
    sources: SOURCES,
    reduceMotion: RM,
    esc: esc
  };
}());
