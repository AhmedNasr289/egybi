/* EgyBI — "query this yourself" affordance.
   ---------------------------------------------------------------------------
   EgyBI is an encyclopaedia of Egypt, and its promise is that every figure is
   traceable to a named source. This goes one step further: every table can be
   queried, live, by the reader.

   THE CONSTRAINT THAT SHAPES ALL OF THIS: the SQL engine is ~655 KB of
   WebAssembly plus ~50 KB of glue. Most people arriving at a page about Luxor
   want to read about Luxor and will never touch a query box. Making them
   download the engine anyway would be a tax on the majority to serve the few.

   So this file is the only thing that loads up front — a few kB whose entire
   job is to put a button on the page. Nothing else is fetched until somebody
   presses it.

   A table opts in by declaring what it is and where it came from:

     <table data-query="governorates"
            data-query-sql="SELECT name, population FROM governorates ORDER BY population DESC;"
            data-query-source="CAPMAS census"
            data-query-asof="2024-01-01"
            data-query-json="data/geo-health.json">

   data-query-source and data-query-asof are carried into the panel header on
   purpose. A query box that shows numbers stripped of their provenance would
   quietly undo the one rule the whole site is built on, so the citation
   travels with the data rather than being left behind on the page.

   data-query-note exists because of a real trap found while wiring this up.
   The queryable database is a curated slice, not a mirror of every figure on
   the site: the Atlas renders all 27 governorates, but the sandbox table holds
   10. A reader pressing the button under a table of 27 and silently getting 10
   rows back would reasonably conclude the query was broken — or worse, that
   Egypt has 10 governorates. Wherever the queryable coverage is narrower than
   what the page shows, the table MUST declare it here, and the panel prints it
   above the results.
*/
(function () {
  'use strict';

  // Resolve the site root from this script's own URL rather than guessing from
  // location.pathname. Generated pages sit one directory down (/practice/x.html),
  // so a hardcoded 'assets/' would 404 for exactly the pages most likely to be
  // reached from search.
  var SELF = document.currentScript && document.currentScript.src;
  var ROOT = SELF ? SELF.replace(/assets\/query\.js.*$/, '') : '';

  var enginePromise = null;   // resolves to the sql.js SQL object, once
  var dbPromise = null;       // resolves to a seeded Database, once
  var panel = null, lastFocus = null;

  function esc(s) {
    return (window.EGYBI && EGYBI.escapeHtml) ? EGYBI.escapeHtml(s) : String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function inject(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('could not load ' + src.split('/').pop())); };
      document.head.appendChild(s);
    });
  }

  // Both heavy assets, fetched at most once per page and only after a click.
  function getDb() {
    if (dbPromise) return dbPromise;
    dbPromise = inject(ROOT + 'assets/vendor/sql-wasm.js')
      .then(function () {
        return window.initSqlJs({ locateFile: function (f) { return ROOT + 'assets/vendor/' + f; } });
      })
      .then(function (SQL) {
        return inject(ROOT + 'assets/challenges.js').then(function () { return SQL; });
      })
      .then(function (SQL) {
        var db = new SQL.Database();
        if (!window.EGYBI_SANDBOX_SQL) throw new Error('the dataset did not load');
        db.run(window.EGYBI_SANDBOX_SQL);
        return db;
      });
    return dbPromise;
  }

  function renderResult(db, sql, out) {
    var res;
    try {
      res = db.exec(sql);
    } catch (err) {
      out.innerHTML = '<p class="q-err">SQL error: ' + esc(err.message) + '</p>';
      return;
    }
    if (!res.length) {
      out.innerHTML = '<p class="q-empty">That ran, but returned no rows.</p>';
      return;
    }
    var c = res[0].columns, v = res[0].values;
    var h = '<table class="result-table"><thead><tr>' +
      c.map(function (x) { return '<th>' + esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>';
    v.slice(0, 200).forEach(function (r) {
      h += '<tr>' + r.map(function (x) { return '<td>' + esc(x) + '</td>'; }).join('') + '</tr>';
    });
    out.innerHTML = h + '</tbody></table>' +
      (v.length > 200 ? '<p class="q-note">Showing the first 200 of ' + v.length + ' rows.</p>' : '');
  }

  function closePanel() {
    if (!panel) return;
    panel.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'query-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Query this data');
    panel.hidden = true;
    panel.innerHTML =
      '<div class="q-box">' +
        '<div class="q-head">' +
          '<div><strong class="q-title"></strong><span class="q-src"></span></div>' +
          '<button type="button" class="q-close" aria-label="Close">&times;</button>' +
        '</div>' +
        '<p class="q-coverage" hidden></p>' +
        '<textarea class="q-sql mono" spellcheck="false" aria-label="SQL query"></textarea>' +
        '<div class="q-actions"><button type="button" class="btn btn-primary q-run">Run</button>' +
        '<span class="q-status"></span></div>' +
        '<div class="q-out"></div>' +
      '</div>';
    document.body.appendChild(panel);
    panel.querySelector('.q-close').addEventListener('click', closePanel);
    panel.addEventListener('click', function (e) { if (e.target === panel) closePanel(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) closePanel();
    });
    return panel;
  }

  function open(el, btn) {
    var p = ensurePanel();
    lastFocus = btn;
    var sql = el.getAttribute('data-query-sql') || 'SELECT 1;';
    var src = el.getAttribute('data-query-source') || '';
    var asof = el.getAttribute('data-query-asof') || '';
    var json = el.getAttribute('data-query-json') || '';

    p.querySelector('.q-title').textContent = el.getAttribute('data-query') || 'this table';
    // The citation follows the data into the panel — see the file header.
    p.querySelector('.q-src').textContent =
      src ? (' · ' + src + (asof ? ' · as of ' + asof : '')) : '';
    // Coverage disclosure, shown BEFORE the results rather than after — see
    // the file header for why silence here would be actively misleading.
    var note = el.getAttribute('data-query-note') || '';
    var noteEl = p.querySelector('.q-coverage');
    noteEl.textContent = note;
    noteEl.hidden = !note;
    var ta = p.querySelector('.q-sql'), out = p.querySelector('.q-out'),
        status = p.querySelector('.q-status'), run = p.querySelector('.q-run');
    ta.value = sql;
    out.innerHTML = '';
    status.textContent = 'Starting the SQL engine…';
    run.disabled = true;
    p.hidden = false;
    p.querySelector('.q-close').focus();

    getDb().then(function (db) {
      status.textContent = 'Running in your browser. Edit the query and run it again.';
      run.disabled = false;
      run.onclick = function () { renderResult(db, ta.value, out); };
      renderResult(db, ta.value, out);
    }).catch(function (err) {
      // A button that silently does nothing is worse than no button. Say what
      // failed, and still give the reader the data and its source.
      run.disabled = true;
      status.textContent = '';
      out.innerHTML =
        '<p class="q-err">The query engine did not load (' + esc(err.message) + '). ' +
        'Everything else on the page still works.</p>' +
        (src ? '<p class="q-note">This table comes from ' + esc(src) +
               (asof ? ', as of ' + esc(asof) : '') + '.</p>' : '') +
        (json ? '<p class="q-note"><a href="' + esc(ROOT + json) + '">Download the underlying data</a></p>' : '');
    });
  }

  function init() {
    var tables = document.querySelectorAll('[data-query]');
    Array.prototype.forEach.call(tables, function (el) {
      if (el.dataset.queryWired) return;      // idempotent: safe to call twice
      el.dataset.queryWired = '1';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'query-btn';
      btn.setAttribute('data-ev', 'query_panel_opened');
      btn.innerHTML = '<span data-glyph="reed"></span> Query this yourself';
      btn.addEventListener('click', function () { open(el, btn); });
      (el.parentNode || document.body).insertBefore(btn, el.nextSibling);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.EGYBI_QUERY = { init: init };   // for lists rendered after load
})();
