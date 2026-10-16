# Local Slam playtest

Slam is available to every mob that can use Lunge: normal enemies and ordinary bosses, including rats, spiders, wizards, spectres, eyes and death knights. The existing exclusions remain: friendly entities, tentacles, the stationary sea creature, scripted boss/add encounters and timed AoE mechanics. This branch builds on combat PR #1543.

## Run and play

Build with `node bin/build-client.js`, then run `node bin/local-slam-preview.js`.

Open <http://127.0.0.1:8043/__combat_preview/play>. The avatar starts in Lavaland near ordinary death knights, using fixture storage, a level 30 avatar and level 24 sword. Backend writes stay on loopback. Override `NPC_PREVIEW_PORT`, `NPC_PREVIEW_FIXTURE_PORT` and `NPC_PREVIEW_DATA_DIR` for concurrent previews.

The compact selector beside Day / Night / Cycle offers:

- **Mixed:** normal attacks, with a random Lunge or Slam when a special is chosen. No more than two of the same special in a row.
- **Lunge:** normal attacks and the existing line attack.
- **Slam:** normal attacks and Slam, for learning the new movement.

Changing modes cancels pending warnings and restarts their cooldowns. It does not restore HP, change position or targeting, or reset XP. These controls and the Slam opt-in exist only in the local runner. Production defaults to Lunge, even when an updated client advertises Slam support.

## Feel

Lunge and Slam both deal **4× normal melee damage**. An eligible normal swing has a **50%** chance to begin a special, with a **3–6 second** cooldown before another roll. Warning durations and the initial 1.2–3 second delay stay the same. Ordinary attacks and the player’s 1.5× counter damage remain unchanged.

A Slam plants the mob, holds its first attack pose and warns its surrounding **3 × 3 tiles**, including diagonals, for **950–1,150 ms**. The shape and direction stay fixed. The hit resolves at the warning deadline, using **4× calculated normal melee damage**. A short ground impact replaces Lunge's forward travel, then the mob recovers for 1.5 seconds.

Standing inside the square takes one hit. Moving sideways can leave you inside it. Back out one tile, wait for impact, then step in: the existing automatic counter becomes available to the evading target for 1.25 seconds and deals its existing single-target damage. You can keep attacking or select another mob throughout. Counter damage and streak XP rules are unchanged. The kill window remains fixed at 1.5 seconds, even in a crowd; AoE splash cannot build or refresh the combo.

The impact can hit multiple nearby players, each at most once. Observers see the warning but cannot claim the targeted player's counter. A successful damaging impact uses the existing bounded camera shake. Reduced motion keeps the warning and impact readable while suppressing dust movement and camera shake.

Before starting, Slam checks for a walkable escape within the warning time, accounting for terrain, doors and other warned tiles. Other actors do not cancel a charge: engaging a crowd can block the player’s escape and make the fight harder. An encounter with no terrain escape keeps an ordinary attack instead. Legacy clients nearby cause a fallback to Lunge. Death, despawn, retargeting, teleport and disconnect cancel pending attacks; repeated packets cannot replay damage or counters.

## Validation

Focused tests cover every eligible mob category, exclusions, exact square coverage, sideways versus outward evasion, returning counters, multiplayer hits, capability fallback, escape routes, cancellation, repeat limits, compact preview controls and animation timing cleanup. Existing combat and movement suites remain part of the regression run. `/preview/state` on the fixture port reports attack mode, phase, pattern, warning tiles, player HP/position, counter events and corrections.

The local browser playtest verified an ordinary Lavaland death knight's Slam, backing out and returning for a 143-damage automatic counter, unchanged XP, and zero movement corrections. A first-packet sprite/tile alignment issue found in the playtest has a dedicated regression. The map-configuration and combat-balance follow-up is covered by the full regression suite and coverage thresholds, plus repository lint and client asset validation. A fresh local playtest verified a Greater Skeleton charging with its main-map override, successful damage signals, no movement corrections and no browser errors. The fixed 1.5-second kill window in crowds, AoE exclusions and terrain-versus-actor escape behavior have focused regression coverage.

## Map overrides

[Map-maker settings](mob-charged-attacks.md) apply to both Lunge and Slam. The main-map examples include more frequent Greater Skeleton charges and disabled rat charges; other eligible mobs keep the default tuning.
