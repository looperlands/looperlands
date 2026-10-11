# Quest Board Feature Design

Design proposal, 11 October 2026. See [the implemented configuration contract](quest-board-config.md) and [local playtest](quest-board-local-preview.md) for the shipped first-release behavior and explicit deferred options.

A Quest Board gives a map a recurring supply of things to do. Map makers configure boards, quests, challenges, and item requests in the map's quests JSON file. Players discover local stories, choose a task, prepare for upcoming requests, and receive a clear reward for completing them.

The core loop is **discover → accept → play or obtain items → complete or hand in → receive a reward**. Upcoming requests let players plan which activities to pursue. Goods can come from enemy drops, gathering, fishing, crafting, shops, trades, gifts, existing stock, farming, or any other supported inventory-producing mechanic. Farming is one application of tile actions; neither requests nor tile-action objectives depend on farming.

Use the existing event board interaction and visual language, and keep all accepted work in the existing quest journal. A board belongs to one map; it can represent a particular garden, village, harbor, or other area within that map. The recommendations below describe new behavior unless explicitly identified as existing foundations.

## An example map board

The player approaches a town board and sees a story quest, daily challenges, and item requests. A schedule shows the next three days of work. The following names, quantities, activities, and rewards are illustrative content, not final balancing or a claim that every example mechanic or NPC already exists.

| Notice | Requirement | Reward | Timing |
| --- | --- | --- | --- |
| Meet the townspeople | Follow an existing introductory quest | Existing quest reward | Available until completed |
| Clear the road | Defeat five configured enemies in the named area | Small XP reward | Daily |
| Help the workshop | Complete four successful uses of a configured production tile action | XP | Daily |
| Quartermaster supplies | Hand in 4 boar hides and 6 ore at the supply crate | XP and an approved item reward | Accept Sunday or Monday; complete by Monday 20:00 UTC |
| Supplies for the kitchen | Hand in 6 fish and 6 lettuce | An approved item reward | Preview now; opens Tuesday; due Wednesday 20:00 UTC |

The player accepts the quartermaster request. The journal shows both required quantities, their current inventory, the destination, the deadline, and the exact reward. They can obtain the items through available gameplay, use existing stock, or receive help from another player. The request does not inspect how those items were obtained.

At the supply crate, **Hand in items** opens a confirmation showing the complete basket being handed over and the reward. On success, those goods leave inventory and the promised reward arrives once. A receipt remains in quest history. The board can then point the player toward an upcoming request.

The workshop challenge separately records the player's own successful tile actions. Receiving an item as a gift can satisfy an item request, but does not advance a personal action challenge. A garden board can use exactly the same mechanisms for watering, harvesting, and produce requests.

## Quest types and schedules

Use one quest definition model with objectives, availability, and rewards. Daily and weekly describe recurrence; delivery is a generic item hand-in objective. A request can therefore be permanent, daily, weekly, or part of a custom schedule. Use Requests as the default player-facing category, with labels configurable in the quests JSON.

| Player experience | Definition | Default behavior |
| --- | --- | --- |
| Local adventure | Existing story quest or chain | Once per Looper; existing prerequisites and reporting steps apply |
| Daily challenge | A repeatable task selected from a curated pool | One completion per player wallet per occurrence |
| Weekly challenge | A larger repeatable task | Same rules with a longer window |
| Item request | A basket of inventory goods plus a destination | Individual request, complete basket handed in together |
| Scheduled request | A request with advance notice and a deadline | Preview, opening, acceptance cutoff, and due time are explicit |

Supported building blocks should include talking to an NPC, visiting an area, defeating enemies, collecting items through gameplay, and handing in items. Extend the objective system with a generic successful tile-action objective filtered by action, stage, target, location, and count or quantity. It can cover mining, crafting, gathering, farming, or another registered action without a quest-specific controller. A controller must actually expose the required successful-action events before its action can be selected. Personal fishing objectives can use the existing fishing activity source; handing in fish needs only valid inventory and no fishing adapter.

Most creator templates need only one objective or a few objectives completed in any order. Story quests can retain ordered steps. A delivery basket is one final objective containing several item quantities, so the player never loses half a basket before the order completes.

## Player experience

Approaching a board presents **View quests**, using the familiar event board interaction. Opening it shows the map or area name and three views:

