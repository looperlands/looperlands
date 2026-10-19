# Player and equipped-item cards

The production client loads `progressioncards` through `app`. Player and weapon HUD icons and the existing B/V keyboard and gamepad shortcuts toggle the corresponding card. Cards start closed and remain open during movement/combat. The player card retains all class modifiers, companion progress and buff details; the equipped-item card retains projectile selection and supports weapons and tools. Details use a short tilt/fade. Inventory/settings hide the deck. Escape closes both cards.

A confirmed same-asset level increase opens only the affected cards. Cards enter from the right, receive pixel motes from the world character, fill to 100%, reveal the new level and banner with a pixel burst, then reset to actual overflow progress. An icon travels back to the HUD and is removed when its animation finishes. Total duration is roughly 2.5 seconds, with an 85 ms stagger and small timing jitter. Existing world level-up effects remain; companion level-ups retain their compact notification.

A card opened only for the celebration closes afterward. Previously open cards remain open. Explicitly opening or inspecting a temporary card keeps it open, including during its exit. Overlapping celebrations restart using current state and preserve manual visibility. Death, map/session changes, hidden tabs and destruction cancel effects; map/session changes and death close cards. Animation never gates gameplay or authoritative updates. Existing sound, effects, XP-popup and reduced-motion preferences apply.

The existing `/session/:sessionId/statistics` response adds `experience`: cumulative `{id,type,xp}` snapshots for avatar, equipped NFT weapon/tool, and companion. Only server-cached authoritative totals are used, including unsynced combat XP and persisted farming receipts. No reward endpoint or new persistence path is added.

Positive deltas show `+N XP`, `+N Tool XP` or `+N Companion XP` above the player. **Floating weapon XP messages are deliberately omitted**; weapon XP and level-up cards still update. Initial loads and newly equipped assets establish silent baselines. Repeated/stale lower XP totals do not create duplicate labels. XP within a readback interval coalesces per asset; it is not attributed to an individual source. Ordinary XP does not auto-open cards.

Combat, quests and fishing refresh statistics through existing handlers; quest completion now also refreshes statistics. A non-overlapping read every two seconds while active and visible catches other award sources, including farming. Late statistics from a departed map, session, player or equipment are discarded. Projectile controls are only rebuilt when their equipment or selection changes, preserving focus during ordinary refreshes.

## Validation

`npm test -- --runInBand client/js/progressioncards.test.js client/js/game.levelup.test.js server/js/ws.statistics.test.js client/js/app.levelup.test.js bin/build-client.test.js`

From `bin/`, `bash build.sh` verifies packaging and entry/worker/dynamic-import assets. Local fixture gameplay verifies production startup, quest XP feedback, level-up cards and temporary-card cleanup; the fixture harness and test reward controls are not shipped.
