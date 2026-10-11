# Quest system additions

Quest Boards add map-authored assignments with repeat schedules, personal activity tracking, and transactional item hand-ins and rewards. They run alongside the existing story quest engine. A map maker can advertise existing adventures and new challenges or item requests on a physical board, with all authored settings in the map quests JSON.

## Existing stories and new board assignments

The change keeps the two kinds of quest progress separate:

| Concern | Existing story quests | New board assignments |
| --- | --- | --- |
| Definition | Existing story fields, in JavaScript or the map JSON | A quest with `scheduleId`, objectives, rewards and policy in map JSON |
| Progress | Existing quest flags and objective storage | A persistent attempt for one published occurrence |
| Repeat behavior | Original story engine behavior | Permanent, daily, weekly or fixed windows; optional rotation |
| Acceptance | Existing quest giver; optionally a board advertising that story | Explicit acceptance at a configured board |
| Item hand-in | Existing singular `DELIVER_ITEM` and reporting behavior | New plural `DELIVER_ITEMS` for a complete basket at a configured recipient |
| Completion writes | Existing separate backend calls | Basket debit, XP, item rewards, completion and receipt in one transaction |

Displaying a story on a board does not convert its progress or reward handling into the new assignment system. `allowStoryAcceptance` defaults to false; enabling it allows eligible advertised stories to start at the board while preserving their original level and prerequisite checks.

## Map quests JSON

The versioned file is `server/js/quests/<mapId>.json`. Its top-level sections are:

| Section | What the map maker controls |
| --- | --- |
| boards | IDs, tile bounds, additional placements, labels, description, categories, offered quest IDs, enablement and schedule visibility |
| `handInLocations` | A fixed object or a reference to a board on the same map |
| schedules | Recurrence, timezone, opening time, acceptance and completion windows, preview horizon and rotation |
| quests | Existing story definitions and new assignment templates, objectives, requirements and rewards |
| defaults | Assignment policy defaults, overridden by individual quest policy |

The envelope also requires `schemaVersion`: 1 and `mapId` matching the filename. New-feature fields are validated strictly against registered items, mobs, NPCs, fish, scenes and tile-action stages. Unknown fields and unsupported settings fail validation rather than silently doing nothing.

When JSON exists, it replaces that map's JavaScript quest list. To migrate a populated map, copy its existing story definitions into quests and keep their IDs. Definitions without `scheduleId` continue through the story engine. Maps without JSON retain their JavaScript definitions. Separately registered story modules remain registered; all quest IDs must be globally unique.

Validate the file, then restart the game server. There is no configuration hot reload in this release. Board placement does not require a new map export, but the creator must check tile accessibility in the actual map.

## Templates, occurrences and attempts

A **template** is the creator's quest definition. An **occurrence** is one published opening of that template, such as today's rat patrol. An **attempt** is the player's saved acceptance and progress for that occurrence.

~~~mermaid
flowchart LR
    Template[Quest template in map JSON] --> Schedule[Schedule and optional rotation]
    Schedule --> Occurrence[Published occurrence with frozen terms]
    Occurrence --> Accept[Player accepts at a board]
    Accept --> Attempt[Saved attempt bound to that Looper]
    Attempt -->|Challenge or combined request| Actions[Complete activity objectives]
    Attempt -->|Item request| Basket
    Actions -->|No basket| Ready[Action reward ready]
    Ready --> Claim[Claim from journal]
    Actions -->|Basket required| Basket[Full basket at configured recipient]
    Basket --> Confirm[Confirm item hand-in]
    Claim --> Completed[Completed with one reward receipt]
    Confirm --> Completed
~~~

Pure item requests need no activity objective: the player can accept, gather the basket, and hand it in. Attempts have accepted, ready, withdrawn, completed or expired status. ready is the saved entitlement for an action-only reward; basket readiness is calculated from current inventory, and an item request remains accepted until settlement.

