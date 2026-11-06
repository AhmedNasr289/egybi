"""Everything built from the visitor-site climate layer (site/data/visit-climate.json).

  * visit/<site>.html - one page per measured site, with its twelve months and
    the "Light for photographs" table;
  * the VISIT-GUIDES block on Places and the Atlas, linking every guide;
  * egypt-weather-by-month.html and its embeddable chart.

The climate file is read through load_climate(), once per build, rather than
once per function (and once per URL in _site_name, as it used to be).
"""
import datetime as _dt
import functools
import json
import os

import heat_calendar
import sun_times

from . import egfmt
from .common import SITE, SITE_URL, breadcrumb, chrome, esc, page, read_text, write_index_block, write_text


@functools.lru_cache(maxsize=1)
def load_climate():
    """site/data/visit-climate.json, read once per process."""
    return json.loads(read_text(os.path.join(SITE, 'data', 'visit-climate.json')))


MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
          'August', 'September', 'October', 'November', 'December']


def light_section(site, name):
    """'Light for photographs': sunrise, golden light and sunset per month.

    Computed from the site's own coordinates (sun_times.py: NOAA solar
    equations, Egypt time from the IANA database, so summer time is the
    database's rule, not one hand-coded here). Checked on 2026-11-04 against
    the independent `astral` package over all 18 sites x 12 months: worst
    difference 1.6 min for sunrise/sunset, 2.4 min for the 6-degree edges.
    The year is the build year, and the page says which year it is."""
    year = _dt.date.today().year
    days = sun_times.monthly(year, site['lat'], site['lon'])
    hm = lambda t: t.strftime('%H:%M')
    rows = ''.join(
        f"<tr><th scope=\"row\">{MONTHS[d.date.month - 1]}</th>"
        f"<td class=\"num\">{hm(d.sunrise)}</td><td class=\"num\">{hm(d.golden_morning_end)}</td>"
        f"<td class=\"num\">{hm(d.golden_evening_start)}</td><td class=\"num\">{hm(d.sunset)}</td></tr>"
        for d in days)
    lengths = [m for d in days for m in (d.golden_morning_minutes, d.golden_evening_minutes)]
    summer = sun_times.summer_time(year)
    clock = (f"Egypt time: UTC+2, and UTC+3 from {summer[0].day} {MONTHS[summer[0].month - 1]} "
             f"to {egfmt.date(summer[1], 'en', 'prose')} (summer time)"
             if summer else "Egypt time (UTC+2)")
    return f"""    <h2 style="font-size:1.2rem;margin:0 0 12px;" id="light">Light for photographs</h2>
    <p style="margin:0 0 10px;">Golden light, the warm low sun photographers wait for, lasts about {min(lengths)}&ndash;{max(lengths)} minutes after sunrise and before sunset here, depending on the month.</p>
    <div class="sheet">
      <div class="fp-wrap"><table class="fp-table">
        <caption class="sr-only">{esc(name)}: sunrise, golden light and sunset on the 15th of each month, {year}</caption>
        <thead><tr><th scope="col">15th of</th><th scope="col" class="num">Sunrise</th><th scope="col" class="num">Golden light until</th>
        <th scope="col" class="num">Golden light from</th><th scope="col" class="num">Sunset</th></tr></thead>
        <tbody>{rows}</tbody></table></div>
    </div>
    <p class="chart-cap" style="margin-top:14px;">Computed for the 15th of each month of {year} from this site's coordinates ({site['lat']:.4f}, {site['lon']:.4f}) with the NOAA Global Monitoring Laboratory solar position equations. {clock}, from the IANA time-zone database (Africa/Cairo). Golden light here means the sun less than 6&deg; above the horizon, a photographers' convention. Checked against an independent solar library to within about 3 minutes. Cliffs, dunes and temple walls are not modelled: they can hide a low sun well before these times.</p>
"""


