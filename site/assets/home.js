/* home.js — the "When are you going?" briefing on the home page.

   Three cited files answer three questions about the reader's own dates:
     visit-climate.json  how hot a normal afternoon is at each major site
     calendar.json       which holidays fall inside the trip
     fx-today.json       what their money is worth in pounds today
   Every number printed carries the file's own source line and date. If a file
   fails to load, its panel says so; nothing is filled in by guesswork. */
(function () {
  'use strict';
  var T = window.EGYBI && window.EGYBI.trip;
  if (!T) return;
  var esc = T.esc;
  // Translated text for what this script writes; the build collects every
  // quoted call to it into the Arabic and Russian tables (pages/i18n.py).
  var t = (window.EGYBI && window.EGYBI.t) || function (s) { return s; };
  function $(id) { return document.getElementById(id); }

  var trip = T.load();
  if (!trip.start || !trip.end) {
    var d = T.defaultDates();
    trip.start = d.start; trip.end = d.end;
  }
  var data = { climate: null, calendar: null, fx: null };

  function settle(p) { return p.then(function (v) { return v; }, function () { return null; }); }

  function init() {
    var s = $('tripStart'), e = $('tripEnd'), f = $('tripForm');
    if (!s || !e || !f) return;
    s.value = trip.start; e.value = trip.end;
    s.min = T.today();
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var note = $('tripNote');
      if (!T.parse(s.value) || !T.parse(e.value)) { note.className = 'form-note error'; note.textContent = t('Pick both dates.'); return; }
      if (T.parse(e.value) < T.parse(s.value)) { note.className = 'form-note error'; note.textContent = t('The leaving date is before the arriving date.'); return; }
      note.className = 'form-note'; note.textContent = '';
      trip = T.load(); trip.start = s.value; trip.end = e.value; T.save(trip);
      render();
      var b = $('briefing');
      if (b) b.scrollIntoView({ behavior: window.EGYBI.reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });
    Promise.all([
      settle(T.getJSON('data/visit-climate.json')),
      settle(T.getJSON('data/calendar.json')),
      settle(T.getJSON('data/fx-today.json'))
    ]).then(function (r) {
      data.climate = r[0]; data.calendar = r[1]; data.fx = r[2];
      render();
    });
  }

  function render() {
    renderHeat(); renderEvents(); renderRate();
  }

  /* ------------------------------------------------------------- heat --- */
  function renderHeat() {
    var grid = $('briefGrid'), lead = $('briefLead'), title = $('briefTitle'), cap = $('briefCap'), leg = $('heatLegend');
    if (!grid) return;
    var c = data.climate;
    if (!c || !c.sites || !c.sites.length) {
      lead.textContent = t('The climate record could not be loaded, so this section is empty rather than showing invented figures.');
      grid.innerHTML = ''; return;
    }
    var months = T.monthsOf(trip.start, trip.end);
    if (!months.length) { lead.textContent = t('Pick your dates above.'); return; }
    var main = months.slice().sort(function (a, b) { return b.days - a.days; })[0].month;
    var n = T.nights(trip.start, trip.end);
    var D_ = T.pageDigits;
    title.textContent = t('The heat, site by site, in %m.').replace('%m', T.monthName(main));
    if (T.pageLang() === 'en') {
      lead.innerHTML = 'Arriving ' + esc(T.fmtDate(trip.start)) + ', leaving ' + esc(T.fmtDate(trip.end)) +
        ' &mdash; ' + n + ' night' + (n === 1 ? '' : 's') +
        (months.length > 1 ? ', across ' + months.map(function (m) { return T.MONTHS[m.month] + ' (' + m.days + ' days)'; }).join(' and ') : '') +
        '. Below is what a normal afternoon and night reach in ' + T.MONTHS[main] +
        ' at each site: a long-run average, not a forecast.';
    } else {
      // Arabic and Russian plurals do not follow English rules, so counts
      // are written as labels ("Nights: 4") rather than "4 night(s)".
      lead.innerHTML = esc(t('Arriving %a, leaving %l.').replace('%a', T.fmtDate(trip.start)).replace('%l', T.fmtDate(trip.end))) + ' ' +
        esc(t('Nights: %n.').replace('%n', D_(n))) +
        (months.length > 1 ? ' ' + esc(months.map(function (m) {
          return t('%m, days: %n').replace('%m', T.monthName(m.month)).replace('%n', D_(m.days));
        }).join(T.pageLang() === 'ar' ? '؛ ' : '; ')) + '.' : '') + ' ' +
        esc(t('Below is what a normal afternoon and night reach in %m at each site: a long-run average, not a forecast.')
          .replace('%m', T.monthName(main)));
    }
    leg.innerHTML = T.BANDS.map(function (b) {
      return '<span><i style="background:' + b.colour + '"></i>' + esc(t(b.label)) + '</span>';
    }).join('') + '<span>' + esc(t('by day — the mean daily maximum')) + '</span>';

    var stops = (T.load().stops || []).map(function (x) { return x.id; });
    var sites = c.sites.slice().sort(function (a, b) {
      var x = (T.monthRow(a, main) || {}).t_daily_max, y = (T.monthRow(b, main) || {}).t_daily_max;
      return (x == null ? 99 : x) - (y == null ? 99 : y);
    });
    grid.innerHTML = sites.map(function (site) {
      var m = T.monthRow(site, main) || {};
      var bd = T.band(m.t_daily_max);
      var chip = bd
        ? '<span class="heat-chip" style="background:' + bd.colour + ';color:' + T.inkOn(bd.colour) + '">' + D_(Math.round(m.t_daily_max)) + '&nbsp;' + esc(t('°C')) + '</span>'
        : '<span class="heat-chip">—</span>';
      var other = months.filter(function (x) { return x.month !== main; }).map(function (x) {
        var r = T.monthRow(site, x.month);
        return r && r.t_daily_max != null ? (T.pageLang() === 'en' ? T.SHORT[x.month] : T.monthName(x.month)) + ' ' +
          D_(Math.round(r.t_daily_max)) + ' ' + t('°C') : '';
      }).filter(Boolean).join(' · ');
      var added = stops.indexOf('site:' + site.key) !== -1;
      return '<div class="sheet brief-site">' +
        '<h3>' + esc(site.name) + '</h3><span class="v-ar" lang="ar" dir="rtl">' + esc(site.name_ar || '') + '</span>' +
        chip + '<span class="night">' + esc(t('night %t').replace('%t', m.t_daily_min == null ? '—' : D_(Math.round(m.t_daily_min)) + ' ' + t('°C'))) + '</span>' +
        (other ? '<span class="night" style="display:block;margin:6px 0 0;">' + esc(other) + '</span>' : '') +
        '<div class="add-stop"><button type="button" class="btn btn-ghost btn-small" data-add="' + esc(site.key) + '" aria-pressed="' + added + '">' +
        esc(added ? t('In your plan ✓') : t('+ Add to my plan')) + '</button></div></div>';
    }).join('');
    grid.querySelectorAll('[data-add]').forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.getAttribute('data-add');
        var site = c.sites.filter(function (s) { return s.key === key; })[0];
        if (!site) return;
        var tr = T.load(), id = 'site:' + key;
        if (!tr.start) { tr.start = trip.start; tr.end = trip.end; }
        if (tr.stops.some(function (x) { return x.id === id; })) {
          tr.stops = tr.stops.filter(function (x) { return x.id !== id; });
          b.textContent = t('+ Add to my plan'); b.setAttribute('aria-pressed', 'false');
        } else {
          tr.stops.push({ id: id, name: site.name, name_ar: site.name_ar, lat: site.lat, lon: site.lon, days: 1 });
          b.textContent = t('In your plan ✓'); b.setAttribute('aria-pressed', 'true');
        }
        T.save(tr);
      });
    });
    // The briefing map (assets/site-map.js) colours its dots from the same
    // figures; the last set stays on window.EGYBI in case that script is late.
    var heat = { sites: c.sites, month: main };
    window.EGYBI.heat = heat;
    try { document.dispatchEvent(new CustomEvent('egybi:heat', { detail: heat })); } catch (e) { /* old browser: no map colours */ }
    cap.innerHTML = esc(t('Source: %s, mean daily maximum and minimum averaged over %w; checked against published station normals before publication. Layer dated %d.')
        .replace('%s', c.source).replace('%w', T.pageDigits(c.normal_window || '2001–2020')).replace('%d', T.fmtDate(c.as_of))) +
      ' <a href="' + T.url('visit.html#month') + '">' + esc(t('Every month, every site')) + ' &rarr;</a>';
  }

  /* ----------------------------------------------------------- events --- */
  function renderEvents() {
    var ul = $('eventList'), cap = $('eventCap');
    if (!ul) return;
    var cal = data.calendar;
    if (!cal) { ul.innerHTML = '<li>' + esc(t('The holiday calendar could not be loaded.')) + '</li>'; return; }
    var ev = T.eventsIn(cal, trip.start, trip.end);
    var w = cal.window || {};
    var outside = (T.parse(trip.start) < T.parse(w.from)) || (T.parse(trip.end) > T.parse(w.to));
    var items = ev.map(function (e) {
      var when = e.start === (e.end_latest || e.end) ? T.fmtDate(e.start)
        : T.fmtDate(e.start) + ' – ' + T.fmtDate(e.end_latest || e.end);
      return '<li><strong>' + esc(e.name) + '</strong> &middot; ' + esc(when) +
        (e.status === 'expected' ? '<span class="expected">' + esc(t('expected')) + '</span>' : '') +
        (e.note ? '<span class="src">' + esc(e.note) + '</span>' : '') +
        '<span class="src">' + esc(t('Source:')) + ' <a href="' + esc(e.source_url) + '" rel="noopener">' + esc(e.source) + '</a></span></li>';
    });
    if (!items.length) items.push('<li>' + esc(t('No public holiday in this calendar falls inside these dates.')) + '</li>');
    (cal.capacity || []).forEach(function (k) {
      items.push('<li><strong>' + esc(k.place) + '</strong> &middot; ' + esc(k.fact) +
        '<span class="src">' + esc(t('Source:')) + ' <a href="' + esc(k.source_url) + '" rel="noopener">' + esc(k.source) + '</a>, ' + esc(k.as_reported) + '</span></li>');
    });
    ul.innerHTML = items.join('');
    cap.textContent = (outside ? t('This calendar covers %a to %b only; dates outside it are not checked.')
        .replace('%a', T.fmtDate(w.from)).replace('%b', T.fmtDate(w.to)) + ' ' : '') +
      t('Islamic dates follow the moon and are confirmed only by the official sighting, so they are shown as expected ranges. Compiled %d.')
        .replace('%d', T.fmtDate(cal.as_of));
  }

  /* ------------------------------------------------------------- rate --- */
  function renderRate() {
    var box = $('rateBox');
    if (!box) return;
    var fx = data.fx;
    if (!fx) { box.innerHTML = '<p class="chart-cap">' + esc(t('The rate could not be loaded.')) + '</p>'; return; }
    var rows = ['USD', 'EUR', 'GBP'].map(function (code) {
      var r = T.rate(fx, code);
      if (r == null) return '';
      return '<tr><th scope="row">' + code + '</th><td class="num">1 ' + code + ' = ' + T.rateText(r) + '</td>' +
        '<td class="num">EGP 1,000 = ' + T.money(1000 / r, code) + '</td></tr>';
    }).join('');
    var src = fx.source || {};
    box.innerHTML = '<div class="fp-wrap"><table class="fp-table"><tbody>' + rows + '</tbody></table></div>' +
      '<p class="chart-cap">' + esc(t('%s, dated %d.').replace('%s', src.name_en || t('Market rates')).replace('%d', T.fmtDate(fx.as_of))) + ' ' +
      esc(src.note_en || '') + ' <a href="' + T.url('prices.html#fx-section') + '">' + esc(t('The rate, daily')) + ' &rarr;</a></p>';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
