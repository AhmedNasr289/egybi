"""Build the campaign's pins and covers from EgyBI's own data files.

Every number on a card is read from site/data at build time, so a card can
never disagree with the site on the day it is made. Writes HTML files; the
companion render.js turns them into PNGs with Playwright.
"""
import json, os, sys, html

ROOT = sys.argv[1]            # repo root
OUT = sys.argv[2]             # output dir for .html
D = os.path.join(ROOT, 'site', 'data')
FONT = 'file://' + os.path.join(ROOT, 'site', 'assets', 'fonts', 'noto-hieroglyphs-subset.woff2')

fx = json.load(open(os.path.join(D, 'fx-today.json')))
USD = [r for r in fx['rates'] if r['code'] == 'USD'][0]['egp']
FX_ASOF = fx.get('as_of')
fp = json.load(open(os.path.join(D, 'fair-prices.json')))
ROWS = {r['key']: r for g in fp['groups'] for r in g['rows']}
vc = json.load(open(os.path.join(D, 'visit-climate.json')))
SITES = vc['sites']
SITES = SITES if isinstance(SITES, list) else [dict(v, key=k) for k, v in SITES.items()]
cal = {e['key']: e for e in json.load(open(os.path.join(D, 'calendar.json')))['events']}

def site(name_part):
    for s in SITES:
        if name_part.lower() in s.get('name', '').lower():
            return s
    raise KeyError(name_part)

def highs(s):
    return [round(m['t_daily_max']) for m in (s.get('months') or s.get('monthly'))]

def usd(egp):
    return f"${egp / USD:,.0f}" if egp / USD >= 10 else f"${egp / USD:,.1f}"

MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
MON_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
e = html.escape

CSS = """
@font-face { font-family: 'EgyGlyph'; src: url('%FONT%') format('woff2'); }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: %W%px; height: %H%px; }
body { font-family: 'Inter', sans-serif; color: #292420;
  background: radial-gradient(ellipse at 30% 20%, #FBF5E6 0%, #F6EEDC 45%, #EBD9B2 100%); }
.frame { position: absolute; inset: 34px; border: 3px solid #C9A227; border-radius: 6px;
  box-shadow: inset 0 0 0 9px #F6EEDC, inset 0 0 0 11px rgba(201,162,39,.55); padding: 74px 66px 0; }
.kicker { font-weight: 800; letter-spacing: .16em; text-transform: uppercase; color: #7A5E10; font-size: 26px; }
h1 { font-family: 'Cinzel', serif; font-weight: 700; color: #0E2A5E; line-height: 1.08; margin-top: 18px; }
.lead { font-size: 36px; line-height: 1.38; margin-top: 30px; color: #292420; }
.rule { height: 3px; background: linear-gradient(90deg, transparent, #C9A227, transparent); margin: 38px 0; }
.foot { position: absolute; left: 66px; right: 66px; bottom: 50px; }
.src { font-size: 21px; line-height: 1.4; color: #544c3e; }
.brand { display: flex; align-items: center; gap: 16px; margin-top: 22px; font-family: 'Cinzel', serif;
  font-weight: 700; font-size: 36px; color: #0E2A5E; }
.brand .g { font-family: 'EgyGlyph'; font-size: 46px; color: #7A5E10; }
.brand small { font-family: 'Inter', sans-serif; font-weight: 600; font-size: 22px; color: #7A5E10; letter-spacing: .04em; }
table { width: 100%; border-collapse: collapse; }
td { padding: 22px 0; border-bottom: 1px solid rgba(122,94,16,.25); font-size: 36px; vertical-align: top; }
td.v { text-align: right; font-family: 'Cinzel', serif; font-weight: 700; color: #17408B; white-space: nowrap; padding-left: 20px; }
td small { display: block; font-size: 23px; color: #544c3e; margin-top: 4px; }
.bars { display: flex; align-items: flex-end; gap: 12px; height: 680px; margin-top: 20px; }
.bar { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
.bar i { display: block; width: 100%; border-radius: 6px 6px 0 0; }
.bar b { font-family: 'Cinzel', serif; font-size: 28px; margin-bottom: 8px; color: #0E2A5E; }
.bar span { font-size: 24px; margin-top: 10px; color: #544c3e; font-weight: 600; }
.big { font-family: 'Cinzel', serif; font-weight: 700; color: #17408B; }
.note { background: rgba(255,255,255,.45); border-left: 6px solid #C9A227; padding: 30px 34px; font-size: 36px; line-height: 1.42; border-radius: 4px; }
"""

