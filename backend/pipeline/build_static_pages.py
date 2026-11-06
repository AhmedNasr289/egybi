#!/usr/bin/env python3
"""
EgyBI — static page generator (SEO).

The challenge catalogue and the blog both live inside JavaScript files and are
rendered client-side, which means 135 pieces of real content had exactly zero
indexable URLs. This script renders a real HTML page for every challenge and
every post, so each one can be found, linked and shared on its own.

It writes:
    site/practice/<challenge-title-slug>.html   (one RETIRED-page notice each)
    site/papyrus/<post-id>.html                 (one per newsletter issue)
    site/sitemap.xml                            (regenerated)
    site/feed.xml                               (The Papyrus RSS)

Design notes:
  * The nav and footer are lifted from site/blog.html at build time rather than
    duplicated here, so the generated pages cannot drift from the real site.
    Editing blog.html's nav therefore updates all 135 generated pages.
  * Pages live one directory deep, so relative asset paths are rewritten to ../

THE PRACTICE SECTION IS RETIRED (2026-08-07)
--------------------------------------------
EgyBI is now an encyclopaedia of Egypt built on GIS and data storytelling, not
a SQL practice platform. The 123 challenge URLs are indexed and are the site's
only real search presence, so they are NOT deleted and NOT redirected — each
one keeps its URL and returns 200 with a retirement notice.

Redirects were considered and rejected. 123 pages collapsing onto ~10 section
anchors is a many-to-few redirect that search engines treat as a soft 404 and
drop, which would lose both the explanation and the traffic. A 200 page with
genuinely distinct content keeps ranking for its own long tail while routing
the reader onward.

What each retired page keeps is the part that was always about Egypt rather
than about SQL: the question itself and the sourced "did you know" note. What
it drops is the schema, the starter query and the links to sibling challenges —
tombstones linking to tombstones is a crawl trap with nothing at the end of it.

The onward link is chosen by the challenge's own `sector` field via
SECTOR_DESTINATION below, so re-pointing a whole sector when new encyclopaedia
sections land is a one-line change.

The Papyrus (site/papyrus/) is NOT part of this retirement. It is the
newsletter archive and the site's only long-form writing about Egypt, which is
precisely what the encyclopaedia is built on.

Run:  python backend/pipeline/build_static_pages.py
"""
import datetime as _dt
import io, json, os, re, subprocess, sys, html

def _force_utf8_output() -> None:
    """Make stdout/stderr safe for non-ASCII on every platform.

    A Windows console defaults to a legacy code page that cannot encode many
    characters this pipeline handles, so a plain print() can kill an otherwise
    successful run with UnicodeEncodeError. UTF-8 writes correct bytes wherever
    the terminal supports it; errors="replace" degrades to '?' on a genuinely
    legacy console instead of taking the job down. File output is unaffected —
    writers specify their own encoding.
    """
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError, OSError):
            pass          # Python < 3.7, or a stream that cannot be reconfigured


_force_utf8_output()


# Import the sibling module by path, so this works however the script is run
# (python -I / -P does not put the script's own folder on sys.path).
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sitemap_lastmod  # noqa: E402
import sun_times  # noqa: E402
import heat_calendar  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE = os.path.join(ROOT, 'site')
SITE_URL = 'https://egybi.com'
# Sitemap <lastmod> dates are per page now — see sitemap_lastmod.py. The
# history: a literal '2026-08-07' froze every date; replacing it with the run
# date then stamped all 50 URLs with whichever day the generator last ran.

# Where a retired challenge sends its reader, keyed by the challenge's own
# `sector`. Every destination below is a section that EXISTS today — verified
# against the anchors in explore.html and geospatial.html — because sending a
# retired page to a URL that 404s would be worse than leaving it alone.
#
# When the encyclopaedia's own sections land, re-point a whole sector by
# editing one line here; nothing else in the pipeline knows about this mapping.
SECTOR_DESTINATION = {
    # 48 challenges. "Egypt from the Ptolemies to today" is a sourced timeline
    # of eras and turning points — the closest real home for the history set.
    'History':         ('explore.html#timeline',      'the sourced timeline of Egypt’s eras'),
    'Economy':         ('explore.html#economy',       'Egypt’s economy in charts'),
    'Business':        ('explore.html#business',      'business and industry data'),
    'Industry':        ('explore.html#industry',      'industry data'),
    'Logistics':       ('explore.html#logistics',     'trade and logistics data'),
    'Suez Canal':      ('explore.html#logistics',     'trade and logistics data'),
    'Agriculture':     ('explore.html#agriculture',   'land and water data'),
    'Water':           ('explore.html#water',         'land and water data'),
    'Sports':          ('explore.html#sports',        'sport in Egypt'),
    'Art & Cinema':    ('explore.html#cinema',        'a century of Egyptian cinema'),
    'Science & Space': ('explore.html#science',       'science and space data'),
    'Defence':         ('explore.html#defence',       'defence data'),
    # These three go to the Atlas rather than Explore, because the map is the
    # better answer: governorate population, the schools overlay, and the seven
    # World Heritage sites are all layers on it.
    'Demographics':    ('geospatial.html#governorates', 'population by governorate on the Atlas'),
    'Education':       ('geospatial.html#map',          'schools mapped across Egypt on the Atlas'),
    'Tourism':         ('geospatial.html#heritage',     'the seven World Heritage sites on the Atlas'),
}
# Any sector not listed above goes home rather than to a guessed URL.
DEFAULT_DESTINATION = ('index.html', 'the rest of EgyBI')