Each occurrence allows one completion per configured wallet or Looper scope. The Looper that accepted remains bound to the attempt, inventory spend and reward. Other Loopers owned by the wallet can view the work but cannot finish it for that Looper. A new daily opening is a new occurrence and can be accepted again; resetting the board does not erase yesterday's completion or earned action reward.

## Scheduling and published promises

Schedules support permanent availability, daily or weekly recurrence with intervals, and explicit dated windows. Calendar schedules use an IANA timezone and account for daylight saving changes. Opening, the last acceptance time, and the completion deadline are separate concepts. Completion can use an elapsed window or the next calendar opening.

The board can preview upcoming occurrences. Optional weighted rotation selects a fixed number of quests from a pool, avoids recently selected entries where possible, and uses a configured fallback when the pool is too small. Selection is deterministic across players, replicas and restarts.

Publication freezes the occurrence's objectives, reward, windows, destination and policy, including upcoming previews. JSON edits affect unpublished occurrences. Editing a reward does not grant another completion of the same opening. Disabling a quest or board stops new acceptances; accepted promises remain available. Keep old recipient positions reachable until those attempts finish.

## Objective additions

Several existing gameplay events can now advance recurring assignments. Three objective types extend what the board assignment system can express:

| Objective | Meaning |
| --- | --- |
| `TILE_ACTION` | Complete a successful registered action/stage, optionally for a specific target, measured by action count or produced quantity |
| `FISHING` | Catch a registered fish through the fishing system; receiving a fish as a gift is not a fishing catch |
| `DELIVER_ITEMS` | Explicitly hand in a complete basket of inventory items at one configured recipient |

Recurring assignments also support `KILL_MOB`, `LOOT_ITEM`, `NPC_TALKED` and `AREA_ENTERED`. These reuse server-confirmed gameplay events, with progress starting after acceptance. Location filters can narrow activity to a rectangle or explicit tiles on the owning map. `AREA_ENTERED` uses an existing named scene; defining a new rectangle alone does not create a visit event.

These requirements express different intentions:

| Creator intention | Objective choice | Does existing inventory satisfy it? |
| --- | --- | --- |
| Bring three hide and two ore, obtained by any method | `DELIVER_ITEMS` with both basket entries | Yes |
| Collect ore through qualifying loot events after acceptance | `LOOT_ITEM` | No; the activity must occur after acceptance |
| Produce a quantity through a specific registered mechanic | `TILE_ACTION` with `measurement: "quantity"` | No; the producing activity must occur after acceptance |
| Perform an activity and also spend the requested goods | Activity objective followed by `DELIVER_ITEMS` | Stock can satisfy the basket, but not the activity |

Hand-ins are generic: goods may come from stock, loot, fishing, trading, gifts or production. The engine does not branch on farming. A production controller must register its supported stages, output targets and quantity-producing stages, and return authoritative successful activity metadata. JSON can configure an existing mechanic; it cannot implement a new mechanic.

Action objectives are independent by default. With `ordered: true`, an event advances only the first unfinished action objective. A single `DELIVER_ITEMS` objective must be last and requires all preceding activities to be complete. Combining production and a basket proves the activity and the spend, not the provenance of the exact inventory units handed in.

## Acceptance, withdrawal and eligibility

New assignments require explicit acceptance at the board. Actions before acceptance or during withdrawal do not count. Pinning only changes the HUD; unpinned accepted quests still progress.

Policy supports wallet or Looper completion scope, 1–10 active assignments per wallet on each map, and configurable withdrawal, retained progress and reacceptance. The default active limit is three. Ready action rewards release their active slots. Reacceptance uses the same occurrence, accepting Looper and deadline; it does not reset the timer.

Current supported invariants are personal participation, one completion per occurrence, acceptance-based progress, journal claims and owned Loopers. Free-to-play and rented avatars cannot accept these assignments. Quests can require an effective level or completion of an existing story quest, and can hide locked secret offers. Recurring prerequisite chains are not enabled in the map schema.

## Item hand-ins and rewards

