# Map validator

Use **Map validator** before a playtest to find broken references, blocked placements and entrance problems. Select a configured map and click **Run validation** to refresh the report. Validation reads your files; it does not save edits or run a build.

## Read the report

The summary shows errors, warnings and the number of map objects checked. Search the findings or filter to **Errors only** or **Warnings only**. An error identifies a definition or base-map problem to investigate; a warning identifies something that needs review and may be intentional.

Each finding offers **Show object on map** when it has a placement, or **Open map inspector** for a map-wide issue. **Open editor** takes you to the relevant toolbox editor when one exists:

- Entrance conditions and messages open the exact Tiled object in **Doors & portals**.
- Entity definitions open the matching **Mobs**, **NPCs** or **Items** entry.
- NPC routine problems open that map and routine in **NPCs → Behaviour & schedule**.
- Quest problems open the custom quest or bundled quest override in **Quest builder**.
- Missing or stale exports open **Build tools** with the map selected. A build starts only when you explicitly run it.

Placement and collision changes belong in Tiled. From the inspector, use **Copy Tiled location** to copy the source file, layer, object and tile coordinates. See [Interactive map inspector](mapmaker-inspector.md).

## What is checked

- Built client/server dimensions and whether the Tiled source is newer than its exports.
- Playable bounds, blocked entity placements, checkpoint spawn space and mob spawn areas.
- Registered entity types, sprite definitions and 1× artwork for placed characters and items.
- Door and portal destination maps and tiles, required item IDs, condition priority and trigger references.
- Base-collision reachability of placed NPCs and items from checkpoint areas. Same-map entrances are included without applying their access conditions; NPCs can be reached from an adjacent tile.
- NPC routine validation: matching placements, walkable route tiles, movement areas, schedule definitions and public building door pairs.
- Authored quest validation, missing quest NPC placements and unknown reward items.
- Drop item IDs, invalid drop chances and totals over 100% for mobs used on the map.

Expand **Checks and limits** to see coverage and qualifications for the current run. If a source cannot be read, the report includes that failure instead of silently treating the checks as passed.

## Build, validate, playtest

Most geometry comes from the last built server/client map. Entrance properties come directly from the current Tiled source; quest and routine definitions are read from their current files. Save your edits, [build the map](mapmaker-building.md), then run validation again so those sources agree. Analysis waits while a toolbox build is running.

Reachability does not simulate dynamic collision layers, runtime events, ownership gates, scripted spawns or the player's actual progression. Route tiles are checked individually; the validator does not simulate NPC pathfinding or a complete daily schedule. Door quest prerequisites can refer across maps and are not resolved by this report. A clean report is useful evidence, but does not mean a map is playable: finish with a [fresh game session](mapmaker-sessions.md).
