/* EgyBI — Where Egypt is building: investment projects on a tile-free map.
   ---------------------------------------------------------------------------
   Reads site/data/invest-projects.json, built by
   backend/pipeline/build_invest_map.py from five knowledge-base tables:
   megaprojects, renewable_projects, green_hydrogen_deals, logistics_projects
   and investment_deals. Every row carries its own source URL.

   TILE-FREE, like every map here. Governorate outlines come from the bundled
   EGYBI_EGYPT_GEO; project positions come from a JSON file in this repo.
   Nothing on this page contacts a map provider at runtime.

   WHAT THIS PAGE REFUSES TO DO, and why it matters more here than anywhere
   else on the site. It computes nothing. No total, no ranking, no "leading
   sector", no per-capita anything. Those would be EgyBI's numbers sitting
   among sourced ones, and on a page a reader might use to think about money
   that is not a stylistic problem — it is the line between an encyclopaedia
   and unlicensed advice. Every figure shown is copied from the row that
   published it, with its status attached so a stated 2030 target can never be
   read as a thing that exists.

   THE MAP IS DELIBERATELY SPARSE, and this comment no longer says by how much.
   It used to read "seven of forty" and the answer had become twelve — a figure
   in a comment drifting away from the data while sitting in a file whose whole
   argument is that figures do not drift. The split lives in
   invest-projects.json, the page computes it from there, and repeating it here
   only creates a second copy to go stale.

   Every row that cannot be placed is listed in full underneath with the
   location text that failed, so the gap is visible rather than absent. See
   build_invest_map.py for the two matching rules that were tried and removed
   for putting projects in the wrong place — the failure a map makes
   invisible.

   Degrades honestly: if the data file is missing, the map still draws Egypt
   and the page says the layer has not been built, rather than rendering an
   empty country that looks like a country with nothing in it.
*/
(function () {
  'use strict';

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

  var BLUE = '#17408B', GOLD_INK = '#8A6D1E';

  // One entry per source table. `label` is what a reader sees; the key is the
  // table name the builder wrote, so a new table appearing in the data shows up
  // as an unfiltered row rather than vanishing.
  var KINDS = {
    megaprojects:        { label: 'Megaprojects' },
    renewable_projects:  { label: 'Renewable energy' },
    green_hydrogen_deals:{ label: 'Green hydrogen' },
    logistics_projects:  { label: 'Ports & logistics' },
    investment_deals:    { label: 'Headline deals' }
  };

  var S = { map: null, data: null, layer: null, hits: null, active: {}, sel: null };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return (window.EGYBI && EGYBI.escapeHtml)
      ? EGYBI.escapeHtml(s) : String(s == null ? '' : s);
  }
  function kindLabel(t) { return (KINDS[t] && KINDS[t].label) || t; }

  /* A published figure and its unit, or the free-text figure, or nothing.
     Never a computed value and never a default of 0 — a project with no
     published figure shows an em dash, because "0" would be a number this
     page invented. */
  function figure(p) {
    if (p.figure_text) return esc(p.figure_text);
    if (typeof p.figure === 'number') {
      var n = p.figure.toLocaleString('en-US');
      return esc(p.figure_unit === 'US$bn' ? 'US$' + n + 'bn' : n + ' ' + (p.figure_unit || ''));
    }
    return '&mdash;';
  }

  function statusPill(p) {
    if (!p.status) return '';
    var target = /target/i.test(p.status);
    return '<span class="iv-status' + (target ? ' target' : '') + '">'
      + esc(p.status) + '</span>';
  }

  function sourceLink(p) {
    if (!p.source_url) return '<span style="color:var(--ink-soft)">no source URL on this row</span>';
    var host = p.source_url;
    try { host = new URL(p.source_url).hostname.replace(/^www\./, ''); } catch (e) { /* keep raw */ }
    return '<a href="' + esc(p.source_url) + '" rel="noopener" target="_blank">'
      + esc(host) + '</a>';
  }

  function placement(p) {
    if (p.resolution === 'site') return 'Yes &mdash; as a point';
    if (p.resolution === 'governorate') return 'Yes &mdash; as a governorate';
    if (p.resolution === 'national') return 'No &mdash; not a place';
    return 'No &mdash; could not be located';
  }

  /* ------------------------------------------------------------------ map */
  function initMap() {
    if (!window.L || !window.EGYBI_EGYPT_GEO || !window.EGYBI || !EGYBI.mapkit) return false;
    S.map = EGYBI.mapkit.create('investMap', {
      locator: window.EGYBI_EGYPT_GEO,
      credit: ['geoboundaries', 'osm'],
      label: 'Map of Egypt showing investment projects that could be located. '
           + 'Use the filters above the map to choose which kinds are shown, '
           + 'then activate a marker for what was published about that project. '
           + 'Every project is also listed as a table below the map.'
    });
    if (!S.map) return false;
    S.map.createPane('proj').style.zIndex = 640;
    mkx('outline')(S.map, window.EGYBI_EGYPT_GEO);
    S.base = L.geoJSON(window.EGYBI_EGYPT_GEO, {
      style: EGYBI.mapkit.landStyle,
      onEachFeature: function (f, lyr) {
        lyr.bindTooltip(esc(f.properties.name), { sticky: true });
      }
    }).addTo(S.map);
    // Which governorate a project sits in is most of what an investor wants
    // from this map, and it was the one thing the map did not say.
    mkx('addLabels')(S.map, S.base, function (p) { return p && p.name; },
                           { minPx: 62, maxZoom: 8, maxLabels: 16, priority: 0,
                             className: 'mk-label-sm' });
    S.map.fitBounds(S.base.getBounds(), { padding: [6, 6] });
    EGYBI.mapkit.setHome(S.map, S.base.getBounds());
    return true;
  }

  /* Several projects share a location — three hydrogen agreements are all at
     Ain Sokhna and three renewable rows are all "Aswan". Drawn one marker per
     project they stack exactly on top of each other, and only the last one
     drawn can be clicked or tabbed to: the other two exist on the map and are
     unreachable by any means. So markers are per LOCATION, and the panel lists
     every project there. */
  function groupByLocation(list) {
    var byKey = {}, order = [];
    list.forEach(function (p) {
      var key = p.lat.toFixed(4) + ',' + p.lon.toFixed(4) + '|' + p.resolution;
      if (!byKey[key]) { byKey[key] = []; order.push(key); }
      byKey[key].push(p);
    });
    return order.map(function (k) { return byKey[k]; });
  }

  function labelOf(group) {
    var p = group[0];
    return group.length === 1 ? p.name
      : group.length + ' projects at ' + (p.matched || p.location_text);
  }

  /* THE PIN A READER SEES AND THE AREA A FINGER HITS ARE NOT THE SAME CIRCLE.

     A site pin is 12px across and a stacked one up to 18px. Measured on a
     390px viewport that is half the 24x24 WCAG 2.5.8 asks of a touch target,
     so seven of the twelve located projects were visible and awkward to open
     on a phone. Growing the pin is not the answer — at country zoom the four
     around Ain Sokhna and Zafarana already nearly touch, and tap-sized pins
     would merge into one blob and lose the thing the map is for.

     So the pin keeps its size and an invisible circle three times wider sits
     underneath it carrying the same tooltip and the same click.

     fillOpacity 0.01 rather than 0, and that is not a rounding error. An SVG
     path is hit-tested where it is PAINTED, so a fully transparent circle is
     not hit at all and this would silently do nothing. One percent of white
     over the pale land is imperceptible and is painted. weight 0 keeps it out
     of map-contrast.js, which measures strokes.

     These are not tab stops: the visible markers already carry tabindex, role
     and an accessible name, and a second focus stop per project would make the
     keyboard worse to fix the touch target. */
  function hitFor(group) {
    var p = group[0];
    var h = L.circleMarker([p.lat, p.lon], {
      pane: 'proj', radius: 15, weight: 0,
      fillColor: '#FFFFFF', fillOpacity: 0.01,
      className: 'iv-hit'
    });
    h.bindTooltip(esc(labelOf(group)), { direction: 'top' });
    h.on('click', function () { select(group); });
    return h;
  }

  function markerFor(group) {
    var p = group[0];
    var gov = p.resolution === 'governorate';
    // A governorate marker is drawn as a dashed ring rather than a filled pin,
    // because it is a claim about an area and a filled pin reads as a claim
    // about a point. The legend says the same thing in words; the shape says
    // it before anyone reads the legend.
    // More projects at one location means a bigger marker, so a stack is
    // visible as a stack instead of looking like a single project.
    var extra = Math.min(4, group.length - 1);
    var m = L.circleMarker([p.lat, p.lon], {
      pane: 'proj',
      radius: (gov ? 11 : 6) + extra * 1.6,
      color: gov ? GOLD_INK : '#FFFFFF',
      weight: gov ? 2.5 : 1.5,
      dashArray: gov ? '4 3' : null,
      fillColor: gov ? 'transparent' : BLUE,
      fillOpacity: gov ? 0 : 0.92
    });
    var label = labelOf(group);
    m.bindTooltip(esc(label), { direction: 'top' });
    m.on('click', function () { select(group); });
    m._group = group;
    m._label = label;
    return m;
  }

  function drawMarkers() {
    if (!S.map) return;
    if (S.layer) S.map.removeLayer(S.layer);
    if (S.hits) S.map.removeLayer(S.hits);
    var shown = S.data.projects.filter(function (p) {
      return typeof p.lat === 'number' && S.active[p.table];
    });
    var groups = groupByLocation(shown);
    // Hit targets first, so they sit UNDER the pins they belong to rather
    // than over them — same pane means SVG paints in insertion order.
    S.hits = L.layerGroup(groups.map(hitFor)).addTo(S.map);
    S.layer = L.layerGroup(groups.map(markerFor)).addTo(S.map);
    // Name what is on the map. There are never more than a dozen markers here,
    // and an unlabelled dot on a country outline is a project the reader has to
    // click to identify — which on a page whose whole argument is WHERE things
    // are is the one thing the map should not make them do.
    mkx('addLabels')(S.map, S.layer, function (props, l) {
      return l && l._label;
    // Above the governorate names, which are context: the name of the project
    // is the reason this map exists.
    }, { maxLabels: 24, priority: 10 });
    // Leaflet builds the SVG paths only once the layer is on a map with a
    // view, so the accessibility wiring has to wait for the frame after that
    // — setting tabindex before the elements exist silently sets it on
    // nothing, and the rest of the page keeps working, which is what makes it
    // hard to notice.
    requestAnimationFrame(function () {
      S.layer.eachLayer(function (m) {
        var el = m.getElement && m.getElement();
        if (!el) return;
        el.setAttribute('tabindex', '0');
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', m._label);
        el.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(m._group); }
        });
      });
    });
    return shown.length;
  }

  function projectBlock(p) {
    var bits = [];
    bits.push('<h3 style="margin:0 0 6px;">' + esc(p.name) + '</h3>');
    bits.push('<p style="margin:0 0 12px;color:var(--ink-soft);font-size:0.86rem;">'
      + esc(kindLabel(p.table)) + (p.category ? ' &middot; ' + esc(p.category) : '')
      + ' ' + statusPill(p) + '</p>');
    var rows = [];
    if (p.figure_label) rows.push([p.figure_label, figure(p)]);
    if (p.year) rows.push(['Year', esc(p.year)]);
    if (p.start_year) rows.push(['Started', esc(p.start_year)]);
    if (p.completion_year) rows.push(['Completion', esc(p.completion_year)]);
    if (p.partner) rows.push(['Partner', esc(p.partner)]);
    if (p.counterparty) rows.push(['Counterparty', esc(p.counterparty)]);
    if (p.location_text) rows.push(['Location as recorded', esc(p.location_text)]);
    rows.push(['Placed on the map by', esc(p.match_rule)
      + (p.matched ? ' &mdash; ' + esc(p.matched) : '')]);
    rows.push(['Source', sourceLink(p)]);
    bits.push('<dl style="display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:0;font-size:0.88rem;">'
      + rows.map(function (r) {
        return '<dt style="color:var(--ink-soft);">' + r[0] + '</dt><dd style="margin:0;">' + r[1] + '</dd>';
      }).join('') + '</dl>');
    if (p.note) {
      bits.push('<p style="margin:12px 0 0;font-size:0.84rem;color:var(--ink-soft);">'
        + esc(p.note) + '</p>');
    }
    return bits.join('');
  }

  function select(group) {
    S.sel = group;
    var d = $('ivDetail');
    if (!d) return;
    var first = group[0];
    var bits = [];
    if (group.length > 1) {
      bits.push('<p style="margin:0 0 4px;font-size:0.8rem;text-transform:uppercase;'
        + 'letter-spacing:.06em;color:var(--gold-ink);font-weight:700;">'
        + group.length + ' projects recorded at ' + esc(first.matched || first.location_text)
        + '</p>');
    }
    if (first.resolution === 'governorate') {
      bits.push('<p style="margin:0 0 14px;font-size:0.84rem;color:var(--ink-soft);">'
        + 'This marker is the governorate of ' + esc(first.matched)
        + ', not the project site. The knowledge base records the location only '
        + 'to governorate, so a point would be a claim it cannot support.</p>');
    }
    bits.push(group.map(projectBlock).join(
      '<hr style="border:0;border-top:1px solid var(--line-light);margin:20px 0;">'));
    d.className = 'iv-note';
    d.innerHTML = bits.join('');
    d.hidden = false;
    // The panel is the answer to activating a marker, so a screen reader has to
    // be told it appeared. aria-live rather than focus movement: moving focus
    // out of the map would cost a keyboard reader their place among the
    // markers.
    d.setAttribute('role', 'status');
    d.setAttribute('aria-live', 'polite');
  }

  /* --------------------------------------------------------------- chips */
  function buildChips(counts) {
    var host = $('ivChips');
    if (!host) return;
    Object.keys(KINDS).forEach(function (table) {
      if (!counts[table]) return;          // no rows from this table in the data
      S.active[table] = true;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'iv-chip on';
      b.setAttribute('aria-pressed', 'true');
      b.textContent = KINDS[table].label + ' (' + counts[table] + ')';
      b.addEventListener('click', function () {
        S.active[table] = !S.active[table];
        b.classList.toggle('on', S.active[table]);
        b.setAttribute('aria-pressed', String(S.active[table]));
        announce(drawMarkers());
      });
      host.appendChild(b);
    });
  }

  function announce(n) {
    var meta = $('ivMeta');
    if (meta) {
      meta.textContent = n + ' of ' + S.data.projects.length
        + ' projects are on the map with the filters you have chosen. '
        + 'Every project is in the table below whether it could be placed or not.';
    }
  }

  /* --------------------------------------------------------------- tables */
  function fillTables() {
    var tb = document.querySelector('#ivTable tbody');
    var cap = $('ivTableCap');
    if (tb) {
      tb.innerHTML = S.data.projects.map(function (p) {
        return '<tr><th scope="row" style="font-weight:600;text-align:left;padding:9px 10px;'
          + 'border-bottom:1px solid var(--line-light);vertical-align:top;">' + esc(p.name) + '</th>'
          + '<td>' + esc(kindLabel(p.table)) + (p.category ? '<br><span style="color:var(--ink-soft);font-size:0.82rem;">' + esc(p.category) + '</span>' : '') + '</td>'
          + '<td class="iv-fig">' + figure(p) + '</td>'
          + '<td>' + statusPill(p) + '</td>'
          + '<td style="font-size:0.83rem;color:var(--ink-soft);">' + placement(p) + '</td>'
          + '<td>' + sourceLink(p) + '</td></tr>';
      }).join('');
    }
    if (cap) {
      /* WHAT THE DATE ACTUALLY MEANS, said plainly.

         This read "as of <date>", which a reader takes as "these figures were
         checked on that day". They were not. No row in this file carries a
         date of its own — the knowledge base has none to give — so the only
         date available is the day the join last ran, and the join re-runs
         whether or not a single figure changed. Rebuilding the file on a
         Tuesday moved that date to Tuesday and told every reader the
         investment data had been refreshed.

         On a page a reader might use to think about money, a date that
         overstates its own freshness is not a wording problem. The rebuild
         date is still worth showing — it says when the map was last derived —
         but it has to be labelled as what it is, with the reader pointed at
         the per-row source for the age of the figure itself. */
      cap.innerHTML = 'All ' + S.data.projects.length + ' projects in the knowledge base. '
        + 'This list was last rebuilt on ' + esc(S.data.as_of)
        + '; that is when the join ran, not when the figures were verified. '
        + 'Every figure is as published by the source linked on its own row, '
        + 'which may be considerably older.';
    }

    var ub = document.querySelector('#ivUnresolved tbody');
    if (ub) {
      var un = S.data.projects.filter(function (p) { return p.resolution === 'unresolved'; });
      ub.innerHTML = un.length ? un.map(function (p) {
        return '<tr><th scope="row" style="font-weight:600;text-align:left;padding:9px 10px;'
          + 'border-bottom:1px solid var(--line-light);">' + esc(p.name) + '</th>'
          + '<td>' + esc(p.location_text) + '</td>'
          + '<td style="color:var(--ink-soft);">' + esc(p.match_rule) + '</td></tr>';
      }).join('')
        : '<tr><td colspan="3">Every project with a location field could be located.</td></tr>';
    }
  }

  function fillStats() {
    var host = $('ivStats');
    if (!host) return;
    var c = S.data.counts || {};
    var cells = [
      [(c.site || 0) + (c.governorate || 0), 'on the map'],
      [c.site || 0, 'located to a place'],
      [c.governorate || 0, 'located to a governorate only'],
      [c.unresolved || 0, 'could not be located'],
      [c.national || 0, 'not a place at all']
    ];
    host.innerHTML = cells.map(function (x) {
      return '<div class="iv-stat"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>';
    }).join('');
  }

  /* ----------------------------------------------------------------- boot */
  function fail(msg) {
    var e = $('ivEmpty');
    if (e) { e.textContent = msg; e.hidden = false; }
    var meta = $('ivMeta');
    if (meta) meta.textContent = msg;
  }

  function start() {
    var mapped = initMap();
    fetch('data/invest-projects.json', { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!data || !Array.isArray(data.projects)) throw new Error('unexpected shape');
        S.data = data;
        var counts = {};
        data.projects.forEach(function (p) { counts[p.table] = (counts[p.table] || 0) + 1; });
        buildChips(counts);
        fillStats();
        fillTables();
        if (mapped) announce(drawMarkers());
        else fail('The map could not start, so the projects are listed as a table below instead.');
      })
      .catch(function (err) {
        // Name the file and the script that writes it. "Could not load data" is
        // a message that tells whoever reads it nothing they can act on.
        fail('site/data/invest-projects.json could not be read (' + err.message
          + '). It is generated by backend/pipeline/build_invest_map.py.');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
}());
