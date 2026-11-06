"""pages/: the page generator's shared helpers.

write_index_block owns every generated region inside a hand-written page
(the guide links, the story index, the site index), so its contract is
pinned here: replace only between the markers, idempotently, and report a
page whose markers have gone missing instead of writing elsewhere.
"""
from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pages import common  # noqa: E402

PAGE = '<html><body>\n<p>before</p>\n<!-- X:START -->\nold\n<!-- X:END -->\n<p>after</p>\n</body></html>\n'


class WriteIndexBlock(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        patcher = mock.patch.object(common, 'SITE', self.dir.name)
        patcher.start()
        self.addCleanup(patcher.stop)

    def write(self, text: str) -> Path:
        p = Path(self.dir.name, 'p.html')
        p.write_text(text, encoding='utf-8')
        return p

    def test_replaces_only_between_the_markers(self):
        p = self.write(PAGE)
        self.assertEqual(common.write_index_block('p.html', 'X', '<b>new</b>'), 1)
        out = p.read_text(encoding='utf-8')
        self.assertIn('<b>new</b>', out)
        self.assertNotIn('\nold\n', out)
        self.assertTrue(out.startswith('<html><body>\n<p>before</p>\n'))
        self.assertTrue(out.endswith('<!-- X:END -->\n<p>after</p>\n</body></html>\n'))

    def test_is_idempotent(self):
        p = self.write(PAGE)
        common.write_index_block('p.html', 'X', 'same')
        first = p.read_bytes()
        common.write_index_block('p.html', 'X', 'same')
        self.assertEqual(p.read_bytes(), first)

    def test_missing_markers_write_nothing_and_say_so(self):
        p = self.write('<html>no markers</html>')
        self.assertEqual(common.write_index_block('p.html', 'X', 'new'), 0)
        self.assertEqual(p.read_text(encoding='utf-8'), '<html>no markers</html>')

    def test_missing_page_is_reported_not_created(self):
        self.assertEqual(common.write_index_block('absent.html', 'X', 'new'), 0)
        self.assertFalse(os.path.exists(os.path.join(self.dir.name, 'absent.html')))


class Escaping(unittest.TestCase):
    def test_esc_quotes_attributes_and_tolerates_none(self):
        self.assertEqual(common.esc('"<a&b>"'), '&quot;&lt;a&amp;b&gt;&quot;')
        self.assertEqual(common.esc(None), '')

    def test_slug(self):
        self.assertEqual(common.slug("Egypt's  First -- Select!"), 'egypt-s-first-select')


if __name__ == '__main__':
    unittest.main()
