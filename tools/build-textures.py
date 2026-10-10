#!/usr/bin/env python3
"""Render the paper, ticket stock, printed-cotton and linen tiles as real images.

    python3 tools/build-textures.py

The piece used to lean on a single SVG fractal-noise overlay for its paper,
which is why it read as flat and vectorial: one frequency, no fibre, no
mottling, no colour life. These are built in the frequency domain instead --
a random field shaped by a 1/f falloff and inverse-transformed -- which gives
several things at once:

  * layered scales, so there is coarse mottling under fine grain rather than
    one uniform fizz;
  * fibre, by stretching the falloff along an axis so the noise smears into
    strands the way pulp actually lies;
  * seamless tiles for free, because an inverse FFT is periodic by
    construction, so no edge blending is needed.

Written out as small JPEGs: they are lossy, but the artefacts land inside noise
that is already random, and a tile costs tens of kilobytes instead of hundreds.
"""
import base64
import io
import json
import pathlib

import numpy as np
from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
RNG = np.random.default_rng(20261228)


def field(size, exponent, stretch=(1.0, 1.0)):
    """A periodic random field whose energy falls off as 1/f**exponent.

    stretch squashes the frequency axes, which smears the noise into strands
    along the stretched direction -- fibres in paper, threads in cloth.
    """
    fy = np.fft.fftfreq(size)[:, None] * stretch[0]
    fx = np.fft.fftfreq(size)[None, :] * stretch[1]
    radius = np.sqrt(fy ** 2 + fx ** 2)
    radius[0, 0] = 1e-6
    spectrum = np.fft.fft2(RNG.normal(size=(size, size))) / radius ** exponent
    spectrum[0, 0] = 0
    out = np.real(np.fft.ifft2(spectrum))
    return out / (np.abs(out).max() + 1e-9)


def to_png_or_jpeg(img, quality):
    buf = io.BytesIO()
    img.save(buf, 'JPEG', quality=quality, optimize=True, subsampling=0)
    return buf.getvalue()


def paper(size=320):
    """Writing stock: mottled, fibrous, faintly uneven in colour."""
    mottle = field(size, 2.4)
    grain = field(size, 0.35)                      # near-white noise: the tooth
    tooth = field(size, 0.9)
    fibre = field(size, 1.7, stretch=(1.0, 0.14))

    # weighted towards the high frequencies -- low-frequency mottling alone just
    # looks like clouds, and it was the grain that was missing
    light = 1.0 + 0.032 * mottle + 0.055 * grain + 0.035 * tooth + 0.045 * fibre

    # paper is not neutral: the thin places run warm, the thick ones cool
    warmth = 0.5 + 0.5 * mottle
    base = np.stack([
        np.full((size, size), 247.0) * light + 5 * warmth,
        np.full((size, size), 240.0) * light + 2 * warmth,
        np.full((size, size), 224.0) * light - 3 * warmth,
    ], axis=-1)

    # a few flecks of pulp that did not break down
    specks = field(size, 0.4)
    base -= 26 * np.clip(specks - 0.72, 0, None)[..., None] * np.array([1.0, 1.05, 1.2])

    return Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))


def ticket(size=320):
    """Ticket stock: thinner and smoother than writing paper, with the faint
    horizontal grain a card picks up going through a machine, and a whisper of
    the security tint printed under the ink."""
    grain = field(size, 0.3)
    machine = field(size, 1.1, stretch=(0.05, 1.0))    # drawn through, lengthwise
    mottle = field(size, 2.2)

    light = 1.0 + 0.026 * grain + 0.03 * machine + 0.018 * mottle
    base = np.stack([
        np.full((size, size), 250.0) * light,
        np.full((size, size), 246.0) * light,
        np.full((size, size), 235.0) * light,
    ], axis=-1)

    # the tint: a fine lattice, the way a real pass has guilloche under the type
    yy, xx = np.mgrid[0:size, 0:size]
    lattice = (np.sin(xx * np.pi * 2 * 6 / size) * np.sin(yy * np.pi * 2 * 6 / size)
               + np.sin((xx + yy) * np.pi * 2 * 5 / size))
    base -= 2.4 * lattice[..., None] * np.array([1.0, 0.7, 0.3])

    return Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))


def ground(size=320):
    """The surface the mail lies on: a linen tablecloth, not more paper. It
    used to be the writing-paper tile itself, so the envelope and the letter
    had nothing to stand apart from. Cloth is woven -- warp and weft crossing,
    with the slubs that make linen look like linen -- and a shade deeper and
    greyer than the stationery, so a sheet of paper laid on it reads as one."""
    yy, xx = np.mgrid[0:size, 0:size]
    pitch = size / 80                              # threads per tile, each way
    # the weave: every thread rises and dips as it passes over and under
    over = np.sin(xx * np.pi * 2 / pitch) * np.sin(yy * np.pi * 2 / pitch)
    # thread-to-thread thickness. Kept to the high frequencies: with any weight
    # down low these merge into broad bands and the cloth turns to plaid.
    warp = field(size, 0.45, stretch=(0.04, 1.0))
    weft = field(size, 0.45, stretch=(1.0, 0.04))
    slub = field(size, 0.8, stretch=(0.03, 1.0))    # the thick runs in linen yarn
    mottle = field(size, 2.6)
    grain = field(size, 0.35)

    light = (1.0 + 0.02 * over + 0.03 * warp + 0.03 * weft
             + 0.035 * np.clip(slub - 0.25, 0, None) + 0.012 * mottle + 0.016 * grain)
    base = np.stack([
        np.full((size, size), 228.0) * light,
        np.full((size, size), 221.0) * light,
        np.full((size, size), 207.0) * light,
    ], axis=-1)
    return Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))


