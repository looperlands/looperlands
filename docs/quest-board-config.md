# Configure a map Quest Board

All authored Quest Board settings live in `server/js/quests/<mapId>.json`. No map export edit, database content editor, or farming-specific configuration is required to place a board, publish work, or set a recipient. `QUEST_BOARD_CONFIG_DIR` changes that directory for isolated local sessions. Player progress, frozen offers, inventory, funding and receipts live in the platform; they never write back to this JSON.

See [Quest system additions](quest-system-additions.md) for the engine changes and their relationship to existing stories. [The complete town example](examples/main.json) shows the implemented schema; [the feature design](quest-board-design.md) records the broader design. The town request accepts hide and ore from any source: existing stock, loot, gifts, purchases, trading, or a registered production action all count equally. Personal activity is a separate objective.

## File format and migration

The version 1 envelope has these sections:

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Required; `1`. Unknown root and new-feature fields fail validation. |
| `mapId` | Must match the filename without `.json`. |
| `defaults` | Default policy for new board assignments; quest `policy` overrides it. |
| `boards` | Physical bounds, presentation, enablement and advertised quest IDs. |
| `handInLocations` | Fixed same-map objects or a reference to a configured board. |
| `schedules` | Permanent, calendar recurrence, explicit windows, weighted rotation or refill streams. |
| `quests` | Legacy story definitions and new scheduled assignments. |

When the JSON exists it replaces the map's legacy `server/js/quests/<mapId>.js` quest list. Copy the existing definitions into `quests` without changing IDs to preserve saved progress. A definition **without `scheduleId`** remains a legacy story quest and keeps its original engine behavior. A new board assignment must have `scheduleId`; it is stored separately from lifetime story flags. Maps without JSON use the original JavaScript module. Additional registered story modules (for example the Lantern Picnic scene) remain registered separately, and their IDs may be advertised. All story and board quest IDs must remain globally unique.

New JSON is validated before server startup/publication. Invalid startup configuration fails visibly; it never overwrites previously published platform snapshots. Apply changes by restarting the game server after validation. There is no hot-reload editor in this release. Publishing requires an authorized game server; creator JSON cannot bypass platform reward ceilings or ownership checks.

Run validation using the same catalog as the game:

```sh
node bin/validate-map-quests.js docs/examples/main.json --resolved --now=2026-10-11T12:00:00Z
```

This prints the resolved defaults, configuration version, and bounded preview with concrete UTC instants. The output uses the configured preview horizon (up to 31 days). Effort estimates require live playtesting; the tool does not pretend to calculate contention or random-drop availability.

## Boards and recipients

A board requires `id`, `label`, `bounds: {x,y,width,height}` and `questIds`. Coordinates use the same integer tile grid as the game. Optional settings are:

- `enabled` (default `true`), `description`, `showSchedule` (default `true`).
- `placements`: additional bounds for the same logical board, sharing offers and completion limits.
- `labels`: replacements for `adventures`, `challenges`, and `requests` category labels.
- `categories`: a subset of those categories used for the board filters.
- `allowStoryAcceptance` (default `false`): allow existing advertised stories to be started at this board, retaining original level/prerequisite checks. Otherwise the board points to their quest giver.

Object recipients use `{id,kind:"object",label,bounds}`. Board recipients use `{id,kind:"board",label,boardId}` without a second bounds definition. Both must be on the owning map. Specific NPC receivers, opening-hour access schedules, Tiled-object resolution and cross-map recipients are not enabled yet; their fields are rejected. Choose an accessible fixed crate. Validate positions in the actual map before enabling a board: schema validation cannot prove that a wall or later scenery change leaves a tile reachable.

The server requires the player to occupy or be cardinally adjacent to the exact referenced bounds. Another board or nearby crate cannot satisfy that check. Multiple placements allow acceptance from each board placement; a board recipient uses the primary bounds. Location and session are rechecked after asynchronous reads and again inside the inventory writer before settlement.

