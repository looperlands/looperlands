#!/usr/bin/env bash
# Invoked as root by the existing deployment workflow. Private files stay on the host.
set -euo pipefail
umask 077
check_only=0
if [[ "${1:-}" == --check ]]; then
    check_only=1
    shift
fi
candidate=$(realpath "${1:?Compose file required}")
release=${2:?Release ID required}
[[ "$release" =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid release ID' >&2; exit 1; }
if [[ "$check_only" -ne 1 ]]; then
    [[ $(id -u) -eq 0 ]] || { echo 'Run this deployment as root' >&2; exit 1; }
    exec 9>/run/lock/looperlands-chat-deploy.lock
    flock -n 9 || { echo 'Another game deployment is running' >&2; exit 1; }
fi
command -v python3 >/dev/null
docker compose version >/dev/null
systemctl is-active --quiet looperlands

work=$(mktemp -d)
paused=()
cleanup() {
    result=$?
    trap - EXIT
    for container in ${paused[@]+"${paused[@]}"}; do
        # Old containers may already have been replaced by the service restart.
        if [[ $(docker inspect --format '{{.State.Paused}}' "$container" 2>/dev/null || true) == true ]]; then
            docker unpause "$container" >/dev/null || true
        fi
    done
    rm -rf "$work"
    exit "$result"
}
trap cleanup EXIT

# Discover the actual host Compose file, rather than assuming the checkout path.
compose_file=''
project=''
for container in $(docker ps -q); do
    image=$(docker inspect --format '{{.Config.Image}}' "$container")
    case "$image" in balkshamster/looperlands|balkshamster/looperlands:*|balkshamster/looperlands@*) ;; *) continue ;; esac
    files=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}' "$container")
    owner=$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$container")
    [[ -f "$files" && "$files" != *,* && -n "$owner" ]] || { echo 'Expected one production Compose file' >&2; exit 1; }
    [[ -z "$compose_file" || ( "$compose_file" == "$files" && "$project" == "$owner" ) ]] || { echo 'Multiple game Compose projects found' >&2; exit 1; }
    compose_file=$files
    project=$owner
done
[[ -n "$compose_file" ]] || { echo 'No running game Compose project found' >&2; exit 1; }
compose() { docker compose --project-directory "$(dirname "$compose_file")" -p "$project" -f "$1" "${@:2}"; }
compose "$compose_file" config --format json > "$work/current.json"
compose "$candidate" config --format json > "$work/proposed.json"
python3 "$(dirname "$0")/chat-storage-plan.py" "$work/current.json" "$work/proposed.json" > "$work/plan"

if [[ "$check_only" -eq 1 ]]; then
    echo "Production Compose is compatible with the chat storage rollout. No containers or storage were changed."
    exit 0
fi

