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
shown at the foot of the second sheet, under the sign-off, as it was painted:
never blended into the paper, so its colours stay its own. Only the cream it was
painted on is taken away. Every pixel gets an opacity from how far it is from
that cream, the cream's share is lifted back out of its colour, and the result
is saved as a WebP with an alpha channel, so the letter's paper shows around and
between the paint and there is no rectangle where the painting's paper meets it.

Remove any of them and run this again to leave that place bare (the stamp falls
back to its drawn posy).
"""
import base64
import io
import json
import pathlib

import numpy as np
from PIL import Image

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


def levelled(img):
    """The drawing with its ground lifted to white.

    The ground is whatever the corners are, outside the round design.
    """
    w, h = img.size
    corners = [img.getpixel(p) for p in ((2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3))]
    ground = [sum(c[i] for c in corners) / len(corners) for i in range(3)]
    bands = [band.point(lambda v, g=g: min(255, round(v * 255 / g)))
             for band, g in zip(img.split(), ground)]
    return Image.merge("RGB", bands)


def without_ground(img, lo=14, hi=48, fade=.06):
    """The picture with the paper it was painted on made transparent.

    The ground is the median of a strip round the edge. A pixel within lo of it
    (RGB distance) goes fully transparent, one past hi stays fully opaque, and
    in between it eases from one to the other. A half-transparent pixel is
    paint mixed with that ground, so the ground is taken back out of its colour
    -- otherwise every soft edge would carry a cream fringe onto the letter.
    Its colours are left as they are.
    """
    a = np.asarray(img).astype(np.float32)
    strip = 8
    border = np.concatenate([a[:strip].reshape(-1, 3), a[-strip:].reshape(-1, 3),
                             a[:, :strip].reshape(-1, 3), a[:, -strip:].reshape(-1, 3)])
    ground = np.median(border, axis=0)
    t = np.clip((np.sqrt(((a - ground) ** 2).sum(-1)) - lo) / (hi - lo), 0, 1)
    alpha = (t * t * (3 - 2 * t))[..., None]
    colour = np.clip((a - (1 - alpha) * ground) / np.maximum(alpha, 1e-3), 0, 255)
    colour = np.where(alpha > .02, colour, ground)
    # paint that runs off the edge of the picture would end in a ruled line
    # across the letter, so the outermost few percent fade out as well. This
    # only thins the paint there; its colour is already worked out above.
    h, w = alpha.shape[:2]
    edge = max(1.0, min(w, h) * fade)
    def ramp(n):
        r = np.clip(np.minimum(np.arange(n), np.arange(n)[::-1]) / edge, 0, 1)
        return r * r * (3 - 2 * r)
    alpha = alpha * np.outer(ramp(h), ramp(w))[..., None]
    return Image.fromarray(np.dstack([colour, alpha * 255]).astype(np.uint8), "RGBA")


def webp(img, quality):
    buf = io.BytesIO()
    img.save(buf, "WEBP", quality=quality, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


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
        letter_picture = webp(without_ground(img), 74)
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
