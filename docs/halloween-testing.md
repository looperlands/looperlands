# Halloween playtest checklist

Start with the full story on a fresh avatar, then use a separate avatar for inventory and calendar checks. The [event guide](halloween.md) describes the content; this checklist includes the solutions.

To edit the event, open **Map & world → Temporary content → main**. Its map shows the seasonal layout even outside the active dates. Save changes, build main and start a fresh session. The [Temporary content guide](mapmaker-temporary-content.md) covers schedule, actor, decoration, layer and sound editing.

## Start beside the witch

From the repository root, with Docker Desktop running:

```sh
LOOPERLANDS_CONTENT_DATE=2026-10-31T18:00:00Z ./start-local.command
```

Open [Mapmaker Toolbox](http://127.0.0.1:8010/local/) and select **Playtest**. Use these settings:

| Field | Value |
| --- | --- |
| Map | `main` |
| Checkpoint | `2` |
| Time of day | `18:00` |
| Avatar | A bundled avatar you have not used for these quests |
| Avatar level | `1` meets every mystery's quest requirement |
| Access mode | **Local progress** |
| Starting progress | Leave inventory and finished quests empty for the first story run |
| Spawn → Set a custom spawn position | X `44`, Y `214` |

Click **Start game**. Whispy is two tiles east, at **46, 214**. Each coordinate below is a map tile; click an actor from an adjacent walkable tile. If **Talk [E]** appears, press **E** to open the conversation. The red shoes, Whispering Pumpkin, purple Burial Register, green basin and blue-stoned ring are clickable clues.

The investigations take you beyond Town: **Forest** for the shadow, **Graveyard** for the gravediggers and procession, and **Beach** for the well's keepsake. Ordinary regional enemies remain active. Accept any or all three mysteries before leaving Town, then return to Whispy for decisions and rewards. The shortcut spawn table below lets you revisit a clue without repeating the whole journey during testing.

**The two clocks are separate.** `LOOPERLANDS_CONTENT_DATE` selects a fixed UTC calendar date for seasonal availability. **Time of day** selects the advancing in-game clock for lighting and NPC schedules; setting it to evening does not activate Halloween. Both settings affect all local players. Production ignores the local calendar override.

**A new session is not a fresh quest save.** Progress, choices and inventory belong to the avatar NFT ID. Reusing that avatar or changing only its wallet keeps its progress. Choose another bundled avatar for a clean story run. Starting inventory replaces the amounts you select; omitting an item does not remove a saved balance. **Add finished quest** skips a quest without granting its reward. Use the same avatar deliberately for persistence tests. See [Starting game sessions](mapmaker-sessions.md) for the full launcher behavior.

## Complete the personal story

### Find clues before accepting their mystery

Use a fresh avatar for this check, before speaking to Whispy or accepting the relevant mystery.

- [ ] Inspect the red shoes, pumpkin, either gravedigger, Burial Register, basin and ring. Each gives guidance toward Whispy or the missing prerequisite instead of implying that you have already accepted the investigation.
- [ ] Check the Journal and inventory: an early clue visit must not grant a quest reward or silently resolve a haunting.
- [ ] Accept the relevant mystery, then return to the clue. Its normal investigation dialogue should now be available.

### Introduction

- [ ] Click Whispy at **46, 214**. Choose **I will help settle the hauntings.** → **Let us begin.** → **Show me the mysteries.**
- [ ] Confirm **Halloween: Something Is Wrong With the Village** completes and gold increases by **10**.
- [ ] Confirm the hub offers all three mysteries and **Browse the cauldron recipes.** All three accept level 1; none has a kill objective, although travel crosses regions with existing enemies.
- [ ] Close and reopen Whispy's dialogue. It returns to the hub without repeating the ten-gold payment or presenting that payment as a new reward.

### The Missing Shadow

1. At Whispy, choose **Ordinary Adam's missing shadow.** → **I will follow the shadow.**
2. Follow the main road north from Town into the **Forest**. Just north of the river bridge, inspect the red **Abandoned Shoes, 46, 181**, beside the road. Their dialogue gives the next direction; there is no visible footprint trail.
3. Continue north to the fork and take the west branch. Inspect the **Whispering Pumpkin, 19, 164**, beside the campfire south of the tent. Choose **Turn the pumpkin away from the campfire.**
4. Return south to Whispy in Town at **46, 214**. Choose **Ordinary Adam's missing shadow.** → **I freed the shadow from the pumpkin.**

- [ ] Receive **3 pumpkins** (`m88npumpkin`) once; the quest appears in completed history.
- [ ] Revisit the pumpkin and Whispy: the dialogue remembers your solution, grants no second reward and does not repeat the payout promise.
- [ ] On a fresh run, accept the shadow mystery and inspect the pumpkin before the shoes: it should guide you to the red shoes, and the release choice should be absent.
- [ ] After inspecting the shoes, choose **Leave it for now.** at the pumpkin. The shadow objective remains unfinished; merely visiting both clues must not complete it. Free the shadow, then check that the Journal directs you back to Whispy.
- [ ] Choose **Show me the recipes.** to reach the first souvenir immediately: **1 pumpkin + 5 gold → Bottled Midnight**.

### The Second Gravedigger

1. At Whispy, choose **The two gravediggers.** → **I will compare their stories.**
2. Follow the main road north through the Forest into the **Graveyard**, then head west toward the two northern wooden crypts. Speak to **Mara at 23, 118** and **Rowan at 26, 118**. Their matching ghost sheets are intentional: appearance alone does not identify the ghost.
3. Read the purple **Burial Register at 25, 115**, between the crypts and just north of the two figures. These three clues can be visited in any order. Mara says she put up the **Town** notice board last spring; Rowan denies that a board ever stood there; the register records Rowan's burial a hundred winters ago.
4. Return south to Whispy in Town at **46, 214**. Choose **The two gravediggers.** → **I have read the evidence. Let me decide.**
5. To test a wrong answer, choose **Mara, on the left. She looks very pale.** Then choose **Let me reconsider.**
6. Choose the correct answer: **Rowan, on the right. The register records his burial.**

- [ ] The decision option appears only after all three clues have been read.
- [ ] Reading the register alone does not finish its combined investigation-and-decision objective. The Journal should still direct you to identify the ghost to Whispy.
- [ ] A wrong answer gives a hint without completing the quest, consuming resources or blocking a retry.
- [ ] The correct answer grants **6 wood** once. Rowan's later dialogue acknowledges the discovery.
- [ ] Reopen Whispy's dialogue after the correct answer. She returns to the hub without another payout or a repeated reward promise.

### The Whispering Well

1. At Whispy, choose **The whispering well.** → **I will listen to the well.**
2. Head south from Town to the **Beach** and continue to the sea. Visit the small green **basin at 46, 297**, just east (right) of the central shoreline palm at **44, 295**. The well's voice speaks through it. Choose **Listen without giving it another name.**
3. Follow the shoreline west (left) to **A Lost Ring at 19, 297**, below the western palm at **20, 295**. Its blue stone identifies it. Choose **Wrap the ring in a cloth and take it to the well.**
4. Return east along the shore to the basin at **46, 297**. Choose **Lower the ring gently into the basin.**
5. Return north to Whispy in Town at **46, 214**. Choose **The whispering well.** → **I returned the ring to the spirit.**

- [ ] Receive **3 ore** once. Revisit the well to hear its peaceful response.
- [ ] The ring is a personal story choice; it does not add or consume an inventory item. Its visible clue stays available to other players.
- [ ] Visiting basin → ring → basin without choosing to listen, take the ring and return it must not produce **3/3** progress or unlock the completion option. Each required action must be recorded.
- [ ] On a fresh run, accept the well mystery and inspect the ring before listening to the basin: it should direct you to the basin, and the take choice should be absent.
- [ ] Choose **Step away.** at the basin before listening: progress remains **0/3**. Listen, then choose **Leave it where it is.** at the ring: progress remains **1/3**. Take the ring, then choose **Hold on to it a little longer.** at the basin: progress remains **2/3**, and the spirit is not yet settled.
- [ ] Lower the ring: progress becomes **3/3** and the Journal directs you back to Whispy. Only reporting back grants the ore and completes the quest.
- [ ] Reopen Whispy's dialogue after reporting back. The hub remains available without repeating the payout or its promise.

After all three mysteries, the Journal should contain **four completed Halloween quests** including the introduction. A missing dialogue choice keeps its objective unfinished. Once the shadow is freed or the ring is returned, the active Journal should direct you to report back to Whispy; the reward is still pending until that report.

## Brew and use all three recipes

Click Whispy and choose **Browse the cauldron recipes.** The normal shop window should open; an `/openShop` command should never appear as dialogue text.

| Recipe | Cost per unit | Expected result |
| --- | --- | --- |
| Bottled Midnight | 1 pumpkin + 5 gold | One permanent, non-consumable souvenir in inventory |
| Graveyard Stew | 2 wood + 3 gold | One consumable; restores up to 75 HP, capped at maximum health; 15-second cooldown |
| Borrowed Courage | 1 ore + 3 gold | One consumable; melee damage taken ×0.8 for 30 seconds; 60-second cooldown |

One of each costs **11 gold** in total. The introduction grants **10**, so obtain one additional gold through ordinary play, or prepare a separate shop-test avatar with **Starting progress → Add item**. A convenient setup is **20 gold, 3 pumpkins, 10 wood and 3 ore**. To skip the introduction on that test avatar, add **HALLOWEEN_WELCOME** under **Finished quests**; this grants no extra gold.

- [ ] Buy one recipe and compare every ingredient and output balance before and after.
- [ ] Buy two bowls of stew in one purchase: deduct **4 wood + 6 gold** and receive **2 stew**.
- [ ] Lose some health, move out of combat, and consume stew. Check healing, one-unit consumption and the cooldown. An immediate second use must not consume another unit.
- [ ] Consume Borrowed Courage. Check its timed effect, expiry after 30 seconds and cooldown until 60 seconds. Incoming hits vary, so a single damage number is not enough to establish the multiplier.
- [ ] Start another session with the same avatar. Confirm the souvenir and remaining inventory persist.

Denied purchases:

- [ ] With insufficient ingredients, purchasing fails and leaves all balances unchanged. For a controlled test, mark the introduction finished on a separate avatar and seed only **1 gold + 1 pumpkin**.
- [ ] Open the shop, close its panel to walk away, move more than five tile steps from Whispy, and test an already-loaded purchase request from the browser Network panel if the UI no longer exposes it. The server must reject it without changing inventory.
- [ ] Repeat with the event closed using the calendar checks below. Old shop/dialogue requests must not grant rewards outside the window.
- [ ] If testing rapid duplicate clicks, each accepted purchase must have its own full cost; a purchase already in progress should be rejected or finish before another begins.

The automated exchange tests cover lost responses and uncertain readback. These are not reliably reproduced by ordinary clicking; do not treat a successful local purchase as proof of the deployed Platform transaction behavior. If the game reports an unconfirmed brew, stop that test and inspect the local logs and balances before retrying. The [cauldron guide](halloween-cauldron.md) explains this existing boundary.

## Personal progress and the repeating procession

- [ ] Finish a haunting with avatar A. Start avatar B on the same server and solve it independently. The clue objects remain usable and B receives its own reward.
- [ ] Partway through a quest, close the game and create a new session for the same avatar. Its accepted quest, read clues and recorded decisions should persist.
- [ ] In the western **Graveyard**, follow the **Late Fisherman**, **Wandering Musician** and **Very Convincing Ghost** around the repeating circuit: near **22, 123 → 29, 130 → 30, 120 → repeat**. All three start together near the first landmark. Each uses distinct stopping tiles within one tile of these coordinates and waits about eight seconds at each stop. Pathfinding and conversations can delay movement.
- [ ] Check that **all three ghosts move**, complete the circuit and return to their own first stopping tiles. Talk to all three for their short stories. They should remain friendly and keep returning after your mysteries are completed.
- [ ] Walk past ordinary residents, shops, the notice board and doors. Their existing services and routes should remain usable.

## Scenery, floating ghosts and sound

- [ ] Look for pumpkins near the Town market, Forest clues, Graveyard investigation and Beach shoreline clues. The cauldron remains beside Whispy at **47, 214**.
- [ ] Town tree canopies and roofs keep their original appearance: the saved Halloween event has no tile recolors. If you add an override in Temporary content, compare that tile inside and outside the event window.
- [ ] Observe ground mist and floating ghosts while standing still and while walking. They should drift smoothly while leaving paths, actors and dialogue readable. These floating images are scenery; the three walking procession NPCs are the ghosts you can talk to.
- [ ] Move between scenes, use a door to another map and return. Scenery should follow its configured area without carrying the Halloween overlay or sounds onto unrelated maps.
- [ ] The saved Halloween event has no positional sounds. To test seasonal audio, add a sound source to a test event in Temporary content, save/build, then enable **Settings → Audio → Game audio enabled** and approach it. Its volume should fade with distance and shift between stereo channels.
- [ ] With a test sound source present, set **Ambience** to zero, then restore it. It should mute and return immediately. Music and Sound effects have separate sliders.
- [ ] Enable your operating system's reduced-motion preference, or emulate `prefers-reduced-motion: reduce` in your browser. The floating-ghost and mist drift should stop. Restore the preference afterwards; the ordinary walking NPC procession should still function.

### Tour the clue locations and floating-ghost scenes

All of these locations are on **main**. Keep checkpoint **2** and change the custom spawn coordinates in the Toolbox, then click **Start game** for each stop. Reuse the same avatar to preserve accepted quests and recorded choices. The Town, Forest, Graveyard and Beach entries also provide shortcuts beside the investigation actors. These spawn tiles are walkable and clear of static entities and doors; existing enemies remain active.

| Scene | Custom spawn X, Y | What to compare |
| --- | --- | --- |
| Town | **44, 214**, beside Whispy | Denser floating ghosts at three depths, plus the ground mist, market decorations and cauldron |
| Forest | **45, 181**, beside the shoes; **20, 164**, beside the pumpkin | Ghosts and pumpkins around the Forest investigation; campfire, tent and paths remain readable |
| Graveyard | **25, 120**, just south of the gravediggers and register | The walking procession, investigation and densest floating-ghost treatment; graves and enemies should still be readable |
| Beach | **47, 297**, beside the basin; **18, 297**, beside the ring | Shoreline clues and pumpkins, and more widely spaced floating ghosts |
| Desert | **46, 82** | Fewer, fainter ghosts against the lighter terrain |
| Lavaland | **57, 30** | The sparsest, faintest treatment, leaving hazards readable |
| Party Beach | **52, 453** | Spaced ghosts over the existing beach atmosphere |

- [ ] At each stop, stand still, walk in both directions and stop again. The different ghost sizes and depths should move smoothly without the map itself sliding.
- [ ] Compare a daytime session at **12:00** with a night session at **22:00**. Ghosts should remain luminous at night. These game-time changes do not alter the event's calendar availability.
- [ ] Cross a scene boundary where practical. Ghosts should use the map's existing scene boundaries; the Town ground mist should not spread across the whole map.
- [ ] Repeat a busy scene, such as the Graveyard, with reduced motion enabled. Its ghosts remain visible without drifting, orbiting or swaying.

## Calendar boundaries and restoration

For each fixed-date preview, run the launch command with the desired date, wait for the Toolbox to become ready, then create a **new session**. A restart invalidates old session URLs. Reuse an avatar with partial progress to check preservation; use a fresh avatar to check whether quests can be accepted.

```sh
LOOPERLANDS_CONTENT_DATE=2026-11-09T00:00:00Z ./start-local.command
```

| Preview date, UTC | Expected seasonal state |
| --- | --- |
| `2026-10-14T23:59:59.999Z` | Closed, immediately before opening |
| `2026-10-15T00:00:00Z` | Open, inclusive start |
| `2026-11-08T23:59:59.999Z` | Open through the last instant of November 8 |
| `2026-11-09T00:00:00Z` | Closed, exclusive end |
| `2027-10-15T00:00:00Z` | Open again under the annual schedule |

When closed:

- [ ] Seasonal actors, clue objects, pumpkins, cauldron, floating ghosts, mist and positional Halloween sounds are absent.
- [ ] Trees and roofs retain their original appearance and ordinary map access still works.
- [ ] No new Halloween quest can be accepted or completed. Unfinished Halloween quests disappear from the active Journal without losing progress.
- [ ] Completed quests remain in history. Bottled Midnight, other inventory rewards and unused consumables remain owned.

When reopened, unfinished quests resume. **Annual availability does not reset quests, choices or rewards.** A completed avatar does not receive another introduction payment or another set of mystery rewards the next year.

A fixed preview date does not advance, so it cannot demonstrate an in-session closing transition. Use the one-off live-boundary check below for that.

### Test a one-off window locally

The shared schedule is in `server/world-definitions/halloween-season.js`. To try alternate dates without losing the current schedule, use one terminal for this sequence and keep a backup:

```sh
halloween_schedule_backup=$(mktemp /tmp/looperlands-halloween-season.XXXXXX)
cp server/world-definitions/halloween-season.js "$halloween_schedule_backup"
```

In that file, temporarily replace only the `availability` value with:

```js
const availability = {
    startsAt: '2026-10-30T18:00:00Z',
    endsAt: '2026-11-02T00:00:00Z'
};
```

Run `./start-local.command` with each relevant `LOOPERLANDS_CONTENT_DATE` value, creating a new session after each restart:

| Preview date, UTC | Expected state for this one-off example |
| --- | --- |
| `2026-10-30T17:59:59.999Z` | Closed |
| `2026-10-30T18:00:00Z` | Open |
| `2026-11-01T23:59:59.999Z` | Open |
| `2026-11-02T00:00:00Z` | Closed |
| `2027-10-31T18:00:00Z` | Closed; the event does not recur |

This is a temporary schedule test; the authored Halloween dialogue still describes the standard November 8 end date.

For an actual closing transition while connected, change the temporary one-off timestamps to start before the current UTC time and end comfortably after the local rebuild finishes. Allow about 15 minutes for setup and observation. `date -u '+%Y-%m-%dT%H:%M:%SZ'` shows the current UTC time. Start with the real clock:

```sh
LOOPERLANDS_CONTENT_DATE='' ./start-local.command
```

- [ ] Join before the deadline. Keep a partly completed mystery and an open cauldron window.
- [ ] Remain connected across the deadline. Within normal scene updates, the actors and overlay should disappear and the original tiles/soundscape should return without another restart.
- [ ] Try the old shop purchase or dialogue choice: no new item or completion reward should be granted. An error or closed window is expected.
- [ ] Refresh the Journal: completed history remains and unfinished seasonal entries are hidden.

Restore the exact schedule backup and real calendar when finished:

```sh
cp "$halloween_schedule_backup" server/world-definitions/halloween-season.js
LOOPERLANDS_CONTENT_DATE='' ./start-local.command
```

Create a new Toolbox session. Keep the backup until you have verified the restored schedule. A final `git diff -- server/world-definitions/halloween-season.js` should contain no changes introduced by this test. Removing the calendar override returns to the actual UTC date; it does not force the event on or off.
