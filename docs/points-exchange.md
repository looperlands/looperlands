# Points Exchange

The main-map merchant beside the event board sells weapon/rod trait rerolls (250
points), chosen avatar class changes (400), two titles (250/300), three emotes
(250/250/350), and a Golden Spark Trail (350). Level and XP are preserved. A reroll excludes the existing trait.
Borrowed/rented assets cannot be permanently changed.

Fishing requires 15 successful catches and harvesting requires 20 harvests at every
avatar level. Only combat difficulty scales with the level supplied by the game server:

| Avatar level | Enemies | Successful catches | Harvests |
| --- | ---: | ---: | ---: |
| 1–9 | 50 | 15 | 20 |
| 10–24 | 75 | 15 | 20 |
| 25–49 | 100 | 15 | 20 |
| 50+ | 150 | 15 | 20 |

Combat requires enemies within two levels of the avatar. The target range is
capped at level 100: level 12 targets enemies 10–14, and avatars at level 100 or
above target enemies 98–100. The game server supplies the defeated enemy’s actual
level. Out-of-range and legacy kills without an enemy level do not count.

The first qualifying activity locks all three targets for that wallet and UTC day.
Switching avatars or leveling up cannot move those targets afterward. Before the
first activity, the UI previews the current avatar's tier. Each completed challenge awards
1 point once per wallet per day, up to 3 challenge points. Complete objectives on four days in a UTC
week for another 5 points. Days need not be consecutive. Existing active-day and
streak earnings remain available (1 point per active day, +3 on day 3, +7 every
seventh consecutive day). This is roughly 5–6 points per day averaged over
consistent play; bonus days can exceed that. The cheapest item is 250 points. Catches/harvests count actions, not item quantity.

## Ownership and rollout

The companion platform branch `codex/points-exchange` owns prices, reward sources,
asset eligibility, spending, receipts and activity credits. Apply platform migration
`Version20261103120000` before deploying its endpoints and this game branch.
Existing platform token scopes protect the endpoints.

A wallet lock serializes spending with earnings. A purchase ID persists in the
browser until a definitive response; retrying the same request returns its receipt.
The ledger debit and trait/unlock write share a database transaction. The game
server verifies an active session and proximity to the merchant. Animation only
reveals the confirmed server result. Closing the panel or reduced motion skips it.

`server/fixtures/points-store.json` mirrors platform `resources/points-store.json`
and `resources/game-rewards.json` for the offline playtest adapter. Keep these
fixtures synchronized when changing the catalog. Old local activity saves rebuild
objective counters once; accepted activity IDs prevent duplicate progress.

## Event rewards

Lantern Gathering and Festival Spark are persistent event-only emotes, absent from
the purchase catalog. The platform `RewardUnlocks` service can grant a registered
event reward using a verified `event:<id>` source. No event attendance verification
or automatic award rule is configured by this change. Future event-specific visual
styles should use that reward boundary, not a shop product.

## UI direction

Keep the original game panel (`common/panel.png`), AdvoCut/GraphicPixel fonts and
event-board navigation. Shop: three illustrated services, then compact permanent
unlock rows. Reroll: one centered equipment card, possible results, illustrated equipment/class tiles,
price and action. Earn points: explicit daily meters and four weekly completion
markers. Collection: clickable title tiles and earned emotes alongside clearly reserved event rewards.

## Avatar trails

Golden Spark Trail is a permanent wallet unlock. Purchase it, then equip it in
Collection; the No trail tile removes it. The server validates ownership and
synchronizes the selection to nearby players, including spawn/reconnect state.
The existing world particle renderer draws short, six-spark bursts only while
moving. Trail particles draw on the ground pass, beneath avatars and overhead
tile layers, and fade in 240–360 milliseconds. Spark centers remain bright at night
and cast a small warm glow into the scene's light mask. Overhead tiles block that
light, so covered sparks cannot shine through roofs. The light buffer is reused
and clears with the trail. Teleports do not create connecting lines; map changes, death, unequipping
and reduced motion clear the effect. This is a native pixel particle effect,
not a PixelFX beam or an additional runtime dependency.

## Effects

The back link stays in normal document flow so purchase notices cannot overlap it.

The purchase flow uses `reforgefx.js` for a bounded trait reel
and a short PixelFX spark burst, then resolves to the receipt's trait. It stops on close,
error, or reduced motion, and pauses visual work while a response is delayed.

Sheets come from [PixelFX](https://github.com/patch-gg/pixelfx), MIT; the license and
upstream attribution notices are beside the images. They were rendered with:

```
node tools/render.mjs pickups/collect-burst --sheet --no-actor --fps 20 --bg none --opts '{"palette":["#342434","#624235","#93654a","#b78b57","#d5ae68","#f1cd85","#ffe7af","#fff7db"]}'
```

No PixelFX font or runtime dependency is included. No beams are used. Start, reel
ticks and reveal sounds use the existing audio manager and sound-volume controls.