- **Available:** work that can be accepted now, with configurable filters defaulting to Adventures, Challenges, and Requests. Relevant locked quests can show a short reason such as a required level or prerequisite. Secret quests remain hidden.
- **My quests:** accepted work from this board, with progress, destination, time remaining, and ready rewards. The global journal also shows accepted work across maps.
- **Schedule:** upcoming published work, grouped by day, showing requirements, opening times, deadlines, and rewards. Item requests include their goods and quantities. Tracking an upcoming request adds a reminder in the journal; it does not accept it or reserve stock.

Each notice answers: what do I do, where does it count, what will I receive, and how long do I have? Details also say whether goods can come from anywhere, whether personal actions are required, and which Looper will receive the reward.

Accept at the physical board. Review and pin accepted quests from the journal anywhere. Show one pinned objective on the HUD, with a destination marker and an expandable basket. Keep other quests progressing without requiring more HUD panels. Switching maps preserves accepted quests and shows the destination's map name.

Use the existing panel styling and input conventions, with keyboard focus, Escape to close, readable text, and scrolling that keeps the primary action visible. Progress and expiry need text labels in addition to color. Opening the board must suppress game movement shortcuts. Errors keep the selected quest and provide a retry.

The board may mark newly published work and ready rewards with small distinct indicators. Notify the player when an accepted order becomes ready and once near its deadline. Omit repeated popups, login streak penalties, and global announcements for ordinary orders.

## Scope and the meaning of progress

Every board belongs to exactly one map. A map can have several boards with different catalogs, such as a harbor board and a garden board. Multiple physical placements may point to the same logical board; they share its offers and completion limits.

Keep these three settings separate:

| Setting | What it controls |
| --- | --- |
| Board location | Where players discover and accept the work |
| Objective area | Where qualifying actions must happen, defaulting to the board's map and optionally narrowed to a named area, action, or set of tile locations |
| Delivery destination | The board, a fixed drop-off object, or a specifically identified NPC on the same map |

The initial feature supports objectives and recipients on the owning map. Inventory for ordinary requests can come from anywhere. A board's name, theme, or location never implies an item acquisition restriction. A mine board can accept traded ore; a garden board can accept produce from other maps.

**Item request:** “Hand in 6 ore.” Existing inventory, gifts, purchases, loot, or output from a configured tile action are equally valid. Only the required item kinds and spendable quantities at hand-in matter. The objective does not call a farming or production subsystem.

**Local activity challenge:** “Extract 6 ore at the quarry after accepting.” Count successful server-confirmed activity by that player in the configured area. Possession and gifts do not count. JSON explicitly selects successful action count or produced quantity as the measurement. The UI states the unit. Watering four plots or harvesting eight vegetables are other configurations of this same objective type.

**Combined request:** “Extract 6 ore at the quarry, then hand in 6 ore.” Both conditions are required. This proves the player performed the activity and handed over the goods; it does not prove that the exact individual units handed in were those produced. Existing inventory does not preserve that provenance. Avoid claims such as “hand in the ore you just mined” or “your freshly grown carrots” unless provenance is implemented separately.

A successful gameplay action can satisfy several compatible accepted action challenges and event rules. An inventory unit can only be spent once. Quests do not reserve production jobs or the player's goods before hand-in; spending or gifting inventory can change a request from Ready to Missing goods.

Acceptance must be saved before actions start counting. Activity before acceptance, during withdrawal, or after the action deadline does not count. Reconnection and changing servers do not reset progress.

## Map quests JSON as the source of truth

All map-authored configuration for this feature lives in the map quests JSON file. There is no separate board configuration file, mandatory dashboard setup, or farming-specific request configuration. A future visual editor must round-trip the same file and preserve settings it does not expose.

The proposed canonical path is `server/js/quests/<mapId>.json`. The current runtime imports per-map JavaScript quest modules; JSON loading is required implementation work, not existing support. Introduce a versioned JSON envelope while preserving existing quest fields and IDs. Load JSON when present and otherwise retain the legacy module. Never load both sources for the same migrated map. Existing quest IDs must remain globally unique because the current registry indexes them across maps.

