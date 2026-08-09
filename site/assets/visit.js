/* EgyBI — the visitor layer.
   ---------------------------------------------------------------------------
   Answers the two questions a first-time visitor to Egypt actually asks, in
   the order they ask them: what is there, and what will it be like when I go.

   Everything on this page is computed from three files in this repository —
   visit-climate.json (NASA POWER), visit-terrain.json (NASA SRTM) and
   geo-heritage.json (UNESCO) — plus the bundled governorate outlines. No
   figure is typed into the markup, because a typed figure becomes a false
   claim the first time a pipeline reruns.

   TILE-FREE, like every other map here: outlines from EGYBI_EGYPT_GEO, points
   from repo JSON, zero runtime requests to any map provider.

   WHAT THIS PAGE REFUSES TO DO
   It does not describe any site in prose. There is no sourced, licence-clear
   dataset of "what Karnak feels like", so writing that would mean inventing
   atmosphere and setting it beside measured figures, where it would read as
   equally sourced. Each site shows what the data holds — where it is, how high,
   how hot each month, whether UNESCO lists it — and links onward. A visitor is
   better served by a real August temperature than by an adjective.

   It also does not rank or recommend. "Best time to visit" is a judgement that
   depends on heat tolerance, budget and crowds, none of which are in the data.
   The month picker shows the measurement and lets the reader decide.

   Degrades honestly: if the pipeline has not run yet, the map still draws Egypt
   and each section says which layer is missing, rather than rendering zeros
   that look like a country with no weather.
*/
(function () {
  'use strict';

  var GOLD = '#C9A227', GOLD_INK = '#8A6D1E', BLUE = '#17408B', INK = '#1C1C1C';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
  var SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var S = { climate: null, terrain: null, heritage: null, relief: null,
            map: null, layer: null, month: null, selected: null };

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n, d) {
    return n == null ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: d == null ? 0 : d });
  }

  function load(path) {
    return fetch(path, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error(path + ' ' + r.status);
      return r.json();
    });
  }

  /* ------------------------------------------------------------- the map */
  function baseMap(id) {
    var m = window.EGYBI.mapkit.create(id, {
      locator: window.EGYBI_EGYPT_GEO || null,
      credit: ['geoboundaries', 'srtm', 'power'],
      label: id === 'reliefMap'
        ? 'Map of Egypt showing where the selected elevation line runs'
        : 'Map of Egypt showing the major visitor sites'
    });
    if (!m) return null;
    // The visitor map keeps its warm sand palette rather than the blue-grey
    // the data maps use — this page is about places, not about a metric, and
    // the sites drawn on top are the ink. But #C7BCA1 on the cream page is
    // 1.63:1, so the country had no edge here either. The coastline halo does
    // that job underneath without touching the fill above it. On the relief map
    // the ground is dark and #C7BCA1 already measures 9.29:1, so the halo is
    // only needed on the light one.
    if (id !== 'reliefMap') window.EGYBI.mapkit.outline(m, window.EGYBI_EGYPT_GEO);
    L.geoJSON(window.EGYBI_EGYPT_GEO, {
      style: function () {
        return { color: '#C7BCA1', weight: 1, fillColor: '#EFE7D4', fillOpacity: 1 };
      },
      interactive: false
    }).addTo(m);
    m.fitBounds([[22.0, 24.7], [31.7, 36.9]], { padding: [10, 10] });
    // Both visitor maps get the same reset control every other map has. The
    // relief map re-fits to each transect as you pick one, so "put it back"
    // is more use here than anywhere.
    window.EGYBI.mapkit.setHome(m, L.latLngBounds([[22.0, 24.7], [31.7, 36.9]]));
    return m;
  }

  /* Heat is the one thing that genuinely changes the shape of a trip to Egypt,
     so the marker colour encodes the selected month's mean daily maximum. The
     bands are stated on the page in °C rather than as "good"/"bad" — 38 °C is
     unbearable to one visitor and unremarkable to another, and the data cannot
     tell which one is reading. */
  /* The chip carries a temperature, so it is content and has to clear WCAG AA
     against whatever band colour it lands on. White does not: measured against
     the band colours below it is 5.27:1 on the blue, 2.95:1 on the teal,
     2.42:1 on the gold, 3.08:1 on the orange and 5.99:1 on the red. Dark ink is
     the mirror image. So the text colour is COMPUTED from the band's own
     luminance rather than fixed, which means a future palette change cannot
     quietly put white back on gold. */
  function readableOn(hex) {
    var c = [1, 3, 5].map(function (i) { return parseInt(hex.substr(i, 2), 16) / 255; })
      .map(function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    var L = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    var white = 1.05 / (L + 0.05);
    var inkL = 0.0273;                       // relative luminance of --ink #292420
    var ink = (Math.max(L, inkL) + 0.05) / (Math.min(L, inkL) + 0.05);
    return white >= ink ? '#fff' : '#292420';
  }

  function heatColour(t) {
    // Bands are for the MEAN DAILY MAXIMUM — how hot a normal afternoon gets,
    // which is the question the colour is answering. Egypt runs roughly 19 °C
    // (Cairo in January) to 42 °C (Aswan in July) on that measure.
    if (t == null) return '#9A9A9A';
    if (t < 22) return '#2C6FAD';
    if (t < 28) return '#4FA3A5';
    if (t < 34) return '#C9A227';
    if (t < 39) return '#D97B2B';
    return '#B23A0F';
  }

  /* The record extremes were originally published under the names t_max and
     t_min, which is exactly the mislabelling this page had to correct: in
     POWER's climatology mode they are the hottest and coldest hours ever
     recorded in that month, not a mean daily high and low. The pipeline now
     emits t_record_max / t_record_min, but data already published carries the
     old names, so both are read. The numbers are identical either way — only
     what they were being called was wrong. */
  function recMax(m) { return m && (m.t_record_max != null ? m.t_record_max : m.t_max); }
  function recMin(m) { return m && (m.t_record_min != null ? m.t_record_min : m.t_min); }

  /* The headline figure. t_daily_max is the climatological MEAN DAILY maximum,
     averaged from POWER's daily series — what a normal afternoon reaches, and
     what a visitor is actually asking about. It is what the page leads with.
     Older published data has no such field, so this falls back to the all-day
     mean and reports which one it returned, because a page showing an all-day
     mean under the word "day" would repeat the exact mistake this replaced. */
  function dayTemp(m) {
    if (!m) return { v: null, kind: 'none' };
    if (m.t_daily_max != null) return { v: m.t_daily_max, kind: 'daily-max' };
    if (m.t_mean != null) return { v: m.t_mean, kind: 'all-day-mean' };
    return { v: null, kind: 'none' };
  }
  function nightTemp(m) { return m && m.t_daily_min != null ? m.t_daily_min : null; }

  function monthOf(site, mi) {
    if (!site || !site.months) return null;
    for (var i = 0; i < site.months.length; i++) {
      if (site.months[i].month === mi + 1) return site.months[i];
    }
    return null;
  }

  function paintMap() {
    if (!S.map || !S.climate) return;
    if (S.layer) { S.map.removeLayer(S.layer); S.layer = null; }
    var g = L.layerGroup();
    S.climate.sites.forEach(function (site) {
      var m = monthOf(site, S.month);
      var t = dayTemp(m).v;
      var mk = L.circleMarker([site.lat, site.lon], {
        radius: 8, weight: 2, color: '#fff', opacity: 1,
        fillColor: heatColour(t), fillOpacity: 0.95
      });
      mk.bindTooltip(
        '<strong>' + esc(site.name) + '</strong><br>' +
        (t == null ? 'no reading for this month'
                   : MONTHS[S.month] + ' reaches about ' + fmt(t, 0) + ' °C by day'),
        { direction: 'top' });
      mk.on('click', function () { select(site.key); });
      g.addLayer(mk);
    });
    S.layer = g.addTo(S.map);
  }

  /* ------------------------------------------------------- the month picker */
  function paintMonthPicker() {
    var host = $('monthPicker');
    if (!host) return;
    host.innerHTML = SHORT.map(function (m, i) {
      return '<button type="button" class="mo-btn' + (i === S.month ? ' on' : '') +
             '" data-m="' + i + '" aria-pressed="' + (i === S.month) + '">' + m + '</button>';
    }).join('');
    host.querySelectorAll('.mo-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        S.month = parseInt(b.dataset.m, 10);
        paintMonthPicker(); paintMap(); paintMonthTable(); paintDetail();
      });
    });
  }

  function paintMonthTable() {
    var tb = $('monthBody'), cap = $('monthCap');
    if (!tb) return;
    if (!S.climate) return;
    var rows = S.climate.sites.slice().map(function (s) {
      var m = monthOf(s, S.month);
      // t is the MONTHLY MEAN, which is the figure that answers "what is
      // this month like". The record extremes are carried separately and
      // labelled as extremes — see the note in fetch_tourism.py.
      var d = dayTemp(m);
      return { s: s, t: d.v, kind: d.kind, night: nightTemp(m),
               hi: recMax(m), lo: recMin(m), mean: m ? m.t_mean : null,
               rain: m ? m.rain_mm_day : null };
    }).sort(function (a, b) {
      if (a.t == null) return 1; if (b.t == null) return -1;
      return b.t - a.t;
    });
    tb.innerHTML = rows.map(function (r) {
      return '<tr data-key="' + esc(r.s.key) + '">' +
        '<td>' + esc(r.s.name) + '<span class="v-gov">' + esc(r.s.gov) + '</span></td>' +
        '<td class="num"><span class="v-chip" style="background:' + heatColour(r.t) +
          ';color:' + readableOn(heatColour(r.t)) + '">' +
          (r.t == null ? '—' : fmt(r.t, 0) + '°') + '</span></td>' +
        '<td class="num">' + (r.night == null ? '—' : fmt(r.night, 0) + '°') + '</td>' +
        '<td class="num">' + (r.rain == null ? '—' : fmt(r.rain, 1)) + '</td>' +
        '<td>' + (r.s.unesco ? '<span class="v-un">World Heritage</span>' : '') + '</td>' +
        '</tr>';
    }).join('');
    tb.querySelectorAll('tr').forEach(function (tr) {
      tr.addEventListener('click', function () { select(tr.dataset.key); });
    });

    if (cap) {
      var hot = rows.filter(function (r) { return r.t != null; });
      if (hot.length) {
        var hi = hot[0], lo = hot[hot.length - 1];
        var fellBack = hot.some(function (r) { return r.kind === 'all-day-mean'; });
        cap.innerHTML = 'In <strong>' + MONTHS[S.month] + '</strong>, a normal afternoon ' +
          'across these ' + hot.length + ' sites runs from <strong>' + fmt(lo.t, 0) + ' °C</strong> at ' +
          esc(lo.s.name) + ' to <strong>' + fmt(hi.t, 0) + ' °C</strong> at ' + esc(hi.s.name) +
          ' — a spread of ' + fmt(hi.t - lo.t, 0) + ' degrees within one country, on the same day of the year.' +
          (fellBack ? ' <em>Some sites have no daily normal yet and are showing their all-day mean, ' +
                      'which reads lower; those fill in on the next pipeline run.</em>' : '');
      }
    }
  }

  /* ------------------------------------------------------------ the detail */
  function select(key) {
    S.selected = key;
    paintDetail();
    var el = $('siteDetail');
    if (el && !el.hidden) {
      el.scrollIntoView({ behavior: (window.EGYBI && EGYBI.reduceMotion) ? 'auto' : 'smooth',
                          block: 'nearest' });
    }
  }

  function paintDetail() {
    var el = $('siteDetail');
    if (!el) return;
    if (!S.selected || !S.climate) { el.hidden = true; return; }
    var site = null;
    S.climate.sites.forEach(function (s) { if (s.key === S.selected) site = s; });
    if (!site) { el.hidden = true; return; }

    var terr = null;
    if (S.terrain) {
      S.terrain.sites.forEach(function (t) { if (t.key === site.key) terr = t; });
    }

    // Cross-check the UNESCO flag against the fetched heritage list rather than
    // trusting the flag in the site table. If the two disagree the fetched file
    // wins, because that one has a source.
    var listed = null;
    if (S.heritage && Array.isArray(S.heritage.sites)) {
      var names = S.heritage.sites.map(function (h) { return (h.name || '').toLowerCase(); });
      listed = names.some(function (n) {
        var a = site.name.toLowerCase();
        return n.indexOf(a) !== -1 || a.indexOf(n) !== -1;
      });
    }

    var bars = site.months.map(function (m) {
      var t = dayTemp(m).v;
      var h = t == null ? 2 : Math.max(2, Math.round((t - 10) / 35 * 100));
      return '<div class="v-bar' + (m.month - 1 === S.month ? ' on' : '') + '" title="' +
             MONTHS[m.month - 1] + ': ' + (t == null ? 'no reading' : fmt(t, 0) + ' °C') + '">' +
             '<span style="height:' + h + '%;background:' + heatColour(t) + '"></span>' +
             '<em>' + SHORT[m.month - 1][0] + '</em></div>';
    }).join('');

    var now = monthOf(site, S.month);
    el.hidden = false;
    el.innerHTML =
      '<h3>' + esc(site.name) + ' <span class="v-ar">' + esc(site.name_ar || '') + '</span></h3>' +
      '<p class="v-sub">' + esc(site.gov) + ' governorate &middot; ' +
        site.lat.toFixed(4) + '°N, ' + site.lon.toFixed(4) + '°E' +
        (terr ? ' &middot; ' + fmt(terr.elevation_m, 0) + ' m above sea level' : '') +
        (listed === true ? ' &middot; <strong>UNESCO World Heritage</strong>' : '') +
      '</p>' +
      '<div class="v-year">' + bars + '</div>' +
      '<p class="v-cap">' + (dayTemp(now).kind === 'daily-max'
          ? 'Mean daily maximum, by month. ' : 'All-day mean, by month. ') +
        (now && dayTemp(now).v != null
          ? '<strong>' + MONTHS[S.month] +
            (dayTemp(now).kind === 'daily-max'
              ? ' reaches about ' + fmt(dayTemp(now).v, 0) + ' °C by day' +
                (nightTemp(now) != null ? ', dropping to ' + fmt(nightTemp(now), 0) + ' °C at night' : '') +
                (now.t_mean != null ? ', averaging ' + fmt(now.t_mean, 0) + ' °C across the whole day' : '')
              // No daily normal for this site yet, so print ONE figure under its
              // real name rather than the same number twice under two labels.
              : ' averages ' + fmt(dayTemp(now).v, 0) + ' °C across the whole day') +
            (now.rain_mm_day != null ? ', with ' + fmt(now.rain_mm_day, 1) + ' mm of rain a day' : '') +
            '.</strong>' +
            (recMax(now) != null
              ? ' Across the whole record the extremes for this month reach <strong>' +
                fmt(recMax(now), 0) + ' °C</strong> and drop to <strong>' +
                fmt(recMin(now), 0) + ' °C</strong> &mdash; those are the hottest and coldest ' +
                'hours ever measured here in ' + MONTHS[S.month] + ', not a typical day.'
              : '')
          : 'No reading for the selected month.') +
      '</p>' +
      '<p class="v-note">These are modelled long-run averages from NASA POWER, not a forecast and ' +
        'not station readings. They describe what the month is usually like here; they say nothing ' +
        'about the day you travel.' +
        (dayTemp(now).kind === 'daily-max'
          ? ' The day and night figures are the 2001&ndash;2020 mean daily maximum and minimum.'
          : ' No mean daily maximum has been published for this site yet, so the figure above is the ' +
            'all-day mean and a real afternoon will run several degrees warmer.') +
        (terr ? ' Elevation is sampled from NASA SRTM 30 m at this site&rsquo;s own coordinates.' : '') +
      '</p>';
  }

  /* ------------------------------------------------------------ terrain bit */
  function paintTerrain() {
    var host = $('terrainList'), lead = $('terrainLead');
    if (!host) return;
    if (!S.terrain) return;
    var rows = S.terrain.sites.slice().sort(function (a, b) {
      return b.elevation_m - a.elevation_m;
    });
    var hi = rows[0], lo = rows[rows.length - 1];
    var span = hi.elevation_m - lo.elevation_m;
    if (lead) {
      lead.innerHTML = 'Across these ' + rows.length + ' sites the ground rises from <strong>' +
        fmt(lo.elevation_m, 0) + ' m</strong> at ' + esc(lo.name) + ' to <strong>' +
        fmt(hi.elevation_m, 0) + ' m</strong> at ' + esc(hi.name) + ' &mdash; ' + fmt(span, 0) +
        ' metres of relief. Every figure is a radar measurement of the actual land surface, ' +
        'not a rendering of it.';
    }
    host.innerHTML = rows.map(function (r) {
      var w = Math.max(1.5, (r.elevation_m - Math.min(0, lo.elevation_m)) / (span || 1) * 100);
      return '<div class="v-terr" data-key="' + esc(r.key) + '">' +
        '<span class="v-tn">' + esc(r.name) + '</span>' +
        '<span class="v-tb"><i style="width:' + w.toFixed(1) + '%"></i></span>' +
        '<span class="v-tv">' + fmt(r.elevation_m, 0) + ' m</span></div>';
    }).join('');
    host.querySelectorAll('.v-terr').forEach(function (d) {
      d.addEventListener('click', function () { select(d.dataset.key); });
    });
  }

  /* --------------------------------------------------------- cross-sections
     The honest version of "fly over Egypt". Imagery good enough to fly through
     is licensed rather than open, and a 3D render would mean a GPU pipeline and
     a repo full of frames. What IS open is the ground itself, so the page draws
     the land's own profile from measured elevation and lets the reader travel
     along it. Every point on the curve is a radar reading with a latitude and a
     longitude, and the map beside it shows exactly where that point is.

     The slider is the control, not the animation. A moving dot is precisely
     what prefers-reduced-motion exists to suppress, so there is no autoplay to
     suppress: dragging works identically either way, and the profile itself
     already shows the whole line at once. Reduced motion loses nothing here. */
  var R = { t: null, i: 0, line: null, dot: null, map: null };

  function reliefPath(t, w, h) {
    var pad = { l: 42, r: 10, t: 12, b: 26 };
    var known = t.samples.filter(function (s) { return s.m != null; });
    var lo = Math.min(0, t.min_m), hi = t.max_m;
    var span = (hi - lo) || 1;
    var x = function (km) { return pad.l + (km / t.length_km) * (w - pad.l - pad.r); };
    var y = function (m) { return pad.t + (1 - (m - lo) / span) * (h - pad.t - pad.b); };

    // Nulls break the line rather than being drawn as sea level: an unknown
    // elevation is not a flat shelf, and joining across one would invent ground.
    var segs = [], cur = [];
    t.samples.forEach(function (s) {
      if (s.m == null) { if (cur.length) segs.push(cur); cur = []; }
      else cur.push(s);
    });
    if (cur.length) segs.push(cur);

    var stroke = segs.map(function (seg) {
      return seg.map(function (s, i) {
        return (i ? 'L' : 'M') + x(s.km).toFixed(1) + ' ' + y(s.m).toFixed(1);
      }).join(' ');
    }).join(' ');
    var fill = segs.map(function (seg) {
      return 'M' + x(seg[0].km).toFixed(1) + ' ' + y(lo).toFixed(1) + ' ' +
        seg.map(function (s) { return 'L' + x(s.km).toFixed(1) + ' ' + y(s.m).toFixed(1); }).join(' ') +
        ' L' + x(seg[seg.length - 1].km).toFixed(1) + ' ' + y(lo).toFixed(1) + ' Z';
    }).join(' ');

    var ticks = [];
    [hi, lo < 0 ? 0 : null, lo].forEach(function (m) {
      if (m == null || ticks.indexOf(m) > -1) return;
      ticks.push(m);
    });
    return { x: x, y: y, lo: lo, hi: hi, stroke: stroke, fill: fill, pad: pad,
             ticks: ticks, known: known };
  }

  function paintRelief() {
    var host = $('reliefChart'), pick = $('reliefPicker');
    if (!host || !S.relief) return;
    var list = S.relief.transects;

    pick.innerHTML = list.map(function (t, i) {
      return '<button type="button" class="mo-btn' + (i === 0 ? ' on' : '') +
        '" data-i="' + i + '" aria-pressed="' + (i === 0) + '">' + esc(t.name) + '</button>';
    }).join('');
    pick.querySelectorAll('.mo-btn').forEach(function (b) {
      b.addEventListener('click', function () { selectTransect(+b.dataset.i); });
    });

    var cap = $('reliefCap');
    if (cap) {
      cap.innerHTML = 'Elevation in metres above sea level against distance along the line, from ' +
        esc(S.relief.source) + '. ' + esc(S.relief.license) + '. Built ' + esc(S.relief.as_of) +
        '. Gaps in a curve are points the model has no value for, drawn as gaps rather than as zero.';
    }
    selectTransect(0);
  }

  function selectTransect(i) {
    var list = S.relief.transects, t = list[i];
    if (!t) return;
    R.t = t; R.i = i;
    $('reliefPicker').querySelectorAll('.mo-btn').forEach(function (b) {
      var on = +b.dataset.i === i;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    });
    var why = $('reliefWhy');
    if (why) why.textContent = t.why;

    var w = 720, h = 300, g = reliefPath(t, w, h);
    $('reliefChart').innerHTML =
      '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
        '<defs><linearGradient id="rgrad" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="' + GOLD + '" stop-opacity=".75"/>' +
          '<stop offset="1" stop-color="' + GOLD + '" stop-opacity=".08"/>' +
        '</linearGradient></defs>' +
        g.ticks.map(function (m) {
          return '<line x1="' + g.pad.l + '" y1="' + g.y(m).toFixed(1) + '" x2="' + (w - g.pad.r) +
            '" y2="' + g.y(m).toFixed(1) + '" stroke="' + (m === 0 ? '#4FA3A5' : 'rgba(255,255,255,.16)') +
            '" stroke-width="1"/>' +
            '<text x="' + (g.pad.l - 6) + '" y="' + (g.y(m) + 4).toFixed(1) +
            '" text-anchor="end" font-size="11" fill="rgba(255,255,255,.6)">' +
            fmt(m, 0) + '</text>';
        }).join('') +
        '<path d="' + g.fill + '" fill="url(#rgrad)"/>' +
        '<path d="' + g.stroke + '" fill="none" stroke="' + GOLD +
          '" stroke-width="2" stroke-linejoin="round"/>' +
        '<line id="reliefCursor" x1="0" y1="' + g.pad.t + '" x2="0" y2="' + (h - g.pad.b) +
          '" stroke="#fff" stroke-width="1.5" opacity=".85"/>' +
        '<circle id="reliefKnob" r="4.5" cx="0" cy="0" fill="#fff"/>' +
        '<text x="' + g.pad.l + '" y="' + (h - 8) + '" font-size="11" fill="rgba(255,255,255,.6)">0 km</text>' +
        '<text x="' + (w - g.pad.r) + '" y="' + (h - 8) + '" text-anchor="end" font-size="11" ' +
          'fill="rgba(255,255,255,.6)">' + fmt(t.length_km, 0) + ' km</text>' +
      '</svg>';

    // Accessible summary of the curve for anyone not looking at it.
    $('reliefChart').setAttribute('aria-label',
      t.name + ': ' + t.length_km + ' kilometres, from ' + fmt(t.min_m, 0) +
      ' to ' + fmt(t.max_m, 0) + ' metres above sea level.');

    var scrub = $('reliefScrub');
    if (scrub) {
      scrub.max = String(t.samples.length - 1);
      scrub.value = '0';
      scrub.setAttribute('aria-label', 'Position along ' + t.name);
    }
    drawLine(t);
    moveTo(0);
  }

  function drawLine(t) {
    if (!R.map || !window.L) return;
    if (R.line) { R.map.removeLayer(R.line); R.line = null; }
    if (R.dot) { R.map.removeLayer(R.dot); R.dot = null; }
    var pts = t.samples.map(function (s) { return [s.lat, s.lon]; });
    R.line = L.polyline(pts, { color: GOLD, weight: 3, opacity: 0.95 }).addTo(R.map);
    R.dot = L.circleMarker(pts[0], { radius: 6, color: '#fff', weight: 2,
      fillColor: GOLD, fillOpacity: 1 }).addTo(R.map);
    R.map.fitBounds(R.line.getBounds(), { padding: [26, 26] });
  }

  function moveTo(idx) {
    var t = R.t;
    if (!t) return;
    var s = t.samples[Math.min(Math.max(idx, 0), t.samples.length - 1)];
    if (!s) return;
    var svg = $('reliefChart').querySelector('svg');
    if (svg) {
      var g = reliefPath(t, 720, 300);
      var cx = g.x(s.km);
      var cur = svg.querySelector('#reliefCursor'), knob = svg.querySelector('#reliefKnob');
      if (cur) { cur.setAttribute('x1', cx.toFixed(1)); cur.setAttribute('x2', cx.toFixed(1)); }
      if (knob) {
        knob.setAttribute('cx', cx.toFixed(1));
        knob.setAttribute('cy', (s.m == null ? -20 : g.y(s.m)).toFixed(1));
      }
    }
    if (R.dot) R.dot.setLatLng([s.lat, s.lon]);
    var out = $('reliefReadout');
    if (out) {
      out.innerHTML = '<b>' + fmt(s.km, 1) + ' km</b> along the line &middot; ' +
        (s.m == null ? '<b>no elevation</b> at this point &mdash; the model has no value here, ' +
                       'so nothing is drawn'
                     : 'ground at <b>' + fmt(s.m, 0) + ' m</b>' +
                       (s.m < 0 ? ' &mdash; below sea level' : '')) +
        '<br><span style="opacity:.7">' + s.lat.toFixed(4) + '&deg;N, ' +
        s.lon.toFixed(4) + '&deg;E</span>';
    }
  }

  /* ----------------------------------------------------------- the self-check
     The build compares every modelled mean daily maximum against the nearest
     published station normal and refuses to publish if the comparison fails.
     That check is worth nothing to a reader who cannot see it, so the whole
     comparison is carried in the JSON and printed here — including the site-
     months where the model and the station disagree most. Hiding those would
     turn a validation into a reassurance. */
  function paintCheck() {
    var host = $('checkResult'), tbl = $('checkTable'), body = $('checkBody');
    if (!host) return;
    var v = S.climate && S.climate.validation;
    if (!v || !v.pairs || !v.pairs.length) { showEmpty(['checkEmpty']); return; }

    var pairs = v.pairs;
    var deltas = pairs.map(function (p) { return p.delta_c; });
    var mean = deltas.reduce(function (a, b) { return a + b; }, 0) / deltas.length;
    var near = deltas.filter(function (d) { return Math.abs(d) <= 2; }).length;

    host.innerHTML =
      '<div class="v-gate">' +
        '<div><strong>Average gap, model vs station</strong>' +
          '<b>' + (mean >= 0 ? '+' : '') + mean.toFixed(2) + ' &deg;C</b>' +
          '<em>Across ' + pairs.length + ' site-months. A pipeline reading the wrong ' +
          'variable pushes every figure the same way; a model differing from a ' +
          'station does not, and largely cancels. This is the number that caught ' +
          'the two earlier mistakes on this page.</em></div>' +
        '<div><strong>Within 2 &deg;C of the station</strong>' +
          '<b>' + near + ' of ' + pairs.length + '</b>' +
          '<em>' + Math.round(near / pairs.length * 100) + '% land close. The gaps that ' +
          'remain are not noise &mdash; they cluster over Lower Egypt in summer, and ' +
          'the reason is below.</em></div>' +
      '</div>';

    // One row per site: twelve rows per site would be a data dump, and the
    // per-month numbers are already in the JSON for anyone who wants them.
    var bySite = {};
    pairs.forEach(function (p) {
      var k = p.site;
      if (!bySite[k]) bySite[k] = { station: p.station, km: p.station_km,
                                    period: p.period, elev: p.site_elev_m, d: [] };
      bySite[k].d.push(p.delta_c);
    });
    var names = {};
    if (S.climate.sites) S.climate.sites.forEach(function (s) { names[s.key] = s.name; });

    var keys = Object.keys(bySite).sort(function (a, b) {
      return Math.abs(avg(bySite[b].d)) - Math.abs(avg(bySite[a].d));
    });
    if (body) {
      body.innerHTML = keys.map(function (k) {
        var r = bySite[k], m = avg(r.d);
        var worst = r.d.reduce(function (a, b) {
          return Math.abs(b) > Math.abs(a) ? b : a; }, 0);
        var big = Math.abs(worst) > 3;
        // Temperature falls about 6.5 °C per kilometre of height, so a site
        // well above its nearest station is being compared across an altitude
        // difference as much as across a model. Saying so beside the number is
        // the difference between a caveat and an excuse made later.
        var alt = r.elev != null && r.elev > 600
          ? '<span class="v-gov">site sits at ' + fmt(r.elev, 0) +
            ' m; the station is near sea level</span>' : '';
        return '<tr><td>' + esc(names[k] || k) + alt + '</td>' +
          '<td>' + esc(r.station) +
             (r.period ? '<span class="v-gov">normals ' + esc(r.period) + '</span>' : '') +
             '</td>' +
          '<td class="num">' + fmt(r.km, 0) + ' km</td>' +
          '<td class="num">' + r.d.length + '</td>' +
          '<td class="num">' + (m >= 0 ? '+' : '') + m.toFixed(1) + '</td>' +
          '<td class="num' + (big ? ' v-far' : '') + '">' +
             (worst >= 0 ? '+' : '') + worst.toFixed(1) + '</td></tr>';
      }).join('');
      if (tbl) tbl.hidden = false;
    }

    var cap = $('checkCap');
    if (cap) {
      var anyPeriod = pairs.some(function (p) { return p.period; });
      cap.innerHTML = 'Gaps are in &deg;C, modelled mean daily maximum minus the published ' +
        'station normal. Positive means the model runs warmer than the station. ' +
        'Source of the yardstick: ' + esc(v.reference_source || 'published station normals') +
        (v.reference_source_url ? ' (<a href="' + esc(v.reference_source_url) +
           '" target="_blank" rel="noopener">worldweather.wmo.int</a>)' : '') + '. ' +
        (anyPeriod ? ''
                   : 'The source does not state which years its normals average, so the ' +
                     'comparison is against an undated published normal &mdash; noted rather ' +
                     'than filled in with a plausible-looking range.');
    }

    var why = $('checkWhy');
    if (why && v.known_divergence) {
      why.hidden = false;
      why.innerHTML =
        '<p style="margin:0 0 10px;"><strong>Where the two disagree, and why we are not ' +
        'hiding it.</strong> ' + esc(v.known_divergence) + '</p>' +
        '<p style="margin:0;"><strong>What this check is and is not.</strong> ' +
        esc(v.method || '') + ' It does not certify the model is right. It certifies the ' +
        'pipeline is reading the quantity it claims to be reading &mdash; which is the ' +
        'specific thing that went wrong here twice before it was caught.</p>';
    }
  }

  function avg(a) {
    return a.reduce(function (x, y) { return x + y; }, 0) / (a.length || 1);
  }

  /* --------------------------------------------------------------- sources */
  function paintMeta() {
    var el = $('visitMeta');
    if (!el) return;
    var bits = [];
    if (S.climate) {
      bits.push('Climate normals: <strong>' + esc(S.climate.source) + '</strong>, built ' +
                esc(S.climate.as_of) + '. ' + esc(S.climate.license) + '.');
      if (S.climate.missing && S.climate.missing.length) {
        bits.push('<strong>No climate reading returned for:</strong> ' +
                  esc(S.climate.missing.join(', ')) + '. Shown as unknown, never as zero.');
      }
    }
    if (S.terrain) {
      bits.push('Elevation: <strong>' + esc(S.terrain.source) + '</strong>, built ' +
                esc(S.terrain.as_of) + '. ' + esc(S.terrain.license) + '.');
    }
    if (S.heritage) {
      bits.push('World Heritage status: <strong>UNESCO World Heritage Centre</strong>, built ' +
                esc(S.heritage.as_of) + '.');
    }
    el.innerHTML = bits.join(' ');
  }

  /* ------------------------------------------------------------ empty state */
  function showEmpty(which) {
    which.forEach(function (id) {
      var e = $(id);
      if (e) e.hidden = false;
    });
  }

  /* ------------------------------------------------------------------ init */
  function init() {
    if (!window.L || !window.EGYBI_EGYPT_GEO) return;

    // Default to the month the reader is actually in — a visitor checking in
    // August wants August first, not January.
    S.month = new Date().getMonth();

    var box = $('visitMap');
    if (box) S.map = baseMap('visitMap');
    if ($('reliefMap')) R.map = baseMap('reliefMap');

    var scrub = $('reliefScrub');
    if (scrub) {
      // 'input' rather than 'change' so the map dot tracks the drag. This is
      // the reader moving the control, never the page moving on its own, so it
      // is correct under prefers-reduced-motion without a special case.
      scrub.addEventListener('input', function () { moveTo(+scrub.value); });
    }

    Promise.allSettled([
      load('data/visit-climate.json'),
      load('data/visit-terrain.json'),
      load('data/geo-heritage.json'),
      load('data/visit-relief.json')
    ]).then(function (r) {
      // A layer file always exists so the page never 404s, but an
      // ungenerated one carries generated:false and an empty sites array.
      // Treat that as ABSENT rather than as a layer with nothing in it —
      // otherwise the page paints an empty table that reads like a finding.
      function usable(x) {
        return x && x.generated !== false && Array.isArray(x.sites) && x.sites.length ? x : null;
      }
      if (r[0].status === 'fulfilled') S.climate = usable(r[0].value);
      if (r[1].status === 'fulfilled') S.terrain = usable(r[1].value);
      if (r[2].status === 'fulfilled') S.heritage = r[2].value;
      if (r[3].status === 'fulfilled') {
        var v = r[3].value;
        S.relief = v && v.generated !== false && Array.isArray(v.transects) &&
                   v.transects.length ? v : null;
      }

      if (S.climate) {
        paintMonthPicker(); paintMap(); paintMonthTable();
        var c = $('siteCount'); if (c) c.textContent = S.climate.sites.length;
      } else {
        showEmpty(['climateEmpty']);
      }
      if (S.terrain) paintTerrain(); else showEmpty(['terrainEmpty']);
      if (S.climate) paintCheck(); else showEmpty(['checkEmpty']);
      if (S.relief) paintRelief(); else showEmpty(['reliefEmpty']);
      paintMeta();

      if (window.EGYBI_SCROLLY && S.map) wireStory();
    });
  }

  /* The scrollytelling run uses the SHARED engine in scrolly.js rather than a
     second one. Each step names a region and the map goes there; the prose
     carries the argument so a reader without JS loses nothing but the movement. */
  function wireStory() {
    var G = window.EGYBI_SCROLLY;
    G.register('visitMap', {
      whole:  function (map) { G.goTo(map, [26.8, 30.8], 6); },
      delta:  function (map) { G.goTo(map, [30.9, 31.0], 8); },
      valley: function (map) { G.goTo(map, [25.7, 32.6], 9); },
      nubia:  function (map) { G.goTo(map, [22.9, 32.2], 8); },
      desert: function (map) { G.goTo(map, [28.5, 27.0], 7); },
      sinai:  function (map) { G.goTo(map, [28.7, 34.0], 8); }
    }, S.map);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
