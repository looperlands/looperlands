# Scene manager

Open **Scene manager** and choose a map. It combines scene regions and the former Atmosphere editor: every scene is listed, including scenes without local atmosphere overrides. Existing atmosphere settings are loaded automatically. Old Atmosphere bookmarks still open the manager.

Scenes define named rectangular map regions. The game uses them for the camera, area objectives, events and ambience. Scripted cutscenes and NPC routines remain separate tools.

## Create and place a scene

1. Choose a **Starting atmosphere**: Blank scene, Forest, Night camp or Cave.
2. Click **New scene** and give it a recognizable **Scene name**.
3. Drag across the map in **Draw box** mode to draw its bounds, or enter **Tile X**, **Tile Y**, **Width in tiles** and **Height in tiles**. Coordinates use whole tiles and must stay inside the map. In **Move / resize** mode, drag inside the box to move it or drag one of its eight edge/corner handles to resize it. Use **Pan map** or Shift-drag to pan; scroll or use the buttons to zoom. **Focus area** frames the box. With the map canvas focused in **Draw box** or **Move / resize** mode, arrow keys move the box and Shift + arrows resize its bottom/right edges.
4. Adjust lighting, music and particles, then click **Save scenes**.
5. Start a fresh local session. Build the map first if you changed its artwork in Tiled.

**Duplicate scene** copies the bounds and atmosphere under a new ID. Move the copy to its new location by dragging it or using coordinate fields. **Higher priority** and **Lower priority** change the order: when scenes overlap, the first matching scene in the list wins on both client and server. The whole map default always acts as a fallback. The editor lists overlaps so you can check their order.

Scene IDs remain stable when you change a name. Quest area objectives and event conditions refer to scene names (or the ID for unnamed scenes), so update those references after renaming or removing a scene. New saved scenes appear in the Quest builder and Triggers & events area selectors.

**Remove scene** asks for confirmation and changes your draft. Save to apply it. **Reload** can discard unsaved edits. Under **Whole map default**, **Restore original Tiled scenes** replaces the local layout with the last built Tiled scenes and keeps atmosphere overrides for matching IDs; save to apply the restored layout.

## Lighting, music and particles

Enable **Customize atmosphere** to give a scene its own settings. Disable it to inherit the whole map default or the underlying Tiled settings. The optional **Whole map default** also covers tiles outside every scene.

Enable the day/night cycle to blend between the day and night darkness values. Disable it for fixed lighting using the day/fixed darkness value. Darkness ranges from 0 (fully lit) to 1 (dark); the tint sets the overlay color.

Music can inherit the map's existing music areas, use a registered track, or remain silent. Use the audio controls to listen before saving. Explicit scene music replaces ordinary music areas within that scene; scripted music areas still take priority.

Add up to three particle effects with a combined maximum of 24 particles per override. The editor uses the same particle renderer and lighting curve as the game. Motion pauses in the preview when the browser requests reduced motion.

## Preview and playtest

Choose a preview tile and move the game-time slider, or use Day, Dusk, Night and Dawn. The 13 × 13 tile view shows the last built map artwork with the current unsaved lighting and particles. Changing the preview tile or time does not change the saved configuration or game clock. The shared cycle has dusk from 16:00–18:00, night from 18:00–22:00 and dawn from 22:00–24:00. Preview audio plays only when you use its controls.

**Save scenes** writes scene bounds, order and atmosphere together to `tools/worlds/<map>.json`, preserving rules and dialogues. These files are also production content: the production image build validates them and includes the saved scenes and atmosphere in both client map formats and the server map. Commit and deploy the authoring files to ship the changes. The manager preserves other Tiled scene properties, including messages and scenery effects, by scene ID. It does not rewrite the TMX source or generated map exports.

Once saved, the local scene list takes precedence over the last built Tiled list. After adding scenes in Tiled, build the map and use **Restore original Tiled scenes** to adopt that layout. Unsaved changes survive switching tools; changing maps or reloading asks whether to discard them. A conflicting save or changed map export is rejected so your draft cannot overwrite a newer version.

Continue with [Building maps](mapmaker-building.md) and [Interactive map inspector](mapmaker-inspector.md).
