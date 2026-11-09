/* EgyBI — shared site behavior (loaded on every page).
   Handles: mobile nav toggle, active-link highlighting, AOS init, hero particles.
   Page-specific widgets live inline per page: CountUp on the home, About and
   Explore pages, Chart on Explore, Prices and the home page. The SQL engine is
   no longer among them — it loads on demand from query.js where a table is
   marked queryable, and from a script tag on the case study. */
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Merge, never replace. This was a bare assignment, so any module that had
  // already registered on window.EGYBI was silently wiped the moment this file
  // loaded — mapkit.js registered, this ran a tag later, and four maps failed
  // with "Cannot read properties of undefined (reading 'create')". The
  // namespace belongs to whoever gets there first.
  window.EGYBI = window.EGYBI || {};
  window.EGYBI.reduceMotion = reduceMotion;

  // ---- mobile nav toggle ----
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', links.classList.contains('open'));
    });
  }

  // ---- active nav link (by filename) ----
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (here === '') here = 'index.html';
  document.querySelectorAll('.nav-links a[href]').forEach(function (a) {
    var target = a.getAttribute('href').split('/').pop().toLowerCase();
    if (target === here) a.classList.add('active');
  });

  // ---- AOS scroll animations ----
  if (window.AOS) {
    AOS.init({ duration: 650, easing: 'ease-out-cubic', once: true, offset: 60, disable: reduceMotion });
  }

  // ---- hero particles (subtle sepia dust on the papyrus hero) ----
  var pEl = document.getElementById('hero-particles');
  if (pEl && window.tsParticles && !reduceMotion) {
    tsParticles.load('hero-particles', {
      fpsLimit: 60, detectRetina: true,
      particles: {
        number: { value: 46, density: { enable: true, area: 900 } },
        color: { value: ['#8a6d14', '#C9A227', '#5c450a'] },   // sepia dust on the papyrus leaf
        opacity: { value: { min: 0.15, max: 0.6 } },
        size: { value: { min: 1, max: 2.6 } },
        move: { enable: true, speed: 0.5, direction: 'top', outModes: { default: 'out' } },
        links: { enable: false }
      },
      interactivity: { events: { onHover: { enable: true, mode: 'bubble' } }, modes: { bubble: { distance: 120, size: 3.5, duration: 1.5 } } }
    });
  }

  // ---- account entry point --------------------------------------------------
  // Accounts are optional: everything works without one, and a trip is sent
  // to the server only when a signed-in reader presses Save. So the account
  // code (auth.js, ~25 KB) is NOT loaded for an anonymous reader. This puts a
  // "Sign in" button in the header and loads auth.js only when:
  //   - the button is pressed (then the dialog opens);
  //   - this browser signed in before (a flag, not the session itself, which
  //     is an HttpOnly cookie script cannot read), to show the account menu;
  //   - the URL carries ?verify= or ?reset= from an account email.
  // Paths resolve against this script's own address (it always sits in
  // assets/), so pages in folders reach the same files.
  var acctBase = (document.currentScript && document.currentScript.src) || location.href;
  var authPromise = null;
  function loadAuth() {
    if (authPromise) return authPromise;
    authPromise = new Promise(function (resolve, reject) {
      if (window.EGYBI_ACCOUNT) { resolve(window.EGYBI_ACCOUNT); return; }
      var s = document.createElement('script');
      s.src = new URL('auth.js?v=3', acctBase).href;
      s.onload = function () {
        if (window.EGYBI_ACCOUNT) window.EGYBI_ACCOUNT.ready.then(function () { resolve(window.EGYBI_ACCOUNT); });
        else reject(new Error('auth.js loaded but did not start'));
      };
      s.onerror = function () { authPromise = null; reject(new Error('auth.js did not load')); };
      document.head.appendChild(s);
    });
    return authPromise;
  }
  function signedInBefore() { try { return localStorage.getItem('egybi.account') === '1'; } catch (e) { return false; } }
  window.EGYBI.account = {
    load: loadAuth,
    open: function (view, note) { return loadAuth().then(function (a) { a.open(view || 'in', note); return a; }); },
    url: function (page) { return new URL('../' + page, acctBase).href; }
  };
  var actions = document.querySelector('.nav-actions');
  if (actions && !document.getElementById('acct-slot')) {
    var slot = document.createElement('span');
    slot.id = 'acct-slot'; slot.className = 'acct-slot';
    slot.innerHTML = '<button type="button" class="acct-btn signin" id="signinBtn">Sign in</button>';
    actions.appendChild(slot);
    var signinBtn = document.getElementById('signinBtn');
    signinBtn.addEventListener('click', function () {
      signinBtn.setAttribute('aria-busy', 'true');
      window.EGYBI.account.open('in').then(function () {
        signinBtn.removeAttribute('aria-busy');
      }).catch(function () {
        // Say it in the button itself rather than a browser alert box.
        signinBtn.removeAttribute('aria-busy');
        signinBtn.textContent = 'Offline, try again';
        setTimeout(function () { signinBtn.textContent = 'Sign in'; }, 4000);
      });
    });
  }
  if (signedInBefore() || /[?&](verify|reset)=/.test(location.search)) loadAuth().catch(function () {});

  // ---- shared helper ----
  window.EGYBI.escapeHtml = function (str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  };
})();
