# Starting game sessions

Use **Playtest** in the [Mapmaker Toolbox](mapmaker-toolbox.md) whenever you need a new local game session. Start the desktop launcher first and wait for maps and avatars to load.

## Choose your setup

1. Select a **Map** and **Checkpoint**. The checkpoint hint shows its map position; starting checkpoints are marked in the list.
2. Search for an **Avatar** by name or NFT ID, or use **Browse**. You can also paste a bundled avatar's NFT ID in **Avatar NFT ID**.
3. Set **Avatar level** and **Display name**. Levels range from 1 to 9999; the name must contain 1–24 characters.
4. Keep the default **Wallet address**, or enter another address in the usual `0x` plus 40 hexadecimal character format. Local playtests need no wallet connection or signature.
5. Choose a **Weapon** and **Player class**. NFT weapons allow a custom **Weapon level**. Built-in weapons keep their normal fixed level.
6. Click **Start game**. The game opens in the current tab.

The server converts your chosen levels to XP and prepares the selected loadout. Ownership checks pass locally, while item, quest and level gates keep their normal behavior.

## Start at an exact tile

Expand **Set a custom spawn position** under **Spawn** to enter X and Y map-tile coordinates. Supply both coordinates and choose a walkable tile. The checkpoint still needs to be valid for the selected map.

Use **Use checkpoint instead** to clear both coordinates. Changing the selected map also clears the custom position.

## Remember a setup

Your last settings are remembered in this browser automatically. To keep multiple scenarios:

1. Choose the map, character and equipment settings you want.
2. Enter a **Setup name** and click **Save**.
3. Select it under **Saved setup** and click **Load** to restore it.

Saving with an existing name replaces that setup. **Delete** removes the selected setup. Saved setups belong to this browser and local toolbox address; they are separate from game progress.

## Session URLs and saved progress

Return to the toolbox address and click **Start game** to get a new session. Old session URLs stop working after a game restart, including a [map build](mapmaker-building.md). An already active session URL cannot be reused for a second player.

Starting another session changes the requested spawn and loadout but preserves inventory, quest progress and recorded choices for the selected avatar. Progress is associated with the avatar NFT ID; changing the wallet alone does not give that avatar fresh quests. Choose another bundled avatar when you need an independent quest test character.

## When a session does not start

- Wait for any active map build to finish. Session creation is unavailable during the restart.
- If the map list is missing, use **Try again**, then **Troubleshoot → Run checks**.
- If a custom position is rejected, choose a walkable tile or clear both coordinates.
- If an old game URL redirects away, create a new session from the toolbox. In browser Network logs, session HTTP 404 means the session is missing, 409 means it is already active, and 503 means player data could not load.

Continue with [Building maps](mapmaker-building.md) or [Quest builder](mapmaker-quest-builder.md).
