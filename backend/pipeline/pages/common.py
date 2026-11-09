"""Shared building blocks for every generated page.

Paths, escaping, the site chrome lifted from site/blog.html, the page shell,
breadcrumbs and the marker-block writer. Every other module in this package
imports from here; nothing here imports from them.

Importing this module reads site/blog.html once (NAV, FOOT = chrome()), so the
chrome every page carries is the chrome blog.html has at build time.
"""
import html
import io
import json
import os
import re
import subprocess
import sys

# backend/pipeline/pages/common.py -> the repository root, three levels up.
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
SITE = os.path.join(ROOT, 'site')
SITE_URL = 'https://egybi.com'


# Sitemap <lastmod> dates are per page now — see sitemap_lastmod.py. The
# history: a literal '2026-08-07' froze every date; replacing it with the run
# date then stamped all 50 URLs with whichever day the generator last ran.

def slug(s):
    return re.sub(r'^-|-$', '', re.sub(r'[^a-z0-9]+', '-', s.lower()))

def esc(s):
    return html.escape(str(s or ''), quote=True)


def read_text(path):
    """A UTF-8 file's text, with the handle closed on return."""
    with io.open(path, encoding='utf-8') as f:
        return f.read()


def write_text(path, text):
    """Write UTF-8 text with LF line endings, closing the handle on return.

    LF on every platform, so a build on Windows writes the same bytes as one
    on the Linux runner (the README's byte-identical rule)."""
    with io.open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)

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
    src = read_text(os.path.join(SITE, 'blog.html'))
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
         nav=None, foot=None, og_image=None, canonical_link=True, extra_foot=''):
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
<link href="{prefix}assets/egybi.css?v=44" rel="stylesheet">
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
<script src="{prefix}assets/egybi.js?v=3"></script>
<script src="{prefix}assets/glyphs.js?v=3"></script>
<script src="{prefix}assets/wayfinding.js?v=1"></script>
<script src="{prefix}assets/ads.js"></script>
<script src="{prefix}assets/analytics.js?v=2"></script>{extra_foot}
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
    s = read_text(full)
    start, end = f'<!-- {marker}:START', f'<!-- {marker}:END -->'
    i, j = s.find(start), s.find(end)
    if i == -1 or j == -1:
        return 0
    head = s[:i]
    tail = s[j + len(end):]
    block = (f'<!-- {marker}:START - generated by backend/pipeline/build_static_pages.py.\n'
             f'     Crawlable links to every generated page; edit the generator, not this. -->\n'
             f'{html}\n{end}')
    write_text(full, head + block + tail)
    return 1
