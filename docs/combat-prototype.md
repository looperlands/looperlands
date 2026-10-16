# Charged attacks, counters, and kill streaks

Normal gameplay enables the new combat automatically. Almost all mobile hostile mobs mix their ordinary attacks with a direction-locked charged lunge. This includes Lavaland spectres, eyes, death knights, and ordinary bosses. Friendly entities, both tentacles, the stationary sea creature, Megamag, Slime King, Cobogre, timed AoE, and active scripted/add encounters retain their existing mechanics. Boss rewards and on-death AoE alone do not exclude a mob. New ordinary mob types qualify by default.

After an initial 1.2–3 seconds, an eligible normal attack has a 50% chance to charge, with a 3–6-second cooldown before another roll. A 650–950 ms warning marks two tiles, with a charge bar, pulse and sparks. The mob then lunges for 180 ms and recovers for 1.5 seconds. Standing in the marked lane takes four times its calculated normal melee damage. Only one mob charges a given player at a time. Nearby players also see the telegraph.

A successful sidestep opens a 1.25-second counter window. Once adjacent and finished moving, the player automatically strikes the evaded mob for 1.5× base melee damage, including the normal attack buff and class modifier. The swing lasts at most 180 ms and preserves the current normal target/attack loop. A counter adds damage only: it does not grant separate XP, stun the mob, lock movement, or trigger a finisher. Normal death, loot and weapon XP handling applies. Server-side range, expiry, target identity and one-use checks validate counters; the client cannot send arbitrary damage or reward amounts.

## Map overrides

The values above are global defaults. [Map-maker settings](mob-charged-attacks.md) override frequency, damage or opt out per mob kind and original spawn. The main map includes slower/weaker skeletons, more frequent Greater Skeletons and ordinary-only rats. Scripted encounter exclusions still apply.

## Kill streaks

Each primary-target kill starts or refreshes a **1.5-second** window. From the second kill onward, normal kill XP gains a **25%, 50%, then capped 75% bonus**. The existing XP handler and popup receive the final amount. Assists do not advance a streak. Each attack can advance it at most once: AoE/cleave splash retains base XP and cannot start or refresh the window, even when splash resolves first. Trainer rounds give no kill rewards.

Milestones use `2x combo`, `3x combo`, etc.; the number counts kills, not an XP multiplier. Text grows 20% per additional kill up to twice the starting size. Nearby praise progresses through Nice!, Great!, Awesome!, Amazing! and Unstoppable!, with a slight delayed tilt and drift. Count colors progress from gold to pink. Counter labels sit close above/right of the struck mob while critical damage sits slightly left; each drifts outward at most four world pixels with a short upward arc. Reduced motion retains spacing without animation.

## Health bars and hit feedback

Only the currently targeted mob shows a compact health bar, including bosses. Optional, backward-compatible damage metadata updates HP immediately. The bar follows player-health feedback: an immediate HP change, white lost-health trail held for 180 ms and settling over 280 ms, immediate healing/max-HP changes, reduced-motion support, and cleanup on despawn or target change. Unknown HP is not guessed.

Confirmed weapon crits, counters, and mob charges that actually remove player HP trigger a 180 ms camera kick, capped at two world pixels. Rapid or simultaneous impacts share a pulse. HUD, cursor, pathfinding and gameplay coordinates do not move. Reduced motion or disabling Camera Shake suppresses shake. Combat info renders above scenery, overhead sprites, lighting, health bars and charge overlays.

## Player display settings

Open **Game Settings (C)** and choose **Combat**, **Display**, **Interface**, or **Audio**. Combat opens first and groups the combat feedback controls; Effect Timers lives under Interface alongside name labels, Instructions and Map. Switching sections retains pending choices, and Save Settings saves all sections together. Preferences are stored per browser. **Mob Health Bars**, **Hit Target Indicator**, **Damage & Healing Numbers**, **XP Popups**, **Combo & Counter Messages**, **Combo Praise (Awesome, etc.)**, **Camera Shake**, and **Effect Timers** each have their own saved checkbox. Save Settings applies the changes immediately; disabling a display does not change targeting, HP, XP rewards, automatic counters or the fixed 1.5-second kill window. Effect Timers hides the active-effect countdowns while retaining effect labels and consumable cooldowns; effects still expire normally. Praise only appears when combo messages are enabled. Emotes and fishing messages retain their existing controls.

The existing **Combat & Tool Impact Effects** checkbox controls hit bursts and recoil. Every new option defaults to On, including Camera Shake, while explicitly saved preferences are preserved. OS reduced motion continues to suppress motion.

Charged-attack ground warnings and the charge cue remain visible. Lunge and Slam mark their tiles with a faint gold fill and short corner marks, leaving the center clear instead of drawing a boxed X. They strengthen toward impact while retaining the same tile coverage and timing.

## Runtime and compatibility

`server/js/combatcontroller.js` owns normal combat. `server/js/main.js` installs it per world and binds authenticated players; it runs on the existing world tick. Updated clients register after WELCOME. Older clients continue through ordinary movement/attack handling without receiving unrenderable specials. Combat works independently of ambience configuration and has no production training toggle.

Completed-tile reports retain speed, terrain, corner and stale-generation checks. The next tile is reserved against lunges. Zone changes immediately publish newly relevant entities, so mobs stay visible while travelling. Normal targeting, activity tracking and HP regeneration continue. Valid same-map teleports cancel pending attacks, clear the streak and rebase movement at the accepted destination while keeping combat active. Rejected doors do not reset it. Death, disconnect and map changes clean up pending attacks. Repeated packets do not replay damage, XP or shake; unchanged state is deduplicated with a one-second clock heartbeat.

## Local validation and practice trainer

Build with `node bin/build-client.js`.

- **Normal gameplay using fixture storage:** `COMBAT_LIVE_PREVIEW=1 node bin/local-combat-preview.js`. Open <http://127.0.0.1:8021/__combat_preview/play>. Charged attacks and streaks are active immediately; there is no Lunger or Combat toggle.
- **Practice trainer:** `node bin/local-combat-preview.js`, then open the same URL and enable **Combat** beside Day / Night / Cycle. The trainer mixes two normal swings with a fixed 850 ms charge. Its name includes its level. Fixed practice values: 160 mob HP, 6 basic damage, 22 counter damage, and 8%/24% player max-HP damage for normal/charged hits; trainer damage stops at 1 HP. Reset restores the local encounter. Teleporting ends practice without restoring old HP or position. This controller is never installed by the production entry point.

Both runners bind to loopback, isolate temporary progress, and send backend writes to a local fixture API. The fixture uses a level 30 avatar and level 24 sword. Override `NPC_PREVIEW_PORT`, `NPC_PREVIEW_FIXTURE_PORT`, and `NPC_PREVIEW_DATA_DIR` for concurrent instances. `/preview/state` reports attacks, counters, streaks, XP, player coordinates and corrections for validation.
