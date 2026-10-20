# Admin game-modes playtest

This experiment is available only to connected wallets with `ROLE_ADMIN` on the platform. The game server derives the wallet from the active session and verifies the role through the authenticated platform API. An invitation does not grant access.

## Playing

Sign in normally with an admin wallet and enter the main map. Use **Activities**, the keeper near town spawn, or **Play together** on another participating admin's chat profile. Checkpoint Rush and Last Stand support solo play; Duel requires two different admin wallets on the same game server. Everyone readies before a group starts.

**Workshop** provides scripted Moss invitations, a test Crypt pass, and a read-only venue inspector. These passes simulate admission to the public main-map practice ground; they cannot unlock actual gated maps. Moss accepts co-op invitations but does not fight. There are no synthetic player logins or wallet impersonation endpoints in the production build.

## Admission contract

The platform endpoint `GET /api/game/wallet/{walletAddress}/permissions` is the source of truth. It is protected by the existing game API's authentication and requires an admin caller. Its response is `{walletAddress, serverAdmin}`; the boolean comes from the queried wallet's exact `ROLE_ADMIN` value, independently of the game API credential's role. The lookup includes the same address across chains and excludes linked wallets and holdings. The game server uses its configured platform API key, checks that the returned address matches its active session, and requires a literal `true`. Client flags, body wallet IDs, creator/map-owner roles and invitations cannot grant admission.

Deploy the companion platform endpoint before the game change. A missing endpoint denies access, so reverse deployment order cannot expose the experiment. No migration or new environment secret is required.

The client probes `GET /session/{sessionId}/game-modes/access` after entering the game. Ordinary wallets receive `enabled: false` and no controls. State and mutation routes independently require admission; hiding the UI is not the authorization boundary. Only admitted admins on the main map appear in the player picker. Each mutation refreshes the caller's role, invites refresh the recipient, and starts refresh every real member. Role checks time out after five seconds and deny on errors or malformed responses. Read leases refresh after 15 seconds and expire after 30; a revoked or expired participant cancels a running round. Reload after gaining the role to expose the controls.

## Gameplay boundaries

The keeper is rendered only for admitted admins. Practice enemies, movement packets, entity-list/WHO responses and attack markers are restricted to participants. Damage cannot cross the match boundary, including ordinary HIT messages, AoE and counters. Practice deaths bypass normal mob XP, loot, quests and event rewards, and practice attacks do not grant weapon XP. Consumables are disabled during rounds. Existing ammo checks still apply to ranged weapons; practice shots do not consume inventory. A round restores the player's original health and location when it ends or is cancelled; it does not replace equipped gear. Other normal game services remain live.

Lobby, invitations, test passes and results are in memory. A restart clears them and cancels active rounds. Live client updates cancel a running round and restore health/location before a reload ticket captures the player's state. Venues are fixed server configuration in `server/js/gamemodes.venues.json`; Tiled authoring/export, matchmaking, rewards and persistent reconnect recovery remain outside this PoC.

## Validation

Run the focused tests with `npx jest server/js/gamemodes.test.js server/js/gamemodesaccess.test.js server/js/looperlandsplatformclient.spec.js --runInBand --coverage=false`. The full Jest suite, repository lint, production client build and asset validation remain the rollout checks. Test fixtures stay in the existing local preview harness and are not production API routes.
