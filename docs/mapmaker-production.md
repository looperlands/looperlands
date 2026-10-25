# Saved Mapmaker content in production

The Toolbox edits repository content. Local playtests and production load the same quests, dialogue trees, event rules, farming definitions, tile sequences, scenes, atmosphere, NPC routines and entity assets. Save, build changed TMX maps, playtest, commit all required sources/assets/exports, and merge to `main` to run the deployment workflow.

Production image builds run `node bin/build-mapmaker-content.js` before building the client. This validates authored content, then applies scene, atmosphere and action-placement overlays to the image's client JSON, worker JavaScript and server map artifacts. It leaves the checkout's Tiled baseline exports intact during local editing. Invalid saved definitions fail the production image build. Existing Platform flows are retained, and saved rules are appended under distinct block IDs.

Saved definitions also enter the server release manifest. Changes, additions and removals select a reboot when they cannot be applied through the existing method-only hot reload. Local sessions, inventory seeds, saved setups, ownership bypasses and `data/local-playtest` remain local.

## Tile sequence rollout

Deploy the matching `looperlands-platform` atomic transaction extension before this game update. It extends the existing farming API with a `sequence` action and a separate `tile-sequence:<map>:<definition signature>` state namespace. It needs the existing farming tables and read, inventory-write and XP-write scopes, with no new database migration.

The game server owns stage definitions, requirements and reward rolls. The Platform commits the stage revision, costs, rewards and XP together. Lost responses retry the same payload and return its durable receipt. A changed definition uses a separate state namespace. The production provider never falls back to local player data.

## Repeatable validation

Run the targeted game tests, and run `tests/Farming/PostgresRegression.php` plus `tests/Farming/HttpRegression.php` in the Platform repository against a disposable local PostgreSQL database. These cover concurrency, stale requests, waits, inventory rollback and authenticated transaction handling.

For the production game-to-Platform boundary, start the Platform's loopback fixture:

```sh
FARM_TEST_DATABASE_URL=postgresql://postgres:mapmaker-local-only@127.0.0.1:55492/mapmaker_test php -S 127.0.0.1:3315 tests/Farming/PreviewRouter.php
```

Then run from the game repository:

```sh
NODE_ENV=production LOOPERLANDS_LOCAL_PLAYTEST=0 MAPMAKER_TEST_PLATFORM_URL=http://127.0.0.1:3315 node bin/mapmaker-production-smoke.js
```

The smoke test uses the real production provider, tile controller and Platform transaction service with an isolated database and fixture inventory adapter. It simulates a lost response after commit, verifies one reward/XP payout, rejects a stale attempt and reads the stage back through a new provider. It excludes unrelated Discord transport and uses no production credentials. Finish release verification with a production image build and an actual deployed readback.