def slug(s):
    return re.sub(r'^-|-$', '', re.sub(r'[^a-z0-9]+', '-', s.lower()))

def esc(s):
    return html.escape(str(s or ''), quote=True)

def load_js():
    """Read the two data files through node so we parse them exactly as the browser does."""
    js = (
        'global.window={};'
        'require(%s);require(%s);'
        'process.stdout.write(JSON.stringify({c:global.window.EGYBI_CHALLENGES,p:global.window.EGYBI_POSTS,'
        'docs:global.window.EGYBI_TABLE_DOCS}));'
    ) % (json.dumps(os.path.join(SITE, 'assets', 'challenges.js').replace('\\', '/')),
         json.dumps(os.path.join(SITE, 'assets', 'blog-posts.js').replace('\\', '/')))
    out = subprocess.run(['node', '-e', js], capture_output=True, text=True, encoding='utf-8')
    if out.returncode != 0:
        sys.exit('node failed: ' + out.stderr[:400])
    return json.loads(out.stdout)

def chrome(prefix='../'):
    """Lift the real nav + footer out of blog.html and re-root their relative paths.

    prefix='../' for pages one directory down, which is every generated page.
    prefix='/'  for a page that can be served from ANY depth — the 404, which
    Apache renders for /nonsense.html and /practice/nonsense.html alike. A
    ../-prefixed asset would 404 in its own right from the wrong depth, giving
    an error page with no stylesheet.
    """
    src = io.open(os.path.join(SITE, 'blog.html'), encoding='utf-8').read()
    head = src[src.index('<header'):src.index('</header>') + len('</header>')]
    foot = src[src.index('<footer'):src.index('</footer>') + len('</footer>')]
    def up(frag):
        # The leading / matters: a root-relative href already resolves from any
        # depth, and prefixing ../ to it produces a link that works from no
        # depth at all. Same reason the site-root price link had to become
        # root-relative in the first place.
        frag = re.sub(r'href="(?!https?:|#|/|\.\./|mailto:)', 'href="' + prefix, frag)
        frag = re.sub(r'src="(?!https?:|/|\.\./|data:)', 'src="' + prefix, frag)
        return frag
    return up(head), up(foot)

NAV, FOOT = chrome()

def page(title, desc, canonical, body, ld=None, extra_head='', prefix='../',
         nav=None, foot=None, og_image=None, canonical_link=True):
    # Parameterised because the card was hardcoded here at ?v=2, so all 135
    # generated pages would have kept advertising the retired "Practice SQL &
    # BI / 123 challenges" preview even after the file behind that URL was
    # replaced. Social platforms cache preview images by URL indefinitely, so
    # the version has to move with the bytes.
    og_image = og_image or f"{SITE_URL}/og-image.png?v=3"
    # A noindex page must NOT also claim a canonical. The two contradict each
    # other: rel=canonical declares "this URL is the preferred version of this
    # content", which only means anything about a page that is to be indexed,
    # while noindex says the opposite. Google resolves the conflict however it
    # likes, and has been known to favour the canonical — which would undo the
    # de-indexing entirely.
    #
    # Nothing is lost by dropping it. Canonicalisation exists to pick a winner
    # among indexable duplicates, and a noindexed page is not competing.
    # og:url stays: that is for sharing, not indexing, and a shared link still
    # needs to know where it points.
    #
    # Caught by all-pages.js, which already had the rule. It fired on all 123
    # pages the moment the noindex landed — the checker was right and the
    # change was wrong.
    canonical_tag = f'\n<link rel="canonical" href="{canonical}">' if canonical_link else ''
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">{canonical_tag}
<meta property="og:site_name" content="EgyBI">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{og_image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(desc)}">
<meta name="twitter:image" content="{og_image}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Egyptian+Hieroglyphs&text=%F0%93%8B%B9%F0%93%80%80%F0%93%82%80%F0%93%86%84%F0%93%86%A3%F0%93%87%8B%F0%93%87%B3%F0%93%8C%80%F0%93%8F%9B&display=swap" rel="stylesheet">
<link href="{prefix}assets/egybi.css?v=41" rel="stylesheet">
<script src="{prefix}assets/ads-config.js"></script>
{('<script type="application/ld+json">' + json.dumps(ld) + '</script>') if ld else ''}
{extra_head}
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
{nav if nav is not None else NAV}

