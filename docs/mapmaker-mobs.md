# Mobs and combat

Use **Mobs** in the Mapmaker Toolbox to create combat characters and tune their combat, aggression and loot. For dialogue characters and routines, use the separate [NPC editor](mapmaker-npcs.md).

## Start from an existing character

1. Choose a mob from the asset list. The editor loads its sprite, animation rows and editable gameplay settings.
2. To change that character, edit it directly. Built-in IDs and types stay fixed.
3. To create a new character, click **New mob**. Enter a unique ID of 2–48 characters, starting with a lowercase letter and using only lowercase letters, numbers and underscores, and a display name. For example, `forest_beetle`.
4. Use a mob template so the copy already has the required combat animations.

Saving a built-in character creates a shared override. Its numeric kind, scripted abilities and other existing behavior stay in place. The editor changes its sprite and the gameplay settings shown in the form. Existing drop tables are loaded and can be edited.

## Prepare a spritesheet

Upload a transparent PNG, up to 4 MB. Choose whether the uploaded artwork is 1×, 2× or 3×. Frame width and height always describe the 1× frame, including transparent padding. A 2× sheet with 48 × 48 logical frames has 96 × 96 source-pixel frames.

Frames run left to right, starting at column 0. Each animation selects a row and a frame count. Rows start at 0. The sheet must contain whole frames. The editor prepares nearest-neighbor 1×, 2× and 3× artwork automatically, preserving transparency. The prepared 3× sheet must fit within 4096 pixels per side and 8 million pixels.

Select an animation in **Live preview**, then use **Pause**, **Next frame** and zoom to check it. The sheet view shows the frame grid. The tile guide marks the 16 × 16 game tile and its origin. Horizontal and vertical offsets move the frame relative to that origin; negative offsets are common for artwork larger than a tile. The preview respects reduced-motion preferences and starts paused when requested by your system.

New mobs need `idle_down`, `idle_up`, `idle_right`, `walk_down`, `walk_up`, `walk_right`, `atk_down`, `atk_up`, `atk_right` and `death`. Left-facing animations mirror the right-facing frames. NPC sprite requirements are covered in the [NPC guide](mapmaker-npcs.md).

Animation duration is milliseconds per frame. A blank value uses the character's gameplay timing. Existing arrays of per-frame durations are preserved when their duration field stays blank. Changing preview zoom or the tile guide does not change your asset.

## Tune gameplay

Mobs expose level, health/armor/damage multipliers, respawn delay, movement and animation timing, aggro range and aggression. The server uses its normal combat formulas. Smaller duration values mean faster movement or animation.

Use **Add drop** to add a loot row. Search for an item in the item picker, then enter its percentage chance. Use **Remove** to delete a row. Each item can appear once.

The summary shows the combined item-drop chance and the chance of dropping nothing. Chances must total no more than 100. For example, wood at 20% and ore at 10% leave a 70% chance of no drop. You can use an item created in the Item editor after saving it.

Combat and loot appear before sprite preparation so you can tune gameplay first. Use the [Quest builder](mapmaker-quest-builder.md) for objectives and rewards.

## Save and place in a map

**Save & register** assigns a numeric kind to a new character and writes a shared definition, sprite JSON and prepared artwork. A saved ID stays fixed; create another copy to use a different ID. Changes are saved to the checkout, but need a map build before they appear in a new game session.

Use **Place on map** to open the map inspector with your mob selected. Choose a walkable tile, save the placement and build the map. See the [placement guide](mapmaker-inspector.md#place-items-mobs-and-npcs).

Alternatively, in Tiled, add an **object layer** named `mapmaker-entities`. Add a **point object** at the desired tile and set its **Name** to the exact asset ID, for example `forest_beetle`. Do not use a tile object or place two entities in one cell. Keep the point inside the map and after its first column; the legacy runtime reserves the left boundary. Existing entity tile layers still work.

Save the TMX file, open [Build tools](mapmaker-building.md), build that map, then start a fresh [game session](mapmaker-sessions.md). NPCs and mobs placed in the built map become available to the Quest builder.

## Files and recovery

Definitions live in `shared/js/mapmakerentities.json`. Sprite metadata lives in `client/sprites/<id>.json`; artwork lives in `client/img/1`, `client/img/2` and `client/img/3`. Include these files, your TMX and generated map outputs when sharing the change. The shared definitions load in both the client and server; no hand editing of entity factories is needed.

Metadata-only edits preserve existing artwork at every scale. Uploading a replacement sheet regenerates all three scales. Saves reject stale revisions if another tab or an external edit changes the asset. Copy any unsaved values you need, then use **Reload list** and reapply your changes. If saving fails, the previous files are restored.
