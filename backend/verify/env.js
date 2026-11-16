/* Where the browser, its driver, and the preview server live differs per
   machine. Every checker in this directory used to hardcode one container's
   absolute paths, which meant the committed tools ran in exactly one throwaway
   sandbox and nowhere else — a verification tool nobody else can run is not a
   verification tool.

   Resolve from the environment instead, and when something genuinely is not
   installed, say which knob fixes it rather than dying on a bare
   MODULE_NOT_FOUND pointing at a path that no longer exists. */
const fs = require('fs');
const os = require('os');
const path = require('path');

function loadPlaywright() {
  const tries = [];
  if (process.env.PLAYWRIGHT_CORE) tries.push(process.env.PLAYWRIGHT_CORE);
  tries.push('playwright-core');
  tries.push(path.join(process.cwd(), 'node_modules', 'playwright-core'));
  for (const t of tries) {
    try { return require(t); } catch (e) { /* try the next candidate */ }
  }
  console.error('playwright-core not found.\n' +
    '  npm i playwright-core   — or set PLAYWRIGHT_CORE=/path/to/playwright-core');
  process.exit(2);
}

/* The browser directory carries a build number that changes with every
   Playwright bump, so pinning `chromium-1194` rots silently. Take the highest
   build present. */
function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  let names = [];
  try { names = fs.readdirSync(root).filter(n => n.startsWith('chromium')); } catch (e) { /* no root */ }
  const rank = n => (/^chromium-(\d+)$/.exec(n) ? +RegExp.$1 : -1);
  for (const n of names.sort((a, b) => rank(b) - rank(a))) {
    for (const rel of ['chrome-linux/chrome', 'chrome-linux/headless_shell',
                       'Chromium.app/Contents/MacOS/Chromium', 'chrome']) {
      const p = path.join(root, n, rel);
      try { if (fs.statSync(p).isFile()) return p; } catch (e) { /* next */ }
    }
  }
  console.error(`no chromium executable under ${root}\n` +
    '  set CHROME=/path/to/chrome, or PLAYWRIGHT_BROWSERS_PATH to the browser root');
  process.exit(2);
}

/* Service workers are blocked in every check unless it asks for one
   (2026-11-16). Since Round 5 (M5) every page registers the offline worker,
   and a request a worker makes goes around page.route and context.route. A
   check that blocks motion.js or answers an API itself then stops doing so as
   soon as the worker controls the page. reduced.js went blind exactly that
   way: its reload with motion.js blocked ran through the worker, motion.js
   loaded anyway, and mutation case "content hidden under reduced motion"
   stopped being caught (run 43915133691). The checks measure the page as the
   server sends it; only the checks about the worker itself (offline.js and
   platform.js's offline test) pass serviceWorkers: 'allow'. */
function blockWorkers(chromium) {
  return {
    launch: async (...args) => {
      const b = await chromium.launch(...args);
      const newContext = b.newContext.bind(b), newPage = b.newPage.bind(b);
      b.newContext = (o = {}) => newContext({ serviceWorkers: 'block', ...o });
      b.newPage = (o = {}) => newPage({ serviceWorkers: 'block', ...o });
      return b;
    },
  };
}

module.exports = {
  chromium: blockWorkers(loadPlaywright().chromium),
  executablePath: findChrome(),
  // The preview server the checkers drive. Start it with:
  //   python3 -m http.server 8793 --directory site
  BASE: process.env.BASE || 'http://localhost:8793',
  LOGDIR: process.env.VERIFY_LOG_DIR || os.tmpdir(),
};
