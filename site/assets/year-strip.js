/* The year strip on When to go (2026-11-16).

   visit.html's "Each site, all twelve months" table shows every measured site
   by every month, each cell coloured by the visit map's heat bands with its
   number printed. When any of it comes on screen, the months come in January
   to December (each cell's --m, set by the generator; the motion itself is in
   assets/heat-calendar.css), so a first-time reader watches the heat build
   into summer and ease off again, site by site.

   The rules this keeps:
   - Without JavaScript nothing here runs and the table is simply there.
   - Readers who asked for reduced motion get the table at once: this script
     stops, and the stylesheet's motion is inside a no-preference query too.
   - Opacity and transform only, so nothing around the table moves. */
(function () {
  'use strict';
  var box = document.querySelector('[data-year-strip]');
  var table = box && box.querySelector('.hc-table');
  if (!table || !('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  table.classList.add('is-waiting');
  // Threshold 0: start as soon as any of the table is on screen, so a reader
  // never looks at an empty grid (the lesson of the briefing map's fold).
  var io = new IntersectionObserver(function (es) {
    if (es.some(function (e) { return e.isIntersecting || e.intersectionRatio > 0; })) {
      io.disconnect();
      table.classList.remove('is-waiting');
      table.classList.add('is-sweeping');
    }
  }, { threshold: 0 });
  io.observe(table);
})();
