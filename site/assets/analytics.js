/* EgyBI — first-party, cookieless analytics beacon (privacy-respecting).
   Sends one tiny page-view ping to api/hit.php: the path and the referring host.
   No cookies, no IDs, no third parties. Honours Do-Not-Track and never runs on
   localhost/preview. Fire-and-forget — never blocks or affects the page. */
(function () {
  try {
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
    var h = location.hostname;
    if (h === 'localhost' || h === '127.0.0.1' || h === '' || h.indexOf('.') === -1) return;

    // Resolve the endpoint against THIS script's address, not the page's.
    // Until 2026-11-09 it was the bare relative 'api/hit.php', which a page in
    // a folder (visit/, papyrus/, practice/: 153 pages) resolved to
    // visit/api/hit.php - a 404 - so none of their views was ever counted.
    // The script always sits in assets/, so ../api/ is right on every page.
    var me = document.currentScript && document.currentScript.src;
    var url = me ? new URL('../api/hit.php', me).href : '/api/hit.php';
    // Campaign tag. A link we post carries ?utm_source=&utm_medium=&utm_campaign=
    // (see egybi/Campaign Kit). The referrer alone cannot tell a Reddit answer
    // from a Reddit [OC] chart, and most apps (Telegram, WhatsApp, mail) send no
    // referrer at all. Only the three tag values travel, joined into one short
    // slug; the rest of the query string is never read. Sent with the page view
    // only, never with events.
    var src = '';
    try {
      var qs = location.search || '';
      var tag = function (k) {
        var m = qs.match(new RegExp('[?&]' + k + '=([^&#]*)'));
        return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20) : '';
      };
      var s = tag('utm_source');
      if (s) src = [s, tag('utm_medium'), tag('utm_campaign')].join('.');
    } catch (e) { src = ''; }
    function send(event) {
      var body = JSON.stringify({ path: location.pathname, ref: document.referrer || '', event: event || '', src: event ? '' : src });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      } else {
        fetch(url, { method: 'POST', body: body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(function () {});
      }
    }
    send(); // the page view itself

    // Funnel events. Each step fires at most once per page so the counts read as
    // "visitors who reached this step", not "clicks".
    var fired = {};
    window.EGYBI_TRACK = function (event) {
      if (!event || fired[event]) return;
      fired[event] = 1;
      try { send(event); } catch (e) {}
    };

    // Declarative hook: any element with data-ev="..." reports once when used.
    document.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-ev]') : null;
      if (el) window.EGYBI_TRACK(el.getAttribute('data-ev'));
    }, true);
  } catch (e) { /* analytics must never break the page */ }
})();
