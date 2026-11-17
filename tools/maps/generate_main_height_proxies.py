#!/usr/bin/env python3
"""Bake the main tilesheet's inspectable body-height atlas. Requires Pillow."""

import argparse
import math
from pathlib import Path
from typing import NamedTuple

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
ARTWORK = ROOT / 'client/img/1/tilesheet_main.png'
ATLAS = ROOT / 'client/img/common/height-proxies/main.png'


class Body(NamedTuple):
    # Native tilesheet pixels, with exclusive right and bottom edges.
    bounds: tuple
    front: int
    slope: float
    depth: int
    grass_backed: bool = False


# The last row is the ground contact. Rows above the vertical front ascend at
# the roof/crown slope. Bounds follow each complete object across tile seams.
BODIES = [
    Body((61, 32, 163, 153), 62, .43, 18),       # slate-roof timber house
    Body((53, 162, 155, 305), 65, .54, 20),      # red gable
    Body((189, 1162, 291, 1305), 70, .48, 20),   # blue gable
    Body((193, 1953, 315, 2089), 66, .44, 20),   # blacksmith
    Body((0, 1996, 80, 2112), 50, .52, 16),      # potion shop
    Body((194, 163, 254, 239), 26, .68, 12),     # oak
    Body((265, 492, 311, 561), 26, .74, 7),      # bare tree
    Body((209, 637, 255, 706), 26, .74, 7),      # dead tree
    Body((277, 1330, 310, 1395), 24, .75, 7),    # graveyard tree
    Body((272, 0, 320, 52), 15, .38, 8),        # boulder
    Body((256, 592, 304, 644), 15, .4, 7),       # mirrored boulder
    Body((256, 192, 288, 224), 7, .38, 4, True), # grass-backed stones
    Body((288, 192, 320, 224), 7, .38, 4, True),
    Body((272, 64, 288, 80), 4, .4, 2),          # loose stone
    Body((0, 113, 31, 162), 14, .46, 7),         # canvas tent
    Body((0, 236, 34, 292), 25, .55, 8),         # covered well
    Body((2, 310, 46, 373), 36, .5, 8),          # timber hut
    Body((2, 486, 46, 549), 36, .5, 8),          # damaged hut
    Body((258, 1472, 302, 1535), 36, .5, 8),     # open hut
    Body((178, 259, 202, 303), 19, .7, 4),       # cactus
    Body((3, 2883, 61, 2940), 32, .65, 4),       # event board
    Body((0, 55, 16, 79), 10, .55, 2),           # headstones
    Body((0, 85, 16, 111), 8, .55, 2),
    Body((254, 576, 307, 591), 8, .6, 2),        # fence
    Body((64, 0, 80, 32), 9, .65, 2),            # palisade stake
    Body((4, 2404, 98, 2477), 34, .5, 12),       # cottage
    Body((3, 2486, 94, 2590), 42, .55, 10),      # windmill
    Body((1, 1464, 45, 1535), 36, .65, 7),       # palm
    Body((9, 1252, 40, 1317), 56, .38, 7),       # fluted stone column
    Body((149, 2084, 173, 2111), 21, .42, 5),    # smith's barrel
    Body((146, 2056, 175, 2075), 13, .40, 4),    # smith's anvil
    Body((268, 656, 309, 709), 37, .38, 8),      # Town pipe and rim
    Body((0, 569, 64, 623), 44, .42, 5),         # carved posts
    Body((0, 626, 60, 699), 18, .44, 10),        # raised fossil rib cage
    Body((4, 392, 31, 415), 15, .42, 6),         # beach parasol and pole
]


def make_atlas(source):
    atlas = Image.new('RGBA', source.size)
    for body in BODIES:
        left, top, right, bottom = body.bounds
        for y in range(top, bottom - 1):
            rise = bottom - 1 - y
            z = math.floor(min(rise, body.front) + max(0, rise - body.front) * body.slope + .5)
            for x in range(left, right):
                red, green, _, alpha = source.getpixel((x, y))
                if alpha < 176 or (body.grass_backed and green > red + 15):
                    continue
                # Green stores height; blue stores the extrusion depth. Both
                # survive decoding without rounding because body pixels are opaque.
                atlas.putpixel((x, y), (min(255, 3 * z), z, 255 - body.depth, 255))
    return atlas


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='verify the checked-in atlas')
    args = parser.parse_args()
    with Image.open(ARTWORK) as artwork:
        generated = make_atlas(artwork.convert('RGBA'))
    if args.check:
        with Image.open(ATLAS) as current:
            if current.size != generated.size or current.convert('RGBA').tobytes() != generated.tobytes():
                raise SystemExit(f'{ATLAS.name} differs from the source artwork and profiles')
    else:
        ATLAS.parent.mkdir(parents=True, exist_ok=True)
        generated.save(ATLAS, optimize=True)
