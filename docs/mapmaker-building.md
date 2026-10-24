# Building maps

Use **Build tools** in the [Mapmaker Toolbox](mapmaker-toolbox.md) after editing a Tiled map or when you need to restart the game with saved quest changes. The desktop launcher provides Python, lxml and Node.js inside Docker.

## Edit the map source

Open the configured map's `tools/maps/tmx/<mapId>.tmx` file in Tiled. Keep its referenced tilesets and artwork available and save your changes before building. The toolbox reads files from disk; unsaved Tiled edits are not included.

The map must already be configured in `server/config.json` and have a matching TMX source file. Adding a new map ID to the server configuration requires restarting the desktop launcher before it appears in the toolbox. Use an existing map as a reference for LooperLands layers, object properties and checkpoints.

## Build and restart

1. Open **Build tools**.
2. Select your map under **Map to build**.
3. Click **Build map and restart game**.
4. Watch the step indicator and **Build output**. Large maps can take several minutes.
5. Wait for **Build complete**, then switch to **Playtest** and [start a new session](mapmaker-sessions.md).

The build stops the local game, exports the server map, exports the client map, rebuilds the game client and starts the game again. The toolbox stays available throughout. Only one map build can run at a time, and new sessions wait until it finishes.

Active local sessions end when the game restarts. Saved player progress remains in the local Docker volume.

## Files produced by a build

For a map named `duckville`, the exports are:

- `server/maps/world_server_duckville.json`
- `client/maps/world_client_duckville.json`
- `client/maps/world_client_duckville.js`

The client is rebuilt into `client-build` inside the running container. The TMX source and generated map files in the mounted repository remain available after stopping Docker. Review source and generated map changes together when sharing a map update.

Quest definitions saved with [Quest builder](mapmaker-quest-builder.md) are read when the game starts. Rebuilding the selected map also restarts the game so those saved definitions become active.

## If a build fails

Read the error above the form and the final lines of **Build output**. Fix the reported source, tileset or export error, save the file, and try the build again.

A failed export or client build restores the previous generated map files and built client, then attempts to restart the game. A restart can still fail; **Build complete** is the signal that the game became ready. Check **Troubleshoot → Run checks** if the game remains unavailable.

If your changes do not appear, confirm the selected map and saved TMX file, wait for the build to finish, and start a fresh session. The map catalog refreshes after a successful build. Reload the toolbox if it reports that the map list could not refresh.

Continue with [Starting game sessions](mapmaker-sessions.md) or [Quest builder](mapmaker-quest-builder.md).

## Place Toolbox characters and items

Use an object layer named `mapmaker-entities` for assets created in the [Mob & NPC editor](mapmaker-mobs.md) or [Item editor](mapmaker-items.md). Add a point object and give it the exact asset ID as its Name. Place it inside the map, after the first column, with one entity per cell. The exporter adds these points to the existing static entity registry. Build the map after saving the TMX and after changing an asset definition.
