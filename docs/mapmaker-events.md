# Trigger & event builder

Open **Triggers & events**, choose a map and click **New rule**. Give the rule a name, choose its **When** event, add any **If** conditions, then arrange its **Then** actions. Conditions must all pass; invert a condition to require its opposite. Actions run in order.

For a boss gate, start with the **Boss → gate preset**. Select the boss mob and the gate's exact Trigger ID. The gate connections list shows matching entrances and links to **Doors & portals**, where you can change their trigger conditions and messages. Activating a trigger satisfies that trigger condition; the gate's other requirements still apply. Add a private NPC or player message, or a notification, after activation to explain what happened.

Events include player spawn, mob kills, item loot, quest completion, NPC interaction, areas and trigger changes. Conditions cover kills, current inventory, quests, level and active triggers. Actions include trigger changes, messages, quest requests, sound and music. The editor only offers supported game blocks. Trigger feedback cycles are rejected when saving; disabling a rule removes it from the active flow.

## Test and save

Expand the player setup and enter inventory, kills, quests and active triggers, then simulate the selected event. The log shows whether conditions pass and which actions are requested. Preview state is separate from your saved game. Quest requests in this simulation do not verify objectives, eligibility or rewards.

Triggers belong to the running map world and can affect other players there. The legacy flow engine stops a chain if an action fails, including trying to activate an already active trigger. Keep repeated events in mind when ordering actions.

**Save** writes the map's rules section to `tools/worlds/<map>.json`, preserving its dialogues and atmosphere. Concurrent edits to the same section require a reload before saving. Use **Build tools**, then start a fresh local session to exercise the actual rule and gate. These authoring files are loaded only in local playtest mode; saving does not publish to the Platform.

Continue with [Doors & portals](mapmaker-doors.md), [Dialogue trees](mapmaker-dialogues.md) and [Building maps](mapmaker-building.md).

Successful interactions emit **Player uses an interaction**. Select the interaction and a named action, or choose any successful action. From the saved interaction editor, **Connect this action to an event** opens a matching rule or drafts one with the references filled in. See [Interactions](mapmaker-tile-actions.md).
