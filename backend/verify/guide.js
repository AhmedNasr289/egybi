/* "The guide features show what they claim, safely." (R4-2c and Round 5 M3)

   1. Travellers' notes on a visit page (assets/visit-notes.js), with the notes
      API answered here because CI serves the site statically:
        - two notes, one hostile, render as text: VISIT NOTES NOT SHOWN /
          MARKUP INJECTED;
        - notes switched off keep the plain link to the community page:
          NO FALLBACK;
        - no notes yet invites the first one: NO FALLBACK.
   2. The reading-progress line on a story (assets/progress.css): half way
      down, it is about half wide: NO READING PROGRESS. Under reduced motion
      there is no line: PROGRESS UNDER REDUCED MOTION.

   Exits 1 on any failure. */
const { chromium, executablePath, BASE } = require('./env');

const HOSTILE = '<img src=x onerror="window.__pwned=1">';
const NOTES = [
  { id: 'a1', name: 'Scribe-A1B2', sites: ['giza'], place: '', month: '2026-10', body: 'We went at opening time and had the plateau almost to ourselves for an hour.', helpful: 2, at: '2026-11-10T08:00:00+00:00', mine: false, marked: false },
  { id: 'b2', name: HOSTILE, sites: ['giza'], place: '', month: '', body: HOSTILE + ' and a long enough honest note about the camels.', helpful: 0, at: '2026-11-09T08:00:00+00:00', mine: false, marked: false }
];

(async () => {
  const b = await chromium.launch({ executablePath });
  let fails = 0;
  const fail = m => { console.log('FAIL ' + m); fails++; };

  async function visit(answer) {
    const ctx = await b.newContext();
    await ctx.route('**/*', r => {
      const u = r.request().url();
      if (/\/api\/notes\.php\?/.test(u)) return r.fulfill({ status: answer.status || 200, contentType: 'application/json', body: JSON.stringify(answer.body) });
      return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort();
    });
    const p = await ctx.newPage();
    await p.goto(BASE + '/visit/giza.html');
    await p.waitForTimeout(1500);
    const out = await p.evaluate(() => {
      const box = document.querySelector('[data-visit-notes]');
      return box ? { cards: box.querySelectorAll('.note-card').length, imgs: box.querySelectorAll('img').length, pwned: !!window.__pwned,
        text: box.textContent, links: [...box.querySelectorAll('a')].map(a => a.getAttribute('href')) } : null;
    });
    await ctx.close();
    return out;
  }

  // 1a. two notes, one hostile
  let v = await visit({ body: { ok: true, notes: NOTES, sites: ['giza'] } });
  if (!v || v.cards !== 2) fail('VISIT NOTES NOT SHOWN: ' + (v ? v.cards + ' cards' : 'no section'));
  else console.log('ok   giza shows its 2 notes');
  if (v && (v.imgs || v.pwned || !v.text.includes('<img src=x'))) fail('MARKUP INJECTED: a note became markup on the visit page');
  else if (v) console.log('ok   a hostile note stays text on the visit page');
  if (v && !v.links.some(h => /community\.html\?site=giza#notes/.test(h))) fail('NO FALLBACK: no link to all notes about Giza');
  // 1b. notes switched off: the plain link stays
  v = await visit({ status: 404, body: { ok: false, disabled: true } });
  if (!v || v.cards || !v.links.some(h => /community\.html\?site=giza#notes/.test(h))) fail('NO FALLBACK: with notes off the link to the community page is gone');
  else console.log('ok   with notes off, the plain link to the community page stays');
  // 1c. no notes yet
  v = await visit({ body: { ok: true, notes: [], sites: ['giza'] } });
  if (!v || !/No notes about .+ yet/.test(v.text) || !v.links.length) fail('NO FALLBACK: an empty list does not invite the first note');
  else console.log('ok   with no notes yet, it invites the first one');

  // 2. the reading-progress line
  for (const reduce of [false, true]) {
    const ctx = await b.newContext({ reducedMotion: reduce ? 'reduce' : 'no-preference', viewport: { width: 1280, height: 800 } });
    await ctx.route('**/*', r => { const u = r.request().url();
      return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort(); });
    const p = await ctx.newPage();
    await p.goto(BASE + '/papyrus/the-stones-that-left.html');
    await p.waitForTimeout(600);
    const r = await p.evaluate(async () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      window.scrollTo(0, Math.round(max / 2));
      await new Promise(res => setTimeout(res, 400));
      const bar = document.querySelector('.read-progress');
      if (!bar) return { missing: true };
      const cs = getComputedStyle(bar);
      const m = /matrix\(([-\d.e]+)/.exec(cs.transform);
      return { display: cs.display, scale: m ? parseFloat(m[1]) : null, want: scrollY / max };
    });
    if (r.missing) fail('NO READING PROGRESS: no line on the story');
    else if (!reduce && (r.display === 'none' || r.scale == null || Math.abs(r.scale - r.want) > 0.08))
      fail(`NO READING PROGRESS: half way down the line reads ${r.scale} (display ${r.display}), want about ${r.want.toFixed(2)}`);
    else if (reduce && r.display !== 'none') fail('PROGRESS UNDER REDUCED MOTION: the line is shown');
    else console.log(reduce ? 'ok   reduced motion: no progress line' : `ok   half way down a story the line is ${r.scale.toFixed(2)} wide (scrolled ${r.want.toFixed(2)})`);
    await ctx.close();
  }

  await b.close();
  console.log(fails ? fails + ' failure(s)' : 'guide: all checks pass');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
