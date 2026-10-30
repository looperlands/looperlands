# Top-down scene parallax

Parallax is a renderer extension shared by any map. Main has nine viewpoints:

| Region | Effect |
| --- | --- |
| Town (624) | Sparse drifting seeds and leaf flecks at two heights |
| Beach (627) | Two cloud layers |
| Forest (628) | Rooted trees with three restrained canopy heights |
| Graveyard (629) | Layered cool mist |
| Desert (630) | Ground sand and a faster airborne dust layer |
| Lavaland (631) | Recessed flowing lava, broken smoke ribbons and rising embers |
| Party beach (633) | Low sea haze and thin cloud banks |
| Black smith (638) | Sparse forge embers |
| Gauntlet (639) | Slow cold floor haze |

DreamLand on `m88n` (1943) also has two cloud depths beneath its sky islands.

The PNGs were created using the built-in imagegen tool. Their original alpha is
preserved; exact prompts are in `client/img/parallax/PROMPTS.md`.

## Local preview

```sh
npm ci
node bin/build-client.js
node bin/local-parallax-preview.js
```

Open http://127.0.0.1:8064/parallax/ and choose a scene. This runs the real game
client and server with `main`, `m88n` and `duckville`, local ownership, and isolated progress under
`$TMPDIR/looperlands-parallax-preview` (or the system temporary directory).
Use `PARALLAX_PREVIEW_PORT` and `PARALLAX_PREVIEW_DATA_DIR` to override these.
Walk horizontally and vertically with WASD / arrow keys. Return to the preview
page for a fresh session in another scene. The normal playtest launcher remains
available under `/local/`. The preview process binds only to loopback.

## Configure another scene

Open **Scene manager → Customize atmosphere → Parallax layers** in the Mapmaker Toolkit.
Examples live in `tools/worlds/main.json` and `tools/worlds/m88n.json`, alongside
weather and daylight settings. The production map build and local runtime both
copy those settings onto exported scenes. The generic `createParallaxScene(world)`
adapter is registered for every configured map and reads current scene bounds,
placements and overlap priority. No map-specific script is needed.

See [Scene manager](mapmaker-atmosphere.md) for the complete authoring workflow.

Each atmosphere override has a `sceneId` and a `parallax` object with an ordered `layers` array. The example below shows that object:

```json
{
  "layers": [{
    "image": "/img/parallax/canopy.png",
    "plane": "foreground",
    "width": 384,
    "height": 384,
    "factorX": 1.32,
    "factorY": 1.25,
    "opacity": 0.68,
    "offsetX": 48,
    "offsetY": 32
  }]
}
```

- `image`: one of the bundled `/img/parallax/<name>.png` assets listed in `sceneenvironment.js`.
- `plane`: `background` draws beneath terrain; `ground` draws above terrain and beneath actors/lighting;
  `entities` interleaves placed trunks with actor feet before lighting;
  `foreground` (default) draws above the lit world and below combat labels/cursor.
- `width`, `height`: image size in native world pixels (16 pixels per tile),
  default 384, limited to 32–4096. Display zoom is applied automatically.
- `factorX`, `factorY`: independent camera scroll rates from 0–2. A rate of 1
  follows terrain, below 1 appears farther away, above 1 appears closer. Zero
  stays fixed relative to the viewport. Defaults to 1.
- `opacity`: 0–1, default 1.
- `offsetX`, `offsetY`: native pixel offsets relative to the scene origin.
- `driftX`, `driftY`: ambient movement in pixels per second, default 0,
  limited to -32–32. Camera scrolling and ambient movement are independent.
- `repeatX`, `repeatY`: default true; false draws a single image along that axis.