def build_site_months():
    """One page per measured visitor site: its twelve months, as measured.

    Each answers the query a traveller actually types — "<site> weather by
    month" — from the same NASA POWER file visit.html reads, so the figures
    cannot disagree with the rest of the site. Measurement only: the page
    names the coolest and hottest afternoons and stops there, because "the
    best time to visit" depends on heat tolerance, budget and crowds, none of
    which is in the data (the ruling visit.html already states).

    Regenerated from data on every build; a site removed from the climate file
    leaves a stale page behind only until someone deletes it, so the run
    reports the count it wrote."""
    cpath = os.path.join(SITE, 'data', 'visit-climate.json')
    tpath = os.path.join(SITE, 'data', 'visit-terrain.json')
    if not os.path.isfile(cpath):
        return []
    clim = load_climate()
    terr = {}
    if os.path.isfile(tpath):
        terr = {x['key']: x for x in json.loads(read_text(tpath)).get('sites', [])}
    outdir = os.path.join(SITE, 'visit')
    os.makedirs(outdir, exist_ok=True)
    urls = []
    sites = clim.get('sites', [])
    for site in sites:
        key = site['key']
        ms = sorted([m for m in site.get('months', []) if m.get('t_daily_max') is not None],
                    key=lambda m: m['month'])
        if len(ms) != 12:
            continue
        url = f"{SITE_URL}/visit/{key}.html"
        cool = min(ms, key=lambda m: m['t_daily_max'])
        hot = max(ms, key=lambda m: m['t_daily_max'])
        under30 = [MONTHS[m['month'] - 1] for m in ms if egfmt.whole(m['t_daily_max']) < 30]
        name = site['name']
        title = f"{name} weather by month · EgyBI"
        desc = (f"{name}: what a normal afternoon and night reach in each month, from NASA "
                f"climate normals — about {egfmt.whole(cool['t_daily_max'])} °C in "
                f"{MONTHS[cool['month'] - 1]}, {egfmt.whole(hot['t_daily_max'])} °C in {MONTHS[hot['month'] - 1]}.")
        rows = ''.join(
            f"<tr><th scope=\"row\">{MONTHS[m['month'] - 1]}</th>"
            f"<td class=\"num\">{egfmt.whole(m['t_daily_max'])} °C</td><td class=\"num\">{egfmt.whole(m['t_daily_min'])} °C</td>"
            f"<td class=\"num\">{m.get('rain_mm_day', 0):.1f}</td>"
            f"<td class=\"num\">{egfmt.whole(m['t_record_max'])} °C</td></tr>" for m in ms)
        el = terr.get(key, {}).get('elevation_m')
        others = ''.join(f'<a class="chip" href="{x["key"]}.html">{esc(x["name"])}</a>'
                         for x in sites if x['key'] != key)
        facts = [f"The coolest afternoons come in <strong>{MONTHS[cool['month'] - 1]}</strong>, at about "
                 f"{egfmt.whole(cool['t_daily_max'])} °C; the hottest in <strong>{MONTHS[hot['month'] - 1]}</strong>, at about "
                 f"{egfmt.whole(hot['t_daily_max'])} °C."]
        if under30:
            facts.append(f"A normal afternoon stays under 30 °C in {len(under30)} month"
                         f"{'' if len(under30) == 1 else 's'}: {', '.join(under30)}.")
        else:
            facts.append("A normal afternoon reaches 30 °C or more in every month of the year.")
        if el is not None:
            facts.append(f"The ground at the site's coordinates sits {el:.0f} m above sea level (NASA SRTM).")
        if site.get('unesco'):
            facts.append("It is part of a UNESCO World Heritage property.")
        light_html = light_section(site, name)
        # The page is ABOUT a real place, and saying so is what lets a search
        # engine connect it to the attraction rather than read it as a loose
        # table of temperatures. Only fields this file actually holds are
        # stated: name, Arabic name, coordinates and governorate. Opening
        # hours, prices and "free entry" are deliberately absent — none of
        # them is in the data, and a wrong one in structured data is worse
        # than none.
        place_id = url + "#place"
        attraction = {"@type": "TouristAttraction", "@id": place_id, "name": name, "url": url,
                      "geo": {"@type": "GeoCoordinates", "latitude": site['lat'], "longitude": site['lon']},
                      "containedInPlace": {"@type": "AdministrativeArea",
                                           "name": f"{egfmt.gov_name(site.get('gov', ''))} Governorate",
                                           "containedInPlace": {"@type": "Country", "name": "Egypt"}}}
        if site.get('name_ar'):
            attraction["alternateName"] = site['name_ar']
        ld = {"@context": "https://schema.org", "@graph": [
            {"@type": "WebPage", "name": f"{name} weather by month", "url": url, "description": desc,
             "isPartOf": {"@id": SITE_URL + "/#site"}, "about": {"@id": place_id}},
            attraction,
            breadcrumb(f"{name} by month", url, "When to go", SITE_URL + "/visit.html")]}
        body = f"""
<section class="surface-hero" style="padding-top:64px;padding-bottom:44px;">
  <div class="wrap" style="max-width:860px;">
    <p class="hero-eyebrow"><span data-glyph="ra"></span> <a href="../visit.html">When to go</a> &middot; {esc(egfmt.gov_name(site.get('gov', '')))} &middot; measured, not marketed</p>
    <h1 style="font-size:clamp(1.6rem,5vw,2.6rem);margin:0 0 12px;">{esc(name)}, month by month.</h1>
    <p class="lead" style="margin:0;" lang="ar" dir="rtl">{esc(site.get('name_ar', ''))}</p>
  </div>
</section>

<!-- Four topics, four sections. Until 2026-11-06 all of this was one
     parchment section about 2,300 px tall; alternating the two light tones
     lets the Papyrus scroll rod mark each join (egybi.css, "The scroll rod"). -->
<section class="surface-light">
  <div class="wrap" style="max-width:860px;">
    <div class="sheet">
      <span class="seal" aria-hidden="true"><span data-glyph="ankh"></span></span>
      {''.join(f'<p style="margin:0 0 10px;">{x}</p>' for x in facts)}
      <div class="cta-row" style="margin-top:14px;"><a class="btn btn-primary" href="../plan.html?add={esc(key)}">Add {esc(name)} to my plan &rarr;</a>
      <a class="btn btn-ghost" href="../fair-prices.html">What things should cost &rarr;</a></div>
    </div>
  </div>
</section>

<section class="surface-light-2">
  <div class="wrap" style="max-width:860px;">
    <h2 style="font-size:1.2rem;margin:0 0 12px;" id="heat">Heat and rain, month by month</h2>
    <div class="sheet">
      <div class="fp-wrap"><table class="fp-table">
        <caption class="sr-only">{esc(name)}: monthly climate normals</caption>
        <thead><tr><th scope="col">Month</th><th scope="col" class="num">Afternoon</th><th scope="col" class="num">Night</th>
        <th scope="col" class="num">Rain, mm/day</th><th scope="col" class="num">Hottest hour on record</th></tr></thead>
        <tbody>{rows}</tbody></table></div>
    </div>
    <p class="chart-cap" style="margin-top:14px;">Afternoon and night are the mean daily maximum and minimum over {esc(clim.get('normal_window', '2001–2020'))}; the record is the hottest hour in that month across the whole series. Source: {esc(clim.get('source', 'NASA POWER'))}, layer dated {egfmt.time_tag(clim['as_of'], 'en', 'prose') if clim.get('as_of') else 'undated'}. These are modelled long-run averages checked against published station normals &mdash; not weather-station readings and not a forecast. <a href="../visit.html#checked">How they were checked &rarr;</a></p>
  </div>
</section>

<section class="surface-light">
  <div class="wrap" style="max-width:860px;">
{light_html}
  </div>
</section>

<section class="surface-light-2">
  <div class="wrap" style="max-width:860px;">
    <h2 style="font-size:1.2rem;margin:0 0 12px;">The other measured sites</h2>
    <div class="chip-row">{others}</div>
    <p style="margin-top:14px;"><a href="../egypt-weather-by-month.html">Every site, every month, in one table &rarr;</a></p>
  </div>
</section>
"""
        write_text(os.path.join(outdir, key + '.html'), 
            page(title, desc, url, body, ld, og_image=f"{SITE_URL}/og-visit.png?v=3"))
        urls.append((url, '0.7'))
    return urls