| JSON section | Authored configuration |
| --- | --- |
| `defaults` | Completion scope, participation mode, eligibility, active and completion limits, acceptance/progress/claim policies, withdrawal and reacceptance behavior |
| `boards` | Stable IDs, enablement, names and labels, visibility and category filters, interaction bounds or object references, advertised quest IDs and presentation options |
| `handInLocations` | Named targets, display labels, interaction bounds or supported map-object/NPC references, access windows |
| `schedules` | Permanent or recurring availability, timezone, reset time, preview horizon, acceptance and completion windows, fixed dates, rotation pools, weights, selection counts and repeat avoidance |
| `quests` | Stable quest IDs, text, categories, requirements, objectives and their order, action and area filters, measurement, item baskets, destinations, schedule references, effort estimates, reward definitions and funding references |

Each setting has one owning section. Boards advertise quest IDs; quests choose their schedule and destination; schedules own their rotation rules. Do not duplicate an independent schedule inside a board. Effective quest policy is the explicit quest override over map defaults over documented engine defaults, validated against platform ceilings. Board presentation settings do not change an underlying occurrence's completion limit. Validation can print the resolved configuration, so omitted defaults are inspectable.

These new defaults apply to new board assignments. Merely advertising an existing story quest does not apply recurring completion scope, ownership eligibility, slot limits, withdrawal, or claim policies to it. That quest retains its original behavior unless explicitly migrated, with saved progression preserved.

Board and hand-in coordinates can be authored directly in JSON. Tiled remains a way to draw scenery and may provide a stable geometry reference or export coordinates into this JSON. It must not be required to enable the feature or define its behavior. Existing map assets and item/action definitions remain reusable references; the quests file does not need to duplicate textures or implement the mechanics that produce items.

This illustrative proposed JSON configures a generic mixed-item request and a personal tile-action challenge. It is a design example, not configuration accepted by today's loader. Coordinates and the `mine_ore` action are examples that must be replaced with valid map content. Symbolic item names resolve through the registered item catalog; a missing action, stage, target, or item fails validation.

```json
{
  "schemaVersion": 1,
  "mapId": "main",
  "defaults": {
    "participation": "personal",
    "completionScope": "wallet",
    "completionsPerOccurrence": 1,
    "maxActiveRecurring": 3,
    "eligibleLoopers": ["owned"],
    "progressStart": "acceptance",
    "actionClaimMode": "journal",
    "withdrawal": {
      "allowed": true,
      "retainProgress": true,
      "allowReaccept": true
    }
  },
  "boards": [
    {
      "id": "town-board",
      "enabled": true,
      "label": "Town Quest Board",
      "bounds": {"x": 12, "y": 18, "width": 2, "height": 1},
      "questIds": ["MAIN_QUARTERMASTER_SUPPLIES", "MAIN_QUARRY_CHALLENGE"],
      "showSchedule": true
    }
  ],
  "handInLocations": [
    {
      "id": "supply-crate",
      "kind": "object",
      "label": "Town supply crate",
      "bounds": {"x": 16, "y": 18, "width": 1, "height": 1}
    }
  ],
  "schedules": [
    {
      "id": "daily",
      "timezone": "UTC",
      "repeat": {"frequency": "daily", "interval": 1},
      "opensAtLocalTime": "00:00",
      "acceptanceWindowHours": 20,
      "completionWindowHours": 24,
      "previewHours": 72
    }
  ],
  "quests": [
    {
      "id": "MAIN_QUARTERMASTER_SUPPLIES",
      "name": "Quartermaster supplies",
      "category": "requests",
      "scheduleId": "daily",
      "requiredLevel": 5,
      "ordered": true,
      "objectives": [
        {
          "id": "supplies",
          "eventType": "DELIVER_ITEMS",
          "recipientId": "supply-crate",
          "items": [
            {"item": "BOARHIDE", "amount": 4},
            {"item": "ORE", "amount": 6}
          ]
        }
      ],
      "rewards": {"xp": 100}
    },
    {
      "id": "MAIN_QUARRY_CHALLENGE",
      "name": "Help at the quarry",
      "category": "challenges",
      "scheduleId": "daily",
      "objectives": [
        {
          "id": "extract-ore",
          "eventType": "TILE_ACTION",
          "action": "mine_ore",
          "stage": "extract",
          "target": "ORE",
          "measurement": "quantity",
          "amount": 6,
          "area": {"x": 30, "y": 20, "width": 8, "height": 6}
        }
      ],
      "rewards": {"xp": 100}
    }
  ]
}
```

