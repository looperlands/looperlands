# Fishing catch reveal

Successful catches briefly reveal a card above the game. A short anticipation and
flip lead into a sprite bounce, a local glint and a burst of pixel sparks. Rare
catches add a blue colour pulse and an expanding ring; epic catches use violet
light rays, and legendary catches build to a larger gold reveal with 60 sparks.
The whole card, specimen area and rarity label share the catch colour. Higher
tiers have a longer build-up, and the sound lands with the impact. Perfect catches
get their own heading and eight extra sparks. The reveal dismisses automatically
after 2.4–4 seconds, plus a 220ms exit when motion is enabled, and never captures
input or delays the next cast.

The card inherits the existing progression cards' raster panel frame, GraphicPixel
and AdvoCut fonts, warm text and plum surfaces. Its water-coloured specimen area
uses the real fish artwork, cropped by `CardArtwork`. Rarity affects the accent
and the water colour. There is no full-screen flash or camera shake.

Every tier has a background glow. A bounded dark falloff behind the colour keeps
it visible on bright map terrain; higher rarities increase its size and intensity.
The catch sound is normalized to approximately -1 dB peak before the game's sound
mix and saved volume controls are applied.

`FISHING_CATCH` is a server-to-client receipt emitted after the inventory award
and XP handling. It contains the fish ID, display name, rarity in the caught
water, quantity, awarded XP, perfect-catch flag, map ID and required fishing level.
It replaces fishing's use of the combat `KILL` message. Failed, expired and duplicate
attempts do not emit a receipt. A delayed receipt retains the casting map ID; the
client ignores its reveal after leaving that map, dying or disconnecting.

The reveal shows the awarded quantity and XP, caught habitat and water level.
Website-wide recorded-catch counts and first-recorded dates are not supplied by
the game reward contract and are not invented for this card.

Reduced motion, the combat-effects setting and the system reduced-motion preference
remove movement, flashes and sparks while preserving every reward detail. Sound
uses the existing `fishingsuccess` effect and game sound controls. Recasting, map
transitions, death and disconnect clear an active reveal; page exit destroys it.

## Quick visual preview

From the repository root, run:

```sh
node bin/local-fishing-reveal-preview.js
```

Open <http://127.0.0.1:8061>. Choose rarity, perfect or double catch, reduced
motion and sound, then use **Catch a fish** to replay the production component.
These receipts are examples; the preview does not award inventory or XP.
The preview uses the production `AudioManager` and its full sound-slider mix,
including the same MP3/OGG and Safari playback paths; it does not bypass that mix
with a full-volume audio element. Its **Sound** checkbox mutes that same mixer.
Set `FISHING_REVEAL_PREVIEW_PORT` to use a different loopback port.

For a real catch, start a local game using [the native guide](../RUN-NATIVE-README.md),
choose M88n2 and a level-10 or higher fishing rod, and cast beside the water.

Run `npm run check` before opening or updating the PR. Focused regression checks:

```sh
npm test -- --runInBand --coverage=false client/js/fishingcatch.test.js client/js/game.fishing.test.js server/js/fishingresult.test.js
```