Published occurrences pin recipient geometry. Editing or disabling a board stops new acceptances but does not revoke accepted work. Discovery includes old recipients still needed by active contracts. Keep those old tiles physically reachable until the contracts finish; changing JSON does not remove collision geometry from a map export.

## Schedules

Each quest names one `scheduleId`. Boards do not own a duplicate schedule.

- Permanent: `{id:"always",repeat:{frequency:"permanent"}}`.
- Daily/weekly: `repeat: {frequency:"daily"|"weekly",interval:1,anchorDate:"1970-01-01",dayOfWeek:1}`. `dayOfWeek` is weekly only, Sunday `0` through Saturday `6` (default Monday). For multi-day/week intervals, set a deliberate anchor date.
- Fixed windows: `dates:[{opensAt,acceptUntil,endsAt}]`, using ISO timestamps with timezone or epoch milliseconds. These cannot also define recurrence or elapsed windows.

Recurring settings include `timezone` (IANA name, default `UTC`), `opensAtLocalTime` (`HH:MM`, default midnight), `acceptanceWindowHours` and either `completionWindowHours` or `completeAt:"nextOpening"`. Hours are elapsed hours, from 1 to 744; acceptance cannot extend beyond completion. With `nextOpening`, acceptance is clamped to the actual next boundary, including a 23-hour DST day. A skipped local opening advances to the first valid local minute; a repeated clock uses the earlier instant.

`previewHours` defaults to 72, from 0 through 744. Published previews are promises: the platform freezes objectives, rewards, destination and policy on first publication. Ordinary edits affect unpublished occurrences. Occurrence identity uses map, quest ID and opening instant, so editing a reward/version cannot grant another completion of the same opening. Never change a published quest ID to reroll its allowance.

Optional schedule `rotation` selects from a curated pool:

```json
{"pool":[{"id":"road-patrol","weight":2},{"id":"workshop-help","weight":1}],"count":1,"avoidLast":1,"fallback":"allow-repeats"}
```

An optional `seed` changes the deterministic future selection. Pool quests must name that schedule. Selection is deterministic across replicas/restarts, weighted without replacement for a window, and identical for players. `avoidLast` (0–30) excludes selected quests from previous windows when possible. `fallback` is `allow-repeats` (fill the selection from excluded quests if necessary) or `fewer` (publish fewer choices). Quest templates on the same schedule outside a configured pool are not selected. The platform retains already-published selections.

## Generated quests and refill slots

Categories describe presentation, not separate engines. **Adventures** are narrative or exploration tasks, **challenges** track personal actions, and **requests** ask for items. A scheduled quest can use any supported objectives in any category. Existing lifetime story quests stay separate and are never regenerated or counted as refill slots. `boards[].labels` can rename the categories.

Use schedule `refill` to keep a fixed number of unfinished assignments per category:

```json
{
  "refill": {
    "counts": {"adventures": 1, "challenges": 2, "requests": 2},
    "pool": [
      {"id": "coast-patrol", "weight": 1},
      {"id": "rat-patrol", "weight": 3},
      {"id": "town-supplies", "weight": 2},
      {"id": "ore-supplies", "weight": 1}
    ],
    "limitPerCategory": 10,
    "avoidLast": 1,
    "fallback": "allow-repeats",
    "seed": "town-work-v1"
  }
}
```

`refill` and `rotation` are alternatives. Every pool entry must name this schedule. Each category with slots needs at least one enabled template. A board using a refill schedule must advertise its full pool; multiple boards can share that pool and its progress. Templates outside the pool are not offered by that schedule.

| Rule | Behavior |
| --- | --- |
| `counts` | `adventures`, `challenges`, `requests`: 0–10 each; omitted categories are 0. At least one must be positive. |
| `pool` | 1–100 unique template IDs, with integer `weight` 1–1000 (default 1). Larger weights are more likely. |
| `limitPerCategory` | Total offers per enabled category per scheduled window, including initial slots, default 10; at most 50 and at least the largest slot count. This is a finite work budget. |
| `avoidLast` | Avoid the preceding 0–30 **template selections within that category's current window**, default 1. Amounts/targets can still repeat by chance. |
| `fallback` | `allow-repeats` fills the sequence when avoidance exhausts the pool; `fewer` stops the sequence early. |
| `seed` | Optional ID, default `default`; controls future template choices. |