`DELIVER_ITEMS` and `TILE_ACTION` are proposed additions alongside existing objective types. A hand-in objective contains no implicit acquisition-source condition. To require personal activity as well, compose a matching action objective before the hand-in. When an action produces several items, its event contract must identify which quantity the target represents; reject an ambiguous produced-quantity objective rather than counting unrelated output.

Schedule durations expressed in hours are elapsed real hours from an occurrence's opening; the example stops acceptance after 20 hours and completion after 24 hours. A calendar-day deadline may instead set `completeAt: "nextOpening"`, mutually exclusive with `completionWindowHours`. Local recurrence boundaries use the configured timezone; a nonexistent local time advances to the next valid instant and a repeated local time uses its earlier instant. Previews show the resulting timestamps.

An occurrence has a stable identity based on map, quest, and its published schedule window. Its configuration version is a pinned attribute, not part of the completion-allowance key. Editing JSON cannot create a fresh claim for an already published quest/window. All displayed preview promises and accepted attempts retain their original version.

Validate the whole file and all references after registering the map's content catalog, then publish one immutable resolved configuration version. Invalid updates fail visibly and leave the last valid version active. The server may store validated versions and occurrence snapshots for execution and recovery; those are derived records, not a second editable definition source. No runtime process writes player state back into quests JSON.

Inventory balances, player identities, progress, acceptance timestamps, generated occurrence records, reward funding balances, reservations, approvals, and settlement receipts remain persistent runtime state. JSON defines the requested behavior and references approved funding; it cannot fabricate ownership or balances, disable atomic settlement, or bypass platform authorization and issuance limits. These are engine invariants, not missing map-maker configuration options.

## Recurrence and deadlines

Daily boards default to midnight UTC, consistent with existing event boundaries; reset time and timezone are JSON settings. Display local dates and times to the player, plus an unambiguous countdown. Custom schedules store explicit instants and an authoring timezone; previews show the resulting dates across daylight-saving changes. These are real-world schedules, independent of the accelerated in-game day.

Each occurrence has separate times for preview publication, opening, last acceptance, and completion. Ordinary dailies open at reset and end at the next reset. Delivery templates can open earlier and remain available for several days. A recurring template never resets an existing player's quest in place: each occurrence has its own progress and completion record.

Default to 72 hours of previews, with the preview horizon configured in JSON and an optional weekly view. Freeze an occurrence's displayed requirements, quantities, destinations, and rewards when its concrete preview is published. Label more distant, unpublished entries as tentative if shown at all. Changing a schedule affects unpublished occurrences; it does not reroll promises players have already seen.

Select daily challenges from authored, validated templates. JSON defines pool membership, selection counts, weights, repeat avoidance, and fallback rules. Use the same selection for eligible players on that map. A starting board can publish one easy challenge and one longer challenge. Do not invent arbitrary item requirements at runtime. Level variants, when used, are chosen and fixed at acceptance.

Players may accept late while the acceptance window remains open. The card always shows the original deadline, and a late warning appears when remaining time is shorter than the configured effort estimate. Acceptance does not extend the occurrence.

Acceptance cutoffs should leave realistic acquisition and travel time. Validation uses configured effort estimates and available source information: tools, level, action cooldowns, production duration, material costs, possible yield, drop availability, and recipient opening hours. Crop growth and seed availability are relevant only when a quest explicitly requires farming activity. Shared production locations and uncertain drops also need playtesting; an ordinary inventory request must not be rejected just because a particular production method is unavailable locally.

## Completion and recovery rules

| Situation | Result |
| --- | --- |
| An action challenge reaches its goal in time | A durable Reward ready entitlement is created. The player may claim from the journal later, including after reset. |
| A delivery basket is in inventory | Show Ready to deliver. This is a live inventory check, not completed work or a reserved basket. |
| The player hands in the full basket before the deadline | Atomically consume the goods, complete the order, and grant or durably commit the promised reward. |
| An unfinished challenge or delivery expires | Close that occurrence. Keep the player's goods and plots unchanged; release unused reward reservations. |
| A hand-in response is lost | Show Confirming delivery and resolve the same request. Never prompt the player to pay the basket again. |
| The player withdraws | Free the active slot and reward reservation. Keep inventory and recorded progress. Reaccepting is allowed while open and funded, with the same progress, deadline, and reward definition; activity during withdrawal does not count. |
| An order is already completed | Show its receipt. Further clicks and requests replay the result without another debit or reward. |

