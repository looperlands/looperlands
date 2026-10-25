# Checkpoints & gameplay zones

Open **Gameplay → Checkpoints & zones** in the Mapmaker Toolbox. Choose a configured map. The canvas uses its latest built artwork and collisions; build first after changing terrain in Tiled.

## Place and edit

1. Choose **New area**: Checkpoint, Trigger area, PvP area, Music area or Event-board area.
2. Click **Draw area**, then drag a box on the map. Drag the box to move it, or its edges and corners to resize it. Shift-drag pans; scroll zooms. Arrow keys move; Shift and arrows resize.
3. Select another box on the map or an entry in **Map checkpoints & zones**. Filter by type or search by name, ID or coordinates. Numeric tile coordinates also work on touchscreens.
4. Set the area's behavior. **Duplicate area** creates a new draft with the same settings; move it before saving if its type cannot overlap. **Remove area from draft** takes effect only when the draft is saved and built.
5. **Save all changes** saves additions, edits and removals together. Then **Build this map**, wait for completion, and start a fresh playtest.

Reload and map changes ask before discarding unsaved edits. If Tiled or another tab changes the source, the save is rejected and the draft remains available. Reload and reapply the edit. The Toolbox retains unknown object properties, comments and unrelated layers. Edit rotated shapes, layer offsets or unsupported shapes in Tiled.

New and edited areas use whole tiles inside playable bounds, after the first row and column. Each area must contain walkable ground. Checkpoint, trigger and music areas of the same type cannot overlap when saved through this editor: their runtimes choose the first matching area. Existing overlaps can retain their geometry while behavior is edited. PvP and event-board areas may overlap; different types may share ground.

## Checkpoints and starting areas

A checkpoint saves a player's respawn point when entered. **Starting area for new arrivals** also makes it available as a random initial spawn area. Multiple starting areas are chosen randomly. When none is marked, the game's first remaining checkpoint is the fallback.

Keep checkpoint boxes entirely on walkable tiles: the game chooses a spawn tile from the box. The runtime also skips blocked tiles in legacy checkpoints. Removing the last checkpoint is rejected so the map retains a spawn and revival destination.

**Checkpoint ID** is the runtime ID saved in player progress and used by the session launcher. It differs from the Tiled object ID. Existing IDs cannot be edited. The first save pins positional legacy IDs into `checkpointId` properties before any removal can renumber them. New checkpoints receive unique IDs; the Tiled object counter reserves those IDs even if the checkpoint is later removed. IDs are not reused by subsequent Toolbox saves.

Deleting a checkpoint cannot migrate players to a particular replacement. A player returning with a removed ID uses the map's starting/fallback spawn. Keep checkpoints used by established routes where possible. Rebuild and test arrival, checkpoint entry, death/revival and a new session separately.

## Trigger areas

- **Trigger ID** links to door conditions, **Triggers & events**, and scripted sequences. The named trigger becomes active while the area is occupied.
- **Deactivate after area is empty** is entered in seconds; Tiled stores milliseconds. It delays deactivation after the last occupant leaves.
- **Player entry message** takes precedence for the local player. **General entry message** is the fallback message shown by the existing client behavior.
- **Minigame prompt** selects a bundled minigame, or None. Prompt offsets move it by whole tiles. This configures a prompt; the game still applies the minigame's own rules.

Trigger zones emit the existing area-entry/exit events. Use the matching trigger ID when configuring event rules or cutscenes. Triggers and messages do not add a quest automatically.

## PvP, music and event-board areas

**PvP areas** let the normal client select another player for combat when both players stand inside a PvP area. These areas do not protect players from mobs or create a safe zone. PvP follows the game's existing combat rules.

**Music areas** select a registered track that has bundled audio. **Preview music** and **Stop preview** play it in the Toolbox. The game uses its existing positional music behavior. Scene atmosphere can also choose music; test both together when they share an area.

**Event-board areas** allow town-event browsing while inside the box or one tile from it. They define proximity access, not the board artwork or event list. Place the board art in Tiled; events come from the configured event service. Live events may have separate access behavior.

## Validation and production

**Validate map** checks checkpoint IDs, walkable spawn tiles, supported zone settings and same-type overlap. Findings and inspector objects link to the exact object in this editor. Geometry checks use the last built server collisions.

The tool writes the existing top-level Tiled object layers:

| Area | Tiled layer | Owned properties |
| --- | --- | --- |
| Checkpoint | `checkpoints` | `checkpointId`, `starting` |
| Trigger | `triggers` | `trigger`, `delay`, `player_message`, `message`, `minigame`, `offset` |
| PvP | `pvpzones` | Rectangle only |
| Music | `music` | `music` |
| Event board | `eventBoards` | Rectangle only |

Geometry is stored in pixels and displayed in tiles. Legacy checkpoint type/class starting markers and positional IDs remain compatible. Music areas with a legacy first property, including numeric music indices, remain supported; edited areas store a named `music` property.

The normal exporter includes the zones in both server and client maps. Production validates checkpoint ID uniqueness before building. Commit the TMX with its generated server JSON and client JSON/JS maps, then deploy through the normal process. Saving or committing locally does not deploy.