The transform is `-(camera - sceneOrigin) * factor + offset + drift * seconds`.
Clipping follows the actual scene bounds at normal terrain speed, preventing
layers leaking into neighboring scenes. Repetition covers the visible scene even
at negative coordinates. Fractional positions and shared repeat edges avoid
stepping or gaps at different zooms. Artwork is sampled once at native size,
enlarged with nearest-neighbor sampling, then moved with subpixel filtering.
This preserves pixel-art detail while slow drift advances every frame. Prepared
rasters use a 16 MiB / 32-entry LRU cache; warm frames reuse their buffers.
Reduced motion sets both factors to 1 and disables drift.

Images load asynchronously only for visible scenes. Pending and failed requests
are cached; missing decorations do not block rendering. The cache holds at most
16 images and closes evicted bitmaps. Each scene draws up to eight layers, with
a maximum of 256 repeats per layer. Ordinary map transitions clear extension
state through the existing `WorldScenery` lifecycle. Scene packets are also
delivered when NPC behaviors are disabled or absent.

## Validation

```sh
node node_modules/jest/bin/jest.js --runInBand --coverage=false \
  client/js/parallax-renderer-worker.test.js server/world-definitions/parallax.test.js \
  client/js/worldscenery.test.js server/js/worlddefinitions.test.js \
  client/js/renderer.performance.test.js client/js/game.map-transition.test.js \
  client/js/render-extensions.test.js client/js/renderer-webworker.test.js \
  client/js/renderer.picnic.test.js
```

These cover both-axis motion, native/display scaling, repeats, scene clipping,
layer ordering, reduced motion, loading failures, bounded bitmap disposal,
updated scene geometry, and existing renderer/map-transition behavior.

## Rooted forest assemblies

Forest uses 45 shared `placements` in scene-local native pixels, each with `x`,
`y`, optional `scale` and `flipX`. Layers marked `placed: true` draw at those
anchors instead of repeating across the scene. A root is fixed at factor 1;
three canopy heights use 1.03, 1.09 and 1.17. Placed-image factors project the
anchor around the viewport center, so crown/trunk separation is bounded by the
viewport size and never accumulates over a long walk. `offsetX/Y` and
`anchorX/Y` (fractions of image dimensions) align the sprite components.
All tree layers are opaque, with no proximity fade; taller trunks and separated
canopy heights provide depth through overlap and motion.

Trunks use the `entities` plane. Renderer extensions may provide sorted world
`y` entries with a drawing callback for this plane. The worker interleaves these
with actors, preserves the early ground-effect pass, and applies normal lighting.
Roots stay on `ground`; canopy layers stay above the lit world.
The centered camera follows the actor directly, retaining fractional world
coordinates. It does not ease after the actor stops: that trailing motion makes
pixel-snapped terrain and actors shift against continuously projected parallax.

Ground extensions use the terrain's rounded camera by default. The parallax
extension opts into `subpixel: true` so floor mist and roots receive the original
fractional camera without changing the projection of other ground effects.

The 45 complete original trees and stray green tree fragments in Forest were removed from `tools/maps/tmx/main.tmx`
and both map exports. Their 180 colliding cells moved to the explicit blocking
layer, preserving the effective client and server collision sets. Ground, paths,
water, other props, NPCs and the other scenes retain their original content
(except the few crown tiles of forest-owned trees crossing the northern edge).

Beach clouds drift east/south at (0.55, 0.12) and (1.1, 0.22) native pixels/second.
Graveyard mist drifts at (-0.65, 0.18) and (0.4, -0.3); forest floor mist uses
(0.35, -0.12). This movement continues while the camera is stationary. Reduced
motion freezes all ambient drift.

The additional regions use sparse atmosphere clipped to their existing scene
bounds. Their artwork is additive scenery: map tiles and collisions are unchanged.
The preview launcher keeps each spawn inside its chosen region and links directly
to all ten viewpoints. Sand moves faster horizontally, volcanic embers rise,
and the town/coastal/interior layers use softer drift and lower contrast.

## Recessed surfaces