<main id="main">
{body}
</main>

{foot if foot is not None else FOOT}
<script src="{prefix}assets/egybi.js?v=2"></script>
<script src="{prefix}assets/glyphs.js?v=3"></script>
<script src="{prefix}assets/wayfinding.js?v=1"></script>
<script src="{prefix}assets/ads.js"></script>
<script src="{prefix}assets/analytics.js"></script>
</body>
</html>
"""

def breadcrumb(name, url, parent_name, parent_url):
    """A BreadcrumbList node, for embedding in an @graph (hence no @context).

    Defined but never called until now, which is why generated pages showed a
    bare URL slug in search results rather than a Home > Practice > Name path.
    """
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "EgyBI", "item": SITE_URL + "/"},
        {"@type": "ListItem", "position": 2, "name": parent_name, "item": parent_url},
        {"@type": "ListItem", "position": 3, "name": name, "item": url}]}

def build_challenges(chs, docs):
    """Write a RETIRED-page notice at each of the 123 former challenge URLs.

    Returns [] deliberately: these pages keep resolving so existing links and
    index entries do not break, but a retired page has no business being
    advertised in the sitemap as fresh content.

    NOINDEX, ADDED 2026-08-12 — reversing the decision recorded above.
    ---------------------------------------------------------------
    The original argument was that these 123 URLs are "the site's only real
    search presence", so de-indexing them throws that presence away. That was
    true and it was still the wrong trade, because it valued the pages one at a
    time and their cost lands in aggregate:

      123 retired SQL pages  vs  27 encyclopaedia pages in the sitemap

    82% of everything crawlable here said "SQL practice", so that is the
    identity Google assigned the domain — the site was searchable, under the
    wrong name. Every individual page audited clean, which is exactly why this
    went unnoticed for months; the defect only exists at the level of the
    corpus.

    "follow" is doing real work and must stay. It keeps every one of these
    pages passing its accumulated authority down the onward link into the
    encyclopaedia section, so the equity is redirected rather than discarded —
    the concern behind the original decision is answered, not overruled.

    These pages MUST also remain crawlable. Adding "Disallow: /practice/" to
    robots.txt would look like reinforcement and would instead guarantee the
    opposite: a page Google may not fetch is a page whose noindex Google can
    never read, so all 123 would sit in the index forever. backend/verify/seo.py
    fails the build if that Disallow ever appears.
    """
    outdir = os.path.join(SITE, 'practice')
    os.makedirs(outdir, exist_ok=True)
    for c in chs:
        sl = slug(c['title'])
        url = f"{SITE_URL}/practice/{sl}.html"
        dest, dest_label = SECTOR_DESTINATION.get(c['sector'], DEFAULT_DESTINATION)

        title = f"{c['title']} | EgyBI"
        stmt = re.sub(r'\s+', ' ', c['statement']).strip()
        tail = " This SQL practice page has been retired; the Egyptian data behind it is still here."
        if len(stmt) + len(tail) > 155:
            stmt = stmt[:155 - len(tail)].rsplit(' ', 1)[0] + '...'
        desc = stmt + tail

        # A WebPage, not a LearningResource — it no longer teaches anything.
        # The breadcrumb's parent is the destination section rather than the
        # retired Practice page, so the trail points somewhere that still works.
        ld = {"@context": "https://schema.org", "@type": "WebPage",
              "name": c['title'], "url": url, "description": desc,
              "isAccessibleForFree": True,
              "publisher": {"@type": "Organization", "name": "EgyBI", "url": SITE_URL + "/"}}
        ld = {"@context": "https://schema.org", "@graph": [
            ld, breadcrumb(c['title'], url, "Explore Egypt",
                           f"{SITE_URL}/{dest.split('#')[0]}")]}

        body = f"""
<section class="surface-hero" style="padding-top:64px;padding-bottom:44px;">
  <div class="wrap" style="max-width:820px;">
    <p class="hero-eyebrow"><span data-glyph="reed"></span> {esc(c['sector'])} &middot; Retired page</p>
    <h1 style="font-size:clamp(1.6rem,5vw,2.6rem);margin:0 0 12px;">{esc(c['title'])}</h1>
    <p class="lead" style="margin:0;">{esc(c['statement'])}</p>
  </div>
</section>

