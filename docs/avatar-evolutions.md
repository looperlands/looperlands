# Avatar evolutions and built-in attacks

Creators can configure a main form and up to 20 evolutions in the platform. Each
evolution has a unique unlock level (2–9999), a standard 160 × 288 PNG spritesheet,
and its own `canHoldWeapon` setting. The main form has the same weapon setting.
Missing settings retain the existing visible-weapon behavior.

An avatar uses its highest unlocked form. Evolution is cosmetic: NFT identity,
ownership, inventory, equipped weapon, traits, damage, attack range, projectiles,
and XP attribution do not change. A form with built-in attacks hides held
equipment while playing its standard attack frames. The inventory explains why a
weapon still needs to be selected.

The unlock celebration gives the player time to notice the change: the original
form visibly charges before the new artwork appears, followed by a slower reveal
and lingering effects. Its notification uses the same pixel panel artwork and
typography as the game's other cards. Gameplay stays responsive throughout;
reduced motion skips the animated build-up and keeps the readable notification.

## Platform contract

The platform owns validation, creator authorization, upload processing and
configuration. Evolution sprite keys are immutable; replacing an image produces
a new key while active sessions can continue using the old one.

```json
{
  "tokenHash": "base_sprite_key",
  "assetType": "looper",
  "nftId": "0xavatar",
  "options": {
    "canHoldWeapon": false,
    "evolutions": [
      {"level": 5, "canHoldWeapon": false, "sprite": "stage_one_key"},
      {"level": 20, "canHoldWeapon": true, "sprite": "stage_two_key"}
    ]
  }
}
```

The authenticated platform `POST /session` supplies this object as `avatar` and
supplies persisted avatar XP. Browser HELLO packets cannot choose a form. Map
travel copies `avatar` from the existing server session, ignoring browser input.
Legacy sessions without this metadata keep their existing appearance.

The game resolves appearance from earned avatar level, never a temporary event
equipment level. Combat/quest rewards, persisted farming awards, and reconciled
XP responses use the same level transition. A reward that crosses multiple
thresholds selects the highest one and produces one celebration.

## Game protocol

The resolved appearance contains `nftId`, `tokenHash` (the selected sprite key),
`assetType: "looper"`, `canHoldWeapon`, and `evolutionLevel` (1 for the main form).

- WELCOME index 9 carries appearance; index 8 remains release metadata or null.
- Player SPAWN index 13 carries appearance, after the existing trail field.
- `AVATAR_APPEARANCE` (70) is `[70, entityId, appearance, celebrate]`.

Runtime changes go to the player and nearby players. Initial login, reconnect,
revive and late-joining observers receive the current form without replaying its
unlock celebration. The client stores visual sprites separately from canonical
NFT identity, so different forms cannot overwrite one another's renderer slots.
It preserves the previous visible sprite while downloading a replacement.

## Automatic standing alignment

Dynamic `looper` sprites (including the legacy `armor` asset type and evolution
forms) infer one vertical correction when their image first loads in the render
worker. No platform option or image edit is required. Bundled sprites and other
asset types retain their existing placement.

The detector checks that the image dimensions match the declared animation
layout, then finds the lowest non-transparent pixel across all `idle_down`
frames. It uses the bottom edge of that pixel as the standing baseline. Walking,
attack and other poses do not determine the baseline: their feet, weapons or
effects can intentionally extend below the standing pose. One fixed correction
applies to every frame, preserving movement within the animation.

The correction in native pixels is
`min(0, 16 - offset_y - idleDownBottom)`. It only moves artwork up when it extends
below the logical tile's ground line; padded artwork is never moved down. For a
32-pixel frame with the usual `offset_y: -12`, a bottom edge at 28 or above leaves
placement unchanged, and a full-height bottom edge at 32 moves the artwork up by
four pixels. Blank standing frames, incompatible layouts or failed pixel
readback keep the existing placement.

The worker waits for the client to apply the correction before showing the
avatar. Body artwork, held equipment, labels and body effects move together;
the logical position, depth sorting, collisions and ground contact shadow stay
at the existing tile coordinates. Each form gets its own result, shared by its
display scales and hurt/outline variants. This is a conservative placement
heuristic, not a way to distinguish feet from a shadow or effect painted into
an idle frame.

## Rollout and acceptance

Deploy the platform backend, then the game, then the creator frontend. No database
migration is needed; configuration is stored in existing asset options. Creator
edits take effect when a fresh platform session loads the avatar. Existing active
sessions keep their configuration until then.

Before release, use a development creator account to upload two visibly different
forms. Verify saved configuration after reopening the editor, including main and
per-form flags. In a game session, cross an unlock threshold with normal XP and
with a persisted reward; confirm the new artwork, celebration, inventory notice,
and unchanged weapon stats/XP. Check another player already nearby, a late joiner,
map travel, revive, reconnect, reduced motion and a delayed/failed image request.
The game repository's automated gate is `npm run check`; cross-service deployment
and real CDN upload/readback are separate release checks.
