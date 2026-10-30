## LooperLands

## Local quality checks

Use the Node.js version in `.nvmrc` (`nvm install && nvm use`), then install
dependencies with `npm ci`.

- `npm run lint` runs the same ESLint check as CI.
- `npm run lint:fix` fixes lint errors that ESLint can repair automatically.
- `npm run check` runs lint, all unit tests and the coverage thresholds before
  opening or updating a PR, including after exporting a map.
- `npm test -- --runInBand --coverage=false <test-path>` runs focused tests.
  Run the full check before pushing; focused runs do not verify global coverage.

Run `npm run hooks:install` once per clone to enable the tracked pre-push hook.
It blocks a push when `npm run check` fails. This sets the clone's
`core.hooksPath` to `.githooks`; integrate the hook with any existing custom hooks
instead of replacing them. Hook installation is explicit so Docker builds and
CI dependency installation do not modify Git configuration.

The Quality Check job is named `lint`, but it also runs unit tests and Docker
runtime checks. Use its failed step and logs to identify which check failed.

## Event toolkit documentation

- [Organizer and player guide](docs/event-toolkit-guide.md): templates, scoring, teams, rentals, prizes and announcements.
- [Shareable PDF](docs/event-toolkit-guide.pdf).
- [Game tracking and catalog reference](docs/event-tracking.md).

To rebuild the PDF, install the optional documentation dependency `reportlab` and run `python3 tools/docs/build_event_toolkit_guide.py`. The output is written to `output/pdf/looperlands-event-toolkit-guide.pdf`; copy the reviewed PDF to `docs/event-toolkit-guide.pdf` when updating the guide.

# Local development
Install and start Docker Desktop. No Node.js, wallet login, Platform credentials
or `jq` installation is needed for the browser launcher.

- **macOS:** double-click `start-local.command` in the repository folder.
- **Windows:** double-click `start-local.bat` in the repository folder.

