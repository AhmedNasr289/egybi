/* save-place.js: does "Save this place" work, signed in and signed out?

   The account service is PHP, and the browser checks run against a plain
   static server, so the service is played here instead: every call to
   auth/auth.php is answered from a small in-memory account. What is under
   test is the page code (saveplace.js on the visitor pages, account.js on the
   account page) and how it talks to the service. The service itself is
   tested for real, PHP and all, by auth-flow.sh.

   Four stories, each a promise the pages make:
     1. Signed in: the button shows the true state on arrival, saves with the
        session's CSRF token, and a second press removes the place again.
     2. Signed out: the button opens the sign-in dialog and saves nothing.
     3. Signing in from that dialog finishes the save the reader asked for,
        and does not undo a place that was already saved.
     4. The account page lists saved places by name, linked to their pages,
        and Remove removes one.
     5. The account page's newsletter button subscribes and unsubscribes a
        verified account, and shows the server's refusal for an unverified
        one without pretending it worked.

   Prints one PASS/FAIL line per step; exits 1 on any failure. */
'use strict';
const { chromium, executablePath, BASE } = require('./env');
const B = BASE;
const PAGE = process.env.ONLY || 'visit/giza.html';
const KEY = PAGE.replace(/^visit\//, '').replace(/\.html$/, '');

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok || !detail ? '' : '  (' + detail + ')'}`);
  if (!ok) failures++;
}

// A pretend account service. `places` is the saved set; `log` every call.
function service({ signedIn, places = [], verified = true, news = 'none' }) {
  const st = { signedIn, places: [...places], log: [], verified, news };
  st.route = async (route) => {
    const req = route.request();
    const action = new URL(req.url()).searchParams.get('action');
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    st.log.push({ action, method: req.method(), csrf: req.headers()['x-csrf'] || '', body });
    const json = (status, obj) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(obj) });
    const user = { id: 7, email: 'reader@example.test' };
    if (action === 'me') return json(200, st.signedIn ? { ok: true, user, csrf: 'tok-123', google: { enabled: false } }
                                                     : { ok: true, user: null, google: { enabled: false } });
    if (action === 'login') { st.signedIn = true; return json(200, { ok: true, user, csrf: 'tok-123' }); }
    if (!st.signedIn) return json(401, { ok: false, message: 'Sign in first.' });
    if (action === 'places-list') return json(200, { ok: true, places: st.places });
    if (action === 'trips-list') return json(200, { ok: true, trips: [] });
    if (action === 'newsletter-status') return json(200, { ok: true, state: st.news, verified: st.verified });
    if (action === 'newsletter-set') {
      if (req.method() !== 'POST' || (req.headers()['x-csrf'] || '') !== 'tok-123') return json(403, { ok: false, message: 'Bad CSRF' });
      if (body.on === true && !st.verified) return json(403, { ok: false, message: 'Confirm your email first: the link is in the email we sent.' });
      st.news = body.on === true ? 'subscribed' : 'none';
      return json(200, { ok: true, state: st.news });
    }
    if (action === 'places-toggle') {
      if (req.method() !== 'POST' || (req.headers()['x-csrf'] || '') !== 'tok-123') return json(403, { ok: false, message: 'Bad CSRF' });
      const k = body && body.place;
      const i = st.places.indexOf(k);
      if (i >= 0) { st.places.splice(i, 1); return json(200, { ok: true, saved: false }); }
      st.places.push(k); return json(200, { ok: true, saved: true });
    }
    return json(404, { ok: false, message: 'Unknown action.' });
  };
  return st;
}

async function open(browser, st, path, flag) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  if (flag) await ctx.addInitScript(() => { try { localStorage.setItem('egybi.account', '1'); } catch (e) {} });
  const p = await ctx.newPage();
  await p.route('**/*', r => {
    const u = r.request().url();
    if (/\/auth\/auth\.php/.test(u)) return st.route(r);
    return (u.startsWith(B) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort();
  });
  await p.goto(`${B}/${path}`, { waitUntil: 'load' });
  return { ctx, p };
}

const btnState = (p) => p.evaluate(() => {
  const b = document.querySelector('button[data-save-place]');
  const n = document.querySelector('[data-save-note]');
  return b && { hidden: b.hidden, pressed: b.getAttribute('aria-pressed'), text: b.textContent.trim(),
                disabled: b.disabled, note: n ? n.textContent.trim() : null };
});
// One story failing (a click that times out, say) must not hide the rest:
// report it as a FAIL line and go on to the next story.
async function story(fn) {
  try { await fn(); } catch (e) { check('a story ran to its end', false, String(e).split('\n')[0].slice(0, 160)); }
}

const until = async (p, fn, ms = 5000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await fn()) return true; await p.waitForTimeout(100); }
  return false;
};

(async () => {
  const browser = await chromium.launch({ executablePath });

  // 1. Signed in, place already saved.
  await story(async () => {
    const st = service({ signedIn: true, places: [KEY] });
    const { ctx, p } = await open(browser, st, PAGE, true);
    const shown = await until(p, async () => (await btnState(p))?.pressed === 'true');
    const s0 = await btnState(p);
    check('signed in: the button is visible', s0 && !s0.hidden, JSON.stringify(s0));
    check('signed in: a saved place shows as saved on arrival', shown, JSON.stringify(s0));
    await p.click('button[data-save-place]', { timeout: 5000 });
    await until(p, async () => (await btnState(p))?.pressed === 'false');
    const s1 = await btnState(p);
    const t1 = st.log.filter(x => x.action === 'places-toggle');
    check('signed in: pressing it removes the place', s1.pressed === 'false' && !st.places.includes(KEY), JSON.stringify(s1));
    check('signed in: the request carries the CSRF token and the key',
          t1.length === 1 && t1[0].csrf === 'tok-123' && t1[0].body && t1[0].body.place === KEY, JSON.stringify(t1));
    await p.click('button[data-save-place]', { timeout: 5000 });
    await until(p, async () => (await btnState(p))?.pressed === 'true');
    const s2 = await btnState(p);
    check('signed in: pressing it again saves it, and says so',
          s2.pressed === 'true' && st.places.includes(KEY) && /Saved/.test(s2.note || ''), JSON.stringify(s2));
    await ctx.close();
  });

  // 2 and 3. Signed out: the dialog, then signing in finishes the save.
  await story(async () => {
    const st = service({ signedIn: false });
    const { ctx, p } = await open(browser, st, PAGE, false);
    const s0 = await btnState(p);
    check('signed out: the button is visible', s0 && !s0.hidden && s0.pressed === 'false', JSON.stringify(s0));
    check('signed out: arriving does not load the account code',
          !(await p.evaluate(() => !!window.EGYBI_ACCOUNT)) && st.log.length === 0, `${st.log.length} service calls`);
    await p.click('button[data-save-place]', { timeout: 5000 });
    const dialog = await until(p, () => p.evaluate(() => !!document.querySelector('#authModal')));
    check('signed out: pressing it opens the sign-in dialog', dialog);
    check('signed out: nothing is saved', !st.log.some(x => x.action === 'places-toggle'),
          JSON.stringify(st.log.map(x => x.action)));
    if (dialog) {
      await p.fill('#authModal input[type="email"]', 'reader@example.test');
      await p.fill('#authModal input[type="password"]', 'not-a-real-password-1');
      await p.press('#authModal input[type="password"]', 'Enter');
      const saved = await until(p, async () => (await btnState(p))?.pressed === 'true');
      check('signing in finishes the save that was asked for', saved && st.places.includes(KEY),
            JSON.stringify({ places: st.places, log: st.log.map(x => x.action) }));
    }
    await ctx.close();
  });
  await story(async () => {
    // Already saved before signing in: signing in must not toggle it off.
    const st = service({ signedIn: false, places: [KEY] });
    const { ctx, p } = await open(browser, st, PAGE, false);
    await p.click('button[data-save-place]', { timeout: 5000 });
    if (await until(p, () => p.evaluate(() => !!document.querySelector('#authModal')))) {
      await p.fill('#authModal input[type="email"]', 'reader@example.test');
      await p.fill('#authModal input[type="password"]', 'not-a-real-password-1');
      await p.press('#authModal input[type="password"]', 'Enter');
      await until(p, async () => /Already/.test((await btnState(p))?.note || ''));
    }
    const s = await btnState(p);
    check('signing in does not undo a place already saved',
          st.places.includes(KEY) && !st.log.some(x => x.action === 'places-toggle') && s.pressed === 'true',
          JSON.stringify({ places: st.places, state: s }));
    await ctx.close();
  });

  // 4. The account page.
  await story(async () => {
    const st = service({ signedIn: true, places: [KEY, 'a-retired-page'] });
    const { ctx, p } = await open(browser, st, 'account.html', true);
    const listed = await until(p, () => p.evaluate(() => document.querySelectorAll('#acctPlaces li').length === 2));
    const rows = await p.evaluate(() => [...document.querySelectorAll('#acctPlaces li')].map(li => {
      const a = li.querySelector('a');
      return { key: li.dataset.key, text: (a || li.querySelector('span') || li).textContent.trim(), href: a && a.getAttribute('href') };
    }));
    const known = rows.find(r => r.key === KEY), unknown = rows.find(r => r.key === 'a-retired-page');
    check('account: both saved places are listed', listed, JSON.stringify(rows));
    check('account: a known place shows its name, linked to its page',
          known && known.href === `visit/${KEY}.html` && known.text && known.text !== KEY, JSON.stringify(known));
    check('account: an unknown key is listed unlinked', unknown && !unknown.href && unknown.text === 'a-retired-page',
          JSON.stringify(unknown));
    await p.click(`#acctPlaces li[data-key="${KEY}"] button[data-act="remove"]`, { timeout: 5000 });
    const gone = await until(p, () => p.evaluate(k => !document.querySelector(`#acctPlaces li[data-key="${k}"]`), KEY));
    const status = await p.evaluate(() => document.getElementById('acctStatus').textContent.trim());
    check('account: Remove removes it and says so', gone && !st.places.includes(KEY) && /removed/i.test(status),
          JSON.stringify({ places: st.places, status }));
    await ctx.close();
  });

  // 5. The newsletter button on the account page.
  const news = (p) => p.evaluate(() => {
    const b = document.getElementById('acctNewsBtn'), n = document.getElementById('acctNewsNote');
    return { pressed: b.getAttribute('aria-pressed'), disabled: b.disabled, text: b.textContent.trim(), note: n.textContent.trim() };
  });
  await story(async () => {
    const st = service({ signedIn: true, verified: true, news: 'none' });
    const { ctx, p } = await open(browser, st, 'account.html', true);
    await until(p, async () => !(await news(p)).disabled);
    const n0 = await news(p);
    check('newsletter: off on arrival, and pressable', n0.pressed === 'false' && !n0.disabled, JSON.stringify(n0));
    await p.click('#acctNewsBtn', { timeout: 5000 });
    await until(p, async () => (await news(p)).pressed === 'true');
    const n1 = await news(p), sets = st.log.filter(x => x.action === 'newsletter-set');
    check('newsletter: a press subscribes, with the CSRF token',
          n1.pressed === 'true' && st.news === 'subscribed' && sets.length === 1 && sets[0].csrf === 'tok-123' && sets[0].body.on === true,
          JSON.stringify({ n1, sets }));
    await p.click('#acctNewsBtn', { timeout: 5000 });
    await until(p, async () => (await news(p)).pressed === 'false');
    const n2 = await news(p);
    check('newsletter: a second press unsubscribes, and says so',
          n2.pressed === 'false' && st.news === 'none' && /not receive/.test(n2.note), JSON.stringify(n2));
    await ctx.close();
  });
  await story(async () => {
    const st = service({ signedIn: true, verified: false, news: 'none' });
    const { ctx, p } = await open(browser, st, 'account.html', true);
    await until(p, async () => !(await news(p)).disabled);
    await p.click('#acctNewsBtn', { timeout: 5000 });
    // The page already says "confirm your email" on arrival, so wait for the
    // refused request itself and the button to come back, not for the words.
    await until(p, async () => st.log.some(x => x.action === 'newsletter-set') && !(await news(p)).disabled);
    const n = await news(p), tried = st.log.filter(x => x.action === 'newsletter-set').length;
    check('newsletter: an unverified account is told why, and stays unsubscribed',
          tried === 1 && n.pressed === 'false' && st.news === 'none' && /Confirm your email/.test(n.note),
          JSON.stringify({ n, tried }));
    await ctx.close();
  });

  await browser.close();
  console.log(failures ? `\n${failures} step(s) failed` : '\nsave place: every step answered as expected');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
