# Mapmaker Toolbox

The Mapmaker Toolbox is your local workspace for editing LooperLands maps, creating or adapting quests and testing them in the game. Open it at [127.0.0.1:8010/local/](http://127.0.0.1:8010/local/) after starting the local launcher.

## Start the toolbox

1. Install Docker Desktop and wait for its engine to start.
2. Open the LooperLands repository folder.
3. On macOS, double-click `start-local.command`. On Windows, double-click `start-local.bat`.
4. Wait for the browser to open the toolbox. The first build can take several minutes.

The browser launcher includes the runtime and map-export dependencies in Docker. You do not need a separate Node.js installation, wallet connection or Platform credentials. Install Tiled separately to edit map layouts.

## Choose a tool

- **Playtest:** choose a map, spawn point, avatar and equipment, then start a game. See [Starting game sessions](mapmaker-sessions.md).
- **Build tools:** export a saved Tiled map, rebuild the game client and restart the local game. See [Building maps](mapmaker-building.md).
- **Quest builder:** create custom quests or edit a bundled quest through a local override. See [Quest builder](mapmaker-quest-builder.md).
- **Mobs:** tune combat, aggression, drops and sprites. See [Mobs](mapmaker-mobs.md).
- **NPCs:** create dialogue characters and set map-specific behaviour and schedules. See [NPCs](mapmaker-npcs.md).
- **Live assets:** search the Platform catalog and copy Platform, NFT and collection IDs. See [Live asset lookup](mapmaker-live-assets.md).
- **Items:** create collectibles and prepare sprites. See [Items](mapmaker-items.md).
- **Troubleshoot:** run environment checks and read suggested fixes. **Check main updates** reports repository updates and suggests Git commands; it does not update your files.
- **Documentation:** read the toolbox guides inside the toolbox.

## A typical editing loop

1. Edit and save your map in Tiled, or save a quest in **Quest builder**.
2. Use **Build tools** for that map and wait for the build to complete.
3. Open **Playtest**, choose your setup and click **Start game**.
4. Test the changed route or quest, then return to the toolbox for another edit.

Keep the toolbox address bookmarked. Starting a game opens the game in the current browser tab; return to the toolbox address to start another session.

## Local data and sessions

The local provider skips NFT and collection ownership checks. Item, quest and level requirements still apply, which lets you test gates and progression. Only avatars and equipment whose artwork is included in the client are available.

Player progress is saved in the `local-game-data` Docker volume. It stays on this computer and is never sent to the live Platform. A new session URL does not erase inventory or quest progress. Live Platform flows, shop stock, events and companions are not loaded by the local provider.

Map builds restart the game and end active local sessions. After the build, create a new session from **Playtest**.

Quest builder changes are saved in `tools/quests` in your checkout. Custom quests belong to their selected map. Edits to a bundled quest preserve its original source and apply locally everywhere that same quest appears. **Restore original**, followed by saving and rebuilding, removes those edits. Both kinds of change are enabled only in local playtest mode.

## Stop or recover

Closing the browser or launcher window leaves the Docker services running. Stop them through Docker Desktop, or run this from the repository folder:

```bash
docker compose -f docker-compose-local.yml stop
```

If startup or a build fails, read the visible error and **Build tools** output. Run **Troubleshoot → Run checks** to check the runtime, map sources, output folders and game server. Restart the desktop launcher after fixing startup problems. Keep ports 8000 and 8010 available.

Continue with [Starting game sessions](mapmaker-sessions.md), [Building maps](mapmaker-building.md) or [Quest builder](mapmaker-quest-builder.md).

## Characters and items

The [Mob editor](mapmaker-mobs.md), [NPC editor](mapmaker-npcs.md) and [Item editor](mapmaker-items.md) prepare spritesheets, preview animations and register new gameplay types. Start from an existing asset, create a copy, save it, then place it in Tiled and rebuild your map.

Use [Doors & portals](mapmaker-doors.md) to find entrances and edit their access rules, opening hours and player messages directly in the Tiled source.
