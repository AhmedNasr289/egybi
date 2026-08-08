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
    var target = container.closest('.mk-wrap') || container;
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

  /* ------------------------------------------------------- keyboard focus --
     Leaflet paths are SVG elements and are not in the tab order, so every
     choropleth on this site could be read by a mouse and by nothing else. This
     makes each feature a real focus stop with a role and a name, and routes
     Enter/Space to the same handler a click uses, so the keyboard path and the
     mouse path cannot drift apart. */
  function makeFocusable(layer, name, onActivate) {
    var el = layer.getElement && layer.getElement();
    if (!el) return;

    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', name);
    L.DomEvent.on(el, 'keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        L.DomEvent.stop(e);
        onActivate(layer);
      }
    });
    L.DomEvent.on(el, 'focus', function () { layer.fire('mouseover'); });
    L.DomEvent.on(el, 'blur', function () { layer.fire('mouseout'); });
  }

  /* ---------------------------------------------------------- detail panel --
     Announced with aria-live so a keyboard user hears the figures when a
     feature is activated; without it the panel updates silently and the
     interaction is invisible to anyone not looking at it. */
  function panel(container) {
    var el = L.DomUtil.create('div', 'mk-panel', container);
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.hidden = true;
    var api = {
      el: el,
      show: function (html) {
        el.innerHTML = html;
        el.hidden = false;
        if (!RM() && window.Motion && window.Motion.animate) {
          window.Motion.animate(el, { opacity: [0, 1], transform: ['translateY(6px)', 'none'] },
                                { duration: 0.22, easing: 'ease-out' });
        }
      },
      hide: function () { el.hidden = true; }
    };
    return api;
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

    return map;
  }

  /* The reset control needs the map's natural extent, which every caller only
     knows AFTER it has built its layers and fitted to them. So it is registered
     here rather than passed to create(). */
  function setHome(map, bounds, onReset) {
    if (!map || !bounds) return;
    map._mkHome = bounds;
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
    makeFocusable: makeFocusable,
    panel: panel,
    button: button,
    barControl: barControl,
    reduceMotion: RM,
    esc: esc
  };
}());
