/* EgyBI service worker — the planner, and every page you have opened, offline.
   (Round 4, R4-7, 2026-11-16)

   WHY. A tourist checks the plan in a tomb, a felucca or a desert hotel with no
   signal. Their trip already lives in localStorage; what fails offline is the
   page itself. This keeps a copy of each page and asset the reader has opened,
   on their device, and shows it when the network does not answer.

   WHAT IT NEVER DOES.
     - Caches nothing under /auth/ or /api/, nothing but GET, nothing from
       another host: accounts, notes and sign-in always go to the network.
     - Sends nothing anywhere. The cache is on the reader's device; clearing
       site data removes it (privacy.html says so).

   STRATEGIES.
     pages (navigations)    network first; the cached copy only if the network
                            fails; a built-in offline note if there is none.
     /assets/  (?v= names)  cache first: a new version is a new URL.
     /data/*.json           network first, like pages: an online reader always
                            gets today's prices; offline shows the last copy
                            fetched, which carries its own date on the page.
     images, icons          cache first.

   KILL SWITCH. Deleting this file does NOT remove an installed worker (a 404
   on update leaves the old one running). To retire it, set KILL = true and
   deploy: every installed copy then deletes its caches and unregisters. */
'use strict';

var KILL = false;
var VERSION = 'egybi-sw-2';
var PAGES = VERSION + '-pages', STATIC = VERSION + '-static', DATA = VERSION + '-data';
var MAX_PAGES = 60, MAX_STATIC = 150, MAX_DATA = 40;
var PRECACHE = ['/plan.html', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png'];

self.addEventListener('install', function (e) {
  if (KILL) { self.skipWaiting(); return; }
  e.waitUntil(caches.open(PAGES).then(function (c) { return c.addAll(PRECACHE); })
    .catch(function () { /* offline install: runtime caching still works */ })
    .then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return KILL || k.indexOf(VERSION) !== 0; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () {
    if (KILL) return self.registration.unregister();
    return self.clients.claim();
  }));
});

function trim(name, max) {
  return caches.open(name).then(function (c) {
    return c.keys().then(function (ks) {
      return Promise.all(ks.slice(0, Math.max(0, ks.length - max)).map(function (k) { return c.delete(k); }));
    });
  });
}
function put(name, max, req, res) {
  if (!res || !res.ok || res.type !== 'basic') return;
  var copy = res.clone();
  caches.open(name).then(function (c) { return c.put(req, copy); }).then(function () { return trim(name, max); })
    .catch(function () {});
}

var OFFLINE_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · EgyBI</title>' +
  '<style>body{margin:0;font:16px/1.6 system-ui,sans-serif;background:#F6EEDC;color:#292420;display:grid;place-items:center;min-height:100vh}' +
  'main{max-width:34rem;padding:24px}h1{font-size:1.6rem;margin:0 0 .5rem}a{color:#17408B;font-weight:700}</style></head>' +
  '<body><main><h1>You are offline.</h1><p>This page was not saved on this device yet, so it cannot open without a connection.</p>' +
  '<p>Your trip is saved in this browser: <a href="/plan.html">open the planner</a>. Any page you opened before also works offline.</p>' +
  '</main></body></html>';

self.addEventListener('fetch', function (e) {
  if (KILL) return;
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/^\/(auth|api)\//.test(url.pathname)) return;

  if (req.mode === 'navigate') {
    // Cache a page under its path alone: a link from a verification or reset
    // email (/?verify=...) must not leave its one-time token in the cache, and
    // ?add=... visits must not pile up copies of the planner.
    var key = new Request(url.origin + url.pathname);
    e.respondWith(fetch(req).then(function (res) { put(PAGES, MAX_PAGES, key, res); return res; })
      .catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (hit) {
          return hit || new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        });
      }));
    return;
  }
  if (/^\/data\/.+\.json$/.test(url.pathname)) {
    e.respondWith(fetch(req).then(function (res) { put(DATA, MAX_DATA, req, res); return res; })
      .catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || Response.error(); });
      }));
    return;
  }
  if (/^\/assets\//.test(url.pathname) || /\.(png|svg|ico|webp|jpg|jpeg|woff2?)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) { put(STATIC, MAX_STATIC, req, res); return res; });
    }));
  }
});

/* The page that registered us lists what it already loaded before we were in
   control (its CSS, scripts and data), so the very first visit works offline. */
self.addEventListener('message', function (e) {
  var d = e.data || {};
  if (KILL || d.type !== 'cache-these' || !Array.isArray(d.urls)) return;
  var urls = d.urls.slice(0, 80).filter(function (u) {
    try { var x = new URL(u, self.location.origin);
      return x.origin === self.location.origin && !/^\/(auth|api)\//.test(x.pathname); } catch (err) { return false; }
  });
  e.waitUntil(Promise.all(urls.map(function (u) {
    var x = new URL(u, self.location.origin);
    var name = /^\/data\//.test(x.pathname) ? DATA : /\.html$|\/$/.test(x.pathname) ? PAGES : STATIC;
    return caches.open(name).then(function (c) {
      return c.match(u).then(function (hit) { return hit || c.add(u).catch(function () {}); });
    });
  })).then(function () {
    if (e.source) e.source.postMessage({ type: 'cached', count: urls.length });
  }));
});