For deliveries, the server must durably validate and record settlement before the deadline; merely opening the confirmation dialog is insufficient. Once a settlement has committed, retries remain valid after expiry. An uncommitted request that first reaches the authoritative service after the deadline cannot consume goods.

Trusted gameplay events recorded before an action deadline may be applied after it when delivery is delayed. Deduplicate them by stable event identity and use the server occurrence time, never a client clock. The corresponding reward reservation must remain held while in-flight events can still qualify; final expiry and reservation release require a processed-event boundary or reconciliation of the authoritative log.

Default to three active recurring assignments per player, separate from story quests, with the per-map limit configured in JSON within platform-wide ceilings. Reward-ready action challenges no longer occupy an active slot. Withdrawal, reacceptance, progress retention, and reward claim mode are explicit JSON policies; the table above describes their recommended defaults. There is no fee or reputation penalty for expiry or withdrawal in the initial supported policies.

## Player identity and rewards

Keep existing story progression attached to the Looper. For recurring challenges and requests, default to one completion per wallet per occurrence, with completion scope and repeat limits configured in JSON within authorized platform policies. Bind each accepted attempt, inventory, and XP to the accepting Looper. Changing boards or servers cannot create another allowance within the chosen scope. The journal names the bound Looper and asks the player to switch back when needed.

The first rewarded recurring pilot should select owned, non-public Loopers in its JSON eligibility rules, aligning with the existing event item recipient policy. Everyone can browse; existing free-to-play story and tutorial behavior remains available. Rental and guest reward participation needs a supported platform eligibility policy before that option can be enabled in JSON. A transferred Looper does not transfer a wallet's contract or create another claim; loss of ownership blocks further settlement and releases unearned reservations. Already earned but unpaid rewards remain recorded for support resolution.

Start with XP and ordinary inventory items. Allow existing story unlocks through their established quest or flow behavior. Map reputation, cosmetics, and special access can become reward adapters later, without changing the board interaction.

Map makers choose rewards within platform policy. Approved XP bands and platform-wide recurring reward limits bound issuance. Ordinary item rewards use reserved funding stock; direct item grants require an approved allocation, following the distinction already present in event prizes. Map ownership alone must not authorize unlimited minting.

Acceptance atomically reserves the promised item funding and XP or grant allowance. If either is unavailable, the board says Rewards unavailable and cannot accept the order. Never reduce a promised reward at hand-in because the creator spent the stock or the player accepted another map's challenge. A late claim consumes its original allocation, not a fresh day's allowance. Reward-ready entitlements keep their reservation until paid.

The reward display is guaranteed and deterministic in the first release. Reward types, amounts, and funding references are JSON fields validated against platform policy. Example XP numbers need balancing against current earning rates and item acquisition costs before launch. Avoid introducing another currency or random reward crate just to support boards.

Delivered goods are consumed by default, creating a resource sink. Transferring them into a creator's inventory would be a separate, explicit order mode with a clearly named recipient and an atomic transfer contract; leave it out of the first release.

## Map maker workflow

1. **Define a board in the map quests JSON.** Assign its stable ID, label, interaction bounds or stable map-object reference, visibility, and quest references. Existing Tiled artwork can provide the visible board; gameplay activation and settings come from JSON.
2. **Define or link quests in the same file.** Add objectives or refer to existing story quest IDs. Existing NPC-started quests can be listed as directions to their quest giver; direct board acceptance is an explicit JSON option that still checks prerequisites.
3. **Configure location rules.** Set optional objective areas or tile-action filters and a named hand-in location. Use the board itself or a fixed object for the first release. A later NPC recipient needs a stable placed-actor identity and an availability schedule.
4. **Configure schedules in the same file.** Choose permanent, daily, weekly, or custom timing. Set preview, acceptance, completion, rotation, and fallback rules. A validation command previews the next seven occurrences.
5. **Configure rewards and eligibility.** Set reward types, quantities, approved funding references, completion scope, and limits. Funding balances and approval records are live platform state, not duplicated amounts in the file.
6. **Validate and playtest.** Validate the complete JSON and referenced content; preview as a new player, eligible player, player carrying the full basket, and player near expiry. Sandbox completion uses test inventory and cannot grant live rewards.
7. **Publish the file version and operate.** Load the validated map configuration, inspect progress and receipts, and replenish funding. Set board or quest enablement in JSON to stop new acceptances. Only authorized map editors can publish configuration.

