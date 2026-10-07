# Event tracking and game catalog

Tracking defaults to disabled. Deploy the platform event toolkit migration and add `game_data_write_activity` to the existing game API token before enabling it.

```env
ACTIVITY_TRACKING_ENABLED=true
ACTIVITY_SPOOL_PATH=/durable/game-server-na1/activity.jsonl
ACTIVITY_IDLE_SECONDS=300
```

Use a unique durable spool per Node process. The inactivity window defaults to five minutes and accepts 30–3600 seconds. Changed position and successful tile actions, kills, loot and PvP kills renew it. Idle connected time is stored separately and earns no active score. This estimates active play; automated movement is not distinguished from human movement. No time before enablement is inferred.

Activities are recorded only from server gameplay hooks. Successful tile controllers return `activity: {action, stage, target, quantity, x, y}` with their result. The shared tile route checks an entered player, current map/session, and adjacent tile, then records successful results. Other controllers can adopt the same metadata contract. Duckville implements prepare/plant/water/boost/harvest; failed actions produce no activity.

Every activity has a UUID. A durable append precedes upload, 30-second flushes send batches of at most 500, and retries keep their UUID. Partial/uncertain acknowledgments retain the whole batch. Restart reloads queued records. Samples split UTC midnight and clamp a stalled process to its last 30 seconds. SIGTERM/SIGINT persist the final partial interval before the process exits. An unwritable or corrupt spool logs an error and disables tracking without stopping gameplay; preserve and inspect the file before recovery. SIGKILL cannot save a partial interval.

Public `GET /activity-catalog` works even with tracking disabled. It derives mobs/items from the actual `Types` runtime registry, including content registered dynamically, and crops/tile actions from `TileActionsController.stageDefinitions`. Mob/item values are the same stringified kind IDs recorded by gameplay; crops use the actual definition keys. The platform merges online server catalogs through `GET /api/events/activity-catalog`, and frontend selectors use those values. A new enemy/item/crop requires no separate platform/frontend content list. Different game server versions can temporarily supply different options until all are deployed.

The canonical event configuration, API routes and full rollout order are documented in `looperlands-platform/docs/event-toolkit.md`. Rules include map/target/action/stage filters, weights, daily caps, milestones, active days/time, recurrence, sign-ups and configurable teams. Finalization and reward records are organizer actions; they do not transfer prizes.

Focused validation:

```sh
npx jest server/js/activitytracker.test.js server/js/activitycatalog.test.js server/js/tileactionscontroller.test.js --runInBand --coverage=false
```

The tests verify idle/resume boundaries, midnight, overlapping avatar sessions, retry/restart safety, partial receipts, live catalog IDs and Duckville tile mechanics.
