#!/usr/bin/env python3
"""
EgyBI — static page generator (SEO).

The challenge catalogue and the blog both live inside JavaScript files and are
rendered client-side, which means 135 pieces of real content had exactly zero
indexable URLs. This script renders a real HTML page for every challenge and
every post, so each one can be found, linked and shared on its own.

It writes:
    site/practice/<challenge-title-slug>.html   (one per challenge)
    site/papyrus/<post-id>.html                 (one per post)
    site/sitemap.xml                            (regenerated with every URL)

Design notes:
  * The nav and footer are lifted from site/blog.html at build time rather than
    duplicated here, so the generated pages cannot drift from the real site.
  * Reference solutions are deliberately NOT published — the pages carry the
    problem, the schema, the starter and the sourced note, which is genuinely
    useful, without giving the answer away.
  * Pages live one directory deep, so relative asset paths are rewritten to ../

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
TODAY = '2026-07-20'

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

def chrome():
    """Lift the real nav + footer out of blog.html and fix relative paths for /subdir/ pages."""
    src = io.open(os.path.join(SITE, 'blog.html'), encoding='utf-8').read()
    head = src[src.index('<header'):src.index('</header>') + len('</header>')]
    foot = src[src.index('<footer'):src.index('</footer>') + len('</footer>')]
    def up(frag):
        frag = re.sub(r'href="(?!https?:|#|\.\./|mailto:)', 'href="../', frag)
        frag = re.sub(r'src="(?!https?:|\.\./|data:)', 'src="../', frag)
        return frag
    return up(head), up(foot)

NAV, FOOT = chrome()

def page(title, desc, canonical, body, ld=None, extra_head=''):
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
<link href="../assets/egybi.css?v=12" rel="stylesheet">
<script src="../assets/ads-config.js"></script>
{('<script type="application/ld+json">' + json.dumps(ld) + '</script>') if ld else ''}
{extra_head}
</head>
<body>
{NAV}
{body}
{FOOT}
<script src="../assets/egybi.js"></script>
<script src="../assets/glyphs.js?v=3"></script>
<script src="../assets/wayfinding.js?v=1"></script>
<script src="../assets/ads.js"></script>
<script src="../assets/auth.js?v=10"></script>
<script src="../assets/analytics.js"></script>
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
    outdir = os.path.join(SITE, 'practice')
    os.makedirs(outdir, exist_ok=True)
    by_sector = {}
    for c in chs:
        by_sector.setdefault(c['sector'], []).append(c)
    urls = []
    for c in chs:
        sl = slug(c['title'])
        url = f"{SITE_URL}/practice/{sl}.html"
        # Title stays under ~60 chars so Google does not truncate it; the old
        # form ran to 73. Description leads with the task, then the distinctive
        # claim, and is trimmed on a word boundary so it never ends mid-word.
        title = f"{c['title']} — {c['difficulty']} SQL challenge | EgyBI"
        stmt = re.sub(r'\s+', ' ', c['statement']).strip()
        tail = " Free, auto-graded, on real cited Egyptian data."
        if len(stmt) + len(tail) > 155:
            stmt = stmt[:155 - len(tail)].rsplit(' ', 1)[0] + '...'
        desc = stmt + tail
        related = [x for x in by_sector.get(c['sector'], []) if x['id'] != c['id']][:5]
        rel_html = ''.join(
            f'<li><a href="{slug(x["title"])}.html">{esc(x["title"])}</a> <span class="pill">{esc(x["difficulty"])}</span></li>'
            for x in related)
        ld = {"@context": "https://schema.org", "@type": "LearningResource",
              "name": c['title'], "url": url,
              "learningResourceType": "Interactive SQL exercise",
              "educationalLevel": c['difficulty'],
              "teaches": ["SQL", c['sector']],
              "isAccessibleForFree": True,
              "description": desc,
              "provider": {"@type": "Organization", "name": "EgyBI", "url": SITE_URL + "/"}}
        ld = {"@context": "https://schema.org", "@graph": [
            ld, breadcrumb(c['title'], url, "Practice", SITE_URL + "/practice.html")]}
        body = f"""
<section class="surface-hero" style="padding-top:64px;padding-bottom:44px;">
  <div class="wrap" style="max-width:820px;">
    <p class="hero-eyebrow"><span data-glyph="reed"></span> <a href="../practice.html" style="color:var(--gold-bright);">Practice</a> &middot; {esc(c['sector'])} &middot; {esc(c['difficulty'])}</p>
    <h1 style="font-size:clamp(1.6rem,5vw,2.6rem);margin:0 0 12px;">{esc(c['title'])}</h1>
    <p class="lead" style="margin:0;color:#e9dfc8;">{esc(c['statement'])}</p>
    <div class="cta-row" style="margin-top:26px;">
      <a class="btn btn-primary" href="../practice.html#{esc(c['id'])}" data-ev="static_solve_clicked">Solve this challenge &rarr;</a>
    </div>
    <p style="margin-top:14px;font-size:0.85rem;opacity:0.75;">Runs in your browser. No signup needed.</p>
  </div>
</section>

