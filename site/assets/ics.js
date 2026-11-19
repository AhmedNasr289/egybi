/* ics.js — a trip as a calendar file (2026-11-18).

   The planner's "Add to my calendar" button builds an iCalendar (RFC 5545)
   file in the browser and hands it to the reader: nothing is sent anywhere.
   Each stop is one all-day event, placed from the trip's arrival date and the
   days the reader gave each stop, in order. Without an arrival date there is
   nothing to place, and the planner says so instead of guessing.

   Pure and dependency-free, so backend/verify/ics-cases.js can test it
   without a page. */
(function () {
  'use strict';
  var CRLF = '\r\n';

  // TEXT values escape backslash, semicolon, comma and newline (RFC 5545 3.3.11).
  function text(s) {
    return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;')
      .replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }
  // Lines longer than 75 octets are folded: CRLF then one space (3.1).
  function fold(line) {
    var out = [], cur = '', n = 0;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i], code = line.charCodeAt(i);
      // keep a surrogate pair together
      if (code >= 0xD800 && code <= 0xDBFF && i + 1 < line.length) { ch += line[++i]; }
      var size = unescape(encodeURIComponent(ch)).length;
      if (n + size > (out.length ? 74 : 75)) { out.push(cur); cur = ''; n = 0; }
      cur += ch; n += size;
    }
    out.push(cur);
    return out.join(CRLF + ' ');
  }
  function ymd(d) {
    return String(d.getUTCFullYear()) + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0');
  }
  function parse(s) {
    var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(String(s || ''));
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  }
  function addDays(d, n) { return new Date(d.getTime() + n * 86400000); }

  /* trip: { start: 'YYYY-MM-DD', name, stops: [{ id, name, days }] }
     opts: { now: Date (for DTSTAMP), note: string (DESCRIPTION), title: fn(stopName) }
     Returns the file's text, or null when the trip has no arrival date or no stops. */
  function build(trip, opts) {
    opts = opts || {};
    var start = parse(trip && trip.start);
    var stops = (trip && trip.stops) || [];
    if (!start || !stops.length) return null;
    var now = opts.now || new Date();
    var stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//egybi.com//trip planner//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    var day = start;
    stops.forEach(function (st, i) {
      var n = Math.max(1, Math.min(30, parseInt(st.days, 10) || 1));
      var end = addDays(day, n);
      var title = opts.title ? opts.title(st.name) : st.name;
      lines.push('BEGIN:VEVENT',
        'UID:' + ymd(start) + '-' + (i + 1) + '-' + String(st.id || i).replace(/[^\w.:-]/g, '') + '@egybi.com',
        'DTSTAMP:' + stamp,
        'DTSTART;VALUE=DATE:' + ymd(day),
        'DTEND;VALUE=DATE:' + ymd(end),
        'SUMMARY:' + text(title),
        'TRANSP:TRANSPARENT');
      if (opts.note) lines.push('DESCRIPTION:' + text(opts.note));
      lines.push('END:VEVENT');
      day = end;
    });
    lines.push('END:VCALENDAR');
    return lines.map(fold).join(CRLF) + CRLF;
  }

  window.EGYBI = window.EGYBI || {};
  window.EGYBI.ics = { build: build, text: text, fold: fold };
}());
