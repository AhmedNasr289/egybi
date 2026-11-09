/* account.js — the account page (2026-11-09).

   Shows the signed-in reader their saved trips and places, a download of
   everything the account holds, and account deletion. Talks only to
   auth/auth.php through the API auth.js exposes (window.EGYBI_ACCOUNT), so
   the session, CSRF and paths are handled in one place.

   Nothing here runs for a signed-out reader beyond a button that opens the
   sign-in dialog. */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  var esc = (window.EGYBI && window.EGYBI.escapeHtml) || function (s) { return String(s); };
  var status = $('acctStatus');
  var A = null;

  function say(msg, kind) {
    status.textContent = msg || '';
    status.className = 'form-note' + (kind ? ' ' + kind : '');
  }

  function fmtDate(iso) {
    var T = window.EGYBI && window.EGYBI.trip;
    return (T && iso) ? T.fmtDate(iso) : (iso || '');
  }

  function tripLine(t) {
    var d = t.data || {}, bits = [];
    if (d.start && d.end) bits.push(fmtDate(d.start) + ' to ' + fmtDate(d.end));
    var n = Array.isArray(d.stops) ? d.stops.length : 0;
    bits.push(n + (n === 1 ? ' stop' : ' stops'));
    return bits.join(' · ');
  }

  function renderTrips(trips) {
    var ul = $('acctTrips');
    $('acctTripsEmpty').hidden = trips.length > 0;
    ul.innerHTML = trips.map(function (t) {
      return '<li class="acct-trip" data-id="' + esc(t.id) + '">' +
        '<div><h3>' + esc(t.title) + '</h3><p>' + esc(tripLine(t)) + '</p></div>' +
        '<div class="acct-trip-actions">' +
        '<button type="button" class="btn btn-blue" data-act="open">Open in the planner</button>' +
        '<button type="button" class="btn btn-ghost" data-act="delete" aria-label="Delete ' + esc(t.title) + '">Delete</button>' +
        '</div></li>';
    }).join('');
    ul.__trips = trips;
  }

  function renderPlaces(places) {
    $('acctPlacesBox').hidden = places.length === 0;
    $('acctPlaces').innerHTML = places.map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('');
  }

  function load() {
    if (!A.user) {
      $('acctIn').hidden = true; $('acctOut').hidden = false;
      say('');
      return;
    }
    $('acctOut').hidden = true; $('acctIn').hidden = false;
    $('acctEmail').textContent = A.user.email;
    say('Loading your trips…');
    Promise.all([A.api('trips-list', 'GET'), A.api('places-list', 'GET')]).then(function (r) {
      var t = r[0].data || {}, p = r[1].data || {};
      if (!t.ok) { say(t.message || 'Could not load your trips.', 'error'); return; }
      renderTrips(t.trips || []);
      renderPlaces((p.ok && p.places) || []);
      say('');
    }).catch(function () { say('Could not reach the account service. Please try again.', 'error'); });
  }

  $('acctTrips').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]'); if (!b) return;
    var li = b.closest('.acct-trip'), id = li.dataset.id;
    var trip = ($('acctTrips').__trips || []).filter(function (t) { return t.id === id; })[0];
    if (!trip) return;
    if (b.dataset.act === 'open') {
      // Put the saved trip into the planner's store, remembering which saved
      // trip it is, so pressing Save there updates it instead of copying it.
      var T = window.EGYBI && window.EGYBI.trip;
      var data = trip.data || {};
      data.savedId = trip.id;
      if (T && T.save(data)) { location.href = 'plan.html'; }
      else say('This browser would not store the trip (private mode?). Try another browser.', 'error');
      return;
    }
    // delete: a second press confirms, so one stray tap cannot delete a trip
    if (b.dataset.armed !== '1') {
      b.dataset.armed = '1'; b.textContent = 'Press again to delete';
      setTimeout(function () { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'Delete'; } }, 4000);
      return;
    }
    b.disabled = true;
    A.api('trips-delete', 'POST', { id: id }).then(function (r) {
      var d = r.data || {};
      if (d.ok) { say('Trip deleted.', 'ok'); load(); }
      else { say(d.message || 'Could not delete that trip.', 'error'); b.disabled = false; }
    }).catch(function () { say('Could not reach the account service.', 'error'); b.disabled = false; });
  });

  $('acctDelete').addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = $('acctDelPw').value, confirm = $('acctDelConfirm').value.trim();
    if (confirm !== 'DELETE') { say('Type DELETE, in capitals, to confirm.', 'error'); $('acctDelConfirm').focus(); return; }
    var btn = this.querySelector('button[type="submit"]'); btn.disabled = true;
    A.api('delete-account', 'POST', { password: pw, confirm: confirm }).then(function (r) {
      var d = r.data || {};
      if (d.ok) {
        try { localStorage.removeItem('egybi.account'); } catch (err) {}
        $('acctIn').hidden = true; $('acctOut').hidden = false;
        say(d.message || 'Your account has been deleted.', 'ok');
        // Reload rather than announce: auth.js still holds the old user, and
        // a fresh page asks the server, which now says nobody is signed in.
        setTimeout(function () { location.reload(); }, 1500);
      } else {
        say(d.message || 'Could not delete the account.', 'error'); btn.disabled = false;
      }
    }).catch(function () { say('Could not reach the account service.', 'error'); btn.disabled = false; });
  });

  $('acctSignIn').addEventListener('click', function () { if (A) A.open('in'); });

  window.addEventListener('egybi:account', function () { if (A) load(); });

  window.EGYBI.account.load().then(function (a) { A = a; load(); })
    .catch(function () { say('The account service could not be reached. Please try again later.', 'error'); });
}());
