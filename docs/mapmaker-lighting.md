# Lights & shadows

Open **Lights & shadows** and choose a map. The map stays visible even when it has no lights. Choose **Torch**, **Lamp**, **Area light**, **Rectangle shadow** or **Polygon shadow**, then click the exact location on the map. A preview follows the pointer before placement. These are the map's actual Tiled `lights` and `shadows` object layers.

Light sources are invisible emitters. Place matching torch or lamp artwork separately in Tiled.

## Place and tune a light

Drag a light's circular marker to move it. Drag the round handle on its dashed radius ring to change its reach, or use **Radius (tiles)** beside the map. Changes to radius, intensity, color, animation and shadow strength update the lighting on the map itself. Selecting and saving objects preserves your current pan and zoom.

Drag empty map space to pan; hold Shift and drag to pan over an object or while placing. Scroll to zoom. **Focus on map** centers the selected object and its radius. **Fit map** shows the entire map. **Snap to tiles** places round lights in the middle of a tile and shadow blockers at a tile corner; turn it off for pixel placement. With the map focused, arrow keys move the selected object one tile, and Escape cancels placement or an active drag.

Use **Duplicate** to place a copy with the same settings at another location. Open **Map objects** to search existing sources and blockers. Exact coordinates and dimensions remain under **Coordinates & shape**. Round lights use their center; area lights and shadow blockers use their top-left origin. Polygon vertices are relative pixels; one tile normally equals 16 pixels.

Torches start with a warm fire flicker; lamps are steady. **Spotlight & falloff** contains the inner radius, beam spread and angle. A beam spread of 0 lights every direction. Radius controls take priority over the original ellipse bounds; **Use shape radius** under **Coordinates & shape** restores those bounds. The game uses whole tiles for radius and whole degrees for beams. Shrinking a light also keeps its inner radius within the new radius.

Area lights illuminate their rectangle with a uniform color. Use round lights for projected shadows and spotlights.

## Cast shadows

Place a rectangle or polygon blocker between a light and the area you want shaded. The blocker affects local lighting independently of collision and ambient light. Set that light's **Shadow strength** above 0 and enable **Show Others' Shadows** in the game's graphics settings.

Campfires, wall torches, windows and other round lights and spotlights cast indoors and outdoors. A blank **Shadow strength** uses the default. Set it to zero to turn off casting for that source. Moving characters cast on every map. On tilesets with a registered height atlas, local lights and sunlight use the same profiles for buildings, trees and scenery. Two lights on opposite sides of an object can illuminate each other's shadows. **Show Others' Shadows** controls scenery, mobs and other players. **Show Player Shadow** controls your own character's cast.

Firelight brightens and dims as the flame moves. The shadow is softest at its far edge, where the flicker is most visible. Disable **Enable Dynamic Lights** for a steady flame and shadow.

Edit polygon vertices as `x,y` pairs separated by spaces. For example, `0,0 32,0 32,32 0,32` makes a 2 × 2 tile box on a 16-pixel map. Move the whole polygon using Origin X/Y or map placement. Rotated and unsupported Tiled shapes remain available in Tiled.

When a polygon represents an existing height proxy, its optional Tiled property `proxyOwner` links the two. Use `tile:gid,dx,dy` for an atlas tile, with tile offsets from the polygon's origin cell, or `tree:dx,dy` for a layered tree, with pixel offsets from the rounded polygon origin to its root. The game uses the polygon when the linked caster is unavailable.

## Sun and moon shadows

In bounded outdoor scenes, profiled buildings, trees and props cast alongside moving characters. The sun follows the game clock. Low sun stretches the shadows, and moonlight casts a fainter shadow. In Scene manager, **Weather exposure → Outdoor** enables outdoor lighting. **Automatic** follows the scene's Tiled day/night flag. Indoor scenes use local emitters for projected light. [Scene settings](mapmaker-atmosphere.md)

![Town house, oak, boulder and noticeboard with their corresponding blue-to-magenta height proxies](town-shadow-proxies.png)

Build the client with `node bin/build-client.js` and run `node bin/local-parallax-preview.js`. Open the printed launcher URL. In **Afternoon shadows**, compare the Town house and oak at 07:00 and 16:00 using **Time of day**. **Resume clock** restarts time. Use **Weather** beside the clock to compare **Clear**, **Cloudy**, **Rain** and **Sunrays** outdoors. Under passing clouds, sunlight dims and its shadow edges soften. Cloud banks keep moving while the clock is held, and hold still with reduced motion. **Map weather** restores the scene’s authored weather. **Show shadow proxies** displays the visible height at each pixel, from blue at the ground to magenta higher up. In **Town · campfire at night**, walk around the flame to see the direction of the player's cast change.

