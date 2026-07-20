/* wayfinding.js — site-wide orientation aids.
 *
 * 1. Measures the sticky header (and the on-this-page bar, if present) and
 *    publishes their heights as CSS vars --header-h / --subnav-h, so the global
 *    `section[id] { scroll-margin-top: ... }` rule in egybi.css lands every
 *    #-anchor below both bars instead of behind them.
 * 2. Builds a sticky "On this page" sub-nav from the page's own sections: any
 *    page that includes <nav class="on-this-page" data-wayfinding> gets one chip
 *    per `section[id][data-nav]`, labelled by the section's data-nav attribute.
 * 3. Runs a scroll-spy that highlights the chip for the section you're reading.
 *
 * Reduced-motion safe (nothing here animates), idempotent, and deliberately
 * blind to the glyph/AOS/motion hooks — it only reads geometry and toggles a
 * `.current` class, so it never disturbs [data-glyph], [data-aos] or [data-mo*].
 */
(function () {
  'use strict';
  var root = document.documentElement;

  function px(name, fallback) {
    var v = parseInt(getComputedStyle(root).getPropertyValue(name), 10);
    return isNaN(v) ? fallback : v;
  }

  function setHeaderH() {
    var h = document.querySelector('.site-header');
    if (h) root.style.setProperty('--header-h', h.offsetHeight + 'px');
  }

  function setSubnavH(mount) {
    root.style.setProperty('--subnav-h', (mount ? mount.offsetHeight : 0) + 'px');
  }

  // scroll offset below which a section counts as "the one being read"
  function line() { return px('--header-h', 56) + px('--subnav-h', 0) + 12; }

  function build() {
    var mount = document.querySelector('nav.on-this-page[data-wayfinding]');
    if (!mount || mount.dataset.built) return null;
    var secs = Array.prototype.slice.call(document.querySelectorAll('section[id][data-nav]'));
    if (secs.length < 2) { mount.parentNode && mount.parentNode.removeChild(mount); return null; }

    var inner = document.createElement('div');
    inner.className = 'otp-inner';
    var label = document.createElement('span');
    label.className = 'otp-label';
    label.textContent = 'On this page';
    inner.appendChild(label);

    var links = [];
    secs.forEach(function (s) {
      var a = document.createElement('a');
      a.href = '#' + s.id;
      a.textContent = s.getAttribute('data-nav');
      inner.appendChild(a);
      links.push(a);
    });
    mount.appendChild(inner);
    mount.dataset.built = '1';
    return { mount: mount, inner: inner, secs: secs, links: links };
  }

  function keepChipVisible(a, box) {
    if (!box || box.scrollWidth <= box.clientWidth + 2) return;
    var ar = a.getBoundingClientRect(), br = box.getBoundingClientRect();
    if (ar.left < br.left) box.scrollLeft -= (br.left - ar.left) + 14;
    else if (ar.right > br.right) box.scrollLeft += (ar.right - br.right) + 14;
  }

  function spy(model) {
    var ticking = false;
    function update() {
      ticking = false;
      var threshold = line() + 4;
      var currentId = model.secs[0].id;
      for (var i = 0; i < model.secs.length; i++) {
        if (model.secs[i].getBoundingClientRect().top - threshold <= 0) currentId = model.secs[i].id;
        else break;
      }
      model.links.forEach(function (a) {
        var on = a.getAttribute('href').slice(1) === currentId;
        if (on) {
          a.classList.add('current');
          a.setAttribute('aria-current', 'true');
          keepChipVisible(a, model.inner);
        } else {
          a.classList.remove('current');
          a.removeAttribute('aria-current');
        }
      });
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  function init() {
    setHeaderH();
    var model = build();
    if (model) {
      setSubnavH(model.mount);
      spy(model);
      // header/subnav height can shift after webfonts load; recompute once more
      window.addEventListener('resize', function () { setHeaderH(); setSubnavH(model.mount); });
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () { setHeaderH(); setSubnavH(model.mount); });
      }
    } else {
      window.addEventListener('resize', setHeaderH);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
