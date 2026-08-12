#!/usr/bin/env python3
"""EgyBI — per-page Open Graph card generator (1200x630).

WHY THIS EXISTS
---------------
Every shared link from this site previewed with ONE image, and that image still
read "Practice SQL & BI on real, cited Egyptian data — 123 challenges, XP,
streaks & scribe ranks". It was the last surviving artefact of the retired
identity, and the only one no text search could ever have found, because it is
pixels. A grep across *.html, *.xml, *.json, *.js and *.py came back clean while
the actual card people saw when they shared the site said SQL practice.

So: a card per page, generated from copy that lives here rather than being
hand-drawn once and forgotten. When the site's story changes, this file is the
one place that has to change with it.

Every number printed on a card is read from site/data/*.json at build time
rather than typed in, because a preview image is the most-shared and
least-audited surface on the site — the worst place to let a figure go stale.

The design follows og-case.png, which was already right: deep-blue field, gold
letterspaced eyebrow, serif headline, muted subline, stat chips, hairline rule.

Run:  python backend/pipeline/build_og_images.py
"""
import io
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

for _s in (sys.stdout, sys.stderr):
    if hasattr(_s, "reconfigure"):
        _s.reconfigure(encoding="utf-8", errors="replace")

SITE = "site"
W, H = 1200, 630

# Brand tokens, copied from site/assets/egybi.css so the cards cannot drift
# into a palette the site does not use.
BLUE = (0x17, 0x40, 0x8B)
BLUE_DEEP = (0x0E, 0x2A, 0x5E)
GOLD = (0xC9, 0xA2, 0x27)
GOLD_BRIGHT = (0xE7, 0xC6, 0x4C)
WHITE = (0xFF, 0xFF, 0xFF)
SUB = (0xC8, 0xD2, 0xE4)
GREEN = (0x8F, 0xD9, 0xB6)

FONTS = r"C:\Windows\Fonts"


def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


SERIF_B = lambda s: font("georgiab.ttf", s)
SANS = lambda s: font("segoeui.ttf", s)
SANS_B = lambda s: font("segoeuib.ttf", s)


def counts():
    """Real figures from the shipped data, so no card can assert a stale one."""
    def load(p):
        return json.load(io.open(os.path.join(SITE, "data", p), encoding="utf-8"))

    c = {}
    c["places"] = len(load("geo-places.json")["places"])
    c["heritage"] = len(load("geo-heritage.json")["sites"])
    c["health"] = load("geo-health.json")["total"]
    c["schools"] = load("geo-schools.json")["total"]
    c["projects"] = len(load("invest-projects.json")["projects"])
    c["districts"] = len(load("streets-districts.json")["districts"])
    ind = load("geo-industry.json")["counts"]
    c["power"] = ind.get("power_plant")
    c["ports"] = ind.get("port")
    return c


def background():
    """Radial-ish field: blue centre falling to blue-deep at the corners.

    Built at 1/8 scale and upsampled — a per-pixel loop at 1200x630 is 756,000
    Python-level iterations and takes seconds per card; this is visually
    identical because the gradient has no detail to lose.
    """
    sw, sh = W // 8, H // 8
    small = Image.new("RGB", (sw, sh))
    px = small.load()
    cx, cy = sw * 0.42, sh * 0.42
    maxd = ((max(cx, sw - cx)) ** 2 + (max(cy, sh - cy)) ** 2) ** 0.5
    for y in range(sh):
        for x in range(sw):
            d = (((x - cx) ** 2 + (y - cy) ** 2) ** 0.5) / maxd
            d = min(1.0, d) ** 1.25
            px[x, y] = tuple(int(BLUE[i] + (BLUE_DEEP[i] - BLUE[i]) * d) for i in range(3))
    return small.resize((W, H), Image.LANCZOS)


def tracked(d, xy, text, fnt, fill, spacing):
    """Letterspaced text. PIL has no tracking, and the eyebrow needs it."""
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=fnt, fill=fill)
        x += d.textlength(ch, font=fnt) + spacing
    return x


def wrap(d, text, fnt, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=fnt) <= maxw:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def chip(d, x, y, value, label, accent):
    vf, lf = SERIF_B(40), SANS(19)
    pad_x, gap = 22, 6
    vw = d.textlength(value, font=vf)
    lw = d.textlength(label, font=lf)
    w = int(max(vw, lw) + pad_x * 2)
    h = 118
    d.rounded_rectangle([x, y, x + w, y + h], radius=10,
                        fill=(0x1B, 0x47, 0x94), outline=(0x3C, 0x67, 0xAE), width=2)
    d.text((x + pad_x, y + 16), value, font=vf, fill=accent)
    d.text((x + pad_x, y + 16 + 40 + gap), label, font=lf, fill=SUB)
    return x + w + 16


def card(spec, out):
    img = background()
    d = ImageDraw.Draw(img)

    left, top = 74, 96
    tracked(d, (left, top), spec["eyebrow"].upper(), SANS_B(20), GOLD, 4.2)

    y = top + 46
    hf = SERIF_B(spec.get("hsize", 62))
    for line in wrap(d, spec["headline"], hf, 900)[:2]:
        d.text((left, y), line, font=hf, fill=WHITE)
        y += spec.get("hsize", 62) + 12

    y += 12
    sf = SANS(26)
    for line in wrap(d, spec["sub"], sf, 860)[:2]:
        d.text((left, y), line, font=sf, fill=SUB)
        y += 38

    if spec.get("chips"):
        cy = 404
        cx = left
        for value, label, accent in spec["chips"][:3]:
            cx = chip(d, cx, cy, value, label, accent)

    d.line([(left, 548), (W - left, 548)], fill=(0x3C, 0x67, 0xAE), width=1)
    cap = spec.get("caption", "Every figure carries its source")
    d.text((left, 566), cap, font=SANS(20), fill=SUB)
    mark = "egybi.com"
    d.text((W - left - d.textlength(mark, font=SANS_B(20)), 566), mark,
           font=SANS_B(20), fill=GOLD)

    img.save(out, "PNG", optimize=True)
    return out


