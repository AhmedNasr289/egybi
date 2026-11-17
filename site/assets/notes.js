/* EgyBI — Travellers' notes on community.html (Round 4, R4-2b, 2026-11-16).

   Reads published notes from api/notes.php and lets a signed-in reader write
   one, mark one helpful, report one or delete their own. Sign-in uses the site's
   own dialog (EGYBI.account); the action the reader started resumes afterwards.

   Safety: every piece of a note reaches the page through textContent, never
   innerHTML, so a note that contains markup shows as text. notes-ui.js in
   Verify (browser) feeds this file hostile notes and fails if any becomes markup. */
(function () {
  'use strict';
  var root = document.getElementById('notes');
  if (!root) return;
  // the site's paths, not the page's: this also runs one folder down (ar/, ru/)
  var site = function (p) { return window.EGYBI && window.EGYBI.url ? window.EGYBI.url(p) : p; };
  var API = site('api/notes.php');
  var AUTH = site('auth/auth.php');
  var $ = function (id) { return document.getElementById(id); };
  var list = $('notesList'), more = $('notesMore'), pick = $('notesSite'),
      form = $('notesForm'), write = $('notesWrite'), say = $('notesNote'),
      body = $('notesBody'), count = $('notesCount'), sitesBox = $('notesSites');
  var names = {}, cursor = '', pending = null, siteFilter = '', loadId = 0;
  var REASONS = [['spam', 'Spam or advertising'], ['wrong', 'Wrong or misleading'], ['unkind', 'Rude or unkind'],
                 ['personal', 'Shares personal details'], ['other', 'Something else']];
  function failed() { tell('Could not reach EgyBI. Please try again.', 'error'); }
  /* The section is hidden when notes are off; drop its link from the page's
     own sub-navigation too, so it never points at something invisible. */
  function hideSection() {
    root.hidden = true;
    Array.prototype.forEach.call(document.querySelectorAll('a[href="#notes"]'), function (x) { x.remove(); });
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = String(text);
    return e;
  }
  function tell(msg, kind) { say.textContent = msg || ''; say.className = 'form-note' + (kind ? ' ' + kind : ''); }
  function getJSON(url) {
    return fetch(site(url), { credentials: 'same-origin' }).then(function (r) {
      return r.json().then(function (j) { return { status: r.status, data: j }; });
    });
  }
  /* The CSRF token lives with the session; auth.php hands it to a signed-in reader. */
  function post(action, data) {
    return getJSON(AUTH + '?action=me').then(function (me) {
      var csrf = me.data && me.data.csrf;
      if (!csrf) return { status: 401, data: { ok: false, message: 'Sign in first.' } };
      return fetch(API + '?action=' + encodeURIComponent(action), {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF': csrf },
        body: JSON.stringify(data || {})
      }).then(function (r) { return r.json().then(function (j) { return { status: r.status, data: j }; }); });
    });
  }
  /* Run fn once signed in; if signed out, open the dialog and run it after. */
  function signedIn(why, fn) {
    if (!window.EGYBI || !window.EGYBI.account) { tell('Sign-in is not available on this page.', 'error'); return; }
    window.EGYBI.account.load().then(function (A) {
      if (A.user) { fn(); return; }
      pending = fn;
      A.open('in', why);
    }).catch(function () { tell('The account service could not be reached. Please try again.', 'error'); });
  }
  window.addEventListener('egybi:account', function (e) {
    var go = pending; pending = null;
    if (e.detail && e.detail.user && go) go();
    load(true);
  });

  function monthLabel(m) {
    if (!/^\d{4}-\d{2}$/.test(m || '')) return '';
    var d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1, 1));
    return 'Visited ' + d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  function card(n) {
    var a = el('article', 'note-card');
    a.setAttribute('data-note', n.id);
    var head = el('header', 'note-head');
    head.appendChild(el('strong', 'note-name', n.name));
    var when = monthLabel(n.month);
    if (when) head.appendChild(el('span', 'note-month', when));
    a.appendChild(head);
    var tags = el('p', 'note-tags');
    (n.sites || []).forEach(function (k) { tags.appendChild(el('span', 'note-tag', names[k] || k)); });
    if (n.place) tags.appendChild(el('span', 'note-tag note-tag-free', n.place));
    if (tags.childNodes.length) a.appendChild(tags);
    a.appendChild(el('p', 'note-body', n.body));
    var foot = el('footer', 'note-foot');
    var help = el('button', 'note-act note-help', 'Helpful · ' + (n.helpful || 0));
    help.type = 'button';
    help.setAttribute('aria-label', 'Mark this note helpful. ' + (n.helpful || 0) + ' so far.');
    if (n.mine) help.disabled = true;
    else help.setAttribute('aria-pressed', n.marked ? 'true' : 'false');
    help.addEventListener('click', function () {
      signedIn('Sign in to mark notes helpful.', function () {
        help.disabled = true;   // one request at a time: a double press cannot send two toggles
        post('helpful', { id: n.id }).then(function (r) {
          var d = r.data || {};
          if (d.ok) { help.textContent = 'Helpful · ' + d.helpful; help.setAttribute('aria-pressed', d.marked ? 'true' : 'false'); }
          else tell(d.message || 'Could not mark it.', 'error');
        }).catch(failed).then(function () { help.disabled = false; });
      });
    });
    foot.appendChild(help);
    if (n.mine) {
      var del = el('button', 'note-act note-del', 'Delete my note');
      del.type = 'button';
      var armed = false;
      del.addEventListener('click', function () {
        if (!armed) { armed = true; del.textContent = 'Press again to delete'; return; }
        del.disabled = true;
        post('delete', { id: n.id }).then(function (r) {
          if (r.data && r.data.ok) { a.remove(); tell('Your note is deleted.', 'ok'); }
          else { del.disabled = false; tell((r.data && r.data.message) || 'Could not delete it.', 'error'); }
        }).catch(function () { del.disabled = false; failed(); });
      });
      foot.appendChild(del);
    } else {
      var rep = el('button', 'note-act note-report', 'Report');
      rep.type = 'button';
      rep.addEventListener('click', function () {
        signedIn('Sign in to report a note.', function () {
          if (a.querySelector('.note-why')) return;
          var why = el('div', 'note-why');
          var lab = el('label', 'sr-only', 'Why are you reporting this note?');
          var sel = document.createElement('select');
          sel.className = 'note-reason'; sel.id = 'why-' + n.id; lab.htmlFor = sel.id;
          REASONS.forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; sel.appendChild(op); });
          var send = el('button', 'note-act', 'Send report'); send.type = 'button';
          send.addEventListener('click', function () {
            send.disabled = true;
            post('report', { id: n.id, reason: sel.value }).then(function (r) {
              var d = r.data || {};
              if (d.ok) { why.remove(); rep.textContent = 'Reported — thank you'; rep.disabled = true; }
              else { send.disabled = false; tell(d.message || 'Could not report it.', 'error'); }
            }).catch(function () { send.disabled = false; failed(); });
          });
          why.appendChild(lab); why.appendChild(sel); why.appendChild(send);
          foot.appendChild(why); sel.focus();
        });
      });
      foot.appendChild(rep);
    }
    a.appendChild(foot);
    return a;
  }

  function load(fresh) {
    var mine = ++loadId;   // a newer load wins: an older reply arriving late is ignored, so no card shows twice
    if (fresh) { cursor = ''; list.textContent = ''; }
    var url = API + '?action=list' + (siteFilter ? '&site=' + encodeURIComponent(siteFilter) : '') +
              (cursor ? '&before=' + encodeURIComponent(cursor) : '');
    return getJSON(url).then(function (r) {
      if (mine !== loadId) return;
      var d = r.data || {};
      if (!d.ok) {
        if (d.disabled) { hideSection(); return; }
        list.textContent = ''; list.appendChild(el('p', 'note-empty', 'Notes could not be loaded just now.'));
        return;
      }
      var notes = d.notes || [];
      if (fresh && !notes.length) {
        list.appendChild(el('p', 'note-empty', siteFilter
          ? 'No notes about ' + (names[siteFilter] || siteFilter) + ' yet. Be the first.'
          : 'No notes yet. Be the first to share one.'));
      }
      notes.forEach(function (n) { list.appendChild(card(n)); });
      var last = notes[notes.length - 1];
      cursor = last ? last.at + '~' + last.id : cursor;   // keyset: same-second notes are never skipped
      more.hidden = notes.length < 20;
    }).catch(function () { if (mine !== loadId) return; list.textContent = ''; list.appendChild(el('p', 'note-empty', 'Notes could not be loaded just now.')); });
  }

  function buildSites(keys) {
    keys.forEach(function (k) {
      var o = el('option', null, names[k] || k); o.value = k; pick.appendChild(o);
      var lab = el('label', 'note-pick');
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.name = 'site'; cb.value = k;
      cb.addEventListener('change', function () {
        var on = sitesBox.querySelectorAll('input:checked');
        if (on.length > 3) { cb.checked = false; tell('Pick up to 3 places.', 'error'); }
      });
      lab.appendChild(cb); lab.appendChild(document.createTextNode(' ' + (names[k] || k)));
      sitesBox.appendChild(lab);
    });
  }

  function openForm() { form.hidden = false; write.setAttribute('aria-expanded', 'true'); body.focus(); tell(''); }
  write.addEventListener('click', function () {
    signedIn('Sign in or create a free account to share your experience.', openForm);
  });
  $('notesCancel').addEventListener('click', function () { form.hidden = true; write.setAttribute('aria-expanded', 'false'); });
  body.addEventListener('input', function () { count.textContent = (body.value || '').length + ' / 2000'; });
  pick.addEventListener('change', function () { siteFilter = pick.value; load(true); });
  more.addEventListener('click', function () { load(false); });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var sites = Array.prototype.map.call(sitesBox.querySelectorAll('input:checked'), function (c) { return c.value; });
    var data = { sites: sites, place: $('notesPlace').value, month: $('notesMonth').value, body: body.value };
    var btn = $('notesSend'); btn.disabled = true; tell('Sending…');
    post('create', data).then(function (r) {
      var d = r.data || {};
      btn.disabled = false;
      if (!d.ok) { tell(d.message || 'Could not send your note.', 'error'); return; }
      tell(d.message, 'ok');
      form.reset(); count.textContent = '0 / 2000'; form.hidden = true;
      write.setAttribute('aria-expanded', 'false');
      if (d.status === 'published') load(true);
    }).catch(function () { btn.disabled = false; tell('Could not reach EgyBI. Please try again.', 'error'); });
  });

  // Site names come from the same data file the visit pages are built from.
  getJSON('data/visit-climate.json').then(function (r) {
    ((r.data && r.data.sites) || []).forEach(function (s) { names[s.key] = s.name || s.key; });
  }).catch(function () {}).then(function () {
    var q = new URLSearchParams(location.search).get('site') || '';
    return getJSON(API + '?action=list').then(function (r) {
      var d = r.data || {};
      if (d.disabled || !d.ok) { hideSection(); return; }
      buildSites(d.sites || Object.keys(names));
      if (q && names[q]) { pick.value = q; siteFilter = q; }
      root.hidden = false;
      load(true);
    });
  }).catch(function () { list.textContent = ''; list.appendChild(el('p', 'note-empty', 'Notes could not be loaded just now.')); });
}());
