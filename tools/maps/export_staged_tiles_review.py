#!/usr/bin/env python3
import json
import math
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "staged-tile"


def tile_crop(tilesheet, tile_id, columns, tile_size):
    x = (tile_id % columns) * tile_size
    y = (tile_id // columns) * tile_size
    return tilesheet.crop((x, y, x + tile_size, y + tile_size))


def render_stage(tilesheet, definition, root_tile, stage, columns, tile_size):
    width = definition.get("size", {}).get("w", 1)
    height = definition.get("size", {}).get("h", 1)
    stage_tiles = definition.get("stageTiles") or []
    base_tile = stage_tiles[min(stage, len(stage_tiles) - 1)] if stage_tiles else root_tile - 1

    image = Image.new("RGBA", (width * tile_size, height * tile_size), (0, 0, 0, 0))
    for y in range(height):
        for x in range(width):
            tile_id = base_tile + x + (y * columns)
            if not stage_tiles:
                tile_id += stage
            image.alpha_composite(tile_crop(tilesheet, tile_id, columns, tile_size), (x * tile_size, y * tile_size))
    return image


def draw_label(draw, xy, text, font, fill=(255, 255, 255, 255)):
    x, y = xy
    draw.text((x + 1, y + 1), text, font=font, fill=(0, 0, 0, 210))
    draw.text((x, y), text, font=font, fill=fill)


def make_strip(group_name, root_tile, definition, frames, font):
    label_h = 42
    gap = 8
    frame_w = max(frame.width for frame in frames)
    frame_h = max(frame.height for frame in frames)
    width = max(260, len(frames) * frame_w + (len(frames) - 1) * gap + 12)
    height = label_h + frame_h + 14
    strip = Image.new("RGBA", (width, height), (38, 24, 31, 255))
    draw = ImageDraw.Draw(strip)
    draw_label(draw, (6, 5), f"{group_name}  tile {root_tile}", font, (252, 224, 69, 255))
    meta = f"{definition.get('size', {}).get('w', 1)}x{definition.get('size', {}).get('h', 1)}  stages {len(frames)}"
    if definition.get("renderMode"):
        meta += f"  {definition['renderMode']}"
    draw_label(draw, (6, 22), meta, font, (195, 190, 190, 255))

    x = 6
    for index, frame in enumerate(frames):
        y = label_h
        strip.alpha_composite(frame, (x, y))
        draw.rectangle((x, y, x + frame.width - 1, y + frame.height - 1), outline=(184, 111, 80, 255))
        draw_label(draw, (x, y + frame.height + 1), f"s{index}", font, (195, 190, 190, 255))
        x += frame_w + gap
    return strip


def main():
    repo = Path(__file__).resolve().parents[2]
    map_path = repo / "client/maps/world_client_duckville.json"
    tilesheet_path = repo / "client/img/3/tilesheet_duckville.png"
    out_dir = repo / "exports/staged-tiles/duckville"

    filters = set()
    if len(sys.argv) > 1:
        out_dir = Path(sys.argv[1]).resolve()
    if len(sys.argv) > 2:
        filters = {value.lower() for value in sys.argv[2:]}

    data = json.loads(map_path.read_text())
    tile_size = data["tilesize"] * 3
    columns = data["tilesetColumns"]
    tilesheet = Image.open(tilesheet_path).convert("RGBA")
    font = ImageFont.load_default()

    out_dir.mkdir(parents=True, exist_ok=True)
    metadata = []
    strips = []

    for root_tile, definition in sorted(data["stagedTiles"].items(), key=lambda item: int(item[0])):
        root_tile_int = int(root_tile)
        group_name = definition.get("groupName", f"tile-{root_tile}")
        if filters and root_tile.lower() not in filters and group_name.lower() not in filters:
            continue
        stages = definition.get("stages") or len(definition.get("stageTiles") or []) or 1
        frames = [render_stage(tilesheet, definition, root_tile_int, stage, columns, tile_size) for stage in range(stages)]

        group_dir = out_dir / f"{root_tile}_{slug(group_name)}"
        group_dir.mkdir(parents=True, exist_ok=True)
        for stage, frame in enumerate(frames):
            frame.save(group_dir / f"stage_{stage}.png")

        strip = make_strip(group_name, root_tile, definition, frames, font)
        strip_path = group_dir / "strip.png"
        strip.save(strip_path)
        strips.append((root_tile_int, group_name, strip))
        metadata.append({
            "tile": root_tile_int,
            "groupName": group_name,
            "stages": stages,
            "size": definition.get("size", {"w": 1, "h": 1}),
            "offset": definition.get("offset", {"x": 0, "y": 0}),
            "renderMode": definition.get("renderMode"),
            "stageTiles": definition.get("stageTiles"),
            "path": str(strip_path.relative_to(repo)),
        })

    if not strips:
        raise SystemExit("No staged tiles matched the requested filter")

    cell_w = max(strip.width for _, _, strip in strips)
    cell_h = max(strip.height for _, _, strip in strips)
    overview_cols = 2
    overview_rows = math.ceil(len(strips) / overview_cols)
    overview = Image.new("RGBA", (overview_cols * cell_w, overview_rows * cell_h), (22, 17, 20, 255))
    for index, (_, _, strip) in enumerate(strips):
        x = (index % overview_cols) * cell_w
        y = (index // overview_cols) * cell_h
        overview.alpha_composite(strip, (x, y))

    overview.save(out_dir / "overview.png")
    (out_dir / "metadata.json").write_text(json.dumps(metadata, indent=2))
    print(out_dir)


if __name__ == "__main__":
    main()
