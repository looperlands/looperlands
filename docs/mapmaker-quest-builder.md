# Quest builder

Use **Quest builder** in the [Mapmaker Toolbox](mapmaker-toolbox.md) to create custom quests or adapt bundled quests for local playtesting and production. It uses the existing quest engine, NPC interactions and Journal. Bundled quest edits are stored as overrides while their original source stays intact.

## Create a quest

1. Select the map that contains your quest giver.
2. Click **New quest** and give it a unique **Quest ID** and a player-facing **Name**.
3. Choose a **Quest giver** present on the map. Write **Start text** and **End text** for acceptance and completion. Optional **In-progress text** gives the player a reminder.
4. Click **Add objective** to add steps. Give each an **Objective ID**, **Player-facing label**, **Action**, **Target** and **Amount**.
5. Set **Quest level** and **Required player level**. Optionally choose a **Reward item**, **Reward quantity** or **Prerequisite quest ID**.
6. Click **Save quests** to save this map's custom quests and saved overrides.
7. Use **Build tools → Build map and restart game** for that map. After **Build complete**, [start a new session](mapmaker-sessions.md), speak to the quest giver and accept the quest.

Saving writes the definition to disk. The running game loads it after the restart; saving alone does not change an active playtest.

## Edit a bundled quest

1. Expand **Bundled quests** for the selected map and click **Edit quest**. If the button says **Edit in** another map, use it to switch to the map that owns that quest's definition.
2. Edit the name, dialogue, levels, prerequisite or reward. The original Quest ID and quest giver stay fixed so saved progress and existing interactions keep referring to the same quest.
3. Under **Quest goal**, adjust the existing **Action**, **Target** and **Amount**. Use **Return to quest giver** when the player must report back. Additional quest text contains the longer description, quest-log text and target NPC's response where the original quest uses them.
4. Click **Save quests**, then build the selected map in **Build tools** to restart the game with your changes.

An override changes the same bundled quest everywhere it is available, including production after deployment. The map selected for editing determines where its override file is saved. Custom quests created with **New quest** are scoped to their own map.

Bundled quests keep their existing progression rules. Their defeat goals can count earlier lifetime kills; collection goals check current inventory and remove the required items at completion. Editing a bundled quest does not convert it into the custom objective system below.

Some quests advance through story choices. Their goal controls stay locked because their dialogue trees own that logic. You can still edit the supported quest text, requirements and rewards. The story dialogue tree itself is separate from the quest definition.

The dialogue editor shows the source text, including existing style spans. **Dialogue preview** shows how that text and its colors will look against the game background. Unchanged original text keeps its existing formatting and sequence of speech bubbles. When editing a field that originally contains multiple bubbles, put one bubble on each line. Other original quest metadata remains intact.

Click **Restore original**, then **Save quests** and build again to remove a bundled quest's override. This restores the definition without resetting the avatar's saved quest progress.

## Objectives for custom quests

Choose targets from the map's exported NPCs, mobs and areas, or the game's item definitions. If a newly placed NPC, mob or area is missing, save the map in Tiled and [build it](mapmaker-building.md) before choosing the target.

- **Talk to NPC:** speak to the selected NPC while this objective is active. A placed NPC key can distinguish one actor from other NPCs of the same kind.
- **Defeat mob:** defeat the selected mob kind. Set the amount for multiple kills. Only kills made while the objective is active count.
- **Collect item:** collect the selected item while the objective is active. Items already in inventory do not pre-complete this step.
- **Visit area:** enter the selected named map area while the objective is active. Place and name the area in Tiled, then export the map first.
- **Deliver item:** bring the selected amount of a real inventory item to the chosen NPC or area. This must be the final objective of an ordered quest. The engine checks inventory for the hand-in and removes the delivered items at quest completion.

With **Complete objectives in order** checked, quests progress from top to bottom. **Move up** and **Move down** change that order. An event before its objective becomes active does not count toward a later step. Clear the checkbox for objectives that can be completed independently; delivery objectives require ordering.

An optional **Return NPC** adds a final reporting interaction after the objectives. Choose **Complete without a final report** for automatic completion after the last objective. For a delivery quest with a reporting step, the engine checks and removes the items when the player completes that final report. Keep the required items until completion.

Leave **Placed NPC key (optional)** and **Recipient NPC key (optional)** blank to accept any NPC of the selected kind on this map. Use a known behavior key to target a specific actor. Static `placed:<entityId>` keys can change after map edits.

## IDs, rewards and prerequisites

New custom quest and objective IDs start with a letter and contain only letters, numbers, `_` or `-`, up to 64 characters. Quest IDs must be unique across custom and bundled quests. Objective IDs must be unique within their quest. Bundled quests keep their original IDs, including older IDs with spaces.

Keep IDs stable when fixing wording or adjusting an existing quest. IDs connect the definition to saved player progress. Changing them creates a different quest or objective for that player.

The quest level controls the existing quest XP reward. Required player level controls who can accept the quest; use 1 to allow every level. An optional prerequisite requires completion of that quest first. An item reward adds the chosen item quantity when the quest completes.

Quest names and objective labels use plain text. Dialogue supports the style spans described below; unsupported tags, attributes and template expressions are rejected.

## Style dialogue

Select a word or short phrase in a dialogue field, then choose a toolbar style:

- **Item:** gold emphasis for an item or supply, using `dialogue-item`.
- **Danger:** red emphasis for a threat, using `dialogue-danger`.
- **Wave:** blue emphasis with a gentle wave in the game, using `dialogue-wave`.
- **Shake:** a small stepped shake in the game, using `dialogue-shake`.
- **Danger + shake:** red emphasis combined with a shake.

