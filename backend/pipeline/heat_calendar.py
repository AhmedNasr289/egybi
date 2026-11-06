#!/usr/bin/env python3
"""
Egypt's afternoon heat, every measured site by every month, as one table.

WHY
---
visit.html answers "what is it like in March?" one month at a time, with
JavaScript. The question a traveller types is the whole year at once —
"Egypt weather by month" — and the answer people share is one picture of it.
This module turns the NASA POWER normals visit.html already reads into that
picture: a static HTML table, coloured by the same five bands as the visit
map, with every number printed in its cell (colour is never the only carrier).

It is pure: data in, HTML and computed sentences out. Nothing here is typed by
hand — every figure in FINDINGS is read off the same rows the table shows, so
the prose cannot disagree with the chart beside it.

Used by build_static_pages.py for egypt-weather-by-month.html and its
embeddable twin, embed/egypt-weather-by-month.html.
"""
from __future__ import annotations

import html
from dataclasses import dataclass
from typing import Optional

MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
          'August', 'September', 'October', 'November', 'December']

# The five bands of the visit map's legend (visit.html, .v-scale), so the two
# pictures of the same data read the same way. Upper bound is exclusive;
# None is the open top band.
BANDS: list[tuple[Optional[float], str, str]] = [
    (22.0, '#2C6FAD', 'under 22 °C'),
    (28.0, '#4FA3A5', '22–28 °C'),
    (34.0, '#C9A227', '28–34 °C'),
    (39.0, '#D97B2B', '34–39 °C'),
    (None, '#B23A0F', '39 °C and above'),
]
INK, PAPER = '#1B1B18', '#FFFFFF'
COMFORT_BELOW = 28.0     # the top of the second band: "warm", not "hot"


@dataclass(frozen=True)
class Row:
    key: str
    name: str
    lat: float
    afternoons: tuple[float, ...]   # mean daily maximum, January..December


def _esc(v: object) -> str:
    return html.escape(str(v), quote=True)


