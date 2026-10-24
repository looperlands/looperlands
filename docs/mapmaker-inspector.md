# Interactive map inspector

Use **Map inspector** to explore a built map, find an object and open the editor for its settings. The inspector is read-only: clicking a marker selects it and never moves or saves the object.

## Explore a map

1. Choose a map. The inspector loads the built tile artwork, geometry and object placements, plus current Tiled entrance properties.
2. Drag the map to pan and scroll to zoom. **Zoom in**, **Zoom out** and **Fit map** are also available. With the map focused, use arrow keys to pan and `+` / `-` to zoom.
3. Toggle object layers to show doors/portals, NPCs, mobs, items, spawn areas, checkpoints, triggers, scenes, routines or quests.
4. Search the object list by name, type, ID or coordinates such as `127, 120`. Selecting a result centers the map on it. The list provides keyboard access to the same objects as the map.
5. Click a tile to see its matching objects. Overlapping objects appear together in the list; select the one you need. **Show all objects** clears the tile filter.

On narrow screens, selecting a marker or list result brings its object panel into view above the list, so its editor actions are easy to reach.

The object panel shows its type, tile position, dimensions, stable inspection ID and available properties. Validation findings for the selected object appear there too. **Validate this map** opens the full [Map validator](mapmaker-validator.md) report.

## Open the right editor

**Open editor** selects the matching definition or source object:

- **Door or portal:** Doors & portals, on this map and exact Tiled object ID.
- **Mob or mob spawn area:** Mobs, with its gameplay type selected.
- **NPC:** NPCs, with its character definition selected.
- **Item:** Items, with its item definition selected.
- **NPC routine:** NPCs → Behaviour & schedule, with this map and routine selected.
- **Quest:** Quest builder, with its custom quest or bundled override selected.

NPC markers also offer **Edit behaviour / schedule**. This opens the routine for that exact placement. If it has no routine yet, the editor prepares a new, unsaved routine for that NPC; choose its ID and settings before saving. Existing editor drafts use their usual keep/discard protection. Quest drafts remain cached per map as you navigate.

Definitions and placements are different: changing a mob definition affects that gameplay type, while moving its marker belongs in Tiled. Checkpoints, triggers, scenes and object placement have no toolbox editor. **Copy Tiled location** copies the source file, layer, object name and tile coordinates so you can locate them in Tiled. It does not open or modify Tiled.

## Keep the view current

Save changes in their editor, build the map when required, then use **Refresh map**. The header identifies the geometry export and entrance source. A warning appears when the Tiled source is newer than the exports. If tile artwork cannot load, the inspector shows a collision geometry fallback and explains that state.

The view combines built geometry with current entrance properties and authoring definitions. Unsaved drafts in other editors are not included. Entrances read from a built-map fallback have inspection-only IDs and no exact-source editor link. Dynamic layers, NPC movement, ownership checks and scripted runtime effects are not simulated here. Use [Playtest](mapmaker-sessions.md) to check the resulting game.
