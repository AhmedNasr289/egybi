"""Governorate names: the one alias table the build scripts share.

geoBoundaries names some governorates differently from the knowledge base
(KB `governorates.name`), which is the key every layer joins on. Until
2026-11-06 this table was copied into build_egypt_map.py and
build_invest_map.py "by duplication rather than by import", which is how two
copies of one fact drift apart; both now import it from here.

This is the JOIN table and must hold the knowledge base's spellings. How a
name is WRITTEN for a reader (for example "Fayoum" for the KB's "Faiyum") is a
separate concern, in pages/egfmt.py (gov_name) and assets/egfmt.js (govName).
"""

# geoBoundaries shapeName (with " Governorate" stripped) -> KB governorates.name
ALIASES = {
    "Al Sharqia": "Sharqia",
    "Gharbiyya": "Gharbia",
    "Kafr el-Sheikh": "Kafr El Sheikh",
}


def kb_name(shape_name: str) -> str:
    """A geoBoundaries shapeName as the knowledge base spells it."""
    n = shape_name.replace(" Governorate", "").replace(" Governate", "").strip()
    return ALIASES.get(n, n)
