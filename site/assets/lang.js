/* Languages (trilingual stage 1, 2026-11-16).

   1. When a reader picks a language in the language button or the phone
      menu, remember it on this device (localStorage "egybi.lang").
   2. On a page in another language that also exists in the remembered one,
      offer a link to it in a slim bar. Never redirect: a reader who followed
      a link to an English page meant to arrive there, and search engines must
      see every language at its own address.

   Without JavaScript the button and the links still work; only the memory
   and the offer need this file. The choice never leaves the device
   (privacy.html says so). */
(function () {
  'use strict';
  var KEY = 'egybi.lang', CLOSED = 'egybi.lang.offer.closed';
  var here = (document.documentElement.getAttribute('lang') || 'en').slice(0, 2);

  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[data-lang]');
    if (!a) return;
    try { localStorage.setItem(KEY, a.getAttribute('data-lang')); } catch (err) { /* private mode */ }
  });

  var want = null;
  try { want = localStorage.getItem(KEY); if (sessionStorage.getItem(CLOSED)) return; } catch (err) { return; }
  if (!want || want === here) return;
  var alt = document.querySelector('link[rel="alternate"][hreflang="' + want + '"]');
  if (!alt) return;
  var TEXT = { en: 'Read this page in English', ar: 'اقرأ هذه الصفحة بالعربية', ru: 'Читать эту страницу на русском' };
  var CLOSE = { en: 'Close', ar: 'إغلاق', ru: 'Закрыть' };
  if (!TEXT[want]) return;

  var bar = document.createElement('div');
  bar.className = 'lang-offer';
  bar.setAttribute('role', 'note');
  var link = document.createElement('a');
  link.href = alt.getAttribute('href');
  link.setAttribute('lang', want);
  link.setAttribute('hreflang', want);
  link.setAttribute('dir', want === 'ar' ? 'rtl' : 'ltr');
  link.textContent = TEXT[want];
  var close = document.createElement('button');
  close.type = 'button';
  close.setAttribute('aria-label', CLOSE[here] || CLOSE.en);
  close.textContent = '×';
  close.addEventListener('click', function () {
    try { sessionStorage.setItem(CLOSED, '1'); } catch (err) { /* ignore */ }
    bar.remove();
  });
  bar.appendChild(link);
  bar.appendChild(close);
  var header = document.querySelector('.site-header');
  if (header && header.parentNode) header.parentNode.insertBefore(bar, header.nextSibling);
})();
