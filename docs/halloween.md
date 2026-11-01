# Halloween on the main map

Halloween returns **October 15 through November 8, UTC**, every year. Whispy arrives at the Town market, east of the central crossroads (tile 46, 214). The normal residents, shops, doors and collision map stay available.

Speak to Whispy to receive ten gold and choose a mystery:

- **The Missing Shadow:** inspect the abandoned shoes west of the witch, follow the trail to the pumpkin, and free Ordinary Adam's shadow. Report back for three pumpkins. One pumpkin and five gold make the permanent **Bottled Midnight** souvenir.
- **The Second Gravedigger:** hear both gravediggers by the notice board, read the old ledger and choose which story matches the evidence. Report back for wood to make **Graveyard Stew**.
- **The Whispering Well:** visit the basin by the south-west fountain, find the locket on the southern path and return it to the spirit. Report back for ore to make **Borrowed Courage**.

Three friendly ghosts follow a repeating route between the market, southern road and western path. They remain present after players solve the mysteries. Clues and decisions are personal; inspecting an object never consumes it for somebody else. All quests require only level 1. Clue dialogue, rather than combat, resolves the hauntings. The [cauldron guide](halloween-cauldron.md) describes recipes, effects and inventory failure handling.

The season adds pumpkins and a cauldron, temporarily recolors two existing tree canopies and the roof south of the market, and overlays sparse drifting ghosts and ground mist. Bubbling at the cauldron and water at the well use positional audio with distance fade, stereo pan and the existing ambient-volume setting. Reduced motion stops the parallax motion. These changes arrive in the world-scene packet; no Halloween copy of the TMX or permanent map export is needed.

## Annual and one-off content windows

`server/world-definitions/halloween-season.js` is the single schedule for these quests, dialogues, recipes, actors, tile appearance, parallax and audio. The server checks the window during play, including already-open dialogue and shop requests. Connected players receive the restored map when it closes; no restart at the boundary is necessary.

Annual example (inclusive start, exclusive end):

```js
const availability = {annual: {start: '10-15', end: '11-09'}};
```

For a regular, non-recurring content window, replace that value with UTC timestamps:

```js
const availability = {
    startsAt: '2026-10-30T18:00:00Z',
    endsAt: '2026-11-09T00:00:00Z'
};
```

The one-off version does not reopen the following year. Ordinary content with no `availability` remains available. Invalid schedules are rejected; they never silently enable content. Individual authored quests can also use either form in their `availability` field. This is calendar time, separate from the accelerated in-game day/night clock.

In-progress quests pause outside their window and disappear from the active Journal; they resume with the same progress next season. Completed quests and souvenirs remain saved. Annual availability does **not** reset completion or grant another annual reward. A separate replay/reset policy is deliberately not part of this event.

## Local playtest

Start the normal Mapmaker Toolbox with `./start-local.command`. Choose `main`, checkpoint 2 and a custom spawn of **44, 214**, then start a fresh game. A game time around **18:00** shows the evening ambience while keeping the clues readable. Walk two tiles east to Whispy. Use a different bundled avatar to test a fresh quest path; local quest progress belongs to the avatar.

To preview dates outside the real calendar, set the local server's content date before starting:

```sh
LOOPERLANDS_CONTENT_DATE=2026-10-31T18:00:00Z ./start-local.command
```

Use `2026-11-09T00:00:00Z` to check the restored off-season world. This optional environment value is accepted only with `NODE_ENV=development` and `LOOPERLANDS_LOCAL_PLAYTEST=1`. Production always uses the real clock. Leave it empty to use the actual date. Changing a preview date requires restarting the local service; ordinary production boundaries are detected while it runs.

The artwork, actor placements and appearance overrides live in the Halloween world definition and scene. The generic availability, renderer and audio hooks have no Halloween dates or coordinates. Existing bundled sprites were copied under independent NPC/item IDs; their original meaning and behavior remain unchanged.