# Pull before pausing players; only the storage migration needs downtime.
compose "$candidate" pull
while IFS=$'\t' read -r service alias volume; do
    container=$(compose "$compose_file" ps -q "$service")
    [[ -n "$container" && "$container" != *$'\n'* ]] || { echo 'Expected one running container per game service' >&2; exit 1; }
    history_file=$(docker exec "$container" node -e 'console.log(require("path").resolve(process.env.CHAT_HISTORY_FILE || "/opt/app/data/chat/history.json"))')
    [[ "$history_file" == /opt/app/data/chat/history.json ]] || { echo 'Custom chat path requires a separate migration' >&2; exit 1; }
    mounts=$(docker inspect --format '{{json .Mounts}}' "$container")
    existing=$(python3 -c '
import json, sys
filename = "/opt/app/data/chat/history.json"
mounts = [m for m in json.loads(sys.argv[1]) if filename == m["Destination"] or filename.startswith(m["Destination"].rstrip("/") + "/")]
mounts.sort(key=lambda m: len(m["Destination"]), reverse=True)
if mounts:
    m = mounts[0]
    if m["Type"] != "volume" or not m["RW"] or m.get("Name") != sys.argv[2]:
        sys.exit("Existing chat mount differs; refusing to replace its data")
    print("persistent")
else:
    print("migrate")
' "$mounts" "$volume")
    docker volume create --label "com.docker.compose.project=$project" --label "com.docker.compose.volume=$alias" "$volume" >/dev/null
    driver=$(docker volume inspect --format '{{.Driver}}' "$volume")
    options=$(docker volume inspect --format '{{json .Options}}' "$volume")
    [[ "$driver" == local && ( "$options" == null || "$options" == '{}' ) ]] || { echo 'Unsupported volume driver or options' >&2; exit 1; }
    destination=$(docker volume inspect --format '{{.Mountpoint}}' "$volume")
    [[ -d "$destination" ]] || { echo 'Chat volume directory is unavailable' >&2; exit 1; }
    if [[ "$existing" == migrate && -e "$destination/history.json" ]]; then
        echo 'An unmounted chat volume already contains history; refusing to overwrite it' >&2
        exit 1
    fi
    printf '%s\t%s\t%s\t%s\t%s\n' "$service" "$container" "$volume" "$destination" "$existing" >> "$work/containers"
done < "$work/plan"

backup="/var/backups/looperlands-chat/$release-$(date -u +%Y%m%dT%H%M%S)"
install -d -m 700 "$backup"
cp -p "$compose_file" "$backup/docker-compose.yml"
chmod 600 "$backup/docker-compose.yml"
# Pause both writers before taking any snapshots. Resume originals on pre-restart failure.
while IFS=$'\t' read -r service container volume destination existing; do
    docker pause "$container" >/dev/null
    paused+=("$container")
done < "$work/containers"
while IFS=$'\t' read -r service container volume destination existing; do
    docker cp "$container:/opt/app/data/chat/history.json" "$backup/$service.json" >/dev/null
    chmod 600 "$backup/$service.json"
    # Validate privately; malformed history must never be replaced with an empty store.
    python3 - "$backup/$service.json" <<'PY'
import json, math, re, sys
try:
    with open(sys.argv[1], encoding='utf-8') as source:
        state = json.load(source)
    assert state['version'] == 1
    assert isinstance(state['identities'], dict) and isinstance(state['streams'], dict)
    assert all(isinstance(value, str) and re.fullmatch('[a-f0-9]{32}', value) for value in state['identities'].values())
    assert all(isinstance(messages, list) and all(isinstance(m.get('epoch'), (int, float)) and not isinstance(m['epoch'], bool) and math.isfinite(m['epoch']) for m in messages) for messages in state['streams'].values())
except Exception:
    sys.exit('Invalid chat history; migration aborted and original containers will resume')
PY
done < "$work/containers"
while IFS=$'\t' read -r service container volume destination existing; do
    if [[ "$existing" == migrate ]]; then
        install -m 600 "$backup/$service.json" "$destination/history.json"
        sync -f "$destination/history.json"
    fi
done < "$work/containers"
# Keep the service's existing host path so its unit uses the updated mount configuration.
install -m 644 "$candidate" "$compose_file.chat-storage-new"
mv -f "$compose_file.chat-storage-new" "$compose_file"
sync -f "$compose_file"
systemctl restart looperlands

# Require every service to return with the expected volume, not merely a successful restart command.
while IFS=$'\t' read -r service alias volume; do
    ready=0
    for attempt in {1..30}; do
        container=$(compose "$compose_file" ps -q "$service")
        if [[ -n "$container" && "$container" != *$'\n'* ]]; then
            mount=$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/opt/app/data/chat"}}{{.Type}} {{.Name}} {{.RW}}{{end}}{{end}}' "$container")
            if [[ "$mount" == "volume $volume true" ]] && docker exec "$container" node -e 'require("fs").accessSync("/opt/app/data/chat/history.json")' >/dev/null 2>&1; then
                ready=1
                break
            fi
        fi
        sleep 1
    done
    [[ "$ready" -eq 1 ]] || { echo 'Game service did not return with persistent chat storage; host backups were retained' >&2; exit 1; }
done < "$work/plan"
echo 'Deployment completed with persistent chat storage for both game services. Migration backups remain on the host.'
