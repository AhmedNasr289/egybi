"""The Papyrus: one page per issue, the RSS feed, and blog.html's story index.

Each issue is laid out as a letter on a sheet of papyrus (the Papyrus design
section of egybi.css): a masthead with the issue number, date and reading time;
the body on a .sheet with the torn gold edge; the sources as a .specimen card;
the previous and next issues; and three related issues as sheet cards.
"""
import math
import os
import re

from . import egfmt
from .common import SITE, SITE_URL, breadcrumb, esc, page, write_index_block, write_text

WORDS_PER_MINUTE = 220


def issue_number(posts, i):
    """Issues are listed newest first; No. 1 is the oldest."""
    return len(posts) - i


def reading_minutes(html):
    words = len(re.sub(r'<[^>]+>', ' ', html).split())
    return max(1, math.ceil(words / WORDS_PER_MINUTE))


def related(posts, i, n=3):
    """Up to n other issues: the same tag first, then the nearest in time.
    The older and newer issues are left out: issue_nav already links them
    just above, and the first version repeated two of them as cards.
    Deterministic, so a rebuild writes the same bytes."""
    tag = posts[i].get('tag')
    others = [j for j in range(len(posts)) if j not in (i - 1, i, i + 1)]
    others.sort(key=lambda j: (posts[j].get('tag') != tag, abs(j - i), j))
    return [posts[j] for j in others[:n]]


def issue_card(posts, x):
    j = posts.index(x)
    return (f'<a class="card issue-card" href="{x["id"]}.html">'
            f'<span class="kicker">No. {issue_number(posts, j)} &middot; {esc(x.get("tag", ""))}</span>'
            f'<strong>{esc(x["title"])}</strong>'
            f'<span class="card-meta">{egfmt.time_tag(x["date"], "en", "prose")}</span></a>')


def issue_nav(posts, i):
    """Older issue on the left, newer on the right, as on a shelf."""
    older = posts[i + 1] if i + 1 < len(posts) else None
    newer = posts[i - 1] if i > 0 else None
    parts = []
    if older:
        parts.append(f'<a class="issue-prev" rel="prev" href="{older["id"]}.html">'
                     f'<span class="issue-dir">&larr; No. {issue_number(posts, i + 1)}</span>{esc(older["title"])}</a>')
    if newer:
        parts.append(f'<a class="issue-next" rel="next" href="{newer["id"]}.html">'
                     f'<span class="issue-dir">No. {issue_number(posts, i - 1)} &rarr;</span>{esc(newer["title"])}</a>')
    return f'<nav class="issue-nav" aria-label="Other issues">{"".join(parts)}</nav>' if parts else ''


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
        no, minutes = issue_number(posts, i), reading_minutes(p['body'])
        cards = ''.join(issue_card(posts, x) for x in related(posts, i))
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
    <p class="hero-eyebrow issue-masthead"><span data-glyph="scroll"></span> <a href="../blog.html">The Papyrus</a> &middot; No.&nbsp;{no} &middot; {esc(p.get('tag',''))} &middot; {egfmt.time_tag(p['date'], 'en', 'prose')} &middot; {minutes}&nbsp;min read</p>
    <h1 style="font-size:clamp(1.6rem,5vw,2.6rem);margin:0 0 12px;">{p['title']}</h1>
    <p class="lead" style="margin:0;">{p['excerpt']}</p>
  </div>
</section>

<section class="surface-light">
  <div class="wrap issue-wrap">
    <article class="sheet issue-sheet">
      <div class="issue-body dropcap">
    {p['body']}
      </div>
      <aside class="specimen issue-sources"><span class="specimen-label">Sources</span>Every figure here is real and cited, and where sources disagree we say so. You can see the same data yourself &mdash; <a href="../explore.html">explore the datasets</a> or <a href="../geospatial.html">open the Atlas</a>.</aside>
      {issue_nav(posts, i)}
    </article>
    {f'<h2 class="issue-more-title">More from The Papyrus</h2><div class="issue-more">{cards}</div>' if cards else ''}
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
