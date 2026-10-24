# NPCs and routines

Use **NPCs** in the Mapmaker Toolbox for dialogue characters. **Mobs** is a separate page for combat and loot.

## Create or edit an NPC type

Open **NPCs → Sprites & dialogue**. Choose a built-in or custom NPC to edit it, or click **New npc** to copy it into a separate type. Give the copy a unique ID of 2–48 lowercase letters, numbers or underscores, starting with a letter, and a display name. Saved IDs stay fixed.

The dialogue field holds one plain-text message per line. Unchanged built-in dialogue preserves existing links; a new copy starts with plain text. Use the [Quest builder](mapmaker-quest-builder.md) for styled quest dialogue, objectives and rewards. Built-in types keep their scripted behaviour and numeric kind when you save an override.

Upload a transparent PNG, choose its uploaded scale and enter the frame dimensions at 1×. The editor prepares 1×, 2× and 3× artwork, with animation and tile-alignment previews. Rows start at 0; frames run from left to right. NPCs need `idle_down`; older front-facing sheets can reuse that animation when walking. Directional walking animations make movement easier to read. See the [sprite preparation guide](mapmaker-mobs.md) for frame sizing and offsets.

Click **Save & register**. In Tiled, add a point object to an object layer named `mapmaker-entities`, with the exact NPC ID as its Name. Save the TMX and [build the map](mapmaker-building.md). The behaviour editor reads placements and collisions from this generated map, so newly placed characters appear there after a build.

## Set up behaviour for a placed NPC

Open **NPCs → Behaviour & schedule** and select a map. Existing bundled routines load automatically, including the Town routines on main. Search by name, routine ID or NPC type. A routine belongs to one NPC type at one exact spawn tile; different placements can have different routines.

Choose a routine to edit, or click **New routine** to start with an NPC placement that has no routine yet. Choose an available NPC placement, then set its routine ID, name and outside movement area. Choosing a placement fills its type and spawn tile. Spawn coordinates must exactly match an NPC in the built map. Saved routine IDs stay fixed.

Choose **Patrol**, **Work** or **Socialise**, and a step duration from 300–2000 milliseconds. Lower durations mean faster walking. **Preserve the original click-through dialogue** retains the NPC's original conversation while allowing ambient behaviour. Keep it enabled for characters whose existing conversation or links should remain available.

Add normal-route waypoints using tile X/Y and wait time in seconds. The NPC visits them in order and repeats the route. Each waypoint must be walkable, inside the outside movement area and away from door tiles. Optional activity text, ambient messages and sounds accompany each stop. Use **Move up** and **Remove waypoint** to arrange the route. At least one waypoint is required.

Ambient dialogue supports first greetings, returning-player greetings, conversation, nearby combat and quest completion. Enter one short plain-text message per line, up to 240 characters each. Existing quest references, story reactions and other unexposed routine fields are preserved when editing a bundled routine.

## Add a daily schedule

Enable **Use a daily schedule**. Without a schedule, the normal route repeats. By default, the shared game clock follows server uptime: one full game day lasts one real hour. An existing fixed-time ambience preview also fixes the schedule clock. It is not your computer's local time.

Add phases in ascending start-hour order. The first must begin at 0; hours range from 0 to less than 24. Decimals are supported: 6.5 means 06:30. Each phase continues until the next phase starts; the final phase runs until midnight.

For each phase, choose Work, Free time, Home or Sleep. Enter an activity description, location ID, location description, travelling description and routine dialogue. The location ID is `outside` or the ID of a building defined above the phases. Add a route within that location's movement area. The routine dialogue explains what the NPC is doing when asked. Once a sleeping NPC reaches its scheduled location, it suppresses automatic greetings, combat and quest reactions, and conversations with other NPCs. Player and quest dialogue remain available; any waypoint messages and sounds in the phase still run. Player conversations pause movement.

Buildings need a unique ID, description, inside movement area, outside entrance tile and inside return-door tile. These must be an existing public, bidirectional door pair on the same map, with each door landing exactly at the other door. Gated, time-restricted, triggered, redirected or cross-map doors cannot be used. An entrance belongs to the outside area; its return door belongs to the building area. All phase waypoints must be walkable. The editor checks these against the latest built map; build again after changing doors or collisions in Tiled.

Existing scripted scenes can temporarily override a routine. When they release it, the current clock phase chooses the NPC's next activity. Settings affect the shared world; they do not add schedule state to individual player quest saves.

## Save, load and recover

**Save routine** writes an override to `tools/npcs/<map>.json`. Only that routine is replaced; bundled routines, conversations and map ambience remain available. The file is read when the world starts, including maps that have no bundled routines. Include it when sharing or deploying your map. In the local Docker setup this directory is mounted into the game container, so saves reach the checkout.

After saving, build the selected map to restart the local game, then start a fresh [game session](mapmaker-sessions.md). Check walking, conversations and the relevant clock phases. Loading a valid file does not guarantee every path is reachable: walls, narrow corridors and other entities can delay movement.

**Reset to bundled routine** removes that routine's override. **Remove saved routine** removes a routine created in the toolbox. Neither action removes the NPC's placement from the map. Use Tiled for placement changes.

Saves reject stale revisions and are blocked during map builds. If another tab or external edit changed the source, copy any draft values you need, click **Reload routines**, then reapply them. Switching maps or routines with unsaved changes offers **Discard changes** and **Keep editing**. Moving between toolbox screens retains drafts; reloading the page does not.

Type definitions, dialogue and sprite data still live in `shared/js/mapmakerentities.json`, `client/sprites/<id>.json` and `client/img/1`, `client/img/2`, `client/img/3`. Save the type before placing it, build the placement before adding its routine, then save the routine and restart through Build tools.

Use the [NPC route painter](mapmaker-routes.md) inside each normal route or schedule phase to place waypoints on the map and preview movement.
