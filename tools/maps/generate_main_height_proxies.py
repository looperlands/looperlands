#!/usr/bin/env python3
"""Bake the main tilesheet's inspectable body-height atlas. Requires Pillow."""

import argparse
import math
from pathlib import Path
from typing import NamedTuple

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
ARTWORK = ROOT / 'client/img/1/tilesheet_main.png'
ATLAS = ROOT / 'client/img/common/height-proxies/main.png'
BAKED_SHADOWS = ATLAS.with_name('main-baked-shadows.png')


class Body(NamedTuple):
    # Native tilesheet pixels, with exclusive right and bottom edges.
    bounds: tuple
    front: int
    slope: float
    depth: int
    shape: str = 'wall'


# The last row is the ground contact. Rows above the vertical front ascend at
# the roof/crown slope. Bounds follow each complete object across tile seams.
BODIES = [
    Body((61, 32, 163, 153), 57, .43, 18, 'slate-house'),       # slate-roof timber house
    Body((53, 162, 155, 305), 65, 0, 20, 'gable'),      # red gable
    Body((189, 1162, 291, 1305), 70, 0, 20, 'gable'),   # blue gable
    Body((193, 1953, 315, 2089), 66, .44, 20),   # blacksmith
    Body((0, 1996, 80, 2112), 50, .52, 16, 'glass'),      # potion shop
    Body((194, 163, 254, 239), 0, 0, 36, 'crown'),     # oak
    Body((265, 492, 311, 561), 26, .74, 7),      # bare tree
    Body((209, 637, 255, 706), 26, .74, 7),      # dead tree
    Body((277, 1330, 310, 1395), 24, .75, 7),    # graveyard tree
    Body((272, 0, 320, 52), 15, .38, 8, 'rock'),        # boulder
    Body((256, 592, 304, 644), 15, .4, 7, 'rock'),       # mirrored boulder
    Body((256, 192, 288, 224), 7, .38, 4, 'rock'), # grass-backed stones
    Body((288, 192, 320, 224), 7, .38, 4, 'rock'),
    Body((272, 64, 288, 80), 4, .4, 2, 'rock'),          # loose stone
    Body((0, 113, 31, 162), 14, .46, 7),         # canvas tent
    Body((0, 236, 34, 292), 25, .55, 8),         # covered well
    Body((2, 310, 46, 373), 36, .5, 8),          # timber hut
    Body((2, 486, 46, 549), 36, .5, 8),          # damaged hut
    Body((258, 1472, 302, 1535), 36, .5, 8),     # open hut
    Body((178, 259, 202, 303), 19, .7, 4),       # cactus
    Body((3, 2883, 61, 2937), 54, 1, 3, 'board'),   # event board
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
    Body((0, 569, 64, 623), 42, 0, 0, 'column'),  # four sandstone pillar variants
    Body((0, 626, 60, 699), 18, .44, 10),        # raised fossil rib cage
    Body((4, 392, 31, 415), 15, .42, 6),         # beach parasol and pole
]


# These rectangles include the displaced paint, including tiles containing only
# the shadow. They are in atlas coordinates so the source art remains unchanged.
SHADOW_PAINT = [
    (60, 32, 170, 155), (52, 162, 162, 307), (188, 1162, 297, 1307),  # houses
    (194, 205, 254, 245),                                               # oak
    (265, 525, 312, 561), (209, 670, 255, 706), (272, 1359, 318, 1395), # bare trees
    (272, 35, 320, 56), (256, 632, 304, 646), (272, 64, 292, 80),      # stones
    (0, 119, 38, 164), (0, 255, 38, 295),                              # tent and well
    (2, 325, 51, 375), (2, 501, 51, 551), (258, 1488, 307, 1537),      # huts
    (176, 270, 208, 305), (0, 62, 24, 81), (0, 87, 24, 113),           # cactus and graves
    (64, 29, 80, 32), (0, 1488, 72, 1536), (9, 1278, 70, 1319),         # stakes, palm and column
    (270, 675, 320, 711), (0, 663, 60, 701),                            # pipe and ribs
    (0, 617, 64, 624), (64, 544, 80, 624),                              # pillar feet and separate cast tiles
    (0, 407, 32, 417),                                                  # parasol
]


def make_shadow_mask(source):
    # Only transparent neutral shadow ink is removed. Preserve opaque grass,
    # colored glass, wood, and the shading painted onto solid surfaces.
    mask = Image.new('RGBA', source.size)
    for left, top, right, bottom in SHADOW_PAINT:
        for y in range(top, bottom):
            for x in range(left, right):
                red, green, blue, alpha = source.getpixel((x, y))
                if 0 < alpha < 176 and red == green == blue and red <= 55:
                    mask.putpixel((x, y), (255, 255, 255, 255))
    return mask


