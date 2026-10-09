# Linked tile-action tools

The shared kind registry in `shared/js/gametypes.js` tags inventory tools and links their animation sprite. Keep the existing base type so pickups and saved inventory remain compatible:

```js
m88nshovel: [Types.Entities.M88NSHOVEL, "object", false, {
    tags: ["tool"], toolType: "shovel", animationSprite: "tool-shovel"
}]
```

`Types.isTool` recognizes tagged items, fishing rods and explicit tool kinds. Inventory groups tagged items in **Tools** beside fishing rods, with their existing icon, count and tooltip, instead of duplicating them in **Items**. Inventory tools do not gain a combat-equip or consume action. The `false` metadata slot preserves their non-NFT classification. `Types.getToolAnimationSprite` reads the same metadata on the server; there is no separate mapping list.

Stages keep their existing `requirements.tool`, `playAnimation` and `duration` fields. The existing farming definitions therefore need no changes. Tools are required inventory items, not consumed or equipped weapons. Their linked sprites replace only the rendered weapon during the action. Other tools may link existing weapon sprites, including registered NFT weapon sheets; the sprite must be loaded by the client. Register new static sprites in `client/js/sprites.js` and `Game.spriteNames`.

`POST /session/:sessionId/tileStage/start` validates the active session, map, adjacent tile, current stage, tool ownership and required level. The server selects the sprite, facing and duration; the client cannot supply those. Nearby players receive `TILE_ACTION` (65), excluding the initiating player, whose animation comes from the HTTP response. A per-actor cooldown prevents repeated start broadcasts during the approved duration. This is transient presentation, not a persisted action or a new inventory transaction.

After the animation completes, the existing `/tileStage/execute` performs its normal authoritative checks and item/reward changes. Starting the animation does not reserve a plot or guarantee that execution succeeds. Moving, dying, changing maps, disconnecting or replacing the current animation cancels the local action and restores the tool override without executing it. Nearby observers also clear the override on movement, removal, animation changes or timeout. Late arrivals do not replay an earlier animation. An unlinked tool or missing/incompatible sprite falls back to the equipped weapon.

Linked sheets use the standard weapon layout: five attack frames, right/up/down directions (left mirrors right), 48x48 frame size, and offsets -16/-20. They also include directional idle/walk rows. Actions without a required tool retain their equipped weapon appearance; planting and fertilizer application keep their existing behavior.

## Artwork and preview

Scouted 1,489 local registered weapon sheets. Existing assets provide axes, mallets, swords and other weapons, but no suitable shovel/watering-can pair was found. Inventory `item-m88nshovel` and `item-m88nwatercan` contain only static 16x16 icons. The new sheets were generated using the built-in imagegen tool with those icons and the existing `axe.png` as references. Original assets were preserved.

Final assets: `client/img/{1,2,3}/tool-shovel.png` and `tool-watering-can.png`; metadata: `client/sprites/tool-shovel.json` and `tool-watering-can.json`. `tools/sprites/pack-tool-sheets.py` packs generated five-column, three-direction artwork into the standard nine-row weapon layout, preserves alpha and uses nearest-neighbor resizing. Pillow is required only to repack artwork, not to run the game.

Serve the repository root and open `/tools/sprites/preview-tool-sheets.html` to inspect all directions and individual frames alongside the existing character. This is an artwork preview, not a gameplay fixture.

Exact generation prompts are retained in [tool-sprite-generation.md](tool-sprite-generation.md).

## Verification

```sh
node_modules/.bin/jest --runInBand --coverage=false client/js/tileactions.test.js client/js/farmingvisuals.test.js server/js/tileactionanimation.test.js server/js/message.protocol.test.js server/js/tileactionscontroller.test.js server/js/tileactionsconfig.test.js client/js/inventorytools.test.js client/js/app.test.js client/js/toolimpactfeedback.test.js client/js/render-extensions.test.js server/js/tilestage.routes.test.js server/js/dao.inventoryqueue.test.js
node bin/build-client.js
```

Ship the server, protocol, client build and sprite images together.

## Tool impact particles

Tool metadata can declare `impactFeedback` alongside `animationSprite`:

```js
impactFeedback: {
    impactFrame: 3, // zero-based character attack frame
    colors: ["#895737", "#b37b4e", "#d5ad75"],
    count: 8,
    lifetimeMs: 450,
    speed: 22,     // native map pixels per second
    gravity: 95    // native map pixels per second squared
}
```

The server-approved animation packet includes the affected tile and tool effect configuration. The same client subsystem handles local and nearby actors. It emits once when each swing reaches the contact frame, using the actual animation frame rather than an independent timer. Dirt and water use different palettes and physics; rendering uses small pixel rectangles and needs no image assets. An unconfigured tool emits nothing.

Particles use map coordinates and the renderer's foreground extension, so they follow camera movement and display scale. Counts are bounded to 16 per burst, 64 active emitters and 192 live particles. Interruption removes the actor's particles immediately; completion lets the last burst fade. Map/session changes, disconnects and death clear old effects. The existing setting is labelled **Combat & Tool Impact Effects** and retains its saved preference; reduced motion also suppresses particles. The sprite preview includes particles and a frozen contact-frame view.

## Farming reliability

Start and execute requests carry the expected stage key and a persistent coordinate revision. Revision tombstones survive harvest, so an old request cannot affect a newly planted crop at the same position. The animation does not reserve the plot; execution rechecks the authoritative state.

The default runtime uses the platform farming transaction API. Plot state, item debits/rewards, XP, event logs, revision and a durable receipt commit in one PostgreSQL transaction. A deterministic request ID identifies the avatar, coordinate, revision, action and selected item. Retrying a lost response returns the original receipt, including the original harvest roll. Receipts survive game-server and platform restarts. The generic inventory writer uses arithmetic database updates and the same asset lock, preventing concurrent item changes from replacing an old snapshot.

Map hydration shares an in-flight load and retries after errors. Growth visuals derive from timestamps and never save whole plots. State lookups refresh the coordinate revision and publish changes from another game worker. Farming also serializes execution per avatar and plot within a worker. Its dedicated inventory request drains earlier queued loot and holds later changes until the receipt arrives. Persisted farming XP is not queued again.

The platform must be migrated and deployed before this game version. Missing or failed atomic endpoints fail closed. `LOOPERLANDS_ATOMIC_FARMING=0` explicitly selects the older, single-worker recovery path; its recovery records remain in memory and it does not provide durable transaction guarantees. Coordinates claimed by the atomic API reject legacy plot writes, even when empty. See [farming-transactions.md](farming-transactions.md) for rollout and test details.

Client optimistic rollback checks the tile revision, map and session before restoring earlier graphics. Open item pickers cannot submit in a different map/session. Network callbacks retain the receiving game instance. Missing staged tile groups are logged without crashing. Disconnect rendering and a delayed handshake tolerate a removed player. Stage lookup rejects expired or mismatched sessions and returns an HTTP error when loading fails.
