# Lantern work: review snapshot and scope decisions

🤖 Agent-authored review; recommendations require human validation.

This is an unfinished snapshot for choosing what to retain. It is not a merge candidate. No implementation has been removed during this review. Review the whole PR against `main`, including the previously committed work and the latest conversation/registration/friendship changes.

The existing quest event consumer already supports `KILL_MOB`, `LOOT_ITEM`, and `NPC_TALKED`; the broker also publishes area events. Dialogue already supports conditions, actions, choices, and saved state. Tile actions, inventory/resources, map doors, NPC behavior, and renderer extensions also exist. The story should compose these capabilities rather than introduce a second progression system.

| # | Change | Recommendation | Reason and extraction boundary |
| --- | --- | --- | --- |
| 1 | NPC stays still while somebody is reading | Keep | Renewed conversation holds replace the fixed 20-second pause. Multiple readers are tracked separately; leaving, death, disconnect/expiry release the hold. Extract `npcbehavior.js`, the listen route, and the client hold integration together. |
| 2 | Keyboard conversation controls | Keep | E/Enter advances speech, arrows select replies, Enter confirms, Escape closes; captured input prevents walking or opening chat underneath. Keep the existing dialogue flow; this does not need custom quest objectives. |
| 3 | Natural player–NPC speech and compact reply UI | Keep, with UI review | Shows the player's selected reply and the NPC's answer in world speech; decisions still use choices. `worldconversation.js` is presentation state, not quest progression. Needs browser validation of the latest layout before extraction is ready. |
| 4 | NPC daily schedules and building entry | Keep as a separate engine change | `npcschedule.js` uses the shared world clock, configured activities/routes, and actual validated public return doors. Sleeping NPCs remain available for quests. Include generic movement/teleport integration and tests; keep town schedules as map configuration. |
| 5 | Dialogue reveals relevant routine hints rather than a timetable | Keep | Removes the direct schedule question and the full schedule dump. Keep contextual hints authored in dialogue and the small schedule explanation hook. |
| 6 | Ordered quest prerequisites and NPC-specific indicators | Keep | Requires every linked prerequisite; keyed indicators distinguish two actors of the same kind. Keep in the existing quest/dialogue engines, independently of Lantern Road's custom completion callbacks. |
| 7 | Quest-log correctness and old save support | Keep the generic fixes | Recognises both `id`/`questKey` and `COMPLETED`/`FINISHED`, builds personal progress without mutating shared definitions, retains kill/loot counts. Exclude the custom story journal and story-satchel formatting from the extraction. |
| 8 | NPC interaction cooldown and teleport cleanup | Keep | Timestamp-based cooldown permits repeated conversations; configured NPCs can be interacted with even without stock text. Stopping stale movement before teleport supports building entry. Keep the relevant NPC/game changes and regression tests. |
| 9 | Save promise and missing-world statistics guard | Keep | Returning the choice-save promise lets callers observe completion/failure. Statistics now returns a controlled 409 if the world is absent instead of dereferencing it. Small independent fixes; do not count them as proof that all asynchronous dialogue writes are awaited. |
| 10 | Layered ambience per area | Keep as an independent feature | Reuses global time for visibility, supports leaves/dust/spray/embers/fireflies, map anchoring, clipping and reduced motion. Keep rendering and area configuration apart from story packet generation. Shared-clock and camera-revert work already on `main` is baseline, not a new extraction. |
| 11 | NPC–NPC conversation improvements | Keep the generic behavior, review authored content | Conversations yield to player interaction and can be limited to times of day; schedule sleep suppresses chatter. Existing throttling/memory should be reused. Regional conversations and extra actors are story data, not engine requirements. |
| 12 | Register definitions and external scenery | Keep the direction; simplify and finish separately | Engines should receive registered quest/dialogue/NPC/scenery definitions. Current `worldextensions.js` also adds custom talk/kill/action/completion/log hooks and packet aggregation. Prefer a small registration boundary around existing engines, with compatibility tests. The current rewrite is unfinished and has no dedicated registry tests. |
| 13 | Separate `StoryObjectives` progression engine | Drop/rework through existing quests | Tracks its own talk, visit, combat, collection and delivery facts in choice flags; duplicates existing quest events and adds its own completion checks. Implement story tasks using existing quest consumers; extend an existing consumer narrowly only for a confirmed missing capability. |
| 14 | Virtual story satchel | Drop/rework through existing inventory | Items are inferred from objective/choice flags rather than normal inventory/resource ownership. This creates a second collection/delivery model and extra save semantics. Use existing item/resource mechanisms where suitable. |
| 15 | Story inspection markers and private passages | Drop/rework through tile actions and doors | Adds `/story/inspect` and `/story/travel`, a separate world-action list, manual teleport shortcuts and ground markers. Existing tile actions and map doors should own world interactions. Actual map access changes need a separate map decision; do not bypass existing gates merely to serve the story. |
| 16 | Expanded Lantern Road / shortened friendship campaign and finale | Park as content | Current definitions retain 32 Road quest IDs: 9 offered main quests and 23 archived preview quests, plus the 3 picnic quests. Includes new actors, a controller, memory text, private scenery/music and finale contributions. Rewrite a small story after the retained engine scope is agreed. Existing picnic support on `main` should remain; the regional continuation is optional. |
| 17 | Local test helpers and walkthrough | Keep the useful helpers, refresh documentation | Level-40 avatar/weapon, slower movement, named travel buttons and clock controls are fixture-only. Keep testing aids without creating production mechanics. The campaign docs and walkthrough still contain older story assumptions. |

