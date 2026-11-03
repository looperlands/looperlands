# Map effects and hazards

Open **Toolbox → World → Effects & hazards**, choose a map and search the PixelFX library. All 244 effects from pinned upstream revision `a84159688af3ca37a4be05a0d422b94451b2e24e` are available locally, including campfires, candles, attacks, weather and transitions. The library does not fetch code from the internet while playing.

1. Preview an effect in the library, then click **Place effect**.
2. Draw its region on the map. Drag to move or resize it, or use the tile coordinate fields. Arrow keys move; Shift + arrows resize. The effect's origin is centered in this region.
3. Adjust **Visual scale** to fit the artwork into the scene. This changes its pixels, independently of the selected region. Effects remain separate from avatar and weapon sprite sheets.
4. Choose a **Color variation**, or set a custom **Hue shift** (−180 to 180 degrees). This works for every library effect, preserves transparency, and appears in the placement preview and game. **Transparent overlay** removes dark translucent backdrops such as the air painted by God Rays; choose **Original artwork** to keep dark smoke or shadows. Opaque outlines and the effect’s light are preserved.
5. Leave **Hazard** off for decoration: it loops without damage, countdown or warnings. Character-based effects can contain an upstream silhouette; inspect the preview when choosing them.
6. Enable **Hazard** for a trap. By default every tile in the drawn region is the hit area. Choose **Random within region** and set the strike width/height to scatter a smaller footprint inside the larger region. Each cycle selects one position, warns those exact tiles, then damages only that footprint. All players see the same server-seeded position. Set warning, active damage duration, damage interval and the safe pause after animation. The complete effect continues playing after damage ends; the next cycle waits until the animation finishes and the pause elapses. Damage is fixed HP per tick, controlled by the server; players can escape the highlighted region. Damage does not change with the artwork or visual scale.
7. Use **Impact frame** to align a falling or charging effect. For example, a meteor can start during the warning and land at the end of the countdown. Enter its landing time in milliseconds from the start of the effect. It must fit within the warning. Restart the placement preview to check the timing.
8. **Save effects**, **Build this map**, then start a fresh local session. Save alone changes the authoring source, not a deployed map.

The map preview shows the same phase calculation used by the server: the same subtle corner marks as charged mob attacks and a countdown, brighter marks during impact, then a safe cooldown. Decorative effects have no marked damage area in the game. The editing selection outline is only a Toolbox control. Reduced motion preserves hazard warnings and countdowns while freezing decorative animation and suppressing cosmetic hit bursts.

Placements are stored in `tools/worlds/<map>.json` under `placedFx`. The build validates them and exports identical placements to client JSON/JS and server JSON. Limits: 100 placements per map, 32 × 32 tiles per region, warning at least 750 ms, damage interval at least 250 ms. Players arriving or reviving mid-cycle are protected until a complete new warning cycle has begun.

## Weapon hit effects

Points Exchange sells **Spark Hit**, **Frost Hit** and **Shadow Hit** as permanent wallet unlocks for 350 points each. Equip one or restore default hits under **Collection → Weapon hit effects**. Custom weapon art stays intact; effects play at confirmed damage positions and are visible to nearby players. They do not change damage. Critical hits use Critical Hit automatically, including the existing critical counter-hit path. Creator-authored death animations remain intact.

## Developer validation

`bin/pixelfx-preview/` is the original interactive experiment, served by `node bin/local-pixelfx-preview.js`. Production authoring and damage use `placedfxconfig`, `placedfxcontroller`, the game `pixelfx` manager and the worker renderer. The Toolbox and worker share the lazy native-module painter, with a 16 MB frame cache. Run `npm run check`, `node bin/check-pixelfx.mjs`, and the client build. Validate an actual Toolbox save → build → fresh game session separately from the standalone experiment.

The Platform change adds nullable `game_reward_profile.hit` and `PUT /api/game/wallet/{wallet}/rewards/hit`. Deploy its migration/API/catalog before the game release. Selection validates ownership and reward type; purchases use the existing transactional, idempotent Points Exchange flow.
