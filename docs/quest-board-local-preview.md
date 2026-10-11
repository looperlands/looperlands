# Local Quest Board playtest

This preview runs the real game and platform quest settlement service with isolated PostgreSQL data. It creates two fixture identities, supplies inventory, and funds a test reward pool. It does not contact production APIs. Existing fixture progress is retained on restart.

## Start

In the companion `looperlands-platform` checkout, follow `tests/QuestBoard/README.md` to prepare a disposable loopback PostgreSQL database. Start its development fixture:

```sh
QUEST_TEST_DATABASE_URL=postgresql://postgres:farming-local-only@127.0.0.1:55491/farming_test php -S 127.0.0.1:3318 tests/QuestBoard/PreviewRouter.php
```

Then in this game checkout:

```sh
node bin/build-client.js
node bin/local-quest-board-preview.js
```

Open `http://127.0.0.1:3018/preview/player/1`. Use `/preview/player/2` for an independent player whose requests have not been used by the first player. Each link creates a fresh session. The game listens on port 8018; the fixture proxy listens on loopback port 3018. Use `QUEST_PREVIEW_PORT`, `QUEST_PREVIEW_FIXTURE_PORT`, and `QUEST_PREVIEW_API_URL` to change these.

The preview adds a board near the existing town event board, and a hand-in crate southeast of it. Approach the new board and press **E** (or use its interaction button). Open the quest journal anywhere with **J**.

## Things to try

1. The board starts with one adventure, one challenge and one request. Both players receive the same starting offers; each player's completions advance their own board.
2. Select **Supplies for the road** (or another generated material request). Inspect the exact current basket, reward and boar-hide/ore icons; quantities are generated from the example JSON rules. Both characters initially have 10 hide and 10 ore; retained test sessions may have spent some stock.
3. Accept, walk to the town supply crate, press **E** and confirm the full basket. Inventory and XP reflect the displayed promise. Return to **Available** to find the replacement request, while **My quests** retains the completed one.
4. Accept the rat challenge. Its generated name shows how many *additional* rats you need; kills before acceptance do not count. Defeat that many nearby rats, open **J**, claim the reward and inspect the next challenge.
5. Accept **A breath of sea air**, visit the Beach scene and claim its reward. **Schedule** shows the starting offers of future daily windows, with different generated quantities and requests.
6. Try withdrawing/reaccepting: it does not skip forward in the sequence. The example allows six total offers per category each day. Changing `counts`, weights, generation ranges or the work budget changes future unpublished windows.
7. Try the second player: the first player's completion has no effect on their starting slots or goods.

For retry testing, `POST http://127.0.0.1:3318/__fixture/drop-next-response` with `{}` before confirming a hand-in. The fixture commits the transaction but loses that response. **Retry** must return the same completed result without consuming or rewarding twice. `GET /__fixture/state` gives database readback for attempts, receipts, inventory, XP, and funding.

## Edit map content

The first run copies `docs/examples/main.json` into the temporary preview data directory and includes the existing main-map story definitions. The console and `/preview/state` report its exact path. Edit that **main.json**, validate it with `node bin/validate-map-quests.js <path>`, then restart the game preview. The preview preserves your edited copy on subsequent starts. `QUEST_PREVIEW_DATA` chooses a different local data directory.

Occurrence snapshots are immutable after publication, including upcoming offers. Changing rewards or objectives does not rewrite an already published day. Use a new quest ID to test a new definition immediately, or wait for an unpublished occurrence. The database belongs to the platform fixture and is independent of this temporary configuration directory.

The standalone preview focuses on recurring requests, combat, and scene visits. Generic tile-action filtering, production outbox replay, legacy quest compatibility, expiry, funding and concurrency are covered by focused server/platform tests. The production farming controller uses the same generic objective mechanism. This preview does not claim a manual farming playtest or persist the legacy story fixture's mocked completion endpoints.
