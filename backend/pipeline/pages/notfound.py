"""site/404.html, the page Apache serves for any URL that is not here."""
import os
import re

from .common import SITE, SITE_URL, chrome, page, write_text


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
    write_text(os.path.join(SITE, '404.html'), html_out)
    return True
