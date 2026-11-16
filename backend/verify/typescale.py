"""EgyBI's type scale (study S2, 2026-11-16): the one place that says which
font sizes exist, how an old size maps onto them, and which rules are exempt.

Before S2, egybi.css carried 69 distinct font-size values and the pages 56
more inline, so similar labels differed by a pixel or two from section to
section, and a page title (h1) was the same size as a section heading (h2) on a
phone. The scale below replaces them with ten steps: six fixed reading sizes and
four fluid ones that grow with the screen.

Both the one-off mapping (that rewrote the stylesheet, the generators and the
hand-written pages) and the standing check `type-scale.py` import this module,
so the rule that rewrote the site and the rule that guards it cannot drift.
"""
import re

# The steps, as defined in egybi.css :root. Order matters only for reading.
STEPS = {
    'xs': '0.75rem',                                   # 12px: labels, captions, fine print; nothing smaller
    'sm': '0.875rem',                                  # 14px: meta, notes, table text
    'base': '1rem',                                    # 16px: body
    'md': '1.125rem',                                  # 18px: card titles, emphasised lines
    'lg': '1.25rem',                                   # 20px: h3 and in-page section headings
    'xl': '1.75rem',                                   # 28px: headline figures in stat cards
    'lead': 'clamp(1rem, 0.94rem + 0.4vw, 1.125rem)',  # intro paragraphs: 16.6px on a phone, 18px on a desktop
    'h2': 'clamp(1.6rem, 1.25rem + 1.2vw, 2.15rem)',   # section headings: 25.6px phone, 34.4px desktop (as before)
    'h1': 'clamp(1.75rem, 1.2rem + 2.4vw, 2.7rem)',    # page titles: 28.6px phone, 43.2px desktop
    'hero': 'clamp(1.85rem, 7vw, 3.4rem)',             # hero titles and the biggest figures
}

# Rules whose font-size sizes a GLYPH, an icon or a decoration, not text, so a
# reading scale does not apply: hieroglyph signs, seals, the close cross, map
# marker labels (sized for the map, checked by map-contrast.js) and the giant
# decorative sign behind a hero. Matched against the rule's selector text.
EXEMPT_SELECTORS = (
    '.glyph-rule .glyph', '.gl-sign', '.pl-seal-glyph', '.pl-seal .glyph',
    '.auth-rail-glyph', '.cartouche-signs', '.sign-table .g', '.seal',
    '.q-close', '.mk-label', '.surface-hero::before',
)

_REM = re.compile(r'^(\d*\.?\d+)rem$')
_CLAMP_MAX = re.compile(r'^clamp\(.*,\s*(\d*\.?\d+)rem\s*\)$')


def step_for(value):
    """The step an old font-size value maps to, or None when it is not a
    reading size this scale governs (em, %, pt, px, or anything else)."""
    v = value.strip()
    m = _REM.match(v)
    if m:
        r = float(m.group(1))
        if r <= 0.805:
            return 'xs'
        if r <= 0.935:
            return 'sm'
        if r <= 1.06:
            return 'base'
        if r <= 1.18:
            return 'md'
        if r <= 1.42:
            return 'lg'
        return 'xl'
    m = _CLAMP_MAX.match(v.replace(' ', ''))
    if m:
        top = float(m.group(1))
        if top <= 1.2:
            return 'lead'
        if top <= 2.2:
            return 'h2'
        if top <= 3.05:
            return 'h1'
        return 'hero'
    return None


def on_scale(value):
    """A value the check accepts: a scale token, or a size relative to its
    parent (em or %), which inherits a scale step rather than adding one."""
    v = value.strip().rstrip(';').strip()
    if re.fullmatch(r'var\(--fs-(xs|sm|base|md|lg|xl|lead|h2|h1|hero)\)', v):
        return True
    if re.fullmatch(r'\d*\.?\d+(em|%)', v) or v == 'inherit':
        return True
    return False


_COMMENT = re.compile(r'/\*.*?\*/', re.S)


def selector_at(text, pos):
    """The selector of the CSS rule containing position `pos`, comments
    removed, or None when `pos` sits in a style="" attribute, not a rule."""
    i = text.rfind('{', 0, pos)
    if i < 0 or i < max(text.rfind('}', 0, pos), text.rfind('"', 0, pos), text.rfind('<', 0, pos)):
        return None
    head = _COMMENT.sub('', text[:i])
    j = max(head.rfind('}'), head.rfind('{'), head.rfind('>'), head.rfind(';'))
    return head[j + 1:].strip()


def exempt(selector):
    s = selector or ''
    return any(e in s for e in EXEMPT_SELECTORS)
