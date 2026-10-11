# Quest board artwork

The board and hand-in prop were generated with the built-in Image Gen tool, using the existing event-board sprite as a visual reference. They follow the game's warm timber, parchment, red roof, gold accents, and dark plum outlines. Runtime rendering uses nearest-neighbor scaling.

Assets: `client/img/common/quest-board.png` and `client/img/common/quest-dropoff.png`. Both have transparent backgrounds. No font or external stock asset was added.

## Board prompt

Production pixel-art RPG prop: QUEST BOARD. Use the attached event-board sprite as a style reference. One freestanding front-facing top-down RPG notice board. Dark plum shadows and outlines, warm timber, red-brown tiled roof, parchment and golden highlights. Logical 64-pixel grid, no antialiasing, clear centered silhouette, little padding. Three notices with sword, fish and supply-bag pictograms, a golden seal and two legs. No lettering, characters, terrain or scenery. Real transparent alpha. A sister prop to the existing event board.

## Hand-in prop prompt

Companion generic hand-in point for the quest board: one open wooden supply crate, a tied parcel, and a small cream sign bearing a downward arrow. Match the board's pixel-art style, warm wood, dark plum outlines and gold details. Logical 32-pixel grid, centered, transparent background, no lettering or scenery. No industry-specific or farming icons; usable for any item request.

## Grid refinement

After in-game review, both assets were regenerated with the built-in tool using the original event board and chest as references. The board uses sword, bag and compass notices, muted timber/burgundy colors, a one-pixel logical outline and a 64×64 game grid. The crate uses a simple down-arrow tag and a 32×32 game grid, with no brass decoration or extra props. The worker creates nearest-neighbor bitmaps at those logical sizes before integer world scaling; the header uses 64px. This makes their pixel density consistent with the 16px map tiles.

Final board prompt: create the existing event board's quest-board sibling, preserving its roof, timber frame, posts, shading, palette and proportions; change only the three notices to sword, bag and compass pictograms. Native logical canvas 64×64, single-pixel outlines, no fine detail, glossy bevels, soft shading, ground or lettering, transparent background. If native output is unavailable, use an integer enlargement of the logical source.

Final crate prompt: a tiny hand-in crate matching the original game chest and event board, logical 32×32 canvas, modest wooden crate with a cream down-arrow tag, muted brown and burgundy outlines, one-pixel clusters. No gold glow, shiny edges, high-resolution detail, decorative frame, legs, oversized parcel, farming objects or scenery; transparent background.
