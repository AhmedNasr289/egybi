/* saveplace.js — "Save this place" on the visitor-site pages (2026-11-09).

   A button with data-save-place="<key>" (the page's slug, e.g. "giza") saves
   the place to the reader's account, or removes it, through auth.php's
   places-toggle. The account page lists what is saved.

   Anonymous readers download nothing more than this file: the account code
   (auth.js) loads only when the button is pressed, or when this browser was
   signed in before (egybi.js's flag), to show whether the place is saved.

   The button is rendered `hidden`, so a reader without JavaScript never sees
   a button that does nothing. */
(function () {
  'use strict';
  var btn = document.querySelector('button[data-save-place]');
  if (!btn || !window.EGYBI || !window.EGYBI.account) return;
  var key = btn.getAttribute('data-save-place');
  var note = document.querySelector('[data-save-note]');
  var label = btn.getAttribute('data-label') || 'Save this place';
  var pending = false;

  function say(msg, kind) {
    if (!note) return;
    note.textContent = msg || '';
    note.className = 'form-note' + (kind ? ' ' + kind : '');
  }
  function show(saved) {
    btn.setAttribute('aria-pressed', saved ? 'true' : 'false');
    btn.textContent = saved ? 'Saved to your account' : label;
  }

  // Whether the signed-in reader already saved this place.
  function isSaved(A) {
    return A.api('places-list', 'GET').then(function (r) {
      var d = r.data || {};
      return !!(d.ok && (d.places || []).indexOf(key) !== -1);
    });
  }

  function toggle(A) {
    btn.disabled = true; say('Saving…');
    A.api('places-toggle', 'POST', { place: key }).then(function (r) {
      var d = r.data || {};
      if (d.ok) {
        show(d.saved);
        if (d.saved && note) { note.className = 'form-note ok'; note.innerHTML = 'Saved. <a href="' + window.EGYBI.account.url('account.html') + '">See your places</a>.'; }
        else say(d.saved ? 'Saved.' : 'Removed from your saved places.', 'ok');
      } else {
        say(d.message || 'Could not save this place.', 'error');
      }
      btn.disabled = false;
    }).catch(function () { say('Could not reach the account service.', 'error'); btn.disabled = false; });
  }

  btn.addEventListener('click', function () {
    window.EGYBI.account.load().then(function (A) {
      if (A.user) { toggle(A); return; }
      pending = true;
      A.open('in', 'Sign in or create a free account to save places.');
    }).catch(function () { say('The account service could not be reached. Please try again.', 'error'); });
  });

  // After a sign-in started from this button, finish the save; but never
  // toggle a place that was already saved, which would remove it.
  window.addEventListener('egybi:account', function (e) {
    var signedIn = !!(e.detail && e.detail.user);
    if (!signedIn) { pending = false; show(false); return; }
    window.EGYBI.account.load().then(function (A) {
      return isSaved(A).then(function (saved) {
        show(saved);
        if (pending) {
          pending = false;
          if (saved) say('Already in your saved places.', 'ok'); else toggle(A);
        }
      });
    }).catch(function () {});
  });

  show(false);
  btn.hidden = false;

  // A browser that was signed in before: show the real state on arrival.
  var known = false;
  try { known = localStorage.getItem('egybi.account') === '1'; } catch (e) {}
  if (known) {
    window.EGYBI.account.load().then(function (A) {
      if (A.user) return isSaved(A).then(show);
    }).catch(function () {});
  }
}());
