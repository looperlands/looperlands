# Local combat prototype

Build the client with `node bin/build-client.js`, then run `node bin/local-combat-preview.js`.
Open <http://127.0.0.1:8021/__combat_preview/play>. The dedicated runner binds to loopback, uses a separate temporary data folder, and sends all backend writes to the local fixture API. Override `NPC_PREVIEW_PORT`, `NPC_PREVIEW_FIXTURE_PORT`, and `NPC_PREVIEW_DATA_DIR` to run another instance.

The combat fixture starts a level 30 avatar with a level 24 speed sword near ordinary mobs, so streaks are practical to test.

Click **Combat off** beside Day / Night / Cycle to turn it on. This moves your avatar to a nearby clear patch and creates one training ogre. **Reset** restarts the encounter. Switching combat off removes it and restores your original position and health (unless that position is occupied). The compact controls stay in one row at desktop widths.

## Mixed attacks and the counter opening

- Move with WASD, arrows, click-to-move, or touch dragging.
- The Lunger nameplate shows the ogre’s actual level throughout its attack phases. The ogre follows and faces you, makes two normal swings, then charges a heavy lunge. The charge has a growing pulse, rising sparks, a progress bar, and two marked danger tiles.
- Its direction locks for the 850 ms charge and lunge. Sidestep; stepping backwards along the marked lane remains unsafe.
- After a successful sidestep, one **automatic counter** hits the mob while adjacent. It waits for movement to finish naturally and uses a fast swing (180 ms maximum), then restores normal attack timing. It only adds damage: no follow-up finisher, movement lock, extra stagger, or separate XP award. No Space/gamepad press is required. The optional manual shortcut retains its 350 ms input buffer.
- Ordinary rats, goblins, skeletons, armored skeletons, ogres, crabs, and snakes can also charge when Combat is enabled. After an initial 1.2–3 second delay, eligible normal attacks have a 40% chance to start a 650–950 ms charge, followed by a 3–7 second cooldown before another roll. Bosses, other custom mob types, friendly mobs, mobs with AoE, and active scripted specials are excluded. Only one ordinary mob telegraphs per player at a time; the practice trainer waits during it. Evading opens one counter against that ordinary mob, with normal death, loot, and XP handling.
- The counter opening lasts 1.25 seconds. Ordinary counters deal 1.5× normal base melee damage to that mob only.
- Click other mobs to fight them normally between attacks. Normal targeting remains available; automatic counters use the mob whose attack you evaded. Click the ogre to return to training attacks.
- Victory or losing the practice round automatically resets the trainer after two seconds, without moving or interrupting the player. The actual avatar remains visible throughout.

Training uses fixed damage for the feel test: basic player hit 6, counter 22, trainer health 160. Normal ogre swings cost 8% of maximum player health; a charged lunge costs 24%. Trainer hits cannot lower health below 1. Trainer rounds grant no drops or XP. Ordinary mobs keep their normal combat and reward behavior against the local fixture backend.

## Mob health bars

Only the currently targeted mob shows its compact health bar, including when the target is a boss. Switching targets moves the bar to the new target; clearing the target hides it. This also applies to the trainer, while its charge warning and name remain visible. Ordinary target bars work independently of the training toggle. Existing name/level labels remain. Unknown health is not guessed. Authoritative damage metadata updates HP immediately; polling continues to supply other health changes. The bar matches player-health feedback: immediate actual HP, a white lost-health trail held for 180 ms then settling over 280 ms, cancellation on healing/max-HP changes, no trail in reduced motion, and cleanup when a mob leaves view or despawns. Bars share the actor camera transform and use the sprite's name offset.

## Multi-kill combo

The **kill streak** rewards quickly defeating different mobs: each normal mob killed by the player opens or refreshes a **1.5-second** window. The second kill earns **25% bonus XP**, the third **50%**, and the fourth and later kills **75%** (the cap). Bonus XP is calculated from the player's normal XP share, credited through the normal experience handler, and included in the existing kill XP popup. Trainer resets and assists do not count as streak kills. Each swing can advance the streak only once: only its directly targeted kill earns a streak step and bonus XP. AoE/cleave splash kills retain their normal XP, even when they die before the primary target; splash kills alone do not start or refresh the streak.

Streak milestones use compact `2x combo`, `3x combo`, `4x combo` labels. Each additional kill increases the label size by 20% of its original size, capped at twice the size from seven kills onward. The count denotes kills, not an XP multiplier. A separate, smaller cream-colored praise popup sits close beneath it: 2 kills Nice!, 3 Great!, 4 Awesome!, 5–6 Amazing!, and 7+ Unstoppable!. The count progresses from gold through orange/coral to pink, with a dark plum outline. The count pops upward; praise arrives 70 ms later with a small sideways drift and tilt. Reduced motion keeps the same hierarchy without movement. Streak milestones and counters use the existing animated combat-info text. There is no separate KILLS/HASTE label or countdown. The previous haste reward has been replaced by XP. All rewards in this local preview use the fixture backend; these values are for feel testing, not final balance.

The local server owns phases, windows, damage, streaks, and cooldowns. Movement reports every completed tile (including multiple tiles in a slow frame) and reserves the next tile against trainer movement. Bounded elapsed-time credit handles batched steps while retaining speed, terrain, trainer occupancy, and diagonal-corner checks. Ordinary actors use the existing client pathfinding collision rules because their server coordinates represent path destinations, not current visible tiles. Corrections invalidate old pathfinding replies and queued movement generations. Normal attacks against other mobs keep using the existing combat path. The module is installed only when the dedicated local runner enables `COMBAT_PREVIEW`; production connections never register its Socket.IO event.

The fixture's `/preview/state` endpoint includes combat phases, streaks, XP bonuses, correction counts, and cumulative evade/counter/hit counts. Switching off or disconnecting removes the trainer and cancels pending attacks. Further equipment balance, additional enemy patterns, PvP, and remote-latency tuning are outside this prototype.


Confirmed weapon critical hits, counters, and mob charges that actually remove player HP give a short 180 ms camera kick (at most two world pixels). It is a rendering effect only: player positions, pathfinding, HUD and cursor stay unchanged. Rapid/AoE critical hits share one pulse instead of stacking or extending it. Reduced motion or disabling combat effects suppresses the shake. Combat-info text is composited last over scenery, overhead sprites, lighting, health bars and charge overlays so it stays readable.

Counter labels start above/right of the struck mob and fly right; critical damage starts left and flies left. Initial spacing remains in reduced motion.

Completed combat steps publish the new entity visibility list whenever the server zone changes, so mobs remain visible while travelling (including Lavaland). Door tiles remain walkable. An authorized, valid same-map teleport ends practice, cancels pending attacks, and keeps the destination and current health. Combat can be enabled again in the new area. Rejected/locked doors do not end practice. Cross-map travel uses the normal connection teardown.