<section class="surface-light">
  <div class="wrap" style="max-width:820px;">
    <h2 style="font-size:1.25rem;"><span data-glyph="scroll"></span> What you are given</h2>
    <p>{esc(c['givens'])}</p>
    <h2 style="font-size:1.25rem;margin-top:28px;">Starting point</h2>
    <pre class="mono" style="background:var(--kemet);color:var(--on-dark);padding:16px 18px;border-radius:10px;overflow-x:auto;"><code>{esc(c['starter'])}</code></pre>
    <p style="font-size:0.9rem;color:var(--ink-soft);">The reference solution is checked automatically when you run your query on the practice page &mdash; results are compared row by row{', and order matters for this one' if c.get('orderMatters') else ''}.</p>
    <h2 style="font-size:1.25rem;margin-top:28px;"><span data-glyph="maat"></span> Did you know</h2>
    <p>{esc(c['didYouKnow'])}</p>
    {f'<h2 style="font-size:1.25rem;margin-top:28px;">More {esc(c["sector"])} challenges</h2><ul class="plain-list">{rel_html}</ul>' if rel_html else ''}
    <p style="margin-top:30px;"><a class="btn btn-primary" href="../practice.html#{esc(c['id'])}">Open it in the playground &rarr;</a></p>
  </div>
</section>
"""
        io.open(os.path.join(outdir, sl + '.html'), 'w', encoding='utf-8').write(
            page(title, desc, url, body, ld))
        urls.append((url, '0.6'))
    return urls

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
  <div class="wrap post-body-static" style="max-width:720px;">
    {p['body']}
    <hr style="margin:34px 0;border:none;border-top:1px solid var(--line-light);">
    <p style="font-size:0.9rem;color:var(--ink-soft);">Every figure here is real and cited, and where sources disagree we say so. You can query the same data yourself &mdash; <a href="../practice.html">try a SQL challenge</a> or <a href="../explore.html">explore the datasets</a>.</p>
    {f'<h2 style="font-size:1.2rem;margin-top:28px;">More from The Papyrus</h2><ul class="plain-list">{more}</ul>' if more else ''}
  </div>
</section>
"""
        io.open(os.path.join(outdir, sl + '.html'), 'w', encoding='utf-8').write(
            page(title, desc, url, body, ld))
        urls.append((url, '0.7'))
    return urls

def build_sitemap(extra):
    core = [('', '1.0', 'weekly'), ('practice.html', '0.9', 'weekly'), ('explore.html', '0.9', 'weekly'),
            ('tracks.html', '0.8', 'monthly'), ('blog.html', '0.8', 'weekly'), ('prices.html', '0.7', 'daily'), ('stocks.html', '0.7', 'daily'),
            ('geospatial.html', '0.8', 'monthly'),
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
    """Static, crawlable indexes of every generated page."""
    by_sector = {}
    for c in chs:
        by_sector.setdefault(c['sector'], []).append(c)

    _diff_rank = {'Easy': 0, 'Medium': 1, 'Hard': 2}
    parts = ['<section class="surface-light-2" id="all-challenges" data-nav="All 123">',
             '  <div class="wrap">',
             '    <h2 style="font-size:1.35rem;"><span data-glyph="reed"></span> All 123 SQL challenges</h2>',
             '    <p style="color:var(--ink-soft);max-width:70ch;">Every challenge has its own page, so you can link '
             'straight to a technique or find one from search. Grouped by sector, then ordered easy&rarr;hard.</p>']
    for sector in sorted(by_sector):
        # order Easy -> Medium -> Hard within a sector, then by title, so a long
        # sector (History) reads as a gentle difficulty ramp, not a flat wall.
        items = sorted(by_sector[sector], key=lambda x: (_diff_rank.get(x['difficulty'], 9), x['title']))
        parts.append(f'    <h3 style="font-size:1.02rem;margin-top:22px;">{esc(sector)} '
                     f'<span style="color:var(--ink-soft);font-weight:400;font-size:0.82rem;">'
                     f'&middot; {len(items)}</span></h3>')
        parts.append('    <ul class="plain-list link-grid">')
        for c in items:
            parts.append(f'      <li><a href="practice/{slug(c["title"])}.html">{esc(c["title"])}</a> '
                         f'<span class="pill">{esc(c["difficulty"])}</span></li>')
        parts.append('    </ul>')
    parts += ['  </div>', '</section>']
    n1 = write_index_block('practice.html', 'CHALLENGE-INDEX', chr(10).join(parts))

    sp = ['<section class="surface-light" id="all-stories">',
          '  <div class="wrap">',
          '    <h2 style="font-size:1.35rem;"><span data-glyph="scroll"></span> Every story in The Papyrus</h2>',
          '    <ul class="plain-list">']
    for x in posts:
        sp.append(f'      <li><a href="papyrus/{x["id"]}.html">{esc(x["title"])}</a></li>')
    sp += ['    </ul>', '  </div>', '</section>']
    n2 = write_index_block('blog.html', 'STORY-INDEX', chr(10).join(sp))
    return n1, n2


def main():
    data = load_js()
    ch, posts, docs = data['c'], data['p'], data.get('docs', {})
    cu = build_challenges(ch, docs)
    pu = build_posts(posts)
    build_link_indexes(ch, posts)
    total = build_sitemap(cu + pu)
    nfeed = build_feed(posts)
    print(f"challenge pages : {len(cu)}")
    print(f"post pages      : {len(pu)}")
    print(f"sitemap URLs    : {total}")
    print(f"RSS feed items  : {nfeed}")

if __name__ == '__main__':
    main()
