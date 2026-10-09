# Durable farming transactions

The game and platform implementations must ship together. Deploy the platform API and database migration before deploying the game server and client.

## Runtime contract

`GET /api/game/farming/state/{mapId}/{x}/{y}` returns `{revision, plot}`. Reading claims the coordinate for the atomic API. A harvested coordinate retains its revision and rejects legacy PUT/DELETE writes.

`POST /api/game/farming/transaction` accepts this server-to-server body:

```json
{
  "requestId": "<64 lowercase hexadecimal characters>",
  "nftId": "<avatar asset>", "mapId": "duckville", "x": 73, "y": 50,
  "expectedRevision": 1, "action": "plant", "item": "M88NLETTUCE",
  "plot": {"mapId":"duckville","x":73,"y":50,"ownerNftId":"<avatar asset>","state":"planted","crop":"M88NLETTUCE","stage":0,"tileGroup":"lettuce","createdAt":1791570000000},
  "items": [{"item":"78003900","amount":-1}],
  "requiredItems": [], "xp": 0, "harvestAccess": "owner"
}
```

Actions are `prepare`, `plant`, `water`, `boost`, `harvest`. The authenticated game server owns configured recipes, reward rolls, ownership windows and level rules; this is not a public player endpoint. Tools are checked inside the transaction via `requiredItems`. Harvest sets `plot` to null. `harvestAccess: shared` is supplied only when the configured ownership window has elapsed.

Success returns `{requestId, revision, plot, xp, quantities, replayed}`. Quantities cover changed inventory kinds. The original receipt is returned on retry before checking the current plot, so an already committed harvest still replays after replanting. The game derives the request ID from avatar, map, coordinates, expected revision, action and selected item. Recomputed timestamps and random rolls do not change the identity; reusing an ID with a different intent fails.

Conflicts return HTTP 409 with `code` (for example `plot_changed`, `insufficient_items`, `missing_tool`, `request_id_conflict`). Invalid bodies return 400. The game retries ambiguous transport/server failures twice with the exact same body; definite 4xx failures are not retried. Missing endpoints do not silently revert to separate item and plot writes.

## Rollout

1. Apply platform migration `Version20261009120000` on PostgreSQL and deploy the platform `main` branch. Do not prune receipts or coordinate revision rows: they are the durable retry and generation history.
2. Ensure the game credential has `GAME_DATA_READ`, `GAME_DATA_WRITE_INVENTORY` and `GAME_DATA_WRITE_XP` scopes.
3. Deploy the game server, shared protocol, built client and tool images together. Atomic farming is enabled by default. Verify a prepare/plant/water/harvest cycle and concurrent inventory changes in staging.

The generic platform inventory endpoint now uses the same arithmetic delta writer. Farming, ordinary inventory updates, gifts and crate writers lock game data before inventory rows. Deltas for one avatar commit together; an insufficient debit rolls that avatar's batch back. Badge checks remain best effort after the core commit. Free-to-play assets retain the platform rule against persisted XP, while their plot and item action can still commit. Other legacy inventory writers, if added, must use the same asset locking and arithmetic updates.

`LOOPERLANDS_ATOMIC_FARMING=0` is an explicit legacy mode, with single-worker in-memory recovery only. It cannot write coordinates already claimed by the atomic API. Rolling back the database migration drops the retry history; use a coordinated rollout, not a live downgrade of claimed plots.

## Validation and local multiplayer preview

The game regression suite covers transaction retry, stale revision rejection, server restart state, queue ordering, XP reconciliation, callbacks, animation cancellation and particles. The platform `tests/Farming/PostgresRegression.php` exercises the real transaction service and delta store against PostgreSQL, including subprocess races, rollback, tombstones, missing tools, receipt replay after restart, legacy-write rejection and a farming-versus-gift last-seed race. Its inventory adapter is a fixture; Symfony authentication, the ORM asset/event adapter and production deployment still need staging validation.

For the isolated local preview, start a disposable loopback PostgreSQL database, then run in the platform repository:

```sh
FARM_TEST_DATABASE_URL=postgresql://postgres:farming-local-only@127.0.0.1:55491/farming_test php tests/Farming/PostgresRegression.php
FARM_TEST_DATABASE_URL=postgresql://postgres:farming-local-only@127.0.0.1:55491/farming_test php -S 127.0.0.1:3314 tests/Farming/PreviewRouter.php
```

Then in the game repository:

```sh
node bin/build-client.js
node bin/local-farming-preview.js
```

Open `http://127.0.0.1:3014/preview/player/1` and `/preview/player/2` in separate tabs. The fixture uses fake avatars and wallets, a separate persistent `farm_preview` schema, 12-second crop growth and loopback API routes. It retains the real game map and multiplayer server. It does not use production credentials. Press E next to a plot, Z for inventory. `POST http://127.0.0.1:3314/__fixture/drop-next-response` simulates a lost response after a successful commit. The preview is a development script, not part of production startup.

Observed locally: two players, the low-level prepare restriction, planter-only harvest restriction, shared plot updates, remote shovel animation, planting through a committed-but-failed response, plot survival after restarting the game server, and completed watering/harvest with one payout. Moving during an approved watering action left the plot planted at the same revision, with no committed water transition. Automated tests also cover cancellation.
