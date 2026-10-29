# Scene manager

Open **Scene manager** and choose a map. It combines scene regions and the former Atmosphere editor: every scene is listed, including scenes without local atmosphere overrides. Existing atmosphere settings are loaded automatically. Old Atmosphere bookmarks still open the manager.

Scenes define named rectangular map regions. The game uses them for the camera, area objectives, events and ambience. Scripted cutscenes and NPC routines remain separate tools.

## Create and place a scene

1. Choose a **Starting atmosphere**: Blank scene, Forest, Night camp or Cave.
2. Click **New scene** and give it a recognizable **Scene name**.
3. Drag across the map in **Draw box** mode to draw its bounds, or enter **Tile X**, **Tile Y**, **Width in tiles** and **Height in tiles**. Coordinates use whole tiles and must stay inside the map. In **Move / resize** mode, drag inside the box to move it or drag one of its eight edge/corner handles to resize it. Use **Pan map** or Shift-drag to pan; scroll or use the buttons to zoom. **Focus area** frames the box. With the map canvas focused in **Draw box** or **Move / resize** mode, arrow keys move the box and Shift + arrows resize its bottom/right edges.
4. Adjust lighting, weather, parallax, music and particles, then click **Save scenes**.
5. Start a fresh local session. Build the map first if you changed its artwork in Tiled.

**Duplicate scene** copies the bounds and atmosphere under a new ID. Move the copy to its new location by dragging it or using coordinate fields. **Higher priority** and **Lower priority** change the order: when scenes overlap, the first matching scene in the list wins on both client and server. The whole map default always acts as a fallback. The editor lists overlaps so you can check their order.

Scene IDs remain stable when you change a name. Quest area objectives and event conditions refer to scene names (or the ID for unnamed scenes), so update those references after renaming or removing a scene. New saved scenes appear in the Quest builder and Triggers & events area selectors.

**Remove scene** asks for confirmation and changes your draft. Save to apply it. **Reload** can discard unsaved edits. Under **Whole map default**, **Restore original Tiled scenes** replaces the local layout with the last built Tiled scenes and keeps atmosphere overrides for matching IDs; save to apply the restored layout.

## Lighting, music and particles

Enable **Customize atmosphere** to give a scene its own settings. Disable it to inherit the whole map default or the underlying Tiled settings. The optional **Whole map default** also covers tiles outside every scene.

Enable the day/night cycle to blend between the day and night darkness values. Disable it for fixed lighting using the day/fixed darkness value. Darkness ranges from 0 (fully lit) to 1 (dark); the tint sets the overlay color.

Music can inherit the map's existing music areas, use a registered track, or remain silent. Use the audio controls to listen before saving. Explicit scene music replaces ordinary music areas within that scene; scripted music areas still take priority.

Add up to three particle effects with a combined maximum of 24 particles per override. The editor uses the same particle renderer and lighting curve as the game. **Particle opacity at night** controls each effect independently. Ordinary particles default to 0.45, embers to 0.8 and fireflies to 1; fireflies still appear only as daylight fades. Main-map examples retain the original regional leaves, fireflies, pollen, sand, spray, dust, ash and embers alongside the image layers. Motion pauses in the preview when the browser requests reduced motion.

### Design a custom particle effect

In **Particles**, click **Design custom effect**, or change an existing effect's **Particle type** to **Custom effect**. Start from Snow, Rain, Magic motes or Smoke, then adjust:

- **Shape**: Pixel, Streak, Star or Soft puff; **Size** uses map pixels.
- **Colors**: one to six colors, sampled across the particles. **Opacity**, **Glow**, **Pulse strength** and **Spin** control their appearance.
- **Horizontal drift** and **Vertical drift** use map pixels per second. Negative values move left or upward. **Sway** adds gentle wandering.
- **Particle count** shares the existing 24-particle budget with the other effects in this atmosphere.

The live preview shows a full world patch so sparse effects remain visible. Switch its background between Day and Night, pause it or restart its animation. These controls do not mark the scene dirty. Use the map preview below to see the design over terrain with the selected lighting. Save scenes to retain the complete design; duplicating a scene also copies its effects. To remove a design, remove that effect or choose a built-in type.

Custom designs travel with the saved atmosphere through local sessions, map exports and production builds. The renderer uses map coordinates, so camera movement does not reset the effect. Reduced motion and the game's ambience setting continue to apply. See [Interactions](mapmaker-tile-actions.md) for custom bursts on successful player actions.

## Preview and playtest

Choose a preview tile and move the game-time slider, or use Day, Dusk, Night and Dawn. The 13 × 13 tile view shows the last built map artwork with the current unsaved lighting and particles. Changing the preview tile or time does not change the saved configuration or game clock. Uncustomized scenes retain the original cycle (dusk 16:00–18:00, night 18:00–22:00, dawn 22:00–24:00). Custom cycles use the dawn and dusk hours selected for that scene. Preview audio plays only when you use its controls.

**Save scenes** writes scene bounds, order and atmosphere together to `tools/worlds/<map>.json`, preserving rules and dialogues. These files are also production content: the production image build validates them and includes the saved scenes and atmosphere in both client map formats and the server map. Commit and deploy the authoring files to ship the changes. The manager preserves other Tiled scene properties, including messages and scenery effects, by scene ID. It does not rewrite the TMX source or generated map exports.

Once saved, the local scene list takes precedence over the last built Tiled list. After adding scenes in Tiled, build the map and use **Restore original Tiled scenes** to adopt that layout. Unsaved changes survive switching tools; changing maps or reloading asks whether to discard them. A conflicting save or changed map export is rejected so your draft cannot overwrite a newer version.