<section class="surface-light">
  <div class="wrap" style="max-width:820px;">
    <div class="retired-note">
      <p><strong>This page used to be a SQL practice challenge.</strong> EgyBI is now an
      encyclopaedia of Egypt &mdash; its places, geography, infrastructure and history, told
      through maps and cited data &mdash; and the practice section has closed.</p>
      <p style="margin-bottom:0;">The Egyptian data this question was built on is still here, and still sourced:
      <a href="../{dest}">{esc(dest_label)}</a>.</p>
    </div>
    <h2 style="font-size:1.25rem;margin-top:32px;"><span data-glyph="maat"></span> About this</h2>
    <p>{esc(c['didYouKnow'])}</p>
    <p style="margin-top:30px;"><a class="btn btn-primary" href="../{dest}">{esc(dest_label.capitalize())} &rarr;</a></p>
  </div>
</section>
"""
        io.open(os.path.join(outdir, sl + '.html'), 'w', encoding='utf-8', newline='\n').write(
            page(title, desc, url, body, ld,
                 extra_head='<meta name="robots" content="noindex,follow">',
                 canonical_link=False))
    return []

def build_posts(posts):
    outdir = os.path.join(SITE, 'papyrus')
    os.makedirs(outdir, exist_ok=True)
    urls = []
    for i, p in enumerate(posts):
        sl = p['id']
        url = f"{SITE_URL}/papyrus/{sl}.html"
        # " · EgyBI" rather than " | The Papyrus · EgyBI": the old 22-character
        # tail pushed all twelve of these past the ~65 characters a SERP shows,
        # so Google truncated the end of the headline — the part carrying the
        # actual claim — to make room for a publication name that was itself
        # being cut off. Eight characters keeps the brand and returns fourteen
        # to the title. Four of the twelve are still long; those are editorial
        # headlines and the answer there is a shorter headline, not a shorter
        # brand.
        # seoTitle lets the SERP title differ from the headline. Four of
        # these run 68-72 characters even after the shorter brand tail, and
        # the fix for that is not to rewrite an author's headline — the h1,
        # the blog index and the prev/next links all keep p['title'].
        # Only what Google prints gets shortened.
        title = f"{p.get('seoTitle', p['title'])} · EgyBI"
        ex = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', p['excerpt'])).strip()
        # Trim on a word boundary rather than mid-word at 180, which is past
        # Google's snippet cut anyway.
        desc = ex if len(ex) <= 155 else ex[:152].rsplit(' ', 1)[0] + '...' 
        nxt = posts[i + 1] if i + 1 < len(posts) else None
        prv = posts[i - 1] if i > 0 else None
        more = ''.join(
            f'<li><a href="{x["id"]}.html">{esc(x["title"])}</a></li>'
            for x in [prv, nxt] if x)
        ld = {"@context": "https://schema.org", "@type": "BlogPosting",
              "headline": p['title'], "url": url, "datePublished": p['date'],
              "dateModified": p['date'], "description": desc,
              "image": SITE_URL + "/og-blog.png?v=3",
              "articleSection": p.get('tag', ''),
              "author": {"@type": "Organization", "name": "EgyBI"},
              "publisher": {"@type": "Organization", "name": "EgyBI",
                            "logo": {"@type": "ImageObject", "url": SITE_URL + "/og-image.png?v=3"}}}
        ld = {"@context": "https://schema.org", "@graph": [
            ld, breadcrumb(p['title'], url, "The Papyrus", SITE_URL + "/blog.html")]}
        body = f"""
<section class="surface-hero" style="padding-top:64px;padding-bottom:40px;">
  <div class="wrap" style="max-width:760px;">
    <p class="hero-eyebrow"><span data-glyph="scroll"></span> <a href="../blog.html">The Papyrus</a> &middot; {esc(p.get('tag',''))} &middot; {esc(p['date'])}</p>
    <h1 style="font-size:clamp(1.6rem,5vw,2.6rem);margin:0 0 12px;">{p['title']}</h1>
    <p class="lead" style="margin:0;">{p['excerpt']}</p>
  </div>
</section>

<section class="surface-light">
  <div class="wrap dropcap" style="max-width:720px;">
    {p['body']}
    <hr style="margin:34px 0;border:none;border-top:1px solid var(--line-light);">
    <p style="font-size:0.9rem;color:var(--ink-soft);">Every figure here is real and cited, and where sources disagree we say so. You can see the same data yourself &mdash; <a href="../explore.html">explore the datasets</a> or <a href="../geospatial.html">open the Atlas</a>.</p>
    {f'<h2 style="font-size:1.2rem;margin-top:28px;">More from The Papyrus</h2><ul class="plain-list">{more}</ul>' if more else ''}
  </div>