## Dependencies to watch when splitting

- Rows 1–3 share client conversation lifecycle and the server listen endpoint; splitting individual hunks without the lifecycle can freeze or prematurely release an NPC.
- Row 4 needs the NPC teleport/movement changes in row 8. Picnic-specific overrides should live outside the schedule engine.
- Row 12 currently wires all quest maps at startup and replaces direct imports in several engines. Dropping it requires restoring the previous loading path. Keeping it requires verifying every existing map, not only the picnic fixture.
- Registration reindexes internal quest maps, but `questsByID` is exported as the original object; later registrations can leave that export stale. Dialogue trees are captured when the controller is constructed. These are reasons to hold the rewrite, not merge it as-is.
- Rows 13–16 currently depend on each other and on the new extension hooks. They cannot simply be deleted one file at a time. Saved picnic IDs/choices must remain stable when the final smaller story is designed; preserve actual player progress rather than maintaining every abandoned preview quest as production content.
- Core rendering already has extension support on `main`; do not reintroduce `drawPicnic` into Renderer. Story renderer workers can remain outside the engine if the story is retained.

## Validation of this snapshot

Checked on 2026-10-08 against current `origin/main` (`ae56a656343b36363239aa09ab2b073622523c16`, matching GitHub main at review time):

- Full Jest run: **831 passed, 15 failed; 58 suites passed, 4 failed** (846 tests / 62 suites).
- Failing suites: `server/npc-behaviors/lantern-road.test.js`, `server/js/dialoguecontroller.test.js`, `server/js/quests/questlog.test.js`, `bin/npc-preview-walkthrough.test.js`. Failures include old campaign assumptions and dialogue-loading expectations after the unfinished rewrite; they have not been fixed or dismissed in this review.
- Coverage: **81.77% statements, 74.86% branches, 83.75% functions, 82.49% lines**. Statement/function/line thresholds fail; existing thresholds remain unchanged.
- NPC schedule, NPC behavior, world conversation, and keyboard-handler suites pass in this full run. This is unit-test evidence, not approval to merge those pieces without extraction testing.
- Client/server/shared ESLint passes. `git diff --check` passes before adding this report.
- Local test log: `/private/tmp/lantern-snapshot-tests.log`; lint log: `/private/tmp/lantern-snapshot-lint.log`.

No fresh client build, new local session, production deployment, merge, or latest-layout browser check was performed for this review snapshot. The running local session uses an earlier build. Earlier green results belong to earlier commits and do not validate this snapshot.

Suggested sequence after the user's selections: extract independent bug fixes; extract schedule/ambience and conversation presentation in focused PRs; implement only the minimal registration changes still needed; then author a short friendship story with the existing quest/dialogue/inventory/tile-action engines.
