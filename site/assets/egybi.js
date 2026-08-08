/* EgyBI — shared site behavior (loaded on every page).
   Handles: mobile nav toggle, active-link highlighting, AOS init, hero particles.
   Page-specific widgets live inline per page: CountUp on the home, About and
   Explore pages, Chart on Explore, Prices and the home page. The SQL engine is
   no longer among them — it loads on demand from query.js where a table is
   marked queryable, and from a script tag on the case study. */
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.EGYBI = { reduceMotion: reduceMotion };

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

  // ---- hero particles (subtle gold dust on dark hero) ----
  var pEl = document.getElementById('hero-particles');
  if (pEl && window.tsParticles && !reduceMotion) {
    tsParticles.load('hero-particles', {
      fpsLimit: 60, detectRetina: true,
      particles: {
        number: { value: 46, density: { enable: true, area: 900 } },
        color: { value: ['#C9A227', '#E7C64C', '#ffffff'] },
        opacity: { value: { min: 0.15, max: 0.6 } },
        size: { value: { min: 1, max: 2.6 } },
        move: { enable: true, speed: 0.5, direction: 'top', outModes: { default: 'out' } },
        links: { enable: false }
      },
      interactivity: { events: { onHover: { enable: true, mode: 'bubble' } }, modes: { bubble: { distance: 120, size: 3.5, duration: 1.5 } } }
    });
  }

  // ---- shared helper ----
  window.EGYBI.escapeHtml = function (str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  };
})();
