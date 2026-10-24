# NPC route painter

Open **NPCs → Behaviour & schedule**, select a map and load a routine. Each normal route and schedule phase includes **Paint this route**. These controls edit the same `tools/npcs/<map>.json` data as the coordinate fields; there is no separate route file.

## Draw a route

1. Choose **Append waypoint** and click walkable map tiles in travel order.
2. Choose **Select waypoint** in the waypoint list, then **Move selected waypoint** to reposition it on the map.
3. Edit each stop's wait time, activity, ambient message and sound below the map. Use **Move up** or **Remove waypoint** to change the route.
4. Use **Fit movement area to route** if the route extends outside its allowed area. This updates the outside movement area or the current schedule building area. The spawn tile remains explicit and must match the placed NPC.
5. Save the routine, build its map and start a fresh session.

The numbered points show stops; blue lines follow walkable cardinal paths. Red dashed lines identify blocked, disconnected, out-of-area or overly distant segments. Preview uses the same 2,500-node path search limit as NPC movement. Insert nearer waypoints when the search budget is exceeded. Door landing tiles are excluded from ordinary routes. Use the existing schedule building/door setup for interior travel.

The map uses the last built artwork and base collision data. It excludes moving players/mobs, dynamic layers and scripted changes. A blue path therefore confirms base geometry, not uninterrupted runtime movement. Coordinate fields and their location popovers remain available for keyboard placement.

Each waypoint has an expandable summary with its coordinates and wait time. Open a waypoint to select it on the map and edit its settings. Use **Move up** / **Move down** to reorder the route.

## Preview movement and schedules

**Preview movement** plays the route with its configured step duration and waits. Pause it to continue editing. Dialogue, player obstruction and schedule transitions may change actual travel time in the game.

When a daily schedule is enabled, **Preview game hour** reports the active phase and location. Expand that phase to paint or preview its route. Building areas and their public return doors still use the existing schedule validation. The preview slider does not change the game clock or the saved phase start times.

Continue with [NPC behaviour & schedules](mapmaker-npcs.md), [World connections](mapmaker-connections.md) and [Map inspector](mapmaker-inspector.md).
