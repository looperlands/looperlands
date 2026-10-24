# Doors and portals

Use **Doors & portals** in the Mapmaker Toolbox to inspect entrances in a map and edit their access conditions, opening hours, and player messages.

## Find an entrance

1. Choose a **Map source**. The editor reads the TMX file directly, so it can work before the map has been built.
2. Search by Tiled object ID, name, source coordinates, destination, condition value, or message text.
3. Select an entrance. The editor shows its source tile, destination and TMX path. IDs refer to the object IDs shown in Tiled.

A **door** and a **portal** use the same conditions and messages. Their movement and camera effects differ: local portals use the teleport effect. A destination map property sends the player to another map. Placement, destination coordinates, orientation and camera settings are displayed or preserved here; change those in Tiled.

The tool reads objects from the map’s top-level object layer named `doors`. It edits existing objects; create or move entrances in Tiled.

## Main access condition

Choose one main condition and enter its required value:

- **No main condition:** unrestricted by a main gate; opening hours and an optional trigger still apply.
- **NFT ownership:** the exact NFT ID checked for the player’s session wallet.
- **Inventory item:** the exact item kind, such as `wood` or `KEY_ARACHWEAVE`. The game checks for its presence in inventory. It does not consume the item or require a quantity.
- **Completed quest:** the exact quest ID, such as `KING_QUEST_1`, recorded as completed for the character.
- **NFT collection:** the exact collection identifier expected by the platform ownership service. Preserve spaces and capitalization; a display name is not necessarily the service identifier.
- **Player level:** a minimum player level.
- **Weapon level:** a minimum weapon level.
- **Web redirect:** a full `http://` or `https://` URL opened in a new tab. This is an action rather than an access gate. Opening hours apply, but the runtime skips trigger checks for redirects.

The game does **not** combine multiple main conditions. Legacy maps can contain several; the runtime chooses the first in this order: NFT, item, quest, collection, redirect, player level, weapon level. The editor lists these legacy properties and preserves them while you change messages. Select **Replace these with one condition** to explicitly replace the legacy set with your chosen rule.

Ownership results depend on the session wallet and ownership service. Local playtest providers can differ from production. An edited collection ID is not proof that a live wallet passes that gate.

## Trigger condition

Enter a **Trigger ID** to also require an active trigger on this map. The trigger must already be defined by the map or its game behavior. Check **Require the trigger to be inactive instead** to invert it. In the TMX, inversion is stored as `!<trigger-id>`.

For normal entrances, the trigger runs after the main condition passes. With no main condition, the trigger alone can control entry. Web redirects skip it. Removing the trigger ID removes the trigger requirement; this editor does not change the trigger’s definition or current state.

## Opening hours

Enable **Limit entry to game-time opening hours** and enter a 24-hour window, for example `08:00-18:00` or `22:00-06:00`. Use the game clock, not your computer’s clock. One full game day lasts one real hour.

The start time is included and the end time is excluded. Overnight windows cross midnight. Equal endpoints, such as `00:00-00:00`, mean all day. Disable the checkbox to remove the time restriction.

Opening hours are checked before the main condition and again before travel after asynchronous ownership or trigger requests. The game remains closed outside the range even if the other checks pass.

## Messages and preview

Edit the general fallback and the individual NFT, item, quest, collection, trigger and opening-hour failure messages. These are plain-text messages, up to 2000 characters each. They are failure messages, not a greeting shown every time someone enters.

The runtime picks a condition-specific message first, then the **General fallback message**, then its built-in default. Player-level and weapon-level failures use the general fallback or a generated level requirement. Leaving a field blank removes that custom message.

Use **Preview condition** to see the selected failure text with the same fallback order. The preview only renders text. It does not check real ownership, quest progress, trigger state, levels or the current game time. Messages for inactive conditions can be kept for later use.

## Save, build and recover

Click **Save entrance** to write only the selected object in `tools/maps/tmx/<map>.tmx`. Other objects, tile layers, comments and map content are preserved. Destination settings and unsupported properties on the object are retained. No generated map file is edited directly.

Then [build that map](mapmaker-building.md). The normal exporter updates both client and server maps and restarts the local game. Start a fresh [game session](mapmaker-sessions.md) and test a player who passes the rule and one who fails it. For time restrictions, test both an open and a closed game-time window.

Saving checks the map revision. If Tiled or another tab changed the source, your save is rejected instead of overwriting it. Your draft remains available: copy any values you need, use **Reload entrances**, and reapply them. Changing the selected map or entrance while editing offers **Discard changes** and **Keep editing**. Navigating to another Toolbox tool keeps the draft in memory.

A map build cannot start while an entrance save is running, and an entrance save is rejected while a build is running. Wait for the current action to finish, then retry. Save the TMX in Tiled before reloading the editor, and avoid editing the same source in both places at once.