def _site_name(url):
    key = url.rsplit('/', 1)[1][:-5]
    return next((x['name'] for x in load_climate().get('sites', []) if x['key'] == key), key)


# The visitor guides were reachable from visit.html alone, so the two pages a
# traveller is most likely to be browsing — Places (900 points on a map) and
# the Atlas (the seven World Heritage sites) — passed them no links at all.
# Both pages draw their place details with JavaScript, which a crawler follows
# poorly, so the links are written here as plain HTML. Each link carries the
# guide's coordinates, and places.js / geospatial.js read them back to offer
# the nearest guide inside a place's detail — one list, not a second copy in
# the scripts that could drift from the pages that exist.
GUIDE_PAGES = {
    'places.html': ('surface-light',
                    'A place within 5 km of one of these sites opens with a link to its guide.'),
    'geospatial.html': ('surface-light-2',
                        'Each World Heritage card above links to the guides within 20 km of it.'),
}


def build_guide_links(urls):
    """Write the VISIT-GUIDES block into every page in GUIDE_PAGES.

    `urls` is what build_site_months wrote, so a site whose page was skipped
    (fewer than twelve months of data) is never linked. Returns the number of
    pages updated; a page without the markers is left alone and not counted."""
    keys = {u.rsplit('/', 1)[1][:-len('.html')] for u, _ in urls}
    clim = load_climate()
    sites = sorted((s for s in clim.get('sites', []) if s.get('key') in keys),
                   key=lambda s: s['name'].removeprefix('The '))
    if not sites:
        return 0
    links = ''.join(
        f'<a class="chip" href="visit/{esc(s["key"])}.html" data-guide="{esc(s["key"])}" '
        f'data-lat="{s["lat"]:.4f}" data-lon="{s["lon"]:.4f}">{esc(s["name"])}</a>'
        for s in sites)
    n = 0
    for path, (surface, how) in GUIDE_PAGES.items():
        n += write_index_block(path, 'VISIT-GUIDES',
            f'<section class="{surface}" id="guides" data-nav="Visitor guides">\n'
            '  <div class="wrap">\n'
            '    <div class="kicker"><span data-glyph="ra"></span>Visitor guides</div>\n'
            f'    <h2>{len(sites)} sites, each with a month-by-month guide.</h2>\n'
            '    <p class="lead" style="max-width:68ch;">Afternoon heat, night cold, rain and the hours '
            'of golden light for every month, measured at the site\'s own coordinates. '
            f'{how}</p>\n'
            f'    <div class="chip-row">{links}</div>\n'
            '  </div>\n</section>')
    return n