Everyone receives the same generated sequence for a map, schedule, category and opening. Each wallet (or Looper with `completionScope:"looper"`) advances independently. Completing one offer reveals the next offer for that player; another player's completion cannot remove or replace your work. Acceptance moves a quest to **My quests** and continues occupying its slot. A ready but unclaimed reward, withdrawal or reacceptance does not reveal extra work. Only committed completion advances. When the category's work budget is exhausted, wait for the next scheduled window. Permanent schedules have one finite stream with no automatic reset.

The preview shows each future window's starting slots. A new window starts its own sequence while earlier accepted contracts retain their original deadlines. `maxActiveRecurring` and platform reward/funding limits still apply separately. For example, five offered slots do not raise the default limit of three active recurring quests.

Publication freezes the complete bounded sequence, including replacements. Stable slot identities do not include template choice, seed or quantities; edits and restarts cannot create a second allowance for a published slot. Removing or disabling a template stops new acceptance of its frozen offers; existing attempts remain claimable. At most 500 offers may be live/published per map; validation reserves room for overlapping windows and DST. Reduce `previewHours`, `limitPerCategory` or overlap if validation rejects the catalog size.

### Vary the task within a template

A quest's optional `generation` resolves to ordinary concrete objectives and rewards before publication. Without it, the authored quest stays fixed. All referenced targets/items still must exist in the game's catalog; generated hand-ins accept goods from any acquisition source.

```json
{
  "generation": {
    "seed": "patrol-v1",
    "objectives": [{
      "id": "hunt",
      "amount": {"min": 3, "max": 9, "step": 2},
      "targets": [
        {"target": "RAT", "label": "rats", "weight": 3},
        {"target": "BAT", "label": "bats", "weight": 1}
      ]
    }],
    "rewards": {
      "xp": {"base": 20, "perUnit": [{"objectiveId": "hunt", "xp": 10}], "max": 100}
    }
  }
}
```

The template must already define objective `hunt`, its event type and a valid default target/amount. `generation.objectives` names existing unique objective IDs. Activity rules support an `amount` range and/or a weighted `targets` pool. Every candidate is validated against the objective's event type, registered action/stage, quantity rules and named scenes. For instance, a quarry output pool cannot invent an unregistered target. The base action/stage, spatial restrictions and recipient stay fixed.

A range is `{min,max,step}` with positive integers; `step` defaults to 1 and `max` must be reachable. A positive integer is a fixed range. Amounts are at most 1,000,000. Target pools have 1–100 distinct entries, optional human-readable `label`, and `weight` 1–1000. Lore fields `name`, `description` and objective `label` can use `{hunt.amount}`, `{hunt.target}` (the selected display label) and `{reward.xp}`. Unknown placeholders or generated text beyond normal field limits fail validation. Text stays plain text.

For a `DELIVER_ITEMS` objective, use an item basket rule instead of activity amount/targets:

```json
{
  "id": "supplies",
  "items": {
    "count": {"min": 1, "max": 2},
    "pool": [
      {"item": "BOARHIDE", "weight": 3, "amount": {"min": 2, "max": 5}},
      {"item": "ORE", "weight": 2, "amount": {"min": 2, "max": 6}}
    ]
  }
}
```

`count` draws how many distinct item types to request, at most 20 and no more than the pool size. Selection is weighted without replacement. Each selected item's amount is drawn independently. Item IDs resolve to canonical inventory IDs and duplicates fail validation, even when written using different aliases.

`generation.rewards.xp` calculates `min(max, base + sum(perUnit rates))`. `base`, `max` and each rate's `xp` are integers 0–1000; default base is 0 and cap is 1000. Each rate has `objectiveId` and `xp`, with optional `item` for a hand-in or `target` for an activity. Without a selector, it counts all requested units of that objective. For a hand-in, this means the sum of item quantities, not the basket's completion count of 1. A general rate and a specific rate add together; duplicate selectors are rejected. This supports per-item/per-target reward costs without executable formulas in JSON:

```json
{"xp":{"base":20,"perUnit":[{"objectiveId":"supplies","item":"BOARHIDE","xp":15},{"objectiveId":"supplies","item":"ORE","xp":10}],"max":180}}
```

`generation.rewards.items` can vary amounts of funded items already in the base reward, using `{item,amount:{min,max,step}}`. It retains that item's existing `fundingRef`; it cannot invent unfunded rewards. These rules also work with ordinary fixed, daily, weekly and rotating assignments without refill. The validation tool prints generated objective baskets, names and rewards, plus refill slot metadata, so an author can inspect several windows before publishing.

## Objectives and requirements

A new assignment needs `id`, `name`, `category` (`adventures`, `challenges`, `requests`), `scheduleId`, `objectives` and optional `rewards`. Optional settings: `description`, `enabled`, `secret`, `requiredLevel`, `requiredQuest`, `estimatedMinutes`, `ordered`, `policy`, and `generation`. Required level uses the active Looper's effective game level. `requiredQuest` currently refers to an existing **story** quest; recurring prerequisite chains are rejected. Secret locked offers are omitted from discovery. Earned attempts remain visible to their owner.

Each objective has a unique `id`, optional `label`, and one `eventType`. Counts are positive integers. For action events `measurement` defaults to `count`; `quantity` uses the authoritative quantity in the event. Accepted work progresses whether pinned or not. Events before acceptance and during withdrawal do not count.

| Event | Authored fields | What counts |
| --- | --- | --- |
| `DELIVER_ITEMS` | `recipientId`, `items:[{item,amount}]` | A complete spendable inventory basket; no acquisition-source restriction. It must be the final objective. |
| `KILL_MOB` | `target`, `amount`, optional `area`/`tiles` | The player's server-confirmed kills, at the defeated mob's coordinates. |
| `LOOT_ITEM` | `target`, `amount`, optional `measurement`, `area`/`tiles` | Positive events from the existing loot/collection broker after acceptance. |
| `NPC_TALKED` | NPC kind `target`, `amount`, optional `area`/`tiles` | A server-validated NPC interaction. Use an area to distinguish same-kind NPCs. |
| `AREA_ENTERED` | Scene name `target` (ID only for unnamed scenes), `amount`, optional `area`/`tiles` | Entering an existing named map scene. Names are case-sensitive, e.g. `Beach`. |
| `FISHING` | Registered fish name `target`, `amount`, optional `measurement`, `area`/`tiles` | A successful server-selected fishing catch; receiving a fish as a gift does not count. |
| `TILE_ACTION` | `action`, `stage`, optional `target`, `amount`, `measurement`, optional `area`/`tiles` | A successful registered generic tile-action event. |

`area` is `{x,y,width,height}`; `tiles` is an array of `{x,y}`. Both narrow qualifying event coordinates and may be combined. The owning map is implicit. Tile-action `target` can be omitted or `"*"` for action counting. Produced quantity requires a specific target and a registered producing stage. It cannot ambiguously count unrelated secondary drops. The inventory item identifier and the production target can be different identifiers.

For example, this generic challenge can precede a hand-in objective:

```json
{"id":"extract","eventType":"TILE_ACTION","action":"quarry","stage":"extract","target":"iron","measurement":"quantity","amount":6,"area":{"x":30,"y":20,"width":8,"height":6}}
```

`quarry` must actually be implemented and registered by a tile-action controller; JSON cannot invent a mechanic. Controllers expose `stageDefinitions[map][action].activity = {stages,quantityStages,targets}` and return successful activity metadata `{id,occurredAt,action,stage,target,quantity,x,y}`. The existing production controller publishes its real supported stages/targets through the same catalog. The quest engine does not branch on farming, crop names, board themes or item provenance.

With `ordered:true`, an event advances only the first unfinished action objective. Otherwise compatible action objectives can advance together. Hand-in always requires all action objectives first and consumes the whole basket atomically. “Produce six ore, then hand in six ore” proves the activity and inventory spend; it does not prove those exact inventory units were produced by that player.

