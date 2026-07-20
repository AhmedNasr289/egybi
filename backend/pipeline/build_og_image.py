"""Render backend/assets/og-image.html -> site/og-image.png at exactly 1200x630.

The OG image used to be a hand-made PNG with no source, so it silently drifted
out of step with the site: a stale dataset count, off-brand type, and an "ankh"
that was actually the Venus symbol. Keeping the source in HTML and rendering it
here means the thumbnail is regenerated, not redrawn.

Uses headless Chrome, which is already on this machine - cairosvg needs a
native cairo build that Windows does not ship, and the `convert` on PATH is
Windows' filesystem tool, not ImageMagick.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SRC = REPO / "backend" / "assets" / "og-image.html"
OUT = REPO / "site" / "og-image.png"

WIDTH, HEIGHT = 1200, 630

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
    raise SystemExit("No Chrome/Edge binary found - cannot render the OG image.")


def main() -> int:
    if not SRC.is_file():
        raise SystemExit(f"Missing source: {SRC}")

    chrome = find_chrome()

    # A throwaway profile keeps this from touching the user's real Chrome data.
    with tempfile.TemporaryDirectory() as profile:
        cmd = [
            chrome,
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            f"--user-data-dir={profile}",
            f"--window-size={WIDTH},{HEIGHT}",
            f"--screenshot={OUT}",
            # Webfonts are fetched from Google Fonts; without a virtual-time
            # budget Chrome screenshots before they land and silently falls
            # back to Times, which is exactly the drift this script prevents.
            "--virtual-time-budget=10000",
            SRC.as_uri(),
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

    if not OUT.is_file():
        sys.stderr.write(proc.stderr[-2000:] + "\n")
        raise SystemExit("Chrome produced no output file.")

    # Verify the dimensions rather than trusting the flag - a wrong-sized OG
    # image gets cropped unpredictably by each platform.
    try:
        from PIL import Image

        with Image.open(OUT) as im:
            if im.size != (WIDTH, HEIGHT):
                raise SystemExit(f"Expected {WIDTH}x{HEIGHT}, got {im.size[0]}x{im.size[1]}")
            print(f"OK  {OUT.relative_to(REPO)}  {im.size[0]}x{im.size[1]}  "
                  f"{OUT.stat().st_size // 1024} KB")
    except ImportError:
        print(f"OK  {OUT.relative_to(REPO)}  ({OUT.stat().st_size // 1024} KB, size unverified)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
