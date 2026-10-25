# Fishing

Open **Gameplay → Fishing** in the Mapmaker Toolbox. Choose the map you want to edit. The map artwork and existing lake-tagged water come from its latest build; build first after changing terrain in Tiled.

## Place fishing areas

1. Choose **Draw fishing area**, then drag a box on the water. The box makes every covered tile fishable, including ground if you draw over it. Terrain artwork and collisions stay as authored in Tiled.
2. Drag the box to move it; drag an edge or corner to resize. Shift-drag pans, scroll zooms. Arrow keys move; Shift and arrows resize. Numeric tile coordinates also work on touchscreens.
3. Set the required **rod level**, then choose catches with the visual item picker and assign a rarity to each one. Use registered fish only and include at least one common catch.
4. Select another area from **Authored areas** to keep editing. **Save all changes** saves additions, edits and removals together to Tiled.
5. Choose **Build this map**, wait for completion, then start a fresh playtest with a fishing rod at the appropriate level.

Casting requires a living player with a rod equipped, standing in the same row or column, one or two tiles from a fishing tile. The server checks the saved fishing map, position and rod level before selecting a catch. The validator warns when an area has no reachable casting position under the built base collisions.

Changes remain drafts until saved. Reload and map switches ask before discarding changes. If Tiled or another tab changed the file, save is rejected and the draft is retained; reload and reapply it. Fishing areas may not affect the same tile. Rotated shapes, layer offsets and non-rectangles must be corrected in Tiled.

## Edit existing Tiled water

Select a lake under **Existing Tiled water** to see its current default table and required rod level. **Override on this map** creates a local override covering that lake's bounds. Only matching lake-tagged tiles inside the box change; other terrain and lakes keep their behavior. Resize the override to change just part of the lake.

**Close water to fishing** creates a box that removes fishing access. Choose all water inside the box or one source lake. Removing an authored area from the draft and saving restores the underlying lake-tagged behavior after the next build. Existing shared lake defaults are preserved.

## Catch chances and rewards

The runtime rolls a rarity, then chooses equally among catches in that rarity. The base rarity weights are 700 common, 243 uncommon, 40 rare, 15 epic and 2 legendary out of 1000. Missing rarities fall back to common. A table with a single catch always returns it.

The editor shows actual per-fish percentages for normal and **lucky** casts. Lucky rolls twice and keeps the rarer result. Two common catches split their common probability equally. Assigning a catch a different rarity changes its chance, fishing speed and fishing XP for this area.

Rod level controls access and target width. **Upper hand** increases the normal target width; a class fishing modifier may replace it. **Double catch** awards two fish. A bullseye gives 50% extra XP, and double catches multiply the resulting XP by two. Previewed XP is the base award before these bonuses.

Fish consumption buffs use the canonical item definition, so moving a fish into another lake or changing its rarity here does not change its consumable effect. The catch picker displays existing item artwork and any canonical buff description.

## Tiled and production

The editor adds a top-level object layer named `fishing`. Each unrotated rectangle stores pixel geometry, an optional name and these readable properties:

| Property | Meaning |
| --- | --- |
| `scope` | `area` (every tile), `existing` (matching lake tiles) or `closed` |
| `sourceLake` | Registered default lake ID for a source-water override; empty for all water in a closed area |
| `level` | Required rod level, 1–100 |
| `fish` | Comma-separated entries such as `cobguppy:common,cobgoldfish:epic` |

Unknown properties, comments and unrelated layers survive saves. The normal map exporter writes `baseFishingTiles`, `fishingAreas` and the final `fishingTiles` to both client and server exports. Catch tables use stable generated IDs based on their contents. The game registers those tables at startup before building the fishing and field-guide catalogs.

Commit the TMX source with its generated server map and client JSON/JS exports after a successful build. Deploy through the normal production process. Saving or committing locally does not deploy. Production uses the exported areas without the local Toolbox; deleting an override requires rebuilding and deploying the restored maps.

Use **Validate map** to inspect table, overlap, bounds and casting-access findings. Area findings link to the exact Fishing object.
