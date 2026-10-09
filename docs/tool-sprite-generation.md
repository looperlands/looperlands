# Tool sprite generation provenance

Generated with the built-in imagegen tool, transparent background enabled. Reference images: `client/img/1/axe.png` and the corresponding existing inventory icon. The original generated files remain in the session's `$CODEX_HOME/generated_images` directory; runtime assets are saved in the repository.

## Shovel prompt

Use case: stylized-concept. Asset type: production pixel-art weapon spritesheet for LooperLands. Generate a transparent spritesheet of ONLY a small steel garden shovel with a brown wooden handle, matching the tiny inventory shovel reference. Reference 1 is the existing weapon animation layout/style, reference 2 the shovel design. No character, hands, shadows, background, text or gridlines. Canvas aspect ratio 5:3, exactly FIVE equal-width columns and THREE equal-height rows, all 15 cells populated with one shovel pose, centered within each cell with generous transparent margins. Intended native frame size 48x48 pixels, shovel around 18x24 native pixels with crisp black outlines and a restrained pixel palette; enlarge pixels consistently for output. Row 1: side/right-facing swing sequence: raised diagonal, start lowering, horizontal forward, downward diagonal, down/settled. Row 2: same five-frame action facing away/up (rear view). Row 3: same five-frame action facing toward viewer/down (front view). All frame centers share the same grip anchor near native coordinate (24,25). Preserve consistent tool size and pixel scale; no motion trails or effects; no extra objects. Actual transparent alpha background.

## Watering-can prompt

Use case: stylized-concept. Asset type: production pixel-art weapon spritesheet for LooperLands. Generate a transparent spritesheet of ONLY a small BLUE metal watering can matching reference 2, with a handle and long spout. Reference 1 is the game's weapon animation style. No person, hands, shadows, background, text or gridlines. Canvas aspect ratio 5:3, exactly FIVE equal-width columns and THREE equal-height rows, all 15 cells populated with one can pose, centered within each cell with generous transparent margins. Intended native frame size 48x48 pixels, can around 18x16 native pixels with crisp dark outlines and restrained pixel palette, enlarged pixels consistently for output. Row 1: right-facing watering sequence: upright at rest, begin tipping spout right, tilted right, pouring right, upright recovery. Row 2: same five frames facing away/up, spout pointing upward in the scene. Row 3: same five frames facing toward viewer/down, spout pointing downward in the scene. Can stays attached to the same grip anchor near native (24,25), does not translate across cells. Consistent tool size and pixel scale. A few small blue pixel droplets beneath the spout only in pouring frames. Actual transparent alpha background.

## Packing

The generated artwork was reduced to fit the existing character, with transparent per-direction placement adjustments. Native sheets are 240x432 pixels, scaled to 480x864 and 720x1296 with nearest-neighbor resampling. Idle/walk rows reuse the first attack pose.

```sh
python3 tools/sprites/pack-tool-sheets.py SOURCE_SHOVEL tool-shovel 40 '[[5,2],[6,-6],[0,3]]'
python3 tools/sprites/pack-tool-sheets.py SOURCE_CAN tool-watering-can 32 '[[10,3],[8,-6],[0,5]]'
```
