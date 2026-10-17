# Source and local changes

Space Owls / Owls vs Invaders is by M88N Labs / m88nwalker.

Source supplied by the user:
https://m88nwalker.github.io/m88nlabs.github.io/m88n-labs-arcade/space-owls/index.html

Downloaded on 2026-10-17: `index.html`, `script.js`, and the eleven WAV files under `assets/sounds/`. The gameplay and sounds are reused here for the requested LooperLands proof of concept; this notice does not relicense upstream work or claim authorship of it. Original gameplay comments are retained.

Local adaptation adds a LooperLands avatar handshake, fixed collision dimensions, free-play labeling, local per-appearance scores, input/lifecycle fixes, a responsive canvas fit, score HUD refresh, and a formation-breach game-over condition. `bridge.js` and `integration.css` are the LL integration; the CSS uses LL's existing GraphicPixel font. No upstream owl gallery assets are needed: the current LL avatar supplies the character.

See `docs/arcade-proof-of-concept.md` at the repository root for setup and limitations.
