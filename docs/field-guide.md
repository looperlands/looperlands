# Field Guide

Open the **Journal** from the existing quest-book button on the HUD. It contains **Quests** and **Field Guide** tabs. **X** opens the quest view; **J** opens Field Guide directly. The guide is not part of Settings. Quests retain the existing quest API, statuses, descriptions, and objective progress, with filters for In progress, Completed, and All quests. Their parchment rows slide in, valid medal artwork returns, and supported quest targets animate using their idle frames. Missing or unsupported medals are omitted; reduced-motion preferences disable animations.

Items, Fish, and Monsters use the Inventory panel's copper raster frame, compact sprite slots, yellow headings, parchment entry details, and original red close sprite at 32px inside a 44px interaction target. Chat shares the same frame, title plaque, and smaller close control.

The guide follows the player's current map. Discovered and completed totals sit beside the Journal tabs; a pinned discovery reminder keeps its map label. It has no map selector, search, or status filter. Keyboard focus stays inside the guide; Escape closes it. Narrow screens stack the three categories.

## Progress and visibility

Discovery and completion are separate lifetime facts for each Looper. Facing a monster reveals it; normal defeat credit completes it. Receiving a fish reveals it, while a successful personal catch completes it. An ordinary Obtain entry accepts purchases and gifts. A Loot entry requires an item dropped by a defeated monster. Consuming, selling, or gifting an item never removes completion.

Unknown entries show question marks and approved hints. Secret entries are omitted from guide responses and standard totals until discovered; they remain bonuses after discovery. Excluded entries never appear or count.

The game builds map membership once at startup from the actual server/client map exports: roaming and placed mobs, their positive-chance drops, chests, fishing-tile lake species, harvest yields/rare drops/returned seeds, and rewards from quests available at that map's NPCs. Boss adds are included. Pickup variants that award the same inventory item share one entry. Main has no fishing tiles, so its Fish section is empty. Maps remain separate.

NPC dialogue commands are shared between client and server through `shared/js/npctalk.js`. The guide loads each map's actual shop stock through the existing platform shop API, caches it for five minutes, and shares concurrent loads. An unavailable shop read fails the guide refresh rather than silently showing an incomplete catalog. Runtime assets without local artwork retain a question-mark fallback.

`server/field-guide-overrides.json` contains only exceptions to generated defaults, keyed by the runtime target. Each value may override `id`, `name`, `sprite`, `hint`, `visibility`, or `completion`; omitted properties are inferred from game data. Map membership, category and target are always derived. For example, `"boss": {"visibility": "secret"}` hides a boss until discovery. Invalid targets, properties and completion rules are rejected when the factory is created. Overrides apply consistently wherever the target occurs; they do not add a target to an unrelated map. New map content is included automatically as unknown by default. Use `listed`, `unknown`, `secret`, or `excluded` visibility and `obtain`/`loot`, `catch`, or `defeat` completion for items, fish, and monsters respectively. Keep published IDs stable.
Reusing an entry ID shares its lifetime progress across map collections, while each map keeps independent membership and totals. Shared definitions must agree on target, category, completion, and visibility. Keep published IDs and requirements stable. Additional edition archives, event collections, rewards, repeat-count mastery, and a graphical authoring tool are later work.

## Persistence and deployment

Deploy the companion platform API and migrations, including the additive automatic-catalog backfill `Version20261016210000`, first, then add `game_data_write_field_guide` to the existing game-server API token. Reads retain `game_data_read`. The new platform table stores per-Looper facts independently of quest choices and supports concurrent, idempotent inserts. The game server uses:

- `GET /api/game/asset/{nftId}/field-guide` → `{facts: string[]}`.
- `POST /api/game/asset/field-guide` with `{nftId, facts: string[]}` → `{accepted: string[]}`. Only explicitly acknowledged facts leave the outbox.
- The browser calls only `GET /session/{sessionId}/field-guide` for the current map; the live actor is validated before and after asynchronous reads. The response omits secret metadata and runtime IDs for unknown entries. Older clients can still request a previously visited map through the optional API map parameter.

Set `FIELD_GUIDE_SPOOL_PATH` to a durable, process-specific file. Its default is `data/field-guide/pending.json`. Docker Compose keeps it in each server's existing activity volume. Local writes use atomic replacement and file sync; failed or uncertain platform writes stay queued and retry. Preserve a corrupt outbox for repair; the guide reports unavailable rather than empty progress. Stop the process before repairing its outbox. Do not share one file between processes.

The platform's original backfill `Version20261016200000` covers the starter collection. The additive migration `Version20261016210000` recovers supported per-avatar kills, past acquisitions, and recorded catches from historical game events using a frozen snapshot of registered non-NFT mobs, inventory items, and fish (including potential shop stock). Generate that snapshot with `node bin/export-field-guide-backfill.js`; the platform migration never reads a mutable game checkout. It preserves items that were later used or sold. Generic historical loot proves acquisition, not a monster-drop source or a personal catch. Activity can recover a visited map; legacy logs without maps cannot. The migration scans history once; guide reads use persisted facts. New runtime target IDs introduced after that snapshot need a later backfill; adding existing targets to another map reuses their lifetime facts.

The guide loads these saved facts on entry and reconciles current inventory and existing kill totals. Unrecorded encounters, catches, acquisition sources, quantities, and dates are not invented. Free-to-play progression remains in the active session and is labelled accordingly. Facts follow the Looper when its owner changes.

Legacy inventory awards and guide writes are separate operations. This feature does not make them one platform transaction; a hard crash between gameplay and outbox recording can still lose a new catch/encounter fact. Verified inventory and kills can repair the corresponding unrestricted entries. Raw game assets and runtime catalogs remain inspectable; spoiler protection applies to guide responses, not all downloadable game files.

## Local validation

Run focused Jest tests for `fieldguide`, fishing, combat, social chat, app, and keyboard handling, then `node bin/build-client.js`.

`NPC_PREVIEW_PORT=8038 NPC_PREVIEW_FIXTURE_PORT=3038 NPC_PREVIEW_DATA_DIR=/private/tmp/looperlands-field-guide-preview node bin/local-npc-preview.js` starts a game session against local fixture APIs. It uses the production guide endpoint, rendering, gameplay hooks, and durable outbox. Platform calls in this preview go to local fixture storage. The backend PR separately tests its PostgreSQL migration and concurrent persistence against a local database.
