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
    // Prefer the dedicated actions zone so the account control never widens
    // the link row (which used to make the whole header wrap).
    var nav = document.querySelector('.nav-actions') || document.querySelector('.nav-links'); if (!nav) return;
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
      document.getElementById('signinBtn').addEventListener('click', function () { openModal('in'); });
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

  // ==========================================================================
  // The auth dialog — "The Threshold".
  //
  // Two zones: a dark kemet rail carrying the ankh, the promise and one proof
  // number, and a papyrus form panel. Gold and the hieroglyphs sit on the dark
  // surface they were drawn for, while typed input stays on the light surface
  // where it is most legible. At 720px the rail becomes a header strip.
  //
  // One shell serves four views (sign in / create account / forgot / set new
  // password) so switching never feels like three screens bolted together — the
  // panel crossfades and the shell animates to the new height.
  // ==========================================================================

  var GSI_SRC = 'https://accounts.google.com/gsi/client';
  var googleCfg = { enabled: false, client_id: '' };   // filled by boot() from `me`
  var gsiLoading = null;

  function loadGsi() {
    if (window.google && google.accounts && google.accounts.id) return Promise.resolve(true);
    if (gsiLoading) return gsiLoading;
    gsiLoading = new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = GSI_SRC; s.async = true; s.defer = true;
      s.onload = function () { resolve(!!(window.google && google.accounts && google.accounts.id)); };
      s.onerror = function () { resolve(false); };   // offline / blocked: stay silent
      document.head.appendChild(s);
    });
    return gsiLoading;
  }

  /** Honest password feedback.
   *  Length is weighted far above character variety because that is what
   *  actually buys entropy — "correct horse battery" beats "P@ss1!" by orders of
   *  magnitude, and telling people otherwise trains a bad habit. Obvious
   *  patterns are pushed back down to Weak no matter how long they are. */
  function pwStrength(pw) {
    if (!pw) return { score: -1, label: '', hint: '' };
    var n = pw.length;
    if (n < 8) return { score: 0, label: 'Too short', hint: 'Needs at least 8 characters.' };
    var classes = (/[a-z]/.test(pw) ? 1 : 0) + (/[A-Z]/.test(pw) ? 1 : 0) +
                  (/\d/.test(pw) ? 1 : 0) + (/[^A-Za-z0-9]/.test(pw) ? 1 : 0);
    var predictable = /^(?:password|passw0rd|qwerty|letmein|welcome|admin|iloveyou|egybi|123456)/i.test(pw) ||
                      /^(.)\1+$/.test(pw) ||
                      /^(?:0123|1234|12345|abcd|abcde)/i.test(pw);
    var score;
    if (n >= 16) score = 3;
    else if (n >= 12) score = classes >= 2 ? 3 : 2;
    else score = classes >= 3 ? 2 : 1;
    if (predictable) score = 1;
    var label = ['Weak', 'Weak', 'Fair', 'Strong'][score];
    var hint = predictable ? 'That pattern is one of the first things guessed.'
             : score >= 3 ? 'Length is what makes this one hard to crack.'
             : score === 2 ? 'Longer beats more symbols. Try a few words you will remember.'
             : 'Short passwords fall fast. Aim for 12+ characters.';
    return { score: score, label: label, hint: hint };
  }

  function emailLooksValid(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }

  var lastTrigger = null;   // restore focus here when the dialog closes

  var VIEWS = { in: 1, up: 1, forgot: 1, newpw: 1 };
  function openModal(view, presetNote) {
    // openModal is wired straight to click handlers in places, which would pass
    // the click Event in as `view` and fall through to the last branch — landing
    // the user on "choose a new password" from a Sign in button. Anything that
    // is not a known view name is treated as "no view given".
    if (typeof view !== 'string' || !VIEWS[view]) view = 'in';
    var existing = document.getElementById('authModal');
    if (existing) { existing.__setView(view); return; }
    lastTrigger = document.activeElement;

    var wrap = document.createElement('div');
    wrap.id = 'authModal';
    wrap.className = 'auth-modal';
    wrap.innerHTML =
      '<div class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="authTitle">' +
        '<aside class="auth-rail">' +
          '<span class="auth-rail-glyph" data-glyph="ankh"></span>' +
          '<p class="auth-rail-kicker">The House of Life</p>' +
          '<h2 class="auth-rail-h">Keep your rank, your streak and every challenge you have solved.</h2>' +
          '<p class="auth-rail-sub">123 auto-graded challenges on 61 tables of real, cited Egyptian data.</p>' +
          '<p class="auth-rail-safe"><span data-glyph="eye"></span> Your progress syncs privately. We never post anything, anywhere.</p>' +
        '</aside>' +
        '<div class="auth-panel">' +
          '<button type="button" class="auth-x" aria-label="Close">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
          '</button>' +
          '<div class="auth-body">' +
            '<h3 id="authTitle" class="auth-h"></h3>' +
            '<p class="auth-sub"></p>' +
            '<div class="auth-google" hidden></div>' +
            '<div class="auth-or" hidden><span>or</span></div>' +
            '<form class="auth-form" novalidate>' +
              '<input type="text" name="website" class="hp-field" tabindex="-1" autocomplete="off" aria-hidden="true">' +
              '<div class="fld fld-email">' +
                '<label for="authEmail">Email</label>' +
                '<input id="authEmail" type="email" name="email" autocomplete="email" spellcheck="false" aria-describedby="errEmail">' +
                '<p class="fld-err" id="errEmail"></p>' +
              '</div>' +
              '<div class="fld fld-pw">' +
                '<div class="fld-top"><label for="authPw">Password</label>' +
                  '<button type="button" class="auth-forgot">Forgot?</button></div>' +
                '<div class="pw-wrap">' +
                  '<input id="authPw" type="password" name="password" aria-describedby="errPw pwMeterNote">' +
                  '<button type="button" class="pw-toggle" aria-pressed="false">Show</button>' +
                '</div>' +
                '<div class="pw-meter" hidden><i></i><i></i><i></i></div>' +
                '<p class="pw-note" id="pwMeterNote"></p>' +
                '<p class="fld-err" id="errPw"></p>' +
              '</div>' +
              '<button type="submit" class="auth-submit">' +
                '<span class="lbl"></span><span class="spin" aria-hidden="true"></span>' +
              '</button>' +
            '</form>' +
            '<p class="auth-alt"></p>' +
            '<p class="auth-err" role="alert"></p>' +
            '<p class="auth-ok" role="status" aria-live="polite"></p>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
    if (window.EGYBI_PAINT_GLYPHS) EGYBI_PAINT_GLYPHS(wrap);

    var dialog = wrap.querySelector('.auth-dialog');
    var body   = wrap.querySelector('.auth-body');
    var form   = wrap.querySelector('.auth-form');
    var title  = wrap.querySelector('.auth-h');
    var sub    = wrap.querySelector('.auth-sub');
    var alt    = wrap.querySelector('.auth-alt');
    var errBox = wrap.querySelector('.auth-err');
    var okBox  = wrap.querySelector('.auth-ok');
    var submit = wrap.querySelector('.auth-submit');
    var lbl    = submit.querySelector('.lbl');
    var emailF = wrap.querySelector('#authEmail');
    var pwF    = wrap.querySelector('#authPw');
    var errEmail = wrap.querySelector('#errEmail');
    var errPw    = wrap.querySelector('#errPw');
    var meter  = wrap.querySelector('.pw-meter');
    var pwNote = wrap.querySelector('.pw-note');
    var gBox   = wrap.querySelector('.auth-google');
    var orBox  = wrap.querySelector('.auth-or');
    var pwField = wrap.querySelector('.fld-pw');
    var emailField = wrap.querySelector('.fld-email');
    var forgotBtn = wrap.querySelector('.auth-forgot');

    var mode = 'in';        // 'in' | 'up' | 'forgot' | 'newpw'
    var resetToken = null;
    var busy = false;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function clearMessages() {
      errBox.textContent = ''; okBox.textContent = '';
      errEmail.textContent = ''; errPw.textContent = '';
      emailF.removeAttribute('aria-invalid'); pwF.removeAttribute('aria-invalid');
    }
    function fail(msg) { okBox.textContent = ''; errBox.textContent = msg; }
    function succeed(msg) { errBox.textContent = ''; okBox.textContent = msg; }

    // ---- view switching: crossfade the panel, animate the shell height ------
    function setView(v) {
      if (v === mode && body.dataset.ready) return;
      var from = dialog.getBoundingClientRect().height;
      mode = v;
      clearMessages();
      var showEmail = true, showPw = (v !== 'forgot'), showGoogle = (v === 'in' || v === 'up');
      if (v === 'newpw') showEmail = false;

      if (v === 'in') {
        title.textContent = 'Welcome back';
        sub.textContent = 'Sign in to pick up your streak where you left it.';
        lbl.textContent = 'Sign in';
        pwF.autocomplete = 'current-password';
        alt.innerHTML = 'New here? <button type="button" data-go="up">Create an account</button>';
      } else if (v === 'up') {
        title.textContent = 'Create your account';
        sub.textContent = 'Free, and everything you have already solved comes with you.';
        lbl.textContent = 'Create account';
        pwF.autocomplete = 'new-password';
        alt.innerHTML = 'Already have one? <button type="button" data-go="in">Sign in</button>';
      } else if (v === 'forgot') {
        title.textContent = 'Reset your password';
        sub.textContent = 'We will email you a link to choose a new one.';
        lbl.textContent = 'Send reset link';
        alt.innerHTML = '<button type="button" data-go="in">Back to sign in</button>';
      } else {
        title.textContent = 'Choose a new password';
        sub.textContent = 'This signs you out everywhere else.';
        lbl.textContent = 'Update password';
        pwF.autocomplete = 'new-password';
        alt.innerHTML = '';
      }

      emailField.hidden = !showEmail;
      pwField.hidden = !showPw;
      forgotBtn.hidden = (v !== 'in');
      meter.hidden = true; pwNote.textContent = '';
      gBox.hidden = !(showGoogle && googleCfg.enabled);
      orBox.hidden = gBox.hidden;
      if (!gBox.hidden) mountGoogle();

      body.dataset.ready = '1';
      if (!reduce) {
        var to = dialog.getBoundingClientRect().height;
        if (from && to && Math.abs(to - from) > 2) {
          dialog.animate([{ height: from + 'px' }, { height: to + 'px' }],
                         { duration: 220, easing: 'cubic-bezier(.22,1,.36,1)' });
        }
        body.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
                     { duration: 200, easing: 'ease-out' });
      }
      var first = showEmail ? emailF : pwF;
      setTimeout(function () { try { first.focus(); } catch (e) {} }, reduce ? 0 : 60);
    }
    wrap.__setView = setView;

    alt.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-go]'); if (b) setView(b.dataset.go);
    });
    forgotBtn.addEventListener('click', function () { setView('forgot'); });

    // ---- Google -------------------------------------------------------------
    var gMounted = false;
    function mountGoogle() {
      if (gMounted || !googleCfg.enabled) return;
      gMounted = true;
      // A nonce ties this one browser attempt to one token, so a captured
      // credential cannot be replayed. Fetched before initialize, because GIS
      // bakes it into the signed token.
      fetch(BASE + 'google.php?action=nonce').then(function (r) { return r.json(); }).then(function (j) {
        if (!j || !j.ok || !j.nonce) throw 0;
        return loadGsi().then(function (ok) {
          if (!ok) throw 0;
          google.accounts.id.initialize({
            client_id: googleCfg.client_id,
            nonce: j.nonce,
            ux_mode: 'popup',
            callback: function (resp) { onGoogleCredential(resp, j.nonce); }
          });
          gBox.innerHTML = '';
          // Google's own renderButton is used deliberately: it is the only way
          // to be certain the mark, wording and spacing meet Google's branding
          // requirements, which a hand-built lookalike would drift from.
          google.accounts.id.renderButton(gBox, {
            theme: 'outline', size: 'large', text: 'continue_with',
            shape: 'rectangular', logo_alignment: 'center',
            width: Math.min(400, Math.max(200, Math.round(gBox.getBoundingClientRect().width || 320)))
          });
        });
      }).catch(function () {
        // Blocked, offline, or misconfigured: hide the whole affordance rather
        // than leave a button that cannot work.
        gMounted = false; gBox.hidden = true; orBox.hidden = true;
      });
    }

    function onGoogleCredential(resp, nonce) {
      if (!resp || !resp.credential) return;
      clearMessages(); setBusy(true);
      fetch(BASE + 'google.php?action=signin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: resp.credential, nonce: nonce })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (d && d.ok) {
          csrf = d.csrf; user = d.user; stats = d.stats || null;
          if (window.EGYBI_TRACK) EGYBI_TRACK('signup_completed');
          renderNav(); renderProfile(); syncProgress(); close();
        } else {
          fail((d && d.message) || 'Could not complete Google sign-in.');
        }
      }).catch(function () { fail('Could not reach the server.'); })
        .finally(function () { setBusy(false); });
    }

    // ---- validation on blur (not only on submit) ----------------------------
    emailF.addEventListener('blur', function () {
      var v = emailF.value.trim();
      if (emailField.hidden) return;
      if (v && !emailLooksValid(v)) {
        errEmail.textContent = 'That does not look like an email address.';
        emailF.setAttribute('aria-invalid', 'true');
      } else { errEmail.textContent = ''; emailF.removeAttribute('aria-invalid'); }
    });
    emailF.addEventListener('input', function () {
      if (errEmail.textContent && emailLooksValid(emailF.value.trim())) {
        errEmail.textContent = ''; emailF.removeAttribute('aria-invalid');
      }
    });
    pwF.addEventListener('blur', function () {
      if (pwField.hidden) return;
      var v = pwF.value;
      if (v && v.length < 8) {
        errPw.textContent = 'At least 8 characters.'; pwF.setAttribute('aria-invalid', 'true');
      } else { errPw.textContent = ''; pwF.removeAttribute('aria-invalid'); }
    });
    pwF.addEventListener('input', function () {
      if (errPw.textContent && pwF.value.length >= 8) {
        errPw.textContent = ''; pwF.removeAttribute('aria-invalid');
      }
      // The meter is for choosing a NEW password; showing it while signing in
      // would be judging a password the user cannot change here.
      if (mode !== 'up' && mode !== 'newpw') { meter.hidden = true; pwNote.textContent = ''; return; }
      var s = pwStrength(pwF.value);
      if (s.score < 0) { meter.hidden = true; pwNote.textContent = ''; return; }
      meter.hidden = false;
      meter.dataset.score = String(s.score);
      pwNote.textContent = s.label + ' — ' + s.hint;
    });

    wrap.querySelector('.pw-toggle').addEventListener('click', function () {
      var showing = pwF.type === 'text';
      pwF.type = showing ? 'password' : 'text';
      this.textContent = showing ? 'Show' : 'Hide';
      this.setAttribute('aria-pressed', showing ? 'false' : 'true');
      pwF.focus();
    });

    // ---- submit -------------------------------------------------------------
    function setBusy(on) {
      busy = on;
      submit.disabled = on;
      submit.classList.toggle('is-busy', on);
      submit.setAttribute('aria-busy', on ? 'true' : 'false');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;                       // hard stop on double submission
      if (form.website.value) { close(); return; }   // honeypot
      clearMessages();

      var email = emailF.value.trim(), pw = pwF.value;
      if (!emailField.hidden) {
        if (!email) { errEmail.textContent = 'Enter your email.'; emailF.setAttribute('aria-invalid', 'true'); emailF.focus(); return; }
        if (!emailLooksValid(email)) { errEmail.textContent = 'That does not look like an email address.'; emailF.setAttribute('aria-invalid', 'true'); emailF.focus(); return; }
      }
      if (!pwField.hidden) {
        if (pw.length < 8) { errPw.textContent = 'At least 8 characters.'; pwF.setAttribute('aria-invalid', 'true'); pwF.focus(); return; }
      }

      setBusy(true);
      var done = function () { setBusy(false); };

      if (mode === 'forgot') {
        api('request-reset', 'POST', { email: email }).then(function (res) {
          succeed((res.data && res.data.message) || 'If that email has an account, a reset link is on its way.');
        }).catch(function () { fail('Could not reach the server.'); }).finally(done);
        return;
      }
      if (mode === 'newpw') {
        api('reset', 'POST', { token: resetToken, password: pw }).then(function (res) {
          var d = res.data || {};
          if (d.ok) { succeed(d.message || 'Password updated.'); setTimeout(function () { setView('in'); }, 1100); }
          else fail(d.message || 'That link has expired.');
        }).catch(function () { fail('Could not reach the server.'); }).finally(done);
        return;
      }

      api(mode === 'in' ? 'login' : 'signup', 'POST', { email: email, password: pw }).then(function (res) {
        var d = res.data || {};
        if (mode === 'up') {
          if (d.ok && window.EGYBI_TRACK) EGYBI_TRACK('signup_completed');
          if (d.ok) succeed(d.message || 'Check your email to verify your account.');
          else fail(d.message || 'Could not create that account.');
        } else if (d.ok) {
          csrf = d.csrf; user = d.user; renderNav(); syncProgress(); close();
        } else {
          fail(d.message || 'Could not sign in.');
        }
      }).catch(function () {
        fail('The account service is not connected on this preview.');
      }).finally(done);
    });

    // ---- focus trap, escape, backdrop --------------------------------------
    var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
    function visibleFocusable() {
      return Array.prototype.filter.call(dialog.querySelectorAll(FOCUSABLE), function (el) {
        return el.offsetParent !== null && !el.closest('[hidden]');
      });
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = visibleFocusable();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      // Focus can sit inside Google's iframe button; treat that as "not ours"
      // and pull it back to a known end of the list.
      if (e.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
    document.addEventListener('keydown', onKey, true);
    wrap.addEventListener('mousedown', function (e) { if (e.target === wrap) close(); });
    wrap.querySelector('.auth-x').addEventListener('click', close);

    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';    // no scrolling the page behind

    function close() {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      wrap.remove();
      if (lastTrigger && document.contains(lastTrigger)) { try { lastTrigger.focus(); } catch (e) {} }
      lastTrigger = null;
    }
    wrap.__close = close;
    wrap.__setResetToken = function (t) { resetToken = t; setView('newpw'); };

    if (!reduce) {
      wrap.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
      dialog.animate([{ opacity: 0, transform: 'translateY(10px) scale(.985)' }, { opacity: 1, transform: 'none' }],
                     { duration: 240, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
    setView(view || 'in');
    if (presetNote) succeed(presetNote);
  }

  /** The ?reset=TOKEN landing reuses the same shell — one dialog, four views. */
  function openResetModal(token) {
    openModal('in');
    var m = document.getElementById('authModal');
    if (m && m.__setResetToken) m.__setResetToken(token);
  }

  // ---- styles (injected with the component, built from the design tokens) ---
  var css = document.createElement('style');
  css.textContent =
    '.acct-slot{display:inline-flex;align-items:center;position:relative}' +
    '.acct-btn.signin{background:none;border:1px solid rgba(255,255,255,.4);color:var(--on-dark);font:inherit;font-size:.9rem;font-weight:600;padding:6px 14px;border-radius:8px;cursor:pointer;transition:all .15s}' +
    '.acct-btn.signin:hover{border-color:var(--gold-bright);color:var(--gold-bright)}' +
    '.acct-btn.signin:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}' +
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
    '.hp-field{position:absolute!important;left:-9999px!important;width:1px;height:1px;opacity:0}' +

    /* ---- the dialog ---- */
    '.auth-modal{position:fixed;inset:0;background:rgba(15,12,8,.68);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px;overflow-y:auto}' +
    // min-width:0 matters: as a flex item the dialog defaults to min-width:auto,
    // which refuses to shrink below its content's min-content width and pushed
    // it to 403px inside a 360px phone, clipping BOTH edges. The grid columns
    // use minmax(0,…) for the same reason one level down.
    '.auth-dialog{display:grid;grid-template-columns:248px minmax(0,1fr);width:100%;max-width:720px;min-width:0;background:var(--papyrus-2);border-radius:18px;overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,.5);border:1px solid var(--line-light);margin:auto}' +
    '.auth-panel,.auth-rail{min-width:0}' +
    '.fld input,.auth-submit{max-width:100%;box-sizing:border-box}' +
    /* rail: gold + glyphs on the dark surface they were drawn for */
    '.auth-rail{background:linear-gradient(165deg,var(--kemet-2),var(--kemet));padding:30px 26px;display:flex;flex-direction:column;gap:12px;border-right:1px solid var(--line-dark)}' +
    '.auth-rail-glyph{font-size:2.1rem;color:var(--gold-bright);line-height:1}' +
    '.auth-rail-kicker{color:var(--gold-bright);font-size:.68rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;margin:2px 0 0}' +
    '.auth-rail-h{font-family:Cinzel,serif;color:var(--on-dark);font-size:1.16rem;line-height:1.32;margin:0;font-weight:600}' +
    '.auth-rail-sub{color:var(--on-dark-soft);font-size:.84rem;line-height:1.55;margin:0}' +
    '.auth-rail-safe{margin:auto 0 0;color:var(--on-dark-soft);font-size:.74rem;line-height:1.5;display:flex;gap:8px;align-items:flex-start}' +
    '.auth-rail-safe .glyph{color:var(--gold-bright);flex:0 0 auto}' +
    /* panel */
    '.auth-panel{position:relative;padding:30px 30px 26px}' +
    '.auth-x{position:absolute;top:14px;right:14px;background:none;border:none;color:var(--ink-soft);cursor:pointer;padding:6px;border-radius:8px;display:flex;line-height:0}' +
    '.auth-x:hover{color:var(--ink);background:var(--blue-soft)}' +
    '.auth-x:focus-visible{outline:2px solid var(--gold);outline-offset:1px}' +
    '.auth-h{font-family:Cinzel,serif;color:var(--blue-deep);font-size:1.36rem;margin:0 0 5px;line-height:1.2}' +
    '.auth-sub{color:var(--ink-soft);font-size:.86rem;line-height:1.5;margin:0 0 18px}' +
    '.auth-google{margin-bottom:14px;min-height:44px;display:flex;justify-content:center}' +
    '.auth-or{display:flex;align-items:center;gap:12px;margin:0 0 16px;color:var(--ink-soft);font-size:.74rem;text-transform:uppercase;letter-spacing:.1em}' +
    '.auth-or::before,.auth-or::after{content:"";flex:1;height:1px;background:var(--line-light)}' +
    '.fld{margin-bottom:14px}' +
    '.fld[hidden]{display:none}' +
    '.fld label{display:block;font-size:.78rem;font-weight:700;color:var(--blue-deep);margin-bottom:6px;letter-spacing:.01em}' +
    '.fld-top{display:flex;align-items:baseline;justify-content:space-between;gap:10px}' +
    '.fld input{display:block;width:100%;padding:11px 13px;border:1px solid var(--line-light);border-radius:10px;background:#fff;color:var(--ink);font-family:inherit;font-size:.95rem;transition:border-color .15s,box-shadow .15s}' +
    '.fld input:hover{border-color:rgba(23,64,139,.28)}' +
    '.fld input:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 3px var(--blue-soft)}' +
    '.fld input:focus-visible{outline:2px solid var(--gold);outline-offset:1px}' +
    '.fld input[aria-invalid="true"]{border-color:var(--danger);box-shadow:0 0 0 3px rgba(183,65,14,.12)}' +
    '.fld-err{color:var(--danger);font-size:.78rem;margin:6px 0 0;min-height:0}' +
    '.fld-err:empty{display:none}' +
    '.pw-wrap{position:relative;display:flex;align-items:center}' +
    '.pw-wrap input{padding-right:64px}' +
    '.pw-toggle{position:absolute;right:6px;background:none;border:none;color:var(--gold-ink);font:inherit;font-size:.76rem;font-weight:700;cursor:pointer;padding:6px 8px;border-radius:7px}' +
    '.pw-toggle:hover{background:var(--gold-soft)}' +
    '.pw-toggle:focus-visible{outline:2px solid var(--gold);outline-offset:1px}' +
    '.auth-forgot{background:none;border:none;color:var(--gold-ink);font:inherit;font-size:.76rem;font-weight:700;cursor:pointer;padding:0}' +
    '.auth-forgot:hover{text-decoration:underline}' +
    '.auth-forgot:focus-visible{outline:2px solid var(--gold);outline-offset:2px;border-radius:4px}' +
    '.auth-forgot[hidden]{display:none}' +
    '.pw-meter{display:flex;gap:5px;margin-top:9px}' +
    '.pw-meter[hidden]{display:none}' +
    '.pw-meter i{flex:1;height:4px;border-radius:999px;background:var(--line-light);transition:background .2s}' +
    '.pw-meter[data-score="1"] i:nth-child(1){background:var(--danger)}' +
    '.pw-meter[data-score="2"] i:nth-child(-n+2){background:var(--gold)}' +
    '.pw-meter[data-score="3"] i{background:var(--success)}' +
    '.pw-note{font-size:.75rem;color:var(--ink-soft);margin:7px 0 0;line-height:1.45}' +
    '.pw-note:empty{display:none}' +
    /* submit with a real loading state */
    '.auth-submit{width:100%;margin-top:4px;position:relative;background:var(--blue);color:#fff;border:1px solid var(--blue);font:inherit;font-weight:700;font-size:.95rem;padding:12px 16px;border-radius:10px;cursor:pointer;transition:background .15s,transform .1s}' +
    '.auth-submit:hover:not(:disabled){background:var(--blue-deep)}' +
    '.auth-submit:active:not(:disabled){transform:translateY(1px)}' +
    '.auth-submit:focus-visible{outline:2px solid var(--gold);outline-offset:2px}' +
    '.auth-submit:disabled{opacity:.72;cursor:not-allowed}' +
    '.auth-submit .spin{display:none;width:15px;height:15px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;margin-left:9px;vertical-align:-2px;animation:auth-spin .6s linear infinite}' +
    '.auth-submit.is-busy .spin{display:inline-block}' +
    '@keyframes auth-spin{to{transform:rotate(360deg)}}' +
    '.auth-alt{font-size:.84rem;color:var(--ink-soft);margin:14px 0 0;text-align:center}' +
    '.auth-alt button{background:none;border:none;color:var(--blue);font:inherit;font-weight:700;cursor:pointer;padding:0}' +
    '.auth-alt button:hover{text-decoration:underline}' +
    '.auth-alt button:focus-visible{outline:2px solid var(--gold);outline-offset:2px;border-radius:4px}' +
    '.auth-err,.auth-ok{font-size:.84rem;margin:12px 0 0;line-height:1.5;padding:9px 12px;border-radius:9px}' +
    '.auth-err:empty,.auth-ok:empty{display:none}' +
    '.auth-err{color:var(--danger);background:rgba(183,65,14,.08);border:1px solid rgba(183,65,14,.22)}' +
    '.auth-ok{color:var(--success);background:rgba(31,122,92,.08);border:1px solid rgba(31,122,92,.22)}' +
    /* the rail becomes a header strip before the columns get cramped */
    '@media (max-width:720px){' +
      '.auth-dialog{grid-template-columns:minmax(0,1fr);max-width:420px}' +
      '.auth-rail{padding:20px 22px 18px;border-right:none;border-bottom:1px solid var(--line-dark);gap:8px}' +
      '.auth-rail-glyph{font-size:1.7rem}' +
      '.auth-rail-h{font-size:1.02rem}' +
      '.auth-rail-sub{display:none}' +
      '.auth-rail-safe{margin-top:4px}' +
      '.auth-panel{padding:22px 20px 20px}' +
    '}' +
    '@media (max-width:380px){.auth-panel{padding:18px 15px 16px}.auth-rail{padding:16px 15px 14px}.auth-h{font-size:1.18rem}}' +
    '@media (prefers-reduced-motion:reduce){.auth-submit .spin{animation-duration:1.4s}.auth-submit:active{transform:none}}';
  document.head.appendChild(css);

  // ---- boot: session first, then the ?verify= / ?reset= landings ------------
  // Order matters: `me` carries the Google config, and openModal() reads it when
  // deciding whether to render the Google button. Handling the landings only
  // after `me` resolves means the button is never missing on a first paint.
  function boot() {
    var qsReset  = location.search.match(/[?&]reset=([a-f0-9]+)/i);
    var qsVerify = location.search.match(/[?&]verify=([a-f0-9]+)/i);
    function cleanUrl() { try { history.replaceState(null, '', location.pathname); } catch (e) {} }

    function landings() {
      if (qsReset) { cleanUrl(); setTimeout(function () { openResetModal(qsReset[1]); }, 80); return; }
      if (qsVerify) {
        fetch(BASE + 'auth.php?action=verify&token=' + qsVerify[1])
          .then(function (r) { return r.json(); })
          .then(function (j) {
            cleanUrl();
            setTimeout(function () {
              openModal('in', j && j.ok ? (j.message || 'Email verified — you can sign in now.') : null);
              if (j && !j.ok) {
                var e = document.querySelector('#authModal .auth-err');
                if (e) e.textContent = j.message || 'That link has expired or was already used.';
              }
            }, 60);
          }).catch(function () {});
      }
    }

    api('me', 'GET').then(function (res) {
      var d = res.data || {};
      if (d.google) googleCfg = { enabled: !!d.google.enabled, client_id: d.google.client_id || '' };
      if (d.ok && d.user) { user = d.user; csrf = d.csrf; stats = d.stats || null; renderNav(); renderProfile(); syncProgress(); }
      else renderNav();
      landings();
    }).catch(function () { renderNav(); landings(); }); // offline/static preview: just show Sign in
  }
  if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
  window.EGYBI_ACCOUNT = { syncProgress: syncProgress, get user() { return user; }, open: openModal };
})();
