# A Place for Rowan — implementation and local walkthrough

Baseline: refreshed `origin/main` at `c3bec20c99295c6f9876412d54080b81e13b2c06` (PR #1499). The implementation request approves the additions in `lantern-friendship-design.md`; its historical approval-status paragraph describes the earlier design stage. No content from draft PR #1492 is imported.

## Start an isolated preview

```sh
node bin/build-client.js
NPC_PREVIEW_STORY=friendship \
NPC_PREVIEW_PORT=8317 NPC_PREVIEW_FIXTURE_PORT=3317 \
NPC_PREVIEW_DATA_DIR=/private/tmp/rowan-preview \
node bin/local-npc-preview.js
```

Choose unused ports. The fixture API and saved data are local. Open `http://127.0.0.1:3317/preview/player/1`, `/2`, and `/3` in separate tabs. Opening a new session for an avatar replaces its previous session. The first two avatars start after the original picnic, with return/quiet and share/music choices respectively; the third has no prologue progress. A fresh fixture starts at level 40. Existing fixture files are retained across restart. Use a new data directory for a fresh run; do not delete another preview's saves.

`/preview/state` exposes fixture-only saved state and actor positions for QA. The fixture persists inventory deltas, quests, choices, and kills. This is not a production debug API. Day/night/cycle controls are the existing preview controls, not story actions. All story travel uses normal movement and the existing public doors.

## Walkthrough (contains puzzle solutions)

1. **The Empty Place:** Ask Bstrat about Rowan, then speak to Adam, the keyed Town Watch, and Bstrat in that order. Read their accounts and explicitly promise to ask Rowan. With an ineligible avatar, confirm that this offer is absent and ordinary picnic dialogue still appears.
2. **More Than a Messenger:** Accept directions from Bstrat before crossing Town's northern gate into Forest. Ask Rowan whether he wants company. Use listen-first for avatar 1 and ask-directly for avatar 2; acknowledge his answer, then ask permission to tell Bstrat. Close/reopen the dialogue and verify the opposite preference cannot be recorded.
3. **A Basket With Boots:** Accept from Rowan and ask about his lantern project. Walk south through Town to Beach and along the shore to Jimi. Learn the basket-with-boots drawing, then return to Town and ask Adam about the parcel. Try either wrong answer; no resource or success flag changes. Identify Rowan only after all three clues. Q3 rewards exactly three ordinary wood. Ask Adam to start Q4.
4. **A Light of His Own:** Re-enter Forest and click Rowan. Stock remains three and Q4 remains open until choosing **Give Rowan three wood**. This completes Q4 and debits three. Repeated replies cannot debit again. Spending the wood requires recollecting ordinary wood, not another Q3 reward.
5. **Compare the Invitations:** Accept from Bstrat. Ask Adam for his account and his objection to leaving the supplies. Ask Bstrat to mind them without reorganising. Ask Town Watch to meet Adam briefly. Stop before solving the mismatch if testing the shared scene. Approach the old picnic spot south of the market; all three actors must arrive before speech starts. Bstrat minds Adam's nearby market stop. Close conversations to allow their normal movement and speech. A second eligible avatar can attend; the ineligible avatar receives no progress. Private accounts remain available if the performance is missed or busy. Return to Bstrat, try a wrong explanation, then explain that each assumed the other invited Rowan. Choose apology-first or invitation-first and explicitly finish Q5.
6. **An Answer for a Friend:** Accept from Bstrat, enter Forest and relay the chosen invitation. Rowan must actually agree; merely clicking him is insufficient. Return through Town and report his answer. Read the repeatable coda with both preference pairs. Rowan stays on his Forest routine.
7. **Optional Beach quest:** Accept from Jimi after Q2; defeat two new crabs inside Beach, click Jimi, and explicitly report. Jimi's **Ask about other jobs** still opens his original `JIMI_QUEST` ore job.
8. **Optional wood quest:** Accept from Adam after Q4, enter Forest, collect two new wood, then click Adam with two wood still in inventory. Collection elsewhere after that Forest visit also counts. This side quest automatically hands in at its final delivery and never gates Q5/Q6.

The quest log is personal and shows ordinary objective labels/counts. An `AREA_ENTERED` step requires entry after acceptance. If already inside, leave and re-enter. Hints remain available in dialogue; objective labels do not reveal the puzzle answers.

## Implementation boundaries

- Four content modules contain definitions, composed dialogue, routines, and the external comparison lifecycle. Registration stays at `server/world-definitions/main.js`. No quest, inventory, dialogue, schedule, renderer, or audio engine code changes.
- One `forestnpc` entity is added at runtime `(43,185)`. The Tiled type metadata and server export are updated. Regenerating both client exports produces identical content. Server export comparison confirms that all other entities, collision, doors, scenes, and map fields are unchanged.
- Existing town routines, schedules, picnic dialogue nodes/options, ambience, and the original picnic scene are retained. Rowan's route stays within Forest; Jimi binds to the existing Beach entity.
- **Baseline correction:** current main has no unkeyed guard dialogue tree. It returns the legacy NPC fallback for other guards. That behavior is preserved; no copy of Town Watch's prologue or friendship tree is introduced for them.
- Dialogue resume/option/action guards account for `quest_open` including completed quests. UI readiness uses the existing `quest-progress:` saved objective facts; only the engine writes them, and normal completion rechecks readiness and inventory. The full progression tests exercise the current fact encoding.
- The comparison exposes no scenery packet and writes no quest, clue, preference, or inventory state. It reserves all three actors, constrains fallback seats to hearing distance, uses a 180-second gathering/active limit, and cleans up on every exit. Restoration removes temporary routes/paths/ownership and reevaluates the current clock phase without changing an actor's physical room or teleporting them.

## Validation record

Automated: 66 Jest suites, 889 tests passed with coverage thresholds met (88.57% statements, 79.32% branches, 91.24% functions, 89.26% lines). ESLint passes for client/server/shared. The client build and asset check pass. All 20 deployment-safeguard Python tests and shell syntax check pass; no deployment was run.

Focused tests cover historical quest formats/statuses, direct/repeated/out-of-order action attempts, both preference paths, objective ordering and actor keys, all puzzle clues, wrong answers, explicit acceptance, personal state isolation, inventory quantity conversion, spent wood, repeated/concurrent local completion calls, failed durable objective writes, optional quests, legacy dialogue, shared attendance, reservations, all cleanup exits, cooldowns, and restart defaults. Actual-map integration tests exercise occupied meeting seats, indoor departures via public doors, and restoration across a clock-phase transition.

The legacy objective test used `virtual: true` for a now-real module; removing that obsolete mock option fixes an order-dependent suite failure. Actor-count/path tests now include the two registered actors and allow a stationary waypoint to have an empty route. They additionally verify that every actor binds to the real exported entity with the map's X-offset convention.

### Browser walkthrough — 9 October 2026

Played locally with two independent avatars at ordinary level-40 movement speed. Movement used the normal client pathfinder, public doors, ordinary combat and pickups; no teleport, quest-progress injection or speed override was used. A third, ineligible avatar stood at Adam's preferred comparison seat.

| Check | Observed result |
| --- | --- |
| Full main chain | Both avatars completed all six quests through real dialogue choices and travel. Avatar 1 retained return/quiet and chose listen-first/apology-first; avatar 2 retained share/music and chose ask-directly/invitation-first. |
| Parcel and inventory | Both wrong parcel guesses were retryable. Each avatar received three real wood once, kept them when merely clicking Rowan, and explicitly handed in exactly three. Restart between Q3 and Q4 preserved clues and stock. Both finished with zero wood. |
| Optional quests | Avatar 1 completed two new Beach kills plus Jimi's report and collected two new wood after entering Forest, then delivered exactly two to Adam. Jimi's original ore job was also accepted. Avatar 2 completed the main chain without either optional quest. |
| Comparison | Both avatars attended the same performance. Watch and Bstrat came from indoors through public doors. Adam used an audible fallback seat because the bystander occupied his preferred seat. All actors arrived before playback. Saved attendance was true for avatars 1 and 2 and false for avatar 3; attendance granted no solution, inventory or quest completion. |
| Puzzle and acceptance gates | Both wrong Q5 explanations were retryable. Each avatar separately explained the mismatch and chose an invitation. Avatar 1 clicked Rowan, returned without accepting, and had no final report option. The report appeared only after Rowan's explicit agreement. |
| Personal ending | Both immediate acceptance replies, listening remembrances and invitation codas matched their saved preferences. The bystander's quests, items and story flags stayed empty. |
| Routines and clock | The comparison finished and townies resumed ordinary routines. A subsequent night switch sent Adam/Bstrat home and Watch onto evening duty. Rowan stayed in Forest and Jimi stayed on Beach. Clock change *during* playback is covered by the actual-map integration test, not this browser run. |
| UI and persistence | Quest log showed personal labels/counts (for example Q6 0/4 alongside Q5 4/4). Arrow-key reply selection, Enter and Escape worked. Reading held NPCs stationary. Day/night/cycle, muted music and reduced-motion emulation remained usable. A final server restart preserved all three saved avatars exactly and reset the comparison to ordinary startup. |

The original preview panel preferred the picnic's `story` packet over the fixture's `previewStory`; the local fixture now supplies the Rowan title/directions through the existing packet hook. No production UI or renderer change was needed. Earlier comparison screenshots still show that old preview-only title.

Screenshots in `output/playwright/` are review artifacts, not game assets: Rowan in Forest, Jimi, parcel, explicit hand-in, shared comparison, night restoration, personal quest log, acceptance, and both codas. The live local preview is at `http://127.0.0.1:3317/preview/player/1` (completed save); use a fresh data directory to replay from Q1.

### Playtime and remaining coverage

A measured Forest → Town → Beach/Jimi segment, including approach and a dialogue interaction, took **29.422 seconds** at the fixture's ordinary movement speed. The shared script is configured and unit-tested at **54 seconds after arrival**. The complete browser run included repeated gates, two avatars, inspection pauses, a restart, optional combat and deliberately wrong answers; its wall-clock duration is not a clean first-play measurement.

A provisional reading/puzzle/travel estimate is **15–25 minutes for the main chain**, or **20–35 minutes including the optional quests**, depending on discovery and combat. This is an inference from the route timing and authored interactions, not a blind human timing study. The design's 40–55-minute first-play estimate is **not validated**; a fresh human playtest should settle pacing before claiming that duration.

Disconnect/death/map-change cancellation, missing actors, exceptions, empty-world cleanup, prolonged reader holds/timeouts, failed retry/success cooldowns, picnic reservation contention, blocked public-door landings and historical/conflicting save variants have automated coverage. They were not all repeated as browser fault-injection cases. No production or multi-server backend validation was performed.

Approved implementation alternatives/baseline corrections: normal wood inventory and explicit reports are used; the existing generic NPC fallback is preserved because this main baseline has no unkeyed guard dialogue tree; regenerated client map exports are unchanged, so only the server export is included as map output. There are no engine, scenery, collision, gate, audio, or permanent town-schedule changes.

## Persistence limits

Inventory deltas, quest status, and saved choices still use separate legacy backend calls. The local duplicate guards and inventory queue do not make completion an atomic/idempotent transaction across backend failures or server instances. Objective-write failure is tested as a retryable failure; no perfect rollback or exactly-once cross-instance delivery is claimed. Normal reconnect/restart uses saved avatar progress; NPC recognition and scene attendance are never prerequisites.
