/* EgyBI — scrollytelling engine for data stories.
   ---------------------------------------------------------------------------
   A story here is not a dashboard with captions. It is an argument where the
   map moves with the reader: as each paragraph comes into view the map pans,
   zooms, swaps a layer or highlights the thing the sentence just named.

   THE DESIGN RULE THAT MATTERS MOST: the article is the source of truth, and
   the map is an enhancement of it. Everything a reader needs is in the prose
   and in a static fallback. Turn JavaScript off and you get a readable
   article; leave it on and the map illustrates it as you go. A story that
   becomes a blank page without JS is not an encyclopaedia entry, and this
   engine is built so that cannot happen — the steps are ordinary <section>
   elements containing ordinary text, and the map is decoration layered on top.

   MARKUP CONTRACT

     <div class="scrolly" data-scrolly>
       <div class="scrolly-graphic"><div id="storyMap"></div></div>
       <div class="scrolly-steps">
         <section class="scrolly-step" data-step="nile" tabindex="0">…prose…</section>
         <section class="scrolly-step" data-step="delta" tabindex="0">…prose…</section>
       </div>
     </div>

   A page registers what each step DOES by name:

     EGYBI_SCROLLY.register('storyMap', {
       nile:  function (map) { map.flyTo([26.8, 31.0], 6); },
       delta: function (map) { map.flyTo([30.9, 31.2], 8); }
     });

   ACCESSIBILITY IS NOT AN AFTERTHOUGHT HERE
   * Every step is focusable and reachable by Tab, and focusing one fires its
     state — so the whole story is navigable by keyboard with no scrolling.
   * Arrow keys and Home/End move between steps once inside the story.
   * prefers-reduced-motion turns every flyTo into an instant setView, so a
     reader who has asked the browser for less movement still reaches every
     state. Reduced motion means no animation, NOT no functionality.
   * The graphic is aria-hidden: it repeats what the prose already says, and a
     screen reader should not have to listen to a map narrate itself.

   IntersectionObserver is used rather than scroll listeners because it does
   not run script on every frame of a scroll, which matters on the mid-range
   Android phones most Egyptian readers are on.
*/
(function () {
  'use strict';

  var registry = {};      // graphic id -> { stepName: fn(target, stepEl) }
  var targets = {};       // graphic id -> whatever the page hands us (a map, etc.)

  function reduced() {
    return (window.EGYBI && EGYBI.reduceMotion) ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function apply(root, stepEl) {
    if (!stepEl || stepEl.classList.contains('is-active')) return;
    root.querySelectorAll('.scrolly-step').forEach(function (s) {
      s.classList.toggle('is-active', s === stepEl);
      // aria-current lets a screen reader user know where they are in a
      // sequence whose visual state is carried by colour and opacity.
      if (s === stepEl) s.setAttribute('aria-current', 'step');
      else s.removeAttribute('aria-current');
    });
    var gid = root.getAttribute('data-graphic');
    var name = stepEl.getAttribute('data-step');
    var fns = registry[gid];
    if (fns && typeof fns[name] === 'function') {
      try {
        fns[name](targets[gid], stepEl, { reduced: reduced() });
      } catch (err) {
        // A broken step must not take the article down with it. The prose is
        // the story; the map is enhancement, and enhancement fails quietly.
        if (window.console) console.warn('scrolly step "' + name + '" failed:', err);
      }
    }
  }

  function wire(root) {
    var steps = Array.prototype.slice.call(root.querySelectorAll('.scrolly-step'));
    if (!steps.length) return;

    steps.forEach(function (s, i) {
      if (!s.hasAttribute('tabindex')) s.setAttribute('tabindex', '0');
      s.setAttribute('role', 'group');
      s.setAttribute('aria-label', 'Step ' + (i + 1) + ' of ' + steps.length);
      // Focus fires the step, so Tab alone walks the entire story without any
      // scrolling at all — the keyboard path is a real path, not a courtesy.
      s.addEventListener('focus', function () { apply(root, s); });
      s.addEventListener('keydown', function (e) {
        var j = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') j = Math.min(i + 1, steps.length - 1);
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') j = Math.max(i - 1, 0);
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = steps.length - 1;
        if (j !== null) { e.preventDefault(); steps[j].focus(); }
      });
    });

    if (!('IntersectionObserver' in window)) {
      // No observer: show the first state so the graphic is never blank, and
      // let the prose carry the rest. Still fully readable.
      apply(root, steps[0]);
      return;
    }

    // Trigger when a step reaches the middle of the viewport rather than its
    // edge, so the map changes as you READ the sentence, not before you get to
    // it and not after you have left it behind.
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) apply(root, en.target);
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

    steps.forEach(function (s) { io.observe(s); });
    apply(root, steps[0]);
  }

  var API = {
    /* Register the step behaviours for a graphic, and the object they act on.
       Call after the map (or chart) exists. Safe to call before or after the
       DOM is wired — whichever arrives second triggers the first state. */
    register: function (graphicId, steps, target) {
      registry[graphicId] = steps || {};
      if (target !== undefined) targets[graphicId] = target;
      var root = document.querySelector('[data-scrolly][data-graphic="' + graphicId + '"]');
      if (root) {
        var first = root.querySelector('.scrolly-step');
        if (first) { first.classList.remove('is-active'); apply(root, first); }
      }
    },
    /* Attach or replace the object the steps act on (the Leaflet map, say). */
    setTarget: function (graphicId, target) {
      targets[graphicId] = target;
      var root = document.querySelector('[data-scrolly][data-graphic="' + graphicId + '"]');
      if (root) { var f = root.querySelector('.scrolly-step');
                  if (f) { f.classList.remove('is-active'); apply(root, f); } }
    },
    /* Move a Leaflet map, honouring reduced motion by jumping instead of
       animating. Every state stays reachable either way — that is the whole
       point of the distinction. */
    goTo: function (map, latlng, zoom) {
      if (!map) return;
      if (reduced()) map.setView(latlng, zoom, { animate: false });
      else map.flyTo(latlng, zoom, { duration: 1.1 });
    },
    reduced: reduced
  };

  function start() {
    document.querySelectorAll('[data-scrolly]').forEach(wire);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.EGYBI_SCROLLY = API;
})();
