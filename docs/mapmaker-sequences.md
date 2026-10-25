# Scripted sequences & cutscenes

Open **Sequences & cutscenes** in the Gameplay group. Choose a map, then create a sequence or use **Camera & dialogue preset**. NPC steps use that map's named routines; place the NPC and create its routine in **NPCs** first.

## Build a timeline

Name the sequence and choose its starting event: map entry, entry into a drawn rectangle, quest completion, NPC conversation, mob defeat or trigger activation. Event targets must refer to registered content. Optional requirements use the same inventory, quest, level, kill and trigger checks as **Triggers & events**.

The timeline runs from top to bottom. Select a step to edit it, move it up or down, or remove it. Available steps:

- **Move NPC:** select a routine and place a destination on the map. The camera follows the actor along its normal collision-aware route. The next step starts after the actor arrives and finishes its final walking tile. Its duration is an arrival timeout, not a teleport or fixed walking speed.
- **Face a tile:** turn the selected NPC toward a map target.
- **NPC dialogue:** speak to the initiating player, with the shared dialogue styles and animated preview.
- **Show caption:** show cutscene text independently of an NPC.
- **Wait:** pause the sequence.
- **Pan camera / Follow player again:** focus a map tile, then restore normal following. Reduced-motion settings make pans immediate.
- **Play sound / Play music:** choose a bundled audio track. Map music resumes when playback finishes.
- **Activate / Deactivate trigger:** change a gate or other linked event using the game's existing trigger system.

Coordinates are absolute map tiles, including camera targets in another scene. Cutscene cameras temporarily use the map bounds; **Follow player again** and playback recovery restore the player's current scene bounds. Select a movement, facing or camera step, then click its target on the staging map. Numeric coordinates provide precise keyboard placement. Area starts use the shared draw, move and resize editor. NPCs referenced by the timeline stay visible and receive movement updates for the initiating player, including outside the normal player visibility range. Normal entity visibility resumes when playback ends or is interrupted.

**Next preview step** simulates the order and targets in the Toolbox. It does not move live NPCs, grant progression, play live audio or activate gates. Use a fresh game session for a functional playtest.

## Playback and recovery

Enable **Cinematic** to pause the initiating player's movement and gameplay actions while the sequence runs. Chat remains available. Other players keep playing. NPC actors are shared world characters: one sequence owns an actor at a time, and conflicting starts wait briefly before expiring.

Allow skipping when players should be able to use **Skip cutscene** or Escape. Skipping restores control and resumes actor routines; it does not execute later timeline actions. A skipped once-per-avatar sequence counts as seen. Put mandatory progression in quest/event rules instead of relying on a skippable cutscene.

Choose **Once per avatar** or **Repeat after cooldown**. Completion recognition uses the same avatar-based NPC memory store as existing scripted scenes. Repeat cooldowns apply on the running server; they are not an inventory or quest reward transaction.

Actor disappearance, death, disconnect, failed movement and the five-minute playback limit cancel the sequence and release its locks. Interrupted sequences are not marked complete. The client also restores its camera and controls if the connection or playback heartbeat is lost. NPCs return to their saved routines; they walk onward from their current position rather than teleporting back.

## Save, build and deploy

Click **Save sequences** to persist the timeline in the `sequences` section of `tools/worlds/<map>.json`. Other world authoring sections are preserved. Stale saves are rejected; keep your draft, reload, then reapply it if another editor changed this section.

Sequences are gameplay definitions, so they are saved beside the other world content rather than embedded in Tiled object properties. Tiled remains the terrain/layout source. The starting rectangle and step coordinates are stored in tiles in the world JSON.

Build and restart the local game, then start a fresh session and test its actual starting event. Commit the world JSON with the Toolbox/runtime code and any referenced NPC routine changes. The production build validates sequence definitions and the production world registry loads them without a playtest flag. Content changes also participate in the server release manifest. A save or local commit does not deploy production.

The validator links sequence errors back to this editor. A clean definition check cannot prove that an NPC can cross a dynamically occupied route; always test the encounter in-game.
