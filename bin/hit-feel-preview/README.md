# Hit feel preview

## In-game preview

Build the actual client with `node bin/build-client.js`, then start `node bin/local-hit-feel-game-preview.js`. Open <http://127.0.0.1:8052/__combat_preview/play> for a fresh local session. This uses the real client, renderer worker, map, mobs, authoritative combat controller and isolated fixture backend. Click a mob or use T then Space to engage. Open **Settings → Combat** (C) to control camera shake and finisher shatter or opt into Arcade intensity.

Balanced effects are enabled in ordinary game sessions without a preview flag. Flash, squash, slash arcs, recoil, hit-stop, sparks and layered audio are built in, without individual settings toggles. Obsolete per-layer preferences are ignored. Finisher shatter and camera shake default on and preserve saved opt-outs; Arcade intensity defaults off. The overall effects, audio and reduced-motion settings remain authoritative. Existing damage text and health trails are reused. Contact pose holds affect the render payload only, with no animation callback delays or movement/network pauses. Shatter requires a recent confirmed lethal HP update and draws at most 64 fragments per sprite. Developer controls are confined to the standalone comparison page.

Camera shake is reserved for confirmed kills, critical hits and successful counters. Normal hits keep the camera steady. Overlapping qualifying hits share one pulse capped at 150 ms, including AoE and duplicate counter/kill notifications.

## Standalone comparison

Run `node bin/local-hit-feel-preview.js` and open <http://127.0.0.1:8051>.
Set `HIT_FEEL_PREVIEW_PORT` to use another port. The server binds to loopback and serves only preview assets; it does not start a game server or write player data.

Space/click strikes, C produces a critical hit, F a finisher. Repeat alternates in a critical every third hit and a finisher every sixth hit. Slow motion runs at quarter speed. Sound is opt-in and plays the existing hit1/hit2 samples once per simulated confirmed impact. Layered audio adds a synthesized bass transient and combo pitch increments of 6%, capped at 24%. The baseline is a recreation of the checked-out 75 ms hurt flash, 2 px recoil, 220 ms pixel burst and critical-only shake, not a capture of the live renderer. The enhanced version offers independent flash, particles, recoil, shake, hit-stop, squash, slash arc, health trail, layered audio and pixel-shatter toggles, with Subtle/Balanced/Arcade presets. Reduced motion preserves flash, health feedback and damage labels while removing spatial effects and hold.

Inspired by the linked Instagram tutorials: <https://www.instagram.com/p/DemDNnfj1TW/> and <https://www.instagram.com/p/DejijtPzhYJ/>. The second reference adds squash, layered combo audio, slash arcs, delayed white health-bar trails and finishers; its 3D shatter is adapted here to sprite fragments. Uses existing LooperLands sprites, fonts, audio and the retained town tile extract. No remote asset requests or dependencies.

## Integration boundaries

- Feed effects from confirmed positive damage, as `client/js/combatfeedback.js` already does. Do not emit on a swing, miss, or rejected hit.
- Extend the existing presentation recoil and worker draw payload. Keep entity coordinates, collision, pathing, authoritative HP, input and networking running normally.
- Hold only the attacker/target animation pose briefly; do not pause the game loop or sockets. Avoid camera-wide freezes in multiplayer.
- Keep global effects, camera shake, reduced-motion and audio settings authoritative. Prefer subtle normal hits and stronger critical feedback; verify combat readability with multiple players and area attacks.
- This sandbox does not establish gameplay correctness, production performance, or multiplayer behavior. No runtime files are modified by it.

Validate timing: `npm test -- --runInBand bin/hit-feel-preview/impact.test.js`.
