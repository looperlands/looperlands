# Map effects and hazards

Open **Toolbox → World → Effects & hazards**, choose a map and search the PixelFX library. All 244 effects from pinned upstream revision `a84159688af3ca37a4be05a0d422b94451b2e24e` are available locally, including campfires, candles, attacks, weather and transitions. The library does not fetch code from the internet while playing.

1. Preview an effect in the library, then click **Place effect**.
2. Draw its region on the map. Drag to move or resize it, or use the tile coordinate fields. Arrow keys move; Shift + arrows resize. The effect's origin is centered in this region.
3. Adjust **Visual scale** to fit the artwork into the scene. This changes its pixels, independently of the selected region. Effects remain separate from avatar and weapon sprite sheets.
4. Choose a **Palette** from the same 27 named palettes as the PixelFX gallery, such as **leaf**, **fire**, **ice** or **arcane**. **its own** restores the original colors. The library applies the palette to the effect itself, including its particles and light; fixed artwork can retain its original colors. The library preview, placement preview and game use the same selection. Older saved hue variations stay intact until you choose a palette. **Transparent overlay** removes dark translucent backdrops such as the air painted by God Rays; choose **Original artwork** to keep dark smoke or shadows. Opaque outlines and the effect’s light are preserved.
5. Leave **Hazard** off for decoration: it loops without damage, countdown or warnings. Character-based effects can contain an upstream silhouette; inspect the preview when choosing them.
6. Enable **Hazard** for a trap. By default every tile in the drawn region is the hit area. Choose **Random within region** and set the strike width/height to scatter a smaller footprint inside the larger region. Each cycle selects one position, warns those exact tiles, then damages only that footprint. All players see the same server-seeded position. Set warning, active damage duration, damage interval and the safe pause after animation. The complete effect continues playing after damage ends; the next cycle waits until the animation finishes and the pause elapses. Damage is fixed HP per tick, controlled by the server; players can escape the highlighted region. Damage does not change with the artwork or visual scale.
7. Use **Impact frame** to align a falling or charging effect. For example, a meteor can start during the warning and land at the end of the countdown. Enter its landing time in milliseconds from the start of the effect. It must fit within the warning. Restart the placement preview to check the timing.
8. **Save effects**, **Build this map**, then start a fresh local session. Save alone changes the authoring source, not a deployed map.

For a boss attack, turn on **Only enable while a mob is attacking** and choose an **Attacking mob** from the map's mob types. The effect runs while any living mob of that type on this map has a living player as its attack target. Hazards start each new fight with a full warning; losing all targets, dying or leaving the map disables the effect, warning tiles and damage. Switching targets during the same fight keeps the cycle running. This condition also works for decoration without damage.

Use **Preview mob attacking** to simulate the selected mob's combat state in the placement preview. This preview control is not saved. The game server controls the real activation and timing for every player, including late arrivals; joining mid-attack does not bypass the full-warning protection. Unchecked placements continue their usual automatic loop. Build the map after adding a new mob so it appears in the picker. If several bosses share the same mob type, any of them attacking enables the effect.

The map preview shows the same phase calculation used by the server: the same subtle corner marks as charged mob attacks and a countdown, brighter marks during impact, then a safe cooldown. Decorative effects have no marked damage area in the game. The editing selection outline is only a Toolbox control. Reduced motion preserves hazard warnings and countdowns while freezing decorative animation and suppressing cosmetic hit bursts.

Placements are stored in `tools/worlds/<map>.json` under `placedFx`. The build validates them and exports identical placements to client JSON/JS and server JSON. Limits: 100 placements per map, 32 × 32 tiles per region, warning at least 750 ms, damage interval at least 250 ms. Players arriving or reviving mid-cycle are protected until a complete new warning cycle has begun.

## Effect options and variation

**Effect options** exposes the selected effect's own settings: for example Flame pillar's height and stone color, Waterfall's height, width and ledge, particle counts, text, secondary color ramps and scenery toggles. Controls start at the library defaults. Changes update the preview immediately; **Reset effect options** restores those defaults. Replacing the library effect clears options belonging to the previous effect. Save and build to use the same options in the game.

Seeds are automatic. Each placement and playback cycle gets a different variation derived from the server's random world seed; a new boss fight also gets a new variation. Hit effects receive a fresh server seed for every hit. All observers, including late arrivals, use the same seeds. **Restart placement preview** creates a fresh preview seed as well. Seeds cannot be overridden in effect options.

Options affect artwork inside the library's fixed canvas. Large dimensions can be clipped; use **Visual scale** to resize the whole effect. Options do not change the highlighted damage footprint or hazard timing. Only options declared by the selected effect are accepted; number ranges, text length, colors and array shapes are validated before saving and exporting.

## Weapon hit effects

Points Exchange sells **Spark Hit**, **Frost Hit** and **Shadow Hit** as permanent wallet unlocks for 350 points each. Equip one or restore default hits under **Collection → Weapon hit effects**. Custom weapon art stays intact; effects play at confirmed damage positions and are visible to nearby players. They do not change damage. Critical hits use Critical Hit automatically, including the existing critical counter-hit path. Creator-authored death animations remain intact.

## Developer validation

`bin/pixelfx-preview/` is the original interactive experiment, served by `node bin/local-pixelfx-preview.js`. Production authoring and damage use `placedfxconfig`, `placedfxcontroller`, the game `pixelfx` manager and the worker renderer. The Toolbox and worker share the lazy native-module painter, with a 16 MB frame cache. Run `npm run check`, `node bin/check-pixelfx.mjs`, and the client build. Validate an actual Toolbox save → build → fresh game session separately from the standalone experiment.

The Platform change adds nullable `game_reward_profile.hit` and `PUT /api/game/wallet/{wallet}/rewards/hit`. Deploy its migration/API/catalog before the game release. Selection validates ownership and reward type; purchases use the existing transactional, idempotent Points Exchange flow.

## Custom sprite sheets

Select or place an effect, then choose **Upload custom sprite sheet**. Upload a
PNG up to 4 MB, 4096 pixels per side and 8 million pixels. The editor prepares
standard PNG pixel data and stores immutable artwork under `client/img/map-fx/`.
Replacing a sheet leaves artwork used by other maps intact. Include the uploaded
PNG with the authoring changes when sharing or releasing the map.

Set frame width/height, columns, frame count and frames per second. Frames play
left to right, then top to bottom; the last row may have unused frames. The grid
must match the whole image. Limits are 1024 pixels per frame dimension, 256
frames, 1–60 fps and 60 seconds per animation. Each frame's bottom center anchors
to the region center. The library preview switches to the uploaded animation.

Custom sheets use their original colors and transparency. **Use selected library
effect** switches back to PixelFX. Either artwork source can be decoration or a
hazard, with the same region, warning, impact time, random strike placement and
attacking-mob condition. The server controls damage and playback timing for all
observers. Save, reload, build and launch a fresh playtest to verify the result.

Save and build reject missing images or mismatched grids. Uploads reject invalid
PNGs, remote paths and symlink destinations, and wait while a map build runs.
