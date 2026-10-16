# Field Guide

Open the **Journal** from the existing quest-book button on the HUD. It contains **Quests** and **Field Guide** tabs. **X** opens the quest view; **J** opens Field Guide directly. The guide is not part of Settings. Quests retain the existing quest API, statuses, descriptions, and objective progress, with filters for In progress, Completed, and All quests.

Items, Fish, and Monsters use the Inventory panel's copper raster frame, compact sprite slots, yellow headings, parchment entry details, and original red close sprite at 32px inside a 44px interaction target. Chat shares the same frame, title plaque, and smaller close control.

The guide follows the player's current map and shows its name, all published entries, discovered and completed totals, and a pinned discovery reminder. It has no map selector, search, or status filter. Keyboard focus stays inside the guide; Escape closes it. Narrow screens stack the three categories.

## Progress and visibility

Discovery and completion are separate lifetime facts for each Looper. Facing a monster reveals it; normal defeat credit completes it. Receiving a fish reveals it, while a successful personal catch completes it. An ordinary Obtain entry accepts purchases and gifts. A Loot entry requires an item dropped by a defeated monster. Consuming, selling, or gifting an item never removes completion.

Unknown entries show question marks and approved hints. Secret entries are omitted from guide responses and standard totals until discovered; they remain bonuses after discovery. Excluded entries and unconfigured runtime content never appear or count. A new runtime asset is not automatically published in the guide.

`server/field-guide.json` owns the catalog. Version 1 provides authored starter collections for `main` and `cobsfarm`; other maps open with **No entries published** until their collections are authored. Main currently has no fishing tiles, so its Fish section is empty. Cob's Farm entries reference its actual pond and bathtub species. Add a map entry with an edition ID and an entries array. Each entry needs a stable ID, category (`items`, `fish`, `monsters`), runtime target, sprite name, name, hint, visibility (`listed`, `unknown`, `secret`, `excluded`), and completion rule (`obtain`/`loot`, `catch`, or `defeat`, respectively).

Reusing an entry ID shares its lifetime progress across map collections, while each map keeps independent membership and totals. Shared definitions must agree on target, category, completion, and visibility. Keep published IDs and requirements stable. Additional edition archives, event collections, rewards, repeat-count mastery, and a graphical authoring tool are later work.

## Persistence and deployment

Deploy the companion platform migration and API first, then add `game_data_write_field_guide` to the existing game-server API token. Reads retain `game_data_read`. The new platform table stores per-Looper facts independently of quest choices and supports concurrent, idempotent inserts. The game server uses:

- `GET /api/game/asset/{nftId}/field-guide` → `{facts: string[]}`.
- `POST /api/game/asset/field-guide` with `{nftId, facts: string[]}` → `{accepted: string[]}`. Only explicitly acknowledged facts leave the outbox.
- The browser calls only `GET /session/{sessionId}/field-guide` for the current map; the live actor is validated before and after asynchronous reads. The response omits secret metadata and runtime IDs for unknown entries. Older clients can still request a previously visited map through the optional API map parameter.

Set `FIELD_GUIDE_SPOOL_PATH` to a durable, process-specific file. Its default is `data/field-guide/pending.json`. Docker Compose keeps it in each server's existing activity volume. Local writes use atomic replacement and file sync; failed or uncertain platform writes stay queued and retry. Preserve a corrupt outbox for repair; the guide reports unavailable rather than empty progress. Stop the process before repairing its outbox. Do not share one file between processes.

The platform's companion backfill migration `Version20261016200000` recovers supported per-avatar kills, past acquisitions, and recorded catches for catalog version 1 from historical game events. It preserves items that were later used or sold. Generic historical loot proves acquisition, not a monster-drop source or a personal catch. Activity can recover a visited map; legacy logs without maps cannot. The migration scans history once; guide reads use persisted facts. Future catalog additions need their own historical mapping.

The guide loads these saved facts on entry and reconciles current inventory and existing kill totals. Unrecorded encounters, catches, acquisition sources, quantities, and dates are not invented. Free-to-play progression remains in the active session and is labelled accordingly. Facts follow the Looper when its owner changes.

Legacy inventory awards and guide writes are separate operations. This feature does not make them one platform transaction; a hard crash between gameplay and outbox recording can still lose a new catch/encounter fact. Verified inventory and kills can repair the corresponding unrestricted entries. Raw game assets and runtime catalogs remain inspectable; spoiler protection applies to guide responses, not all downloadable game files.

## Local validation

Run focused Jest tests for `fieldguide`, fishing, combat, social chat, app, and keyboard handling, then `node bin/build-client.js`.

`NPC_PREVIEW_PORT=8038 NPC_PREVIEW_FIXTURE_PORT=3038 NPC_PREVIEW_DATA_DIR=/private/tmp/looperlands-field-guide-preview node bin/local-npc-preview.js` starts a game session against local fixture APIs. It uses the production guide endpoint, rendering, gameplay hooks, and durable outbox. Platform calls in this preview go to local fixture storage. The backend PR separately tests its PostgreSQL migration and concurrent persistence against a local database.
