# Live asset lookup

Open **Live assets** in the Mapmaker Toolbox to search the Platform catalog and copy an asset ID, NFT ID or collection identifier. The lookup includes live API assets outside the game client's bundled artwork. It does not create a mob, NPC or item type, and it does not change live player data.

## Connect the API

The default API is `https://api.looperlands.io/api/`. Add `LOOPERLANDS_ASSET_API_KEY` to your untracked local `.env` file using a Platform key with the `asset_read` scope. Recreate the toolbox container with `docker compose -f docker-compose-local.yml up -d --force-recreate gameserver` so it receives the changed environment; a container restart alone does not reload `.env`. This ends active local game sessions. The key stays on the server and is never sent to the browser.

Set `LOOPERLANDS_ASSET_API_BASE_URL` if you need another Platform. Either its origin or a URL ending in `/api/` is accepted. Remote connections require HTTPS; localhost HTTP is supported for contract tests. Without dedicated asset API settings, a configured `LOOPERLANDS_OWNERSHIP_BASE_URL` and `LOOPERLANDS_OWNERSHIP_API_KEY` pair can be reused. A dedicated URL never borrows a key from another configuration.

The setup message remains visible until a key is configured. **Check connection settings** checks server configuration; an actual search verifies access to the API. Authentication failures show a message asking you to check the key and scope. Rate limits and temporary API failures leave the form available for retry.

## Search and copy IDs

Search by name, creator wallet/ENS, token ID, contract address or token hash. Choose All types, Avatars, Melee weapons, Ranged weapons, Fishing rods, Companions or Trackers. Leave the search blank to browse the catalog. Results are paginated in groups of 25, newest first according to the API. Previous/Next navigate the submitted search; press **Search live API** to apply edited search fields.

Paste a full Platform UUID or a full NFT ID (`0x` followed by 64 hexadecimal characters) for a direct lookup. This avoids relying on keyword searches to match an NFT ID. The selected asset type still filters direct lookup results. Results expose only the name, type, collection and IDs; holder lists, rentals and player progress are not forwarded to the browser.

- **Platform ID:** the Platform database record's UUID. Use it in Platform workflows that request an asset ID.
- **NFT ID:** the blockchain NFT identifier. Use it in an NFT door condition or a game/session field that explicitly requests an NFT ID.
- **Collection:** the exact collection identifier. Copy it into a door's collection condition without changing spaces or capitalization.

Each identifier has its own **Copy** button. If clipboard access is unavailable, the text is selected for manual copying. Copying an ID does not guarantee that its artwork is bundled for a local playtest; the session setup still validates supported game assets.

## API contract and local verification

Keyword browsing calls `POST /api/asset/search` with `offset`, `limit`, an optional nonempty `keyword` and an optional `assetType` array. The live API returns `{total, assets}`. The lookup displays 25 results per page and uses the total to detect another page. It also accepts the older array response, requesting one extra row to detect another page. Exact Platform UUIDs use `GET /api/asset/<id>`; NFT IDs use `GET /api/asset/nft/<nftId>`.

A synthetic contract fixture lives in `postman/mocks/looperlands-assets`. Run `postman simulation run postman/simulations/looperlands-assets.sim.yaml --port 4900 --output ndjson` and use the localhost settings in its README. The fixture follows the owning Platform's handlers and serializer. It proves the caller's HTTP request, response handling and pagination; a live key is still needed to verify the live catalog.
