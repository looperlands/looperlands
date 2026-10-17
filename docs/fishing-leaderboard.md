# Fishing leaderboard catalog

`GET /fishing-catalog` publishes `schemaVersion: 1`, canonical `fish` entries (`id`, `target`, `name`, `sprite`), and map `collections` (`id`, `name`, membership-derived `edition`, `fish` IDs).

The catalog is built once at server startup from the Field Guide catalog and actual map fishing tiles. It excludes secret/excluded entries, invalid rarities, and fish that are only available as shop stock or rewards on that map. Shared species have one ID across collections. It doesn't expose player facts or change catch awards and activity recording.

Deploy this endpoint to registered game servers before deploying the companion platform fishing leaderboard API. The website combines existing positive fishing activities with Field Guide completion facts; discovering a bought/gifted fish is not a catch. No new game message or persistence schema is introduced.

Validation: `npx jest server/js/fishingcatalog.test.js server/js/fishingresult.test.js server/js/fieldguide.test.js server/js/fieldguidemapcatalog.test.js server/js/activitycatalog.test.js --runInBand --coverage=false`.

Fish also publish additive `rarity` and `habitats` metadata from the reachable lake definitions. `rarity` is `common`, `uncommon`, `rare`, `epic`, or `legendary`; it is `null` when waters disagree. Each habitat contains `collectionId`, `rarity`, and `minLevel` (the lowest configured fishing level for that tier on that map, or `null` if unknown). Repeated tiles do not duplicate habitats. Membership editions and ranking calculations do not depend on this display metadata. These tiers are not per-species catch probabilities.
