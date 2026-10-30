# Mapmaker Toolbox

The Mapmaker Toolbox is your local workspace for editing LooperLands maps, creating or adapting quests and testing them in the game. Open it at [127.0.0.1:8010/local/](http://127.0.0.1:8010/local/) after starting the local launcher.

## Start the toolbox

1. Install Docker Desktop and wait for its engine to start.
2. Open the LooperLands repository folder.
3. On macOS, double-click `start-local.command`. On Windows, double-click `start-local.bat`.
4. Wait for the browser to open the toolbox. The first build can take several minutes.

The browser launcher includes the runtime and map-export dependencies in Docker. You do not need a separate Node.js installation, wallet connection or Platform credentials. Install Tiled separately to edit map layouts.

## Choose a tool

**Playtest** stays at the top of the menu: choose a map, spawn point, avatar and equipment, then start a game. See [Starting game sessions](mapmaker-sessions.md).

Expand a group to find its tools. **Map & world** starts open; opening a tool from an inspector link or bookmark also expands its group. On smaller screens, the **Tool** selector contains the same groups.

### Map & world

- **Map inspector:** place items, mobs and NPCs with sprite previews; explore searchable object layers and open their editors. See [Interactive map inspector](mapmaker-inspector.md).
- **Doors & portals:** find entrances and edit access rules, opening hours and player messages. See [Doors & portals](mapmaker-doors.md).
- **World connections:** explore map links and find broken destinations or missing return routes. See [World connections](mapmaker-connections.md).
- **Scene manager:** create, duplicate and place scene regions, then edit lighting, music and particles with a game-time preview. See [Scene manager](mapmaker-atmosphere.md).
- **Lights & shadows:** place torches, lamps, area lights and shadow blockers, with a live lighting preview. See [Lights & shadows](mapmaker-lighting.md).

### Gameplay

- **Quest builder:** create custom quests or edit a bundled quest through a saved override. See [Quest builder](mapmaker-quest-builder.md).
- **Dialogue trees:** build branching NPC conversations and preview player choices. See [Dialogue trees](mapmaker-dialogues.md).
- **Interactions:** create reusable resource deposits, chests, repairs and switches; choose rewards, artwork and repeat behavior, then place them on any map. Existing farming stays available in its compatibility editor. See [Interactions](mapmaker-tile-actions.md).
- **Sequences & cutscenes:** build ordered NPC movement, dialogue, camera, audio and gate actions. See [Scripted sequences & cutscenes](mapmaker-sequences.md).
- **Chests & encounters:** place chests, draw mob areas and add clear-area reward chests. See [Chests & encounters](mapmaker-encounters.md).
- **Triggers & events:** configure event, condition and action rules with a simulation. See [Trigger & event builder](mapmaker-events.md).

### Characters & items

- **NPCs:** create dialogue characters and set map-specific behaviour and schedules. See [NPCs](mapmaker-npcs.md) and [NPC route painter](mapmaker-routes.md).
- **Mobs:** tune combat, aggression, drops and sprites. See [Mobs](mapmaker-mobs.md).
- **Items:** create collectibles and prepare sprites. See [Items](mapmaker-items.md).
- **Live assets:** search the Platform catalog and copy Platform, NFT and collection IDs. See [Live asset lookup](mapmaker-live-assets.md).

### Build & test

- **Map validator:** find blocked placements, invalid references and entrance problems, then jump to their editors. See [Map validator](mapmaker-validator.md).
- **Build tools:** export a saved Tiled map, update the game client and restart the local game. Unchanged client bundles are reused. See [Building maps](mapmaker-building.md).
- **Troubleshoot:** run environment checks and read suggested fixes. **Check main updates** reports repository updates and suggests Git commands; it does not update your files.

**Documentation** is available below the groups and opens these guides inside the toolbox.

## Choose items, mobs and NPCs

Entity fields share one picker across asset editors, quests, interactions, encounters, drops, item effects, NPC placement, playtest inventory and the map inspector. Click the selected entity or **Choose…** to browse sprite previews. Search by display name, string ID or numeric kind ID. The picker shows the choices allowed by that field; quest targets remain limited to the selected map.

Use **Arrow down** from search to focus a result, arrow keys to move between results and **Enter** to choose it. **Escape**, **Close** or a click outside the panel closes the picker without changing the field. The Close button stays visible while the results scroll. Optional fields include their existing **None**, **No reward** or **All mobs** choice. Missing artwork falls back to a text label, so the entity remains selectable. Door item requirements also accept an exact custom ID through **Use this ID**.

## A typical editing loop

1. Edit and save your map in Tiled, or save a quest in **Quest builder**.
2. Use **Build tools** for that map and wait for the build to complete.
3. Open **Playtest**, choose your setup and click **Start game**.
4. Test the changed route or quest, then return to the toolbox for another edit.

Keep the toolbox address bookmarked. Starting a game opens the game in the current browser tab; return to the toolbox address to start another session.

## Shared map loading

Choosing a map loads one shared workspace for its tools. The loading bar above the editor shows the map, the section being loaded and how many parts are ready. This includes built geometry and artwork, Tiled objects and placements, entrances, lights, chests, encounters, NPC routines, quests, interactions, events, dialogue, scenes and validation results. Coordinate previews use the loaded geometry.

Switching tools keeps the selected map and reuses this data. The two most recently loaded maps are kept in memory, so switching back usually needs no map-data download. Unloaded destination maps can still show lightweight coordinate previews.

Saving refreshes the shared workspace; building refreshes it when the game is ready again. The toolbox also checks for file changes from Tiled or another tab. Opening an affected tool refreshes its saved data through its existing unsaved-change checks. Unsaved quest drafts stay available when switching maps. **Reload map data** refreshes the workspace manually; failed loads offer **Retry loading**, and an unavailable section does not hide the other tools.

## Local data and sessions

The local provider skips NFT and collection ownership checks. Item, quest and level requirements still apply, which lets you test gates and progression. Only avatars and equipment whose artwork is included in the client are available.

Player progress is saved in the `local-game-data` Docker volume. It stays on this computer and is never sent to the live Platform. A new session URL does not erase inventory or quest progress. Live Platform flows, shop stock, events and companions are not loaded by the local provider.

Map builds restart the game and end active local sessions. After the build, create a new session from **Playtest**.

Quest builder changes are saved in `tools/quests` in your checkout. Custom quests belong to their selected map. Edits to a bundled quest preserve its original source and apply locally everywhere that same quest appears. **Restore original**, followed by saving and rebuilding, removes those edits. Both kinds of change also load in production after these files are committed and deployed.

## Commit and deploy saved content

Saving updates your checkout. Local playtesting and production use the same saved gameplay definitions:

- `tools/quests`: custom quests and bundled quest overrides.
- `tools/worlds`: event rules, dialogue trees, scenes and atmosphere.
- `tools/tiles`: farming overrides, generic stage sequences and action placements.
- `tools/npcs`: NPC routines and schedules.
- Shared entity definitions, sprite metadata and PNG artwork from the asset editors.

For TMX edits, use **Build tools** and commit the TMX source together with its generated client/server map exports. Include every saved definition and asset file used by your change. Push or merge the reviewed changes into `main`; the deployment workflow builds and deploys the production image. A local commit alone does not deploy.

The production image validates saved content and bakes scene, atmosphere and action-placement overlays into its map artifacts. Content-only changes also enter the server release manifest so deployment restarts the game when required. Player progress, saved session setups and access bypasses remain local playtest settings.

Generic tile sequences require the matching Platform atomic-transaction extension to be deployed first. It uses the existing farming database tables and scopes; no new migration is needed. Other saved content does not require that extension. See [production authoring validation](mapmaker-production.md).

## Stop or recover

Closing the browser or launcher window leaves the Docker services running. Stop them through Docker Desktop, or run this from the repository folder:

```bash
docker compose -f docker-compose-local.yml stop
```

If startup or a build fails, read the visible error and **Build tools** output. Run **Troubleshoot → Run checks** to check the runtime, map sources, output folders and game server. Restart the desktop launcher after fixing startup problems. Keep ports 8000 and 8010 available.

Continue with [Starting game sessions](mapmaker-sessions.md), [Building maps](mapmaker-building.md) or [Quest builder](mapmaker-quest-builder.md).

## Characters and items

The [Mob editor](mapmaker-mobs.md), [NPC editor](mapmaker-npcs.md) and [Item editor](mapmaker-items.md) prepare spritesheets, preview animations and register new gameplay types. Start from an existing asset, create a copy, save it, then use **Place on map** to choose a tile in the map inspector and rebuild your map.

Use [Doors & portals](mapmaker-doors.md) to find entrances and edit their access rules, opening hours and player messages directly in the Tiled source.

## Preview a coordinate

Hover a map coordinate to see a **13 × 13 tile preview**, with that exact tile outlined in blue at the center. The same preview is available by focusing a coordinate with the keyboard or tapping it. Use **Escape** or **Close** to dismiss it. The pointer can move onto the preview without closing it.

Previews are shared across Playtest checkpoint and spawn settings, Doors & portals, NPC placements and behaviour fields, Map validator and Map inspector. Entrance destinations use their destination map. Coordinate fields preview the current pair of values as you edit, without saving changes.

Previews show the last built map artwork. Build after changing Tiled layouts. Locations near an edge stay centered, with gray cells beyond the map boundary. Missing builds or artwork show a readable message rather than an unrelated location.

## Fishing

Use **Gameplay → Fishing** to draw fishing areas, override existing lakes, set rod levels and edit catches with actual normal/lucky chances. Save to Tiled, build the map and start a fresh playtest. See the [Fishing guide](mapmaker-fishing.md).

## Checkpoints and gameplay zones

Use **Gameplay → Checkpoints & zones** to edit spawn and revival areas, trigger zones, PvP, positional music and event-board proximity. Saves retain checkpoint IDs. See the [guide](mapmaker-zones.md).

## Sound design

Use [Ambient sounds](mapmaker-audio.md) to place campfires, water, surf, wind, birds and lava sounds. Preview from a movable listener, adjust radius and volume, then save and playtest. Sources fade and pan relative to the player.
