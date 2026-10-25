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

Place a rectangle or polygon blocker between a light and the area you want shaded. Set that light's **Shadow strength** above 0. A blocker shapes the light; it does not change collision or cast a shadow from ambient light. Enable **Render shadows** in the game's graphics settings to see blockers during play.

Edit polygon vertices as `x,y` pairs separated by spaces. For example, `0,0 32,0 32,32 0,32` makes a 2 × 2 tile box on a 16-pixel map. Move the whole polygon using Origin X/Y or map placement. Rotated and unsupported Tiled shapes remain available in Tiled.

## Preview, save and playtest

The map uses the same lighting and shadow renderer as the game, with all current lighting objects and your unsaved draft. **Preview darkness** helps inspect lights without changing the map atmosphere; turn **Preview lighting** off to see the original artwork. Markers and radius rings are editor guides. The preview uses the last built artwork and excludes player lights and tile-emitted lights. Fire flicker pauses when reduced motion is enabled. Full-map lighting previews use lower resolution than close-ups.

**Save changes** updates only the selected object in `tools/maps/tmx/<map>.tmx`, preserving unrelated map data and custom properties. **Remove object → Delete object → Confirm deletion** saves a deletion immediately. Unsaved drafts are guarded when switching objects or maps; a source changed by another tab or Tiled must be reloaded before saving.

Choose **Build this map**, wait for the build, then start a fresh local session. The regular map exporter includes these lights and blockers in the client map. Ambient light, the day/night cycle and tint remain in the [Scene manager](mapmaker-atmosphere.md).

Continue with [Building maps](mapmaker-building.md) and [Mapmaker Toolbox](mapmaker-toolbox.md).
