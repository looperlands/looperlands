# Entity Template
This directory has scripts that automation the creation of entities in the game.
An entity can be the following:
* An item like a flask, or the Loopy power up.
* A mob
* A NPC
* A player
    * Note that players in this game are NFTs so they are not handled by the scripts in this directory.

# Add an Item
Example add:
The following commands require being in the `looperlands/entity_template` directory.

```bash
./add_object.sh template_key_image/ key_example
```

### Control gifting

Inventory items are transferable by default. For keys, personal quest relics,
access tickets or achievement proof, add `transferable: false` to the item's
definition in `server/js/properties.js` (create an entry if needed):

```js
KEY_EXAMPLE: {transferable: false},
```

Use the exact item name registered in `shared/js/gametypes.js`. For fish, use
the configured fish name. The flag applies across maps and is enforced by the
game server, independently of `collectable` and `consumable`. Restart the game
server after changing it. See `docs/social-chat.md` for the current exclusions.

Run this if you are not happy with the output of the above or there was an error.
```bash
git clean -f .. && git checkout ..
```

# Add a mob or NPC
```bash
./add_character.sh npcimagedir/ npc_key_name npc
```

```bash
./add_character.sh mobimagedir/ mob_key_name mob
```


Run this if you are not happy with the output of the above or there was an error.
```bash
git clean -f .. && git checkout ..
```
