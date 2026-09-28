"""Render extension/icons/icon.svg to the PNG sizes Chrome needs.

    python scripts/generate_icons.py

Uses Playwright's Chromium (installed with `pip install "scrapling[fetchers]"`
or `pip install playwright && playwright install chromium`).
"""
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ICONS = ROOT / "extension" / "icons"
SIZES = (16, 32, 48, 128)


def main() -> None:
    svg = (ICONS / "icon.svg").read_text()
    with sync_playwright() as p:
        # CHROMIUM_PATH lets you point at an existing Chrome/Chromium binary
        browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH") or None)
        for size in SIZES:
            page = browser.new_page(viewport={"width": size, "height": size})
            page.set_content(
                f'<html><body style="margin:0;background:transparent">'
                f'<div style="width:{size}px;height:{size}px">{svg.replace("<svg ", f"<svg width={size} height={size} ", 1)}</div>'
                f"</body></html>"
            )
            out = ICONS / f"icon{size}.png"
            page.screenshot(path=str(out), omit_background=True, clip={"x": 0, "y": 0, "width": size, "height": size})
            print(f"Written: {out.relative_to(ROOT)}")
            page.close()
        browser.close()


if __name__ == "__main__":
    main()
