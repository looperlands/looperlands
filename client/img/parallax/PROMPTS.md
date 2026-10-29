# Parallax layer assets

## lava-depth.png

Generated with built-in imagegen, `transparent_background: false`; this is an opaque surface underneath terrain cutouts.

```text
Use case: stylized-concept
Asset type: seamless opaque molten-lava surface texture, seen straight down, for recessed channels below cliffs in a retro pixel-art top-down RPG.
Primary request: a continuous pool of vivid golden-orange molten lava with broad, gently flowing amber currents and a few subtle bright yellow eddies. Predominant base color close to RGB 255,175,0; darker orange current lines provide texture and depth without turning the surface black.
Style/medium: deliberate chunky pixel art, large simple square pixel clusters, restrained palette, readable when rendered as a 384 by 384 native pixel tile. Same clear simple visual language as an old-school 16-pixel-tile game.
Composition/framing: fully filled square, seamless repeating on all four edges, no directional perspective. Flat top-down surface only; medium-scale non-repeating-looking currents distributed evenly, no focal point.
Constraints: opaque background, lava fills every pixel. No solid rocks, no cracked black crust, no banks or walls, no fire plumes, no smoke, no characters, no text, no border or watermark. A reusable surface texture, not a landscape.
```

## Additional main-map atmosphere

Generated with built-in imagegen, `transparent_background: true`. Original alpha preserved.

### desert-dust.png

```text
Use case: stylized-concept
Asset type: transparent repeating atmospheric overlay for the Desert region of a top-down 16-pixel-tile fantasy RPG.
Primary request: sparse windblown sand in three long irregular wisps and a few very small dust grains, viewed from straight above. Wisps drift horizontally across the ground.
Style/medium: restrained retro pixel art, stepped translucent pixel clusters, muted ochre and warm beige, no photographic blur. Legible when reduced to a 384 by 256 native pixel overlay.
Composition/framing: square canvas with at least 85 percent real transparent empty space. Wisps widely separated, all contained inside transparent margins; no full-screen veil and no solid shapes.
Constraints: genuine alpha transparency. Dust and sand particles only; no dunes, rocks, ground plane, sky, horizon, vegetation, characters, text, watermark or checkerboard. Reusable ambient game layer, not a scene screenshot.
```

### volcanic-smoke.png

```text
Use case: stylized-concept
Asset type: transparent repeating smoke layer for a top-down pixel-art volcanic game region.
Primary request: three sparse irregular curls of thin volcanic smoke, charcoal gray with muted warm brown undertones, seen from above. Open, broken ribbons with soft stepped translucent edges, separated by large clear gaps.
Style/medium: chunky retro pixel art with broad square clusters and restrained shading, no realistic photograph or smooth 3D rendering. Should remain readable at 384 by 320 native pixels.
Composition/framing: square transparent canvas, smoke occupies about 18 percent of the area. All wisps remain fully inside transparent margins to allow gentle repeat without hard edge cuts. No heavy blanket of fog.
Constraints: actual alpha transparency. Smoke only, no fire, lava, rocks, ground, sky, volcano, characters, text, watermark or checkerboard. An atmospheric overlay for an existing game world.
```

### embers.png

```text
Use case: stylized-concept
Asset type: sparse transparent ember overlay for a top-down pixel-art lava landscape and forge.
Primary request: a small scattering of around 18 tiny airborne embers with irregular spacing: mostly deep rusty orange pinpoints, a few amber short diagonal streaks and two pale yellow hot centers. No connected fire.
Style/medium: simple chunky pixel art, few warm colors, tiny stepped translucent glow around only the brightest sparks, no photographic blur. The whole texture will be rendered at about 320 by 256 native game pixels; each spark should remain a small point.
Composition/framing: square canvas, at least 97 percent genuinely transparent empty space, sparks scattered unevenly with large gaps, every spark entirely inside a transparent border. Not confetti or a decorative starfield.
Constraints: actual alpha transparency; embers only, no flames, smoke cloud, lava, objects, background, text, watermark or checkerboard. Small atmospheric sprite texture, not a scene.
```

