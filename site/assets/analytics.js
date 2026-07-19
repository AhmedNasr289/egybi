/* EgyBI — first-party, cookieless analytics beacon (privacy-respecting).
   Sends one tiny page-view ping to api/hit.php: the path and the referring host.
   No cookies, no IDs, no third parties. Honours Do-Not-Track and never runs on
   localhost/preview. Fire-and-forget — never blocks or affects the page. */
(function () {
  try {
    if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
    var h = location.hostname;
    if (h === 'localhost' || h === '127.0.0.1' || h === '' || h.indexOf('.') === -1) return;

    var body = JSON.stringify({ path: location.pathname, ref: document.referrer || '' });
    var url = 'api/hit.php';
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(url, { method: 'POST', body: body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(function () {});
    }
  } catch (e) { /* analytics must never break the page */ }
})();