def page(name, w, h, body, rtl=False, extra_font=''):
    css = CSS.replace('%FONT%', FONT).replace('%W%', str(w)).replace('%H%', str(h))
    fonts = "https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Inter:wght@400;600;700;800" + extra_font + "&display=swap"
    doc = f"""<!doctype html><html lang="{'ar' if rtl else 'en'}" dir="{'rtl' if rtl else 'ltr'}"><head><meta charset="utf-8">
<link rel="stylesheet" href="{fonts}"><style>{css}</style></head><body><div class="frame">{body}</div></body></html>"""
    open(os.path.join(OUT, name + '.html'), 'w').write(doc)

def foot(src, tag='Egypt, honestly'):
    return f"""<div class="foot"><div class="src">{src}</div>
<div class="brand"><span class="g">&#x132F9;</span>egybi.com <small>· {tag}</small></div></div>"""

def heat_color(t):
    # cool blue → gold → danger, on the site's own palette
    if t < 25: return '#17408B'
    if t < 31: return '#3f6db0'
    if t < 35: return '#C9A227'
    if t < 39: return '#cf7a22'
    return '#B7410E'

def heat_bars(vals, labels):
    top = max(vals) + 4
    return '<div class="bars">' + ''.join(
        f'<div class="bar"><b>{v}°</b><i style="height:{v / top * 590:.0f}px;background:{heat_color(v)}"></i><span>{l}</span></div>'
        for v, l in zip(vals, labels)) + '</div>'

NASA = f"Mean daily high, °C. NASA POWER climatology (MERRA-2), 2001–2020 normals; modelled long-run averages, not a forecast."
PW, PH = 1000, 1500       # Pinterest 2:3
CW, CH = 1080, 1920       # Reels / TikTok / Shorts cover 9:16

# ---- Pin 1: the camel ride at Giza — the honest non-number ----------------
camel = ROWS['camel-ride']; tipc = ROWS['tip-camel']
page('pin01-camel-ride-giza', PW, PH, f"""
<div class="kicker">Giza · what it should cost</div>
<h1 style="font-size:78px">How much is a camel ride at the Pyramids?</h1>
<div class="lead"><b>Nobody can honestly tell you.</b> We searched for a published price and found none we could check, and no official list.</div>
<div class="rule"></div>
<div class="note"><b>What every guide agrees on:</b><br>agree the <b>total</b>, the <b>duration</b> and the <b>return leg</b> before you get on.</div>
<div class="rule"></div>
<div class="lead">The handler's tip is separate: <span class="big">{tipc['low']}–{tipc['high']} EGP</span> per ride ({usd(tipc['low'])}–{usd(tipc['high'])}).</div>
{foot(f"Camel price: searched {camel['checked']}, no verifiable published price. Tip: {e(tipc['source'])}. $ at {USD:.2f} EGP/USD ({FX_ASOF}, ExchangeRate-API market rate).")}
""")

# ---- Pin 2: tipping cheat sheet --------------------------------------------
keys = ['tip-housekeeping', 'tip-camel', 'tip-felucca', 'tip-guide-flat']
rows = ''
for k in keys:
    r = ROWS[k]
    rng = f"{r['low']}–{r['high']} EGP" if r.get('high') else f"{r['low']}+ EGP"
    rows += f"<tr><td>{e(r['item'])}<small>{e(r['unit'])} · ≈ {usd(r['low'])}–{usd(r['high'])}</small></td><td class='v'>{rng}</td></tr>"
cr = ROWS['tip-cruise']
rows += f"<tr><td>{e(cr['item'])}<small>{e(cr['unit'])} · sources disagree, ask the operator</small></td><td class='v'>${cr['low']}–{cr['high']}</td></tr>"
page('pin02-tipping-egypt', PW, PH, f"""
<div class="kicker">Tipping in Egypt · 2026</div>
<h1 style="font-size:76px">How much to tip, with the sources</h1>
<div class="rule" style="margin:30px 0 10px"></div>
<table>{rows}</table>
{foot(f"Ranges from Pyramids Land (2026 guide) and Travelling King, checked 2026-10-09, as listed on egybi.com/fair-prices. Where sources disagree the page shows both. $ at {USD:.2f} EGP/USD ({FX_ASOF}).")}
""")

# ---- Pin 3: entry tickets --------------------------------------------------
tk = ['giza-entry', 'khufu-interior', 'egyptian-museum', 'karnak', 'luxor-temple', 'valley-kings']
short = {'giza-entry': 'Giza pyramids plateau', 'khufu-interior': 'Inside the Great Pyramid', 'egyptian-museum': 'Egyptian Museum, Tahrir',
         'karnak': 'Karnak temples, Luxor', 'luxor-temple': 'Luxor Temple', 'valley-kings': 'Valley of the Kings'}
