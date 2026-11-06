"""site/sitemap.xml: the core pages plus every generated page, each with its own date."""
import os

import sitemap_lastmod

from .common import SITE, SITE_URL


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
