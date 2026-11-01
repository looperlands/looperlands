# Temporary content

Open **Map & world → Temporary content** and choose a map to create an event or inspect an existing one. Choose **main** to inspect Halloween. The editor shows all event content, including when the calendar window is closed. This preview does not enable the event for players.

Event definitions are saved in `tools/seasons/<map>.json`. Local playtests and production use this same source. Saving changes your checkout; commit and deploy the definition to publish it.

## Create a seasonal event

1. Choose its map and click **New event**. Give it a recognizable name.
2. In **Schedule**, set an annual date window or a one-off UTC range. Disable the event to prepare it without making it available in the game.
3. In **Actors**, add NPCs, choose their artwork and place them on the map. You can add a patrol route and a greeting.
4. Add decorations, guarded tile appearance, scene layers and positional sounds using the other tabs.
5. Save, build the selected map and start a fresh playtest within the event's calendar window.

For a seasonal quest, open **Quest builder** on the same map, create a custom quest and select the event in **Availability**. The quest follows the event's enabled switch and dates automatically. You can use the event's NPC kinds as quest givers and objective targets. Quest giver selection uses NPC kind; an objective's optional NPC key can distinguish a particular actor.

Custom events and their unlinked actors can be removed. Remove a quest's event reference before deleting the event. Halloween keeps its registered identities because its existing mysteries and cauldron depend on them. Creating decorations, patrols, greetings, effects and seasonal custom quests needs no JavaScript; a new scripted game mechanic still needs runtime support.

## Edit the event

- **Schedule:** enable or disable the event and choose an annual window or a one-off UTC range. The start is included and the end is excluded. October 15 through November 8 is entered as October 15 to November 9. These dates control the actors, greetings, effects and linked custom quests together. Halloween also applies them to its mysteries and cauldron.
- **Story text:** edit quest directions, objective labels, NPC dialogue and choice labels. Restore an original text to remove its override. Actions, conditions and saved progress identities stay fixed.
- **Actors:** add an NPC, edit its label, greeting and position, or move it on the map. Moving actors have editable route stops, pauses and movement areas. Linked Halloween actor identities stay fixed because quests refer to them.
- **Decorations:** place, move or remove decorative sprites such as pumpkins and the cauldron. Decorations do not change collision.
- **Tile appearance:** inspect and edit guarded replacements or color shifts on existing map tiles. The original tile ID is a guard: if the base map changes, an unrelated tile is not recolored. Removing an override restores the base map.
- **Layers:** edit the temporary parallax layers for each scene using the same layer controls as Scene manager. Scene boundaries belong to the map; the event stores its layers separately.
- **Sounds:** edit seasonal positional sound sources, their radius, volume and position.

The map shows the event's placements together. Select an entry to focus on it, then use its move action to place it on the map. Coordinate fields are also available for keyboard editing. A save rejects invalid schedules, unsafe artwork paths, blocked actor positions and broken references; it preserves your draft so you can correct them. Concurrent edits require reloading rather than overwriting another saved version.

If you move clues to different landmarks, update their quest directions and dialogue hints in **Story text** as well. Links to the existing Quest builder expose its other supported quest settings. Cauldron recipes and scripted story behavior remain in their feature modules.

## Test a saved change

1. Save the event. Read the confirmation and source path.
2. Open **Build this map**, build the selected map and wait for the game to restart. A build ends existing local sessions.
3. Open **Playtest** and create a fresh session. For Halloween, start at **44, 214**, beside Whispy in Town.
4. Visit the changed placement or scene. For a new quest run, choose another bundled avatar; a new session keeps the selected avatar's progress.
5. Return to Temporary content and reload to verify the saved values.

An inactive event stays visible in the editor, while the game restores the original map. To test a different calendar date locally, start the launcher with `LOOPERLANDS_CONTENT_DATE=2026-10-31T18:00:00Z`. Restart with `2026-11-09T00:00:00Z` to check the off-season world. This date override is restricted to development local playtests. Clear it to return to the real clock.

Changing the schedule does not reset completed quests, rewards or souvenirs. See the [Halloween testing guide](https://github.com/looperlands/looperlands/blob/main/docs/halloween-testing.md) for the full story routes, recipes and seven-scene visual tour.
