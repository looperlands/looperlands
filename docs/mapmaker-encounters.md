# Chests & encounters

Open **Chests & encounters** in the Mapmaker Toolbox and choose a map. The canvas uses the built map and collision overlay. Build first after changing terrain in Tiled.

## Place and edit

1. Choose **Place chest** and click a walkable tile, or choose **Draw encounter** and drag a rectangle.
2. Select a marker or an entry in **Map objects** to inspect it. Search by name, type, object ID or coordinates.
3. Drag to move. Drag an area's edge or corner to resize. Arrow keys move the selected object; Shift and arrows resize an area. Shift-drag pans the canvas, and the mouse wheel zooms.
4. Use the numeric tile coordinates for precise placement, including on a touchscreen. Escape cancels an active drag or placement mode.
5. Click **Save changes**, then **Build this map**. Start a fresh game session after the build.

Changes remain drafts until saved. Reloading or switching maps asks before discarding a draft. A stale save is rejected if Tiled or another tab has changed the source. Reload and reapply the edit. Unsupported shapes and rotations remain viewable; edit those in Tiled.

## Chest loot

Select registered item IDs from the suggestions. Each chest opening selects **one item** from the table. These are item choices, not stack quantities or independent drop rolls.

- **Equal chances:** every listed item has the same chance.
- **Weighted chances:** chance equals weight divided by the total weight. Weights 3 and 1 produce 75% and 25%. Fractional weights are supported.

A placed chest respawns after its configured delay in seconds. The timer starts when it is opened. **Duplicate** creates an unsaved copy; move its chest to an unused tile before saving. **Remove object** requires confirmation and takes effect in the game after rebuilding.

## Mob encounters and clear-area rewards

An encounter area spawns the configured population of a mob type on walkable tiles within its rectangle. Mob respawn delays and combat settings come from **Mobs**. Loot from individual mob kills is also configured there.

Save the encounter, then use **Add clear-area reward** to create a matching reward region. Alternatively, use **Draw reward area**. Choose **Place reward chest** or enter its tile coordinates, and configure its loot table. The chest can appear outside the combat rectangle, on any free walkable tile.

The reward tracks static and roaming mobs whose initial spawn lies inside its rectangle. Enclose the **whole encounter** for a predictable group; partially overlapping regions can track a random subset. A mob remains part of its initial reward group while chasing players or roaming. Overlapping reward areas can track the same mob.

When the last tracked mob dies, one reward chest appears. The whole tracked group must respawn before another clear can earn a reward. Kill the group before its first members respawn to complete the clear. An area with no tracked mobs grants no reward. Reward chests expire using the game's normal dropped-item timer; placed chest respawn settings do not apply to these temporary rewards.

## Tiled and production

The tool writes existing Tiled object layers directly:

- `chests`: point placement; `items`, optional `chances`, and `delay` in seconds.
- `roaming`: rectangular mob region; Tiled class/type is the mob ID and `nb` is its population.
- `chestareas`: rectangular reward region; `items`, optional `chances`, and reward tile coordinates `x` and `y`.

Coordinates displayed in the editor are tiles; Tiled geometry is stored in pixels. Unknown properties, comments and unrelated layers are retained. Saves validate item and mob IDs, map bounds, collisions, positive weights and duplicate chest destinations.

Use **Validate map** for actionable checks; its chest and encounter findings open the matching editor object. Collision checks reflect the latest build, so rebuild after editing terrain.

For production, commit the saved `tools/maps/tmx/<map>.tmx` together with its generated `server/maps/world_server_<map>.json`, `client/maps/world_client_<map>.json` and `client/maps/world_client_<map>.js`. Include any newly created mob/item definitions and artwork. Deploy through the normal reviewed release workflow. A local save or commit does not deploy. The production server uses these exports through the same chest, loot and encounter runtime as local playtests; no playtest flag is required.
