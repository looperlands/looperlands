# Items

Use **Items** in the Mapmaker Toolbox to edit item sprites, resource and consumable settings, consumption effects and player tooltips. A new item is registered in the client and server automatically when saved. Settings apply to that item type on every map.

## Edit or create an item

1. Choose an item from the list to load its sprite and editable settings.
2. Edit it directly, or click **New item** to start a new item.
3. Give the copy a unique ID of 2–48 characters, starting with a lowercase letter and using only lowercase letters, numbers and underscores, and a display name. For example, `moon_shard`.
4. Upload a transparent PNG if you want new artwork. The current template artwork is copied when creating without an upload.
5. Set the frame dimensions, offsets and animations. Items need an `idle` animation.
6. Set the pickup amount, inventory description, category, sparks and whether transfers between players are allowed. Enable **Consumable** to configure its effects and cooldown.
7. Click **Save & register**, then build your map and start a fresh session.

New items are inventory collectibles. Existing weapons, armor and projectiles keep their equipment category and equip behavior. Creating a copy of equipment produces an inventory item.

## Resources, sparks and consumption

- **Inventory category:** resources appear in the resource bar; inventory items appear in the inventory. Either category can be a consumable. Consumable resources also appear in the inventory so players can use them and assign shortcuts.
- **Show sparks on the ground:** show or hide the animated pickup sparks. Existing items default to their current appearance, including cake without sparks.
- **Consumable:** enables using one unit from inventory or a consumable shortcut. Turning this off keeps the configured effects available for later editing.
- **Effects:** restore a fixed amount of HP, apply timed stat multipliers, or combine both. Available stats include XP, melee/ranged damage, melee damage taken, movement speed, health regeneration, maximum health, attack speed, fishing, aggro and stealth. Use ×2 for double or ×0.5 for half. Duration is entered in seconds. A new timed effect replaces the active multiplier for the same stat rather than stacking with it.
- **Change mob drop percentages:** set a temporary loot table for the consuming player's kills. Optionally restrict it to one registered mob ID; leave that field blank for every mob. Add item IDs and their chances in percent, totalling at most 100%. Each kill rolls once and drops at most one item; the remaining percentage gives no drop. The table replaces normal loot for the effect's duration and leaves other players' loot unchanged. Consuming another loot effect replaces the active one. An empty table is rejected; a row at 0% can deliberately disable loot.
- **Spawn mob / item / NPC:** choose a registered ID and a quantity from 1 to 10. Mobs appear near the player and do not respawn after defeat. Items drop at the player's position and use the normal item despawn timer. NPCs appear at the player and disappear after the configured lifetime in seconds. These effects can be combined with healing, buffs and temporary loot changes; up to 24 effect rows are supported.
- **Cooldown:** entered in seconds; 0 means no cooldown. Leave the group blank for an independent cooldown, or give several items the same group to share it. Existing group names are case sensitive.

Built-in scripted consumables load with **Keep existing effect** selected. This preserves their custom behavior, such as summoning an NPC. Choose **Configure effects** to replace that script with the effects in the editor. You can select **Keep existing effect** again to restore it. Copies cannot inherit executable scripts: a copy of a scripted item starts with consumption disabled, ready for you to configure new effects. Copies of configured consumables keep their effects.

## Player tooltips

**Inventory description** is the tooltip heading. **Effect tooltip** is the effect text shown underneath it in the inventory and consumable shortcuts. Leave the effect tooltip blank to generate it from configured effects, for example `Restores 75 HP; XP ×2 for 30s`. The player tooltip preview updates as you edit. Tooltip text is plain text, up to 500 characters.

When replacing an existing script, clear or update its old effect tooltip so it describes the new behavior. When restoring a script, enter its original effect text if you previously replaced it.

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
