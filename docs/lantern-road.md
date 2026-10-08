# The Lantern Road

This campaign continues the production Lantern Picnic on the `main` LooperLands
map. An empty seat starts a search for Rowan, the keeper who closed the lantern
network after a failed rescue. Players carry evidence between neighbours, repair
the relays, help Rowan choose a future and bring the communities to a larger
picnic at Party Beach. NPCs explain the evidence they have, what is missing and
why they stay at their posts.

## Chapters and routes

| Chapter | Story and quests | Places on main |
| --- | --- | --- |
| 1. The Lantern Picnic | Borrowed basket → safe path → quiet or musical invitation. | Town |
| 2. Letters from the Coast | Recover invitations → inspect the mill receiver → restore the coastal signal. Choose whether to check stranded travellers as well. | Beach, Windmill |
| 3. The Forest Still Remembers | Read trail markers → inspect Rowan's knots → recover the route ledger and place a lantern. Runs alongside chapter 2. | Forest |
| 4. A Light for the Missing | Match three memorial names → recover Elian's undelivered letter → light a public or quiet memorial. Requires the coast and forest reports. | Town, Graveyard, Crypt archive |
| 5. The Last Delivery | Trace dark markers → recover the caravan dispatch → inspect the sheltered detour or direct road you chose. | Desert |
| 6. Heat Without Light | Read relay pressure → recover and fit the regulator → read Rowan's service record. | Lavaland, Boss store |
| 7. The Keeper of the Road | Secure isolation controls → bring Elian's letter → help Rowan share his watch or teach new keepers and rest → reconnect the road. | Gauntlet |
| 8. The Long Table | Deliver returning invitations → arrange regional contributions → join the picnic. Previous choices and optional help shape the closing dialogue and personal scenery. | Every region, Party Beach |

There are 24 main quests including the three picnic quests, plus 11 optional
quests. The optional stories arrange a relief patrol for the watch, keep places
for absent families, help Wild Will invite Jimi, and recover Orin's precision tool
for a golden lantern. They can be finished after the main ending.

The authored quests and stable IDs live in `server/npc-behaviors/lantern-road.js`.
The dialogues use the existing choice popup and quest engine. Ground objectives
are server-validated inspections; discoveries are saved before showing their
result. Some objectives appear only for the chosen branch. The existing quest log
shows the reason, applicable objectives, progress, report destination and remembered
choices. Quest endings link to the next contact; when a parallel report is missing,
the NPC explains which report is needed and who can help. Offers only show objectives
for the player's chosen route. NPCs explain why they stay at their posts, and their
explanations change after the player repairs a relay or arranges relief. There is no
production guide overlay.

## Main-map entrances

Old doors may lead to a different world or require an event, NFT or collection.
The campaign uses existing ungated main-map doors where possible and adds three
personal passages for rooms without a usable main-map entrance:

| Entrance | Destination | Unlocked by |
| --- | --- | --- |
| Old-mill passage beside the southern Town windmill, 39,243 | Windmill, 127,298 | Completed picnic invitation |
| Graveyard archive marker, 64,126 | Crypt archive, 127,119 | Three Names on the Stone |
| Keeper's passage beside Adam in northern Town, 35,200 | Gauntlet, 71,372 | What Rowan Was Protecting |

Each room has a return passage. Walk beside a marker and click it, click its
interaction bubble, or press E. The server checks the character's progress and
actual position. These passages never change the map ID or replace existing doors.
A reachability test walks the actual exported collision grid and ungated door graph
and checks every objective and NPC location.

## Multiplayer and save compatibility

Quests, discoveries, branch choices, restored lights, memorials and finale table
contributions are personal to the authenticated avatar. They use the normal backend
quest and choice storage, so another session or game-server instance can load them.
No baseline tiles or collision layers change when one player completes a chapter.

NPC routes, neutral conversations and the first picnic gathering are shared on a
server. The Party Beach hosts make small shared rounds and chat about welcoming
visitors. Public dialogue never asserts that another player finished a quest or
made a particular choice. Individual conversations refer to that player's evidence.
Regional NPCs give private, throttled greetings from the character's saved quest
history, including after joining a server that has never met that character.

Never rename `LANTERN_BASKET`, `LANTERN_PATH` or `LANTERN_INVITATION`, or clear their
choices. Chapter 2 and chapter 3 unlock from invitation completion alone. Both
`COMPLETED` and older `FINISHED` saves are supported, with either `questKey` or `id`.
Picnic attendance files and replays are not prerequisites. Players who completed
the picnic before this release can speak to Adam for the coastal and forest leads
and continue immediately.

## Regional ambience

The outdoor areas use layered, map-anchored effects configured in
`server/npc-behaviors/main.json`:

| Area | Effects |
| --- | --- |
| Town | Fireflies and a few floating seeds |
| Forest | Tumbling leaves and pollen |
| Desert | Dust motes and faint wind streaks |
| Beach / Party beach | Sea spray and windblown sand |
| Lavaland | Rising embers and falling ash |
| Graveyard | Low mist and sparse fireflies |

All layers use the existing global world clock for visibility. Fireflies appear
at dusk; nonluminous particles become subtler at night. Particles follow the map
smoothly, remain within their scene boundaries and keep moving in a forced day or
night preview. Interiors receive no outdoor particles. Reduced motion disables
the animated layers. Area presets allow up to three layers and 24 particles per
repeating map patch, keeping the cost bounded without adding lighting tints.

## Local playtest

Build the client with `node bin/build-client.js`, then run
`node bin/local-npc-preview.js`. The launcher uses loopback fixture APIs and saves
local game data under the OS temporary directory. It prints two session URLs.
Player 2 can continue an earlier completed picnic; Player 1 keeps their own progress.
The launcher starts at night. Set `NPC_PREVIEW_HEALTH_MULTIPLIER=20` for longer
conversations around hostile mobs. Local Day/Night/Cycle and guide controls can be hidden
with `NPC_PREVIEW_CONTROLS=off` to exercise the production interface.

Override `NPC_PREVIEW_PORT`, `NPC_PREVIEW_FIXTURE_PORT` and `NPC_PREVIEW_DATA_DIR`
to run an independent preview with a copy of existing fixture saves. The fixture's
`POST /preview/player/1/location` (or `/2/location`) accepts integer `{x,y}` positions
for fast testing of distant chapters. This helper exists only in the loopback
fixture and checks valid main-map positions. It does not unlock quests or change
production saves.

Verify the first coastal discovery through a normal NPC conversation, the Quests
panel and the ground marker. Reconnect and check that its saved fact remains, then
report to Jimi and choose a coastal priority. The automated walkthrough also plays
all quests with both routes, reconnecting from saved backend data after every quest,
and checks that another player receives no private discoveries or repaired scenery.
