# Automatic game deployments and client updates

Production deploys update both existing game services, choosing HMR or an
announced reboot independently for each. One physical server is enough.
Deployment does not create extra instances or perform a rolling release.

## Deployment decisions

| Change | Automatic behavior |
| --- | --- |
| Compatible allowlisted server method bodies or existing mob-combat configuration | Apply HMR in the existing Node process |
| Client CSS only | Stage and activate assets; replace stylesheets after every replacement loads |
| Client JavaScript, images, maps or other client assets | Stage and activate assets; automatically reload each client through a resume ticket |
| Constructors, imports, module variables, method signatures, added/removed methods, other server files, shared protocol, dependencies or build tooling | Announce maintenance and recreate the selected game service |
| Missing/corrupt sources, stale revision, failed API request, failed staging or failed preparation | Abort; no fallback reboot |

A release with both server and client changes is classified as a whole. HMR is
available for methods in entity, character, mob, player, worldserver,
combatcontroller, combatfieldattacks and formulas. The policy is in
server/js/hotreloadpolicy.js. Existing configured server/mob-combat/<map>.json
files are validated using CombatConfig before activation. Existing attacks keep
their attack snapshot.

Constructors, World.run and socket bindings are protected. Updated methods use
their original lexical scope. Stable dispatch functions preserve references
already held by callbacks and destructured imports. Module initialization is
not rerun. An asynchronous call already underway finishes its original body;
later calls use the new one.

Structural checks cannot prove gameplay correctness or semantic compatibility.
Server HMR must continue to support clients that are already connected,
including clients waiting for combat to finish before reloading.

## Production workflow and first installation

.github/workflows/deploy.yml builds and publishes both the full Git SHA tag and
latest to the existing Docker Hub repository. Deployment always uses the
immutable SHA tag. Dockerfile.prod generates .live-release.json after building
the client and enables LIVE_UPDATES_ENABLED=1.

The SSH deployment uploads bin/deploy-game-server.sh and bin/deploy-game-server.py.
DEPLOY_MODE defaults to auto. Manual workflow runs can force hmr (reject
incompatible releases) or reboot (always announce and recreate). Reboot reasons
and the notice period remain configurable; the default notice is 60 seconds.

The workflow defaults to `gameserver gameserver2`. Set the repository variable
`GAME_SERVER_LIVE_SERVICES` to a space-separated list to override the targets.
The current NA endpoint, `https://looperlands-na.looperlands.io`, uses
`gameserver2` on host port 8001; `gameserver` uses host port 8000.

The script takes one deployment lock for the entire batch and validates every
target and its private storage before updating either server. Each service must
match exactly one running game container and have its own writable named chat
volume, including the reload-ticket spool. Missing or ambiguous targets stop the
deployment. Services update sequentially and each release is verified before
continuing. A failure stops the remaining updates; servers already verified keep
their new release. Re-running the same release safely completes remaining work.
Only services requiring a reboot receive a restart announcement. Each service
retains its own image override and player handoff data. Unselected services are
never started or recreated.

Installing this feature on each legacy process requires one announced reboot.
Legacy clients must reconnect once because they do not yet contain the update
handler. Later compatible releases retain server sockets; later reboots use the
new client handoff. An existing hook with an inaccessible API aborts deployment
instead of being mistaken for a legacy installation.

These repository changes do not deploy themselves. They become active after
the reviewed branch is merged and the production workflow succeeds.

## Client lifecycle

The server injects a release-specific base URL and revision into index.html.
Scripts, stylesheets, maps, sprites and workers resolve beneath
/_client/<revision>/. Baseline assets stay unchanged in client-build.
Changed assets are verified by SHA-256 and stored as content-addressed blobs
under .live-update/client-blobs. Old release manifests remain available to
tabs that still use them. Failed staging never activates a partial release.

Clients receive a Socket.IO notification and also poll /client-update. A
server-only release with identical client assets needs no browser reload.
CSS replacements load without being visible, then switch together. Failed
loads keep the existing styles and retry.

