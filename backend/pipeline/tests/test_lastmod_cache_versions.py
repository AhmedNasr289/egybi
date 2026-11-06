"""A cache-version bump (`egybi.css?v=41` -> `?v=42`) is not a content change.

Before 2026-11-06 a stylesheet edit, which bumps the version on all 178 pages,
re-dated 29 sitemap URLs to the day of the edit and would have announced them
all to IndexNow. These tests build a throwaway repository with fixed commit
dates and check that the sitemap date and the pushed-pages list both skip a
commit that only bumped a version, and still see one that changed content.
"""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import sitemap_lastmod as sl  # noqa: E402

PAGE = '<html><head><link href="assets/egybi.css?v={v}" rel="stylesheet"></head><body>{body}</body></html>\n'


def git(repo, *args, date=None):
    env = dict(os.environ, GIT_AUTHOR_NAME='t', GIT_AUTHOR_EMAIL='t@example.org',
               GIT_COMMITTER_NAME='t', GIT_COMMITTER_EMAIL='t@example.org')
    if date:
        env['GIT_AUTHOR_DATE'] = env['GIT_COMMITTER_DATE'] = f'{date}T12:00:00+00:00'
    return subprocess.run(['git', '-C', repo, *args], check=True, capture_output=True, text=True, env=env).stdout.strip()


def commit(repo, text, date):
    Path(repo, 'site', 'a.html').write_text(text, encoding='utf-8', newline='\n')
    git(repo, 'add', '-A')
    git(repo, 'commit', '-q', '-m', date, date=date)
    return git(repo, 'rev-parse', 'HEAD')


class ContentKey(unittest.TestCase):
    def test_versions_and_line_endings_are_ignored(self):
        a = PAGE.format(v=41, body='x')
        self.assertTrue(sl.same_content(a, PAGE.format(v=42, body='x').replace('\n', '\r\n')))

    def test_a_real_change_is_seen(self):
        self.assertFalse(sl.same_content(PAGE.format(v=41, body='x'), PAGE.format(v=41, body='y')))

    def test_a_missing_side_is_a_change(self):
        self.assertFalse(sl.same_content(None, 'x'))

    def test_only_asset_versions_are_ignored(self):
        self.assertFalse(sl.same_content('<a href="?v=1">', '<a href="?v=2">'))


class History(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = self.tmp.name
        git(self.repo, 'init', '-q')
        git(self.repo, 'config', 'core.autocrlf', 'false')
        os.makedirs(os.path.join(self.repo, 'site'))
        self.c1 = commit(self.repo, PAGE.format(v=41, body='first'), '2026-10-09')
        self.c2 = commit(self.repo, PAGE.format(v=42, body='first'), '2026-11-06')
        self.patch = mock.patch.object(sl, 'ROOT', self.repo)
        self.patch.start()
        sl._SHALLOW = None

    def tearDown(self):
        self.patch.stop()
        sl._SHALLOW = None
        self.tmp.cleanup()

    def test_a_version_bump_keeps_the_last_real_date(self):
        self.assertEqual(sl.git_date('a.html'), '2026-10-09')

    def test_a_real_change_after_the_bump_is_dated(self):
        commit(self.repo, PAGE.format(v=42, body='second'), '2026-11-07')
        self.assertEqual(sl.git_date('a.html'), '2026-11-07')

    def test_an_uncommitted_version_bump_is_not_today(self):
        Path(self.repo, 'site', 'a.html').write_text(PAGE.format(v=43, body='first'), encoding='utf-8')
        self.assertEqual(sl.git_date('a.html'), '2026-10-09')

    def test_an_uncommitted_real_change_is_today(self):
        Path(self.repo, 'site', 'a.html').write_text(PAGE.format(v=42, body='edited'), encoding='utf-8')
        self.assertEqual(sl.git_date('a.html'), sl.today())

    def test_a_push_of_only_a_version_bump_announces_nothing(self):
        sitemap = os.path.join(self.repo, 'sitemap.xml')
        sl.write_sitemap([(f'{sl.SITE_URL}/a.html', 'monthly', '0.5')], sitemap)
        self.assertEqual(sl.pushed_urls(self.c1, self.c2, sitemap), [])
        c3 = commit(self.repo, PAGE.format(v=42, body='second'), '2026-11-07')
        self.assertEqual(sl.pushed_urls(self.c2, c3, sitemap), [f'{sl.SITE_URL}/a.html'])


if __name__ == '__main__':
    unittest.main()