With no text selected, a style button inserts a selected `text` placeholder for you to replace. **Remove styles** removes span formatting throughout that text field while keeping its words. **Undo** reverses the last editor toolbar action.

You can also write the supported spans directly:

```html
Bring the <span class="dialogue-item">basket</span>.
Beware the <span class="dialogue-danger dialogue-shake">rats</span>.
Meet me by the <span class="dialogue-wave">lanterns</span>.
```

Use balanced opening and closing `span` tags with a `class` containing only `dialogue-item`, `dialogue-danger`, `dialogue-wave` or `dialogue-shake`. Other tags and attributes are not supported for new or changed dialogue. Unchanged bundled text retains its original markup.

**Dialogue preview** updates as you type. It shows colors without animation; wave and shake animate in the game. Apply effects to short phrases so the message stays readable. Reduced-motion preferences disable those animations in the game.

## Write a progress reminder

Only **In-progress text** replaces progress placeholders with numbers. Use its **Insert progress:** buttons to add a tag at the cursor, or type the names exactly, including both opening and closing braces:

- `{{remaining}}`: how much is left.
- `{{done}}`: how much is complete.
- `{{amount}}`: the goal's total amount.

For a bundled defeat quest with a goal of 10 blue monsters and 3 already defeated, the values are `remaining = 7`, `done = 3` and `amount = 10`. Write:

```text
Keep up the great work friend! You only have {{remaining}} blue monsters left to slay!
```

The player sees:

```text
Keep up the great work friend! You only have 7 blue monsters left to slay!
```

You can style the tag and its surrounding phrase together, for example `<span class="dialogue-danger">{{remaining}} blue monsters</span>`. The editor's preview uses sample values of 7 remaining, 3 done and 10 total. These are examples rather than the progress of a game session.

The meaning of those numbers depends on the quest:

- A bundled **Defeat mob** goal uses the existing defeat count, including earlier lifetime kills.
- A bundled **Collect item** goal uses the amount currently in inventory. Items spent or removed change that count.
- A custom quest counts objective steps. If 3 of 10 steps are complete, `{{remaining}}` is 7. It does not show the remaining kills or items within the current step; use wording such as `You have {{remaining}} tasks left.`
- A bundled **Talk to NPC** goal does not supply `remaining` or `done`. Use a plain reminder such as `Speak to the guard, then come back to me.` Story-driven goals also should use plain reminders because their scripts do not reliably provide these counters.

The progress buttons are hidden for bundled talk and story-driven goals. Placeholders are not interpolated in **Start text**, **End text** or the other text fields. Use ordinary wording without progress tags there.

## Test the whole quest

1. Start near the quest giver with a suitable avatar level and equipment.
2. Accept the quest through the NPC and open the Journal to check its name, text and objective labels.
3. Complete the quest's goal. For custom quests, check that early kills, collections or visits do not skip later objectives. For bundled quests, verify the existing lifetime-kill or inventory requirements.
4. For deliveries, try the recipient before and after collecting enough items. Complete any return interaction and check the inventory debit and rewards.
5. Reconnect to check that progress persists, and try a different avatar to check an independent player's progression.

A fresh session URL retains the selected avatar's quest progress. For a clean repeat, use another bundled avatar. You can also give a custom test quest a new Quest ID; bundled quest IDs stay fixed. Changing only the wallet does not reset that avatar's quests. Keep a custom quest's ID stable once its progress matters.

## Saving and sharing

Quest builder changes are stored in `tools/quests/<mapId>.json` in your checkout. Each file contains a `version`, the map's custom `quests` list and any bundled quest `overrides`. Each override records an original quest ID and only the fields you changed. You can review and share these files alongside the map's source and exports.

Saving replaces the custom quests and overrides for the selected map. If another browser tab or editor has changed the file, use **Reload quests** before saving again so you can review the newer version. Reloading asks before discarding unsaved changes. **Remove quest** removes a custom quest's definition on the next save and restart; **Restore original** removes a bundled quest's override. Neither action erases saved player history.

Switching maps keeps unsaved drafts while the toolbox page remains open. Save each map's changes before leaving the page. **Quest JSON preview** shows the current quest's definition for review.

If a map edit removes a quest target, **Reload quests** shows the validation error and keeps the quest editable. Choose an available target or remove the affected quest, save, then build again. The local game skips invalid map quest definitions and logs the reason so other maps remain playable. Fix malformed JSON directly in the named source file before reloading it.

Custom quests and bundled quest overrides use the same saved files in local playtests and production. Commit `tools/quests/<mapId>.json` with the map sources, generated exports and any new assets. After merge to `main` and a successful deployment, the live server loads those definitions. Production builds reject invalid saved content instead of silently omitting it.

Continue with [Building maps](mapmaker-building.md), [Starting game sessions](mapmaker-sessions.md) or the [Mapmaker Toolbox overview](mapmaker-toolbox.md).

Use **Search bundled quests** to filter the bundled list by name or quest ID. Search ignores letter case. The result count shows how many quests match; clear the search to return to the full list.

## Tile action objectives

Choose **Use tile action** to count successful stages from a saved map action. Pick the action, optionally enter a stage ID (for example `harvest` or `work`), and choose whether progress counts completed actions or output quantity. Failed sequence attempts do not count. Reload Quest builder after creating tile definitions in [Tile actions & stages](mapmaker-tile-actions.md).
