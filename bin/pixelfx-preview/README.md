# PixelFX playground

Run from the repository root:

```sh
node bin/local-pixelfx-preview.js
```

Open <http://127.0.0.1:8059>. `PIXELFX_PREVIEW_PORT` overrides the port. The server
binds to loopback and serves only the preview and its game art. It has no session,
wallet, platform, purchase, or production-game hooks.

This is the first visual testing pass, following the request to try the ideas
before implementation. Gameplay is simulated; it is not multiplayer or a live
gameplay integration. Use WASD/arrows or tap the ground to move. Space strikes,
C demonstrates a crit, E demonstrates a confirmed counter, Q starts a dodge
exercise, F tests a frost counter, and R resets. Returning to melee range after
dodging automatically counters. Freeze lasts three seconds with a ten-second
cooldown. These values are preview tuning, not a new production balance.

The numbered idea groups cover crits, impact/counter styles, avatar death,
arrival/companion departure, flame pillars, meteors, flamethrowers and freezing.
Permanent purchases will use the existing Points Exchange if integrated later;
rentals are excluded. The avatar and weapon selectors include an existing custom
NFT sword. Enemy animations are not replaced.

Compare native PixelFX resolution with LL-fit scale, then try night, the opaque
test canopy, slow motion, reduced motion and the crowd test. The canopy and night
filter are visual approximations, not tests of LL's actual worker lighting path.
The ground image is an existing LL scene crop; it supplies no terrain collision.
Trap damage follows marked tiles regardless of the visual size control. Marks
remain under reduced motion. Damage ends with the active phase, not the smoke.

PixelFX effects are transparent, pre-rendered sheets with no runtime dependency.
Critical Hit, hit sparks, snowflake burst, shadow explosion, Smite, Lightning
Strike, Flame Pillar, Meteor, Flamethrower and Poof come from Patch/Hugo Duprez.
The exported strike effects omit demonstration actors and shorten their timings.
Death masks, soul silhouette, portal ring, arrival beam and frost shell are
procedural studies using LL art instead of PixelFX's stock character.

The exact upstream commit, original dimensions, frame counts, timings and default
scales are in `assets/manifest.json`. Regenerate with:

```sh
node bin/export-pixelfx-preview.mjs /path/to/patch-gg/pixelfx
```

The exporter uses upstream's CPU renderer and PNG writer; it needs no extra npm
packages. Keep `assets/PixelFX-LICENSE` and `assets/PixelFX-NOTICE.md` with the
images. No PixelFX fonts are distributed.

Focused simulation checks:

```sh
npm test -- --runInBand --coverage=false bin/pixelfx-preview/model.test.js
```

Run `npm run check` for repository lint and the complete coverage suite. This
does not replace later real-client/server, multiplayer, mobile-performance,
authoritative-damage, lighting and map-export checks for production integration.
