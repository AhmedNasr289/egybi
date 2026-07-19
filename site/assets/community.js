/* EgyBI — Community ideas & comments (client handler).
   Wires the <form class="community-form"> and renders approved submissions from
   the moderated endpoint. Config: window.EGYBI_COMMUNITY.endpoint (default
   'api/community.php'). Everything a stranger posts is held for moderation, so
   the public list only ever shows approved notes. Degrades gracefully on a
   pure-static host (no PHP) — the form stays usable and explains itself.
   No-server alternative (Giscus / Disqus): see backend/DEPLOY.md. */
(function () {
  var CFG = window.EGYBI_COMMUNITY || {};
  var ENDPOINT = CFG.endpoint || 'api/community.php';

  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function fmt(ts) {
    if (!ts) return '';
    var m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var d = String(ts).slice(0, 10).split('-');
    if (d.length !== 3) return '';
    return parseInt(d[2], 10) + ' ' + m[parseInt(d[1], 10) - 1] + ' ' + d[0];
  }
  function setNote(el, msg, kind) {
    if (!el) return;
    el.textContent = msg;
    el.className = 'form-note' + (kind ? ' ' + kind : '');
  }

  // ---- render the approved list -------------------------------------------
  function loadApproved() {
    var list = document.getElementById('communityList');
    if (!list) return;
    fetch(ENDPOINT, { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var items = (d && d.items) || [];
        if (!items.length) {
          list.innerHTML = '<p style="color:var(--ink-soft);font-size:0.9rem;">No approved notes yet — be the first to share an idea. New posts appear here once a moderator reviews them.</p>';
          return;
        }
        list.innerHTML = items.map(function (it) {
          return '<div class="comment"><div class="comment-head"><span class="comment-name">' + esc(it.name || 'Anonymous') +
                 '</span><span class="comment-date">' + esc(fmt(it.ts)) + '</span></div>' +
                 '<p class="comment-body" dir="auto">' + esc(it.message) + '</p></div>';
        }).join('');
      })
      .catch(function () {
        list.innerHTML = '<p style="color:var(--ink-soft);font-size:0.9rem;">The discussion board is not connected on this preview. On the live site, approved ideas appear here.</p>';
      });
  }

  // ---- wire the submit form ------------------------------------------------
  function wire(form) {
    var msg   = form.querySelector('textarea[name="message"]');
    var name  = form.querySelector('input[name="name"]');
    var honey = form.querySelector('input[name="website"]');
    var btn   = form.querySelector('button[type="submit"], button:not([type])');
    var note  = form.parentElement.querySelector('.form-note') || form.querySelector('.form-note');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var message = (msg && msg.value || '').trim();
      if (honey && honey.value) { setNote(note, 'Thanks — received for review.', 'ok'); return; } // bot
      if (message.length < 3) { setNote(note, 'Please write a little more before sending.', 'error'); if (msg) msg.focus(); return; }
      if (message.length > 1500) { setNote(note, 'Please keep it under 1500 characters.', 'error'); return; }

      var original = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      setNote(note, '', '');

      var body = new URLSearchParams();
      body.set('message', message);
      body.set('name', name ? name.value.trim() : '');
      body.set('website', honey ? honey.value : '');

      fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
        .then(function (r) { return r.json().then(function (d) { return { status: r.status, data: d }; }); })
        .then(function (res) {
          if (res.data && res.data.ok) {
            setNote(note, res.data.message || 'Thank you — your note will appear once approved.', 'ok');
            form.reset();
          } else {
            setNote(note, (res.data && res.data.message) || 'Something went wrong — please try again.', 'error');
          }
        })
        .catch(function () {
          setNote(note, 'Submissions are not connected on this preview yet. On the live site this reaches the moderated board; for now, email hello@egybi.com.', 'error');
        })
        .finally(function () { if (btn) { btn.disabled = false; btn.textContent = original; } });
    });
  }

  document.querySelectorAll('.community-form').forEach(wire);
  loadApproved();
})();
