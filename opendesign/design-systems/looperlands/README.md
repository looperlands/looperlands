# Looperlands game foundations

Imported from the current checkout on 2026-10-07 for the social-chat design preview. These foundations describe the existing game; prototype additions are provisional.

Sources inspected:
- client/css/main.css: font declarations, shop panels, resource panels, hover states, pixel borders, transitions and scrollbar colors.
- client/index.html: current chat composer, send action, keyboard help and toolbar.
- client/js/app.js: chat open/close, shared history and message composition.
- client/js/main.js: player name and wallet-prefix fallback.
- server/js/player.js and server/js/chat.js: current player naming and shared message history.
- client/sprites/{clotharmor,leatherarmor,king}.json: sprite frame dimensions and offsets.
- client/img/1/tilesheet_main.png and client/maps/world_client_main.json: actual town artwork used in the preview.

Index: tokens/colors_and_type.css, fonts/, assets/, brand/voice-and-tone.md, brand/style-notes.md, ui-kit-game/index.html.

The prototype introduces presence green, a brighter reading surface, profiles and DMs. Those are design proposals. Persistence, identity resolution, private delivery, unread counts and online presence still need production implementation.
