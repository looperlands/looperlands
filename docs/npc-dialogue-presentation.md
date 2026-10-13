# NPC dialogue presentation

NPC speech bubbles and choice popups reveal text at approximately 33 graphemes
per second. Commas, semicolons and colons pause for 140 ms; sentence endings pause
for 300 ms; an ellipsis pauses for 350 ms. Repeated punctuation pauses once, at the
end. Every revealed letter has a short pop. Spaces and hidden letters reserve
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
The Lantern Picnic prologue demonstrates all three combinations without
changing its story, quest IDs or choices.

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
