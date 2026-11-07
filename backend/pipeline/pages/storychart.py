"""Charts for the data stories: one line per series on a shared index scale
(100 = the first week), drawn twice: wide (846 px) and narrow (320 px, served
to phones through <picture>, because the wide one shrinks to ~276 px there and
its 12 px labels to about 4 px).

Moved out of foodprices.py on 2026-11-07 when a second story needed the same
drawing; the food charts were proven byte-identical across the move.

Colours: four categorical hues validated with the dataviz palette script
(lightness band, chroma floor, CVD and normal-vision separation, contrast
against the chart surface): all checks pass, worst adjacent CVD dE 8.8.
"""
import datetime as _dt

from . import egfmt
from .common import esc

NARROW_W = 320
# Fixed order, never cycled (validated as an adjacent sequence in this order).
CHART_COLOURS = ['#1F5FA6', '#C2410C', '#2E7D4F', '#8A4FB5']
SURFACE, INK, INK_SOFT, GRID = '#FDF9EE', '#1B1B18', '#544C3E', '#D8D0BC'
CREDIT_MAX_CHARS = 110
# The narrow chart's line-end labels must fit its right margin. Measured in
# Chromium on 2026-11-07: about 5.5 px a character at 12 px semibold, and the
# Arial fallback runs near 6.2 px. "Pound sterling 108.7" (20 characters)
# overflowed the 320 px frame by 14 px; 16 characters is 104 px even in Arial.
NARROW_LABEL_CHARS = 16
NARROW_RIGHT = 112


def whole_weeks(dates):
    """(d0, d1, n): the window of whole 7-day blocks counted back from the last
    date, or None with fewer than two. Counting forward from the first day can
    leave the LAST block one day long, which lets one noisy day set a headline
    (test_foodprices caught it); leftover days before the first full week are
    dropped instead."""
    if not dates:
        return None
    first, d1 = _dt.date.fromisoformat(dates[0]), _dt.date.fromisoformat(dates[-1])
    n = ((d1 - first).days + 1) // 7
    if n < 2:
        return None
    return d1 - _dt.timedelta(days=7 * n - 1), d1, n


def block_of(d, d0):
    """The 7-day block a date falls in, counted from the window's first day."""
    return (d - d0).days // 7


