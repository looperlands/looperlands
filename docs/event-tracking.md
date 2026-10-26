# Event tracking and game catalog

For event organizers and players, use the [Event Toolkit guide](event-toolkit-guide.md) or its [shareable PDF](event-toolkit-guide.pdf).

Tracking defaults to enabled. Deploy the platform event toolkit migration and add `game_data_write_activity` to the existing game API token before deploying the game server. Set `ACTIVITY_TRACKING_ENABLED=false` to explicitly disable tracking in an environment that is not ready. An absent flag enables tracking; `ACTIVITY_TRACKING_ENABLED=true` is optional.

```env
ACTIVITY_TRACKING_ENABLED=true
ACTIVITY_SPOOL_PATH=/durable/game-server-na1/activity.jsonl
ACTIVITY_IDLE_SECONDS=300
```

Use a unique durable spool per Node process. The inactivity window defaults to five minutes and accepts 30–3600 seconds. Changed position and successful tile actions, kills, loot and PvP kills renew it. Idle connected time is stored separately and earns no active score. This estimates active play; automated movement is not distinguished from human movement. No time before enablement is inferred.

Activities are recorded only from server gameplay hooks. Successful tile controllers return `activity: {action, stage, target, quantity, x, y}` with their result. The shared tile route checks an entered player, current map/session, and adjacent tile, then records successful results. Other controllers can adopt the same metadata contract. Duckville implements prepare/plant/water/boost/harvest; failed actions produce no activity.

Every activity has a UUID. Spool appends and atomic replacements share a serialized async queue, so disk I/O does not block combat or movement. A durable append precedes upload, 30-second flushes send batches of at most 500, and retries keep their UUID. Partial/uncertain acknowledgments retain the whole batch. Restart reloads queued records. Samples split UTC midnight and clamp a stalled process to its last 30 seconds. SIGTERM/SIGINT drain queued appends and persist the final partial interval before the process exits. An unwritable or corrupt spool logs an error and disables tracking without stopping gameplay; preserve and inspect the file before recovery. SIGKILL or a process crash can lose appends still waiting in memory and cannot save a partial interval.

Public `GET /activity-catalog` works even with tracking disabled. It derives mobs/items from the actual `Types` runtime registry, including content registered dynamically, and crops/tile actions from `TileActionsController.stageDefinitions`. Mob/item values are the same stringified kind IDs recorded by gameplay; crops use the actual definition keys. The platform merges online server catalogs through `GET /api/events/activity-catalog`, and frontend selectors use those values. A new enemy/item/crop requires no separate platform/frontend content list. Different game server versions can temporarily supply different options until all are deployed.

The canonical event configuration, API routes and full rollout order are documented in `looperlands-platform/docs/event-toolkit.md`. Rules include map/target/action/stage filters, weights, daily caps, milestones, active days/time, recurrence, sign-ups and configurable teams. Finalization may be manual or performed by the scheduled event service. Configured in-game item awards support automatic delivery; tree houses, NFTs and other external prizes use manual delivery records. Generic reward records do not send prizes. The organizer guide explains rental loadouts, level overrides and scheduled announcements.

Focused validation:

```sh
npx jest server/js/activitytracker.test.js server/js/activitycatalog.test.js server/js/fishingresult.test.js server/js/tileactionscontroller.test.js --runInBand --coverage=false
```

The tests verify idle/resume boundaries, midnight, overlapping avatar sessions, retry/restart safety, partial receipts, live catalog IDs and Duckville tile mechanics.

## Fishing competitions

A `fishing` activity is recorded after the existing fishing result flow successfully awards inventory. The server-selected pending fish is consumed before awaiting the award so duplicate result messages cannot score twice. Failed attempts, failed awards and ordinary loot/purchases do not emit this activity. Metadata contains fish key `target`, actual `quantity` (including double-catch traits), `lake` and definition-derived `rarity`.

