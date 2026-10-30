# Ambient sounds and sound effects

Open **Ambient sounds** under **Map & world** in the Mapmaker Toolbox. Choose your map, select a preset, click **Place sound**, then click the source tile. The source is invisible in the game: place matching artwork in Tiled. Campfires and other scenery can use blocked tiles.

The five presets are **Campfire**, **Flowing water**, **Sea shore**, **Birds** and **Lava**. Campfire, water, shore and birds use bundled CC0 field recordings; lava is synthesized. Source links and adaptation details are in `client/audio/ambient/CREDITS.md`. Clips load only when nearby, from the game itself. If a bundled recording cannot load, a synthesized texture is used.

## Upload your own sounds

Choose **Upload a sound**, select a WAV, MP3 or Ogg file and click **Add to sound library**. Clips must be 0.1–30 seconds long and at most 10 MB; the browser must support decoding the format. Trim longer recordings and prepare a smooth loop before uploading. Use audio you have permission to distribute with the game.

The Toolbox converts clips to mono WAV for consistent positional playback. The upload appears in **New sound** and in every source's **Sound** selector, across all maps. Uploading preserves the current draft. Place the new sound or select it for an existing source, then **Save sounds**. Preview errors are shown beside the listener controls.

Uploads are stored in `client/audio/ambient/` with immutable content-based filenames. Include those WAV files and the map's `tools/worlds/<map>.json` when sharing or committing your work; the normal client build copies the recordings. The library supports 100 uploaded clips. Reuploading identical converted content reuses the existing asset. Removing a source does not delete a clip that another map might use. Missing or modified assets are rejected when saving/building their maps.

## Place and tune

Select a numbered marker or a source in the searchable list. Set its name, sound, tile coordinates, volume and radius. **Move on map** lets you click a new location; **Duplicate** retains its settings. **Remove from draft** takes a source out of the pending changes. To place with the keyboard, choose **Place sound**, focus the map and press Enter, then edit Tile X/Y.

The dashed circle is the audible radius in tiles. The sound is loudest at its center and fades smoothly to silence at the edge. Sources left of the player pan left; sources to the right pan right. Vertical distance also reduces volume. Movement uses the player's interpolated position, independent of the camera. Walls do not occlude sound, so keep indoor radii small.

Start with a radius of 6–9 tiles for fires, 12–15 for streams and 18–22 for shorelines. Keep volume modest where sources overlap. The game mixes up to eight nearby sources and reduces their combined level to leave room for music and gameplay effects.

## Listen before saving

Click **Start listening preview**. The dark marker is your listening position: click around the source or use **Listener X/Y**. The readout shows the selected source's distance level and stereo position before the overall mix adjustment. Try both sides of a source, its center, and outside its circle. Headphones make panning easiest to hear.

The preview plays the same sound engine as the game. **Stop preview**, leaving this tool, or hiding the browser stops it. Changing the listener does not change your map or create unsaved edits.

## Save and playtest

**Save sounds** writes the sources to `tools/worlds/<map>.json` alongside the map's other authored content. Reload reads them back. Unsaved edits stay in the tool when switching panes; switching maps or reloading asks before discarding them. A conflicting save keeps your draft and asks you to reload.

Start a fresh local session to load saved sources. Build the client after changing sound-engine code. Normal production builds include the same source definitions in both client map formats. Tiled map exports and visual artwork remain separate.

**Settings → Audio** has independent Music, Sound effects and Ambience sliders. Changes apply and save immediately in this browser. Defaults are 25% music, 80% effects and 80% ambience; music also controls streams. The Game audio switch controls regular music, effects and ambience, while Stream music retains its separate switch. Audio begins after a click, key press or touch gesture. Sources stop on death, disconnect, pause, hidden tabs and map transitions. Browsers without Web Audio keep the existing sampled effects but cannot play positional ambience.

## Main map and gameplay effects

The main map includes sources at nine campfires, the town fireplace, the forest river, both beach shorelines, three lavafalls and two forest bird locations. Edit or remove them using this tool.

Walking adds quiet surface-dependent footsteps. Tool contact frames add water, soil, wood or stone sounds where the tool's impact is configured; nearby actors' tool effects fade and pan from their target tile. These cues remain independent of reduced-motion and particle settings, and respect the audio switch.
