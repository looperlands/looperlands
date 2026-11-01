# Halloween cauldron

The witch uses the existing shop window with three fixed recipes. `server/world-definitions/halloween-shop.js` owns the stock and prices; `halloween-season.js` owns the annual UTC availability shared with the quests and map dressing. The Halloween world definition installs its exact shop routes through `halloweenhttp.js` before the normal shop fallback, including outside the season. The server checks the date and requires a living player within five tiles of the `halloween:witch` actor on `main`, including purchases from an already-open window.

| Recipe | Inputs | Result |
| --- | --- | --- |
| Bottled Midnight | 1 pumpkin, 5 gold | Permanent inventory souvenir |
| Graveyard Stew | 2 wood, 3 gold | Restores 75 HP; 15 second cooldown |
| Borrowed Courage | 1 ore, 3 gold | 20% less melee damage for 30 seconds; 60 second cooldown |

The first mystery supplies pumpkins. Wood, ore and gold keep the two consumable recipes repeatable with normal exploration. These items use the existing Mapmaker item registration and effect system. Their sprites reuse the bundled champagne bottle, cauldron and strange yellow liquid artwork, copied under independent item IDs at all three scales. The original items keep their existing behavior.

## Persistence and uncertain outcomes

The current Platform inventory endpoint does not expose an atomic, idempotent shop exchange. The generic `InventoryExchanges` service owns pending exchanges, session reservations and confirmation. It reserves ingredients in the session before waiting, preventing another shop, gift or consumable from spending the same units. Creating a replacement session while that avatar has an exchange pending returns a retryable error and keeps the reserved session until the exchange settles. These recipes then use one inventory batch containing both the costs and output, under the game server's existing inventory writer, followed by independent readback of every affected quantity. The session only receives the output when all balances match the expected result. A lost response with matching readback is accepted without repeating the batch.

If readback fails or shows an unexpected balance, the server does not retry or attempt a rollback; the reservation stays held. Further cauldron purchases for that avatar are blocked for the lifetime of that game server process, including after reconnect. An administrator must inspect the inventory and server logs before clearing the situation by restarting; restarting itself does not reconcile the exchange. A failure before submitting the exchange releases only its reservation. Ordinary loot, consumption and the other shops retain their existing behavior. This is conservative failure handling, not a durable atomic transaction or an assurance against concurrent writes from another server. A future Platform exchange endpoint with a durable receipt would remove that limitation.

Local playtests exercise the same recipe controller against the isolated local inventory provider. Local success does not verify the deployed Platform endpoint.
