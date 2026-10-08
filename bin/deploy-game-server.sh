#!/usr/bin/env bash
# Routine deployment after the one-time chat volume migration.
set -euo pipefail
umask 077
REBOOT_REASON_BASE64="${REBOOT_REASON_BASE64:-$(printf '%s' 'We are deploying a game update.' | base64 | tr -d '\n')}"
REBOOT_NOTICE_SECONDS="${REBOOT_NOTICE_SECONDS:-60}"
if ! [[ "$REBOOT_NOTICE_SECONDS" =~ ^[1-9][0-9]{0,2}$ ]] || (( REBOOT_NOTICE_SECONDS > 600 )); then
    echo "Reboot notice must be between 1 and 600 seconds." >&2
    exit 1
fi
state_dir="${HOME:?}/.looperlands-chat"
install -d -m 700 "$state_dir"
exec 9>"$state_dir/deploy.lock"
flock -n 9 || { echo 'Another game deployment is running' >&2; exit 1; }
docker compose version >/dev/null
systemctl is-active --quiet looperlands
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

compose_file=''
project=''
game_containers=()
for container in $(docker ps -q); do
    image=$(docker inspect --format '{{.Config.Image}}' "$container")
    case "$image" in balkshamster/looperlands|balkshamster/looperlands:*|balkshamster/looperlands@*) ;; *) continue ;; esac
    files=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}' "$container")
    owner=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$container")
    [[ -f "$files" && "$files" != *,* && -n "$owner" ]] || { echo 'Expected one production Compose file' >&2; exit 1; }
    [[ -z "$compose_file" || ( "$compose_file" == "$files" && "$project" == "$owner" ) ]] || { echo 'Multiple game Compose projects found' >&2; exit 1; }
    compose_file=$files
    project=$owner
    game_containers+=("$container")
done
[[ -n "$compose_file" ]] || { echo 'No running game Compose project found' >&2; exit 1; }
compose() { docker compose --project-directory "$(dirname "$compose_file")" -p "$project" -f "$compose_file" "$@"; }
compose config --format json > "$work/config.json"
python3 - "$work/config.json" > "$work/volumes" <<'PY'
import json, sys
try:
    with open(sys.argv[1], encoding='utf-8') as source:
        config = json.load(source)
    volumes = []
    for service in ('gameserver', 'gameserver2'):
        mounts = [m for m in config['services'][service].get('volumes', []) if m['target'] == '/opt/app/data/chat']
        if len(mounts) != 1 or mounts[0]['type'] != 'volume' or mounts[0].get('read_only'):
            raise ValueError()
        volume = config['volumes'][mounts[0]['source']]['name']
        if not volume or any(c.isspace() for c in volume):
            raise ValueError()
        volumes.append((service, volume))
    if volumes[0][1] == volumes[1][1]:
        raise ValueError()
except (KeyError, ValueError, TypeError, OSError):
    sys.exit('Production Compose must preserve separate writable chat volumes')
for service, volume in volumes:
    print(service + '\t' + volume)
PY

has_storage() {
    local container
    container=$(compose ps -q "$1")
    [[ -n "$container" && "$container" != *$'\n'* ]] || return 1
    local mounts
    mounts=$(docker inspect --format '{{json .Mounts}}' "$container") || return 1
    docker exec "$container" node -e '
        const fs = require("fs"), path = require("path");
        const filename = path.resolve(process.env.CHAT_HISTORY_FILE || "/opt/app/data/chat/history.json");
        if (filename !== "/opt/app/data/chat/history.json") process.exit(1);
        const mount = JSON.parse(process.argv[1])
            .filter(m => filename === m.Destination || filename.startsWith(m.Destination.replace(/\/$/, "") + "/"))
            .sort((a, b) => b.Destination.length - a.Destination.length)[0];
        if (!mount || mount.Type !== "volume" || mount.Name !== process.argv[2] || mount.RW !== true) process.exit(1);
        fs.accessSync(filename, fs.constants.R_OK | fs.constants.W_OK);
    ' "$mounts" "$2" >/dev/null 2>&1
}
while IFS=$'\t' read -r service volume; do
    has_storage "$service" "$volume" || { echo 'Chat storage is not persistent; refusing to replace game containers' >&2; exit 1; }
done < "$work/volumes"
compose pull
failed=0
for container in "${game_containers[@]}"; do
    echo "Sending reboot announcement to game-server container $container."
    if ! docker exec -i \
        --env "REBOOT_REASON_BASE64=$REBOOT_REASON_BASE64" \
        --env "REBOOT_NOTICE_SECONDS=$REBOOT_NOTICE_SECONDS" \
        "$container" node <<'NODE'
async function announce() {
    const apiKey = process.env.LOOPWORMS_API_KEY;
    if (!apiKey) {
        throw new Error('Game server has no LOOPWORMS_API_KEY configured.');
    }
    const appUrl = new URL(process.env.APP_URL);
    // ws.js serves HTTP internally, even when APP_URL uses HTTPS externally.
    const port = appUrl.port || (appUrl.protocol === 'https:' ? 443 : 8000);
    const seconds = Number(process.env.REBOOT_NOTICE_SECONDS);
    const reason = Buffer.from(process.env.REBOOT_REASON_BASE64, 'base64').toString('utf8');
    // The client renders announcements as HTML; keep the operator's reason plain text.
    const escapedReason = reason.replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
    const message = `The game servers will restart in ${seconds} seconds. ${escapedReason} Please reconnect after the restart.`;
    const response = await fetch(`http://127.0.0.1:${port}/announce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ message, timeToShow: seconds }),
        signal: AbortSignal.timeout(10000)
    });
    if (!response.ok || (await response.json()).success !== true) {
        throw new Error(`Announcement was not accepted (HTTP ${response.status}).`);
    }
}
announce().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
NODE
    then
        failed=1
    fi
done

if (( failed )); then
    echo "At least one game server did not accept the announcement; restart aborted." >&2
    exit 1
fi

echo "All current game servers notified. Waiting $REBOOT_NOTICE_SECONDS seconds before restarting."
sleep "$REBOOT_NOTICE_SECONDS"
sudo -n systemctl restart looperlands
while IFS=$'\t' read -r service volume; do
    ready=0
    for attempt in {1..30}; do
        if has_storage "$service" "$volume"; then ready=1; break; fi
        sleep 1
    done
    [[ "$ready" -eq 1 ]] || { echo 'Game service did not return with persistent chat storage' >&2; exit 1; }
done < "$work/volumes"
echo 'Deployment completed; both game services retain their writable chat volumes.'