</section>
"""
        io.open(os.path.join(outdir, sl + '.html'), 'w', encoding='utf-8', newline='\n').write(
            page(title, desc, url, body, ld,
                 og_image=f"{SITE_URL}/og-blog.png?v=3"))
        urls.append((url, '0.7'))
    return urls


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
    summer = [MONTHS[d.date.month - 1] for d in days if d.utc_offset_hours == 3]
    clock = (f"Egypt time: UTC+2, and UTC+3 in {summer[0]}&ndash;{summer[-1]} (summer time)"
             if summer else "Egypt time (UTC+2)")
    return f"""    <h2 style="font-size:1.2rem;margin-top:30px;" id="light">Light for photographs</h2>
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
    clim = json.load(io.open(cpath, encoding='utf-8'))
    terr = {}
    if os.path.isfile(tpath):
        terr = {x['key']: x for x in json.load(io.open(tpath, encoding='utf-8')).get('sites', [])}
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
        under30 = [MONTHS[m['month'] - 1] for m in ms if m['t_daily_max'] < 30]
        name = site['name']
        title = f"{name} weather by month · EgyBI"
        desc = (f"{name}: what a normal afternoon and night reach in each month, from NASA "
                f"climate normals — about {round(cool['t_daily_max'])} °C in "
                f"{MONTHS[cool['month'] - 1]}, {round(hot['t_daily_max'])} °C in {MONTHS[hot['month'] - 1]}.")
        rows = ''.join(
            f"<tr><th scope=\"row\">{MONTHS[m['month'] - 1]}</th>"
            f"<td class=\"num\">{m['t_daily_max']:.0f} °C</td><td class=\"num\">{m['t_daily_min']:.0f} °C</td>"
            f"<td class=\"num\">{m.get('rain_mm_day', 0):.1f}</td>"
            f"<td class=\"num\">{m['t_record_max']:.0f} °C</td></tr>" for m in ms)
        el = terr.get(key, {}).get('elevation_m')
        others = ''.join(f'<a class="chip" href="{x["key"]}.html">{esc(x["name"])}</a>'
                         for x in sites if x['key'] != key)
        facts = [f"The coolest afternoons come in <strong>{MONTHS[cool['month'] - 1]}</strong>, at about "
                 f"{cool['t_daily_max']:.0f} °C; the hottest in <strong>{MONTHS[hot['month'] - 1]}</strong>, at about "
                 f"{hot['t_daily_max']:.0f} °C."]
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
                                           "name": f"{site.get('gov', '')} Governorate",
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
    <p class="hero-eyebrow"><span data-glyph="ra"></span> <a href="../visit.html">When to go</a> &middot; {esc(site.get('gov', ''))} &middot; measured, not marketed</p>
    <h1 style="font-size:clamp(1.6rem,5vw,2.6rem);margin:0 0 12px;">{esc(name)}, month by month.</h1>
    <p class="lead" style="margin:0;" lang="ar" dir="rtl">{esc(site.get('name_ar', ''))}</p>
  </div>
</section>

<section class="surface-light">
  <div class="wrap" style="max-width:860px;">
    <div class="sheet">
      <span class="seal" aria-hidden="true"><span data-glyph="ankh"></span></span>
      {''.join(f'<p style="margin:0 0 10px;">{x}</p>' for x in facts)}
      <div class="cta-row" style="margin-top:14px;"><a class="btn btn-primary" href="../plan.html?add={esc(key)}">Add {esc(name)} to my plan &rarr;</a>
      <a class="btn btn-ghost" href="../fair-prices.html">What things should cost &rarr;</a></div>
    </div>
    <div class="sheet" style="margin-top:18px;">
      <div class="fp-wrap"><table class="fp-table">
        <caption class="sr-only">{esc(name)}: monthly climate normals</caption>
        <thead><tr><th scope="col">Month</th><th scope="col" class="num">Afternoon</th><th scope="col" class="num">Night</th>
        <th scope="col" class="num">Rain, mm/day</th><th scope="col" class="num">Hottest hour on record</th></tr></thead>
        <tbody>{rows}</tbody></table></div>
    </div>
    <p class="chart-cap" style="margin-top:14px;">Afternoon and night are the mean daily maximum and minimum over {esc(clim.get('normal_window', '2001–2020'))}; the record is the hottest hour in that month across the whole series. Source: {esc(clim.get('source', 'NASA POWER'))}, layer dated {esc(clim.get('as_of', ''))}. These are modelled long-run averages checked against published station normals &mdash; not weather-station readings and not a forecast. <a href="../visit.html#checked">How they were checked &rarr;</a></p>
{light_html}
    <h2 style="font-size:1.2rem;margin-top:30px;">The other measured sites</h2>
    <div class="chip-row">{others}</div>
    <p style="margin-top:14px;"><a href="../egypt-weather-by-month.html">Every site, every month, in one table &rarr;</a></p>
  </div>
