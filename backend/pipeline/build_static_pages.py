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


ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE = os.path.join(ROOT, 'site')
SITE_URL = 'https://egybi.com'
TODAY = '2026-08-07'

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
         nav=None, foot=None):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{canonical}">
<meta property="og:site_name" content="EgyBI">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{SITE_URL}/og-image.png?v=2">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(desc)}">
<meta name="twitter:image" content="{SITE_URL}/og-image.png?v=2">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Egyptian+Hieroglyphs&text=%F0%93%8B%B9%F0%93%80%80%F0%93%82%80%F0%93%86%84%F0%93%86%A3%F0%93%87%8B%F0%93%87%B3%F0%93%8C%80%F0%93%8F%9B&display=swap" rel="stylesheet">
<link href="{prefix}assets/egybi.css?v=39" rel="stylesheet">
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
<script src="{prefix}assets/egybi.js?v=1"></script>
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
    advertised in the sitemap as fresh content. They stay indexable (no
    noindex) because dropping them from the index would throw away the exact
    search presence this whole approach exists to preserve.
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
    <p class="lead" style="margin:0;color:#e9dfc8;">{esc(c['statement'])}</p>
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
        io.open(os.path.join(outdir, sl + '.html'), 'w', encoding='utf-8').write(
            page(title, desc, url, body, ld))
    return []

def build_posts(posts):
    outdir = os.path.join(SITE, 'papyrus')
    os.makedirs(outdir, exist_ok=True)
    urls = []
    for i, p in enumerate(posts):
        sl = p['id']
        url = f"{SITE_URL}/papyrus/{sl}.html"
        title = f"{p['title']} | The Papyrus · EgyBI"
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
              "image": SITE_URL + "/og-image.png?v=2",
              "articleSection": p.get('tag', ''),
              "author": {"@type": "Organization", "name": "EgyBI"},
              "publisher": {"@type": "Organization", "name": "EgyBI",
                            "logo": {"@type": "ImageObject", "url": SITE_URL + "/og-image.png?v=2"}}}
        ld = {"@context": "https://schema.org", "@graph": [
            ld, breadcrumb(p['title'], url, "The Papyrus", SITE_URL + "/blog.html")]}
        body = f"""
<section class="surface-hero" style="padding-top:64px;padding-bottom:40px;">
  <div class="wrap" style="max-width:760px;">
    <p class="hero-eyebrow"><span data-glyph="scroll"></span> <a href="../blog.html" style="color:var(--gold-bright);">The Papyrus</a> &middot; {esc(p.get('tag',''))} &middot; {esc(p['date'])}</p>
    <h1 style="font-size:clamp(1.6rem,5vw,2.6rem);margin:0 0 12px;">{p['title']}</h1>
    <p class="lead" style="margin:0;color:#e9dfc8;">{p['excerpt']}</p>
  </div>
</section>

<section class="surface-light">
  <div class="wrap" style="max-width:720px;">
    {p['body']}
    <hr style="margin:34px 0;border:none;border-top:1px solid var(--line-light);">
    <p style="font-size:0.9rem;color:var(--ink-soft);">Every figure here is real and cited, and where sources disagree we say so. You can see the same data yourself &mdash; <a href="../explore.html">explore the datasets</a> or <a href="../geospatial.html">open the Atlas</a>.</p>
    {f'<h2 style="font-size:1.2rem;margin-top:28px;">More from The Papyrus</h2><ul class="plain-list">{more}</ul>' if more else ''}
  </div>
</section>
"""
        io.open(os.path.join(outdir, sl + '.html'), 'w', encoding='utf-8').write(
            page(title, desc, url, body, ld))
        urls.append((url, '0.7'))
    return urls

def build_sitemap(extra):
    # practice.html and tracks.html are retired and 301 away in .htaccess, and
    # the 123 challenge URLs return retirement notices — none of them belong in
    # a sitemap, which is a list of what you want crawled as live content.
    core = [('', '1.0', 'weekly'), ('explore.html', '0.9', 'weekly'), ('case.html', '0.9', 'monthly'), ('streets.html', '0.8', 'monthly'),
            ('blog.html', '0.8', 'weekly'), ('prices.html', '0.7', 'daily'), ('stocks.html', '0.7', 'daily'),
            ('visit.html', '0.9', 'monthly'), ('geospatial.html', '0.8', 'monthly'), ('places.html', '0.8', 'monthly'), ('invest.html', '0.8', 'monthly'), ('stories.html', '0.9', 'monthly'),
            ('about.html', '0.6', 'monthly'), ('community.html', '0.6', 'monthly'), ('privacy.html', '0.3', 'yearly')]
    rows = [f"  <url>\n    <loc>{SITE_URL}/{n}</loc>\n    <lastmod>{TODAY}</lastmod>\n    <changefreq>{f}</changefreq>\n    <priority>{p}</priority>\n  </url>"
            for n, p, f in core]
    rows += [f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{TODAY}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>{p}</priority>\n  </url>"
             for u, p in extra]
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(rows) + "\n</urlset>\n"
    io.open(os.path.join(SITE, 'sitemap.xml'), 'w', encoding='utf-8').write(xml)
    return len(rows)


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
    io.open(os.path.join(SITE, 'feed.xml'), 'w', encoding='utf-8').write(xml)
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
    build_link_indexes(ch, posts)
    total = build_sitemap(pu)
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
    print(f"sitemap URLs    : {total}")
    print(f"RSS feed items  : {nfeed}")
    print("404 page        : written (root-relative, noindex)")

if __name__ == '__main__':
    main()
