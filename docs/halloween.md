# Halloween on the main map

Halloween returns **October 15 through November 8, UTC**, every year. Whispy arrives at the Town market, east of the central crossroads (tile 46, 214), and sends players to hauntings in the **Forest, Graveyard and Beach**. The normal residents, shops, doors and collision map stay available.

Speak to Whispy to receive ten gold and choose a mystery:

- **The Missing Shadow — Forest:** head north from Town and inspect the abandoned red shoes beside the central road, just north of the river bridge. Continue north to the fork, then take the west branch to the Whispering Pumpkin beside the campfire south of the tent. Free Ordinary Adam's shadow and report back for three pumpkins. One pumpkin and five gold make the permanent **Bottled Midnight** souvenir.
- **The Second Gravedigger — Graveyard:** follow the main road north through the Forest into the Graveyard, then head west toward the two northern wooden crypts. Hear both gravediggers and read the purple **Burial Register** between the crypts. Their matching ghost sheets conceal which one is alive; compare their accounts of the Town notice board with the register. Report back for wood to make **Graveyard Stew**.
- **The Whispering Well — Beach:** head south from Town to the sea and listen to the voice through the small green basin just east of the central shoreline palm. Follow the shore west to the blue-stoned ring below the western palm, then return east to the basin. Report back to Whispy for ore to make **Borrowed Courage**.

Three friendly ghosts follow a repeating route through the western Graveyard. They remain present after players solve the mysteries. Clues and decisions are personal; inspecting an object never consumes it for somebody else. All quests accept level 1, and the mysteries are resolved through dialogue choices; ordinary regional enemies remain active along the journey. Visiting a prop alone does not free the shadow or take and return the ring. The Journal tracks those choices and directs you back to Whispy in Town for the reward. You can accept all three mysteries before leaving Town. The [cauldron guide](halloween-cauldron.md) describes recipes, effects and inventory failure handling.

The season adds pumpkins around Town, Forest, Graveyard and Beach, with a cauldron beside Whispy. It overlays ground mist in Town; the saved Halloween definition has no tile recolors or positional sound sources. Drifting ghosts appear throughout **Town, Forest, Graveyard, Beach, Desert, Lavaland and Party Beach**, using three depths with different sizes and movement. The Graveyard is most densely haunted; Desert and Lavaland use fewer, fainter ghosts to preserve combat readability. The ghosts stay luminous at night and follow the map's scene boundaries. Reduced motion stops the parallax motion. These changes arrive in the world-scene packet; no Halloween copy of the TMX or permanent map export is needed.

## Annual and one-off content windows

Use **Map & world → Temporary content** in the Mapmaker Toolbox to edit Halloween's schedule, actors, decorations, tile appearance, parallax and positional audio. The editor shows its placements even outside the season. Save, build main and start a fresh playtest to use your edits. See [Temporary content](mapmaker-temporary-content.md).

`tools/seasons/main.json` is the source for these settings. The feature's `halloween-season.js` adapter supplies the same schedule to quests, dialogues and recipes. The server checks the window during play, including already-open dialogue and shop requests. Connected players receive the restored map when it closes; no restart at the boundary is necessary. Changing a saved definition requires a build/restart.

Annual example (inclusive start, exclusive end):

```json
{"annual": {"start": "10-15", "end": "11-09"}}
```

For a regular, non-recurring content window, replace that value with UTC timestamps:

```json
{
    "startsAt": "2026-10-30T18:00:00Z",
    "endsAt": "2026-11-09T00:00:00Z"
}
```

The one-off version does not reopen the following year. Ordinary content with no `availability` remains available. Invalid schedules are rejected; they never silently enable content. Individual authored quests can also use either form in their `availability` field. This is calendar time, separate from the accelerated in-game day/night clock.

In-progress quests pause outside their window and disappear from the active Journal; they resume with the same progress next season. Completed quests and souvenirs remain saved. Annual availability does **not** reset completion or grant another annual reward. A separate replay/reset policy is deliberately not part of this event.

## Local playtest

Use the [complete Halloween test checklist](halloween-testing.md) for the quest walkthroughs, visual tour, recipes, audio and availability checks.

Start the normal Mapmaker Toolbox with `./start-local.command`. Choose `main`, checkpoint 2 and a custom spawn of **44, 214**, then start a fresh game. A game time around **18:00** shows the evening ambience while keeping the clues readable. Walk two tiles east to Whispy. Use a different bundled avatar to test a fresh quest path; local quest progress belongs to the avatar.

To preview dates outside the real calendar, set the local server's content date before starting:

```sh
LOOPERLANDS_CONTENT_DATE=2026-10-31T18:00:00Z ./start-local.command
```

Use `2026-11-09T00:00:00Z` to check the restored off-season world. This optional environment value is accepted only with `NODE_ENV=development` and `LOOPERLANDS_LOCAL_PLAYTEST=1`. Production always uses the real clock. Leave it empty to use the actual date. Changing a preview date requires restarting the local service; ordinary production boundaries are detected while it runs.

The editable actor placements and appearance overrides live in the seasonal source. The Halloween world definition and scene supply the story and its runtime integration. The generic availability, renderer and audio hooks have no Halloween dates or coordinates. Existing bundled sprites were copied under independent NPC/item IDs; their original meaning and behavior remain unchanged.
