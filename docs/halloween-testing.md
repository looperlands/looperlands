# Halloween playtest checklist

Start with the full story on a fresh avatar, then use a separate avatar for inventory and calendar checks. The [event guide](halloween.md) describes the content; this checklist includes the solutions.

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
| Avatar level | `1` is enough for every mystery |
| Access mode | **Local progress** |
| Starting progress | Leave inventory and finished quests empty for the first story run |
| Spawn → Set a custom spawn position | X `44`, Y `214` |

Click **Start game**. Whispy is two tiles east, at **46, 214**. Each coordinate below is a map tile; click an actor from an adjacent walkable tile. Objects described as shoes, a pumpkin, a ledger, a basin or a locket are clickable clues.

**The two clocks are separate.** `LOOPERLANDS_CONTENT_DATE` selects a fixed UTC calendar date for seasonal availability. **Time of day** selects the advancing in-game clock for lighting and NPC schedules; setting it to evening does not activate Halloween. Both settings affect all local players. Production ignores the local calendar override.

**A new session is not a fresh quest save.** Progress, choices and inventory belong to the avatar NFT ID. Reusing that avatar or changing only its wallet keeps its progress. Choose another bundled avatar for a clean story run. Starting inventory replaces the amounts you select; omitting an item does not remove a saved balance. **Add finished quest** skips a quest without granting its reward. Use the same avatar deliberately for persistence tests. See [Starting game sessions](mapmaker-sessions.md) for the full launcher behavior.

## Complete the personal story

### Introduction

- [ ] Click Whispy at **46, 214**. Choose **I will help settle the hauntings.** → **Let us begin.** → **Show me the mysteries.**
- [ ] Confirm **Halloween: Something Is Wrong With the Village** completes and gold increases by **10**.
- [ ] Confirm the hub offers all three mysteries and **Browse the cauldron recipes.** No combat or higher level is required.

### The Missing Shadow

1. At Whispy, choose **Ordinary Adam's missing shadow.** → **I will follow the shadow.**
2. Walk west to the **Abandoned Shoes, 36, 211**, and inspect them.
3. Continue west to the **Whispering Pumpkin, 29, 213**. Choose **Turn the pumpkin away from the lantern.**
4. Return to Whispy. Choose **Ordinary Adam's missing shadow.** → **I freed the shadow from the pumpkin.**

- [ ] Receive **3 pumpkins** (`m88npumpkin`) once; the quest appears in completed history.
- [ ] Revisit the pumpkin and Whispy: the dialogue remembers your solution and grants no second reward.
- [ ] On a fresh run, inspect the pumpkin before the shoes: the release choice should be absent. Merely visiting both clues should not complete the quest; you must free the shadow and report back.
- [ ] Choose **Show me the recipes.** to reach the first souvenir immediately: **1 pumpkin + 5 gold → Bottled Midnight**.

### The Second Gravedigger

1. At Whispy, choose **The two gravediggers.** → **I will compare their stories.**
2. Near the notice board east of the market, speak to **Mara at 51, 225** and **Rowan at 54, 225**.
3. Inspect the **memorial/old town ledger at 52, 222**. These three clues can be visited in any order.
4. Return to Whispy. Choose **The two gravediggers.** → **I have read the evidence. Let me decide.**
5. To test a wrong answer, choose **Mara, on the left. She looks very pale.** Then choose **Let me reconsider.**
6. Choose the correct answer: **Rowan, on the right. His name is on the memorial.**

- [ ] The decision option appears only after all three clues have been read.
- [ ] A wrong answer gives a hint without completing the quest, consuming resources or blocking a retry.
- [ ] The correct answer grants **6 wood** once. Rowan's later dialogue acknowledges the discovery.

### The Whispering Well

1. At Whispy, choose **The whispering well.** → **I will listen to the well.**
2. Visit the **well/basin beside the south-west fountain, 16, 241**. Choose **Listen without giving it another name.**
3. Walk north-east to the **locket on the southern market path, 32, 234**. Choose **Wrap the locket in a cloth and take it to the well.**
4. Return to the well at **16, 241**. Choose **Lower the locket gently into the well.**
5. Return to Whispy. Choose **The whispering well.** → **I returned the locket to the spirit.**

- [ ] Receive **3 ore** once. Revisit the well to hear its peaceful response.
- [ ] The locket is a personal story choice; it does not add or consume an inventory item. Its visible clue stays available to other players.
- [ ] Visiting well → locket → well without taking and returning the locket is insufficient: the completion option remains unavailable.

After all three mysteries, the Journal should contain **four completed Halloween quests** including the introduction. When clue objectives are checked off but a decision or report is still needed, the active Journal should explain that remaining step rather than claim the haunting is already settled.

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
- [ ] Follow the **Late Fisherman**, **Wandering Musician** and **Very Convincing Ghost** through the repeating stops: **41, 211 → 45, 223 → 29, 214 → repeat**. Each starts at a different stop and waits about eight seconds at a stop. Pathfinding and conversations can delay its movement.
- [ ] Watch until a ghost returns to a previously visited stop. Talk to all three for their short stories. They should remain friendly and keep returning after your mysteries are completed.
- [ ] Walk past ordinary residents, shops, the notice board and doors. Their existing services and routes should remain usable.

## Scenery, floating ghosts and sound

- [ ] Look for pumpkins along the market paths and the cauldron beside Whispy at **47, 214**.
- [ ] Check the recolored tree canopies beginning at **33, 202** and **51, 208**, and the roof beginning at **33, 216**. Walk past their edges: no holes, misplaced tiles or new invisible walls should appear.
- [ ] Observe ground mist and floating ghosts while standing still and while walking. They should drift smoothly while leaving paths, actors and dialogue readable. These floating images are scenery; the three walking procession NPCs are the ghosts you can talk to.
- [ ] Move between scenes, use a door to another map and return. Scenery should follow its configured area without carrying the Halloween overlay or sounds onto unrelated maps.
- [ ] In **Settings → Audio**, enable **Game audio enabled** and use the **Ambience** slider. Approach and move around the cauldron and well: bubbling/water should fade with distance and shift between stereo channels.
- [ ] Set **Ambience** to zero, then restore it. These sounds should mute and return immediately without requiring a new quest or session. Music and Sound effects have separate sliders.
- [ ] Enable your operating system's reduced-motion preference, or emulate `prefers-reduced-motion: reduce` in your browser. The floating-ghost and mist drift should stop. Restore the preference afterwards; the ordinary walking NPC procession should still function.

### Tour the floating-ghost scenes

All of these locations are on **main**. Keep checkpoint **2** and change the custom spawn coordinates in the Toolbox, then click **Start game** for each stop. Reuse the same avatar to preserve story progress. These spawn tiles are walkable and clear of static entities and doors; existing enemies remain active.

| Scene | Custom spawn X, Y | What to compare |
| --- | --- | --- |
| Town | **46, 223**, or **44, 214** beside Whispy | Denser floating ghosts at three depths, plus the ground mist and market decorations |
| Beach | **46, 283** | More widely spaced ghosts over the beach scenery |
| Forest | **47, 167** | Ghosts remain readable among the trees without hiding routes |
| Graveyard | **46, 124** | The densest ghost treatment; graves and enemies should still be readable |
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
- [ ] The recolored trees and roof have their original appearance and ordinary map access still works.
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