Continue with [Building maps](mapmaker-building.md) and [Interactive map inspector](mapmaker-inspector.md).

## Weather and dynamic daylight

Under **Dawn & dusk**, enable **Customize daylight hours and colors** to set dawn/dusk start hours, their durations, and day/night/dawn/dusk tints. Enable the day/night cycle above to activate these settings. Dawn must finish before dusk; dusk must finish by midnight. The shared one-hour game clock stays unchanged, so quests, NPC schedules and doors retain their timing. Old atmosphere files without these settings keep their original lighting.

Select **Whole map default**, enable **Outdoor weather** under **Map weather**, and choose **Fixed weather** or **Repeating weather sequence**. Effects are Clear, Rain, Sunrays and Cloudy. Cloudy uses the Beach cloud artwork at two parallax depths, with wind-driven drift and a soft reduction in daylight. It supports fixed weather and sequence phases, fades with intensity, and respects nighttime opacity, indoor shelter and reduced motion. Intensity runs from 0–1; wind from -1 (left) to 1 (right). Each sequence phase lasts 10–1800 real seconds, with a 1–30 second transition that must fit within half of each phase. Each scene has a **Weather exposure** setting independent of its lighting: **Outdoor** uses this map weather, **Indoor** stays sheltered, and **Automatic** uses the original Tiled day/night flag. All outdoor scenes share the same sequence, wind, intensity and phase. The sequence repeats on the shared world clock, including after entering a scene; weather does not restart when the camera moves. Rain adds soft cloud cover. **Weather opacity at night** reduces visual contrast without changing rain density or the shared weather phase; the default is 0.45. Sunrays fade with the scene's daylight and disappear at night. Reduced motion removes falling rain and freezes ray movement; the ambience setting disables weather.

Use **Animate day/night preview** to scrub through a day at one game hour per second without saving or changing the game clock. The preview caption shows the active rain and sunray strengths. Weather continues to animate while the hour slider is stationary.

## Parallax and lower terrain

Enable **Scene parallax** to add up to eight image layers. Expand a layer to choose its image, plane, size, opacity, scroll factors, offsets and independent drift. The bundled imagegen artwork includes clouds, mist, sand, smoke, embers, seeds, lava and tree components. Every layer also offers **Upload PNG for layer**. Upload a transparent PNG up to 4 MB, 4096 pixels per side and 8 million pixels. The image is added to the shared library and selected for that layer; **Save scenes** saves the assignment. The same image can be reused on any map. Existing layer size, anchor, depth and motion settings stay intact when switching images. Uploaded images use immutable filenames so other scenes keep their artwork. Commit the new `client/img/parallax/` files along with the world file when publishing.

- **Below terrain** draws distant layers behind the map. Scroll factors below 1 make them appear lower, as used for lava and DreamLand's sky.
- **On terrain** draws above the terrain and below characters and lighting.
- **Among characters** interleaves placed sprites, such as trunks, with character feet.
- **Above characters** draws overhead canopy or atmospheric layers.

A factor of 1 follows the terrain; values above 1 appear closer. Sizes and offsets use native map pixels (16 per tile). Drift uses pixels per second and remains smooth at fractional speeds. **Horizontal/Vertical sway amplitude** adds bounded motion in map pixels; **Sway cycle in seconds** controls its speed. Set both amplitudes to zero to anchor a layer. Tree layers at the same root share a phase, with progressively larger canopy amplitudes; roots stay fixed. Reduced motion disables drift and sway.

Overhead layers also expose **Layer opacity at night** and **Layer brightness at night**. Opacity multiplies the ordinary layer opacity; brightness 0 follows ambient darkness and 1 stays fully bright. Values blend continuously with ambient light. Atmospheric layers default to 0.45 opacity and 0.55 brightness in darkness, while placed trees remain opaque and follow the lighting. Luminous embers can retain a higher value. Layers respect scene overlap priority, including scenes with no effects, so an indoor region can exclude outdoor parallax. The optional whole-map default also follows that priority.

For **Below terrain**, add exact **Terrain colors** to reveal the background through flat fills. Only matching background pixels change: edges, high tiles, bridges and collisions are retained. The original map stays visible until every replacement background image has loaded. A **Background fill** prevents gaps between textures.

Enable **Use sprite placements** for tree assemblies. The **Sprite placements** panel sets roots in pixels relative to the scene's top-left corner, with scale and mirroring. Placed layers share roots; anchors and offsets align roots, trunks and canopy. Duplicating a scene copies the complete configuration. Removing a placed tree image does not remove its collision footprint; edit collision geometry in Tiled when changing gameplay layout.

Parallax, particle and daylight settings save inside each atmosphere override; shared weather saves at map level and weather exposure saves with each scene in `tools/worlds/<map>.json`. Both local playtests and production map builds consume this same content. No per-map server script is needed. See [Parallax implementation and examples](parallax.md).

### Reuse a tree assembly on another map

Enable scene parallax and add root, trunk and canopy layers. Upload or select an image for each layer and enable **Use sprite placements**. Use **On terrain** for roots, **Among characters** for trunks, and **Above characters** for canopy. All layers share the **Sprite placements** roots, with independent size and anchors to align the artwork. Start scroll factors at 1 for roots/trunks and approximately 1.03–1.17 for canopy. Keep roots at zero sway, use very small trunk sway, then increase canopy amplitudes; use the same sway period for connected layers. Set placements and save the scene. This works on any configured map without code changes. Art placement does not create collision: author solid tree footprints in Tiled as usual.