def _luminance(hex_colour: str) -> float:
    rgb = [int(hex_colour[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def _contrast(a: str, b: str) -> float:
    la, lb = sorted((_luminance(a), _luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def text_colour(fill: str) -> str:
    """Ink or paper, whichever reads better on the fill (WCAG contrast)."""
    return INK if _contrast(fill, INK) >= _contrast(fill, PAPER) else PAPER


def band(t: float) -> int:
    for i, (top, _, _) in enumerate(BANDS):
        if top is None or t < top:
            return i
    return len(BANDS) - 1


def rows_from_climate(clim: dict, keys: Optional[set[str]] = None) -> list[Row]:
    """Sites with all twelve afternoons, north to south.

    North to south because that is the gradient the table exists to show —
    and the one site that breaks it (Saint Catherine, cooled by altitude, not
    latitude) is visible exactly because the order is geographic."""
    out = []
    for s in clim.get('sites', []):
        if keys is not None and s.get('key') not in keys:
            continue
        ms = sorted((m for m in s.get('months', []) if m.get('t_daily_max') is not None),
                    key=lambda m: m['month'])
        if [m['month'] for m in ms] != list(range(1, 13)):
            continue
        out.append(Row(s['key'], s['name'], float(s['lat']),
                       tuple(float(m['t_daily_max']) for m in ms)))
    return sorted(out, key=lambda r: -r.lat)


def findings(rows: list[Row]) -> list[str]:
    """Plain sentences, each computed from the rows. HTML-safe."""
    if not rows:
        return []
    n = len(rows)
    cool = [sum(r.afternoons[i] < COMFORT_BELOW for r in rows) for i in range(12)]
    best = max(cool)
    best_months = [MONTHS[i] for i in range(12) if cool[i] == best]
    worst = min(cool)
    worst_months = [MONTHS[i] for i in range(12) if cool[i] == worst]
    t_hot, r_hot, i_hot = max((r.afternoons[i], r.name, i) for r in rows for i in range(12))
    july = sorted(rows, key=lambda r: r.afternoons[6])
    # From the ROUNDED values the table prints, so "a spread of 13 °C" can
    # never sit beside cells that visibly read 42 and 29 = 13 and say 12.
    j_lo, j_hi = round(july[0].afternoons[6]), round(july[-1].afternoons[6])
    all_under_34 = [MONTHS[i] for i in range(12) if all(r.afternoons[i] < 34 for r in rows)]

    def months(ms: list[str]) -> str:
        return ms[0] if len(ms) == 1 else ', '.join(ms[:-1]) + ' and ' + ms[-1]

    out = [
        f"In {months(best_months)}, <strong>{best} of {n}</strong> sites have a normal afternoon "
        f"under {COMFORT_BELOW:.0f} °C &mdash; the most of any month. In {months(worst_months)}, "
        f"{'none does' if worst == 0 else f'only {worst} do' + ('es' if worst == 1 else '')}.",
        f"The hottest normal afternoon in the table is <strong>{_esc(r_hot)} in {MONTHS[i_hot]}, "
        f"about {t_hot:.0f} °C</strong>.",
        f"In July the spread between sites is {j_hi - j_lo} °C: "
        f"about {j_lo} °C at {_esc(july[0].name)}, about "
        f"{j_hi} °C at {_esc(july[-1].name)}. Which month to go "
        f"depends on where as much as on when.",
    ]
    if all_under_34:
        out.append(f"Every site stays under 34 °C in the afternoon in {months(all_under_34)}.")
    else:
        out.append("There is no month in which every site stays under 34 °C in the afternoon.")
    return out


def legend_html() -> str:
    return ('<div class="hc-legend" aria-label="Colour key">' + ''.join(
        f'<span><i style="background:{fill}"></i>{_esc(label)}</span>'
        for _, fill, label in BANDS) + '</div>')


def table_html(rows: list[Row], href: str = 'visit/{key}.html', link_attrs: str = '') -> str:
    """The table itself. `href` is formatted with the site key, so the page
    links relatively and the embed links absolutely, out of the frame."""
    head = ''.join(f'<th scope="col"><abbr title="{m}">{m[:3]}</abbr></th>' for m in MONTHS)
    body = []
    for r in rows:
        cells = []
        for t in r.afternoons:
            fill = BANDS[band(t)][1]
            cells.append(f'<td style="background:{fill};color:{text_colour(fill)}">{t:.0f}</td>')
        link = href.format(key=r.key)
        body.append(f'<tr><th scope="row"><a href="{_esc(link)}"{link_attrs}>{_esc(r.name)}</a></th>'
                    + ''.join(cells) + '</tr>')
    return ('<div class="hc-wrap"><table class="hc-table">'
            '<caption>Mean daily maximum (a normal afternoon), °C, by month. Sites north to south.</caption>'
            f'<thead><tr><th scope="col">Site</th>{head}</tr></thead>'
            f'<tbody>{"".join(body)}</tbody></table></div>')


def svg_chart(rows: list[Row], title: str, credit: str) -> str:
    """The same table as a standalone SVG image, for other sites to embed.

    An image, not an iframe: the site sends anti-framing headers on every
    response (they protect the sign-in UI) and an image needs no exception to
    them. The embed snippet wraps it in a link back to the page. System fonts
    only, no external references, so it renders the same wherever it lands.
    `title` and `credit` are plain text."""
    label_w, cell_w, cell_h, gap = 190, 50, 30, 2
    top, pad = 74, 16
    width = pad * 2 + label_w + 12 * (cell_w + gap)
    grid_bottom = top + len(rows) * (cell_h + gap)
    height = grid_bottom + 64
    font = "font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif"
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
           f'viewBox="0 0 {width} {height}" role="img" aria-label="{_esc(title)}">',
           f'<title>{_esc(title)}</title>',
           f'<rect width="{width}" height="{height}" fill="#F6EEDC"/>',
           f'<g style="{font}" fill="{INK}">',
           f'<text x="{pad}" y="30" font-size="19" font-weight="700">{_esc(title)}</text>',
           f'<text x="{pad}" y="50" font-size="12.5">Mean daily maximum, °C: what a normal afternoon reaches. '
           f'Sites north to south.</text>']
    x0 = pad + label_w
    for i, m in enumerate(MONTHS):
        out.append(f'<text x="{x0 + i * (cell_w + gap) + cell_w / 2:.0f}" y="{top - 8}" font-size="12" '
                   f'font-weight="600" text-anchor="middle">{m[:3]}</text>')
    for j, r in enumerate(rows):
        y = top + j * (cell_h + gap)
        out.append(f'<text x="{x0 - 10}" y="{y + cell_h / 2 + 4.5:.0f}" font-size="13" font-weight="600" '
                   f'text-anchor="end">{_esc(r.name)}</text>')
        for i, t in enumerate(r.afternoons):
            fill = BANDS[band(t)][1]
            x = x0 + i * (cell_w + gap)
            out.append(f'<rect x="{x}" y="{y}" width="{cell_w}" height="{cell_h}" rx="4" fill="{fill}"/>'
                       f'<text x="{x + cell_w / 2:.0f}" y="{y + cell_h / 2 + 4.5:.0f}" font-size="13" '
                       f'font-weight="700" text-anchor="middle" fill="{text_colour(fill)}">{t:.0f}</text>')
    lx = pad
    for _, fill, label in BANDS:
        out.append(f'<rect x="{lx}" y="{grid_bottom + 12}" width="13" height="13" rx="3" fill="{fill}"/>'
                   f'<text x="{lx + 19}" y="{grid_bottom + 23}" font-size="12">{_esc(label)}</text>')
        lx += 19 + 8 * len(label) + 18
    out.append(f'<text x="{pad}" y="{grid_bottom + 50}" font-size="11.5">{_esc(credit)}</text>')
    out.append('</g></svg>')
    return '\n'.join(out) + '\n'


# Styles for the page's HTML table.
CSS = """
.hc-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:10px}
.hc-table{border-collapse:separate;border-spacing:2px;width:100%;min-width:640px;font-variant-numeric:tabular-nums}
.hc-table caption{caption-side:bottom;text-align:left;font-size:.82rem;padding-top:8px;opacity:.85}
.hc-table th{font-weight:600;font-size:.82rem;padding:6px 4px;text-align:center}
.hc-table th[scope=row]{text-align:left;white-space:nowrap;padding-right:10px;position:sticky;left:0;background:var(--papyrus,#F6EEDC)}
.hc-table td{text-align:center;font-weight:700;font-size:.86rem;padding:8px 2px;border-radius:4px;min-width:34px}
.hc-table abbr{text-decoration:none}
.hc-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin:12px 0 4px;font-size:.82rem}
.hc-legend span{display:inline-flex;align-items:center;gap:6px}
.hc-legend i{display:inline-block;width:14px;height:14px;border-radius:3px}
"""