## Rewards, limits and withdrawal

`rewards` supports `xp` (0–1000 per assignment) and `items:[{item,amount,fundingRef}]`. Item IDs resolve from registered symbolic names or canonical numeric/string IDs (including fish names). Basket items must be transferable. Every item reward references approved platform funding; it cannot mint an arbitrary item. The platform reserves promised funding at acceptance and limits daily reserved XP per wallet. Preview configuration uses isolated test funding.

Effective policy is quest `policy` over map `defaults` over these engine defaults:

```json
{
  "participation":"personal",
  "completionScope":"wallet",
  "completionsPerOccurrence":1,
  "maxActiveRecurring":3,
  "eligibleLoopers":["owned"],
  "progressStart":"acceptance",
  "actionClaimMode":"journal",
  "reconciliationGraceHours":24,
  "withdrawal":{"allowed":true,"retainProgress":true,"allowReaccept":true}
}
```

`completionScope` supports `wallet` or `looper`. The Looper that accepts owns the attempt, item spend and reward. Other Loopers from the wallet can view its assignment but cannot operate it. `maxActiveRecurring` supports 1–10 per map; ready action rewards stop occupying active slots. One completion per occurrence and the personal/owned/acceptance/journal policies are current supported invariants; other values fail validation. Withdrawal flags can be configured independently. Withdrawal does not consume goods, and reacceptance uses the same occurrence deadline and frozen reward.

Delivery settlement must reach the authoritative service before its deadline. Missing/expired orders keep all inventory. Completed action challenges retain their ready reward through reset and are claimable from the journal anywhere. Delivery availability is based on current inventory, never on a permanently completed “have goods” checkbox.

`reconciliationGraceHours` (1–168, default 24) keeps unfinished action reward reservations while delayed authoritative events arrive. Platform reconciliation drains persisted production events before expiring/releasing reservations. Unuploaded legacy events after that grace are outside the supported recovery window. Delivery attempts expire at their deadline; inventory is never reserved before explicit hand-in.

## Runtime guarantees and operational boundaries

Acceptance, ownership, active limits, funding reservation, progress deduplication and settlement are enforced by the platform. Settlement locks the full basket and reward funding, records completion and one receipt, and applies rewards in one database transaction. The game never accepts a browser-supplied wallet, quantity, progress value or reward. A browser request UUID is normalized to a stable SHA-256 ID, so retry the **same request ID and intent** after an ambiguous response. A completed receipt is safe to replay even after leaving the recipient or crossing the deadline.

Game inventory writes serialize quest settlement with queued loot, gifts and production, then refresh authoritative balances so replaying an old receipt cannot restore spent items in cache. XP already persisted by the platform is applied locally without a second grant.

The production transaction includes a durable quest-activity outbox in the same commit as its items/XP/plot mutation. Replays return the original event ID, timestamp and content. The game also maintains an fsynced retry spool (`QUEST_BOARD_PROGRESS_FILE`, default `data/quest-board-events.jsonl`). Completed uploads remove records atomically; restart retries preserve IDs. Terminal validation/actor conflicts are preserved in a separate `.rejected.jsonl` audit file and do not block other players; authentication failures and service outages stay queued for retry.

Legacy combat, loot and NPC/scene interactions use that awaited durable spool, but their older gameplay writes and the event append are not one shared transaction. A hard crash between those older gameplay effects and the durable append can still lose that action's quest credit. Do not describe those paths as an atomic gameplay ledger. Existing negative inventory changes and replayed production receipts never create extra progress. Keep each game process's spool path distinct and on persistent storage; do not run two writers against the same spool file.

The current release does not expose community contributions, partial personal hand-ins, competing limited commissions, level variants, non-item reward adapters, specific NPC recipients, arbitrary custom-rectangle visit events, or remote routes. These cannot be enabled with ignored extra JSON fields. Existing named-scene visits and optional location filters are supported. Screens and gameplay must still be checked for travel time, walls, access to sources and balanced rewards before publishing a live board.
