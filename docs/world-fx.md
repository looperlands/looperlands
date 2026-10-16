# Procedural world FX

Six effects are enabled by default: tile-stage particles, loot bounce, reactive fireflies, leaf wake, heat shimmer, and ambience particles. All use existing sprites or procedural drawing. Reduced Motion suppresses them. Fishing ripples, vegetation sway, clouds, rain, and water reflections are not part of this implementation.

Loot bounces only on fresh drops; loading existing items does not replay it. The bounce preserves collision and gameplay coordinates. Fireflies move away from nearby players; leaves swirl when players move through them.

## Mapmaker ambience

Add a custom **String** property named `ambience` to a scene rectangle in Tiled. Choose `forest`, `meadow`, `fireflies`, `beach`, `cave`, `campfire`, or `none`. No NPC schedule is needed. A JSON string supports multiple particle types:

```json
[{"type":"fireflies","count":8},{"type":"leaves","count":6}]
```

Available types: `fireflies`, `leaves`, `pollen`, `dust`, `gusts`, `spray`, `sand`, `embers`, `ash`, and `mist`. Use up to three types and 24 particles per procedural patch. Export the map normally. The exporter validates presets, counts, and scene FX configuration. Scene bounds clip particles, and camera movement does not reset their positions. Existing NPC ambience remains the fallback when the scene has no `ambience` property.

## Scene overrides and heat shimmer

Add a scene **String** property named `fx`, containing JSON. `enabled` supports the names `stage`, `loot`, `fireflies`, `leaves`, `heat`, and `ambience`. For example:

```json
{"enabled":{"heat":false,"leaves":false}}
```

Heat shimmer automatically follows visible lights whose existing animation is `fire`, including light-emitting tiles. An explicit `fires` list replaces automatic detection for that scene. Coordinates are absolute map pixels, with 16 pixels per tile:

```json
{
  "enabled":{"heat":true},
  "fires":[{"x":250,"y":2578,"width":28,"height":34}]
}
```

Set `fires` to `[]` to disable automatic regions. Lists allow up to 128 rectangles, with width and height between 0 and 1024 pixels, excluding zero. Only visible regions render, with a maximum of 32 per frame. Scene overrides end when the player leaves that scene.

World-wide defaults can be overridden in the NPC behaviour file's `ambience.worldFx` field:

```json
{"enabled":{"loot":false},"ambience":"forest"}
```

This example overrides the ambience preset for the world. Omit `ambience` to keep the existing per-area ambience. `worldFx.scenery` accepts the same region and toggle data as the scene `fx` property; scene configuration takes precedence.

## Tile-stage particles

A successful tile action emits particles only when the stored tile stage changes. Failed actions, loading existing tile stages, and replaying unchanged results do not emit particles. The event is transient and is not stored in the terrain snapshot. No additional animation or sound is added to the action.

In a farm's stage definition, set `stageParticles` to `false` (or `{"enabled":false}`) to opt out. Configure individual stages with presets or particle values:

```json
{
  "stageParticles": {
    "stages": {
      "prepare":"soil",
      "plant":false,
      "water":"water",
      "harvest":{
        "preset":"leaves",
        "colors":["#729b45","#d3c779"],
        "count":12,
        "speed":22,
        "gravity":28,
        "lifetimeMs":900,
        "spread":12,
        "size":2
      }
    }
  }
}
```

`stages.default` overrides unspecified stages. Without an override, prepare uses soil, plant/harvest use leaves, water uses water, and grow uses pollen. Presets are `soil`, `leaves`, `water`, `pollen`, and `sparks`.

Bounds: 0–48 particles, lifetime 100–2000 ms, speed 0–100, gravity −100–250, spread 0–40 map pixels, size 1–4, and 1–6 six-digit hex colors. Invalid visual configuration does not cancel a completed game action. The client limits simultaneous burst particles to 256 and drops to 64. Effects clear on map/session changes, disconnect, death, and stopping the game.
