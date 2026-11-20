/* store.js — the $12 pack's buy button on dossier.html (and its /ar/ and /ru/ twins).
   Reads data/store.json. While pack.url is empty the page is left exactly as written:
   "not on sale yet", no button. Once pack.url holds an https link on payhip.com or
   gumroad.com, the "In preparation" tag and the not-on-sale sentence are replaced by
   a buy button and a one-line payment note, in the page's language.
   After checkout the shop sends the buyer back to dossier.html?bought=1, which shows a
   thank-you line and records a "pack_bought" event (once per page load).
   Analytics: the button carries data-ev="pack_buy_click", counted by analytics.js. */
(function () {
  'use strict';
  var ALLOWED = /^https:\/\/([a-z0-9-]+\.)*(payhip\.com|gumroad\.com)\//i;

  function lang() {
    var l = (document.documentElement.getAttribute('lang') || 'en').slice(0, 2).toLowerCase();
    return l === 'ar' || l === 'ru' ? l : 'en';
  }
  function pick(obj, l) { return obj && (obj[l] || obj.en) || ''; }

  // Exported for the checker (backend/verify/store-button.js).
  function apply(doc, data, search) {
    var pack = data && data.pack;
    var card = doc.querySelector('#versions .sheet.offer:nth-of-type(2)') ||
               doc.querySelectorAll('#versions .sheet.offer')[1];
    if (!card || !pack) return 'no-card';
    var l = lang();
    var url = String(pack.url || '').trim();
    var live = ALLOWED.test(url);

    if (live) {
      var tag = card.querySelector('.status-tag');
      if (tag) tag.parentNode.removeChild(tag);
      var cap = card.querySelector('p.chart-cap');
      var row = doc.createElement('div');
      row.className = 'cta-row';
      var a = doc.createElement('a');
      a.className = 'btn btn-primary';
      a.href = url;
      a.rel = 'noopener';
      a.setAttribute('data-ev', 'pack_buy_click');
      a.textContent = pick(pack.label, l);
      row.appendChild(a);
      var note = doc.createElement('p');
      note.className = 'chart-cap';
      note.textContent = pick(pack.note, l);
      if (cap) { cap.parentNode.replaceChild(note, cap); } else { card.appendChild(note); }
      note.parentNode.insertBefore(row, note);
    }

    if (/[?&]bought=1(&|$)/.test(search || '')) {
      var thanks = doc.createElement('p');
      thanks.className = 'callout';
      thanks.setAttribute('role', 'status');
      thanks.textContent = pick(pack.thanks, l);
      card.insertBefore(thanks, card.firstChild);
      if (typeof window !== 'undefined' && window.EGYBI_TRACK) window.EGYBI_TRACK('pack_bought');
    }
    return live ? 'live' : 'not-on-sale';
  }

  if (typeof window !== 'undefined') window.EGYBI_STORE = { apply: apply, ALLOWED: ALLOWED };

  try {
    var me = document.currentScript && document.currentScript.src;
    var url = me ? new URL('../data/store.json', me).href : '/data/store.json';
    fetch(url, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) { if (data) apply(document, data, location.search); })
      .catch(function () { /* the page already says "not on sale": nothing to undo */ });
  } catch (e) { /* never break the page */ }
})();
