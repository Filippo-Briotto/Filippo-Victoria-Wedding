#!/usr/bin/env python3
"""Regenerate assets/stamp-art.js from the artwork in assets/stamp/.

The picture in the stamp travels inside every invitation as a base64 data URL,
because a minted invitation is one self-contained file with no network access.
This turns whatever is sitting at assets/stamp/couple.(jpg|png) into that string.

    python3 tools/build-stamp-art.py

To swap the photograph for a drawing later, drop the new artwork in as
assets/stamp/couple.jpg or couple.png and run this again -- nothing else changes.
Portrait, roughly 4:5, and a few hundred pixels wide is plenty; the stamp is
about 88 CSS pixels across.

The same picture is also printed faintly across each sheet of the letter, like a
watermark. That copy is levelled so the drawing's own ground goes to pure white
and saved as a JPEG: the letter multiplies it onto the paper, so white is where
nothing lands, and the paper's own grain shows straight through the drawing
with no box around it.
"""
import base64
import io
import json
import pathlib

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
ART_DIR = ROOT / "assets" / "stamp"
TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}

HEADER = """/* The picture in the stamp, base64'd so a minted invitation stays a single
 * self-contained file.
 *
 * GENERATED FILE -- do not hand-edit. Replace assets/stamp/couple.jpg (or .png)
 * and run: python3 tools/build-stamp-art.py
 */
"""


def watermark(art):
    """The picture with its ground lifted to white, as a JPEG data URL."""
    img = Image.open(art).convert("RGB")
    w, h = img.size
    # the ground is whatever the corners are: outside a round design, or the
    # margin of a photograph
    corners = [img.getpixel(p) for p in ((2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3))]
    ground = [sum(c[i] for c in corners) / len(corners) for i in range(3)]
    bands = [band.point(lambda v, g=g: min(255, round(v * 255 / g)))
             for band, g in zip(img.split(), ground)]
    buf = io.BytesIO()
    Image.merge("RGB", bands).save(buf, "JPEG", quality=78, optimize=True, progressive=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def main():
    art = next((p for p in sorted(ART_DIR.iterdir())
                if p.stem == "couple" and p.suffix.lower() in TYPES), None)
    if art is None:
        # nothing to embed: the stamp falls back to its drawn posy
        out = ROOT / "assets" / "stamp-art.js"
        out.write_text(HEADER + "window.STAMP_ART = \"\";\nwindow.LETTER_ART = \"\";\n", encoding="utf-8")
        print("no assets/stamp/couple.{jpg,png}; stamp keeps its drawn flowers, letter goes bare")
        return

    mime = TYPES[art.suffix.lower()]
    data = base64.b64encode(art.read_bytes()).decode("ascii")
    out = ROOT / "assets" / "stamp-art.js"
    out.write_text(
        HEADER + "window.STAMP_ART = " + json.dumps("data:" + mime + ";base64," + data) + ";\n" +
        "window.LETTER_ART = " + json.dumps(watermark(art)) + ";\n",
        encoding="utf-8",
    )
    print(f"wrote {out.relative_to(ROOT)} from {art.name} "
          f"({out.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