The game catalog includes fish keys/display names and lakes from `Lakes`, not a second fish list. Fishing rules can use `count` (successful catches) or `quantity` (fish awarded) with optional lake and species filters. Maps, dates, caps, sign-ups and teams use the shared event system. Fishing success/bullseye still use the existing client minigame result protocol; this change does not add server-side proof of minigame timing.

The two repository Docker Compose services now mount separate named volumes at `/var/lib/looperlands/activity`, with the spool path set explicitly. Do not remove these volumes when restarting. Custom launchers must supply equivalent unique durable mounts before tracking is enabled.

The town event board also lists approved community events without a competition configuration. It uses the platform's existing next-occurrence calculation, shows event descriptions and locations, and omits scoring and game sign-up controls for these entries. These entries have `isCompetition: false` and do not appear in the contextual scoring panel. Events with expired or invalid date windows remain hidden; they require an organizer date correction.

Scoring rule `target`, `action` and `stage` filters accept an existing string or a list of up to 100 distinct strings. A matching value within each list qualifies (OR); target, action and stage filters must all match (AND). A rule awards its points once for each qualifying activity. Use `*` alone for an unrestricted filter. Ordinary activity records still contain one string value per field. Deploy the updated game renderer and platform validator/calculator before the organizer multi-select UI.

## Event maps and live tracker coverage

The organizer's **Event maps · scoring and live tracker** selector accepts multiple maps. Clear the selection for all maps, including maps added later. The meeting map only identifies where players gather; it does not restrict scoring or tracker coverage. Started rounds keep their original configuration.

The platform projection uses the round's `maps` for both `maps` and `scoringMaps`, with `allMaps: true` for unrestricted competitions. The game server and client accept that explicit flag while retaining support for existing map lists. Deploy the game client and server before the companion platform and organizer UI updates. Community events still appear only on the town board. No database migration is needed.

## Leaderboard names

The game event board and live event panel display the stored ENS name first, with the title as a smaller subtitle. Your own entry keeps its “You” marker. The platform projection supplies nullable `ens` and `title` fields alongside the existing `label`; older responses still render using `label`. Wallet scoring uses the wallet profile. Looper scoring uses the wallet from that Looper’s latest activity within the round, with the asset name as its subtitle. This requires the companion platform update in `EventBoardService` and `EventBoardView`.

## Always-on daily play points

Daily play is independent of event rounds, sign-ups, maps and Looper ownership. Each wallet earns one point per qualifying UTC calendar day. A server-recorded gameplay action or positive active playtime qualifies; connecting or remaining idle does not. All Loopers on the same wallet share the day and streak. There is no manual claim button.

Streak day 3 awards three extra points. Day 7 and every subsequent consecutive multiple of seven award seven extra points. Missing a full UTC day resets the current streak, while earned points and bonuses remain. The next day starts at 00:00 UTC. Queued activity can fill missing days and award newly completed bonuses; already awarded bonuses are never revoked. Points are a progression counter; this change adds no spending or prize delivery.

The platform's `game_daily_play` ledger persists calendar days and earned bonuses independently of detailed activity retention. Ingestion writes activity and daily progress in one transaction, deduplicates activity UUIDs and wallet/day pairs, and serializes concurrent updates for each wallet. Existing historical activity is not backfilled. Apply platform migration `Version20261026120000` before deploying the updated ingestion and board controller.

Both board and live-board responses optionally include `dailyPlay`: `points`, `activeDays`, `streak`, `checkedInToday`, `todayPoints`, `nextBonusDay`, `nextBonusPoints`, and ISO timestamp `resetsAt`. The game server passes this wallet-scoped object through its existing session-authenticated event endpoints. Older platform responses simply omit daily progress. The game panel shows daily progress even with no live events; successful refreshes confirm today's credit after the existing activity spool uploads (normally within about 30–45 seconds). Failed refreshes clear stale live progress. At UTC midnight the client discards yesterday's confirmation and refreshes.

Local Mapmaker playtests persist the same progression in their isolated `state.json`, without writing to platform player data.