Open Inventory with **Z** or Settings with **C** to see a panel cast onto the map. Panels share the light direction sampled at the player's feet. Scrub the outdoor clock or cross a nearby fire to change the cast direction.

**Duckville · tree shadows** starts at tile `(67, 437)`, directly below the tall bare tree. Its thin branches let light pass below them, and its wide roots meet the ground. **Duckville cave · firelit tree** starts at `(112, 428)`, beside the smaller bare tree and the existing fire at `(113.5, 427.5)`. These two tree profiles apply wherever their artwork is reused, including the alternate roots. The rest of Duckville's static artwork can use authored polygon blockers. [Duckville atlas](../client/img/common/height-proxies/duckville.png)

## Add height-aware scenery to another tileset

Open **Map & world → Scenery shadows** in the Mapmaker Toolbox, or follow the **Scenery shadows** link in **Lights & shadows**. Choose a map. Each copy of an object that uses the same tiles inherits its height profile, including copies on maps that share the tileset.

1. Under **Shadow bodies**, choose an existing object from the list or click its outline on the tilesheet. To create one, click **Add body**, drag tightly around the artwork, and give it a name. **Focus selection** zooms to the object.
2. Choose a shape and adjust **Front height**, **Ground depth** and **Roof slope**. Dimensions use the original tilesheet pixels. For a tree, choose **Rounded tree crown** and set its crown bottom and trunk span around the bark. The preview shows both the height proxy and its projected shadow. Move **Sun position** to check morning and afternoon contact at the feet or roots.
3. If the artwork already has a painted ground shadow, use **Paint removal** to mark its bounds. The baker removes translucent dark grey ink within those bounds. If a map has no outdoor gameplay scene, use **Outdoor areas** to mark its outdoor tiles on the map. These areas belong to the selected map. An authored scene takes precedence, so indoor rooms keep their own lighting.
4. Choose **Save changes** and start a fresh **Playtest**. Turn on **Show shadow proxies** to see the profiled surfaces in place. Scrub **Time of day** and move past a local light to inspect both casts. A profile save is immediately available in a new local session. To remove an object, select **Delete body** and save.

![Editing the height profile and afternoon shadow of the DreamLand cloud plaza oak](scenery-profile-editor.png)

The Toolbox saves the editable source in `tools/maps/height_profiles/<tileset>.json` and bakes the corresponding images and catalog entry under `client/img/common/height-proxies/`. Commit these files together. The baker needs Python 3 with Pillow, which the local Toolbox image includes. Run `python3 tools/maps/generate_main_height_proxies.py --map <tileset> --check` to compare checked-in assets against the source artwork. [Profile sources](../tools/maps/height_profiles) · [Atlas generator](../tools/maps/generate_main_height_proxies.py)

The shadow playtest launcher includes these outdoor examples.

| Map | Spawn tile | Scenery to inspect |
| --- | --- | --- |
| DreamLand | (92, 140) | Blossom grove, cloud plaza oak and bridge lamps |
| Cob’s Farm | (24, 484) | Barn, orchard and pines |
| Cob’s Farm City | (77, 410) | Snowy town hall, gabled houses and winter trees |
| Taiko Town | (81, 156) | Park trees, streetlights and signs |

Moving characters use their current sprite frames. In the Forest, the parallax roots, trunk and canopy use their placed drawing positions for shadows. Maps without a registered terrain atlas can still use authored finite lights, moving-character casts and polygon blockers.

## Preview, save and playtest

The editor preview shows authored lights, spotlights and polygon blockers, including your unsaved draft. Use the game playtest to inspect height-proxy casts, moving characters and tile-emitted lights. **Preview darkness** helps inspect lights without changing the map atmosphere. Turn **Preview lighting** off to see the original artwork. Markers and radius rings are editor guides. The preview uses the last built artwork. Fire flicker pauses when reduced motion is enabled. Full-map lighting previews use lower resolution than close-ups.

Place several lights or blockers with the same preset, then choose Select / move to tune them. Switching objects preserves every edit. **Save all changes** writes all pending additions, edits and removals together in `tools/maps/tmx/<map>.tmx`, preserving unrelated map data and custom properties. The button shows the pending count. **Remove object → Delete object → Confirm deletion** stages a removal in that batch. Reloading or switching maps asks before discarding the whole draft. Invalid or stale saves keep every pending change available for correction.

Choose **Build this map**, wait for the build, then start a fresh local session. The regular map exporter includes these lights and blockers in the client map. Ambient light, the day/night cycle and tint remain in the [Scene manager](mapmaker-atmosphere.md).

Continue with [Building maps](mapmaker-building.md) and [Mapmaker Toolbox](mapmaker-toolbox.md).
