# World connections

Open **World connections** to inspect doors and portals across every configured map. Choose a **Starting map** or select a map in the graph. Arrows group directed connections between different maps. Same-map portals remain in the searchable entrance list.

The list can show entrances leaving the selected map, entering it or across all maps. Search by map name, entrance ID, access condition or reported problem. Enable **Only problems** to focus on broken destinations and missing return routes.

## Checks and editor links

The tool reports destinations that are unconfigured, unbuilt, outside playable bounds or blocked by a base collision. It also reports cross-map entrances with no configured route back to their source. The return route may span several maps. Separate map groups may be intentional; a missing return route is a prompt to inspect your design.

**Edit entrance** opens the exact door/portal object in **Doors & portals**. **Inspect source object** selects it in the interactive inspector, and **Inspect destination map** opens its target map. Hover or focus either coordinate for the shared 13 × 13 location preview. Change destination geometry in Tiled and build the map; edit supported access conditions and messages in the entrance editor.

## Sources and limits

Connections and conditions come from current Tiled sources. Destination bounds and collisions come from the last build. Refresh after saving changes in Tiled or another editor. Maps whose sources cannot be read appear with a source error and an editor link.

Graph reachability ignores quest/item/level/ownership requirements, triggers, opening hours, dynamic layers and scripted travel. A displayed connection does not prove that a particular player can pass it. External redirects are listed separately as external websites and do not establish map reachability. Use [Map validator](mapmaker-validator.md) and an actual playtest to verify progression.

Continue with [Doors & portals](mapmaker-doors.md), [Map inspector](mapmaker-inspector.md) and [NPC route painter](mapmaker-routes.md).

Search and direction filters appear above the entrance list. Results use pages of 12 entrances; **Previous** and **Next** keep every match reachable. Filters remain selected when choosing another map. Expand **Map connection graph** to explore the graph, or **Source coverage** to read the source limitations.
