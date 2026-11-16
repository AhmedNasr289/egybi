/* EgyBI — motion layer.
   Tasteful, on-brand micro-interactions on top of the static site. Reveals
   use the browser's IntersectionObserver plus CSS transitions; the Motion One
   library it once used first is no longer loaded (study S4, 2026-11-16), and
   the window.Motion path below stays only as a harmless option. Everything
   honours prefers-reduced-motion: with motion reduced, elements simply appear
   and the scroll effects switch off. Only transform/opacity are animated, so
   there is no layout shift and no reflow cost.

   Opt-in hooks (add these attributes in the HTML):
     [data-mo]            reveal on scroll (fade + gentle rise)
     [data-mo-stagger]    a container whose direct children reveal in sequence
     [data-parallax]      drifts slightly slower than the scroll
     [data-aos]           the site-wide section reveal (study S4: AOS retired) */
(function () {
  var M = window.Motion || null;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 1. Gold scroll-progress bar (cheap, global, a little magic) ---------
  (function progressBar() {
    var bar = document.createElement('div');
    bar.setAttribute('aria-hidden', 'true');
    bar.style.cssText = 'position:fixed;top:0;left:0;height:3px;width:100%;transform:scaleX(0);transform-origin:0 50%;' +
      'background:linear-gradient(90deg,#C9A227,#E7C64C);z-index:9999;pointer-events:none;will-change:transform;';
    document.body.appendChild(bar);
    function set() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(1, window.scrollY / h) : 0;
      bar.style.transform = 'scaleX(' + p + ')';
    }
    set();
    window.addEventListener('scroll', set, { passive: true });
    window.addEventListener('resize', set, { passive: true });
  })();

  // ---- 2. Reveal-on-scroll for [data-mo] and [data-mo-stagger] -------------
  function collectTargets() {
    var single = Array.prototype.slice.call(document.querySelectorAll('[data-mo]'));
    var groups = Array.prototype.slice.call(document.querySelectorAll('[data-mo-stagger]'));
    return { single: single, groups: groups };
  }

  function revealNow(el) { el.style.opacity = '1'; el.style.transform = 'none'; }

  function prime(el) {
    // starting state — kept off unless we will actually animate
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px)';
    el.style.willChange = 'opacity, transform';
  }

  (function reveals() {
    var t = collectTargets();
    if (reduce) { // reduced motion: show everything, no movement
      t.single.forEach(revealNow);
      t.groups.forEach(function (g) { Array.prototype.forEach.call(g.children, revealNow); });
      return;
    }
    t.single.forEach(prime);
    t.groups.forEach(function (g) { Array.prototype.forEach.call(g.children, prime); });

    // Pure CSS transition — persists its end state reliably. Triggered with a
    // timer (robust even where rAF is throttled) plus a safety net so content
    // is never left hidden.
    function play(el, delay) {
      el.style.transition = 'opacity .7s cubic-bezier(.22,1,.36,1) ' + (delay || 0) + 's, transform .7s cubic-bezier(.22,1,.36,1) ' + (delay || 0) + 's';
      setTimeout(function () { revealNow(el); }, 30);
      // safety: snap visible (no transition) so content is never left hidden
      setTimeout(function () { el.style.transition = 'none'; revealNow(el); }, 1500 + (delay || 0) * 1000);
    }

    if (M && M.inView) {
      t.single.forEach(function (el) { M.inView(el, function () { play(el); }, { margin: '0px 0px -12% 0px' }); });
      t.groups.forEach(function (g) {
        M.inView(g, function () {
          Array.prototype.forEach.call(g.children, function (c, i) { play(c, i * 0.08); });
        }, { margin: '0px 0px -12% 0px' });
      });
    } else if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          if (el.hasAttribute('data-mo-stagger')) {
            Array.prototype.forEach.call(el.children, function (c, i) { play(c, i * 0.08); });
          } else { play(el); }
          io.unobserve(el);
        });
      }, { threshold: 0.12 });
      t.single.forEach(function (el) { io.observe(el); });
      t.groups.forEach(function (el) { io.observe(el); });
    } else {
      t.single.forEach(revealNow);
      t.groups.forEach(function (g) { Array.prototype.forEach.call(g.children, revealNow); });
    }
  })();

  // ---- 2b. The one reveal system for [data-aos] (study S4 part 2) -----------
  //   egybi.css hides a [data-aos] block only while <html> has .js and the
  //   block lacks .is-in. This adds .is-in as each block enters the view, and
  //   sets html.mo-ready so the page head's 4 s fallback knows it started.
  //   Blocks a renderer adds later (the blog's cards) are watched too.
  (function aosReveal() {
    var root = document.documentElement;
    function show(el) { el.classList.add('is-in'); }
    var io = null;
    if (!reduce && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var d = parseInt(e.target.getAttribute('data-aos-delay'), 10) || 0;
          if (d) e.target.style.transitionDelay = Math.min(d, 300) + 'ms';
          show(e.target);
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    }
    function take(el) { if (io) io.observe(el); else show(el); }
    Array.prototype.forEach.call(document.querySelectorAll('[data-aos]'), take);
    if ('MutationObserver' in window) {
      new MutationObserver(function (ms) {
        ms.forEach(function (m) {
          Array.prototype.forEach.call(m.addedNodes, function (n) {
            if (n.nodeType !== 1) return;
            if (n.hasAttribute('data-aos')) take(n);
            Array.prototype.forEach.call(n.querySelectorAll('[data-aos]'), take);
          });
        });
      }).observe(document.body, { childList: true, subtree: true });
    }
    root.classList.add('mo-ready');
  })();
  if (reduce) return; // everything below is pure motion — skip it entirely

  // ---- 3. Parallax drift for [data-parallax] -------------------------------
  (function parallax() {
    var els = document.querySelectorAll('[data-parallax]');
    if (!els.length) return;
    function frame() {
      var vh = window.innerHeight;
      els.forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-parallax')) || 0.15;
        var r = el.getBoundingClientRect();
        var mid = r.top + r.height / 2 - vh / 2;
        el.style.transform = 'translateY(' + (mid * -speed).toFixed(1) + 'px)';
      });
    }
    frame();
    window.addEventListener('scroll', function () { requestAnimationFrame(frame); }, { passive: true });
    window.addEventListener('resize', frame, { passive: true });
  })();

  // ---- 4. (retired 2026-11-16, study S4) Magnetic buttons. They leaned every
  //         primary button toward the cursor, so the target moved while a reader
  //         aimed at it. Decoration that costs precision does not stay.

  // ---- 5. Hero flourish: a soft one-time staggered entrance for [data-mo-hero] kids.
  //         Pure CSS transition so the end state always persists.
  (function hero() {
    var host = document.querySelector('[data-mo-hero]');
    if (!host) return;
    var kids = Array.prototype.slice.call(host.children);
    kids.forEach(function (k) { k.style.opacity = '0'; k.style.transform = 'translateY(22px)'; k.style.willChange = 'opacity, transform'; });
    function reveal() {
      kids.forEach(function (k, i) {
        var d = 0.08 + i * 0.12;
        k.style.transition = 'opacity .8s cubic-bezier(.22,1,.36,1) ' + d + 's, transform .8s cubic-bezier(.22,1,.36,1) ' + d + 's';
        k.style.opacity = '1'; k.style.transform = 'none';
      });
    }
    setTimeout(reveal, 40);
    // safety net: snap visible (no transition) so the hero is never left hidden
    setTimeout(function () { kids.forEach(function (k) { k.style.transition = 'none'; k.style.opacity = '1'; k.style.transform = 'none'; }); }, 1800);
  })();
})();
