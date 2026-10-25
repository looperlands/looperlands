# Reusable area editor

`MapmakerRegionEditor` edits a rectangular map area in whole tiles. Scene manager is its first consumer. Other area tools can use the same component for placement and bounds without implementing pointer gestures themselves.

Load `mapcanvas.js`, `regiongeometry.js` and `regioneditor.js` in that order. The toolbox shell already loads them.

```js
const area = {x: 10, y: 20, width: 12, height: 8};
const editor = window.MapmakerRegionEditor.attach(container, mapId, {
    getRegion: () => area,
    onChange: next => Object.assign(area, next),
    onCommit: next => markDraftChanged(next),
    initialMode: 'select',
    label: 'Encounter area editor'
});
```

`getRegion()` returns `{x, y, width, height}` in tiles. `onChange()` receives the updated bounds throughout a gesture; consumers should update their model and coordinate fields without rebuilding the editor. `onCommit()` runs when a drag or keyboard adjustment finishes. Persistence belongs to the consuming tool.

**Draw box** draws a replacement rectangle by dragging in any direction. **Move / resize** moves the box by its interior and resizes through eight edge/corner handles. Bounds snap to tiles, remain inside the map, and stay at least one tile wide and high. **Pan map** or Shift-drag pans. Scrolling and zoom buttons zoom. **Focus area** frames the current rectangle. With the map canvas focused in **Draw box** or **Move / resize** mode, arrow keys move the box and Shift + arrows resize its bottom/right edges. In **Pan map** mode, arrow keys pan the viewport. Coordinate fields remain available in the consuming editor for precise keyboard entry.

The returned controller exposes `ready`, `refresh()`, `fit()`, `setMode('draw' | 'select' | 'pan')`, `mode` and `destroy()`. Call `refresh()` after changing bounds through external fields and `destroy()` before replacing or removing the editor. An optional `area()` callback provides a different initial viewport; `onLoad(map)` exposes map dimensions after loading.

`MapmakerRegionGeometry` supplies pure `draw`, `move`, `resize` and `handles` functions, tested independently of rendering. `MapmakerCanvas` supplies map artwork, zoom/pan and optional interaction hooks; existing consumers keep their normal pan-and-pick behavior.
