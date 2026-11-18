/* EgyBI — Places: an Egypt-wide gazetteer on a tile-free map.
   ---------------------------------------------------------------------------
   Reads site/data/geo-places.json, built by backend/pipeline/fetch_geo_layers.py
   from OpenStreetMap: cities and towns, airports with an IATA code,
   archaeological sites and museums. A kind is offered as a filter chip only
   when the committed file actually contains one, so the page never advertises
   a layer it cannot draw.

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
  var LANG = (document.documentElement.getAttribute('lang') || 'en');
  /* A governorate's name as the site spells it ("Fayoum"), for DISPLAY
     only; the data's own spelling stays the join key. */
  function gv(n) {
    var F = window.EGYBI && window.EGYBI.fmt;
    return F ? F.govName(n) : (n == null ? '' : String(n));
  }
  /* A dataset's date, written as the site writes dates ("3 November 2026",
     EGYBI.fmt in assets/egfmt.js), never as raw ISO. Falls back to the
     value as written if egfmt.js did not load. */
  function asOf(v) {
    var F = window.EGYBI && window.EGYBI.fmt;
    // Arabic pages get the Arabic date; other pages the English form (Russian
    // dates are written by trip.js, which this page does not load).
    return F ? F.dateOrRaw(v, LANG === 'ar' ? 'ar' : 'en', 'prose') : (v == null ? '' : String(v));
  }
  // Translated text for what this script writes; the build collects every
  // quoted call to it into the Arabic and Russian tables (pages/i18n.py).
  var t = (window.EGYBI && window.EGYBI.t) || function (x) { return x; };

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

  var GOLD = '#C9A227', GOLD_INK = '#8A6D1E', BLUE = '#17408B', INK = '#1C1C1C';

  // One colour per kind, chosen to stay distinguishable on the pale governorate
  // fill and to survive the site's dark/light surface alternation.
  var KIND = {
    settlement: { label: 'Cities & towns', one: 'City or town', colour: BLUE,      r: 4 },
    airport:    { label: 'Airports',       one: 'Airport',      colour: '#0F7B6C', r: 5 },
    antiquity:  { label: 'Ancient sites',  one: 'Ancient site', colour: '#B23A0F', r: 3.5 },
    museum:     { label: 'Museums',        one: 'Museum',       colour: '#6B3FA0', r: 4 }
  };

  var CLUSTER_CLASS = {
    settlement: 'marker-cluster-settlement',
    airport: 'marker-cluster-airport',
    antiquity: 'marker-cluster-antiquity',
    museum: 'marker-cluster-museum'
  };

  // MUSEUMS WERE ADDED TO THE PIPELINE BEFORE THEY WERE ADDED HERE, and this
  // table is why that would have been silent. `S.active` is consulted before a
  // marker is ever drawn, and an absent key is falsy — so a fourth kind
  // arriving in geo-places.json would have been fetched, committed, deployed
  // and then filtered out of the map with nothing anywhere saying so. A kind
  // the data can produce must exist here, in CLUSTER_CLASS, as a chip in
  // places.html and as a cluster colour in egybi.css, or it does not exist to
  // a reader.
  //
  // ALL FOUR KINDS ON BY DEFAULT, changed 2026-08-10 at the owner's decision.
  //
  // Ancient sites were the one kind held back, on the reasoning that 393 of
  // them would swamp a map that also carries 335 settlements. What that
  // reasoning missed is who opens this page: on an encyclopaedia of Egypt,
  // the archaeological layer is not clutter competing with the gazetteer, it
  // is a large part of why a reader came — and a category switched off by
  // default reads as a category that does not exist. It was the largest layer
  // on the page and the only one a visitor had to discover.
  //
  // Measured with it on, and the first number written here was wrong — worth
  // saying, in a file whose whole argument is that figures do not drift. The
  // opening view goes from 480 places to all 873. Because they arrive as
  // clusters rather than 393 loose dots, the icons actually on screen go from
  // 68 to 94 at 1280px (44 single markers plus 50 clusters holding 829), and
  // to 47 at 390px (16 single plus 31 clusters holding 857). Governorate
  // labels are unchanged at 12 and 8, because that layer is gated by zoom and
  // collision, not by how many markers sit beneath it.
  //
  // So the swamping this default was guarding against does not happen:
  // clustering absorbs the extra 393 into 19 more icons, not 393 more. That is
  // the measurement the original reasoning never took.
  var S = { map: null, data: null, layers: {}, me: null, meMark: null,
            active: { settlement: true, airport: true, antiquity: true, museum: true },
            sel: null };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return (window.EGYBI && EGYBI.escapeHtml) ? EGYBI.escapeHtml(s) : String(s == null ? '' : s); }

  // A count in the page's own form: Arabic-Indic digits and separators on
  // Arabic pages, a thin-space grouping on Russian ones, 1,234 in English.
  function fmt(n) {
    if (typeof n !== 'number') return '—';
    var F = window.EGYBI && window.EGYBI.fmt;
    if (LANG === 'ar' && F) return F.num(n, 'ar', 0);
    return n.toLocaleString(LANG === 'ru' ? 'ru-RU' : 'en-US');
  }
  function digits(x) {
    var F = window.EGYBI && window.EGYBI.fmt;
    return LANG === 'ar' && F ? F.digits(String(x), 'ar') : String(x);
  }

  function initMap() {
    if (!window.L || !window.EGYBI_EGYPT_GEO) return false;
    S.map = window.EGYBI.mapkit.create('placesMap', {
      locator: window.EGYBI_EGYPT_GEO,
      credit: ['geoboundaries', 'osm'],
      label: t('Map of Egypt showing mapped places. Nearby places group into a cluster; open a cluster to see them.')
    });
    if (!S.map) return false;
    // Points must sit above the governorate polygons even while one is hovered
    // and brought to front, which is what these panes are for.
    S.map.createPane('pts').style.zIndex = 640;
    mkx('outline')(S.map, window.EGYBI_EGYPT_GEO);
    S.base = L.geoJSON(window.EGYBI_EGYPT_GEO, {
      style: window.EGYBI.mapkit.landStyle,
      onEachFeature: function (f, lyr) {
        lyr.bindTooltip(esc(gv(f.properties.name)), { sticky: true });
      }
    }).addTo(S.map);
    // The governorate names, drawn while the view is the whole country. Before
    // this the opening view carried no text at all — a pale outline with
    // cluster counts on it, so "88" sat in the Delta with nothing to say which
    // part of the Delta. Place names begin at zoom 9, so the ceiling here is 8
    // and the two layers hand over without ever competing.
    mkx('addLabels')(S.map, S.base, function (p) { return p && gv(p.name); },
                                  { minPx: 62, maxZoom: 8, maxLabels: 16, priority: 0,
                                    className: 'mk-label-sm' });
    S.map.fitBounds(S.base.getBounds(), { padding: [6, 6] });
    window.EGYBI.mapkit.setHome(S.map, S.base.getBounds());
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
    var rm = window.EGYBI.mapkit.reduceMotion();
    /* 757 places, and in the Delta and around Cairo they land on top of one
       another — at country zoom a dozen towns render as one dot and eleven of
       them are unclickable. MarkerClusterGroup counts them instead and
       spiderfies the last few apart when you reach them.

       These are L.marker with a divIcon rather than circleMarker: clustering
       needs a real marker to spiderfy, and a div lets the dot keep the same
       size and colour it always had. The animations follow reduced motion —
       with it off, a cluster still opens, it just does not spring. */
    /* No custom pane here. The old circleMarkers were SVG in the overlay pane
       and needed 'pts' to sit above the governorate polygons; L.marker renders
       into Leaflet's markerPane, which is already above the overlay pane. Worse,
       forcing MarkerClusterGroup's markers into a foreign pane stops it managing
       them — it rendered no clusters at all and only a stray marker or two. */
    var group = (L.markerClusterGroup ? L.markerClusterGroup({
      showCoverageOnHover: false,      // the hull flickers over a dense delta
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 9,      // by governorate zoom every place stands alone
      maxClusterRadius: 44,
      animate: !rm,
      animateAddingMarkers: false,
      iconCreateFunction: function (c) {
        var n = c.getChildCount();
        return L.divIcon({
          html: '<div><span>' + n + '</span></div>',
          // Written out rather than built by concatenation. A class name
          // assembled at runtime exists nowhere in the source, so no grep and
          // no orphaned-CSS check can see it — the rule for it looks dead and
          // gets deleted by the next person tidying up.
          className: 'marker-cluster ' + CLUSTER_CLASS[kind],
          iconSize: L.point(n > 99 ? 42 : 34, n > 99 ? 42 : 34)
        });
      }
    }) : L.layerGroup([], { pane: 'pts' }));

    S.data.places.filter(function (p) { return p.kind === kind; }).forEach(function (p) {
      /* THE DOT A READER SEES AND THE AREA A FINGER HITS ARE NOT THE SAME BOX.

         The icon used to be sized to the dot: 8x8 for a city, 7x7 for an
         ancient site. Measured on a 390px viewport that is a third of the
         24x24 WCAG 2.5.8 asks of a touch target and well under half the ~44px
         a fingertip actually covers, so on a phone the gazetteer was a map of
         things you could see and could not open. Thirteen of them on the
         opening view alone.

         The dot keeps its size — it has to, or the Delta becomes a blob — and
         the icon around it grows to 30px of transparent space with the dot
         centred in it. iconAnchor stays at the centre, so the marker still
         sits exactly on its coordinates, clustering is unaffected, and the
         name labels (which anchor to the same point) do not move. */
      var d = spec.r * 2;
      var HIT = 30;
      var m = L.marker([p.lat, p.lon], {
        keyboard: true,
        title: p.name,
        alt: p.name + (p.gov ? ', ' + gv(p.gov) : ''),
        icon: L.divIcon({
          className: 'mk-pin',
          html: '<i style="width:' + d + 'px;height:' + d + 'px;background:' + spec.colour + '"></i>',
          iconSize: [HIT, HIT], iconAnchor: [HIT / 2, HIT / 2]
        })
      });
      // The label layer reads this. The hover tooltip's HTML is not reusable —
      // it carries markup and the governorate — so the plain name travels
      // separately rather than being parsed back out of a string.
      m._plName = p.name;
      m.bindTooltip('<strong>' + esc(p.name) + '</strong>' +
        (p.gov ? '<br>' + esc(gv(p.gov)) : ''), { direction: 'top' });
      m.on('click', function () { select(p); });
      // L.marker is focusable, so Enter must do what a click does or the
      // keyboard path stops at "I can reach it but not open it".
      m.on('keypress', function (e) {
        if (e.originalEvent && (e.originalEvent.key === 'Enter' || e.originalEvent.key === ' ')) select(p);
      });
      group.addLayer(m);
    });
    group.addTo(S.map);
    S.layers[kind] = group;
    // Place names, once the reader has zoomed in far enough for names to be
    // useful. The threshold is deliberately the same zoom at which
    // MarkerClusterGroup stops clustering (disableClusteringAtZoom above), so
    // a bubble showing "44" becomes forty-four named dots at exactly the point
    // it stops being a count. Naming all 873 at country zoom would not be a
    // map, it would be a smear — which is why this is gated rather than always
    // on, and why there is a ceiling on how many draw at once.
    mkx('addLabels')(S.map, group, function (props, l) {
      return l && l._plName;
    }, { minZoom: 9, maxLabels: 90, className: 'mk-label-sm' });
  }

  /* --------------------------------------------------------- going there
     Every link below is a QUERY, not a claim.

     A reference page for visitors is where a beautiful site starts lying.
     Opening hours, ticket prices and hotel availability all rot, and none of
     them announce it — a page that quotes "EGP 200, open 08:00-17:00" is
     wrong within a season and a reader will have budgeted against it. Quoting
     a specific YouTube video is the same failure more slowly: videos are
     deleted and this build cannot check.

     So nothing here asserts a fact about a place. Each link is a search
     constructed from the place's name and its coordinates, which cannot go
     stale because it resolves against the destination's own live index at the
     moment a reader clicks it. Booking and Airbnb are searches near the
     coordinates with no price and no availability shown. Wikipedia and
     Commons are searches unless OpenStreetMap carries the exact article, in
     which case the article is linked directly.

     Anything OSM DOES record — an official website, opening hours, step-free
     access — is shown as what OSM recorded on a stated date, with the caution
     attached, never as a statement about when the place is open. Those fields
     arrive when fetch_geo_layers.py next runs; until then this block simply
     shows fewer rows, which is why every one of them is guarded. */
  function refLinks(p) {
    var q = encodeURIComponent(p.name + ' Egypt');
    var lat = p.lat.toFixed(5), lon = p.lon.toFixed(5);
    var links = [];

    links.push([t('Open in OpenStreetMap'),
      'https://www.openstreetmap.org/?mlat=' + lat + '&mlon=' + lon + '#map=15/' + lat + '/' + lon,
      t('The record this page is built from, at these coordinates.')]);

    if (p.wikipedia_title && p.wikipedia_lang) {
      links.push([t('Read on Wikipedia'),
        'https://' + encodeURIComponent(p.wikipedia_lang) + '.wikipedia.org/wiki/'
          + encodeURIComponent(p.wikipedia_title.replace(/ /g, '_')),
        t('The article OpenStreetMap links to for this place.')]);
    } else {
      links.push([t('Search Wikipedia'),
        'https://en.wikipedia.org/w/index.php?search=' + q,
        t('OpenStreetMap carries no article link for this place, so this is a search.')]);
    }

    if (p.commons) {
      links.push([t('Photographs on Wikimedia Commons'),
        'https://commons.wikimedia.org/wiki/' + encodeURIComponent(p.commons),
        t('The openly licensed category OpenStreetMap links to.')]);
    } else {
      links.push([t('Search Wikimedia Commons'),
        'https://commons.wikimedia.org/w/index.php?search=' + q + '&title=Special:MediaSearch&type=image',
        t('Openly licensed photographs, searched by name.')]);
    }

    links.push([t('Search YouTube'),
      'https://www.youtube.com/results?search_query=' + q,
      t('A search rather than a chosen video — a link to one video is a link that eventually goes nowhere.')]);

    links.push([t('Find stays on Booking.com'),
      'https://www.booking.com/searchresults.html?ss=' + q
        + '&latitude=' + lat + '&longitude=' + lon,
      t('A search near these coordinates. No price or availability is shown here, because either would be out of date before you read it.')]);

    links.push([t('Find stays on Airbnb'),
      'https://www.airbnb.com/s/' + encodeURIComponent(p.name + ', Egypt') + '/homes',
      t('A search by place name, for the same reason.')]);

    if (p.website) {
      links.push([t('Official website'), p.website,
        t('The website OpenStreetMap records for this place.')]);
    }
    return links;
  }

  /* --------------------------------------------------------- visitor guides
     The month-by-month guides are listed once, as plain links the generator
     writes into this page (the VISIT-GUIDES block), each carrying the site's
     coordinates. Reading them back from the page means this script holds no
     second list that could name a guide that does not exist.

     5 km, measured rather than chosen: it reaches the monuments of each
     complex (69 OSM points around the Valley of the Kings, 20 at Saqqara)
     without handing a guide to a town that merely shares a governorate.
     The distance is printed with the link, because the guide describes the
     site's own coordinates, not this point. */
  var GUIDE_KM = 5;

  function km(aLat, aLon, bLat, bLon) {
    var r = Math.PI / 180;
    var h = Math.pow(Math.sin((bLat - aLat) * r / 2), 2) +
      Math.cos(aLat * r) * Math.cos(bLat * r) * Math.pow(Math.sin((bLon - aLon) * r / 2), 2);
    return 12742 * Math.asin(Math.sqrt(h));
  }

  function guides() {
    if (!S.guides) {
      S.guides = Array.prototype.map.call(document.querySelectorAll('a[data-guide]'), function (a) {
        return { href: a.getAttribute('href'), name: a.textContent,
                 lat: parseFloat(a.getAttribute('data-lat')), lon: parseFloat(a.getAttribute('data-lon')) };
      }).filter(function (g) { return isFinite(g.lat) && isFinite(g.lon); });
    }
    return S.guides;
  }

  function nearestGuide(p) {
    var best = null;
    guides().forEach(function (g) {
      var d = km(p.lat, p.lon, g.lat, g.lon);
      if (d <= GUIDE_KM && (!best || d < best.d)) best = { g: g, d: d };
    });
    return best;
  }

  function goingThere(p) {
    var out = [];
    var osmDate = esc(asOf(S.data.as_of));

    // Only rendered when OSM actually has the tag. The date and the caution
    // travel with it every single time — an opening time without them is a
    // promise this site cannot keep.
    if (p.opening_hours) {
      out.push('<div class="pd-row"><span>' + esc(t('Opening hours')) + '</span><strong>'
        + esc(p.opening_hours) + '</strong></div>'
        + '<p class="pd-note">' + esc(t('As recorded in OpenStreetMap on %d, in OSM’s own notation. Community-maintained and changed without notice — confirm before you travel.')).replace('%d', osmDate) + '</p>');
    }
    if (p.wheelchair) {
      out.push('<div class="pd-row"><span>' + esc(t('Step-free access')) + '</span><strong>'
        + esc(p.wheelchair) + '</strong></div>'
        + '<p class="pd-note">' + esc(t('OpenStreetMap’s wheelchair tag as of %d. “limited” means partly accessible; an absent tag means nobody has surveyed it, not that access is poor.')).replace('%d', osmDate) + '</p>');
    }

    var links = refLinks(p);
    // Into the trip planner: the place travels in the URL, and the planner
    // adds it as a stop in this browser's saved plan. Same tab, because it is
    // a step in this site rather than a reference elsewhere.
    var planHref = 'plan.html?place=' + encodeURIComponent(p.name) + '&lat=' + p.lat.toFixed(5) +
      '&lon=' + p.lon.toFixed(5) + (p.gov ? '&gov=' + encodeURIComponent(p.gov) : '') +
      (p.kind ? '&kind=' + encodeURIComponent(p.kind) : '');
    out.push('<p style="margin:0 0 10px;"><a class="btn btn-blue btn-small" href="' + esc(planHref) + '">' + esc(t('+ Add to my trip plan')) + '</a></p>');
    out.push('<ul class="pd-links">' + links.map(function (l) {
      return '<li><a href="' + esc(l[1]) + '" target="_blank" rel="noopener">'
        + esc(l[0]) + '</a><span>' + esc(l[2]) + '</span></li>';
    }).join('') + '</ul>');
    return '<div class="pd-going"><h4>' + esc(t('Going there')) + '</h4>' + out.join('') + '</div>';
  }

  function select(p) {
    S.sel = p;
    var el = $('placeDetail'); if (!el) return;
    var spec = KIND[p.kind] || { label: p.kind, one: p.kind };
    var bits = [];
    bits.push('<div class="pd-row"><span>' + esc(t('Kind')) + '</span><strong>' +
      esc(t(spec.one || spec.label)) + (p.place ? ' · ' + esc(p.place) : '') + '</strong></div>');
    bits.push('<div class="pd-row"><span>' + esc(t('Governorate')) + '</span><strong>' +
      (p.gov ? esc(gv(p.gov)) : esc(t('not assigned'))) + '</strong></div>');
    bits.push('<div class="pd-row"><span>' + esc(t('Coordinates')) + '</span><strong>' +
      p.lat.toFixed(4) + ', ' + p.lon.toFixed(4) + '</strong></div>');
    if (p.iata) bits.push('<div class="pd-row"><span>' + esc(t('IATA code')) + '</span><strong>' + esc(p.iata) + '</strong></div>');
    if (typeof p.population_osm === 'number') {
      // Always with the caveat attached — this is a community-maintained tag,
      // not a census figure, and presenting it bare would be a false precision.
      bits.push('<div class="pd-row"><span>' + esc(t('Population')) + '</span><strong>' + fmt(p.population_osm) +
        '</strong></div><p class="pd-note">' + esc(t('As tagged in OpenStreetMap. Community-maintained and often years out of date — not an official census figure.')) + '</p>');
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
        bits.push('<div class="pd-row"><span>' + esc(t('Nearest World Heritage site')) + '</span><strong>' +
          esc(best.h.name.split('–')[0].trim()) + ' · ' + esc(t('%n km').replace('%n', digits(Math.round(best.d)))) + '</strong></div>' +
          '<p class="pd-note">' + esc(t('Straight-line distance, not travel distance.')) + '</p>');
      }
    }

    var near = nearestGuide(p);
    if (near) {
      bits.push('<div class="pd-row"><span>' + esc(t('Visitor guide')) + '</span><strong><a href="' + esc(near.g.href) + '">' +
        esc(t('%s by month').replace('%s', near.g.name)) + ' &rarr;</a></strong></div>' +
        '<p class="pd-note">' + esc(near.d < 0.1
          ? t('Measured at this point: afternoon heat, rain and the hours of golden light for each month.')
          : t('Measured at the site %n km from this point: afternoon heat, rain and the hours of golden light for each month.')
              .replace('%n', digits(near.d.toFixed(1)))) + '</p>');
    }

    el.innerHTML = '<h3>' + esc(p.name) + (p.name_ar ? ' <span class="pd-ar">' + esc(p.name_ar) + '</span>' : '') + '</h3>' +
      '<div class="pd-grid">' + bits.join('') + '</div>' +
      goingThere(p) +
      '<p class="pd-note">' + esc(t('Source: OpenStreetMap, as of %d. Governorate computed by point-in-polygon against the bundled boundaries. The links above are searches run against each destination when you click them, so nothing here quotes a price, an opening time or a room that may no longer exist.')
        .replace('%d', asOf(S.data.as_of))) + '</p>';
    el.hidden = false;
    // Zoom 9, not 8, and the number is not arbitrary: 9 is
    // disableClusteringAtZoom, which is also where the name layer engages.
    // At 8 a reader who opened a place landed one step short of both — still
    // inside a cluster bubble, still with no names on the map — which made the
    // labels look broken when they were simply gated one level further in.
    S.map.setView([p.lat, p.lon], Math.max(S.map.getZoom(), 9));
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
    // Near me: nearest first, by straight-line distance from the reader.
    var me = S.me, dist = new Map();
    if (me) {
      out.forEach(function (p) { dist.set(p, km(me.lat, me.lon, p.lat, p.lon)); });
      out.sort(function (a, b) { return dist.get(a) - dist.get(b); });
    }
    var th = $('distTh'); if (th) th.hidden = !me;
    $('placeCount').textContent = fmt(out.length);
    body.innerHTML = out.slice(0, 300).map(function (p) {
      return '<tr data-k="' + esc(p.kind) + '"><td>' + esc(p.name) + '</td>' +
        '<td>' + esc(t((KIND[p.kind] || {}).one || p.kind)) + '</td>' +
        '<td>' + (p.gov ? esc(gv(p.gov)) : '—') + '</td>' +
        '<td class="num">' + (typeof p.population_osm === 'number' ? fmt(p.population_osm) : '—') + '</td>' +
        (me ? '<td class="num">' + kmText(dist.get(p)) + '</td>' : '') + '</tr>';
    }).join('');
    if (out.length > 300) {
      body.innerHTML += '<tr><td colspan="' + (me ? 5 : 4) + '" class="pd-note">' +
        esc(t('Showing the first 300 of %n. Narrow it with the search box or a governorate.').replace('%n', fmt(out.length)).replace('300', digits(300))) + '</td></tr>';
    }
    Array.prototype.forEach.call(body.querySelectorAll('tr[data-k]'), function (tr, i) {
      tr.addEventListener('click', function () { select(out[i]); });
    });
  }

  /* ---- Near me (Round 4, R4-8, 2026-11-16) -----------------------------------
     A tourist standing somewhere wants the closest places first. The browser's
     own geolocation answers that, only when the reader presses the button, and
     the position is used here and nowhere else: it is not stored, not sent to
     EgyBI, and not put in any URL. Distances are straight lines, labelled so.
     Permissions-Policy allows geolocation for this origin only (.htaccess). */
  function kmText(d) {
    if (d < 1) return t('%n m').replace('%n', fmt(Math.round(d * 1000)));
    return t('%n km').replace('%n', d < 10 ? digits(d.toFixed(1)) : fmt(Math.round(d)));
  }
  function wireNearMe() {
    var btn = $('nearMe'), note = $('nearNote');
    if (!btn || !note || !('geolocation' in navigator) || !window.isSecureContext) return;
    btn.hidden = false;
    function say(msg, kind) { note.textContent = msg; note.className = 'form-note' + (kind ? ' ' + kind : ''); }
    function off() {
      S.me = null; btn.classList.remove('on'); btn.setAttribute('aria-pressed', 'false'); btn.textContent = t('Near me');
      if (S.meMark && S.map) { S.map.removeLayer(S.meMark); S.meMark = null; }
      say(''); renderList();
    }
    btn.addEventListener('click', function () {
      if (S.me) { off(); return; }
      say(t('Asking your browser for your location…'));
      btn.disabled = true;
      navigator.geolocation.getCurrentPosition(function (pos) {
        btn.disabled = false;
        S.me = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true'); btn.textContent = t('Stop using my location');
        var inEgypt = S.me.lat > 21 && S.me.lat < 32.5 && S.me.lon > 24 && S.me.lon < 37.5;
        say((inEgypt ? t('Nearest first, by straight-line distance, not travel distance.')
                     : t('You seem to be outside Egypt, so these are far away. Nearest first, by straight-line distance, not travel distance.')) +
            ' ' + t('Your location stays in this browser; EgyBI never receives it.'), 'ok');
        if (S.map && window.L) {
          if (S.meMark) S.map.removeLayer(S.meMark);
          S.meMark = L.circleMarker([S.me.lat, S.me.lon], { radius: 8, color: '#14110C', weight: 3, fillColor: '#C9A227', fillOpacity: 1 })
            .bindTooltip(esc(t('You are here (approximate)'))).addTo(S.map);
          if (inEgypt) S.map.setView([S.me.lat, S.me.lon], Math.max(S.map.getZoom(), 9));
        }
        renderList();
      }, function (err) {
        btn.disabled = false;
        say(err && err.code === 1 ? t('Location permission was not given, so the list keeps its usual order.')
                                  : t('Your location could not be found just now, so the list keeps its usual order.'), 'error');
      }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
    });
  }

  function wireControls() {
    // Count what the data actually has, so a chip is only offered for a kind a
    // reader can be shown. Museums are in the pipeline before they are in the
    // committed file: without this, the Museums chip would sit there between
    // deploy and the next Overpass run, toggling a layer with nothing in it and
    // reporting "0 places" as though that were a fact about Egypt.
    var have = {};
    (S.data && S.data.places ? S.data.places : []).forEach(function (p) {
      have[p.kind] = (have[p.kind] || 0) + 1;
    });
    Object.keys(KIND).forEach(function (kind) {
      var btn = document.querySelector('[data-kind="' + kind + '"]');
      if (!btn) return;
      if (!have[kind]) {
        btn.hidden = true;
        S.active[kind] = false;
        return;
      }
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
    wireNearMe();
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
    if (!initMap()) { empty(t('The map library did not load, so this page cannot draw Egypt.')); return; }
    // Heritage is optional context for the "nearest site" line; the page works
    // without it, so its failure is swallowed rather than surfaced.
    fetch((window.EGYBI && window.EGYBI.url ? window.EGYBI.url('data/geo-heritage.json') : 'data/geo-heritage.json'), { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (h) { if (h && h.sites) S.heritage = h.sites; })
      .catch(function () {});

    fetch((window.EGYBI && window.EGYBI.url ? window.EGYBI.url('data/geo-places.json') : 'data/geo-places.json'), { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(function (d) {
        S.data = d;
        var c = d.counts || {};
        // Built from the counts the file actually carries, not from three
        // hardcoded kinds. When museums arrived the map drew 116 of them and
        // this line went on summarising the gazetteer as cities, airports and
        // ancient sites — a page silently under-reporting its own contents.
        // Anything the pipeline starts counting now appears here by itself.
        // Labelled counts ("Airports: 12"), so no English plural reaches
        // Arabic or Russian.
        var LABELS = { settlement: 'Cities & towns', airport: 'Airports',
                       antiquity: 'Ancient sites', museum: 'Museums' };
        var parts = Object.keys(LABELS)
          .filter(function (k) { return c[k]; })
          .map(function (k) { return t(LABELS[k]) + ': ' + fmt(c[k]); });
        // A kind the data has but this list does not name still gets counted,
        // under its own key, rather than being dropped for want of a phrasing.
        Object.keys(c).forEach(function (k) {
          if (!LABELS[k] && c[k]) parts.push(k + ': ' + fmt(c[k]));
        });
        $('placesMeta').innerHTML =
          esc(t('OpenStreetMap, as of %d').replace('%d', asOf(d.as_of))) + ' · ' + esc(parts.join(' · '));
        $('placesNote').textContent = d.note || '';
        // Coverage gap, stated where a reader will see it. The pipeline checks
        // a fixed list of major Egyptian cities on every build and ships the
        // result, so this is the CURRENT gap rather than a remembered one.
        // Older files predate the check, hence the guard.
        var cov = d.coverage_check, ce = $('placesCoverage');
        if (ce && cov) {
          ce.innerHTML = '<strong>' + esc(t('%a of %b benchmark cities are in this gazetteer.')
              .replace('%a', digits(cov.present_n)).replace('%b', digits(cov.benchmark_n))) + '</strong> ' +
            (cov.absent && cov.absent.length
              ? esc(t('Absent right now:')) + ' <em>' + cov.absent.map(esc).join(', ') + '</em>. ' + esc(cov.note)
              : esc(t('None are missing at this build.')));
          ce.hidden = false;
        }
        $('placesPopNote').textContent = d.population_note || '';
        fillGovs(); wireControls();
        Object.keys(KIND).forEach(drawKind);
        renderList();
      })
      .catch(function () {
        empty(t('The places layer has not been generated yet. It appears automatically after the next “Build Atlas geo layers” run. The map of Egypt above already works.'));
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