For other client changes, an active player waits until out of combat. The
server briefly freezes input, saves accumulated avatar/equipment XP, flushes
inventory and kill writes and issues a random, short-lived session ticket.
The page reloads automatically and reconnects with position, HP, checkpoint,
quest/inventory state, buff expiry and cooldown expiry preserved. Buffs and
cooldowns retain their original deadlines. The ticket cannot be claimed by a
second socket and is consumed durably before the resumed player can act.

Client JavaScript updates briefly reconnect the socket. They do not require
returning to character selection. An unresponsive client loses its temporary
freeze after five seconds; a stalled save loses it after ten seconds.
Tickets expire after three minutes. Dead players wait for revive before a
client-only reload.

For a reboot, the server creates durable tickets for all active human players,
blocks new player actions, and tells clients to wait for the target server
revision and loaded worlds. Tickets are stored alongside chat history in
client-reloads.json (or CLIENT_RELOAD_SPOOL_PATH within that same volume).
A failed handoff aborts recreation and cancels the freeze. The new server reads
paid-avatar game data from the backend; free-player state travels in the
ticket. A reboot resets world simulation state and briefly interrupts play.

The spool contains private session data and is written with mode 0600.
Keep it on the existing private volume; do not upload it as a CI artifact.
The bootstrap deployment checks both history and spool storage before replacing
the container. Do not share this writer volume between game services.

## Host commands

Automatic deployment after publishing the reviewed image:

~~~sh
LIVE_UPDATE_IMAGE=balkshamster/looperlands:<40-character-sha> \
LIVE_UPDATE_SERVICES='gameserver gameserver2' \
bash bin/deploy-game-server.sh
~~~

For one service, use LIVE_UPDATE_SERVICE instead of LIVE_UPDATE_SERVICES.
With neither selector, the host must have exactly one running game image.
The script takes the deployment lock, verifies storage, pulls the image and
runs only its artifact exporter with no network or game mounts. It checks the
whole manifest before choosing a method. HMR preparation precedes activation;
readback requires the expected revision and unchanged process ID.

Explicit HMR-only deployment:

~~~sh
LIVE_UPDATE_SERVICE=gameserver \
LIVE_UPDATE_IMAGE=balkshamster/looperlands:<40-character-sha> \
bash bin/deploy-live-game-server.sh
~~~

A reboot affects only the selected service using Compose up --no-deps with the
immutable image override. The installed Compose file and private backups stay
unchanged. No deployment prunes images, containers or volumes.

The managed image override is ~/.looperlands-chat/release-<service>.json.
Subsequent deployments retain it. Include it when manually recreating a service
or configuring an external systemd/Compose launcher; a separate launcher using
only the original latest image configuration does not read this desired state.
Restarting the same container retains its live source and asset changes.

## Rollback, recovery and storage

~~~sh
LIVE_UPDATE_SERVICE=gameserver LIVE_UPDATE_ACTION=rollback \
bash bin/deploy-live-game-server.sh
~~~

Rollback restores the immediately previous server/client release inside the
same process while retaining current player state. It does not undo gameplay
actions or backend writes. Clients automatically apply the restored assets.
Rollback is available for the most recent HMR update in the current process;
a process restart clears the in-memory rollback record.

Updated server files and the manifest live in the container's writable layer.
A durable recovery journal restores the previous batch if the process stops
during a file transaction. Client assets are staged and persisted before the
manifest and method dispatch commit.

The admin API /_live-update accepts only authenticated loopback requests,
using LIVE_UPDATE_KEY or the existing LOOPWORMS_API_KEY. The request helper runs
inside the container, so credentials remain there. Requests include the expected
current revision. Bundle payloads are limited to 8 MiB; asset streaming is
separate and verifies each file.

Old client blobs and manifests are retained for active tabs and rollback.
Monitor container disk use. Container recreation starts a fresh asset baseline;
do not prune the live overlay while old tabs may still request it.
Exclude .live-update and .live-release.json from Docker build context and Git.
