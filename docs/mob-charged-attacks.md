# Configure charged mob attacks

Map makers can override charged attacks in `server/mob-combat/<mapId>.json`, using the map ID without `world_` (for example `main.json`). The server loads this file once per world at startup. Restart the server after editing; no Tiled re-export or client rebuild is needed. Include this file when deploying the server.

Settings are merged in this order: **global defaults → map defaults → mob kind → individual spawn**. Only supplied fields override inherited values. All other mob types and maps keep their defaults. These settings apply to Lunge and to Slam where the local Slam preview enables it; they do not enable Slam in production.

```json
{
    "defaults": {"damageMultiplier": 4},
    "mobs": {
        "rat": {"enabled": false},
        "skeleton": {"chance": 0.35, "minCooldownMs": 5000, "maxCooldownMs": 8000, "damageMultiplier": 3},
        "skeleton2": {"chance": 0.75, "minCooldownMs": 2500, "maxCooldownMs": 4500}
    },
    "spawns": [
        {"kind": "skeleton2", "x": 102, "y": 343, "chance": 1, "minCooldownMs": 3000, "maxCooldownMs": 3000}
    ]
}
```

`server/mob-combat/main.json` contains these playable examples. Rats keep ordinary attacks. Skeletons charge less often for 3× damage. Greater Skeletons (`skeleton2`, their internal mob kind) charge more often for the default 4× damage. The Greater Skeleton originally at **(102, 343)** always chooses a special when its cooldown expires, with a fixed three-second cooldown. The initial delay and ordinary swings still apply.

| Setting | Global default | Meaning |
| --- | --- | --- |
| `enabled` | `true` | Set `false` to disable charged attacks; ordinary attacks stay available. |
| `chance` | `0.5` | Probability from 0 to 1 on an eligible normal swing after cooldown. `0` never charges; `1` always chooses a special on that roll. |
| `minCooldownMs` | `3000` | Shortest wait before another charge roll, in milliseconds; integer of at least 1000. |
| `maxCooldownMs` | `6000` | Longest wait before another charge roll; integer at least as large as the minimum. |
| `damageMultiplier` | `4` | Positive multiplier on calculated normal melee damage, respecting the player's defense and class modifiers. This is a multiplier, not a fixed HP amount. |

A cooldown is chosen uniformly between the bounds after every roll, including a failed roll. The next roll occurs on the next eligible ordinary swing, so a three-second cooldown is not an exact three-second attack interval. The initial 1.2–3-second delay, warning durations and recovery stay unchanged. Specials must still pass range, target, escape-route and one-charge-per-player checks. These rules preserve a chance to react when several mobs engage.

Mob keys use the internal names in `server/js/properties.js`, such as `skeleton2`, rather than display names such as “greater skeleton”. Spawn coordinates refer to the original server spawn tile, not the mob's current position, so the override follows it as it walks or lunges and after it respawns. In the server map export, a static spawn's key is `y * map.width + x`; use `map.tileIndexToGridPosition(key)` plus one on x, as the server spawner does. For roaming mobs, prefer the mob-kind override because initial positions are randomized.

Map settings can disable any eligible mob. They cannot force generic charges onto tentacles, the stationary sea creature, scripted bosses/add encounters, timed AoE or friendly mobs. These settings do not alter counters, normal attack damage, HP, loot or the kill-streak XP cap. The kill window stays fixed at 1.5 seconds for solo and group fights; splash cannot advance or refresh it. Surrounding mobs can block escape without canceling the charge, so engaging more enemies also carries more risk. Server-side validation owns the settings; clients cannot select their damage or cooldown.

Unknown fields, unknown mob kinds, duplicate spawn entries, invalid numbers or inverted cooldown bounds reject the config file, log its path and reason, and fall back to global defaults for that world. A missing file silently uses global defaults. Validate edits with:

```sh
node node_modules/jest/bin/jest.js --runInBand --coverage=false server/js/combatconfig.test.js server/js/combatfieldattacks.test.js
```
