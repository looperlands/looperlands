#!/usr/bin/env python3
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
FARM_JSON = ROOT / "client" / "tileActions" / "duckville.json"
MAP_JSON = ROOT / "client" / "maps" / "world_client_duckville.json"
TILESHEET = ROOT / "client" / "img" / "1" / "tilesheet_duckville.png"
OUT_DIR = ROOT / "exports" / "farming-growing-crops"

SCALE = 4
GUTTER = 8
LABEL_HEIGHT = 22
RED = (255, 0, 0, 255)
YELLOW = (255, 230, 0, 255)
TEXT = (255, 255, 255, 255)
BG = (28, 28, 28, 255)


def tile_box(tile_id, columns, tile_size):
    x = (tile_id % columns) * tile_size
    y = (tile_id // columns) * tile_size
    return x, y, x + tile_size, y + tile_size


def group_size(crop, group):
    if crop.get("plantType") == "tree":
        return 2, 3
    return group["size"]["w"], group["size"]["h"]


def stage_count(crop, group):
    if crop.get("plantType") == "tree":
        return 4
    return crop.get("stages") or group.get("stages") or 1


def stage_start_tile(crop, group, group_key, stage):
    base_tile = int(group_key) - 1
    if crop.get("plantType") == "tree":
        tree_origin = base_tile - 1
        return tree_origin + ([0, 2, 4, 7][stage])
    stage_tiles = group.get("stageTiles")
    return stage_tiles[stage] if stage_tiles else base_tile


def build_stage(sheet, start_tile, crop, group, stage, columns, tile_size):
    width, height = group_size(crop, group)
    stage_stride = group.get("stageStride") or width or 1
    canvas = Image.new("RGBA", (width * tile_size, height * tile_size), (0, 0, 0, 0))

    for y in range(height):
        for x in range(width):
            tile_id = start_tile + x + (y * columns)
            if "stageTiles" not in group and crop.get("plantType") != "tree":
                tile_id += stage * stage_stride
            canvas.alpha_composite(sheet.crop(tile_box(tile_id, columns, tile_size)), (x * tile_size, y * tile_size))

    return canvas


def draw_overlays(image, tile_size):
    draw = ImageDraw.Draw(image)
    w, h = image.size

    for x in range(0, w + 1, tile_size):
        draw.line([(x, 0), (x, h)], fill=RED, width=1)
    for y in range(0, h + 1, tile_size):
        draw.line([(0, y), (w, y)], fill=RED, width=1)

    draw.rectangle([(0, 0), (w - 1, h - 1)], outline=YELLOW, width=1)


def label(draw, position, text, font):
    draw.text(position, text, fill=TEXT, font=font)


def export_crop(sheet, crop_key, crop, group_key, group, columns, tile_size, font):
    stages = stage_count(crop, group)
    group_width, group_height = group_size(crop, group)
    stage_w = group_width * tile_size
    stage_h = group_height * tile_size
    scaled_stage_w = stage_w * SCALE
    scaled_stage_h = stage_h * SCALE
    out_w = (scaled_stage_w * stages) + (GUTTER * (stages + 1))
    out_h = LABEL_HEIGHT + scaled_stage_h + (GUTTER * 2)
    out = Image.new("RGBA", (out_w, out_h), BG)
    draw = ImageDraw.Draw(out)
    label(draw, (GUTTER, 4), f"{crop['name']} / {crop['tileGroup']} / {crop_key}", font)

    for stage in range(stages):
        start_tile = stage_start_tile(crop, group, group_key, stage)
        stage_image = build_stage(sheet, start_tile, crop, group, stage, columns, tile_size)
        draw_overlays(stage_image, tile_size)
        stage_image = stage_image.resize((scaled_stage_w, scaled_stage_h), Image.Resampling.NEAREST)
        x = GUTTER + stage * (scaled_stage_w + GUTTER)
        y = LABEL_HEIGHT + GUTTER
        out.alpha_composite(stage_image, (x, y))
        draw.rectangle([(x, y), (x + scaled_stage_w - 1, y + scaled_stage_h - 1)], outline=YELLOW, width=3)
        label(draw, (x + 3, y + 3), f"stage {stage + 1}", font)

    safe_name = crop["tileGroup"].replace("/", "-")
    out_path = OUT_DIR / f"{safe_name}.png"
    out.save(out_path)
    return out_path


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    farm = json.loads(FARM_JSON.read_text())["farm"]
    map_data = json.loads(MAP_JSON.read_text())
    columns = map_data["tilesetColumns"]
    tile_size = map_data["tilesize"]
    staged_by_group = {
        value["groupName"]: (key, value)
        for key, value in map_data["stagedTiles"].items()
        if "groupName" in value
    }
    sheet = Image.open(TILESHEET).convert("RGBA")
    font = ImageFont.load_default()

    exported = []
    for crop_key, crop in farm["crops"].items():
        group_name = crop["tileGroup"]
        if group_name not in staged_by_group:
            raise SystemExit(f"No staged tile group found for {crop_key}: {group_name}")
        group_key, group = staged_by_group[group_name]
        exported.append((crop, export_crop(sheet, crop_key, crop, group_key, group, columns, tile_size, font)))

    sheet_width = max(Image.open(path).width for _, path in exported)
    sheet_height = sum(Image.open(path).height for _, path in exported) + GUTTER * (len(exported) + 1)
    contact = Image.new("RGBA", (sheet_width + GUTTER * 2, sheet_height), BG)
    y = GUTTER
    for _, path in exported:
        crop_image = Image.open(path).convert("RGBA")
        contact.alpha_composite(crop_image, (GUTTER, y))
        y += crop_image.height + GUTTER
    contact_path = OUT_DIR / "all-farming-growing-crops.png"
    contact.save(contact_path)

    manifest = {
        "sourceJson": str(FARM_JSON.relative_to(ROOT)),
        "sourceMap": str(MAP_JSON.relative_to(ROOT)),
        "sourceTilesheet": str(TILESHEET.relative_to(ROOT)),
        "tileLineColor": "red",
        "stageLineColor": "yellow",
        "exports": [str(path.relative_to(ROOT)) for _, path in exported],
        "contactSheet": str(contact_path.relative_to(ROOT)),
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Exported {len(exported)} crop tile groups to {OUT_DIR}")
    print(contact_path)


if __name__ == "__main__":
    main()
