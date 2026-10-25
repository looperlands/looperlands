# Interactive map inspector

Use **Map inspector** to explore a built map, find an object and open the editor for its settings. Use **Inspect** to select objects and **Place entities** to add items, mobs and NPCs directly to the Tiled source. Clicking in Place mode previews a placement; **Save placement** writes it to disk.

## Explore a map

1. Choose a map. The inspector loads local tile artwork and built geometry, alongside map objects and current Tiled entrance properties.
2. Drag the map to pan and scroll to zoom. **Zoom in**, **Zoom out** and **Fit map** are also available. With the map focused, use arrow keys to pan and `+` / `-` to zoom.
3. Open **Layers & display** to toggle object types, entity sprites, collisions and the tile grid. Entity sprites use the actual idle artwork once you zoom in; small markers keep the full-map view readable.
4. Search the object list by name, type, ID or coordinates such as `127, 120`. Selecting a result centers the map on it and shows its details above the list. Filter by object type or **Objects with findings**. The list is paginated and provides keyboard access to the same objects as the map.
5. Click a tile to see its matching objects. Overlapping objects appear together in the list; select the one you need. **Show all objects** clears the tile filter.

Use **Go to tile** with X and Y coordinates to jump to an exact location. **Expand map** provides more working space; **Exit expanded view** restores the workspace. Zoom, position and filters survive a refresh or placement save.

On narrow screens, selecting a marker or list result brings its object panel into view above the list, so its editor actions are easy to reach.

The object panel shows its type, tile position, dimensions, stable inspection ID and available properties. Validation findings for the selected object appear there too. **Validate this map** opens the full [Map validator](mapmaker-validator.md) report.

## Open the right editor

**Edit definition** opens the matching asset editor; other object links select their source object:

- **Door or portal:** Doors & portals, on this map and exact Tiled object ID.
- **Mob or mob spawn area:** Mobs, with its gameplay type selected.
- **NPC:** NPCs, with its character definition selected.
- **Item:** Items, with its item definition selected.
- **NPC routine:** NPCs → Behaviour & schedule, with this map and routine selected.
- **Quest:** Quest builder, with its custom quest or bundled override selected.

NPC markers also offer **Edit behaviour / schedule**. This opens the routine for that exact placement. If it has no routine yet, the editor prepares a new, unsaved routine for that NPC; choose its ID and settings before saving. Existing editor drafts use their usual keep/discard protection. Quest drafts remain cached per map as you navigate.

Definitions and placements are different: changing a mob definition affects that gameplay type. Placements created in the toolbox have **Move** and **Remove placement** actions. Older placements in the Tiled `entities` tile layer still move and delete in Tiled. Checkpoints, triggers and scenes keep their existing authoring tools. **Copy Tiled location** copies the source file, layer, object name and tile coordinates so you can locate them in Tiled. It does not open or modify Tiled.

## Place items, mobs and NPCs

1. Choose your map and switch to **Place entities**.
2. Search the visual library or filter it to Items, Mobs or NPCs. Select an entity to see its sprite preview.
3. Click a walkable, empty tile. A translucent sprite previews its position. You can also enter **Tile X** and **Tile Y** with the keyboard.
4. Click **Save placement**. Blocked tiles, occupied cells and map edges cannot be saved. Cancel or press Escape with the map focused to return to Inspect.
5. Build the selected map, then start a fresh playtest session. Saved source placements appear in the inspector before the game exports are rebuilt.

To create a new entity, open **Create a new entity** and choose New item, New mob or New NPC. The matching editor starts a copy of an existing definition. Give it a unique ID, configure its settings and save it, then use **Place on map** to return to the inspector. Existing definitions also offer Place on map.

Select a toolbox placement in Inspect mode to **Move** it or **Remove placement**. Moving previews the destination and requires **Save new position**. Removing immediately saves the source change; place the same entity again to restore it. NPC routines remain tied to their exact origin tile: after moving or removing an NPC, update its Behaviour / schedule too.

Placements are point objects in the `mapmaker-entities` object layer of `tools/maps/tmx/<mapId>.tmx`. Their names are registered gameplay IDs. Other Tiled layers and entrance settings are preserved. Concurrent source changes are rejected; refresh the map before retrying. Builds wait for placement saves, and saves wait for builds to finish. Collision checks use the latest built geometry; rebuild after changing terrain or map dimensions in Tiled.

## Keep the view current

Save changes in their editor, build the map when required, then use **Refresh map**. The header identifies the geometry export and entrance source. A warning appears when the Tiled source is newer than the exports. If tile artwork cannot load, the inspector shows a collision geometry fallback and explains that state.

The inspector reads tilesheet and entity artwork directly from local source files. Tile layout and collision geometry still come from the built map exports. The view combines that geometry with current entrance properties and authoring definitions. Unsaved drafts in other editors are not included. Entrances read from a built-map fallback have inspection-only IDs and no exact-source editor link. Dynamic layers, NPC movement, ownership checks and scripted runtime effects are not simulated here. Use [Playtest](mapmaker-sessions.md) to check the resulting game.
