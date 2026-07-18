/* EgyBI — Google AdSense loader (config-gated, privacy-respecting).
   Activates ONLY when a real AdSense publisher ID is set in
   window.EGYBI_ADS.client (format ca-pub-################). Until then it does
   nothing — no external request, no empty ad boxes — so the site (and the
   preview) stays clean and fast before monetisation is switched on.

   To go live: put your real publisher ID in the per-page config script and add
   the same ID to /ads.txt, then create ad units in the AdSense dashboard and
   drop their slot IDs into the .ad-slot elements. See backend/DEPLOY.md. */
(function () {
  var CFG = window.EGYBI_ADS || {};
  var client = (CFG.client || '').trim();

  // Guard: must be a real ca-pub id and NOT the placeholder.
  if (!/^ca-pub-\d{10,20}$/.test(client) || client.indexOf('XXXX') > -1) {
    return; // not configured yet — stay inert
  }

  // Load the AdSense library once.
  var lib = document.createElement('script');
  lib.async = true;
  lib.crossOrigin = 'anonymous';
  lib.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(client);
  document.head.appendChild(lib);

  // Fill every declared ad slot with a responsive unit.
  document.querySelectorAll('.ad-slot[data-ad-slot]').forEach(function (box) {
    box.hidden = false;
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', client);
    ins.setAttribute('data-ad-slot', box.getAttribute('data-ad-slot'));
    ins.setAttribute('data-ad-format', 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    box.appendChild(ins);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
  });
})();
