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

```bash
./add_object.sh template_key_image/ key_69
```

Run this if you are not happy with the output of the above or there was an error.
```bash
git clean -f .. && git checkout ..
```