At acceptance, the platform reserves promised item rewards from an approved funding pool. A creator selects `fundingRef` in JSON; an operator supplies the inventory or explicitly approved allowance. Funding and player balances are runtime platform state, not creator-authored JSON content.

At hand-in, the game checks the active session, bound Looper and exact recipient proximity. The player confirms the basket. The platform rechecks current inventory, deducts all requested items, awards XP/items, completes the attempt and records a durable receipt in one database transaction. A missing item or expired hand-in leaves the whole basket unspent. Goods are not removed or reserved when the quest is accepted.

Action-only rewards can be claimed from the journal anywhere. Once earned before the deadline, their ready reward remains claimable after reset. Item hand-ins must reach settlement before their deadline. Withdrawal and expiry release unearned reward reservations according to policy and reconciliation rules.

The platform limits XP to 1,000 per occurrence and 5,000 reserved or completed per wallet per UTC acceptance day across maps. These ceilings are platform policy, not map-editable settings. V1 rewards are XP and items; other reward adapters are not implemented.

Retries reuse the same request ID and intent. A lost response after a successful commit returns the saved receipt on retry without consuming or rewarding twice. Inventory settlement is serialized with queued loot, gifts and production, and caches refresh from authoritative balances so an old receipt cannot restore spent goods.

## Player interface and artwork

The physical board offers **Available**, **My quests** and **Schedule** views, category filters, descriptions, objective progress, inventory requirements, rewards and deadlines. The journal opens anywhere with **J**, and board/recipient interaction uses **E** when nearby. A pinned quest HUD shows current progress and the hand-in destination; acceptance, withdrawal, item confirmation, retry and completion each have feedback.

The board and crate use transparent sprites rendered on a fixed pixel grid matching the existing tile palette. Quest-board and event-board popups use the existing panel border artwork. The quest HUD hides while the event-board popup is open.

## Persistence and recovery

The platform migration adds occurrences, attempts, an event deduplication ledger, reward funding/reservations, mutation receipts and an activity outbox. The game resolves sessions and map definitions; authenticated platform APIs enforce ownership, limits, saved terms and settlement. Browser clients cannot supply authoritative progress, quantities or rewards.

Successful atomic farming includes quest activity in the same database transaction as the gameplay mutation. An outbox worker reconciles it, with an operator drain command and retries through the existing scheduler. Other supported gameplay uses the game's durable event spool, which retains event IDs across restart and upload retries. Terminal validation/actor conflicts go to an audit file; authentication failures and outages stay queued.

The older combat, loot, NPC, scene and fishing paths do not share one transaction with that spool append. A hard crash after their gameplay effect but before the durable append can still lose quest credit. Delayed action reconciliation has a configurable grace period, defaulting to 24 hours; persisted atomic outbox work is drained before its unearned reward reservation is released.

## Current scope and documentation

V1 does not implement community contributions, partial baskets, competing limited commissions, level variants, non-item reward adapters, specific NPC recipients, cross-map recipients, recurring prerequisites, arbitrary new visit rectangles or a hot-reload editor. Unsupported fields are rejected. Legacy story hand-ins retain their existing transaction limitations; advertising them on a board does not change that.

- [Creator JSON reference](quest-board-config.md) contains field names, limits, scheduling examples and migration instructions.
- [Complete town example](examples/main.json) combines a generic item request, a rat challenge and a beach visit.
- [Local playtest](quest-board-local-preview.md) starts the two-player preview and explains settlement retry testing.
- [Existing story objectives](quest-objectives.md) documents the original engine and singular `DELIVER_ITEM`.
- [Artwork](quest-board-artwork.md) records the visual references and generation prompts.
- [Platform contract](https://github.com/balkshamster/looperlands-platform/blob/codex/quest-board-platform/tests/QuestBoard/README.md) covers API operations, funding, migration and recovery commands.

Implementation is split between [game PR 1520](https://github.com/looperlands/looperlands/pull/1520) and [platform PR 14](https://github.com/balkshamster/looperlands-platform/pull/14). Deploy the platform migration/API before enabling map boards in the game.