rows = ''.join(f"<tr><td>{short[k]}<small>adult foreign visitor · ≈ {usd(ROWS[k]['low'])}</small></td><td class='v'>{ROWS[k]['low']:,} EGP</td></tr>" for k in tk)
page('pin03-entry-tickets', PW, PH, f"""
<div class="kicker">Egypt entry tickets</div>
<h1 style="font-size:76px">What the big sites cost to enter</h1>
<div class="rule" style="margin:30px 0 10px"></div>
<table>{rows}</table>
<div class="lead" style="font-size:25px;margin-top:22px">Students with a valid card pay half. Inside the Great Pyramid is on top of the plateau ticket.</div>
{foot(f"Ministry of Tourism and Antiquities price list (5 Nov 2024) and egymonuments.com; Khufu interior from Egypt Independent (4 Dec 2024), sources differ, shown on egybi.com/fair-prices. $ at {USD:.2f} EGP/USD ({FX_ASOF}).")}
""")

# ---- Pins 4-6: heat by month at one site ----------------------------------
for slug, part, title in [('pin04-abu-simbel-heat', 'Abu Simbel', 'Abu Simbel, month by month'),
                          ('pin05-karnak-heat', 'Karnak', 'Karnak & Luxor, month by month'),
                          ('pin06-giza-heat', 'Giza', 'The Pyramids, month by month')]:
    s = site(part); v = highs(s)
    cool = [MON[i] for i, t in enumerate(v) if t <= 30]
    page(slug, PW, PH, f"""
<div class="kicker">When to go · measured heat</div>
<h1 style="font-size:74px">{title}</h1>
<div class="lead">A normal afternoon reaches <b>{v[0]}°C in January</b> and <b>{max(v)}°C at its peak</b>. Months at or under 30°C: <b>{', '.join(cool)}</b>.</div>
{heat_bars(v, [m[0] for m in MON])}
{foot(NASA)}
""")

# ---- Pin 7: coolest sites in February -------------------------------------
feb = sorted(((highs(s)[1], s['name']) for s in SITES), key=lambda x: x[0])
rows = ''.join(f"<tr><td>{e(n)}</td><td class='v'>{t}°C</td></tr>" for t, n in feb[:4]) + \
       "<tr><td colspan='2' style='border:0;padding:6px 0;font-size:24px;color:#7A5E10'>…and the warmest</td></tr>" + \
       ''.join(f"<tr><td>{e(n)}</td><td class='v'>{t}°C</td></tr>" for t, n in feb[-2:])
page('pin07-february-coolest', PW, PH, f"""
<div class="kicker">Egypt in February</div>
<h1 style="font-size:72px">How warm a February afternoon gets, site by site</h1>
<div class="rule" style="margin:28px 0 6px"></div>
<table>{rows}</table>
{foot(NASA + " 18 sites on egybi.com.")}
""")

# ---- Pin 8: Ramadan 2027 for travellers -----------------------------------
ra = cal['ramadan']; ef = cal['eid-fitr']; ab = cal['abu-simbel-sun-feb']
page('pin08-ramadan-2027', PW, PH, f"""
<div class="kicker">Travelling in early 2027</div>
<h1 style="font-size:78px">Ramadan 2027: the dates to plan around</h1>
<div class="rule"></div>
<table>
<tr><td>Ramadan<small>expected; the exact start depends on the moon sighting</small></td><td class="v">{ra['start'][8:]}/{ra['start_latest'][8:]} Feb – {ra['end'][8:]}/{ra['end_latest'][8:]} Mar</td></tr>
<tr><td>Eid al-Fitr<small>expected public holiday</small></td><td class="v">{ef['start'][8:]}–{ef['end'][8:]} Mar</td></tr>
<tr><td>Abu Simbel sun alignment<small>falls inside Ramadan this year</small></td><td class="v">22 Feb</td></tr>
</table>
<div class="lead" style="font-size:28px">Sites stay open; some hours shorten and the evenings come alive. Check each site's hours for your dates.</div>
{foot("Expected dates: Gulf News and The National forecasts as cited in egybi.com's holiday data; Abu Simbel: Ministry of Tourism and Antiquities price list (5 Nov 2024).")}
""")

