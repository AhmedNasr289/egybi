"""The 123 retired challenge pages (site/practice/).

Each former challenge URL keeps resolving with a retirement notice that routes
the reader to the section of the encyclopaedia its sector now lives in. See
the entry point's docstring (build_static_pages.py) for why they are notices
and not redirects.
"""
import os
import re

from .common import SITE, SITE_URL, breadcrumb, esc, page, slug, write_text


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
        write_text(os.path.join(outdir, sl + '.html'), 
            page(title, desc, url, body, ld,
                 extra_head='<meta name="robots" content="noindex,follow">',
                 canonical_link=False))
    return []