### meadow-seeds.png

```text
Use case: stylized-concept
Asset type: transparent floating-seed overlay for a green town in a top-down pixel-art RPG.
Primary request: a very sparse scatter of about 16 tiny wind-carried pale cream seed tufts and a few muted sage-green leaf flecks seen from above. Each seed is only a simple few-pixel fleck; varied orientation and irregular spacing.
Style/medium: restrained retro pixel art, warm ivory and pale straw with muted green accents, minimal flat square pixel clusters. Clear readable details at roughly 320 by 256 native game pixels.
Composition/framing: square transparent canvas, at least 97 percent real transparent space. Isolated tiny particles separated by large gaps, all fully contained within transparent margins, no wreath, border, pattern grid or dense cluster.
Constraints: genuine alpha transparency; floating particles only, no flowers, branches, trees, grass carpet, ground, sky, characters, text, watermark or checkerboard. Subtle ambient game layer, not a full scene.
```

Generated with the built-in imagegen tool, with transparent_background enabled. Original PNG alpha is preserved.

## clouds.png

```text
Use case: stylized-concept
Asset type: transparent parallax layer for a top-down 16-pixel-tile fantasy RPG.
Primary request: a sparse field of four small soft white cloud banks seen straight down from above, to drift over a beach map.
Style/medium: crisp low-resolution pixel art, visible square pixel clusters, restrained retro RPG shading in ivory and pale blue-gray. No smooth airbrushing.
Composition/framing: square image, clouds separated irregularly by large areas of real transparency, about 75 percent empty. Every cloud fully inside the canvas with transparent margins on all four sides so repetition has no hard seam. Overhead orthographic view; no horizon.
Constraints: only clouds on a genuinely transparent background; no sky, ground, characters, text, watermark, checkerboard or drop-shadow panel. This is one reusable game overlay texture, not a screenshot.
```

## canopy.png

```text
Use case: stylized-concept
Asset type: transparent overhead canopy parallax texture for a top-down 16-pixel-tile fantasy RPG.
Primary request: sparse disconnected clusters of leafy green treetop crowns seen straight down, suspended above a forest scene.
Style/medium: crisp low-resolution pixel art with chunky square pixels, simple layered leaf clusters, dark teal-green shadows and mossy green highlights, restrained retro RPG palette.
Composition/framing: square image with three irregular leafy bough clusters separated by generous transparent space, about 80 percent empty. Asymmetric natural spacing, all foliage fully inside the canvas with transparent margins on all four edges. Leave the center largely clear for gameplay.
Constraints: actual transparent background, overhead orthographic view; foliage only, no trunks, ground, sky, horizon, characters, text, watermark or checkerboard. One reusable game overlay texture, not a scene screenshot.
```

## mist.png

```text
Use case: stylized-concept
Asset type: transparent mist parallax texture for a top-down 16-pixel-tile fantasy RPG.
Primary request: a few thin curling ribbons of pale blue-gray low lying fog viewed straight down from above a graveyard.
Style/medium: low-resolution pixel art, soft stepped pixel clusters and translucent edges, restrained cool blue-gray shades, no smooth photographic rendering.
Composition/framing: square canvas, sparse wisps with about 80 percent real transparent space. All wisps fully contained within transparent margins so the texture can repeat without hard cuts. Open composition with irregular spacing and plenty of clear ground visible when used as an overlay.
Constraints: mist only, genuinely transparent background; no ground, gravestones, clouds, sky, horizon, characters, text, watermark or checkerboard. One reusable game overlay texture, not a screenshot.
```


## Forest tree assembly

Generated with built-in imagegen, transparent_background: true. Four new PNG assets; alpha preserved.

### forest-roots.png