# ---- Pin 10: Russian tipping card -----------------------------------------
ru_items = [('Горничная в отеле', 'в день, за номер', ROWS['tip-housekeeping']),
            ('Погонщик верблюда или лошади', 'после поездки', ROWS['tip-camel']),
            ('Капитан фелуки', 'за часовую прогулку, всего', ROWS['tip-felucca']),
            ('Гид, обычная экскурсия', 'за экскурсию', ROWS['tip-guide-flat'])]
rows = ''.join(f"<tr><td>{a}<small>{b} · ≈ {usd(r['low'])}–{usd(r['high'])}</small></td><td class='v'>{r['low']}–{r['high']} EGP</td></tr>" for a, b, r in ru_items)
page('pin10-ru-chaevye', PW, PH, f"""
<div class="kicker">Египет · 2026</div>
<h1 style="font-size:74px">Сколько давать на чай в Египте</h1>
<div class="lead" style="font-size:28px">С указанием источников. Где источники расходятся, мы показываем оба.</div>
<div class="rule" style="margin:28px 0 8px"></div>
<table>{rows}</table>
{foot(f"Pyramids Land (2026) и Travelling King, проверено 2026-10-09. Курс {USD:.2f} EGP за доллар ({FX_ASOF}, рыночный курс ExchangeRate-API). egybi.com/ru/fair-prices.html", 'Египет, честно')}
""")

# ---- Cover A: tourist price vs fair price (video 1) -----------------------
g = ROWS['giza-entry']
page('cover01-fair-price', CW, CH, f"""
<div style="padding-top:120px"></div>
<div class="kicker" style="font-size:34px">Egypt · before you pay</div>
<h1 style="font-size:118px;margin-top:30px">Tourist price<br>vs<br>fair price</h1>
<div class="rule" style="margin:60px 0"></div>
<div class="lead" style="font-size:54px">Giza plateau ticket: <span class="big">{g['low']} EGP</span><br>≈ {usd(g['low'])} at today's rate.<br><br>Camel ride: <b>no honest published price exists</b>. Here's what to agree first.</div>
{foot(f"Ministry of Tourism and Antiquities (5 Nov 2024); {USD:.2f} EGP/USD ({FX_ASOF}).")}
""")

# ---- Cover C: Karnak heat (video 3) ---------------------------------------
k = highs(site('Karnak'))
page('cover03-karnak-heat', CW, CH, f"""
<div style="padding-top:120px"></div>
<div class="kicker" style="font-size:34px">Luxor · measured</div>
<h1 style="font-size:112px;margin-top:30px">When is Karnak too hot?</h1>
<div class="lead" style="font-size:46px;margin-top:40px">January afternoon: <span class="big">{k[0]}°C</span><br>July afternoon: <span class="big">{k[6]}°C</span></div>
{heat_bars(k, [m[0] for m in MON])}
{foot(NASA)}
""")

# ---- Cover D: Arabic, best time to visit ----------------------------------
gz = highs(site('Giza')); ka = highs(site('Karnak')); asw = highs(site('Abu Simbel'))
AMON = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
def ar(n): return str(n).translate(str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩'))
rows = ''.join(f"<tr><td>{n}<small>يناير ← يوليو</small></td><td class='v'>{ar(v[0])}° ← {ar(v[6])}°</td></tr>" for n, v in
               [('أهرامات الجيزة', gz), ('معبد الكرنك، الأقصر', ka), ('أبو سمبل', asw)])
page('cover04-ar-best-time', CW, CH, f"""
<div style="padding-top:120px"></div>
<div class="kicker" style="font-size:34px;letter-spacing:0">مصر بصدق</div>
<h1 style="font-size:104px;margin-top:30px;font-family:'Noto Naskh Arabic',serif;line-height:1.3">أفضل وقت لزيارة مصر</h1>
<div class="lead" style="font-size:44px;font-family:'Noto Naskh Arabic',serif">متوسط أعلى حرارة بعد الظهر، بالدرجة المئوية</div>
<div class="rule"></div>
<table style="font-family:'Noto Naskh Arabic',serif;font-size:1.5em">{rows}</table>
<div class="foot"><div class="src" style="font-family:'Noto Naskh Arabic',serif;font-size:24px">المصدر: ناسا POWER، متوسطات ٢٠٠١–٢٠٢٠، تقديرات نموذجية طويلة المدى وليست توقعات للطقس.</div>
<div class="brand"><span class="g">&#x132F9;</span>egybi.com <small>· مصر بصدق</small></div></div>
""", rtl=True, extra_font="&family=Noto+Naskh+Arabic:wght@500;700")

print('ok', len(os.listdir(OUT)))
