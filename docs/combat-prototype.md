# Local combat prototype

Build the client with `node bin/build-client.js`, then run `node bin/local-combat-preview.js`.
Open <http://127.0.0.1:8021/__combat_preview/play>. The dedicated runner binds to loopback, uses a separate temporary data folder, and sends all backend writes to the local fixture API. Override `NPC_PREVIEW_PORT`, `NPC_PREVIEW_FIXTURE_PORT`, and `NPC_PREVIEW_DATA_DIR` to run another instance.

The combat fixture starts a level 30 avatar with a level 24 speed sword near ordinary mobs, so streaks are practical to test.

Click **Combat off** beside Day / Night / Cycle to turn it on. This moves your avatar to a nearby clear patch and creates one training ogre. **Reset** restarts the encounter. Switching combat off removes it and restores your original position and health (unless that position is occupied). The compact controls stay in one row at desktop widths.

## Mixed attacks and the counter opening

- Move with WASD, arrows, click-to-move, or touch dragging.
- The ogre follows and faces you, makes two normal swings, then charges a heavy lunge. The charge has a growing pulse, rising sparks, a progress bar, and two marked danger tiles.
- Its direction locks for the 850 ms charge and lunge. Sidestep; stepping backwards along the marked lane remains unsafe.
- After evading, press **Space** (gamepad **A**, or the on-screen **Counter** button) while adjacent to counter, then press again for **Finisher**. Holding Space does not execute both actions.
- The counter opening lasts 1.25 seconds; the finisher follow-up lasts 1.1 seconds. Finisher commits you for 380 ms and staggers the ogre.
- Click other mobs to fight them normally between attacks. Space still engages an ordinary target when no usable counter/finisher opening exists. Click the ogre to return to training attacks.
- Victory or losing the practice round automatically resets the trainer after two seconds, without moving or interrupting the player. The actual avatar remains visible throughout.

Training uses fixed damage for the feel test: basic player hit 6, counter 22, finisher 44, trainer health 160. Normal ogre swings cost 8% of maximum player health; a charged lunge costs 24%. Trainer hits cannot lower health below 1. Trainer rounds grant no drops; landing Counter → Finisher awards 25 bonus XP through the normal experience handler. Ordinary mobs keep their normal combat and reward behavior against the local fixture backend.

## Multi-kill combo

The counter/finisher is an attack sequence. The **kill streak** rewards quickly defeating different mobs: each normal mob killed by the player opens or refreshes a **2.5-second** window. The second kill earns **25% bonus XP**, the third **50%**, and the fourth and later kills **75%** (the cap). Bonus XP is calculated from the player's normal XP share, credited through the normal experience handler, and included in the existing kill XP popup. Trainer resets and assists do not count as streak kills. Each swing can advance the streak only once: only its directly targeted kill earns a streak step and bonus XP. AoE/cleave splash kills retain their normal XP, even when they die before the primary target; splash kills alone do not start or refresh the streak.

Streak milestones, counter openings, and the finisher's 25 XP award use the existing animated combat-info text. There is no separate KILLS/HASTE label or countdown. The previous haste reward has been replaced by XP. All rewards in this local preview use the fixture backend; these values are for feel testing, not final balance.

The local server owns phases, windows, damage, streaks, and cooldowns. Movement reports every completed tile (including multiple tiles in a slow frame) and reserves the next tile against trainer movement. Bounded elapsed-time credit handles batched steps while retaining speed, terrain, trainer occupancy, and diagonal-corner checks. Ordinary actors use the existing client pathfinding collision rules because their server coordinates represent path destinations, not current visible tiles. Corrections invalidate old pathfinding replies and queued movement generations. Normal attacks against other mobs keep using the existing combat path. The module is installed only when the dedicated local runner enables `COMBAT_PREVIEW`; production connections never register its Socket.IO event.

The fixture's `/preview/state` endpoint includes combat phases, streaks, XP bonuses, correction counts, and cumulative evade/counter/finisher/hit counts. Switching off or disconnecting removes the trainer and cancels pending attacks. Equipment balance, more enemy patterns, PvP, and remote-latency tuning are outside this prototype.