The launcher builds and starts the local Docker services, waits until the game is
ready, and opens [the Mapmaker Toolbox](http://127.0.0.1:8010/local/). Choose a map,
avatar, checkpoint, avatar level and weapon level in **Playtest**, then click
**Start game**. Use this page again whenever you
need a fresh session. The first Docker build can take several minutes. If startup
fails, the launcher keeps the error visible. On macOS, if a downloaded script is
blocked, open it through Finder's **Open** action or use the terminal flow below.

The services keep running after the launcher closes. To stop them, use Docker
Desktop or run `docker compose -f docker-compose-local.yml stop` from this folder.

## Mapmaker Toolbox documentation

The toolbox's **Documentation** tab includes these guides:

- [Mapmaker Toolbox](docs/mapmaker-toolbox.md): setup, tools and the local editing loop.
- [Starting game sessions](docs/mapmaker-sessions.md): maps, avatars, equipment, saved setups and player progress.
- [Map validator](docs/mapmaker-validator.md): check map placements, references and entrance destinations.
- [Interactive map inspector](docs/mapmaker-inspector.md): explore map objects and jump to their editors.
- [Tile actions & stages](docs/mapmaker-tile-actions.md): place interactions, edit farming and connect reusable stages.
- [NPC route painter](docs/mapmaker-routes.md): draw routes, check paths and preview movement.
- [World connections](docs/mapmaker-connections.md): map links, destination checks and return routes.
- [Trigger & event builder](docs/mapmaker-events.md): configure and simulate game rules.
- [Dialogue trees](docs/mapmaker-dialogues.md): branching NPC conversations and player previews.
- [Atmosphere](docs/mapmaker-atmosphere.md): scene lighting, music, particles and game-time previews.
- [Building maps](docs/mapmaker-building.md): Tiled sources, exports, rebuilds and recovery.
- [Quest builder](docs/mapmaker-quest-builder.md): custom local quests, objectives, rewards and playtesting.

## Terminal flow

The existing terminal workflow remains available. It requires a Bash-compatible
shell and Docker Compose; `local-session.sh` also requires `jq` and `curl`.

Build a map
```bash
./build_maps.sh main.tmx
```

The following script builds the client and server and runs them in the foreground.
```bash
./run-local.sh
```
To kill it, press Ctrl+C.

Open [the Mapmaker Toolbox](http://127.0.0.1:8010/local/) to choose your playtest.
After editing a map in Tiled, use **Build tools** to export its server and client
maps, rebuild the game client and restart the local game. The toolbox stays open
and shows each build step and its logs. A failed export or client build restores
the previous generated files. **Troubleshoot** checks the local runtime, map
sources, writable output folders and game server, with a suggested fix for failures.
Its **Check main updates** button checks for new changes and suggests fetch/merge
commands when needed; it does not update your checkout. **Documentation** is
available inside the toolbox. **Quest builder** saves custom per-map quests in
`tools/quests/<mapId>.json`; use **Build tools** afterward to restart the game with
those definitions. Saved Toolbox quests load in local playtests and production after commit and deployment.

To get a new session run in a second terminal after the server starts:
```bash
./local-session.sh '<wallet-address>' '<avatar-nft-id>' duckville 1 10000
```
The five arguments are wallet address, avatar NFT ID, map ID, checkpoint ID and XP.
Replace `duckville` and `1` with your map and checkpoint. This prints and opens a
new session URL. Sessions are kept in server memory; create a fresh session if
an old URL is rejected after a restart.

Local Docker playtests accept any wallet with any avatar whose artwork is included
in the client. By default NFT and collection ownership checks pass locally, while
quest, item and level requirements apply. The [session setup](docs/mapmaker-sessions.md)
also offers real ownership checks, an allow-all door mode, starting inventory and
finished quests. Default local play needs no Platform account or credentials.
Player progress stays in the `local-game-data` Docker volume and is never
sent to the live Platform. Map flows, shop stock, events and companions from the
live Platform are not loaded by this local provider.

This mode requires both `NODE_ENV=development` and
`LOOPERLANDS_LOCAL_PLAYTEST=1`, which are set in `docker-compose-local.yml`.
Production ignores the local flag and retains its ownership checks. For a native
setup, see [the native guide](RUN-NATIVE-README.md). The launcher stops and prints
the server error if session creation fails.

If the browser redirects to `looperlands.io`, inspect the failed
`GET /session/<session-id>` request in the browser Network tab with Preserve log
enabled. The client redirects on session-load errors: HTTP 404 means the session
is missing, HTTP 409 means it is already active, and HTTP 503 means player game data
could not be loaded. This redirect does not establish that your map is broken.

For an isolated playtest with local avatars and fixture data, follow the
[local playtest guide](docs/living-worlds.md#local-playtest). That launcher currently
supports the `main` map only.

## Using docker-compose watch
Docker compose watch automatically will rebuild the gameserver when you make local changes.
In one terminal run:
```bash
docker-compose -f docker-compose-local.yml watch
```
In another, run the following to view logs:
```bash
docker-compose -f docker-compose-local.yml logs -f
```



# Set XP Multiplier
The following endpoint multiplies the experience gained by multiplier for duration.
Post to /setxpmultiplier with the following body:
```json
{
    "multiplier": y,
    "duration": x
}
```
Where Y is an integer, and X is seconds.
The following example will double the experience for 60 seconds after posting to the endpoint:
```bash
curl -X POST -H "Content-Type: application/json" -H "x-api-key: $LOOPWORMS_API_KEY" -d "{\"multiplier\": 2, \"duration\":60}" http://127.0.0.1:8000/setxpmultiplier
```
# Activate/deactivate trigger
The following endpoint activates/deactivates triggers (for example event doors).
Post to /activateTrigger or /deactivateTrigger with the following body:
```json
{
    "triggerId": "triggerId",
    "mapId": "mapId" // mapId is optional = defaults to main!
}
```
The following example will activate the doors with triggerId = Fight Night:
```bash
curl -X POST -H "Content-Type: application/json" -H "x-api-key: $LOOPWORMS_API_KEY" -d "{\"triggerId\": \"Fight Night\"}" http://127.0.0.1:8000/activateTrigger
```

# Announcement
The gameserver accepts announcements per map. Not including `maps` will send to all maps. Not including `timeToShow` seconds will display the announcement until the user clicks exit. 
```
 curl -X POST http://localhost:8000/announce      -H "Content-Type: application/json"      -d '{"message": "Server maintenance will start at 8 PM.", "maps" : ["taikotown"], "timeToShow": 5}' -H "x-api-key: placeholder"
```

# Deployment reboot notices

The `deploy` GitHub Actions workflow updates both existing Docker Compose game
services (`gameserver` and `gameserver2`) on the configured SSH host(s). It chooses
HMR or a reboot independently for each service. A service requiring a reboot
receives an announcement on all its maps through its local `/announce` endpoint,
using its own `LOOPWORMS_API_KEY`, followed by a 60-second warning before recreation.
No additional GitHub secret is needed. The current NA endpoint uses `gameserver2`
on host port 8001. Override the targets with the space-separated repository variable
`GAME_SERVER_LIVE_SERVICES`; see [live updates](docs/live-updates.md) for details.

To explain a deployment, open **Actions → deploy → Run workflow**, select `main`,
and enter `reboot_reason`, for example `Fixing combat lag and improving chat.`
The announcement includes the restart countdown and explains whether clients can
reconnect automatically. `reboot_notice_seconds` lets you change the warning period
from 1 to 600 seconds. Reasons are rendered as plain text.

For automatic deployments on pushes to `main`, set the repository Actions variable
`GAME_SERVER_REBOOT_REASON` to customize the reason. Without a custom reason,
players see `We are deploying a game update.` Manual reasons override the variable;
blank manual reasons use the variable or the default. Push deployments always use
the 60-second warning period.

Announcements run only after the image has built and pushed successfully. Every
selected service must pass discovery and storage checks before any service is
updated. If a container rejects its announcement, that service is not restarted
and the batch stops; previously verified updates remain active. Deployments are
serialized so a later push does not cancel a reboot that players have already
been warned about.
The notice runs after the existing chat-storage checks and image pull, while
the deployment lock is held. The existing checks for persistent chat storage
also run after the restart. The SSH user uses the existing Docker permissions;
no extra sudo permissions are required. Containers must include Node.js with
`fetch` support (the production image uses Node.js 20).

# Add a mob

* Add each scale image to client/img/n
* Create a sprite.json under client/sprites for the mob with the same name as the scale image. Make sure the ID inside the JSON matches
* Add sprite.json (with the correct name) to sprites.js
* Add the new id to game.js array `this.spriteNames`
* Add new mob entity to gametypes.js
* Add a new mob class in mobs.js
* Add the new entity factory in entityfactory.js
* Add the new mob to properties.js
* Add the mob to mobset_oa.png. Reopen tiled and note the id.
* Add the mob to the .tmx file noting the id in tiled. 

# Performance profiling
This is useful to determine bottle necks.
1) Edit the Docker file to have this command (note the --prof):
```Dockerfile
CMD node --prof server/js/main.js
```
2) Run the game server
3) `docker ps` to find its id
4) `docker exec -it <id> /bin/bash` where id from step 3. Then run `ls` in the terminal to find the .log file
5) `docker cp <id>:/opt/app/isolate<find real path from step 4>.log ~/isolate.log` to copy the .log file from the container to your host
6) Process the `.log` file to human readable (make sure node version is modern): 
```bash 
node --prof-process isolate.log > isolate.out
```
7) Read your version of `isolate.out`

The local Mapmaker Toolbox also includes separate [Mob](docs/mapmaker-mobs.md), [NPC](docs/mapmaker-npcs.md) and [Item](docs/mapmaker-items.md) editors, with PNG upload, animation previews, prepared image scales and automatic client/server registration. The NPC page also edits map-specific behaviour and daily schedules loaded from `tools/npcs/<map>.json` when the game starts.

Use the local [Doors & portals editor](docs/mapmaker-doors.md) to inspect map entrances and edit their conditions, opening hours and failure messages, then build the map normally.

Use [Live assets](docs/mapmaker-live-assets.md) to search the Platform catalog and copy asset, NFT and collection identifiers. Configure a server-side API key with `asset_read` access.

Mapmakers can place treasure, configure loot and create combat areas using [Chests & encounters](docs/mapmaker-encounters.md).