WBM = 'egypt-weather-by-month.html'


def build_weather_by_month(urls):
    """egypt-weather-by-month.html, and charts/egypt-weather-by-month.svg.

    The page: every measured site by every month in one table (heat_calendar),
    with sentences computed from the same rows. The chart: the same table as
    an SVG image, offered as an embed snippet that wraps it in a link back to
    the page — the return on giving it away.

    An image rather than an iframe on purpose: every response carries
    anti-framing headers that protect the sign-in UI, and an iframe embed
    would need a folder exempted from them. Images are not framed, so the
    embed needs no exception to any security header.

    `urls` is what build_site_months wrote, so a row never links to a page
    that was skipped. Returns sitemap entries for the page only."""
    keys = {u.rsplit('/', 1)[1][:-len('.html')] for u, _ in urls}
    clim = load_climate()
    rows = heat_calendar.rows_from_climate(clim, keys)
    if len(rows) < 2:
        return []
    url = f"{SITE_URL}/{WBM}"
    chart_rel = 'charts/' + WBM[:-len('.html')] + '.svg'
    chart_url = f"{SITE_URL}/{chart_rel}"
    n = len(rows)
    window = clim.get('normal_window', '2001-2020').replace('-', '–')
    source_line = (f"Source: {esc(clim.get('source', 'NASA POWER'))}, normals {esc(window)}, layer dated "
                   f"{egfmt.time_tag(clim['as_of'], 'en', 'prose') if clim.get('as_of') else 'undated'}. Modelled long-run averages checked against published "
                   f"station normals &mdash; not weather-station readings and not a forecast.")
    title = f"Egypt weather by month: afternoon heat at {n} sites · EgyBI"
    desc = (f"How hot a normal afternoon gets at {n} Egyptian sites, every month of the year, in one "
            f"table from NASA climate normals. Free to embed.")
    facts = ''.join(f'<p style="margin:0 0 10px;">{x}</p>' for x in heat_calendar.findings(rows))
    alt = f"Egypt weather by month: normal afternoon temperature at {n} sites, every month (EgyBI, NASA data)"
    snippet = (f'<a href="{url}"><img src="{chart_url}" alt="{alt}" '
               f'width="960" style="max-width:100%;height:auto" loading="lazy"></a>')
    css = f"<style>{heat_calendar.CSS}.hc-code{{white-space:pre-wrap;word-break:break-all;" \
          "user-select:all;font:500 .82rem/1.5 ui-monospace,Consolas,monospace;background:var(--papyrus);" \
          "border:1px solid rgba(41,36,32,.25);border-radius:8px;padding:12px 14px;margin:10px 0 0}</style>"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "name": f"Egypt weather by month, {n} sites", "url": url, "description": desc,
         "isPartOf": {"@id": SITE_URL + "/#site"}},
        {"@type": "Dataset", "name": f"Mean daily maximum temperature by month at {n} Egyptian visitor sites",
         "description": desc, "url": url, "isBasedOn": clim.get('source_url', 'https://power.larc.nasa.gov/'),
         "temporalCoverage": clim.get('normal_window', '2001-2020').replace('-', '/'),
         "spatialCoverage": {"@type": "Place", "name": "Egypt"},
         "creator": {"@type": "Organization", "name": "EgyBI", "url": SITE_URL + "/"}},
        breadcrumb("Egypt weather by month", url, "When to go", SITE_URL + "/visit.html")]}
    body = f"""
<section class="surface-hero" style="padding-top:64px;padding-bottom:44px;">
  <div class="wrap" style="max-width:960px;">
    <p class="hero-eyebrow"><span data-glyph="ra"></span> <a href="visit.html">When to go</a> &middot; {n} sites &middot; measured, not marketed</p>
    <h1 style="font-size:clamp(1.6rem,5vw,2.6rem);margin:0 0 12px;">Egypt&rsquo;s weather, month by month, at {n} sites.</h1>
    <p class="lead" style="margin:0;max-width:68ch;">How hot a normal afternoon gets at each site in each month. Heat is
    most of the planning problem in Egypt, and it depends on where as much as on when.</p>
  </div>
</section>

<section class="surface-light" id="table" data-nav="The table">
  <div class="wrap" style="max-width:960px;">
    <div class="sheet">
      <span class="seal" aria-hidden="true"><span data-glyph="ankh"></span></span>
      {facts}
    </div>
    <div class="sheet" style="margin-top:18px;">
      {heat_calendar.legend_html()}
      {heat_calendar.table_html(rows)}
    </div>
    <p class="chart-cap" style="margin-top:14px;">{source_line} Each site name opens its own page, with nights,
    rain and the hours of golden light. <a href="visit.html#checked">How the figures were checked &rarr;</a></p>
    <div class="cta-row" style="margin-top:18px;"><a class="btn btn-primary" href="plan.html">Plan a route &rarr;</a>
    <a class="btn btn-ghost" href="visit.html">Pick a month on the map &rarr;</a></div>
  </div>
</section>

<section class="surface-light-2" id="embed" data-nav="Use this chart">
  <div class="wrap" style="max-width:960px;">
    <div class="kicker"><span data-glyph="scroll"></span>Free to use</div>
    <h2>Put this chart on your own site.</h2>
    <p class="lead" style="max-width:68ch;">Paste this where the chart should appear. It is an image, so it works in
    any blog or forum that allows HTML, and it links back here. When the data is refreshed, copies on other sites
    follow within a week, as browsers re-check the image. The underlying
    data is NASA&rsquo;s, in the public domain; please keep the credit line inside the image.</p>
    <pre class="hc-code"><code>{esc(snippet)}</code></pre>
    <p class="chart-cap" style="margin-top:12px;">Or <a href="{chart_rel}">open the chart on its own</a> to save it.</p>
  </div>
</section>
"""
    nav, foot = chrome('')
    write_text(os.path.join(SITE, WBM), 
        page(title, desc, url, body, ld, extra_head=css, prefix='', nav=nav, foot=foot,
             og_image=f"{SITE_URL}/og-visit.png?v=3"))

    credit = (f"Source: {clim.get('source', 'NASA POWER')}, normals {window}. Modelled averages, not a forecast.",
              f"Chart: egybi.com/{WBM}")
    os.makedirs(os.path.join(SITE, 'charts'), exist_ok=True)
    write_text(os.path.join(SITE, chart_rel), 
        heat_calendar.svg_chart(rows, f"Egypt’s weather, month by month, at {n} sites", credit))
    return [(url, '0.9')]


def build_visit_index(urls):
    """The SITE-MONTHS block on visit.html: a chip per generated site page, and
    the link to the all-sites table. Returns 1 if the block was written."""
    chips = ''.join(f'<a class="chip" href="visit/{u.rsplit("/", 1)[1]}">' +
                    esc(_site_name(u)) + '</a>' for u, _ in urls)
    return write_index_block('visit.html', 'SITE-MONTHS',
        '<section class="surface-light-2" id="by-site" data-nav="Each site, by month">\n'
        '  <div class="wrap">\n    <div class="kicker"><span data-glyph="ra"></span>One page per site</div>\n'
        '    <h2>Each site, all twelve months.</h2>\n    <div class="chip-row">' + chips + '</div>\n'
        f'    <p style="margin-top:16px;"><a href="{WBM}">All {len(urls)} sites side by side, every month, in one table &rarr;</a></p>\n'
        '    <p style="margin-top:8px;"><a href="egypt-public-holidays.html">Public holidays, with Ramadan and Eid dates &rarr;</a></p>\n'
        '  </div>\n</section>')
