# Interactions

Interactions let players gather resources, open chests, repair objects and use switches. Choose a template, describe the player action and its result, then place the definition on one or more maps. A one-action interaction needs no stage IDs or routing.

## Create and place an interaction

Open **Interactions** and choose a map. Select **New interaction** and a starting point:

| Template | Starting behavior |
| --- | --- |
| Resource deposit | Shared progress; available again after a 60-second cooldown |
| Chest | Each player can open each placed chest once |
| Repair | One completion per placed tile, shared by everyone |
| Switch | Alternate Turn on and Turn off; connect their outcomes to events |
| Custom interaction | One action, ready for your own requirements and result |

Templates are editable starting points. They do not invent rewards, materials or tool requirements. Configure those before testing.

In **Setup**, name the interaction, choose who shares progress and what happens after the final action. Give the action a player-facing label such as Mine or Open. Set its duration, optional required tool or key, costs, rewards, XP and message.

Required items are kept unless also listed under Costs. Costs are spent on every attempted action, including failed attempts. Only success grants rewards and XP, changes artwork and counts for quests. Cancelling an animation does not attempt the action.

In **Place on map**, click the built map or enter Tile X/Y and select **Place at coordinates**. A region places an independent interaction on every covered tile. Blocked, overlapping and out-of-bounds regions cannot be saved. Placements override exported tile actions on those coordinates.

Save, build the affected maps and start a fresh local session. Existing sessions keep their loaded definition. The Toolbox currently supports these interactions in local playtests; publishing them to the live Platform is not available.

## Reuse and appearance

New interactions are shared definitions in `tools/interactions/library.json`. Select another map to place the same definition again. The editor shows the placement count and affected maps. Rule changes affect every placement; each placed tile keeps independent progress. A definition placed on another map cannot be deleted until those placements are removed.

Artwork belongs to each map because tilesheets use different tile numbers. In **Appearance on [map]**, choose the initial artwork and the artwork shown after each action. Browse the tiles visually or use arrow keys and Enter. **Original map artwork** removes the interaction overlay.

Appearance changes do not change collisions. Use a linked door or portal for gates; a repair does not make an arbitrary blocked terrain tile walkable.

## Progress and repetition

- **Shared by everyone:** all players use the same state on that tile.
- **Separate for each player:** each playtest avatar has its own state, rewards and artwork. Other players do not see that avatar's changes.
- **Stay completed:** the final successful action finishes the interaction.
- **Ready again immediately:** the final success returns to the first action.
- **Ready again after a cooldown:** the completed artwork remains until the timer expires, then initial artwork and availability restore automatically. No extra player action is needed.

Progress and inventory changes are committed together. Concurrent or stale attempts cannot award the same transition twice. Cooldowns and personal progress survive restarting the local game server.

Changing gameplay rules or that map's artwork starts a fresh progress namespace. Renaming an interaction, action or player message preserves progress. The editor does not migrate running interactions.

## More steps and events

Use **Add another step** when the player needs to do more than one thing. The basic flow connects steps in order. **Advanced requirements, outcomes and references** contains level and completed-quest requirements, chance of success, success/failure routing and stable IDs.

**Wait before this action** delays an action after the preceding transition. It is different from a completion cooldown: the player still performs that next action. Loops are allowed; every step requires a player action.

Save the interaction before opening **Connect this action to an event**. This opens Triggers & events with an interaction rule selected or drafted, with the interaction and named action already filled in. Choose its conditions and effects, then save the rule. Existing saved action IDs remain stable when names change.

In **Quest builder**, choose **Use interaction**, select the interaction and optionally a named action. Count successful actions or items received. New interactions report the total reward quantity of the successful action.

Advanced shared interactions can also activate, deactivate or toggle a named map trigger directly. Choose an existing trigger suggestion or enter the Trigger ID used by **Doors & portals** or **Triggers & events**. Direct map triggers require shared progress; use a player interaction event for personal outcomes. Shared trigger outcomes restore when the local map loads.

## Test before playing

**Test interaction** provides a sandbox with a test player, inventory, level and completed quests. Try the action, empty the inventory to check blocked requirements, give required items, force a failed attempt when failure is configured, skip waits and reset the test. Costs, rewards, XP and the current artwork are visible. Sandbox changes never alter saved gameplay or mark the definition dirty.

The sandbox advances action time immediately. A fresh game session still verifies real animation, adjacency, multiplayer behavior, quest progress and inventory persistence.

## Existing farming and custom sequences

Existing farming remains editable under **Farming compatibility**. Its prepare → plant → water → grow / boost → harvest lifecycle, crop groups, care boosts, seed returns and ownership rules remain intact. New farming definitions are no longer the starting point for generic interactions.

Existing custom sequences keep their advanced stage editor and map-specific behavior. Their original IDs, routing, rewards and waits are preserved.

Legacy sources in `tools/tiles/<map>.json`, bundled definitions in `client/tileActions` and Tiled exports are not rewritten. When saving a map through the shared library, its local definition/placement snapshot takes precedence over the legacy file. Docker mounts the interaction directory so saves survive a rebuild.

Continue with [Quest builder](mapmaker-quest-builder.md), [Triggers & events](mapmaker-events.md), [Building maps](mapmaker-building.md) and [Linked tool animations](tile-action-tools.md).
