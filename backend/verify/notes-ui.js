/* Travellers' notes on community.html, in a real browser (Round 4, R4-2b).

   CI serves site/ statically, so the two PHP endpoints are answered here
   (Playwright route): auth/auth.php?action=me says "signed out", and
   api/notes.php returns fixture notes, two of them hostile. Fails on:

     MARKUP INJECTED   a note's text became HTML (an <img>/<script> element
                       inside a card, or the onerror/script ran);
     NOT SHOWN         the section stayed hidden, or a fixture note is missing;
     FILTER IGNORED    choosing a place did not ask the API for that place;
     NO SIGN-IN        "Share your experience" signed out did not open the
                       site's sign-in dialog;
     SHOWN WHILE OFF   the API says notes are switched off and the section
                       still shows.
   Exits 1 on any. */
const { chromium, executablePath, BASE } = require('./env');

const HOSTILE_IMG = '<img src=x onerror="window.__pwned=1">';
const HOSTILE_SCRIPT = '<script>window.__pwned=2</script>';
const NOTES = [
  { id: 'a1', name: 'Scribe-A1B2', sites: ['giza'], place: '', month: '2026-10', helpful: 3, at: '2026-11-10T08:00:00+00:00', mine: false,
    body: 'Go at opening time. ' + HOSTILE_IMG + ' The plateau was quiet for an hour.' },
  { id: 'b2', name: HOSTILE_SCRIPT, sites: ['karnak', 'giza'], place: HOSTILE_IMG, month: '', helpful: 0, at: '2026-11-09T08:00:00+00:00', mine: false,
    body: 'Hire a guide at the gate. ' + HOSTILE_SCRIPT },
];
const SITES = ['giza', 'saqqara', 'karnak'];

async function page(b, mode) {
  const p = await b.newPage({ viewport: { width: 390, height: 900 } });
  const asked = [];
  await p.route('**/*', r => {
    const u = r.request().url();
    if (u.includes('/auth/auth.php')) {
      return r.fulfill({ contentType: 'application/json',
        body: JSON.stringify({ ok: true, user: null, google: { enabled: false, client_id: '' } }) });
    }
    if (u.includes('/api/notes.php')) {
      asked.push(u);
      if (mode === 'off') return r.fulfill({ status: 404, contentType: 'application/json',
        body: JSON.stringify({ ok: false, disabled: true, message: 'off' }) });
      const site = new URL(u).searchParams.get('site') || '';
      const notes = site ? NOTES.filter(n => n.sites.includes(site)) : NOTES;
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, notes, sites: SITES }) });
    }
    return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort();
  });
  await p.goto(`${BASE}/community.html`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  return { p, asked };
}

(async () => {
  const b = await chromium.launch({ executablePath });
  const bad = [];

  // 1. notes on: shown, as text, filterable, sign-in on write
  const { p, asked } = await page(b, 'on');
  const s = await p.evaluate(() => {
    const root = document.getElementById('notes');
    const cards = [...document.querySelectorAll('#notesList .note-card')];
    return {
      hidden: !root || root.hidden || getComputedStyle(root).display === 'none',
      cards: cards.length,
      injected: document.querySelectorAll('#notesList img, #notesList script').length,
      pwned: window.__pwned || 0,
      text: cards.map(c => c.textContent).join(' | '),
    };
  });
  if (s.hidden) bad.push('NOT SHOWN  the notes section is hidden while the API is on');
  if (s.cards !== 2) bad.push(`NOT SHOWN  ${s.cards} note cards, expected 2`);
  if (s.injected || s.pwned) bad.push(`MARKUP INJECTED  ${s.injected} img/script elements in the list, __pwned=${s.pwned}`);
  if (!s.text.includes('<img src=x')) bad.push('MARKUP INJECTED  the hostile text is not visible as text');
  if (!s.text.includes('<script>window.__pwned=2</script>')) bad.push('MARKUP INJECTED  the hostile name is not visible as text');

  await p.selectOption('#notesSite', 'karnak');
  await p.waitForTimeout(800);
  const filtered = await p.$$eval('#notesList .note-card', cs => cs.length);
  if (!asked.some(u => u.includes('site=karnak'))) bad.push('FILTER IGNORED  no request asked for site=karnak');
  if (filtered !== 1) bad.push(`FILTER IGNORED  ${filtered} cards for Karnak, expected 1`);

  await p.click('#notesWrite');
  await p.waitForTimeout(2500);
  const dialog = await p.evaluate(() => {
    const m = document.getElementById('authModal');
    return !!m && getComputedStyle(m).display !== 'none' && !m.hidden;
  });
  const formOpen = await p.evaluate(() => !document.getElementById('notesForm').hidden);
  if (!dialog) bad.push('NO SIGN-IN  "Share your experience" signed out did not open the sign-in dialog');
  if (formOpen) bad.push('NO SIGN-IN  the composer opened for a signed-out reader');
  await p.close();

  // 2. notes off: the section stays hidden
  const off = await page(b, 'off');
  const offHidden = await off.p.evaluate(() => { const r = document.getElementById('notes'); return !r || r.hidden; });
  if (!offHidden) bad.push('SHOWN WHILE OFF  the API says notes are off and the section shows');
  await off.p.close();

  await b.close();
  bad.forEach(x => console.log(x));
  console.log(bad.length ? `notes ui: ${bad.length} problem(s)` :
    `notes ui: 2 notes shown as text (hostile markup stayed text), filter asked the API, sign-in opened on write, hidden while off`);
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
