#!/usr/bin/env python3
"""Regenerate assets/stamp-art.js from the pictures in assets/stamp/ and assets/letter/.

The pictures travel inside every invitation as base64 data URLs, because a
minted invitation is one self-contained file with no network access.

    python3 tools/build-stamp-art.py

The stamp. Whatever is sitting at assets/stamp/couple.(jpg|png) goes into the
stamp on the envelope. To swap it for another drawing, drop the new artwork in
under that name and run this again -- nothing else changes. Portrait, roughly
4:5, and a few hundred pixels wide is plenty; the stamp is about 88 CSS pixels
across.

The watermark. The same drawing is printed faintly across the first sheet of
the letter. That copy is levelled so the drawing's own ground goes to pure white
and saved as a JPEG: the letter multiplies it onto the paper, so white is where
nothing lands, and the paper's own grain shows straight through the drawing
with no box around it.

The picture. Whatever is sitting at assets/letter/picture.(jpg|png|webp) is
printed at full strength at the foot of the second sheet, under the sign-off.
It gets the same levelling, and its edges are feathered out to white as well,
so a ground that is not quite even still has no rim where it meets the paper.

Remove any of them and run this again to leave that place bare (the stamp falls
back to its drawn posy).
"""
import base64
import io
import json
import pathlib

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
PICTURE_WIDTH = 1000     # the second sheet is at most ~560 CSS px of writing across; 2x screens

HEADER = """/* The pictures in the invitation, base64'd so a minted invitation stays a
 * single self-contained file: the stamp, the watermark on the first sheet of
 * the letter, and the picture at the foot of the second.
 *
 * GENERATED FILE -- do not hand-edit. Replace assets/stamp/couple.jpg (or .png)
 * or assets/letter/picture.jpg (or .png, .webp) and run:
 * python3 tools/build-stamp-art.py
 */
"""


def find(folder, stem, types):
    folder = ROOT / "assets" / folder
    if not folder.is_dir():
        return None
    return next((p for p in sorted(folder.iterdir())
                 if p.stem == stem and p.suffix.lower() in types), None)


def levelled(img, white_point=1.0):
    """The picture with its ground lifted to white.

    The ground is whatever the corners are: outside a round design, or the
    margin of a painting. white_point below 1 lifts everything within that
    fraction of the ground to white too, which takes a paper grain out with it.
    """
    w, h = img.size
    corners = [img.getpixel(p) for p in ((2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3))]
    ground = [sum(c[i] for c in corners) / len(corners) * white_point for i in range(3)]
    bands = [band.point(lambda v, g=g: min(255, round(v * 255 / g)))
             for band, g in zip(img.split(), ground)]
    return Image.merge("RGB", bands)


def feathered(img, fraction=0.06):
    """Fade the outermost few percent of a picture to white."""
    w, h = img.size
    edge = round(min(w, h) * fraction)
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rectangle((edge, edge, w - 1 - edge, h - 1 - edge), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(edge / 2))
    return Image.composite(img, Image.new("RGB", (w, h), "white"), mask)


def jpeg(img, quality):
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=quality, optimize=True, progressive=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def main():
    stamp = find("stamp", "couple", (".jpg", ".jpeg", ".png"))
    picture = find("letter", "picture", TYPES)

    stamp_art = watermark = letter_picture = ""
    if stamp is not None:
        stamp_art = ("data:" + TYPES[stamp.suffix.lower()] + ";base64," +
                     base64.b64encode(stamp.read_bytes()).decode("ascii"))
        watermark = jpeg(levelled(Image.open(stamp).convert("RGB")), 78)
    else:
        print("no assets/stamp/couple.{jpg,png}; stamp keeps its drawn flowers, first sheet goes bare")

    if picture is not None:
        img = Image.open(picture).convert("RGB")
        if img.width > PICTURE_WIDTH:
            img = img.resize((PICTURE_WIDTH, round(img.height * PICTURE_WIDTH / img.width)), Image.LANCZOS)
        letter_picture = jpeg(feathered(levelled(img, white_point=.96)), 72)
    else:
        print("no assets/letter/picture.{jpg,png,webp}; second sheet goes without")

    out = ROOT / "assets" / "stamp-art.js"
    out.write_text(
        HEADER +
        "window.STAMP_ART = " + json.dumps(stamp_art) + ";\n" +
        "window.LETTER_ART = " + json.dumps(watermark) + ";\n" +
        "window.LETTER_PICTURE = " + json.dumps(letter_picture) + ";\n",
        encoding="utf-8",
    )
    print(f"wrote {out.relative_to(ROOT)} ({out.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
