# Asset lookup contract fixture

Synthetic data only. Based on the Platform handlers `FindAssets`, `GetAsset`, `GetAssetByNftId`, `AssetFilter` and `Asset::jsonSerialize()` in the sibling `looperlands-platform` checkout. The search response is `{total, assets}`, verified against the live API. The caller uses `POST /api/asset/search` with `keyword`, `offset`, `limit` and an optional `assetType` array; exact UUID/NFT lookups use GET. Credentials require the `asset_read` scope.

Run `postman simulation run postman/simulations/looperlands-assets.sim.yaml --port 4900 --output ndjson`. For the local toolbox process set `LOOPERLANDS_ASSET_API_BASE_URL=http://127.0.0.1:4900/platform` and `LOOPERLANDS_ASSET_API_KEY=fixture-key`. This tests the real caller and HTTP boundary without live credentials. `upstream_error` returns a synthetic 503. Only modeled reads are available; other routes return 501. No remote mock was pulled; the local owning service's source is the contract reference.
