# NPC routines and world atmosphere

The first pilot is Town on `main`: Ordinary Adam does work rounds, one Town Watch
guard patrols, and Bstrat515 visits neighbours. They occasionally chat when their
routes bring them together. Players receive private first-visit/return greetings;
nearby monster defeats can produce local reactions. Bstrat515 remembers completion
of her existing rat quests. Existing quest and dialogue-tree responses take priority
over routine dialogue. The Lantern Picnic is a production prologue using the existing quest and choice
engine. The isolated preview exercises the same content with loopback fixtures.

## Local playtest

Build the current client and start the isolated preview:

```sh
node bin/build-client.js
node bin/local-npc-preview.js
```

The launcher prints two game session URLs. Both start at Town checkpoint 2 with a
local avatar and sword. It uses fixture APIs on loopback only; backend writes never
reach the platform. The existing development server on port 8000 stays separate.
Default ports are 8013 (game) and 3013 (fixtures); override them with
`NPC_PREVIEW_PORT` and `NPC_PREVIEW_FIXTURE_PORT` if needed.

For a fresh session, open `http://127.0.0.1:3013/preview/player/1` or `/preview/player/2`.
Starting another session for the same local player disconnects their previous one.
The preview starts at night. Use the Day, Night and Cycle buttons above the game
to change the atmosphere for both players without restarting the session.
The fixture's read-only `/preview/state` endpoint reports the three NPC positions
and activities. Stop the preview with Ctrl+C.

Check these behaviours:

1. Wait near the market south of the northern Town buildings. Adam, the guard and
   Bstrat515 visit the market on independent routes, with pauses for their activities.
2. Approach and click an NPC. It pauses for 20 seconds; subsequent interactions renew
   that pause. Move away and watch it resume. An NPC stays still while greeting you.
3. Walk away and return after 180 seconds, or start a fresh session with the same
   avatar. NPCs recognise returning visitors without greeting on every nearby step.
4. Connect player 2 in another browser/tab. Both see the same NPC routes and local
   conversations. Personal greetings and quest acknowledgement remain private.
5. Play the Lantern Picnic quests below. Options and quest conditions use the existing
   dialogue engine; later dialogue and greetings recall your specific decisions.
6. Watch the three market conversations involving different pairs of neighbours.
   Their five or six lines have six-second gaps and a two-minute cooldown. Clicking either
   participant interrupts the scripted exchange in favour of player dialogue.
7. Try the Day and Night buttons, then Cycle for Town's three-minute light cycle
   and bright fireflies. Their glowing halos and cores are anchored in map pixels:
   walking moves them with the scenery, while each insect wanders slightly.
   A short camera interpolation smooths whole-pixel scroll updates; teleports snap
   directly to the new location. The glow is deliberately softer than the first preview.
   Walk north into Forest:
   the Town overlay disappears. Reduced-motion preferences produce a static tint.

Visitor recognition lives in the operating system's temporary directory under
`looperlands-npc-preview/npc-memory.json` and survives preview restarts. Fixture quest
data and choices are saved separately in `lantern-game-data.json` and survive preview
restarts too. Rat kills are saved by the normal kill queue, which flushes every 30
seconds. Other game backend features are outside this fixture's coverage.

### The Lantern Picnic

The production prologue lives in `server/npc-behaviors/lantern-picnic.js`.
The launcher installs its dialogue trees and quest definitions into the existing
engine. It uses the existing `record_choice`, `handout_quest`, `complete_quest`,
`choice_made`, `quest_open`, `quest_completed`, and `killed_mob` actions/conditions.
The normal game server registers this story on the main map. Its original quest
IDs and choices are permanent: later chapters use `LANTERN_INVITATION` completion
as their entry condition, with no reset or dependency on attendance files.

1. **Adam / A Borrowed Basket:** offer to help. Bstrat borrowed his basket for
   blankets; he needs it for bread. Find Bstrat and choose to return it or share it.
   Report to Adam to complete the quest. He explains which plan he remembers.
2. **Town Watch / A Safe Path:** accept the next job after completing the basket
   quest. Defeat three rats in total; earlier kills count. The watch only offers the
   completion option when the kill condition is met. Report back to complete it.
3. **Bstrat / Everyone Is Invited:** choose a quiet picnic so the watch can rest,
   or music so everyone can join in. Completing this choice finishes the final quest.
4. **Return visits:** click all three neighbours and later approach them again.
   Their dialogue and greetings mention the basket plan, the rat report or the
   picnic choice. Each line says who told them, what you did, or why it matters.
5. **The picnic itself:** finishing the invitation starts a shared gathering south
   of the market, around tile 42,216. All three NPCs stop their rounds and walk there
   using their usual collision-aware movement. Occupied seats are replaced with
   reachable seats. A blanket, bread, cake and lanterns appear; the guide announces
   their arrival. They stay for 90 seconds and share an eight-line exchange.
   Picnic scenery is drawn in the renderer worker between terrain and characters,
   using the exact map camera. Players and upper map tiles render over it.
   The music choice plays the existing `fluteguitar` track nearby through the normal
   music manager and respects its enabled setting. Quiet has no extra music.
   Afterwards the scenery clears and their ordinary routes resume. Picnic attendance
   is remembered, so completed preparations do not restart it on every reconnect.
   Use **Replay picnic** in the expanded local guide to watch it again with the
   same recorded choice; replaying does not reset quests or personal memory.

