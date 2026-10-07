# Social chat

World is the shared public stream across maps. My map filters that stream by the map on which each message was sent. Scene names are descriptive locations within a map and do not change the My map filter.

Titles, avatar IDs and wallet fingerprints come from authenticated server sessions. Chat and player-population responses contain shortened wallets and opaque player IDs. Names and wallets are inline in message headers; consecutive messages from the same identity within five minutes share a header. Names with different player IDs are never grouped together.

Player locations use each map's configured scene rectangles. Server map exports now include scenes; existing exports fall back to their companion client map. Presence updates when a player enters or leaves a named scene. Unnamed areas show the map name.

Chat resolves map keys with `client/js/mapnames.js`, matching the platform's `src/maps.ts` catalogue, in roster headings, player details and the My map channel. Map keys such as `m88n` and `m88n2` both display as The Nexus, while message filtering still uses their distinct keys. Keep the two catalogues aligned when a map is renamed or added; unknown keys retain a readable fallback.

Private messages target opaque IDs and reach only their participants. Their in-memory history lasts up to 24 hours, with a maximum of 100 messages per stream. Messages are lost when the game server restarts. Public chat keeps the existing Discord bridge; private messages and gifts do not use it.

Item gifts attach to a direct message. Known inventory objects, materials, currencies, ammunition and all configured fish can be shared, unless their item definition excludes transfers. Weapons, armor, NFT assets, rentals, mobs, chests and unknown item IDs are excluded from this quantity-only transfer path. Numeric items use their game entity ID; fish use their configured fish name. An item being consumable does not determine whether it can be gifted.

The server validates the transfer policy and quantity, reserves cached inventory, flushes earlier inventory writes, and calls the platform's atomic inventory-transfer endpoint through `dao.transferItems`. A private delivery receipt is emitted only after a confirmed transfer. Resource balances also update in both players' HUDs. Retries retain the same transfer ID and payload; an uncertain result keeps the draft and reservation until confirmation. Already accepted gifts can still confirm if the item is subsequently excluded; new requests are rejected. Goods and transfer receipts are persisted by the platform independently of chat history. The existing platform endpoint supports inventory quantities without a consumable restriction; item eligibility belongs to the authenticated game server.

### Mapmaker transfer exclusions

Add `transferable: false` to the item's definition in `server/js/properties.js`:

```js
m88nskeletonkey: {
    collectable: true,
    transferable: false,
    inventoryDescription: "Skeleton Key",
    respawnDelay: 9900000
},
```

For a configured fish, add a property entry under its fish name, for example `cobguppy: {transferable: false}`. For an item with no existing property entry, create one under the exact name returned by `Types.getKindAsString`. Eligible items are transferable by default; remove the flag or set it to `true` to allow transfers. Restart the game server after changing definitions. This is an item-level rule across **all maps**, so taking an excluded item to another map does not enable gifting. Tiled placement properties do not override it. The same `Collectables.isTransferable` policy filters the gift picker and rejects forged gift packets before reserving or transferring inventory.

The initial assessment excludes 31 item types:

| Items | Reason |
| --- | --- |
| `KEY_ARACHWEAVE`, `THUDKEY`, `FOREST_KEY`, `ICEKEY1`–`ICEKEY4`, `m88nskeletonkey` | Keys and personal access progression; OA's Thudlord quest and the Nexus DreamLand quest explicitly require obtaining keys. |
| `m88nticket`, `m88ngoldenticket`, `m88ngemticket` | Yacht, Champagne Lounge and mine access tickets, required by exported Nexus map doors. |
| `m88nvipbag`, `m88ngoldbag` | Consumables that spawn the excluded boarding tickets; gifting their containers would bypass the restriction. |
| `m88ncompass`, `m88ndrsbook`, `m88ndinnerbell` | Hidden-island navigation, the jail-access quest reward, and the Chef quest item that unlocks the compass room (`server/js/quests/m88n.js`). |
| `m88nbinoculars`, `m88ntentacle` | Strong-current passage and proof of defeating Octopussy, required by exported Nexus map doors. |
| `ORB`, `SATCHEL` | OA's boss relic and lost research notes: personal quest discoveries (`server/js/quests/oa.js`). |
| `HERMITHOME`, `EVERPEAKMAP1`–`EVERPEAKMAP5` | Proof of visiting quest locations, rather than trade goods (`server/js/quests/oa.js`). |
| `PNEUMA_SIGN`, `VILLAGESIGN10` | World/location markers, conservatively excluded as non-trade objects. |
| `m88ngoldmedal`, `m88nsilvermedal`, `m88nbronzemedal` | Achievement/attendance proof; the bronze medal has a Taiko Town completion quest. |

Ordinary quest materials (hides, flowers, blueprints, harvests and similar goods) remain shareable. Receiving a gift only changes inventory; it does not dispatch a loot event, award XP or automatically complete a quest. Quests and flows may subsequently check current inventory, so mapmakers should exclude any further items whose possession must prove personal effort.

The assessment covers repository item and quest definitions and all exported client-map door requirements (`titem`). A regression check verifies that every current item-gated door requires an excluded item. On 2026-10-08, platform flow reads succeeded for 15 map keys, with nonempty flows for `main`, `bitcorn` and `shortdestroyers`; none contained additional item-possession gates. Seven other exported map keys returned 400, so separately managed or unavailable flows remain outside that confirmation.

Protocol additions: `CHAT_SEND` (54), `CHAT_SYNC` (55), `CHAT_STATE` (56), `CHAT_MESSAGE` (57), `CHAT_PLAYERS` (58), `CHAT_ERROR` (59), `CHAT_GIFT` (60), `CHAT_INVENTORY` (61), and `CHAT_INVENTORY_REQUEST` (62). The gift packet contains recipient ID, text, item, quantity and client request ID. The game server supplies both avatar IDs and creates the platform request ID.

Deploy the platform transfer endpoint and `Version20261007090000` migration first. The companion platform-frontend changes in PR #9 (`codex/chat-wallet-privacy`) support shortened population wallets in lobby availability checks and render them without full-address explorer links. Those availability checks remain display hints; the game server authenticates sessions.

Focused verification:

```sh
npx jest server/js/collectables.transfer.test.js server/js/socialchat.test.js server/js/map.scenes.test.js server/js/dao.inventoryqueue.test.js server/js/dao.killqueue.test.js server/js/chat.test.js server/js/player.chat.test.js client/js/socialchat.test.js client/js/app.test.js client/js/keyboardhandler.test.js --runInBand --coverage=false
node bin/build-client.js
```

Original social-chat release verification: all 386 tests pass with the existing coverage thresholds, the complete client/server/shared ESLint checks pass, and `bin/build.sh` produces the packaged client. The platform frontend also passes Vue type checking and its production Vite build. Production installs build dependencies for the client optimizer, then prunes them from the runtime image.

Transfer expansion verification: all 437 tests pass with the existing coverage thresholds, and the complete client/server/shared ESLint checks pass.
