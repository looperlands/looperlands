# Space Owls arcade integration

## In-game preview

Run `node bin/build-client.js`, then `node bin/local-arcade-world-preview.js` and open http://127.0.0.1:8027/arcade-play.
This runs the real LL client and `m88n2` world, with a fixture avatar spawning just below the cabinet in Lunaria. Walk up to the cabinet beside the satellite dish and click **play**. The platform API is a local fixture; no production wallet, currency, inventory or progress is changed. Use the `/arcade-play` link for a fresh session instead of refreshing an expired session URL. `ARCADE_WORLD_PORT` and `ARCADE_FIXTURE_PORT` default to 8027 and 3027.

The avatar dissolves into pixels before the arcade opens, and materializes beside the cabinet when you return. Reduced motion uses a short fade. Opening clears held keyboard/touch input, stops movement and disengages the current target. Closing rearms the cabinet without walking away. Death, disconnection and map loading close the iframe and cancel the arcade effect.

## Standalone preview

Run `node bin/local-arcade-preview.js`, then open http://127.0.0.1:8026/arcade-preview/.
Set `ARCADE_PREVIEW_PORT` to choose another port. The server binds only to loopback and serves the client assets plus this preview; it does not connect to the LL backend.

Choose Explorer, Ranger, or Knight, then click the cabinet or **Enter the arcade**. The avatar transitions into the cabinet, appears in Space Owls, and returns when you press Escape or **Return to world**. Use left/right arrows and Space, or the touch buttons. Scores are local to this browser and appearance; no score is verified and no currency or inventory is changed.

## What this proves

- Real Space Owls gameplay adapted from the M88N Labs game provided by the user.
- The same sprite outside and inside the game; static scaled sheets and dynamic 1x NFT sheets are supported by the host adapter.
- A narrowly scoped entry in the existing `loadMinigame` function.
- Same-origin iframe handshake passes name, sprite URL, frame metadata, and muted preference. It does not pass the LL session, wallet, NFT identifier, inventory, or raw player object.
- Closing removes the iframe, its animation loops, input handlers and audio. Parent mini-game state, focus, previous mini-game content, and enabled world music are restored.
- Failed loads leave the return control available. Messages are accepted only from the expected frame and origin.

## Use from a map

Add a Tiled trigger with custom property `minigame = spaceowls`. The existing LL map-trigger path calls `loadMinigame('spaceowls', game)` and the adapter takes the current `game.player` armor sprite. The cabinet from the supplied screenshot is placed in `m88n2` / Lunaria: trigger 2071 covers the walkable tiles x=91, y=30–31 in front of the cabinet. The Tiled source and client JSON/JS and server JSON exports include this trigger. Only the trigger arrays changed in the generated map exports. The standalone backdrop remains the supplied screenshot; the in-game preview uses the real map. No production deployment is part of this change.

The new runtime files must accompany the client: `js/arcade.js`, `css/arcade.css`, and `apps/spaceowls/`. Existing JackAce and LuckyFUNKZ loading paths are unchanged.

## Scope and limits

The in-game preview uses a local LL session and a bundled fixture avatar. Production authentication and remote dynamic NFT image loading still need release-environment validation. The adapter captures mini-game input; it does not pause the world or provide server-side invulnerability. The dissolve is local presentation only; other players still see the avatar at the cabinet. Portrait touch controls work, but landscape gives the wide arena more room.

The iframe is locally bundled, reviewed game code on the LL origin; it is an input/lifecycle boundary, not a sandbox for arbitrary third-party pages. Do not replace it with a remote URL or give it LL credentials.

Wagers, item stakes, verified shared leaderboards, durable run records, payout accounting, and anti-cheat are outside this proof of concept. Browser result messages are explicitly marked `verified: false` by the host and are display-only. Local scores are keyed by sprite URL, not unique player identity.

## Validation

`npx jest client/js/arcade.test.js client/apps/spaceowls/script.test.js client/js/game.arcade.test.js client/js/renderer.dissolve.test.js --runInBand --coverage=false`

Focused checks cover map source/export agreement and walkable entrance tiles, prompt reopening and load failure recovery, dissolve lifecycle and reduced motion, credential-free appearance snapshots, scaled and NFT sprite metadata, unavailable avatars, sound preference, frame/origin filtering, real game-engine scoring, one result per completed run, and restart. The real local-world browser check covers walking to the cabinet and opening the arcade with that session's avatar. Standalone browser checks cover two avatar choices, entry, shooting with a visible score increase, Escape/return, reopening, desktop canvas fit, portrait touch controls, and directional keyboard focus entry. Browser console checks were clean during these runs. Screenshots are in `output/arcade-preview/`.

The original engine was adapted to refresh the score on each kill, end a run when invaders breach the player line, cap elapsed-frame movement, release held keys on blur, tolerate unavailable local storage, and escape leaderboard names. Every run uses the same 40×44 collision box regardless of avatar appearance.