Provide copyable JSON examples for Hand in items, Perform a tile action, Hunt enemies, Visit a place, and Link an existing quest. Farming examples specialize the generic tile-action and hand-in templates. An optional future editor reads and writes this same JSON; it must not introduce dashboard-only settings or become necessary to configure supported features.

Validation blocks missing item IDs, invalid quantities, unsupported objective events or action filters, inaccessible configured recipients, broken quest prerequisites, map references outside the owning map, unapproved rewards, and schedules with acceptance after the deadline. Warn about estimated effort, scarce activity opportunities, dependence on rare drops, and repeating rewards without enough forecast funding. Unsupported future fields are rejected rather than silently ignored.

Setting board or quest enablement to false in the published JSON stops new acceptances immediately, including for already published offers. This operational pause is an explicit exception to applying ordinary edits only to future unpublished offers: it changes availability without changing published terms, earned rewards, or accepted contracts. Accepted contracts remain available through the journal and their receivers.

Location edits apply to future offers. Preserve reachable receivers and their snapshotted geometry or stable target resolution for published and accepted occurrences until they settle, expire, or are explicitly cancelled. Moving or deleting a referenced Tiled object cannot silently move or break an existing hand-in. Reject a deployment that removes the required compatibility location. Other routine edits create a new version for future unpublished offers. Emergency cancellation is an explicit administrator action with a reason; earned rewards survive, and no undelivered inventory is taken.

For longer delivery windows, prefer an always-accessible crate. If a future NPC receiver goes offline or its map becomes inaccessible, support can extend affected deadlines or cancel unearned contracts with notice. An extension requires an audit record and does not create a new completion allowance.

## Personal and community work

Personal work is the default: every eligible player receives their own order and full reward. Other players completing it cannot make an accepted order disappear. The board must distinguish shared publication from any genuine limited capacity. If funding limits new acceptances, show that availability before acceptance; accepted rewards remain reserved.

A later community request mode can show collective progress, such as supplying timber, ore, and food for a village project. Its target basket, participation rules, contribution caps, and rewards also belong in the same map quests JSON once supported. It requires a different contribution flow: display a specific contribution quantity, atomically take only the amount still needed, and issue a contribution receipt. Concurrent contributors must never oversupply a closed goal.

For that mode, reserve funding for the occurrence's total permitted contribution rewards before opening. Award a fixed, capped reward for each accepted contribution unit or bundle; earning that personal reward does not depend on the community reaching the final goal. A shared milestone can unlock a decorative map change. This avoids taking contributions whose only promised payment becomes impossible when the deadline passes. Personal contribution caps and the remaining community target are visible before confirmation.

Defer scarce competitive commissions, partial personal hand-ins, player-posted requests, and cross-map routes. They introduce reservation, escrow, or travel rules beyond the first generic quest-board loop.

## Existing foundations and required changes

The current repository provides useful foundations, with material gaps that affect implementation:

| Foundation | Reuse | Required extension |
| --- | --- | --- |
| Event board UI and controller | Interaction, panel language, focus handling, session and proximity checks | Map-scoped quest catalogs and per-board identities; do not copy event competition semantics |
| Map geometry and existing board interaction | Coordinate conventions and visible map objects | Resolve quest-board and hand-in placements from the quests JSON; optional Tiled object references supply geometry only |
| Quest objectives and journal | NPC, area, kill, collection, and single-item delivery evaluation; existing story prerequisites | Recurring attempts, multi-item baskets, tile-action objectives, and board views in the same journal |
| Gameplay activity catalog | Actual item, mob, crop, and action identifiers | JSON reference validation and optional editor selectors; generic action filters |
| Farming and gift transactions | Durable receipts, inventory locking, and safe retries as implementation precedents | A dedicated atomic quest acceptance and settlement contract in the platform |
| Event rewards | Owned recipient and funded versus approved-grant concepts | Reservations and settlement suitable for personal accepted contracts |

