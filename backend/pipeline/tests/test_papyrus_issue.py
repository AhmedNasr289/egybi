"""pages/papyrus.py: the numbering, reading time and related issues of a Papyrus issue."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pages import papyrus  # noqa: E402

# Newest first, as blog-posts.js lists them.
POSTS = [{'id': f'p{k}', 'title': f'Issue {k}', 'tag': tag, 'date': f'2026-07-{20 - k:02d}'}
         for k, tag in enumerate(['A', 'B', 'A', 'C', 'B', 'A', 'C'])]


class Numbering(unittest.TestCase):
    def test_the_oldest_issue_is_number_one(self):
        self.assertEqual(papyrus.issue_number(POSTS, len(POSTS) - 1), 1)
        self.assertEqual(papyrus.issue_number(POSTS, 0), len(POSTS))


class ReadingTime(unittest.TestCase):
    def test_words_at_220_a_minute_rounded_up_and_never_zero(self):
        self.assertEqual(papyrus.reading_minutes('<p>' + 'word ' * 220 + '</p>'), 1)
        self.assertEqual(papyrus.reading_minutes('<p>' + 'word ' * 221 + '</p>'), 2)
        self.assertEqual(papyrus.reading_minutes(''), 1)

    def test_markup_is_not_counted_as_words(self):
        self.assertEqual(papyrus.reading_minutes('<strong class="a b c">x</strong>' * 200), 1)


class Related(unittest.TestCase):
    def test_never_itself_and_never_the_issues_the_nav_already_links(self):
        for i in range(len(POSTS)):
            ids = [x['id'] for x in papyrus.related(POSTS, i)]
            neighbours = {POSTS[j]['id'] for j in (i - 1, i, i + 1) if 0 <= j < len(POSTS)}
            self.assertFalse(neighbours & set(ids), (i, ids))
            self.assertEqual(len(ids), 3)

    def test_the_same_tag_comes_first(self):
        ids = [x['id'] for x in papyrus.related(POSTS, 2)]   # tag A: p0 and p5 share it
        self.assertEqual(ids[:2], ['p0', 'p5'])

    def test_deterministic(self):
        self.assertEqual(papyrus.related(POSTS, 3), papyrus.related(POSTS, 3))


if __name__ == '__main__':
    unittest.main()