Background layers use factors below 1: Lavaland flows at 0.62 of terrain motion;
DreamLand clouds use 0.48 and 0.70. `backgroundColor` fills the scene behind them.
An explicit `cutoutColors` RGB palette exposes these layers through the existing
terrain artwork: lava uses `[254,173,2]`, and DreamLand sky uses `[72,196,248]`.
Only background terrain pixels with an exact matching color inside that scene
become transparent. Bridges, cliff faces, island rims, actors and high tiles retain
their authored positions and occlusion. Map source, collisions and navigation are
unchanged by the effect.

Cutouts activate only after the replacement images load. Missing images retain
the original map. Masks are cached per tile/color variant, including animated
tiles, with no per-frame canvas readback. Static terrain caches rebuild when
cutouts appear, change or disappear, including map transitions. Another map can
register `createParallaxScene` with its own scene geometry and surface palette.

### Motion and nighttime appearance

Every layer can set `swayX`, `swayY` (0–12 map pixels) and `swayPeriod` (1–30 seconds). Placed trees share a stable phase per root; increasing canopy amplitudes creates gentle wind movement without detaching the tree over time. Reduced motion disables sway. Foreground layers can also set `nightOpacity` and `nightBrightness` (0–1); these blend with ambient light. The Scene manager exposes all of these controls.

Outdoor weather is configured once per map in the Scene manager’s Whole map default. Scene `weatherExposure` selects `outdoor`, `indoor` or `auto`; the latter follows the original Tiled day/night flag. Regional particles remain independently editable and include a per-effect `nightOpacity`.

## Flying cast shadows

Only Duckville's outdoor lava area (scene 740) has the large translucent dragon
shadow following broad, varied curves. The garden, Santa's Island, Laser Tag,
Zombie Town, tree tops, caverns, houses, shops, greenhouse and underwater areas
have no dragon layer.
The main map's outdoor Town, Beach, Forest, Graveyard, Desert, Lavaland and Party
beach regions have individual bird shadows with varied headings. Shadows render
on the ground before characters and lighting; they remain attached to the terrain
when the camera moves. Reduced motion pauses their flight like other drift layers.
Both assets have a subtle feathered penumbra baked into their alpha by imagegen,
so no blur filter runs every frame.

`spacingX` and `spacingY` set repeat distance independently of image size, in
native world pixels (image size through 4096; omitted means image size). The dragon
uses a 288-pixel sprite with 1024 × 1280 spacing. Its 224-pixel turning radius
and 30-second base cycle make broader, slower turns than the birds. Drift is
3 pixels/second east and 18 north; motion variation is 0.55 and scale variation
is 0.22, for gentler speed and apparent-height changes. The sprite turns along
its actual travel direction, including drift. Birds use 40- and 48-pixel sprites on staggered repeat grids. Their paths have
88- and 112-pixel radii and 7- and 9-second cycles, with each sprite turned along
its tangent. The resulting curved flight has speeds around 50–80 native pixels/second,
with gently moving orbit centers. Reduced motion freezes both
position and heading.

`orbitRadius` (0–256) and `orbitPeriod` (2–60 seconds) define a rounded elliptical
path. `rotateToPath` turns the image to follow the path, assuming artwork faces up.
Repeating cells have different phases. `orbitVariation` (0–1) adds stable individual
speeds, both turning directions, differently oriented ellipses and gentle changes
in angular speed. `scaleVariation` (0–0.75) gives sprites different apparent heights
and slow changes in scale. Position, heading and scale all freeze under reduced
motion. Bird layers use 0.9–1 motion variation and 0.4–0.5 scale variation. `activeSceneOnly` hides the entire layer
when the active scene ID differs, including outdoor strips visible beside a cave.
Edit repeat distances in the Mapmaker parallax layer controls.

Preview links: `/parallax/play/duckville`, `/parallax/play/duckville-cave`, and
`/parallax/play/birds`. The cave viewpoint is included to check the exclusion.