</section>
"""
        io.open(os.path.join(outdir, key + '.html'), 'w', encoding='utf-8', newline='\n').write(
            page(title, desc, url, body, ld, og_image=f"{SITE_URL}/og-visit.png?v=3"))
        urls.append((url, '0.7'))
    return urls


def _site_name(url):
    key = url.rsplit('/', 1)[1][:-5]
    clim = json.load(io.open(os.path.join(SITE, 'data', 'visit-climate.json'), encoding='utf-8'))
    return next((x['name'] for x in clim.get('sites', []) if x['key'] == key), key)

def build_sitemap(extra):
    # practice.html and tracks.html are retired and 301 away in .htaccess, and
    # the 123 challenge URLs return retirement notices — none of them belong in
    # a sitemap, which is a list of what you want crawled as live content.
    core = [('', '1.0', 'weekly'), ('explore.html', '0.9', 'weekly'), ('case.html', '0.9', 'monthly'), ('streets.html', '0.8', 'monthly'),
            ('blog.html', '0.8', 'weekly'), ('prices.html', '0.7', 'daily'), ('prices-ar.html', '0.7', 'daily'), ('stocks.html', '0.7', 'daily'),
            ('visit.html', '0.9', 'monthly'), ('plan.html', '0.9', 'monthly'), ('fair-prices.html', '0.9', 'monthly'),
            ('hieroglyphs.html', '0.8', 'monthly'), ('dossier.html', '0.7', 'monthly'), ('ask.html', '0.7', 'monthly'), ('geospatial.html', '0.8', 'monthly'), ('places.html', '0.8', 'monthly'), ('invest.html', '0.8', 'monthly'), ('stories.html', '0.9', 'monthly'),
            ('about.html', '0.6', 'monthly'), ('community.html', '0.6', 'monthly'), ('privacy.html', '0.3', 'yearly')]
    # Each URL carries the date ITS content last changed (sitemap_lastmod.py),
    # not the day this script ran: the run date made all 50 URLs claim one day
    # while prices.html changed daily and most pages had not changed for weeks.
    entries = [(f"{SITE_URL}/{n}", f, p) for n, p, f in core]
    entries += [(u, 'monthly', p) for u, p in extra]
    total, changed = sitemap_lastmod.write_sitemap(entries, os.path.join(SITE, 'sitemap.xml'))
    sitemap_lastmod.write_changed(changed, os.environ.get('SITEMAP_CHANGED_OUT'))
    return total


def build_feed(posts):
    """An RSS 2.0 feed for The Papyrus — discovery + a real subscribe option."""
    from email.utils import format_datetime
    from datetime import datetime, timezone
    items = []
    for p in posts:
        url = f"{SITE_URL}/papyrus/{p['id']}.html"
        desc = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', p['excerpt'])).strip()
        try:  # strptime on a fixed ISO string is deterministic (no "now")
            dt = datetime.strptime(p['date'], '%Y-%m-%d').replace(tzinfo=timezone.utc)
            pub = f"    <pubDate>{format_datetime(dt)}</pubDate>\n"
        except Exception:
            pub = ''
        cat = f"    <category>{esc(p.get('tag', ''))}</category>\n" if p.get('tag') else ''
        items.append(
            "  <item>\n"
            f"    <title>{esc(p['title'])}</title>\n"
            f"    <link>{url}</link>\n"
            f'    <guid isPermaLink="true">{url}</guid>\n'
            f"{pub}{cat}"
            f"    <description>{esc(desc)}</description>\n"
            "  </item>")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n'
           '  <title>The Papyrus — EgyBI</title>\n'
           f'  <link>{SITE_URL}/blog.html</link>\n'
           f'  <atom:link href="{SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />\n'
           '  <description>Egypt, told through its data — a monthly letter of real, cited stories from EgyBI.</description>\n'
           '  <language>en</language>\n'
           + "\n".join(items) + "\n</channel>\n</rss>\n")
    io.open(os.path.join(SITE, 'feed.xml'), 'w', encoding='utf-8', newline='\n').write(xml)
    return len(items)


def write_index_block(path, marker, html):
    """Replace a generator-owned region between HTML comment markers.

    The 123 challenge pages and 12 story pages were orphans: listed in
    sitemap.xml but linked from nowhere, because practice.html renders its
    list with JavaScript and blog.html linked only one post. Google treats
    sitemap-only URLs as low priority and passes them no internal authority,
    which is why a site with 144 URLs surfaced two of them.

    Writing between markers keeps this idempotent - the block is regenerated
    in place on every build rather than appended to.
    """
    full = os.path.join(SITE, path)
    if not os.path.isfile(full):
        return 0
    s = io.open(full, encoding='utf-8').read()
    start, end = f'<!-- {marker}:START', f'<!-- {marker}:END -->'
    i, j = s.find(start), s.find(end)
    if i == -1 or j == -1:
        return 0
    head = s[:i]
    tail = s[j + len(end):]
    block = (f'<!-- {marker}:START - generated by backend/pipeline/build_static_pages.py.\n'
             f'     Crawlable links to every generated page; edit the generator, not this. -->\n'
             f'{html}\n{end}')
    io.open(full, 'w', encoding='utf-8', newline='\n').write(head + block + tail)
    return 1


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
    clim = json.load(io.open(os.path.join(SITE, 'data', 'visit-climate.json'), encoding='utf-8'))
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
    clim = json.load(io.open(os.path.join(SITE, 'data', 'visit-climate.json'), encoding='utf-8'))
    rows = heat_calendar.rows_from_climate(clim, keys)
    if len(rows) < 2:
        return []
    url = f"{SITE_URL}/{WBM}"
    chart_rel = 'charts/' + WBM[:-len('.html')] + '.svg'
    chart_url = f"{SITE_URL}/{chart_rel}"
    n = len(rows)
    window = clim.get('normal_window', '2001-2020').replace('-', '–')
    source_line = (f"Source: {esc(clim.get('source', 'NASA POWER'))}, normals {esc(window)}, layer dated "
                   f"{esc(clim.get('as_of', ''))}. Modelled long-run averages checked against published "
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
    any blog or forum that allows HTML; it updates when the data is refreshed, and it links back here. The underlying
    data is NASA&rsquo;s, in the public domain; please keep the credit line inside the image.</p>
    <pre class="hc-code"><code>{esc(snippet)}</code></pre>
    <p class="chart-cap" style="margin-top:12px;">Or <a href="{chart_rel}">open the chart on its own</a> to save it.</p>
  </div>
</section>
"""
    nav, foot = chrome('')
    io.open(os.path.join(SITE, WBM), 'w', encoding='utf-8', newline='\n').write(
        page(title, desc, url, body, ld, extra_head=css, prefix='', nav=nav, foot=foot,
             og_image=f"{SITE_URL}/og-visit.png?v=3"))

    credit = (f"Source: {clim.get('source', 'NASA POWER')}, normals {window}. "
              f"Modelled averages, not a forecast. Chart: egybi.com/{WBM}")
    os.makedirs(os.path.join(SITE, 'charts'), exist_ok=True)
    io.open(os.path.join(SITE, chart_rel), 'w', encoding='utf-8', newline='\n').write(
        heat_calendar.svg_chart(rows, f"Egypt’s weather, month by month, at {n} sites", credit))
    return [(url, '0.9')]


