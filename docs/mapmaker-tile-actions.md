# Tile actions & stages

Open **Tile actions & stages** and select a map. You can edit an existing farming action, create a farming action or create a **stage sequence** for interactions such as mining, repairs and repeatable resource gathering.

All changes are local playtest overrides in `tools/tiles/<map>.json`. Bundled definitions in `client/tileActions` and Tiled map exports remain intact. Save, build the map and start a fresh local session. Changing a sequence definition starts a new persistent state namespace for its placed tiles; this is useful while authoring, but does not migrate already-running interactions.

Use **Stages** (or **Farming**) to edit the definition, **Map placement** to place it, and **Preview** to test the configuration. Save changes stays available above the editor on desktop. Costs, rewards and care boosts expand when needed. Chances are entered as percentages; saved definitions still use values from 0 to 1.

## Stage sequences

Use **New stage sequence**, then select stages in **Stage flow**. Each stage has an ID, name, level requirement, optional inventory tool, optional completed quest requirement and animation duration. Tools are required inventory items; they are only consumed if you also list them under Costs.

Connect **On success go to** and **On failure go to** to other stages. An empty success destination completes the interaction. An empty failure destination retries the same stage. All stages must be reachable from Start. Loops are allowed because each transition requires a player action.

**Wait on entering** delays a stage after the previous transition. It is separate from the action's animation duration. Set success chance from 0 to 1. Costs are consumed on every attempt; only successful attempts grant rewards and XP, set the tile overlay, activate a trigger and count for quests. A tile ID of 0 clears the overlay. Original map artwork remains underneath.

Use a matching Trigger ID in **Doors & portals** or **Triggers & events**. The latter offers **Player completes a tile stage**, with action and stage IDs. In **Quest builder**, select **Use tile action**, choose the action, optionally restrict a stage, and count either completed actions or output quantity. Reload those editors after creating or renaming tile actions.

State is shared by players on that map tile. The local provider commits the stage revision, inventory costs/rewards and XP together. Stale/concurrent attempts cannot award the same transition twice. Completed sequence progress persists in the local game-data volume. These generic sequences are supported by the local provider; they are not published to the live Platform by the Toolbox.

## Farming

The farming lifecycle remains **prepare → plant → water → grow / boost → harvest**. Use sequences for a custom stage graph. Edit tool requirements, animation durations, preparation and watering XP, seed costs, crop level, growth time, yield ranges, seed returns, rare drops and care boosts.

Crop artwork uses staged tile groups exported by Tiled. Add missing groups in Tiled and build before selecting them. The editor preserves other existing crop fields. Harvest access uses the existing farming rules: planter-only, or public access after the reservation period. The growth preview reports a visual stage and remaining time without changing saved plots.

## Placement and preview

Click the map to add a 1 × 1 action region, or use Tile X/Y and **Place at coordinates**. Edit region dimensions for larger areas. Red shading shows base collisions. Save rejects blocked, overlapping and out-of-bounds regions. Placed actions override exported actions at the same coordinates; restore/remove local regions to use the original actions again.

**Start preview**, **Simulate success/failure** and **Advance 60 seconds** let you inspect transitions and waits. The preview does not spend inventory, verify requirements or alter game state. Test actual tool ownership, quest requirements and rewards in a fresh game session.

Continue with [Quest builder](mapmaker-quest-builder.md), [Triggers & events](mapmaker-events.md), [Building maps](mapmaker-building.md) and [Linked tool animations](tile-action-tools.md).