```text
Use case: stylized-concept
Asset type: single transparent ROOT layer sprite for a layered top-down fantasy forest, to render around 64 by 40 native game pixels.
Primary request: the exposed spreading roots and flared foot of one ancient forest tree, viewed from above in the slight three-quarter overhead perspective of a retro top-down RPG. Roots radiate irregularly around a small dark central trunk footprint. No upright trunk above the foot and no leaves.
Style/medium: chunky readable pixel art, broad clusters of square pixels and few colors; weathered dark brown bark, warm brown ridges, hints of muted moss green. Match a mossy teal-green fantasy forest.
Composition/framing: isolated compact irregular root footprint centered in a square canvas, all roots contained with transparent margins. Clear ground anchor at the exact image center. Roots occupy about 70 percent of canvas width and 55 percent of height.
Constraints: genuine transparent background, no soil rectangle, no backdrop, no cast shadow panel, no foliage, no text, no checkerboard, no watermark. Gameplay asset, not a full scene.
```

### forest-trunk.png

```text
Use case: stylized-concept
Asset type: isolated transparent TRUNK layer sprite for a multi-layer tree in a top-down pixel RPG, rendered around 40 by 90 native game pixels.
Primary request: one tall sturdy ancient forest tree trunk with a slightly flared base, tapering upward and dividing into three thick cropped boughs near the top. It must visually connect ground-level roots below to a separately drawn canopy above. No leafy crown; no spreading roots. Three-quarter overhead RPG perspective, trunk grows toward the top of the image.
Style/medium: chunky readable retro pixel art, simple broad blocks of square pixels, dark umber bark with muted warm brown ridges and a few mossy green patches. Restrained shading, no fine photographic texture.
Composition/framing: single upright trunk centered horizontally in a square transparent canvas; bottom of trunk exactly at 90 percent canvas height, top boughs around 12 percent canvas height. Narrow trunk body with chunky structural branches at top, overall maximum width 55 percent of canvas. Transparent margin on every edge.
Constraints: real alpha transparency, no ground plane, no leaves, no landscape, no sky, no text or watermark, no checkerboard. An individual tree component, not a whole scene.
```

### forest-canopy-lower.png

```text
Use case: stylized-concept
Asset type: transparent lower canopy layer for one tree in a top-down 16-pixel-tile fantasy RPG.
Primary request: one broad irregular leafy crown seen from above in a slight three-quarter overhead game perspective. This is the shaded lower story of a large tree canopy, with branching rounded masses, several deep notches and small transparent gaps between boughs. A few dark brown branching hints in the center, no trunk extending downward.
Style/medium: chunky low-resolution pixel art, bold legible leaf clusters with large square pixel steps, just a few dark teal-green and moss-green shades. Deep green interior shadow, restrained brighter edges. Like an old-school top-down woodland game, not painterly realism.
Composition/framing: single asymmetrical crown centered on a square canvas; roughly circular sprawling silhouette occupies 80 percent width and 70 percent height, completely within transparent borders. Visually dense leaves, open irregular outer edge, not a tidy geometric circle.
Constraints: truly transparent background and gaps, foliage only with small interior branch hints. No ground, no horizon, no entire tree, no text, watermark or checkerboard.
```

### forest-canopy-upper.png

```text
Use case: stylized-concept
Asset type: transparent upper canopy layer sprite for one tree in a top-down pixel RPG.
Primary request: a loose crown of five connected leafy bough masses viewed from above; a high sunlit upper story which will overlap a separate darker lower canopy. Irregular sprawling silhouette, natural holes between boughs and jagged leaf edges. No visible trunk or roots.
Style/medium: chunky low-resolution pixel art, large deliberate square pixel clusters with simple shading in moss green, fern green, dark teal shadows and restrained yellow-green highlights. Readable at roughly 90 by 80 game pixels. Avoid tiny individual leaves and painterly gradients.
Composition/framing: one asymmetrical tree crown centered in square canvas, covering about 75 percent width and 65 percent height, with real transparent openings between branches and transparent border around all edges. No floating detached leaf confetti.
Constraints: actual alpha transparency, foliage only, no ground or sky, no horizon, no text, no watermark, no checkerboard. Individual game sprite, not a complete scene.
```