def body_silhouette(art, shape):
    mask = Image.new('L', art.size)
    for y in range(art.height):
        for x in range(art.width):
            r, g, b, a = art.getpixel((x, y))
            if a >= 176 or (shape == 'glass' and a >= 128 and b > r + 40):
                if shape != 'rock' or max(r, g, b) - min(r, g, b) <= 12:
                    mask.putpixel((x, y), 255)
    if shape == 'rock':
        # Isolate the stone from white flowers in the surrounding grass tile.
        seed = (art.width // 2, art.height // 2)
        if not mask.getpixel(seed):
            raise ValueError('The rock profile must surround a connected stone at its center')
        ImageDraw.floodfill(mask, seed, 128)
        mask = mask.point(lambda value: 255 if value == 128 else 0)
    return mask


def oak_canopy(art):
    # The illustrated leaf outline is charcoal. The roots use a darker grey.
    leaves = Image.new('L', art.size)
    for y in range(art.height):
        for x in range(art.width):
            r, g, b, a = art.getpixel((x, y))
            if a >= 176 and (g > r or (r, g, b) == (55, 55, 55)):
                leaves.putpixel((x, y), 255)
    return leaves


def oak_leaf_surface(y, column, ground_radius_ratio, trunk_center):
    # The artwork is a projection of an upright ellipse in each x column.
    # Solve its front surface in world depth and height, then take the chord
    # at that height. At the crown's highest point the chord closes to a tip.
    half = (column[3] - column[1]) / 2
    mid = (column[3] + column[1] - 1) / 2
    v = (y - mid) / half
    ground_radius = half * ground_radius_ratio
    vertical_radius = math.sqrt(half * half - ground_radius * ground_radius)
    ground_offset = ground_radius / half * (ground_radius * v + vertical_radius * math.sqrt(1 - v * v))
    return trunk_center + ground_offset - y, max(0, round(2 * ground_offset))


def slate_house_surface(x, y, body):
    # Coordinates are local to the 102 x 121 slate house. Its timber facade
    # meets the ground three pixels behind the doorway's two stone feet.
    floor, eaves = 117, 60

    def main_roof(row):
        return body.front + (eaves - row) * body.slope

    surface = main_roof(y) if y < eaves else max(0, floor - y)
    # The chimney has a wide stone cap, then a narrower shaft seated in the roof.
    chimney_insets = (1, 0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 2, 3)
    if 0 <= y < len(chimney_insets):
        inset = chimney_insets[y]
        if 87 + inset <= x < 97 - inset:
            return main_roof(13) + (13 - y), 6

    # The dormer's cap (upper strip), vertical window and sill protrude from
    # the shingles. Its front stands on the roof at the bottom sill.
    if 16 <= y <= 48:
        inset = 2 if 28 <= y <= 40 else 0
        if 6 + inset <= x < 36 - inset:
            sill, lintel = 48, 28
            z = main_roof(sill) + min(sill - y, sill - lintel)
            z += max(0, lintel - y) * .4
            return z, 9

    # The porch roof projects forward from the timber and peaks above the door.
    # Across its pitched strip the ground projection advances to the stone feet.
    if 29 <= x <= 72:
        ridge_start = 71 + abs(x - 50.5)
        run = y - ridge_start
        if 0 <= run <= 12:
            return surface + 3 * run / 12, 5
        if run > 12 and 32 <= x <= 69:
            return max(0, floor + 3 - y), 4
    return surface, body.depth


def make_atlas(source):
    atlas = Image.new('RGBA', source.size)
    for body in BODIES:
        art = source.crop(body.bounds)
        left, top, _, _ = body.bounds
        mask = body_silhouette(art, body.shape)
        leaves = oak_canopy(art) if body.shape == 'crown' else None
        if leaves is not None:
            canopy = leaves.getbbox()
            ground_radius_ratio = body.depth / (canopy[3] - canopy[1])
        for x in range(art.width):
            extent = mask.crop((x, 0, x + 1, art.height)).getbbox()
            if not extent:
                continue
            base = art.height - 1
            front, depth = body.front, body.depth
            if body.shape == 'rock':
                base = extent[3] - 1
                span = (extent[3] - extent[1]) / art.height
                front *= span
                depth = max(1, round(depth * span))
            elif body.shape == 'column':
                # The cap and foot are matching ellipses, 42 native pixels apart.
                # Their painted contour gives each variant its own near and far edge.
                base = extent[3] - 1
                depth = base - (extent[1] + front)
            elif body.shape == 'gable':
                # The ridge runs front to back. The front gable rises from
                # both eaves to the ridge; the roof behind it has the same height.
                front += .9 * min(x, art.width - 1 - x)
            crown = leaves.crop((x, 0, x + 1, art.height)).getbbox() if leaves is not None else None
            for y in range(extent[1], extent[3]):
                if not mask.getpixel((x, y)):
                    continue
                rise = base - y
                z = min(rise, front) + max(0, rise - front) * body.slope
                thickness = depth
                # The event board's cap, panel and crossbar end above its two legs.
                elevated = body.shape == 'board' and y < 46
                support = 0
                if body.shape == 'column':
                    thickness = min(depth, y - extent[1])
                elif body.shape == 'slate-house':
                    z, thickness = slate_house_surface(x, y, body)
                elif body.shape == 'crown':
                    thickness = 3
                    z = rise
                    if crown and leaves.getpixel((x, y)):
                        elevated = True
                        z, thickness = oak_leaf_surface(y, crown, ground_radius_ratio, base - thickness / 2)
                    elif y == 63:
                        # The roots are visible at this scanline. Extend their central
                        # woody core up into the leaves behind the illustrated surface.
                        distance = (x - 29.5) / 6
                        if abs(distance) < 1:
                            support = round(20 + 27 * math.sqrt(1 - distance * distance))
                z = math.floor(z + .5)
                if z > 0:
                    # Red below the display value marks an elevated leaf/panel;
                    # excess red adds hidden solid height at the visible foot.
                    red = min(255, 3 * z) - int(elevated) + max(0, support - z)
                    atlas.putpixel((left + x, top + y), (red, z, 255 - thickness, 255))
    return atlas


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='verify both checked-in PNGs')
    args = parser.parse_args()
    with Image.open(ARTWORK) as artwork:
        source = artwork.convert('RGBA')
    for target, generated in [(ATLAS, make_atlas(source)), (BAKED_SHADOWS, make_shadow_mask(source))]:
        if args.check:
            with Image.open(target) as current:
                if current.size != generated.size or current.convert('RGBA').tobytes() != generated.tobytes():
                    raise SystemExit(f'{target.name} differs from the source artwork and profiles')
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            generated.save(target, optimize=True)
