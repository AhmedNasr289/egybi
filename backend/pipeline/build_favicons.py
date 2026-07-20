"""Render site/favicon.svg -> favicon.ico + PNG icons.

Google was showing the generic globe next to every egybi.com result. Cause:
the only icon declared was an SVG, and https://egybi.com/favicon.ico returned
404. Google's favicon crawler falls back to /favicon.ico when it cannot use the
declared icon, and Google documents a 48x48 minimum (ideally a multiple of 48),
so a lone SVG with no raster fallback is the classic way to end up with a globe.

Same approach as build_og_image.py: headless Chrome, because cairosvg needs a
native cairo build Windows does not ship and the `convert` on PATH here is
Windows' filesystem tool, not ImageMagick.

Rebuild:  python backend/pipeline/build_favicons.py
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SVG = REPO / "site" / "favicon.svg"
SITE = REPO / "site"

# 512 is rendered once at high quality, then downsampled with Lanczos. The .ico
# carries 16/32/48 because Google wants >=48 and browsers still ask for 16/32.
MASTER = 512
ICO_SIZES = [(16, 16), (32, 32), (48, 48), (96, 96), (192, 192)]

CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "google-chrome",
    "chromium",
]


def find_chrome() -> str:
    for cand in CHROME_CANDIDATES:
        if Path(cand).is_file():
            return cand
        found = shutil.which(cand)
        if found:
            return found
    raise SystemExit("No Chrome/Edge binary found - cannot rasterise the favicon.")


def main() -> int:
    if not SVG.is_file():
        raise SystemExit(f"Missing {SVG}")

    from PIL import Image

    chrome = find_chrome()
    master_png = SITE / "icon-512.png"

    # The SVG has no intrinsic pixel size, so wrap it in a page sized exactly to
    # the master resolution; otherwise Chrome renders it at some default and the
    # downsamples come out soft.
    with tempfile.TemporaryDirectory() as tmp:
        page = Path(tmp) / "icon.html"
        page.write_text(
            "<style>html,body{margin:0;padding:0;background:none}"
            f"img{{width:{MASTER}px;height:{MASTER}px;display:block}}</style>"
            f'<img src="{SVG.as_uri()}">',
            encoding="utf-8",
        )
        subprocess.run(
            [
                chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                "--force-device-scale-factor=1", "--default-background-color=00000000",
                f"--user-data-dir={tmp}", f"--window-size={MASTER},{MASTER}",
                f"--screenshot={master_png}", "--virtual-time-budget=5000",
                page.as_uri(),
            ],
            capture_output=True, text=True, timeout=120,
        )

    if not master_png.is_file():
        raise SystemExit("Chrome produced no PNG.")

    with Image.open(master_png) as im:
        im = im.convert("RGBA")
        if im.size != (MASTER, MASTER):
            raise SystemExit(f"Expected {MASTER}x{MASTER}, got {im.size}")

        # Multi-resolution .ico at the canonical root path Google probes.
        im.save(SITE / "favicon.ico", format="ICO", sizes=ICO_SIZES)

        for px in (192, 512):
            im.resize((px, px), Image.LANCZOS).save(SITE / f"icon-{px}.png", format="PNG")
        # 180 is the Apple touch icon size; harmless elsewhere.
        im.resize((180, 180), Image.LANCZOS).save(SITE / "apple-touch-icon.png", format="PNG")

    for f in ("favicon.ico", "icon-192.png", "icon-512.png", "apple-touch-icon.png"):
        p = SITE / f
        with Image.open(p) as chk:
            print(f"OK  site/{f:<22} {chk.size[0]}x{chk.size[1]}  {p.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
