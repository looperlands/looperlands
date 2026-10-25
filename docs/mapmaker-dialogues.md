# Dialogue tree editor

Open **Dialogue trees**, choose a map and click **New conversation**. Select the NPC type, then choose whether the conversation applies to every NPC of that type or to one specific NPC routine key. Routine keys come from the map's [NPC behaviour](mapmaker-npcs.md) definitions.

An authored conversation replaces a matching bundled tree in local playtests and production. A specific routine conversation takes priority over a general conversation for that NPC type. Removing the authored conversation and saving restores the bundled behaviour after the next build and fresh session. The editor creates saved conversations; it does not import bundled tree nodes for editing.

## Build a conversation

Select a node in the graph to edit it. NPC text and player choices use the shared dialogue editor: Item, Danger, Wave, Shake, Danger + shake, Remove styles, Undo and a live preview. Choose **End conversation**, **Continue to node** or **Player choices**. Each choice has text, a destination and optional conditions. All conditions must pass for a choice to appear; invert one to show a choice when its condition is false.

Use **Add node** to extend the graph. Renaming a node updates its links. The start node and nodes with incoming links cannot be deleted until you move those links. Every node must be reachable from the start and every destination must exist before saving. Loops are allowed: each Continue or choice requires player input.

Node actions can remember a choice, request a quest or complete a quest. Actions happen when the player reaches that node. Quest progress tags such as `{{remaining}}` belong in Quest builder dialogue; a general conversation has no current quest objective context.

## Preview as a player

Set a sample level, inventory, kills, received/completed quests and remembered choices. Start the conversation, follow choices and inspect its action log. Changing the setup resets the preview. Actions modify only the preview's cloned state. Quest actions simulate the state change; actual gameplay still applies quest eligibility, objectives and rewards.

**Save** writes the dialogues section of `tools/worlds/<map>.json`. Use **Build tools** and start a fresh local session, then talk to the matching NPC. Authored trees take precedence over automatic quest dialogue for that NPC, so include the quest actions and branches your conversation needs. Commit and deploy the saved file to activate the same conversation in production. Saving only changes your checkout and does not modify the Platform.

Continue with [NPCs](mapmaker-npcs.md), [Quest builder](mapmaker-quest-builder.md) and [Trigger & event builder](mapmaker-events.md).

## Shared dialogue editor

The same editor is used for quests, conversation nodes and choices, event speech and notifications, NPC greetings, ambient and routine speech, entrance failure messages and tile-stage outcomes. Select words in the source, then choose a style. Undo reverses toolbar actions; typing or loading another record clears that toolbar history. The preview uses the game’s text renderer and colors, including animated Wave and Shake. Reduced-motion preferences disable the animation. For fields with one message per line, styling a multiline selection wraps each line separately.

Progress tags are opt-in and appear only in a supported Quest builder in-progress field. Other dialogue fields have no quest counter context. Existing length limits include style markup. New markup accepts only balanced spans using the four game classes; arbitrary HTML and attributes are rejected. Unchanged legacy NPC links are preserved; copying an NPC removes links while retaining supported emphasis.

To reuse the component, load `dialogue-presentation.css`, `dialogue-format.js`, `dialogue-text.js` and `dialogueeditor.js` before the caller, create and label a textarea, then call:

```js
const editor = window.ToolboxDialogueEditor.attach(textarea, {
    tags: () => supportsProgress ? [{key: 'remaining', sample: 7}] : []
});
// The textarea value and normal bubbling input events remain the form contract.
editor.reset();   // After loading a different record programmatically.
editor.refresh(); // After changing tag availability or disabled/read-only state.
```

Calling `attach` again on the same textarea returns its existing controller. Dynamic forms are weakly held and can be removed normally. `ToolboxDialogueEditor.appendPreview(parent, source)` appends a safe animated preview to an empty container. The shared `DialogueFormat` module owns the style presets, validation grammar and safe preview rendering, and is also used by the game and save endpoints.