def build_link_indexes(chs, posts):
    """Static, crawlable index of The Papyrus.

    The challenge index is gone with practice.html. Retired pages must not be
    linked from a live page: it would advertise them as current content and
    build an internal crawl path into 123 dead ends. They keep resolving for
    people arriving from search or an old link, which is the whole point.
    """
    n1 = 0

    sp = ['<section class="surface-light" id="all-stories">',
          '  <div class="wrap">',
          '    <h2 style="font-size:1.35rem;"><span data-glyph="scroll"></span> Every story in The Papyrus</h2>',
          '    <ul class="plain-list">']
    for x in posts:
        sp.append(f'      <li><a href="papyrus/{x["id"]}.html">{esc(x["title"])}</a></li>')
    sp += ['    </ul>', '  </div>', '</section>']
    n2 = write_index_block('blog.html', 'STORY-INDEX', chr(10).join(sp))
    return n1, n2


def build_404():
    """The page Apache serves for a URL that is not here.

    Generated rather than hand-written for the same reason the retirement
    notices are: it carries the shared nav and footer, so it cannot drift out of
    sync with them the next time the header changes.

    Every path in it is ROOT-relative. Apache renders this same file for
    /nonsense.html and for /practice/nonsense.html, so a ../-prefixed
    stylesheet would itself 404 from the wrong depth and the error page would
    arrive unstyled — an error about an error.

    No canonical and no sitemap entry: this is a status, not a document, and
    telling a crawler to index it would be inviting it to.
    """
    nav, foot = chrome('/')
    body = """<section class="surface-hero" style="padding:90px 0 70px;">
  <div class="wrap" style="max-width:760px;">
    <p class="hero-eyebrow"><span data-glyph="reed"></span> 404</p>
    <h1>That page is not here.</h1>
    <p class="lead" style="max-width:62ch;">Either the address has a typo in it, or
    something that used to live at this URL has moved. Both happen; neither is your
    fault. Here is where the country actually is.</p>
    <div class="cta-row" style="margin-top:30px;">
      <a href="/index.html" class="btn btn-primary">Back to the start &rarr;</a>
      <a href="/explore.html" class="btn btn-ghost">Egypt in data &rarr;</a>
    </div>
  </div>
</section>

<section class="surface-light" id="where" data-nav="Where to go">
  <div class="wrap" style="max-width:900px;">
    <div class="kicker"><span data-glyph="scarab"></span>Six ways in</div>
    <h2>Try one of these instead.</h2>
    <div class="grid grid-3" style="margin-top:22px;">
      <a class="card card-link" href="/visit.html"><h3>Plan a visit</h3>
        <p>Where the major sites are, how high they sit, and what a normal afternoon
        in each month actually reaches.</p></a>
      <a class="card card-link" href="/geospatial.html"><h3>The Atlas</h3>
        <p>Governorates, heritage sites, hospitals and schools on a tile-free map.</p></a>
      <a class="card card-link" href="/places.html"><h3>Places</h3>
        <p>Every place OpenStreetMap has mapped in Egypt, searchable.</p></a>
      <a class="card card-link" href="/stories.html"><h3>Data stories</h3>
        <p>The Papyrus &mdash; one figure, followed properly.</p></a>
      <a class="card card-link" href="/streets.html"><h3>Street report card</h3>
        <p>Ten districts measured on how their street networks actually connect.</p></a>
      <a class="card card-link" href="/prices.html"><h3>Daily prices</h3>
        <p>What food costs in Egypt this week, from the official series.</p></a>
    </div>
    <p class="chart-cap" style="margin-top:24px;">If you followed a link from
    somewhere on this site and landed here, that is a bug on our side rather than
    a typo on yours &mdash; <a href="mailto:hello@egybi.com">tell us</a> and it gets
    fixed.</p>
  </div>
</section>"""
    html_out = page('Page not found — EgyBI',
                    'That page is not here. Ways back into EgyBI: the Atlas, Places, '
                    'the data stories, the street report card and the daily prices.',
                    SITE_URL + '/404.html', body, prefix='/', nav=nav, foot=foot)
    # A 404 must not advertise itself as canonical content.
    html_out = re.sub(r'<link rel="canonical"[^>]*>\n', '', html_out)
    html_out = html_out.replace('<meta name="description"',
                                '<meta name="robots" content="noindex">\n<meta name="description"')
    io.open(os.path.join(SITE, '404.html'), 'w', encoding='utf-8', newline='\n').write(html_out)
    return True