def wide(lines, d0, d1, title, subtitle, desc, credit_lines):
    """One line per category on a shared index scale (100 = first observation),
    one y-axis, labels at the line ends, a legend, and the credit inside the
    image. lines: [(name, colour, [(date, index)])]. `subtitle` is trusted
    markup (it may carry an entity); `desc` is the start of the <desc> sentence,
    which ends with the date range."""
    for c in credit_lines:
        if len(c) > CREDIT_MAX_CHARS:
            raise ValueError(f'credit line too long ({len(c)} > {CREDIT_MAX_CHARS}): {c}')
    W, H = 846, 500
    left, right, top, bottom = 58, 130, 78, 100
    pw, ph = W - left - right, H - top - bottom
    vals = [v for _, _, pts in lines for _, v in pts] + [100]
    lo = 5 * int(min(vals) // 5) - (5 if min(vals) % 5 == 0 else 0)
    hi = 5 * int(-(-max(vals) // 5))
    if hi - lo < 10:
        hi = lo + 10
    span_days = max(1, (d1 - d0).days)

    def x(d):
        return left + pw * (d - d0).days / span_days

    def y(v):
        return top + ph * (hi - v) / (hi - lo)

    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
           f'role="img" aria-labelledby="t d" font-family="Inter, Segoe UI, Arial, sans-serif">',
           f'<title id="t">{esc(title)}</title>',
           f'<desc id="d">{esc(desc)}, '
           f'{egfmt.date(d0, "en", "prose")} to {egfmt.date(d1, "en", "prose")}.</desc>',
           f'<rect width="{W}" height="{H}" fill="{SURFACE}"/>',
           f'<text x="{left}" y="34" font-size="19" font-weight="700" fill="{INK}">{esc(title)}</text>',
           f'<text x="{left}" y="56" font-size="12.5" fill="{INK_SOFT}">{subtitle}</text>']
    step = 5 if hi - lo <= 40 else 10
    for v in range(lo, hi + 1, step):
        yy = y(v)
        w = '1.5' if v == 100 else '1'
        col = INK_SOFT if v == 100 else GRID
        out.append(f'<line x1="{left}" y1="{yy:.1f}" x2="{left + pw}" y2="{yy:.1f}" stroke="{col}" stroke-width="{w}"/>')
        out.append(f'<text x="{left - 8}" y="{yy + 4:.1f}" font-size="12" text-anchor="end" fill="{INK_SOFT}">{v}</text>')
    # Month ticks on the first of each month inside the window.
    m = _dt.date(d0.year, d0.month, 1)
    while m <= d1:
        if m >= d0:
            xx = x(m)
            out.append(f'<line x1="{xx:.1f}" y1="{top + ph}" x2="{xx:.1f}" y2="{top + ph + 5}" stroke="{INK_SOFT}"/>')
            out.append(f'<text x="{xx:.1f}" y="{top + ph + 20}" font-size="12" text-anchor="middle" '
                       f'fill="{INK_SOFT}">{egfmt.MONTHS_EN_SHORT[m.month - 1]}</text>')
        m = _dt.date(m.year + (m.month == 12), m.month % 12 + 1, 1)
    # Lines, then end labels nudged apart so they never overlap.
    ends = []
    for name, colour, pts in lines:
        path = ' '.join(f'{"M" if i == 0 else "L"}{x(d):.1f},{y(v):.1f}' for i, (d, v) in enumerate(pts))
        out.append(f'<path d="{path}" fill="none" stroke="{colour}" stroke-width="2" '
                   'stroke-linejoin="round" stroke-linecap="round"/>')
        d_last, v_last = pts[-1]
        out.append(f'<circle cx="{x(d_last):.1f}" cy="{y(v_last):.1f}" r="4" fill="{colour}" '
                   f'stroke="{SURFACE}" stroke-width="2"/>')
        ends.append([y(v_last), name, v_last])
    ends.sort()
    for i in range(1, len(ends)):
        if ends[i][0] - ends[i - 1][0] < 16:
            ends[i][0] = ends[i - 1][0] + 16
    for yy, name, v in ends:
        out.append(f'<text x="{left + pw + 10}" y="{yy + 4:.1f}" font-size="12.5" font-weight="600" fill="{INK}">'
                   f'{esc(name)} {egfmt.fixed(v, "en", 1)}</text>')
    # Legend row (identity never by colour alone: the end labels name each line too).
    lx = left
    for name, colour, _ in lines:
        out.append(f'<rect x="{lx}" y="{H - 58}" width="14" height="4" rx="2" fill="{colour}"/>')
        out.append(f'<text x="{lx + 20}" y="{H - 53}" font-size="12" fill="{INK}">{esc(name)}</text>')
        lx += 30 + 8 * len(name)
    for i, c in enumerate(credit_lines):
        out.append(f'<text x="{left}" y="{H - 30 + i * 14}" font-size="11.5" fill="{INK_SOFT}">{esc(c)}</text>')
    out.append('</svg>')
    return '\n'.join(out) + '\n'


def _wrap(text, width):
    """Greedy word wrap to at most `width` characters a line."""
    lines, cur = [], ''
    for word in text.split():
        if cur and len(cur) + 1 + len(word) > width:
            lines.append(cur)
            cur = word
        else:
            cur = f'{cur} {word}' if cur else word
    if cur:
        lines.append(cur)
    return lines


def narrow(lines, d0, d1, title, subtitle_lines, desc, credit_lines, short=None):
    """The same lines as wide(), drawn 320 px wide for a phone, where the
    page shows it at close to its own size. No legend: the end labels name
    every line, so identity never rests on colour alone. Same scale rules.
    `short` maps a line's name to a shorter label for this width; a label still
    longer than NARROW_LABEL_CHARS is refused rather than clipped on a phone."""
    short = short or {}
    for name, _, pts in lines:
        label = f'{short.get(name, name)} {egfmt.fixed(pts[-1][1], "en", 1)}'
        if len(label) > NARROW_LABEL_CHARS:
            raise ValueError(f'narrow chart label too long ({len(label)} > {NARROW_LABEL_CHARS}): {label}')
    W = NARROW_W
    left, right, top = 34, NARROW_RIGHT, 112
    pw, ph = W - left - right, 230
    vals = [v for _, _, pts in lines for _, v in pts] + [100]
    lo = 5 * int(min(vals) // 5) - (5 if min(vals) % 5 == 0 else 0)
    hi = 5 * int(-(-max(vals) // 5))
    if hi - lo < 10:
        hi = lo + 10
    span_days = max(1, (d1 - d0).days)

    def x(d):
        return left + pw * (d - d0).days / span_days

    def y(v):
        return top + ph * (hi - v) / (hi - lo)

    credit = [ln for c in credit_lines for ln in _wrap(c, 46)]
    H = top + ph + 52 + 15 * len(credit)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
           f'role="img" aria-labelledby="tn dn" font-family="Inter, Segoe UI, Arial, sans-serif">',
           f'<title id="tn">{esc(title)}</title>',
           f'<desc id="dn">{esc(desc)}, '
           f'{egfmt.date(d0, "en", "prose")} to {egfmt.date(d1, "en", "prose")}.</desc>',
           f'<rect width="{W}" height="{H}" fill="{SURFACE}"/>']
    for i, ln in enumerate(_wrap(title, 30)):
        out.append(f'<text x="12" y="{28 + i * 22}" font-size="17" font-weight="700" fill="{INK}">{esc(ln)}</text>')
    for i, ln in enumerate(subtitle_lines):
        out.append(f'<text x="12" y="{76 + i * 16}" font-size="12.5" fill="{INK_SOFT}">{ln}</text>')
    step = 5 if hi - lo <= 40 else 10
    for v in range(lo, hi + 1, step):
        yy = y(v)
        w = '1.5' if v == 100 else '1'
        col = INK_SOFT if v == 100 else GRID
        out.append(f'<line x1="{left}" y1="{yy:.1f}" x2="{left + pw}" y2="{yy:.1f}" stroke="{col}" stroke-width="{w}"/>')
        out.append(f'<text x="{left - 6}" y="{yy + 4:.1f}" font-size="12" text-anchor="end" fill="{INK_SOFT}">{v}</text>')
    m = _dt.date(d0.year, d0.month, 1)
    while m <= d1:
        if m >= d0:
            xx = x(m)
            out.append(f'<line x1="{xx:.1f}" y1="{top + ph}" x2="{xx:.1f}" y2="{top + ph + 5}" stroke="{INK_SOFT}"/>')
            out.append(f'<text x="{xx:.1f}" y="{top + ph + 20}" font-size="12" text-anchor="middle" '
                       f'fill="{INK_SOFT}">{egfmt.MONTHS_EN_SHORT[m.month - 1]}</text>')
        m = _dt.date(m.year + (m.month == 12), m.month % 12 + 1, 1)
    ends = []
    for name, colour, pts in lines:
        path = ' '.join(f'{"M" if i == 0 else "L"}{x(d):.1f},{y(v):.1f}' for i, (d, v) in enumerate(pts))
        out.append(f'<path d="{path}" fill="none" stroke="{colour}" stroke-width="2" '
                   'stroke-linejoin="round" stroke-linecap="round"/>')
        d_last, v_last = pts[-1]
        out.append(f'<circle cx="{x(d_last):.1f}" cy="{y(v_last):.1f}" r="3.5" fill="{colour}" '
                   f'stroke="{SURFACE}" stroke-width="2"/>')
        ends.append([y(v_last), short.get(name, name), v_last, colour])
    ends.sort()
    for i in range(1, len(ends)):
        if ends[i][0] - ends[i - 1][0] < 16:
            ends[i][0] = ends[i - 1][0] + 16
    for yy, name, v, colour in ends:
        out.append(f'<text x="{left + pw + 8}" y="{yy + 4:.1f}" font-size="12" font-weight="600" fill="{INK}">'
                   f'{esc(name)} {egfmt.fixed(v, "en", 1)}</text>')
    for i, c in enumerate(credit):
        out.append(f'<text x="12" y="{top + ph + 50 + i * 15}" font-size="11.5" fill="{INK_SOFT}">{esc(c)}</text>')
    out.append('</svg>')
    return '\n'.join(out) + '\n'
