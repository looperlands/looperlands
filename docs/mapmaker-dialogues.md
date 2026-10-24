# Dialogue tree editor

Open **Dialogue trees**, choose a map and click **New conversation**. Select the NPC type, then choose whether the conversation applies to every NPC of that type or to one specific NPC routine key. Routine keys come from the map's [NPC behaviour](mapmaker-npcs.md) definitions.

An authored conversation replaces a matching bundled tree locally. A specific routine conversation takes priority over a general conversation for that NPC type. Removing the authored conversation and saving restores the bundled behaviour after the next build and fresh session. The editor creates local conversations; it does not import bundled tree nodes for editing.

## Build a conversation

Select a node in the graph to edit it. Its text supports the game's Item, Danger, Wave and Shake span styles. Choose **End conversation**, **Continue to node** or **Player choices**. Each choice has text, a destination and optional conditions. All conditions must pass for a choice to appear; invert one to show a choice when its condition is false.

Use **Add node** to extend the graph. Renaming a node updates its links. The start node and nodes with incoming links cannot be deleted until you move those links. Every node must be reachable from the start and every destination must exist before saving. Loops are allowed: each Continue or choice requires player input.

Node actions can remember a choice, request a quest or complete a quest. Actions happen when the player reaches that node. Quest progress tags such as `{{remaining}}` belong in Quest builder dialogue; a general conversation has no current quest objective context.

## Preview as a player

Set a sample level, inventory, kills, received/completed quests and remembered choices. Start the conversation, follow choices and inspect its action log. Changing the setup resets the preview. Actions modify only the preview's cloned state. Quest actions simulate the state change; actual gameplay still applies quest eligibility, objectives and rewards.

**Save** writes the dialogues section of `tools/worlds/<map>.json`. Use **Build tools** and start a fresh local session, then talk to the matching NPC. Authored trees take precedence over automatic quest dialogue for that NPC, so include the quest actions and branches your conversation needs. Saving does not publish to the Platform.

Continue with [NPCs](mapmaker-npcs.md), [Quest builder](mapmaker-quest-builder.md) and [Trigger & event builder](mapmaker-events.md).
