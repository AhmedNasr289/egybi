#!/usr/bin/env python3
"""
Build the Egypt silhouette used as the device on the home-page flag.

WHY THIS IS GENERATED RATHER THAN DRAWN. The obvious way to put a flag on a
home page is to draw one, or to fetch an image of one. Both were rejected.

The national flag of Egypt carries the Eagle of Saladin. Rendering a national
emblem from memory produces a confident-looking approximation that is wrong in
its details, on the front page of a site whose entire claim is that it does not
do that. Fetching an emblem needs a network the build does not have and a
licence chain nobody here has checked.

So the home page does not claim to show the state flag. It shows the site's own
device: the three bands of Egypt, with the OUTLINE OF THE COUNTRY where the
emblem would sit — and that outline is not drawn either. It is generated from
`egy_adm1_simplified.geojson`, the same geoBoundaries geometry the Atlas and
the Explore choropleth render. The shape on the flag and the shape on the maps
are the same measurements.

That has a consequence worth stating plainly: this makes the home page a
derivative of a CC BY 4.0 dataset, so index.html must carry the geoBoundaries
attribution exactly as the map pages do. `backend/verify/all-pages.js` enforces
it rather than leaving it to memory.

HOW THE 27 GOVERNORATES BECOME ONE COUNTRY. A dissolve normally means shapely.
It is not needed: mapshaper's `-clean` left the borders topologically exact, so
every internal border edge appears in exactly two rings and every coastal or
frontier edge appears in exactly one. Counting undirected edges and keeping the
ones seen once yields the national outline exactly — measured on this file,
386 internal edges cancel and 590 exterior edges remain. The survivors are then
stitched back into closed rings.

TWO EARLIER ATTEMPTS, BOTH WORTH KNOWING ABOUT:

1. Draw all 27 rings into one filled path and let `fill-rule` hide the internal
   borders. This renders correctly and wastes about 60% of its bytes on borders
   nobody can see.

2. The same, but simplified per ring with Douglas-Peucker to cut those bytes.
   This is the obvious optimisation and it is wrong: a border simplified from
   the Qena side and from the Red Sea side keeps different vertices, the two
   rings stop coinciding, and the fill leaves a hairline gap. Rendered at three
   sizes the result had dark cracks down the Nile valley and across the Delta.
   The byte count looked excellent throughout, which is the whole problem.

Dissolving first removes the hazard rather than avoiding it: once there are no
shared borders left, Douglas-Peucker has nothing to tear, so the exterior rings
ARE simplified here — safely, and only after the dissolve.

Run:  python backend/pipeline/build_flag.py
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "..", "egy_adm1_simplified.geojson")
OUT = os.path.join(HERE, "..", "..", "site", "assets", "egypt-silhouette.svg")

# The device is painted about 46 px tall inside the flag and up to ~150 px on a
# wide screen, so the tolerance below is set against the largest size it is ever
# drawn: 0.5 viewBox units is 0.75 px at 150 px tall.
VIEW_H = 100.0
TOLERANCE = 0.5
PRECISION = 1           # decimal places in the emitted path
# Rings smaller than this on both axes are sub-pixel specks — Mediterranean and
# Red Sea islets that render as dirt rather than as coastline. Dropped, and the
# count is printed so the drop is never silent.
MIN_RING_SPAN = 1.2

# Baked in rather than left as currentColor, because the flag loads the file
# through <img>, and an image is an isolated document that inherits nothing from
# the page. The device crosses all three bands, so it needs to read against
# white, red and near-black alike: gold alone disappears on the white band, and
# the thin dark stroke is what keeps it legible on every one of them.
FILL = "#C9A227"        # --gold
STROKE = "#241F1A"
STROKE_W = "0.9"


def rings(geom):
    """Yield every outer ring, whether the feature is a Polygon or a MultiPolygon.

    Interior rings (holes) are dropped deliberately. Egypt's governorate
    polygons carry none that survive to this scale, and a hole in a silhouette
    at 46 px would read as a rendering fault rather than a lake.
    """
    t = geom.get("type")
    if t == "Polygon":
        yield geom["coordinates"][0]
    elif t == "MultiPolygon":
        for poly in geom["coordinates"]:
            yield poly[0]


def dissolve(all_rings):
    """Drop every edge shared by two rings; stitch the survivors into rings.

    Returns (exterior_rings, internal_edge_count). Relies on shared vertices
    being bit-identical, which mapshaper's `-clean` guarantees and which
    main() verifies before trusting the result.
    """
    seen = {}
    for ring in all_rings:
        for i in range(len(ring) - 1):
            a = (ring[i][0], ring[i][1])
            b = (ring[i + 1][0], ring[i + 1][1])
            if a == b:
                continue
            key = (a, b) if a <= b else (b, a)
            seen[key] = seen.get(key, 0) + 1

    internal = sum(1 for c in seen.values() if c > 1)
    adjacency = {}
    for (a, b), count in seen.items():
        if count != 1:
            continue
        adjacency.setdefault(a, []).append(b)
        adjacency.setdefault(b, []).append(a)

    out = []
    # Walk each connected loop once. Sorting the start points keeps the output
    # byte-identical between runs, which the generator contract requires.
    unused = {k: list(v) for k, v in adjacency.items()}
    for start in sorted(adjacency):
        while unused.get(start):
            ring, node, prev = [start], start, None
            while True:
                nxt = None
                for cand in unused.get(node, []):
                    if cand != prev:
                        nxt = cand
                        break
                if nxt is None:
                    break
                unused[node].remove(nxt)
                if nxt in unused and node in unused[nxt]:
                    unused[nxt].remove(node)
                if nxt == start:
                    break
                ring.append(nxt)
                prev, node = node, nxt
            if len(ring) >= 3:
                out.append(ring)
    return out, internal


def perpendicular_distance(pt, a, b):
    (x, y), (x1, y1), (x2, y2) = pt, a, b
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot(x - x1, y - y1)
    return abs(dy * x - dx * y + x2 * y1 - y2 * x1) / math.hypot(dx, dy)


def simplify(points, tol):
    """Douglas-Peucker, iterative so a long coastline cannot blow the stack.

    Safe here only because it runs AFTER the dissolve — see the module note.
    """
    if len(points) < 3:
        return points[:]
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        first, last = stack.pop()
        worst, worst_i = 0.0, -1
        for i in range(first + 1, last):
            d = perpendicular_distance(points[i], points[first], points[last])
            if d > worst:
                worst, worst_i = d, i
        if worst > tol:
            keep[worst_i] = True
            stack.append((first, worst_i))
            stack.append((worst_i, last))
    return [p for p, k in zip(points, keep) if k]


def main():
    with open(SRC, "r", encoding="utf-8") as f:
        geo = json.load(f)

    all_rings = []
    for feat in geo["features"]:
        all_rings.extend(list(rings(feat["geometry"])))
    if not all_rings:
        sys.exit("No rings found in %s — the source is not what this expects." % SRC)

    exterior, internal = dissolve(all_rings)
    if not internal:
        sys.exit(
            "Dissolve found no shared edges at all in %s.\n"
            "That means the governorate borders are no longer topologically "
            "identical — most likely the file was re-simplified without "
            "mapshaper's -clean. Every internal border would be drawn as "
            "coastline. Refusing to write a silhouette from it."
            % os.path.basename(SRC))
    if not exterior:
        sys.exit("Dissolve produced no exterior rings — refusing to write an empty flag.")

    lons = [p[0] for r in exterior for p in r]
    lats = [p[1] for r in exterior for p in r]
    lon0, lon1 = min(lons), max(lons)
    lat0, lat1 = min(lats), max(lats)

    # Equirectangular with the x axis scaled by cos(mean latitude). At Egypt's
    # 10 degrees of latitude this keeps the proportions a reader recognises;
    # a conformal projection would be the right call for a map and is
    # unnecessary for a 46 px silhouette.
    kx = math.cos(math.radians((lat0 + lat1) / 2))
    scale = VIEW_H / (lat1 - lat0)
    view_w = (lon1 - lon0) * kx * scale

    def project(lon, lat):
        return ((lon - lon0) * kx * scale, (lat1 - lat) * scale)   # SVG y grows down

    parts, kept, total, dropped = [], 0, 0, 0
    for ring in exterior:
        pts = [project(lon, lat) for lon, lat in ring]
        total += len(pts)
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        if max(xs) - min(xs) < MIN_RING_SPAN and max(ys) - min(ys) < MIN_RING_SPAN:
            dropped += 1
            continue
        pts = simplify(pts, TOLERANCE)
        if len(pts) < 3:
            dropped += 1
            continue
        kept += len(pts)
        parts.append("M" + " ".join(
            "%.*f,%.*f" % (PRECISION, x, PRECISION, y) for x, y in pts) + "Z")

    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %.1f %.1f" '
        'role="img" aria-label="The outline of Egypt">\n'
        '<title>Egypt</title>\n'
        '<!-- Generated by backend/pipeline/build_flag.py from '
        'egy_adm1_simplified.geojson.\n'
        '     Boundaries: geoBoundaries.org EGY ADM1, CC BY 4.0 '
        '(Runfola et al., 2020).\n'
        '     Do not hand-edit: rerun the script. -->\n'
        '<path fill="%s" fill-rule="nonzero" stroke="%s" stroke-width="%s" '
        'stroke-linejoin="round" d="%s"/>\n'
        '</svg>\n'
    ) % (view_w, VIEW_H, FILL, STROKE, STROKE_W, "".join(parts))

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(svg)

    print("Wrote %s" % os.path.relpath(OUT))
    print("  dissolve: %d internal border edges cancelled, %d exterior rings"
          % (internal, len(exterior)))
    print("  %d rings drawn (%d dropped as sub-pixel), %d of %d vertices kept "
          "at tolerance %.2f" % (len(parts), dropped, kept, total, TOLERANCE))
    print("  %d bytes, viewBox 0 0 %.1f %.1f"
          % (len(svg.encode("utf-8")), view_w, VIEW_H))


if __name__ == "__main__":
    main()
