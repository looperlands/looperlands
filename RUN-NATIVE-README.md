# Run LooperLands Natively

This documents the local native workflow that mirrors `docker-compose-local.yml` and the map builder container, without running the game server itself in Docker.

## What Docker Does

`docker-compose-local.yml` starts two services:

- `jsonserver`: `codfish/json-server:0.17.3`, serving `mock/db.js`, `mock/middleware.js`, and `mock/routes.json` on port `3000`.
- `gameserver`: builds `Dockerfile`, runs `bin/build.sh`, then starts `node server/js/main.js` on port `8000`.

`Dockerfile.map` exports maps by running:

```bash
python3 ./export.py server <map-file>
python3 ./export.py client <map-file>
```

from `tools/maps`.

## Prerequisites

- Node.js and npm.
- Python 3 with `lxml`.
- Existing `node_modules`, or run `npm ci` first.

The Docker image uses Node `v20.9.0`. The app has also been run successfully with the locally installed Node version, but Node `20.9.0` is the closest match to Docker.

On this machine, `lxml` is available through Miniconda Python:

```bash
PATH=/Users/andredegroot/miniconda3/bin:$PATH python3 -c 'import lxml; print("lxml ok")'
```

## Start The Mock Backend

From the repo root:

```bash
npx --yes json-server@0.17.3 \
  --watch mock/db.js \
  --middlewares mock/middleware.js \
  --routes mock/routes.json \
  --host 127.0.0.1 \
  --port 3000
```

Smoke test:

```bash
curl 'http://127.0.0.1:3000/api/asset/nft/0x82cc76a59d06847148704f158b2ba51b5854c5ee3b2e9314fc36c093a919530a/owns?wallet=0x1e8ab2cc09be581530bb9f3ac94353f6f7412239'
```

Expected response:

```text
true
```

## Build The Client

The game server serves `client-build`, not `client`, so rebuild after map or client asset changes.

From the repo root:

```bash
cd bin
./build.sh
```

The script may print:

```text
find: -: unknown primary or operator
```

This is an existing warning from `bin/build.sh`; the build can still complete successfully.

## Start The Game Server

From the repo root:

```bash
NODE_ENV=development \
LOOPWORMS_API_KEY=placeholder \
LOOPWORMS_LOOPERLANDS_BASE_URL=http://127.0.0.1:3000 \
LOOPERLANDS_BACKEND_BASE_URL=http://127.0.0.1:3000 \
LOOPERLANDS_BACKEND_API_KEY=placeholder \
APP_URL=http://127.0.0.1:8000 \
LOOPERLANDS_PLATFORM_BASE_URL=https://platform.looperlands.io \
LOOPERLANDS_PLATFORM_API_KEY=WeIJ2QCDSKZr9Q \
GAMESERVER_NAME=local \
node server/js/main.js
```

Smoke test:

```bash
curl -I http://127.0.0.1:8000/
```

Expected response includes:

```text
HTTP/1.1 200 OK
```

If the sandbox blocks binding to `0.0.0.0:8000` with `EPERM`, run the same command outside the sandbox or from a normal terminal.

## Create A Local Session

Create a session:

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: placeholder' \
  -d '{"walletId":"0x1e8ab2cc09be581530bb9f3ac94353f6f7412239","nftId":"0x82cc76a59d06847148704f158b2ba51b5854c5ee3b2e9314fc36c093a919530a","title":"Title","xp":10000,"mapId":"duckville","checkpointId":"1","f2p":false,"trait":"rogue"}' \
  http://127.0.0.1:8000/session
```

Then open:

```text
http://127.0.0.1:8000/?sessionId=<returned-session-id>
```

## Export Map Changes Natively

Map source files live in:

```text
tools/maps/tmx/
```

For Duckville, edit:

```text
tools/maps/tmx/duckville.tmx
```

Then export both server and client map artifacts:

```bash
cd tools/maps
PATH=/Users/andredegroot/miniconda3/bin:$PATH python3 ./export.py server duckville.tmx
PATH=/Users/andredegroot/miniconda3/bin:$PATH python3 ./export.py client duckville.tmx
```

For another map, replace `duckville.tmx` with the TMX filename in `tools/maps/tmx/`.

The exporter writes:

```text
server/maps/world_server_<map>.json
client/maps/world_client_<map>.json
client/maps/world_client_<map>.js
```

Then rebuild the served client:

```bash
cd ../../bin
./build.sh
```

Finally, restart `node server/js/main.js`. Server map data is loaded into memory at startup, so server-side map changes do not take effect until restart. Browser/client map changes require the rebuilt `client-build` files and a hard refresh or a new session.

## Full Map Update Loop

From the repo root, for Duckville:

```bash
cd tools/maps
PATH=/Users/andredegroot/miniconda3/bin:$PATH python3 ./export.py server duckville.tmx
PATH=/Users/andredegroot/miniconda3/bin:$PATH python3 ./export.py client duckville.tmx
cd ../../bin
./build.sh
```

Then restart the game server and create/open a new session.

## Useful URLs

- Game: `http://127.0.0.1:8000/`
- Mock backend: `http://127.0.0.1:3000/`
- Duckville client map: `http://127.0.0.1:8000/maps/world_client_duckville.json`