The per-map JSON loader and schema are new foundations. The shared world-definition registry remains the integration point; migrating a map must preserve its existing quests and saved progress while adding optional board sections. Extending the format alone does not implement new objective events, schedules, or transaction guarantees.

The existing quest objective documentation explicitly states that completion, item debits, and rewards use separate backend calls. Adding a board UI on top would not make delivery completion transactional. Multi-item baskets and recurring instances also exceed the current final single-delivery objective rules.

Keep the domain split clear: a **board** advertises content; a **quest definition** describes the task; a **schedule** produces immutable **occurrences**; an **attempt** records a particular player's acceptance and progress; a **settlement receipt** records the inventory and reward result. Multiple boards can reference the same occurrence without granting another completion.

Recurring occurrence IDs must not overwrite lifetime story quest IDs or reset story-completed flags. Reuse objective evaluators and journal presentation, while adding properly scoped persistence. Existing quest definitions and NPC hand-ins continue through their established behavior unless explicitly migrated. Integrating a story quest must preserve its original completion record, including when both the NPC and board advertise it.

The game server authenticates the active session and verifies the exact board or receiver, current map, adjacency, and Looper. Revalidate location after asynchronous reads. Validated map quests JSON owns authored definitions and policy selections. The platform enforces those published definitions and owns durable acceptance, reward reservations, progress, resolved occurrence deadlines, and settlement. Browser-supplied progress, reward amounts, or item quantities are never authoritative.

Acceptance must atomically enforce the occurrence's configured completion-scope allowance, active slot limit, eligibility, and funding reservation across all game servers. Settlement must atomically validate the attempt and deadline, lock inventory and reward funding, debit the complete basket, apply XP and inventory rewards, mark completion, and persist a unique receipt. If a reward requires an asynchronous adapter, commit a durable entitlement and outbox job in that same transaction. The UI reports Reward pending until delivery is confirmed.

Retries use the same request identity and intent. Concurrent completion, gifting, farming, withdrawals, or claims must not overspend stock or duplicate a reward. A receipt lookup resolves uncertain responses. Emit downstream completion notifications only from committed state and deduplicate them; recurring completions must not accidentally re-run lifetime story flows.

Successful tile-action controllers can emit generic action, stage, target, quantity, and coordinate metadata; farming already uses this contract. The current activity spool can lose queued appends during a process crash. Reuse event shapes and filters, not an assumption that this is a complete quest ledger. Reward-bearing action objectives need stable action identities and durable recording or an outbox associated with successful gameplay commits. Failed actions and replayed receipts cannot add progress twice. Ordinary item hand-ins need no producing-action adapter. Progress snapshots in the journal come from persisted authoritative state.

Scheduling must produce the same occurrence across replicas and server restarts, including when no player is online at reset. Use a unique template-and-window identity and persist the published version. Published previews, accepted attempts, and reward promises survive content deployments.

Load board details on interaction and refresh on relevant changes. Cache shared catalog data separately from player progress; subscribe to active objective events rather than scanning every quest each frame. Fetch upcoming windows in bounded pages. Server time drives displayed countdowns, and stale data cannot authorize acceptance or hand-in.

## Delivery plan

**First release:** a validated per-map quests JSON format and loader, map-scoped boards, opt-in discovery of existing quests, rule-generated daily challenges and per-player refill slots, generic tile-action objectives, scheduled individual item requests with multi-item baskets, fixed hand-in locations, configurable previews, journal tracking, XP and approved item rewards, configuration validation, and durable acceptance and settlement. All supported feature configuration must be possible by editing that one JSON file. A graphical editor is optional later work.

Use one mixed-activity map board as the pilot: an existing story quest, a combat challenge, a registered tile-action challenge, and requests for items available through different sources. Include a farming example as one configuration. Test with two real player identities and separate inventories, including existing stock and gifted items. The pilot should demonstrate that creators can operate the board through JSON alone and that acquisition source does not affect an unrestricted hand-in.

Implement the JSON schema and compatible loader, persistence and economic contract, generic action bridge, board and journal, validation tooling, and the complete pilot. Platform migrations and APIs must be ready before enabling game clients and servers. Map quests JSON controls board enablement; platform capability checks prevent enabling an unsupported deployment. Maps without boards retain their existing quests.

