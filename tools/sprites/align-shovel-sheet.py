"""Anchor the retained shovel artwork to sword1's grip and swing poses.

Run from any directory: python3 tools/sprites/align-shovel-sheet.py
Requires Pillow. Coordinates are native pixels within a 48x48 weapon frame.
The source is retained separately so repacking is repeatable, not cumulative.
"""
import math
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Image.open(Path(__file__).parent / 'sources/tool-shovel.png').convert('RGBA')
# Discard faint imagegen remnants outside the outlined pixel artwork.
SOURCE.putalpha(SOURCE.getchannel('A').point(lambda a: 255 if a >= 128 else 0))

# Source grip, source head direction, destination grip, destination head direction.
# Match sword1's five attack frames, including the backswing and recovery.
ATTACKS = {
    0: [((26, 32), (1, -1), (29, 20), (1, -1)),
        ((26, 27), (2, 1), (30, 24), (2, -1)),
        ((23, 31), (1, 0), (30, 26), (1, 0)),
        ((24, 29), (1, 1), (30, 29), (1, 1)),
        ((28, 29), (0, 1), (28, 31), (1, 1))],
    3: [((34, 21), (-1, -1), (16, 22), (-1, -1)),
        ((36, 22), (-1, -1), (18, 16), (-1, -2)),
        ((29, 23), (0, -1), (24, 12), (0, -1)),
        ((25, 22), (1, -1), (31, 15), (1, -2)),
        ((28, 27), (0, -1), (36, 23), (1, -1))],
    6: [((28, 20), (-1, 1), (30, 29), (2, 1)),
        ((29, 21), (-1, 1), (26, 31), (1, 2)),
        ((24, 21), (0, 1), (22, 31), (0, 1)),
        ((19, 21), (1, 1), (17, 28), (-1, 2)),
        ((20, 20), (1, 1), (15, 24), (-1, -1))],
}

# Walking and idle hands move too; up/down held poses differ from attack frame 0.
HELD = {
    1: [(26, 30), (29, 27), (26, 30), (22, 30)],
    2: [(26, 30), (26, 29)],
    4: [(31, 29), (30, 27), (31, 29), (30, 27)],
    5: [(31, 29), (31, 30)],
    7: [(19, 30), (19, 29), (19, 30), (22, 29)],
    8: [(19, 30), (19, 31)],
}


def pose(row, column, grip, direction, target, target_direction):
    frame = SOURCE.crop((column * 48, row * 48, (column + 1) * 48, (row + 1) * 48))
    angle = math.atan2(target_direction[1], target_direction[0]) - math.atan2(direction[1], direction[0])
    c, s = math.cos(angle), math.sin(angle)
    # Pillow maps destination pixels back into the source. Rotate around the grip,
    # then place that grip at the reference weapon's hand position.
    tx, ty = target
    gx, gy = grip
    return frame.transform((48, 48), Image.Transform.AFFINE,
                           (c, s, gx - c * tx - s * ty,
                            -s, c, gy + s * tx - c * ty),
                           Image.Resampling.NEAREST)


sheet = Image.new('RGBA', (240, 432))
for row, frames in ATTACKS.items():
    for column, parameters in enumerate(frames):
        sheet.paste(pose(row, column, *parameters), (column * 48, row * 48))
for row, grips in HELD.items():
    for column, target in enumerate(grips):
        direction = (-1, -1) if row >= 7 else (1, -1)
        sheet.paste(pose(0, 0, (26, 32), (1, -1), target, direction), (column * 48, row * 48))
for scale in (1, 2, 3):
    sheet.resize((240 * scale, 432 * scale), Image.Resampling.NEAREST).save(
        ROOT / f'client/img/{scale}/tool-shovel.png')
