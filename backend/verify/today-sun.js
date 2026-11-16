/* "Today at this site" must agree with the light table (Round 4, R4-1).

   1. MATH: assets/today.js's port of the NOAA equations against
      backend/pipeline/sun_times.py, for all 18 visit sites on the 15th of all
      12 months of 2026 (and on the two summer-time switch days): every edge
      of the day within 60 s. Fails with SUN TIMES DIFFER.
   2. PAGE: visit/giza.html with the browser clock fixed at 2026-07-15 10:00
      Egypt time (UTC+3 in summer): the card must show the four times the
      Python gives for that day, a status line and July's normal. Fails with
      CARD WRONG or CARD MISSING.
   Exits 1 on any; VACUOUS if fewer than 200 comparisons were made. */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { chromium, executablePath, BASE } = require('./env');
const Sun = require('../../site/assets/today.js');

const ROOT = path.join(__dirname, '..', '..');
const sites = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data/visit-climate.json'), 'utf8')).sites;
const PY = `
import sys, json, datetime as dt
sys.path.insert(0, ${JSON.stringify(path.join(ROOT, 'backend', 'pipeline'))})
import sun_times as s
req = json.loads(sys.stdin.read()); out = []
for lat, lon, y, m, d in req:
    L = s.day_light(dt.date(y, m, d), lat, lon)
    out.append([int(getattr(L, k).timestamp() * 1000) for k in ('sunrise', 'golden_morning_end', 'golden_evening_start', 'sunset')])
print(json.dumps(out))
`;
const KEYS = ['sunrise', 'goldenMorningEnd', 'goldenEveningStart', 'sunset'];
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

(async () => {
  const bad = [];
  const req = [];
  for (const s of sites) {
    for (let m = 1; m <= 12; m++) req.push([s.lat, s.lon, 2026, m, 15]);
    req.push([s.lat, s.lon, 2026, 4, 24], [s.lat, s.lon, 2026, 10, 29]);
  }
  const want = JSON.parse(execFileSync(python, ['-c', PY], { input: JSON.stringify(req), encoding: 'utf8' }));
  let n = 0, worst = 0;
  req.forEach(([lat, lon, y, m, d], i) => {
    const got = Sun.dayLight(lat, lon, y, m, d);
    KEYS.forEach((k, j) => {
      n++;
      const diff = Math.abs(got[k] - want[i][j]) / 1000;
      worst = Math.max(worst, diff);
      if (diff > 60) bad.push(`SUN TIMES DIFFER  ${lat},${lon} ${y}-${m}-${d} ${k}: ${diff.toFixed(0)} s apart`);
    });
  });

  // 2. the card on a real page, at a fixed moment
  const giza = sites.find(s => s.key === 'giza');
  const L = Sun.dayLight(giza.lat, giza.lon, 2026, 7, 15);
  const hm = ms => new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms));
  const expect = KEYS.map(k => hm(L[k]));
  const b = await chromium.launch({ executablePath });
  const p = await b.newPage({ viewport: { width: 390, height: 900 } });
  await p.clock.setFixedTime(new Date('2026-07-15T07:00:00Z'));
  await p.route('**/*', r => { const u = r.request().url();
    return (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) ? r.continue() : r.abort(); });
  await p.goto(`${BASE}/visit/giza.html`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(800);
  const card = await p.evaluate(() => {
    const c = document.querySelector('[data-today]');
    if (!c) return null;
    return { ready: c.getAttribute('data-today-ready'), text: c.textContent,
             times: [...c.querySelectorAll('.today-cell dd')].map(e => e.textContent.trim()),
             status: (c.querySelector('.today-status') || {}).textContent || '' };
  });
  await b.close();
  if (!card) bad.push('CARD MISSING  visit/giza.html has no [data-today] card');
  else {
    if (card.ready !== '1') bad.push('CARD WRONG  the card was not filled in');
    if (JSON.stringify(card.times) !== JSON.stringify(expect)) bad.push(`CARD WRONG  times ${card.times.join(' ')} vs ${expect.join(' ')}`);
    if (!/Golden light returns in/.test(card.status)) bad.push(`CARD WRONG  status at 10:00 Egypt time was "${card.status}"`);
    if (!/July afternoon here reaches about \d+/.test(card.text)) bad.push('CARD WRONG  no July normal on the card');
  }

  bad.slice(0, 20).forEach(x => console.log(x));
  if (n < 200) { console.log(`VACUOUS: only ${n} comparisons`); process.exit(1); }
  console.log(bad.length ? `today: ${bad.length} problem(s)` :
    `today: ${n} sun-time edges match the Python within ${worst.toFixed(1)} s (18 sites, 14 dates); the Giza card shows ${expect.join(' / ')} at a fixed 10:00`);
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
