/* ask.js — builds the plan-check email from the plan saved in this browser,
   so the reader does not have to retype it. Nothing is sent by the page: it
   only fills a mailto: link that the reader's own mail client opens. */
(function () {
  'use strict';
  var T = window.EGYBI && window.EGYBI.trip;
  var a = document.getElementById('askMail'), pre = document.getElementById('askPreview');
  if (!T || !a) return;
  var t = T.load(), lines = ['Hello EgyBI,', '', 'Please check my Egypt plan.', ''];
  if (t.start && t.end) lines.push('Dates: ' + T.fmtDate(t.start) + ' to ' + T.fmtDate(t.end) + ' (' + T.nights(t.start, t.end) + ' nights)');
  if (t.stops && t.stops.length) {
    lines.push('Stops:');
    t.stops.forEach(function (s, i) { lines.push('  ' + (i + 1) + '. ' + s.name + ' — ' + (s.days || 1) + ' day(s)'); });
  } else lines.push('Stops: (not yet planned — I will describe them here)');
  lines.push('', 'Travelling as: ', 'What worries me most about this plan: ', '', 'Thank you');
  var body = lines.join('\n');
  a.href = 'mailto:hello@egybi.com?subject=' + encodeURIComponent('Plan check request') + '&body=' + encodeURIComponent(body);
  if (pre) pre.textContent = body;
}());