def main():
    data = load_js()
    ch, posts, docs = data['c'], data['p'], data.get('docs', {})
    build_challenges(ch, docs)          # returns [] — retired pages stay out of the sitemap
    pu = build_posts(posts)
    vu = build_site_months()
    if vu:
        chips = ''.join(f'<a class="chip" href="visit/{u.rsplit("/", 1)[1]}">' +
                        esc(_site_name(u)) + '</a>' for u, _ in vu)
        write_index_block('visit.html', 'SITE-MONTHS',
            '<section class="surface-light-2" id="by-site" data-nav="Each site, by month">\n'
            '  <div class="wrap">\n    <div class="kicker"><span data-glyph="ra"></span>One page per site</div>\n'
            '    <h2>Each site, all twelve months.</h2>\n    <div class="chip-row">' + chips + '</div>\n'
            f'    <p style="margin-top:16px;"><a href="{WBM}">All {len(vu)} sites side by side, every month, in one table &rarr;</a></p>\n'
            '  </div>\n</section>')
    ng = build_guide_links(vu) if vu else 0
    wu = build_weather_by_month(vu) if vu else []
    build_link_indexes(ch, posts)
    total = build_sitemap(pu + vu + wu)
    nfeed = build_feed(posts)
    build_404()
    # Report the sector split so a mis-mapped sector is visible in the log
    # rather than discovered by a reader landing on the wrong section.
    counts = {}
    for c in ch:
        dest = SECTOR_DESTINATION.get(c['sector'], DEFAULT_DESTINATION)[0]
        counts[dest] = counts.get(dest, 0) + 1
    print(f"retired pages   : {len(ch)}")
    for dest in sorted(counts, key=lambda d: -counts[d]):
        print(f"    {counts[dest]:>4} -> {dest}")
    print(f"post pages      : {len(pu)}")
    print(f"site month pages: {len(vu)}")
    print(f"guide link pages: {ng} of {len(GUIDE_PAGES)}")
    if vu and ng < len(GUIDE_PAGES):
        # A page lost its markers: its guide links would silently stop
        # updating, and the scripts reading them would show no guide at all.
        print("::warning::VISIT-GUIDES markers missing from "
              f"{len(GUIDE_PAGES) - ng} page(s) in GUIDE_PAGES")
    print(f"sitemap URLs    : {total}")
    print(f"RSS feed items  : {nfeed}")
    print("404 page        : written (root-relative, noindex)")

if __name__ == '__main__':
    main()