The expandable "your next step" guide exists only in the local preview and updates
from that player's quest and choice state. Production uses the normal NPC dialogue
and quest log; it does not show preview controls or the guide. Player 2 has independent progress: player 1's completed
quests never unlock player 2's options. NPC-to-NPC exchanges discuss their shared
roles and preparations, without assuming every visitor has completed the story.
Adam explains his supply rounds, Bstrat explains her market visits, and Town Watch
explains why gate patrol continues even after the path is cleared.

## Configure another world

Copy `server/npc-behaviors/main.json` to `<mapId>.json` in the same directory. Set
`enabled` to `true`, choose existing NPC kinds, and set each `origin` to its exported
server spawn coordinates. The `key` is a stable, unique content identifier; preserve
it to retain visitor recognition. NPCs of the same kind can have different keys and
origins. Missing NPCs and blocked waypoints are reported and skipped at startup.

The `patrol`, `work` and `socialise` presets use the same route engine; their authored
waypoints and activities define their behaviour. Each entry includes:

| Field | Meaning |
| --- | --- |
| `area` | Rectangle containing the origin and route; routines wake while players are in it. |
| `stepMs` | Time between server steps, from 300 to 2000 milliseconds. |
| `route` | Ordered `{x, y, waitSeconds, activity}` stops, repeating in a loop. |
| `route[].line` | Optional short plain-text line on arrival. |
| `route[].sound` | Optional nearby `watersplash`, `honk` or `npc` sound. |
| `lines` | Rotating `greeting`, `return`, `talk`, `kill` and `quest` lines. |
| `mobKinds` | Optional names limiting nearby kill reactions. |
| `questIds` | Existing quest IDs whose completion this NPC remembers. |
| `label` | Display name for this configured NPC. |
| `reactions` | Conditional personal lines based on remembered quests, choices or flags. |

Keep lines under 240 characters and use plain text. Routes avoid map collisions,
door tiles and characters/chests. Blocked paths are retried, then an unreachable
stop is skipped after 20 seconds. There is no teleport recovery. Legacy NPC sprites
reuse their front-facing idle frames while moving; directional sheets retain their
normal animations. Managed NPCs do not activate player map triggers.

`conversations` references NPC keys, with ordered `{npc, text}` steps and a
`cooldownSeconds` value. Conversations only start with nearby players and participants
within eight tiles. They pause the actors and yield to player interaction.

`speech` sets the shared nearby chatter budget: `radius` (minimum 8 tiles),
`cooldownSeconds` (minimum 10) and `greetingCooldownSeconds` (minimum 90).
The pilot permits one ambient remark within 14 tiles every 20 seconds and greets
each visitor at most once per NPC every 180 seconds. Authored conversations take
priority and keep their six-second exchanges; clicking an NPC still opens dialogue
immediately. Greetings only trigger within three tiles.

Each `reactions` entry contains `when` and `lines`. `when` may include
`questCompleted`, `choice`, and `memory`; all supplied facts must match that visitor.
`lines` overrides the usual greeting/return/talk/kill/quest lines. The last matching
rule wins, so place later story stages last. Quest IDs accept either `questKey` or
`id` in cache. Observed quest/choice facts are also remembered in the NPC store,
allowing personal ambient recognition after a session change. Dialogue options
and quest progression remain owned by the existing dialogue/quest engine.

`ambience` targets one exact scene name. It configures a shared `cycleSeconds`
(minimum 60), `nightOpacity` (0–0.45), `particles` (`fireflies`, `leaves`, `none`) and
`particleCount` (0–24). The overlay is visual only and does not alter collisions,
combat, or game input. Leaving the scene and disconnecting clear it.
Optional `mode` chooses `day`, `night` or `cycle`; the pilot defaults to `cycle`.
The Day/Night/Cycle controls and their API exist only in the local preview launcher.

Restart the server after changing configuration. Maps without an enabled file keep
their existing NPC behaviour. Set `NPC_BEHAVIORS=off` to disable all routines.

## Persistence and deployment

The server owns one behaviour controller per world and advances it from the existing
world update loop. Player flow registration does not create additional routines.
Spawn packets include current NPC state, so late arrivals get their current position,
orientation and speed. Additional state messages update visible NPCs; ambient remarks
cannot overwrite an active player's dialogue bubble.

`NPC_MEMORY_FILE` overrides the default `data/chat/npcs/memory.json`. Memory belongs to the
game-server instance and uses a hash of map, NPC key and authenticated avatar ID.
The default directory is covered by the existing persistent chat volume and
production deployment safeguards. No Compose migration is needed. Separate game-server instances do
not synchronise recognition files. Corrupt files fail startup rather than being
silently replaced; write failures are logged and do not stop world movement.

Ship server, shared protocol definitions, the built client and behaviour configs
together. NPC movement and picnic gatherings are shared. Dialogue, quiet/music playback,
quests, choices and future story scenery belong to the individual character.
Public conversation lines never assert the choices of nearby players.

## Renderer extensions

Feature scenery lives outside `Renderer` and its worker. The composition root in
`client/js/worldscenery.js` registers feature-owned worker modules through
`renderer.registerExtension('picnic-renderer-worker.js')` and supplies snapshots
with `renderer.setExtensionData('picnic', state)`. Passing `null` clears that feature.
A module registers `{layer: 'ground', draw(context, state, view)}` under its stable ID
in `self.RendererExtensions`. A `foreground` layer is available too.

Ground extensions run after terrain and before characters and upper tiles. Every
extension receives the exact current `cameraX`, `cameraY` and `scale`, and gets a
saved canvas context. A throwing extension is disabled while other rendering
continues. Feature modules use the `*-worker.js` naming convention so production
builds retain them. The renderer owns hooks and serialisable data only; picnic
geometry and colours live in `picnic-renderer-worker.js`.
