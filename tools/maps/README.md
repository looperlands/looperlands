LOOPERLANDS map exporter
=========================

***Disclaimer: due to popular demand we are open sourcing this tool, but please be aware that it was never meant to be publicly released. Therefore the code is messy/non-optimized and the exporting process can be very slow with large map files.***


Editing the map
---------------

Install the Tiled editor: http://www.mapeditor.org/

Open the `tmx/map.tmx` file in Tiled and start editing.

**Note:** there currently is no documentation on how to edit LOOPERLANDS-specific objects/layers in Tiled. Please refer to `tmx/map.tmx` as an example if you want to create your own map.


Using the exporter
------------------

This tool is to be used from the command line after the TMX file has been saved from the Tiled editor.

Note: This tool was written with OSX in mind. If you are using a different OS (eg. Windows), additional/different steps might be required.

**Prerequisites:**

- You need python and nodejs installed.
- Install pip: http://www.pip-installer.org/en/latest/installing.html
- Install lxml: `pip install lxml` (preferably within a virtualenv)
- Optional: Install Growl + growlnotify if you are on OSX.

**Usage:**

1. `cd tools/maps/`

2. `./export.py client` or `./export.py server`

You must run both commands in order to export the client and server map files. There is no one-step export command for both map types yet.

**Warning:** depending on the `.tmx` filesize, the exporting process can take up to several minutes.


Things to know
--------------

### Gardens and farming

Keep garden behaviour in `client/tileActions/<mapId>.json`, using the map ID
without the `world_` prefix. Start by copying the complete `farm` or `potFarm`
entry from `duckville.json`. The server loads these files automatically at
startup, so restart it after changing the garden config.

The top-level keys match the tile's existing Tiled `action` value. A tile with
`action = farm` uses the `farm` entry for that map. Each entry has its own crop
list, tools, preparation tiles and Care Boosts. New crops and garden configs do
not need another controller or an entry in the test file.

Changing harvest access, seeds, crop availability, timings, yields or boost
descriptions for existing plots does **not** require updating map files. The
server reads action names and plot positions from the existing
`client/maps/world_client_<mapId>.json`; include this file alongside the garden
config when deploying the server. Adding physical plot tiles, changing their
actions or adding growth graphics still requires the usual map edits and export.
When copying a garden to another map, check that its tile IDs and growth groups
match that map's tileset.

**Harvest access:** set `harvestAccess` on the garden entry.

| Value | Who can harvest a ready crop? |
| --- | --- |
| `"protected"` (default) | The planter for the first 24 hours, then anyone. |
| `"shared"` | Anyone immediately, useful for community gardens. |
| `"owner"` | Only the planter, with no public harvest window. |

This only controls harvesting. Players can still help water and tend crops. The
player who harvests receives the harvested items and harvest XP.
Ready crops that another player cannot harvest show `Reserved for the planter`
instead of a harvest action. Protected crops also show the remaining protection
time. Owner-only crops have no countdown; shared crops are immediately available.

**Seeds:** the garden's `seedItem` is the default for all its crops. A crop can
override it with its own `seedItem`. Several crops can share a special bag, such
as moon seeds or spicy seeds, and use the same plots as normal magical seeds.
For example, add these fields to a copied crop entry:

```json
"seedItem": "SPICYSEEDS",
"seedName": "spicy seeds",
"hideUntilSeeds": true,
"seedCost": 1
```

`SPICYSEEDS` is an example item name, not a built-in item. New seeds and harvested
items still need the usual item definitions and assets. Seed drops and recipes
are configured separately. A crop's `yieldItem` determines its harvested item;
`growSeconds`, `level`, `yield`, `xp` and `seedReturnChance` control its growth
time, required level, base harvest amount, XP and chance to return one seed item.
The planting menu shows the seed requirement, such as `Uses 1 bag of spicy seeds.`
Optional `seedName` gives the seed bag a readable label. Set it on the garden for
its default seeds or on a crop for that crop's seeds. Without it, the label is
derived from the item name. A crop using another seed item does not inherit the
garden's default seed label.

`hideUntilSeeds` defaults to `false`: crops with missing seeds stay visible but
disabled. With `true`, a crop only appears while the player has at least
`seedCost` seeds. This is not a permanent unlock; already planted crops keep
growing after their seeds are spent. If all crops are hidden, the plot asks the
player to find seeds instead of opening an empty menu.

**Different areas:** use different existing garden actions with their own crop
lists, or add special crops to the home garden so players can bring seeds back
from other worlds. `action` is a tileset tile property: changing it affects every
placement of that tile. Different rules within the same map need tiles with
different action values, but each garden type can accept many seed bags.
Use `plantType` and `allowedPlantTypes` to distinguish farmland (`"crop"`,
`"tree"`) from pots (`"pot"`). Copy a potted entry when adding a pot version so
its graphics and positioning are correct.

**Care Boosts:** each entry in `careBoosts` can have an optional plain-text
`description`, displayed beneath its name. The numeric fields control the effect:
`yieldBonus` adds harvested items, `quality` adds items and 10 XP per point, and
`rareChanceBonus` adds to each configured rare drop chance (`0.1` means 10
percentage points). `maxUses` limits uses of that boost on one planted crop.
For example, a worm with `yieldBonus: 1` can have the description
`"Harvest 1 extra item."`. Boosts consume one item per use and are available
after watering, while the crop is growing.

The client map export will create two almost identical files: `world_client.js` and `world_client.json`
These are both required because, depending on the browser, the game will load the map either by using a web worker (loading `world_client.js`), or via Ajax (loading `world_client.json`).

The client map file contains data about terrain tile layers, collision cells, doors, music areas, etc.
The server map file contains data about static entity spawning points, spawning areas, collision cells, etc.

Depending on what you want to change, it's therefore not always needed to export both maps. Also, each `world_server.json` file change requires a server restart.

**How the exporting process works:**

1. The Tiled map TMX file is converted to a temporary JSON file by `tmx2json.py`.
2. This file is be processed by `processmap.js` and returned as an object. This object will have different properties depending on whether we are exporting the client or the server map.
3. The processed map object is saved as the final world map JSON file(s) in the appropriate directories.
4. The temporary file from step 1. is deleted.


**Known bugs:**
 
    * There currently needs to be an empty layer at the bottom of the Tiled layer stack or else the first terrain layer will be missing.
      (ie. if you remove the "don't remove this layer" layer from the `map.tmx` file, the 'sand' tiles will be missing on the beach.)
    

Contributing / Ideas for improvement
------------------------------------

Here are a few ideas for anyone who might want to help make this tool better:

- Remove hard-coded filenames from export.py (eg. `map.tmx`, `world_client.json`) in order to allow easier switching to different map files.

- Fix known bugs (see section above)

- Write documentation on how to use the exporter on Windows.

- Write documentation about map editing in the Tiled editor (ie. editing LOOPERLANDS-specific properties of doors, chests, spawning areas, etc.)

- Write documentation about the LOOPERLANDS map JSON format, both for client and server map types.

- Get rid of the `tmx2json.py` step which can currently take up to several minutes. Note: There is a JSON exporter built in Tiled since version 0.8.0 which could be useful. We didn't use it because our tool was written before the 0.8.0 release.

- A complete rewrite of this tool using a custom Tiled plugin would surely be a better approach than the current one. Being able to export directly from Tiled would be much easier to use. Also, the export process is currently too slow.


**Additional resources:**

- Tiled editor wiki: https://github.com/bjorn/tiled/wiki
- TMX map format documentation: https://github.com/bjorn/tiled/wiki/TMX-Map-Format
