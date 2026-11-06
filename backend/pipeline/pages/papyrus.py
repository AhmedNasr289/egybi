"""The Papyrus: one page per issue, the RSS feed, and blog.html's story index."""
import os
import re

from .common import SITE, SITE_URL, breadcrumb, esc, page, write_index_block, write_text


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
        write_text(os.path.join(outdir, sl + '.html'), 
            page(title, desc, url, body, ld,
                 og_image=f"{SITE_URL}/og-blog.png?v=3"))
        urls.append((url, '0.7'))
    return urls


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
    write_text(os.path.join(SITE, 'feed.xml'), xml)
    return len(items)


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
