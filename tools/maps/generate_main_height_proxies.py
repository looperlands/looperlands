#!/usr/bin/env python3
"""Bake inspectable body-height atlases from the native map artwork. Requires Pillow."""

import argparse
import json
import re
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
    raised_above: int = 0
    trunk: tuple = ()
    crown_bottom: int = 0
    foliage_colors: tuple = ()


def make_shadow_mask(source, regions, full_height=True):
    # Only transparent neutral shadow ink is removed. Preserve opaque grass,
    # colored glass, wood, and the shading painted onto solid surfaces.
    bottom = max((region[3] for region in regions), default=16)
    height = source.height if full_height else min(source.height, math.ceil(bottom / 16) * 16)
    mask = Image.new('RGBA', (source.width, height))
    for left, top, right, bottom in regions:
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


def body_pixel(height, depth, elevated=False, support=0):
    # Red below its display value marks raised material. Extra red extends
    # solid support above the visible face while preserving its ground site.
    height = min(160, max(0, height))
    red = min(255, 3 * height) - int(elevated) + max(0, support - height)
    return max(0, min(255, red)), height, 255 - max(0, min(255, depth)), 255


def draw_body(atlas, source, body):
    art = source.crop(body.bounds)
    left, top, _, _ = body.bounds
    mask = body_silhouette(art, body.shape)
    leaves = None
    if body.shape == 'crown':
        leaves = oak_canopy(art)
    elif body.shape == 'round-crown':
        leaves = Image.new('L', art.size)
        palette = set(body.foliage_colors)
        for y in range(body.crown_bottom):
            for x in range(art.width):
                r, g, b, alpha = art.getpixel((x, y))
                if alpha >= 176 and (not palette or (r, g, b) in palette):
                    leaves.putpixel((x, y), 255)
    if leaves is not None:
        canopy = leaves.getbbox()
        if not canopy:
            raise ValueError('The selected crown contains no foliage pixels')
        ground_radius_ratio = min(.95, body.depth / (canopy[3] - canopy[1]))
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
            elevated = ((body.shape == 'board' and y < 46) or
                        (y < body.raised_above and not (body.trunk and body.trunk[0] <= x < body.trunk[1])))
            support = 0
            if body.shape == 'column':
                thickness = min(depth, y - extent[1])
            elif body.shape == 'slate-house':
                z, thickness = slate_house_surface(x, y, body)
            elif body.shape in ('crown', 'round-crown'):
                thickness = 3
                z = rise
                if crown and leaves.getpixel((x, y)):
                    elevated = True
                    z, thickness = oak_leaf_surface(y, crown, ground_radius_ratio, base - thickness / 2)
                elif body.shape == 'round-crown' and body.trunk[0] <= x < body.trunk[1]:
                    support = min(160, base - body.crown_bottom // 2)
                elif body.shape == 'crown' and y == 63:
                    # The roots are visible at this scanline. Extend their central
                    # woody core up into the leaves behind the illustrated surface.
                    distance = (x - 29.5) / 6
                    if abs(distance) < 1:
                        support = round(20 + 27 * math.sqrt(1 - distance * distance))
            z = math.floor(z + .5)
            if z > 0:
                atlas.putpixel((left + x, top + y), body_pixel(z, thickness, elevated, support))



class BareTree(NamedTuple):
    # An upright connected sprite ending in one 16px root tile row. Duckville
    # substitutes the row immediately below it for roots growing among stones.
    bounds: tuple
    trunk_x: float
    trunk_radius: float
    fork_y: int


def draw_bare_tree(atlas, source, tree):
    left, top, right, bottom = tree.bounds
    art = source.crop(tree.bounds).getchannel('A')
    root_top = art.height - 16
    # Set the trunk's front and back around the middle of the painted roots.
    ground_y = art.getbbox()[3] - 1 - round(tree.trunk_radius * .65)
    for x in range(art.width):
        distance = abs(x - tree.trunk_x) / tree.trunk_radius
        half_depth = tree.trunk_radius * .65 * math.sqrt(max(0, 1 - distance * distance))
        for y in range(root_top):
            if not art.getpixel((x, y)):
                continue
            # The shaft is solid at its base and narrows toward the first
            # fork. Outstretched limbs occupy only their illustrated height.
            taper = min(1, .25 + .75 * y / tree.fork_y)
            elevated = distance >= taper
            z = round(ground_y + half_depth) - y
            depth = 2 if elevated else max(2, round(2 * half_depth * taper))
            atlas.putpixel((left + x, top + y), body_pixel(z, depth, elevated))
        for row_top in (bottom - 16, bottom):
            roots = source.crop((left + x, row_top, left + x + 1, row_top + 16)).getchannel('A')
            contact = roots.getbbox()
            if not contact:
                continue
            foot = contact[3] - 1
            # Blend the root fan from the shaft's front at the seam to the
            # per-column painted toe. Both root variants share the same shaft.
            for y in range(foot):
                if roots.getpixel((0, y)):
                    seam = ground_y + half_depth - root_top
                    z = max(1, round(seam * (foot - y) / foot))
                    depth = min(z, max(1, round(2 * half_depth)))
                    atlas.putpixel((left + x, row_top + y), body_pixel(z, depth))


PROFILE_DIR = Path('tools/maps/height_profiles')
SHAPES = {'wall', 'gable', 'rock', 'column', 'board', 'glass', 'crown', 'round-crown', 'slate-house', 'bare-tree'}


def read_profile(root, tileset):
    return json.loads((root / PROFILE_DIR / (tileset + '.json')).read_text())


def inside_rect(bounds, size):
    return (isinstance(bounds, (tuple, list)) and len(bounds) == 4 and all(type(n) is int for n in bounds)
            and 0 <= bounds[0] < bounds[2] <= size[0] and 0 <= bounds[1] < bounds[3] <= size[1])


def numeric_field(row, key, minimum, maximum, whole=False, default=None):
    value = row.get(key, default)
    types = (int,) if whole else (int, float)
    if type(value) not in types or not minimum <= value <= maximum:
        raise ValueError(f'{key} must be {"a whole number" if whole else "a number"} between {minimum} and {maximum}')
    return value


def body_image(source, row):
    name = row.get('name')
    if not isinstance(name, str) or not name.strip():
        raise ValueError('Give the shadow body a name')
    shape = row.get('shape', 'wall')
    bounds = row['bounds']
    if shape not in SHAPES or not inside_rect(bounds, source.size):
        raise ValueError('Choose a supported shape and bounds inside the native tilesheet')
    l, t, r, b = bounds
    width, height = r - l, b - t
    bottom = b + (16 if shape == 'bare-tree' else 0)
    if bottom > source.height:
        raise ValueError('The alternate root row must fit on the tilesheet')
    art = source.crop((l, t, r, bottom))
    stamp = Image.new('RGBA', art.size)
    local = (0, 0, width, height)
    if shape == 'bare-tree':
        tree = BareTree(local, numeric_field(row, 'trunkX', 0, width - .5),
                        numeric_field(row, 'trunkRadius', .5, width), numeric_field(row, 'forkY', 1, height, whole=True))
        if height <= 16 or not art.crop(local).getbbox():
            raise ValueError('Choose a visible bare tree with a trunk, fork and root row')
        draw_bare_tree(stamp, art, tree)
    else:
        trunk = row.get('trunk', [])
        crown_bottom = numeric_field(row, 'crownBottom', 0, height, whole=True, default=0)
        if shape == 'round-crown' and not (0 < crown_bottom <= height and trunk):
            raise ValueError('Choose a crown bottom and trunk span for a round crown')
        if trunk and not (isinstance(trunk, list) and len(trunk) == 2 and all(type(x) is int for x in trunk)
                          and 0 <= trunk[0] < trunk[1] <= width):
            raise ValueError('Keep the trunk span inside the selected artwork')
        colors = []
        for color in row.get('foliageColors', []):
            if not isinstance(color, str) or not re.fullmatch('#[0-9a-fA-F]{6}', color):
                raise ValueError('Use six-digit hex foliage colors')
            colors.append(tuple(bytes.fromhex(color[1:])))
        body = Body(local, numeric_field(row, 'front', 0, 160, whole=True), numeric_field(row, 'slope', 0, 1),
                    numeric_field(row, 'depth', 0, 255, whole=True), shape,
                    numeric_field(row, 'raisedAbove', 0, height, whole=True, default=0), trunk, crown_bottom, colors)
        draw_body(stamp, art, body)
    return stamp


def profile_atlas(source, profile):
    rows = profile['bodies']
    bottom = max((r['bounds'][3] + (16 if r.get('shape') == 'bare-tree' else 0) for r in rows), default=16)
    height = source.height if profile.get('fullHeight') else min(source.height, math.ceil(bottom / 16) * 16)
    atlas = Image.new('RGBA', (source.width, height))
    for row in rows:
        try:
            stamp = body_image(source, row)
        except (ValueError, KeyError, TypeError, IndexError) as error:
            raise ValueError(f"{row.get('name', 'Scenery')}: {error}") from error
        atlas.paste(stamp, tuple(row['bounds'][:2]), stamp)
    return atlas


def products(source, profile, tileset):
    yield tileset + '.png', profile_atlas(source, profile)
    if profile.get('paint'):
        if not all(inside_rect(rect, source.size) for rect in profile['paint']):
            raise ValueError('Keep painted shadow rectangles inside the tilesheet')
        yield tileset + '-baked-shadows.png', make_shadow_mask(source, profile['paint'], profile.get('fullHeight', False))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--map', default='main', help='native tileset ID')
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--profile-file', type=Path, help='bake a staged authoring document')
    parser.add_argument('--output-dir', type=Path)
    parser.add_argument('--preview-body', type=Path, help='preview one draft body without changing the atlas')
    parser.add_argument('--output', type=Path, help='PNG for a single draft preview')
    parser.add_argument('--check', action='store_true', help='verify checked-in PNGs against the artwork')
    args = parser.parse_args()
    if not re.fullmatch('[A-Za-z0-9_-]+', args.map):
        parser.error('Invalid tileset ID')
    with Image.open(args.root / f'client/img/1/tilesheet_{args.map}.png') as image:
        source = image.convert('RGBA')
    if args.preview_body:
        if not args.output:
            parser.error('--preview-body requires --output')
        body_image(source, json.loads(args.preview_body.read_text())).save(args.output)
        return
    profile = json.loads(args.profile_file.read_text()) if args.profile_file else read_profile(args.root, args.map)
    directory = args.output_dir or args.root / 'client/img/common/height-proxies'
    registration = {'height': args.map + '.png'}
    if profile.get('paint'):
        registration['paint'] = args.map + '-baked-shadows.png'
    if profile.get('outdoors'):
        registration['outdoors'] = profile['outdoors']
    for name, generated in products(source, profile, args.map):
        target = directory / name
        if args.check:
            with Image.open(target) as current:
                if current.size != generated.size or current.convert('RGBA').tobytes() != generated.tobytes():
                    raise ValueError(f'{name} differs from the source artwork and profiles')
        else:
            directory.mkdir(exist_ok=True, parents=True)
            generated.save(target, optimize=True)
    print(json.dumps(registration))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError, IndexError) as error:
        raise SystemExit(str(error)) from error
