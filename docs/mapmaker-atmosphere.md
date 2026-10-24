# Atmosphere editor

Open **Atmosphere**, choose a map and click **Add atmosphere override**. Configure the **Whole map default**, or select a scene from the built map. A specific scene override takes priority over the whole map default. Removing an override restores the underlying Tiled settings after saving and starting a fresh session.

## Lighting, music and particles

Enable the day/night cycle to blend between the day and night darkness values. Disable it for fixed lighting using the day/fixed darkness value. Darkness ranges from 0 (fully lit) to 1 (dark); the tint sets the overlay color.

Music can inherit the map's existing music areas, use a registered track, or remain silent. Use the audio controls to listen before saving. Explicit scene music replaces ordinary music areas within that scene; scripted music areas still take priority.

Add up to three particle effects with a combined maximum of 24 particles per override. The editor uses the same particle renderer and lighting curve as the game. Motion pauses in the preview when the browser requests reduced motion.

## Preview and playtest

Choose a preview tile and move the game-time slider, or use Day, Dusk, Night and Dawn. The 13 × 13 tile view shows the last built map artwork with the current unsaved lighting and particles. Changing the preview tile or time does not change the saved configuration or game clock. The shared cycle has dusk from 16:00–18:00, night from 18:00–22:00 and dawn from 22:00–24:00. Preview audio plays only when you use its controls.

**Save** writes the atmosphere section of `tools/worlds/<map>.json`, preserving rules and dialogues. Use **Build tools** and start a fresh local session to see the result. Local map loading applies overrides to both worker and JSON map transports without rewriting exported maps. These files are local playtest configuration and are not published to the Platform.

If the artwork is missing or stale, build the map first. Scene names and geometry also come from the last build; use Tiled to change the layout.

Continue with [Building maps](mapmaker-building.md) and [Interactive map inspector](mapmaker-inspector.md).