**Second release:** weekly pools, specific NPC delivery receivers, richer prerequisite chains, maker analytics, and map reputation or cosmetic unlocks where they have an actual use.

**Later:** community deliveries using the contribution model above. Add cross-map delivery routes or player-created orders only after the personal loop establishes demand.

## Acceptance criteria and success measures

The first release is complete when a map maker can configure the supported pilot by editing only the map's quests JSON, and the following player and recovery cases pass:

- Two players independently accept and finish the same order; neither consumes the other's availability after acceptance.
- Two simultaneous acceptances for one wallet and occurrence produce one attempt, one funding reservation, and one active slot.
- Changing JSON alone updates board placement, enabled state, labels, quest selection, requirements, objective filters, hand-in locations, schedules, limits, and rewards within authorized bounds. No Tiled behavior property or creator dashboard setting is required.
- JSON defaults and overrides are deterministic; unknown or unavailable features fail validation. Legacy JS quest maps and existing quest IDs retain their behavior during migration.
- Action progress checks map, area, successful action, selected measurement, acceptance time, and event identity. A gift advances inventory readiness but not personal activity progress.
- The same unrestricted item request accepts equal inventory from every supported acquisition source without source-specific quest code. A combined action-and-hand-in quest requires both recorded activity and current stock.
- A non-farming tile-action challenge uses the same objective evaluator as a farming challenge, with only its JSON filters changed.
- A player hands in a mixed basket at the configured drop-off, sees exact inventory changes, and receives the promised reward once. Wrong targets, missing items, and expired uncommitted requests consume nothing.
- Double clicks, two sessions, dropped responses, delayed events, reconnects, and server restarts cannot repeat consumption or payment, lose earned entitlements, or release funding before qualifying events are reconciled.
- A concurrent gift or farming action competing for the same last item yields one valid inventory outcome without a negative balance.
- Schedule boundaries, late acceptance, ready rewards after reset, withdrawal and reacceptance, pauses, and edited future schedules follow the specified rules.
- Completion limits honor the JSON-selected wallet or Looper scope across maps, boards, and servers. Ownership changes cannot redirect an existing contract's payout.
- Creator funding exhaustion blocks new acceptance before a promise is made; depletion elsewhere cannot remove an accepted reward.
- Existing story quests, NPC hand-ins, quest journal behavior, gifts, farming, and the event board retain their contracts.
- Desktop and narrow-screen layouts support keyboard navigation, scrolling, a visible hand-in action, and clear pending or failure states.

Measure discovery-to-acceptance, acceptance-to-completion, time spent per request, expired requests, use of upcoming previews, participation across activities, reward issuance, funding failures, and support incidents. Compare these with ordinary map activity and quest participation before choosing targets. High acceptance with high expiry suggests requirements or windows need adjustment; rapid completion from stored goods is valid behavior for item requests. Do not infer acquisition provenance from hand-in records.

The next design checkpoint is validation of the JSON contract against mixed-activity examples, followed by a clickable walkthrough of the board, journal, and generic item hand-in.

## Repository references

- [Current per-map quest module loading](/Users/andredegroot/development/looperlands/server/world-definitions/index.js:5) and [quest ID registration](/Users/andredegroot/development/looperlands/server/js/worlddefinitions.js:8).
- [Existing quest objectives](/Users/andredegroot/development/looperlands/docs/quest-objectives.md:5), including the current transactional limitation at line 32.
- [Event board UI](/Users/andredegroot/development/looperlands/client/js/eventboard.js:34) and [server proximity validation](/Users/andredegroot/development/looperlands/server/js/eventboardcontroller.js:19).
- [Existing board object export](/Users/andredegroot/development/looperlands/tools/maps/processmap.js:530).
- [Garden configuration and crop rules](/Users/andredegroot/development/looperlands/tools/maps/README.md:73).
- [Gameplay activity metadata and durability limits](/Users/andredegroot/development/looperlands/docs/event-tracking.md:15).
- [Farming transaction contract](/Users/andredegroot/development/looperlands/docs/farming-transactions.md:5).
- [Event item reward policy](/Users/andredegroot/development/looperlands/docs/event-toolkit-guide.md:96).
- [Gifted goods and quest progress](/Users/andredegroot/development/looperlands/docs/social-chat.md:60).
