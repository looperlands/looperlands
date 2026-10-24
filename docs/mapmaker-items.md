# Items

Use **Items** in the Mapmaker Toolbox to edit existing item sprites or create a new inventory collectible. A new item is registered in the client and server automatically when saved.

## Edit or create an item

1. Choose an item from the list to load its sprite and editable settings.
2. Edit it directly, or click **New item** to start a new item.
3. Give the copy a unique ID of 2–48 characters, starting with a lowercase letter and using only lowercase letters, numbers and underscores, and a display name. For example, `moon_shard`.
4. Upload a transparent PNG if you want new artwork. The current template artwork is copied when creating without an upload.
5. Set the frame dimensions, offsets and animations. Items need an `idle` animation.
6. Set the pickup amount, inventory description and whether transfers between players are allowed.
7. Click **Save & register**, then build your map and start a fresh session.

New items are inventory collectibles. The editor does not invent weapon equip animations, consumable effects or custom scripts. Existing equipment and consumables retain their current scripted behavior while you edit their sprite and the exposed inventory settings. Creating a copy of equipment produces a collectible item.

## Spritesheet and preview

The game uses the sprite ID `item-<id>`, for example `item-moon_shard`. You enter only `moon_shard` as the item ID; the editor adds the prefix to sprite filenames automatically.

Use a PNG up to 4 MB. Choose the upload's scale: 1×, 2× or 3×. Frame dimensions always use 1× pixels. A common item frame is 16 × 16 pixels, with an animated strip across one row. Animation rows start at 0; frame counts start at 1. Use offsets of 0, 0 for a frame aligned with the tile, or adjust them using the tile guide.

The live preview offers an animation selector, pause/play, individual frame stepping, zoom and a tile guide. The sheet view draws the frame grid over the source image. Duration is milliseconds per frame; blank uses the game default. Preview zoom and tile-guide visibility are viewing preferences and are not saved as asset changes.

Saving an uploaded sheet prepares crisp nearest-neighbor 1×, 2× and 3× PNGs and preserves transparency. The prepared 3× sheet must fit within 4096 pixels per side and 8 million pixels. Metadata-only edits preserve existing image files at all scales.

## Place items and use them in quests

In Tiled, add an object layer named `mapmaker-entities`. Create a point object, set its **Name** to the item ID (without `item-`), and place it on the desired tile. Keep points inside the map, after the first column, and give each entity its own cell. Save the TMX and build the map in [Build tools](mapmaker-building.md).

You can also use the registered item ID in a mob's drop table. The [Mob & NPC editor](mapmaker-mobs.md) exposes drop chances. New items become available as loot or delivery objectives and rewards in the [Quest builder](mapmaker-quest-builder.md). Reopen or reload the Quest builder after saving a new item.

## Files and recovery

The shared registration is stored in `shared/js/mapmakerentities.json`. Sprite JSON is stored in `client/sprites/item-<id>.json`; PNGs are stored in `client/img/1`, `client/img/2` and `client/img/3`. Include all of these with your map changes when sharing a new item.

Saved IDs and types cannot be renamed. Create another copy if you need a new ID. Saves reject stale revisions to protect another tab's changes. Copy any unsaved values, use **Reload list**, then reapply them. A failed file write restores the previous files.
