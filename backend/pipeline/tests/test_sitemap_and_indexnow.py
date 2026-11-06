"""sitemap_lastmod and indexnow_ping: what gets announced, and to whom."""
from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import indexnow_ping  # noqa: E402
import sitemap_lastmod  # noqa: E402

SHA = 'a' * 40


class UrlToRel(unittest.TestCase):
    def test_paths(self):
        self.assertEqual(sitemap_lastmod.url_to_rel('https://egybi.com/visit/giza.html'), 'visit/giza.html')
        self.assertEqual(sitemap_lastmod.url_to_rel('https://egybi.com/'), 'index.html')
        self.assertEqual(sitemap_lastmod.url_to_rel('https://egybi.com'), 'index.html')


class PushedUrls(unittest.TestCase):
    """An unreadable push range must degrade to None (a notice), never raise."""

    def test_new_branch_all_zero_before(self):
        self.assertIsNone(sitemap_lastmod.pushed_urls('0' * 40, SHA))

    def test_malformed_shas(self):
        self.assertIsNone(sitemap_lastmod.pushed_urls('abc', SHA))
        self.assertIsNone(sitemap_lastmod.pushed_urls(SHA, 'HEAD; rm -rf /'))

    def test_unknown_commit(self):
        self.assertIsNone(sitemap_lastmod.pushed_urls('1234567890' * 4, SHA))

    def test_an_empty_range_lists_nothing(self):
        head = sitemap_lastmod._git('rev-parse', 'HEAD')
        if not head:
            self.skipTest('not inside a git checkout')
        self.assertEqual(sitemap_lastmod.pushed_urls(head, head), [])


class SitemapRoundTrip(unittest.TestCase):
    def test_write_then_read_keeps_every_url_and_reports_new_ones_as_changed(self):
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, 'sitemap.xml')
            entries = [('https://egybi.com/a.html', '0.5', 'monthly'),
                       ('https://egybi.com/b.html', '0.5', 'monthly')]
            total, changed = sitemap_lastmod.write_sitemap(entries, path)
            self.assertEqual(total, 2)
            self.assertEqual(sorted(changed), [u for u, _, _ in entries])
            self.assertEqual(sorted(sitemap_lastmod.read_lastmods(path)), [u for u, _, _ in entries])
            # A second identical write moves no date, so nothing is re-announced.
            _, again = sitemap_lastmod.write_sitemap(entries, path)
            self.assertEqual(again, [])


class IndexNowUrls(unittest.TestCase):
    def test_only_our_urls_once_each(self):
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, 'urls.txt')
            Path(p).write_text('\n'.join([
                'https://egybi.com/a.html', 'https://egybi.com/a.html', '  https://egybi.com/b.html  ',
                'https://evil.example/x.html', 'https://egybi.com.evil.example/y.html', '',
                'not a url']), encoding='utf-8')
            self.assertEqual(indexnow_ping.read_urls(p), ['https://egybi.com/a.html', 'https://egybi.com/b.html'])

    def test_a_missing_file_is_nothing_to_announce(self):
        self.assertEqual(indexnow_ping.read_urls(os.path.join(tempfile.gettempdir(), 'no-such-file.txt')), [])


if __name__ == '__main__':
    unittest.main()
