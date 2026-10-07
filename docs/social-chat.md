# Social chat

World is the shared public stream across maps. My map filters that stream by the map on which each message was sent. Scene names are descriptive locations within a map and do not change the My map filter.

Titles, avatar IDs and wallet fingerprints come from authenticated server sessions. Chat and player-population responses contain shortened wallets and opaque player IDs. Names and wallets are inline in message headers; consecutive messages from the same identity within five minutes share a header. Names with different player IDs are never grouped together.

Player locations use each map's configured scene rectangles. Server map exports now include scenes; existing exports fall back to their companion client map. Presence updates when a player enters or leaves a named scene. Unnamed areas show the map name.

Chat resolves map keys with `client/js/mapnames.js`, matching the platform's `src/maps.ts` catalogue, in roster headings, player details and the My map channel. Map keys such as `m88n` and `m88n2` both display as The Nexus, while message filtering still uses their distinct keys. Keep the two catalogues aligned when a map is renamed or added; unknown keys retain a readable fallback.

Private messages target opaque IDs and reach only their participants. Their in-memory history lasts up to 24 hours, with a maximum of 100 messages per stream. Messages are lost when the game server restarts. Public chat keeps the existing Discord bridge; private messages and gifts do not use it.

Consumable gifts attach to a direct message. The server validates the item and quantity, reserves cached inventory, flushes earlier inventory writes, and calls the platform's atomic inventory-transfer endpoint. A private delivery receipt is emitted only after a confirmed transfer. Retries retain the same transfer ID and payload; an uncertain result keeps the draft and reservation until confirmation. Goods and transfer receipts are persisted by the platform independently of chat history.

Protocol additions: `CHAT_SEND` (54), `CHAT_SYNC` (55), `CHAT_STATE` (56), `CHAT_MESSAGE` (57), `CHAT_PLAYERS` (58), `CHAT_ERROR` (59), `CHAT_GIFT` (60), `CHAT_INVENTORY` (61), and `CHAT_INVENTORY_REQUEST` (62). The gift packet contains recipient ID, text, item, quantity and client request ID. The game server supplies both avatar IDs and creates the platform request ID.

Deploy the platform transfer endpoint and `Version20261007090000` migration first. The companion platform-frontend changes in PR #9 (`codex/chat-wallet-privacy`) support shortened population wallets in lobby availability checks and render them without full-address explorer links. Those availability checks remain display hints; the game server authenticates sessions.

Focused verification:

```sh
npx jest server/js/socialchat.test.js server/js/map.scenes.test.js server/js/dao.inventoryqueue.test.js server/js/dao.killqueue.test.js server/js/chat.test.js server/js/player.chat.test.js client/js/socialchat.test.js client/js/app.test.js client/js/keyboardhandler.test.js --runInBand --coverage=false
node bin/build-client.js
```

Release verification: all 386 tests pass with the existing coverage thresholds, the complete client/server/shared ESLint checks pass, and `bin/build.sh` produces the packaged client. The platform frontend also passes Vue type checking and its production Vite build. Production installs build dependencies for the client optimizer, then prunes them from the runtime image.
