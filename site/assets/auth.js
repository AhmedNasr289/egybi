/* EgyBI — Phase 2 account UI (client).
   Renders the nav account control, a sign-in / create-account / reset modal, and
   syncs solved-challenge progress between localStorage and the account. Talks to
   the isolated auth endpoints under window.EGYBI_AUTH.base (default 'auth/').
   Anonymous visitors are untouched — solving still works with localStorage, and
   nothing here runs until they choose to sign in. Degrades gracefully if the
   auth backend isn't reachable (e.g. a pure-static preview): the control just
   shows "Sign in" and the modal explains it. */
(function () {
  var CFG = window.EGYBI_AUTH || {};
  var BASE = CFG.base || 'auth/';
  var SOLVED_KEY = 'egybi_solved';
  var esc = (window.EGYBI && EGYBI.escapeHtml) ? EGYBI.escapeHtml : function (s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; };
  var csrf = null, user = null, stats = null;
  var POINTS = { Easy: 10, Medium: 20, Hard: 40 };
  // Build a { challenge_id: points } map from the catalogue when it's loaded
  // (Practice page). Elsewhere it's empty and the server defaults to 10 each.
  function pointsMap() {
    var m = {}, cat = window.EGYBI_CHALLENGES || [];
    cat.forEach(function (c) { m[c.id] = POINTS[c.difficulty] || 10; });
    return m;
  }

  // ---- tiny API helper -----------------------------------------------------
  function api(action, method, data) {
    var url = BASE + 'auth.php?action=' + encodeURIComponent(action);
    var opts = { method: method || 'GET', headers: {} };
    if (data) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(data); }
    if (csrf && method === 'POST') opts.headers['X-CSRF'] = csrf;
    return fetch(url, opts).then(function (r) { return r.json().then(function (j) { return { status: r.status, data: j }; }); });
  }
  function localSolved() { try { return JSON.parse(localStorage.getItem(SOLVED_KEY) || '[]'); } catch (e) { return []; } }
  function setLocalSolved(arr) { try { localStorage.setItem(SOLVED_KEY, JSON.stringify(arr)); } catch (e) {} }

  // ---- progress sync: merge localStorage <-> account -----------------------
  function syncProgress() {
    if (!user) return;
    var local = localSolved();
    fetch(BASE + 'progress.php', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF': csrf || '' },
      body: JSON.stringify({ solved: local, points: pointsMap() })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.solved) {
        // union of server + local, written back so the Practice page picks it up
        var union = {}; j.solved.concat(local).forEach(function (id) { union[id] = 1; });
        setLocalSolved(Object.keys(union));
        if (j.stats) { stats = j.stats; }
        renderNav(); renderProfile();
        window.dispatchEvent(new CustomEvent('egybi:progress-synced'));
      }
    }).catch(function () {});
  }

  // ---- nav account control -------------------------------------------------
  function renderNav() {
    var nav = document.querySelector('.nav-links'); if (!nav) return;
    var slot = document.getElementById('acct-slot');
    if (!slot) { slot = document.createElement('span'); slot.id = 'acct-slot'; slot.className = 'acct-slot'; nav.appendChild(slot); }
    if (user) {
      var initial = (user.email || '?').charAt(0).toUpperCase();
      var sHtml = '';
      if (stats) {
        var r = stats.rank || {};
        sHtml = '<div class="acct-stats">' +
          '<div><b>' + stats.xp + '</b><span>XP</span></div>' +
          '<div><b>' + stats.current_streak + '🔥</b><span>streak</span></div>' +
          '<div><b>' + stats.solved_count + '</b><span>solved</span></div></div>' +
          '<div class="acct-rank">' + esc(r.tier || 'Apprentice Scribe') +
          (r.next ? '<span class="acct-next"> · ' + (r.next_at - stats.xp) + ' XP to ' + esc(r.next) + '</span>' : '') + '</div>';
      }
      slot.innerHTML = '<button class="acct-btn" id="acctBtn" aria-haspopup="true" aria-expanded="false"><span class="acct-av">' + esc(initial) + '</span></button>' +
        '<div class="acct-menu" id="acctMenu" hidden>' +
        '<div class="acct-handle"><span id="acctName">' + esc(user.name || 'Scribe') + '</span>' +
        '<button id="acctRename" class="acct-edit" title="Change your leaderboard handle" aria-label="Change handle">✎</button></div>' +
        '<div class="acct-email">' + esc(user.email) + '</div>' +
        '<div class="acct-plan">Plan: ' + esc(user.plan || 'free') + (user.verified ? '' : ' · unverified') + '</div>' +
        sHtml +
        '<a href="practice.html">Your progress</a><button id="acctOut">Sign out</button></div>';
      document.getElementById('acctBtn').addEventListener('click', function (e) {
        var m = document.getElementById('acctMenu'); var open = m.hasAttribute('hidden');
        if (open) { m.removeAttribute('hidden'); this.setAttribute('aria-expanded', 'true'); } else { m.setAttribute('hidden', ''); this.setAttribute('aria-expanded', 'false'); }
      });
      document.getElementById('acctRename').addEventListener('click', function () {
        var cur = (user && user.name) || '';
        var next = window.prompt('Your leaderboard handle (3–32 letters, numbers, spaces, - or _):', cur);
        if (next == null) return;
        next = next.trim();
        if (next === '' || next === cur) return;
        api('rename', 'POST', { name: next }).then(function (res) {
          var d = res.data || {};
          if (d.ok) { user.name = d.name; var el = document.getElementById('acctName'); if (el) el.textContent = d.name; }
          else window.alert(d.message || 'Could not update your handle.');
        }).catch(function () { window.alert('Could not reach the server.'); });
      });
      document.getElementById('acctOut').addEventListener('click', function () {
        api('logout', 'POST').then(function () { user = null; csrf = null; renderNav(); });
      });
    } else {
      slot.innerHTML = '<button class="acct-btn signin" id="signinBtn">Sign in</button>';
      document.getElementById('signinBtn').addEventListener('click', openModal);
    }
  }

  // ---- Practice-page profile strip (XP / rank / streak) --------------------
  function renderProfile() {
    var head = document.querySelector('.catalog h3'); // Practice page only
    if (!head) return;
    var strip = document.getElementById('acct-profile');
    if (!user || !stats) { if (strip) strip.remove(); return; }
    if (!strip) { strip = document.createElement('div'); strip.id = 'acct-profile'; strip.className = 'acct-profile'; head.parentNode.insertBefore(strip, head.nextSibling); }
    var r = stats.rank || {};
    strip.innerHTML =
      '<div class="ap-rank"><span class="ap-tier">' + esc(r.tier || 'Apprentice Scribe') + '</span>' +
      '<span class="ap-xp">' + stats.xp + ' XP</span></div>' +
      (r.next ? '<div class="ap-bar"><i style="width:' + (r.progress_pct || 0) + '%"></i></div>' +
        '<div class="ap-next">' + (r.next_at - stats.xp) + ' XP to ' + esc(r.next) + '</div>' : '<div class="ap-next">Top rank reached — Vizier of Data.</div>') +
      '<div class="ap-stats"><span>🔥 ' + stats.current_streak + '-day streak</span><span>best ' + stats.longest_streak + '</span><span>' + stats.solved_count + ' solved</span></div>';
  }

  // ---- modal (sign in / create account / reset) ----------------------------
  function openModal(tab) {
    if (document.getElementById('authModal')) return;
    var wrap = document.createElement('div');
    wrap.id = 'authModal'; wrap.className = 'auth-modal';
    wrap.innerHTML =
      '<div class="auth-box" role="dialog" aria-modal="true" aria-label="Account">' +
      '<button class="auth-x" aria-label="Close">×</button>' +
      '<div class="auth-tabs"><button data-t="in" class="on">Sign in</button><button data-t="up">Create account</button></div>' +
      '<form class="auth-form" novalidate>' +
      '<input type="text" name="website" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<label>Email<input type="email" name="email" required autocomplete="email"></label>' +
      '<label>Password<input type="password" name="password" required minlength="8" autocomplete="current-password"></label>' +
      '<button type="submit" class="btn btn-primary auth-submit">Sign in</button>' +
      '<p class="auth-note" role="status" aria-live="polite"></p>' +
      '<button type="button" class="auth-forgot">Forgot password?</button>' +
      '</form></div>';
    document.body.appendChild(wrap);
    var mode = 'in';
    var form = wrap.querySelector('.auth-form');
    var note = wrap.querySelector('.auth-note');
    var submit = wrap.querySelector('.auth-submit');
    function setMode(t) {
      mode = t;
      wrap.querySelectorAll('.auth-tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); });
      submit.textContent = t === 'in' ? 'Sign in' : 'Create account';
      form.password.autocomplete = t === 'in' ? 'current-password' : 'new-password';
      note.textContent = ''; note.className = 'auth-note';
    }
    wrap.querySelectorAll('.auth-tabs button').forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.t); }); });
    wrap.querySelector('.auth-x').addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    document.addEventListener('keydown', escClose);
    function escClose(e) { if (e.key === 'Escape') close(); }
    function close() { document.removeEventListener('keydown', escClose); wrap.remove(); }

    wrap.querySelector('.auth-forgot').addEventListener('click', function () {
      var email = (form.email.value || '').trim();
      if (!email) { note.textContent = 'Enter your email above, then tap reset.'; note.className = 'auth-note error'; return; }
      api('request-reset', 'POST', { email: email }).then(function () {
        note.textContent = 'If that email has an account, a reset link is on its way.'; note.className = 'auth-note ok';
      }).catch(function () { note.textContent = 'Could not reach the server.'; note.className = 'auth-note error'; });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.website.value) { close(); return; } // honeypot
      var email = (form.email.value || '').trim(), pw = form.password.value || '';
      if (pw.length < 8) { note.textContent = 'Password must be at least 8 characters.'; note.className = 'auth-note error'; return; }
      submit.disabled = true; var orig = submit.textContent; submit.textContent = '…';
      api(mode === 'in' ? 'login' : 'signup', 'POST', { email: email, password: pw }).then(function (res) {
        var d = res.data || {};
        if (mode === 'up') {
          note.textContent = d.message || 'Check your email to verify.'; note.className = 'auth-note ' + (d.ok ? 'ok' : 'error');
        } else if (d.ok) {
          csrf = d.csrf; user = d.user; renderNav(); syncProgress(); close();
        } else {
          note.textContent = d.message || 'Could not sign in.'; note.className = 'auth-note error';
        }
      }).catch(function () {
        note.textContent = 'The account service is not connected on this preview.'; note.className = 'auth-note error';
      }).finally(function () { submit.disabled = false; submit.textContent = orig; });
    });
    if (tab) setMode(tab);
    setTimeout(function () { form.email.focus(); }, 30);
  }

  // ---- styles (injected so no egybi.css edit needed) -----------------------
  var css = document.createElement('style');
  css.textContent =
    '.acct-slot{display:inline-flex;align-items:center}' +
    '.acct-btn.signin{background:none;border:1px solid rgba(255,255,255,.4);color:var(--on-dark);font:inherit;font-size:.9rem;font-weight:600;padding:6px 14px;border-radius:8px;cursor:pointer;transition:all .15s}' +
    '.acct-btn.signin:hover{border-color:var(--gold-bright);color:var(--gold-bright)}' +
    '.acct-slot{position:relative}' +
    '.acct-btn:not(.signin){background:none;border:none;cursor:pointer;padding:0}' +
    '.acct-av{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:var(--gold);color:var(--kemet);font-weight:800;font-family:Inter,sans-serif}' +
    '.acct-menu{position:absolute;right:0;top:44px;background:var(--kemet-2);border:1px solid var(--line-dark);border-radius:12px;padding:12px 14px;min-width:190px;box-shadow:0 18px 40px rgba(0,0,0,.45);z-index:200}' +
    '.acct-menu .acct-handle{display:flex;align-items:center;gap:6px;margin-bottom:2px}' +
    '.acct-menu .acct-handle #acctName{color:var(--gold-bright);font-weight:800;font-size:.98rem;font-family:Cinzel,serif}' +
    '.acct-edit{background:none;border:none;color:var(--on-dark-soft);cursor:pointer;font-size:.85rem;padding:0 2px;line-height:1;width:auto!important}' +
    '.acct-edit:hover{color:var(--gold-bright)}' +
    '.acct-menu .acct-email{color:#cdbf9e;font-weight:500;font-size:.78rem;font-family:Inter,sans-serif;word-break:break-all}' +
    '.acct-menu .acct-plan{color:var(--on-dark-soft);font-size:.76rem;margin:2px 0 10px}' +
    '.acct-menu a,.acct-menu button{display:block;width:100%;text-align:left;background:none;border:none;color:var(--on-dark);font:inherit;font-size:.88rem;padding:7px 0;cursor:pointer;text-decoration:none}' +
    '.acct-menu a:hover,.acct-menu button:hover{color:var(--gold-bright)}' +
    '.auth-modal{position:fixed;inset:0;background:rgba(15,12,8,.62);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:5vw}' +
    '.auth-box{background:var(--papyrus-2);border:1px solid var(--line-light);border-radius:18px;padding:26px 26px 22px;width:100%;max-width:380px;position:relative;box-shadow:0 30px 70px rgba(0,0,0,.4)}' +
    '.auth-x{position:absolute;top:12px;right:14px;background:none;border:none;font-size:1.5rem;line-height:1;color:var(--ink-soft);cursor:pointer}' +
    '.auth-tabs{display:flex;gap:6px;margin-bottom:16px}' +
    '.auth-tabs button{flex:1;background:var(--papyrus);border:1px solid var(--line-light);color:var(--ink-soft);font:inherit;font-weight:700;font-size:.85rem;padding:9px;border-radius:9px;cursor:pointer}' +
    '.auth-tabs button.on{background:var(--blue);color:#fff;border-color:var(--blue)}' +
    '.auth-form label{display:block;font-size:.82rem;font-weight:600;color:var(--blue-deep);margin-bottom:12px}' +
    '.auth-form input:not(.hp-field){display:block;width:100%;margin-top:5px;padding:10px 12px;border:1px solid var(--line-light);border-radius:9px;background:#fff;color:var(--ink);font-family:inherit;font-size:.95rem}' +
    '.auth-form input:focus-visible{outline:2px solid var(--gold);outline-offset:1px}' +
    '.auth-submit{width:100%;margin-top:4px}' +
    '.auth-note{font-size:.85rem;margin:10px 0 4px;min-height:1.1em}' +
    '.auth-note.ok{color:var(--success)}.auth-note.error{color:var(--danger)}' +
    '.auth-forgot{background:none;border:none;color:var(--gold-ink);font:inherit;font-size:.82rem;font-weight:600;cursor:pointer;padding:0;margin-top:4px}' +
    '.acct-stats{display:flex;gap:14px;margin:2px 0 8px}' +
    '.acct-stats div{display:flex;flex-direction:column;line-height:1.1}' +
    '.acct-stats b{color:var(--gold-bright);font-size:1.05rem;font-family:Cinzel,serif}' +
    '.acct-stats span{color:var(--on-dark-soft);font-size:.66rem;text-transform:uppercase;letter-spacing:.04em}' +
    '.acct-rank{color:#f3ead4;font-size:.82rem;font-weight:700;margin-bottom:10px}' +
    '.acct-rank .acct-next{color:var(--on-dark-soft);font-weight:400}' +
    '.acct-profile{background:var(--papyrus-2);border:1px solid var(--line-light);border-left:4px solid var(--gold);border-radius:12px;padding:12px 14px;margin:0 0 14px}' +
    '.acct-profile .ap-rank{display:flex;justify-content:space-between;align-items:baseline;gap:8px}' +
    '.acct-profile .ap-tier{font-family:Cinzel,serif;font-weight:700;color:var(--blue-deep);font-size:.98rem}' +
    '.acct-profile .ap-xp{font-weight:800;color:var(--gold-ink)}' +
    '.acct-profile .ap-bar{height:7px;background:var(--gold-soft);border-radius:999px;overflow:hidden;margin:8px 0 6px}' +
    '.acct-profile .ap-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--gold),var(--gold-bright))}' +
    '.acct-profile .ap-next{font-size:.76rem;color:var(--ink-soft)}' +
    '.acct-profile .ap-stats{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:.78rem;color:var(--ink-soft)}' +
    '.hp-field{position:absolute!important;left:-9999px!important;width:1px;height:1px;opacity:0}';
  document.head.appendChild(css);

  // ---- reset landing: /any?reset=TOKEN -> set a new password ----------------
  function openResetModal(token) {
    if (document.getElementById('authModal')) return;
    var wrap = document.createElement('div');
    wrap.id = 'authModal'; wrap.className = 'auth-modal';
    wrap.innerHTML = '<div class="auth-box" role="dialog" aria-modal="true" aria-label="Reset password">' +
      '<button class="auth-x" aria-label="Close">×</button>' +
      '<div class="auth-tabs"><button class="on">Set a new password</button></div>' +
      '<form class="auth-form" novalidate><label>New password<input type="password" name="password" required minlength="8" autocomplete="new-password"></label>' +
      '<button type="submit" class="btn btn-primary auth-submit">Update password</button>' +
      '<p class="auth-note" role="status" aria-live="polite"></p></form></div>';
    document.body.appendChild(wrap);
    var form = wrap.querySelector('.auth-form'), note = wrap.querySelector('.auth-note');
    wrap.querySelector('.auth-x').addEventListener('click', function () { wrap.remove(); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var pw = form.password.value || '';
      if (pw.length < 8) { note.textContent = 'Password must be at least 8 characters.'; note.className = 'auth-note error'; return; }
      api('reset', 'POST', { token: token, password: pw }).then(function (res) {
        var d = res.data || {};
        note.textContent = d.message || (d.ok ? 'Password updated.' : 'That link has expired.');
        note.className = 'auth-note ' + (d.ok ? 'ok' : 'error');
        if (d.ok) setTimeout(function () { wrap.remove(); openModal('in'); }, 1200);
      }).catch(function () { note.textContent = 'Could not reach the server.'; note.className = 'auth-note error'; });
    });
    setTimeout(function () { form.password.focus(); }, 30);
  }

  // ---- boot: check session, handle ?verify= and ?reset= links --------------
  function boot() {
    var rm = location.search.match(/[?&]reset=([a-f0-9]+)/i);
    if (rm) { try { history.replaceState(null, '', location.pathname); } catch (e) {} setTimeout(function () { openResetModal(rm[1]); }, 80); }
    // verification landing: /any?verify=TOKEN
    var m = location.search.match(/[?&]verify=([a-f0-9]+)/i);
    if (m) {
      api('verify', 'GET').then(function () {}); // touch to keep cookie warm
      fetch(BASE + 'auth.php?action=verify&token=' + m[1]).then(function (r) { return r.json(); }).then(function (j) {
        try { history.replaceState(null, '', location.pathname); } catch (e) {}
        setTimeout(function () { openModal('in'); var n = document.querySelector('#authModal .auth-note'); if (n) { n.textContent = j.message || ''; n.className = 'auth-note ' + (j.ok ? 'ok' : 'error'); } }, 60);
      }).catch(function () {});
    }
    api('me', 'GET').then(function (res) {
      var d = res.data || {};
      if (d.ok && d.user) { user = d.user; csrf = d.csrf; stats = d.stats || null; renderNav(); renderProfile(); syncProgress(); }
      else renderNav();
    }).catch(function () { renderNav(); }); // offline/static preview: just show Sign in
  }
  if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
  window.EGYBI_ACCOUNT = { syncProgress: syncProgress, get user() { return user; } };
})();
