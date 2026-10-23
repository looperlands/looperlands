# Run LooperLands Natively

This runs the same ownership-permissive local mode as `docker-compose-local.yml`,
without Docker or a Platform account.

## Prerequisites

- Node.js matching `.nvmrc` and npm.
- Python 3 with `lxml` for exporting map changes.
- Run `npm ci` from the repository root.

## Build The Client

The game server serves `client-build`, so rebuild after client or map changes:

```bash
node bin/build-client.js
```

## Start The Mapmaker Toolbox

From the repository root:

```bash
NODE_ENV=development \
LOOPERLANDS_LOCAL_PLAYTEST=1 \
LOOPWORMS_API_KEY=placeholder \
APP_URL=http://127.0.0.1:8000 \
LOOPERLANDS_BIND_ADDRESS=127.0.0.1 \
GAMESERVER_NAME=local \
node bin/local-mapmaker.js
```

Open [the Mapmaker Toolbox](http://127.0.0.1:8010/local/). In **Playtest**, choose
a map, avatar, checkpoint, avatar level and weapon level, then click **Start game**.
The toolbox runs on port 8010 and supervises the game server on port 8000. Keep
both ports available. **Build tools** exports maps and rebuilds the client while
the toolbox stays open. **Troubleshoot** runs environment checks and can check
for main branch updates, suggesting fetch/merge commands without changing files.
**Documentation** is reserved for future guides.

The explicit local flag works only with `NODE_ENV=development`. NFT and collection
ownership checks pass for any wallet. Avatar artwork must exist in the client;
quest, item and level requirements still apply. The session endpoint still
requires the matching `LOOPWORMS_API_KEY`.

All player data and progress use the local provider. Platform credentials and the
legacy mock server are not needed. ENS lookups are skipped. Data is saved under
`data/local-playtest/`; set `LOOPERLANDS_LOCAL_DATA_DIR` to use another directory.
Map flows, shop stock, events and companions from the live Platform are not loaded.

## Create A Local Session

The command-line session launcher remains available. In another terminal, from
the repository root (requires `jq` and `curl`):

```bash
./local-session.sh \
  0x1e8ab2cc09be581530bb9f3ac94353f6f7412239 \
  0xb69e3e44f58d5399faad29b94108a88dbed79e6a14c676fb202e817ac5697560 \
  m88n2 1 1000000
```

The five arguments are wallet, avatar NFT, map, checkpoint and starting XP.
Open the new URL printed by the launcher. If the server uses a custom
`LOOPWORMS_API_KEY`, set the same value when running `local-session.sh`.

Local progress survives server restarts. If an old session URL is rejected after
a restart, create a fresh session in the toolbox or run the session launcher
again. Stop the toolbox and its game server with Ctrl+C.

## Export Map Changes

Edit the TMX file in `tools/maps/tmx/`, then use **Build tools → Build map and
restart game** in the toolbox. It exports both maps, rebuilds the client and
starts the game again. The following terminal workflow also remains available;
stop the toolbox first. From the repository root, for `m88n2`:

```bash
cd tools/maps
python3 ./export.py server m88n2.tmx
python3 ./export.py client m88n2.tmx
cd ../..
node bin/build-client.js
```

This updates the exported server and client maps. Restart the toolbox to
reload server-side map data, then create a fresh session. Replace `m88n2` with
the map being edited.
