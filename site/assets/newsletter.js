/* EgyBI — "The Papyrus" newsletter signup (client handler).
   Wires every <form class="newsletter-form">. Does real email validation, a
   honeypot check, accessible status messaging, and a configurable submit path:
     - window.EGYBI_NEWSLETTER.endpoint  -> POST target (default '/api/newsletter.php')
   If the endpoint is not reachable (e.g. before the PHP handler is deployed, or
   on a pure-static host), it fails gracefully with a clear message instead of a
   silent error. Swap the endpoint for a Formspree/Buttondown URL to go fully
   serverless — see backend/DEPLOY.md. */
(function () {
  var CFG = window.EGYBI_NEWSLETTER || {};
  var ENDPOINT = CFG.endpoint || '/api/newsletter.php';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setNote(el, msg, kind) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'form-note' + (kind ? ' ' + kind : '');
    if (kind === 'ok') { var L = el.closest && el.closest('.papyrus-letter'); if (L) L.classList.add('sealed'); }
  }

  function wire(form) {
    var input = form.querySelector('input[type="email"]');
    var honey = form.querySelector('input[name="website"]');
    var btn = form.querySelector('button[type="submit"], button:not([type])');
    var note = form.parentElement.querySelector('.form-note') || form.querySelector('.form-note');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (input && input.value || '').trim();

      if (honey && honey.value) { setNote(note, 'Thanks for subscribing.', 'ok'); return; } // bot
      if (!EMAIL_RE.test(email)) {
        setNote(note, 'Please enter a valid email address.', 'error');
        if (input) input.focus();
        return;
      }

      var original = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Subscribing…'; }
      setNote(note, '', '');

      var body = new URLSearchParams();
      body.set('email', email);
      body.set('website', honey ? honey.value : '');

      fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
        .then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); })
        .then(function (res) {
          if (res.data && res.data.ok) {
            setNote(note, res.data.message || 'You are subscribed to The Papyrus.', 'ok');
            form.reset();
          } else {
            setNote(note, (res.data && res.data.message) || 'Something went wrong — please try again.', 'error');
          }
        })
        .catch(function () {
          // endpoint unreachable (not yet deployed / static host) — be honest, not broken
          setNote(note, 'Signup is not connected on this preview yet. On the live site this reaches The Papyrus list; for now, email hello@egybi.com to be added.', 'error');
        })
        .finally(function () { if (btn) { btn.disabled = false; btn.textContent = original; } });
    });
  }

  document.querySelectorAll('.newsletter-form').forEach(wire);
})();