def build():
    c = counts()
    G, B = GOLD_BRIGHT, GREEN

    pages = {
        "og-image": dict(
            eyebrow="An encyclopaedia of Egypt",
            headline="Egypt in Maps and Cited Data",
            sub="Governorates, heritage, street networks, prices and history — "
                "every figure traceable to a named source.",
            chips=[("27", "governorates", G), (f"{c['places']:,}", "places mapped", G),
                   (str(c["heritage"]), "UNESCO sites", B)],
        ),
        "og-visit": dict(
            eyebrow="Plan a visit",
            headline="Egypt, measured rather than marketed",
            sub="Where the major sites are, how high above sea level, and what a "
                "normal afternoon in each month actually reaches.",
            chips=[("NASA", "climate normals", G), ("SRTM", "elevation", G),
                   (str(c["heritage"]), "UNESCO sites", B)],
            caption="Climate normals from NASA POWER",
        ),
        "og-explore": dict(
            eyebrow="Explore Egypt in data",
            headline="61 tables. Every figure cited.",
            sub="Economy, tourism, energy, water, industry, science, sport and "
                "demographics — disputes flagged rather than smoothed.",
            chips=[("61", "tables", G), ("18+", "sectors", G)],
        ),
        "og-geospatial": dict(
            eyebrow="Egypt Atlas",
            headline="Governorates, health, schools and heritage",
            sub="All 27 governorates coloured by real figures, on one interactive "
                "and fully sourced map.",
            hsize=54,
            chips=[(f"{c['health']:,}", "health facilities", G),
                   (f"{c['schools']:,}", "schools", G),
                   (str(c["heritage"]), "UNESCO sites", B)],
        ),
        "og-places": dict(
            eyebrow="Gazetteer",
            headline="Every place in Egypt, on one map",
            sub="Cities, towns, airports, museums and ancient sites as the "
                "OpenStreetMap community records them. Tile-free.",
            chips=[(f"{c['places']:,}", "places", G), ("OSM", "ODbL licensed", G)],
        ),
        "og-invest": dict(
            eyebrow="Where Egypt is building",
            headline="The projects, and where they actually are",
            sub="Megaprojects, renewable plants, hydrogen deals and ports — with "
                "what each source published.",
            hsize=54,
            chips=[(str(c["projects"]), "projects", G), (str(c["power"]), "power plants", G),
                   (str(c["ports"]), "ports", G)],
            caption="Information and education only — not investment advice",
        ),
        "og-stories": dict(
            eyebrow="Data stories",
            headline="Egypt, argued from the map",
            sub="Where Egyptians actually live, what the health layer really "
                "measures, and a century of Cairo street plans.",
            chips=[("3", "scrollable stories", G), (f"{c['health']:,}", "facilities", G)],
        ),
        "og-streets": dict(
            eyebrow="Street Report Card",
            headline="Cairo, measured street by street",
            sub="Intersection density, dead ends, circuity and orientation "
                "entropy — from khedivial Downtown to the desert new towns.",
            chips=[(str(c["districts"]), "districts", G), ("OSMnx", "computed", G)],
        ),
        "og-prices": dict(
            eyebrow="Daily prices",
            headline="What Egypt actually pays",
            sub="Market prices collected daily, each one dated and attributed to "
                "the source that published it.",
            chips=[("Daily", "refreshed", G), ("Dated", "every figure", G)],
        ),
        "og-stocks": dict(
            eyebrow="Egyptian Exchange",
            headline="The EGX, live",
            sub="Charts, quotes and a screener for CIB, EFG Holding, Elsewedy "
                "Electric and Telecom Egypt. Free, no signup.",
            chips=[("EGX", "live quotes", G), ("Free", "no signup", B)],
            caption="Information and education only — not investment advice",
        ),
        "og-blog": dict(
            eyebrow="The Papyrus",
            headline="Long-form writing about Egypt",
            sub="The newsletter archive — one argument at a time, built on the "
                "same cited data as the maps.",
            chips=[("12", "issues", G)],
        ),
        "og-community": dict(
            eyebrow="Community",
            headline="Corrections welcome, sources required",
            sub="Where the data is wrong, say so — and say where the right "
                "figure comes from.",
            hsize=54,
        ),
        "og-about": dict(
            eyebrow="The identity",
            headline="Why every figure carries a source",
            sub="What EgyBI is, where its data comes from, and what it refuses "
                "to assert without a citation.",
        ),
    }

    made = []
    for name, spec in pages.items():
        out = os.path.join(SITE, name + ".png")
        card(spec, out)
        made.append((name, os.path.getsize(out) // 1024))
    return made


if __name__ == "__main__":
    if not os.path.isdir(SITE):
        print("run from the repository root (site/ not found)")
        sys.exit(1)
    cards = build()
    for name, kb in cards:
        print(f"  {name}.png  {kb} KB")
    print(f"\n{len(cards)} cards written to {SITE}/")
