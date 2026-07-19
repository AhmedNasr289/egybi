/* EgyBI — motion layer.
   Tasteful, on-brand, 60fps micro-interactions on top of the static site. Uses
   Motion One (motion.dev, the vanilla-JS animation library from the Framer team)
   when present, and falls back to IntersectionObserver + CSS when it isn't — so
   the page is never broken by a CDN miss. Everything honours prefers-reduced-
   motion: with motion reduced, elements simply appear (no movement), and the
   pointer/scroll effects switch off. Only transform/opacity are animated, so
   there is no layout shift and no reflow cost.

   Opt-in hooks (add these attributes in the HTML):
     [data-mo]            reveal on scroll (fade + gentle rise)
     [data-mo-stagger]    a container whose direct children reveal in sequence
     [data-parallax]      drifts slightly slower than the scroll
     [data-magnetic]      leans toward the cursor on hover (buttons)
   AOS-driven [data-aos] reveals are left untouched; this only adds. */
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

  // ---- 4. Magnetic buttons [data-magnetic] ---------------------------------
  (function magnetic() {
    if (window.matchMedia && !window.matchMedia('(pointer:fine)').matches) return; // touch: skip
    document.querySelectorAll('.btn-primary, .nav-links a.cta, [data-magnetic]').forEach(function (el) {
      var strength = 0.28;
      el.style.willChange = 'transform';
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - (r.left + r.width / 2)) * strength;
        var y = (e.clientY - (r.top + r.height / 2)) * strength;
        el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = 'translate(0,0)'; });
    });
  })();

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
