/* EgyBI — account UI (client), for the trip companion (reworked 2026-11-09).
   Renders the header account control and the sign-in / create-account /
   reset dialog, and gives the planner and account.html one small API.
   Accounts are OPTIONAL: anonymous readers never load this file (egybi.js
   loads it on demand), and nothing about a trip leaves the browser unless a
   signed-in reader presses Save. Degrades gracefully when the server is not
   reachable (a static preview): the dialog says so.

   Paths resolve against THIS file's address (always assets/), not the page:
   a page in visit/ or papyrus/ resolving the old relative 'auth/' would call
   visit/auth/auth.php, a 404 - the same fault the analytics beacon had. */
(function () {
  var CFG = window.EGYBI_AUTH || {};
  var ME = (document.currentScript && document.currentScript.src) || location.href;
  var BASE = CFG.base || new URL('../auth/', ME).href;
  var esc = (window.EGYBI && EGYBI.escapeHtml) ? EGYBI.escapeHtml : function (s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; };
  var csrf = null, user = null;
  var readyResolve;
  var ready = new Promise(function (r) { readyResolve = r; });

  // ---- tiny API helper -----------------------------------------------------
  function api(action, method, data) {
    var url = BASE + 'auth.php?action=' + encodeURIComponent(action);
    var opts = { method: method || 'GET', headers: {}, credentials: 'same-origin' };
    if (data) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(data); }
    if (csrf && method === 'POST') opts.headers['X-CSRF'] = csrf;
    return fetch(url, opts).then(function (r) { return r.json().then(function (j) { return { status: r.status, data: j }; }); });
  }

  // A flag, not the session: the session is an HttpOnly cookie that script
  // cannot read. egybi.js reads this flag to decide whether to load this file
  // on the next page, so a signed-in reader sees their menu straight away.
  function setFlag(on) { try { if (on) localStorage.setItem('egybi.account', '1'); else localStorage.removeItem('egybi.account'); } catch (e) {} }
  function accountUrl() { return new URL('../account.html', ME).href; }

  // One place for "a sign-in just succeeded", whatever the route (password or
  // Google), so the planner can finish a save it was waiting on.
  function signedIn(d) {
    csrf = d.csrf; user = d.user; setFlag(true); renderNav();
    window.dispatchEvent(new CustomEvent('egybi:account', { detail: { user: user } }));
  }

  // ---- nav account control -------------------------------------------------
  function renderNav() {
    // egybi.js already put a "Sign in" button in this slot; replace it.
    var nav = document.querySelector('.nav-actions') || document.querySelector('.nav-links'); if (!nav) return;
    var slot = document.getElementById('acct-slot');
    if (!slot) { slot = document.createElement('span'); slot.id = 'acct-slot'; slot.className = 'acct-slot'; nav.appendChild(slot); }
    if (user) {
      var initial = (user.email || '?').charAt(0).toUpperCase();
      slot.innerHTML = '<button type="button" class="acct-btn" id="acctBtn" aria-haspopup="true" aria-expanded="false" aria-controls="acctMenu" aria-label="Your account">' +
        '<span class="acct-av" aria-hidden="true">' + esc(initial) + '</span></button>' +
        '<div class="acct-menu" id="acctMenu" hidden>' +
        '<div class="acct-email">' + esc(user.email) + '</div>' +
        '<a href="' + esc(accountUrl()) + '">Your trips and account</a>' +
        '<button type="button" id="acctOut">Sign out</button></div>';
      var btn = document.getElementById('acctBtn'), menu = document.getElementById('acctMenu');
      btn.addEventListener('click', function () {
        var open = menu.hasAttribute('hidden');
        if (open) { menu.removeAttribute('hidden'); } else { menu.setAttribute('hidden', ''); }
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !menu.hasAttribute('hidden')) { menu.setAttribute('hidden', ''); btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
      });
      document.getElementById('acctOut').addEventListener('click', function () {
        api('logout', 'POST').then(function () {
          user = null; csrf = null; setFlag(false); renderNav();
          window.dispatchEvent(new CustomEvent('egybi:account', { detail: { user: null } }));
        });
      });
    } else {
      slot.innerHTML = '<button type="button" class="acct-btn signin" id="signinBtn">Sign in</button>';
      document.getElementById('signinBtn').addEventListener('click', function () { openModal('in'); });
    }
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
          '<p class="auth-rail-kicker">Free and optional</p>' +
          '<h2 class="auth-rail-h">Keep your trips on every device.</h2>' +
          '<p class="auth-rail-sub">Everything on EgyBI works without an account. Sign in only to save a trip and come back to it.</p>' +
          '<p class="auth-rail-safe"><span data-glyph="eye"></span> We keep your email and the trips you save. Delete it all from your account page at any time.</p>' +
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
        sub.textContent = 'Sign in to open your saved trips.';
        lbl.textContent = 'Sign in';
        pwF.autocomplete = 'current-password';
        alt.innerHTML = 'New here? <button type="button" data-go="up">Create an account</button>';
      } else if (v === 'up') {
        title.textContent = 'Create your account';
        sub.textContent = 'Free. You can delete it, and everything in it, at any time.';
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
            // Follow the document's language. Left to itself GIS picks a locale
            // from the connection, which rendered an Arabic button inside an
            // otherwise entirely English dialog — the mixed script reads as a
            // glitch rather than a courtesy. Reading lang off <html> means this
            // stays right by itself if the site is ever made bilingual.
            locale: (document.documentElement.getAttribute('lang') || 'en').split('-')[0],
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
          if (window.EGYBI_TRACK) EGYBI_TRACK('signup_completed');
          signedIn(d); close();
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
          signedIn(d); close();
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

    // Lock the page behind — but only the VERTICAL axis. Setting `overflow`
    // wholesale also overwrote the `overflow-x: clip` that egybi.css puts on
    // body, which turned body back into a horizontal scroll container sized to
    // its content (435px at a 360px viewport, thanks to the glyph tooltips).
    // A position:fixed child then sized itself to that container instead of the
    // viewport, so the dialog rendered 403px wide on a phone with both edges
    // clipped. Touching only overflow-y leaves the clip intact.
    var prevOverflowY = document.body.style.overflowY;
    document.body.style.overflowY = 'hidden';

    function close() {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflowY = prevOverflowY;
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

  // The dialog, the account menu and the profile strip are styled in
  // assets/egybi.css (see "accounts & the auth dialog", at the end of the
  // file). They used to be injected from here as a JS string, which kept the
  // component self-contained but hid a whole design surface from the design
  // system. Cache-bust egybi.css when you change them.

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
      if (d.ok && d.user) { user = d.user; csrf = d.csrf; setFlag(true); }
      else setFlag(false);
      renderNav();
      landings();
      readyResolve();
    }).catch(function () { renderNav(); landings(); readyResolve(); }); // offline/static preview: just show Sign in
  }
  if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
  window.EGYBI_ACCOUNT = {
    ready: ready,
    open: openModal,
    api: api,
    get user() { return user; }
  };
})();
