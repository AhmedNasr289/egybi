/* "After confirming an email, the reader goes back to where they were, and
   only to a page on this site." (Round 5, M6)

   CI serves site/ statically, so this answers auth.php itself with the shapes
   auth.php really sends, and drives the real auth.js in Chromium:

     1. On community.html the reader signs up: the page is remembered.
     2. The email's link opens /index.html?verify=...: after signing in, the
        browser goes back to /community.html. NO RETURN.
     3. A remembered value that is not a same-site *.html path (another
        site, a protocol-relative URL, javascript:) is never followed: after
        signing in the reader stays on the home page. OPEN REDIRECT.
     4. Signing in normally, with no email link involved, never redirects.
        UNASKED REDIRECT.

   Exits 1 on any failure. */
const { chromium, executablePath, BASE } = require('./env');

const KEY = 'egybi.return';

(async () => {
  const b = await chromium.launch({ executablePath });
  let fails = 0;
  const fail = m => { console.log('FAIL ' + m); fails++; };

  async function context() {
    const ctx = await b.newContext();
    await ctx.route('**/*', r => {
      const u = r.request().url();
      if (/\/auth\/auth\.php\?action=/.test(u)) {
        const a = new URL(u).searchParams.get('action');
        const body = {
          me: { ok: true, user: null, google: { enabled: false, client_id: '' } },
          signup: { ok: true, message: 'Check your email to verify your account.' },
          verify: { ok: true, message: 'Email verified — you can now sign in.' },
          login: { ok: true, csrf: 'test-csrf', user: { email: 't@example.org', plan: 'free', name: 'Scribe-TEST', verified: true } }
        }[a] || { ok: false, message: 'Unknown action.' };
        return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      }
      return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort();
    });
    return ctx;
  }
  async function signInFromLink(p) {
    await p.goto(BASE + '/index.html?verify=0123456789abcdef');
    await p.waitForSelector('#authModal #authEmail', { timeout: 15000 });
    await p.fill('#authEmail', 't@example.org');
    await p.fill('#authPw', 'a long enough password');
    await p.click('#authModal .auth-submit');
    await p.waitForTimeout(2500);
    return new URL(p.url()).pathname;
  }

  // 1 + 2
  {
    const ctx = await context(); const p = await ctx.newPage();
    await p.goto(BASE + '/community.html');
    await p.evaluate(() => window.EGYBI.account.open('up'));
    await p.waitForSelector('#authModal #authEmail', { timeout: 15000 });
    await p.fill('#authEmail', 't@example.org');
    await p.fill('#authPw', 'a long enough password');
    await p.click('#authModal .auth-submit');
    await p.waitForTimeout(1500);
    const kept = await p.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
    if (!kept || kept.p !== '/community.html') fail('NO RETURN: signing up on community.html remembered ' + JSON.stringify(kept));
    else console.log('ok   signing up on community.html remembered /community.html');
    const at = await signInFromLink(p);
    if (at !== '/community.html') fail('NO RETURN: after the email link and sign-in the reader is on ' + at);
    else console.log('ok   after the email link and sign-in, back on /community.html');
    await ctx.close();
  }

  // 3: hostile remembered values are never followed
  for (const bad of ['//evil.example/x.html', 'https://evil.example/x.html', 'javascript:alert(1)', '/community.html?next=//evil.example']) {
    const ctx = await context(); const p = await ctx.newPage();
    await p.goto(BASE + '/index.html');
    await p.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify({ p: v, t: Date.now() })), [KEY, bad]);
    const at = await signInFromLink(p);
    const host = new URL(p.url()).host;
    if (host !== new URL(BASE).host || at !== '/index.html') fail(`OPEN REDIRECT: remembered "${bad}" sent the reader to ${p.url()}`);
    else console.log(`ok   remembered "${bad}" was ignored`);
    await ctx.close();
  }

  // 4: an ordinary sign-in never redirects, even with a remembered page
  {
    const ctx = await context(); const p = await ctx.newPage();
    await p.goto(BASE + '/index.html');
    await p.evaluate(k => localStorage.setItem(k, JSON.stringify({ p: '/community.html', t: Date.now() })), KEY);
    await p.evaluate(() => window.EGYBI.account.open('in'));
    await p.waitForSelector('#authModal #authEmail', { timeout: 15000 });
    await p.fill('#authEmail', 't@example.org');
    await p.fill('#authPw', 'a long enough password');
    await p.click('#authModal .auth-submit');
    await p.waitForTimeout(2000);
    const at = new URL(p.url()).pathname;
    // A sign-in that never happened also "stays put". Run 43914963730 missed
    // the UNASKED REDIRECT mutation that way: the offline worker had taken the
    // page, its login request went around this check's stub to the preview
    // server, and the reader was never signed in, mutated or not. env.js now
    // blocks workers; this line makes a failed sign-in loud instead of green.
    const signed = await p.evaluate(() => localStorage.getItem('egybi.account'));
    if (signed !== '1') fail('SIGN-IN NEVER HAPPENED: the ordinary sign-in in case 4 did not sign the reader in, so it proves nothing');
    else if (at !== '/index.html') fail('UNASKED REDIRECT: an ordinary sign-in moved the reader to ' + at);
    else console.log('ok   an ordinary sign-in stays on the page it happened on');
    await ctx.close();
  }

  await b.close();
  console.log(fails ? fails + ' failure(s)' : 'auth-return: all checks pass');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