# The bold band is odelela -- the printed cotton of Owambo dress, and the
# language the Namibian invitations in the reference are built from. Its palette
# is not a matter of taste: it is fuchsia, scarlet and dark plum printed ON
# white, and these five are clustered straight out of the reference rather than
# picked by eye, which is how the first attempt ended up a raspberry wallpaper
# with the ground and the print the wrong way round.
GROUND = (248, 242, 240)        # the cloth itself, not the print
BLACK = (26, 20, 22)            # the outline every shape is drawn with
FUCHSIA = (230, 26, 141)
RED = (211, 42, 36)
PINK = (245, 176, 208)
PLUM = (103, 42, 71)


def motif(size=384, cell=192, ss=3):
    """Printed cotton: concentric rosettes on a half-drop repeat."""
    n = size * ss
    coord = (np.arange(n) + 0.5) / ss
    x = coord[None, :]
    y = coord[:, None]

    # half-drop: every other column of motifs sits half a cell lower, the way a
    # printed repeat is staggered so the grid does not read as a grid
    column = np.floor(x / cell)
    u = np.mod(x, cell) / cell - 0.5
    v = np.mod(y + np.mod(column, 2) * cell / 2, cell) / cell - 0.5

    ring = np.hypot(u, v)
    idx = np.zeros((n, n), dtype=np.uint8)          # 0 = the white cloth
    for edge, value in ((0.455, 1), (0.435, 2), (0.395, 1), (0.380, 0),
                        (0.335, 1), (0.320, 5), (0.290, 2), (0.245, 1),
                        (0.230, 0), (0.190, 1), (0.170, 3), (0.110, 1),
                        (0.092, 4), (0.048, 1), (0.036, 2)):
        idx[ring < edge] = value

    # Filler motifs sit between the rosettes down the column, never across the
    # gap between columns: the half-drop puts the two sides of that gap out of
    # phase, so anything straddling it would be sliced in half.
    dv = np.abs(v) - 0.5
    idx[np.abs(u) + np.abs(dv) < 0.075] = 1
    idx[np.abs(u) + np.abs(dv) < 0.052] = 3

    palette = np.array([GROUND, BLACK, FUCHSIA, RED, PINK, PLUM], dtype=np.float64)
    base = palette[idx].reshape(size, ss, size, ss, 3).mean(axis=(1, 3))

    warp = field(size, 1.15, stretch=(1.0, 0.07))
    weft = field(size, 1.15, stretch=(0.07, 1.0))
    thread_a = field(size, 0.55, stretch=(1.0, 0.05))     # the individual threads
    thread_b = field(size, 0.55, stretch=(0.05, 1.0))
    slub = field(size, 2.6)
    grain = field(size, 0.4)
    wear = field(size, 2.8)                               # where the dye sat unevenly

    light = (1.0 + 0.065 * warp + 0.065 * weft
             + 0.045 * thread_a + 0.045 * thread_b
             + 0.04 * slub + 0.03 * grain)
    base *= light[..., None]
    base += 5.0 * wear[..., None] * np.array([0.4, 0.9, 0.8])

    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))
    # dye creeps a hair into the weave; without this the print looks laser-cut
    return img.filter(ImageFilter.GaussianBlur(0.6))


def main():
    tiles = {
        'paper': (paper(), 93),
        'ticket': (ticket(), 92),
        'motif': (motif(), 88),
        # last, so adding it left the seeded tiles above exactly as they were
        'ground': (ground(), 90),
    }
    out = {}
    for name, (img, quality) in tiles.items():
        data = to_png_or_jpeg(img, quality)
        out[name] = 'data:image/jpeg;base64,' + base64.b64encode(data).decode('ascii')
        print(f'{name}: {img.size[0]}x{img.size[1]}, {len(data) // 1024} KB')

    dest = ROOT / 'assets' / 'textures.js'
    dest.write_text(
        '/* Paper, ticket stock, the odelela print and the linen ground, rendered by tools/build-textures.py.\n'
        ' *\n'
        ' * Seamless tiles: they are built in the frequency domain, and an inverse FFT\n'
        ' * is periodic, so they repeat without a join.\n'
        ' *\n'
        ' * GENERATED FILE -- do not hand-edit.\n'
        ' */\n'
        'window.TEXTURES = ' + json.dumps(out, indent=0) + ';\n',
        encoding='utf-8')
    print('wrote', dest.relative_to(ROOT), f'({dest.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main()
