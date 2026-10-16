# NPC dialogue presentation

NPC speech bubbles and choice popups reveal text at approximately 67 graphemes
per second. Commas, semicolons and colons pause for 90 ms; sentence endings pause
for 180 ms; an ellipsis pauses for 220 ms. Repeated punctuation pauses once, at the
end. Every revealed letter rises 4px, briefly grows to 118%, and settles at its
normal size over 180ms. Spaces and hidden letters reserve
their final space so wrapping and bubble position do not jump while typing.

Clicking the same NPC while its bubble is typing reveals the current line. It
does not request the next dialogue node. Bubble expiry starts after the reveal,
with 5–30 seconds of reading time based on line length. Chat messages and
interaction prompts keep their existing immediate presentation.

In choice popups, Enter, E, Space, clicking the text or **Show full text** completes
the reveal. The next action can choose a response. Choices are disabled until
the full question is visible. Arrow keys select responses, Escape closes the
conversation, and Tab stays inside the popup. All paragraphs are preserved.

## Authoring emphasis

Dialogue body text, authored paragraphs, speech bubbles and response buttons
use the existing GraphicPixel font at 16px without the HUD text outline.
Speaker names use the same pixel font at 18px. Wave and shake effects are
small and slow enough to keep emphasized words readable.

Existing HTML, paragraph breaks and links are preserved. Add these classes to
individual words or short phrases in dialogue `text`:

```html
Bring the <span class="dialogue-item">basket</span>.
Beware the <span class="dialogue-danger dialogue-shake">rats</span>.
Meet me by the <span class="dialogue-wave">lanterns</span>.
```

`dialogue-item` adds gold emphasis, `dialogue-danger` adds red emphasis,
`dialogue-shake` adds a small stepped shake, and `dialogue-wave` adds a blue wave.
Use effects selectively. Words keep their meaning when animation is disabled.
Quest dialogue across the main map, Taiko Town, Cobsfarm, Looporia, Robits,
MRMlabs, Short Destroyers and m88n uses gold for requested supplies and red for
active threats. The Bitcorn and Thornbeard conversations and the Lantern Picnic
use occasional wave or shake for expressive story moments. Response buttons
remain plain; spoken wording, quest IDs, rewards and choices are unchanged.

Popups show the NPC name and use the existing `custom_css.avatar` configuration,
or the NPC's loaded idle-down sprite as a fallback. The portrait bobs only while
letters are appearing and rests during punctuation pauses. Sprite portraits
alternate available idle frames; custom portraits can supply a second frame
through `custom_css.talking_background_position`. The continue arrow
appears when a line is complete. Existing `custom_css` positioning remains
supported; the default layout fits desktop and mobile viewports.

Reduced-motion preferences show full text immediately and remove all letter,
portrait and arrow motion. Static screen-reader text preserves link semantics
without reading each animated glyph separately. Closing or replacing dialogue
cancels its pending reveal timer.

## Local preview

Serve the repository on a loopback address and open
`/bin/dialogue-preview.html`. The preview loads the actual client modules and
styles, includes a long paragraph/link/emoji example and a speech bubble, and
counts choices locally. It does not connect to a game server or send quest choices.

For a game session with fresh quest progress, set `NPC_PREVIEW_DATA_DIR` to a
new local directory when running `bin/local-npc-preview.js`. Give parallel
sessions separate `NPC_PREVIEW_PORT` and `NPC_PREVIEW_FIXTURE_PORT` values.
The default preview directory keeps its existing progress.
