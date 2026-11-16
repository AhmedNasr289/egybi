/* EgyBI — travellers' notes on each visit page (Round 4, R4-2c, 2026-11-16).

   A tourist reading about Giza wants to know what it was really like for
   someone who went. This shows the three latest published notes about this
   site, from the same API and with the same safety as the community page:
   every part of a note reaches the page through textContent, never innerHTML.

   Without JavaScript, with notes switched off, or with the API unreachable,
   the section keeps its plain link to read or share notes on the community
   page. visit-notes.js in Verify (browser) checks all three states. */
(function () {
  'use strict';
  var box = document.querySelector('[data-visit-notes]');
  if (!box) return;
  var site = box.getAttribute('data-visit-notes');
  var name = box.getAttribute('data-site-name') || site;
  var list = box.querySelector('.vn-list');
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = String(text);
    return e;
  }
  function link(text, href) { var a = el('a', null, text); a.href = href; return a; }
  var community = '../community.html?site=' + encodeURIComponent(site) + '#notes';

  function card(n) {
    var a = el('article', 'note-card');
    var head = el('header', 'note-head');
    head.appendChild(el('strong', 'note-name', n.name));
    if (/^\d{4}-\d{2}$/.test(n.month || '')) {
      head.appendChild(el('span', 'note-month', 'Visited ' + MONTHS[+n.month.slice(5, 7) - 1] + ' ' + n.month.slice(0, 4)));
    }
    a.appendChild(head);
    var body = String(n.body || '');
    a.appendChild(el('p', 'note-body', body.length > 320 ? body.slice(0, 300).replace(/\s+\S*$/, '') + '…' : body));
    return a;
  }

  fetch('../api/notes.php?action=list&site=' + encodeURIComponent(site), { credentials: 'same-origin' })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d || !d.ok) return;                     // off, or an error: keep the plain link
      var notes = (d.notes || []).slice(0, 3);
      list.textContent = '';
      if (!notes.length) {
        var p = el('p', 'vn-empty', 'No notes about ' + name + ' yet. ');
        p.appendChild(link('Been there? Share what it was like →', community));
        list.appendChild(p);
      } else {
        notes.forEach(function (n) { list.appendChild(card(n)); });
        var more = el('p', 'vn-more');
        more.appendChild(link('All notes about ' + name + ', and share yours →', community));
        list.appendChild(more);
      }
      box.setAttribute('data-visit-notes-ready', String(notes.length));
    })
    .catch(function () { /* offline or unreachable: the plain link stays */ });
})();
