# Confirmed gameplay analytics

`client/js/growthanalytics.js` owns the game's acquisition outcomes. The website
owns login and launch events; obtaining a session ID does not prove world load.

- `ll_world_loaded`: the first successful `renderer.renderFrame()` submission, once per
  game document. Character type comes from the existing local `storage.f2p` flag.
- `ll_first_quest_completed`: the server's quest-completion callback, after world
  load and once per document. Cosmetic quest celebrations do not emit it.

Both events include schema version 1, `page: game`, the fixed `ll_source` category,
free/premium/unknown character type and bounded elapsed milliseconds. No session
ID, wallet, avatar ID, quest name, free text or provider error enters the payload.
The canonical page location is the public website root and referrer is blank.
A fixed source category is a handoff, not cross-domain identity stitching.

The public `looperlands-gtm` meta tag selects `GTM-MPCDTCVZ`. The adapter loads it
asynchronously only on HTTPS away from loopback, after the first submitted world frame. This is client readiness, not a worker paint acknowledgment.
Local sessions still expose their data layer without sending traffic to Google.
Analytics errors never block a frame or quest rewards.

## Companion release

The website companion branch is `codex/growth-content-discovery` in the Platform
frontend repository. It appends the validated source category to launch URLs.
GTM version 4 maps these outcomes to GA4 `G-XBN181V9RC`; the Looperlands.io GA4
property has both names registered as key events, once per GA4 session with no
monetary value. The live configuration is separate from deploying these branches.

Deploy the companion frontend and game, then use GTM Preview/GA4 DebugView to
verify actual receipt from world load and a real server-confirmed quest. Check
that automatic fields contain no session URL. Registration and local tests do
not prove live receipt. D1/D7 retention and purchases are outside this contract.

`growthanalytics.test.js` covers ordering, deduplication, fixed-value
sanitisation, local network suppression and failure isolation. The full
`npm run check` passed with 287 suites and 3,617 tests on this change.
