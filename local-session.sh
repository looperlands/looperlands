#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 5 ]; then
    echo "Usage: $0 <walletId> <nftId> <mapId> <checkpointId> <xp>" >&2
    exit 1
fi

for dependency in curl jq; do
    if ! command -v "$dependency" >/dev/null 2>&1; then
        echo "Install $dependency before creating a local session." >&2
        exit 1
    fi
done

if [[ ! "$5" =~ ^[0-9]+$ ]]; then
    echo "XP must be a non-negative integer." >&2
    exit 1
fi

payload=$(jq -n --arg walletId "$1" --arg nftId "$2" --arg mapId "$3" \
    --arg checkpointId "$4" --argjson xp "$5" \
    '{walletId: $walletId, nftId: $nftId, mapId: $mapId, checkpointId: $checkpointId,
      xp: $xp, title: "Title 🏛️", f2p: false, trait: "rogue"}')

IP=${LOCAL_IP:-127.0.0.1}
if ! response=$(curl --silent --show-error --connect-timeout 5 --max-time 30 \
    --write-out '\n%{http_code}' \
    --header 'Content-Type: application/json' \
    --header "x-api-key: ${LOOPWORMS_API_KEY:-placeholder}" \
    --data "$payload" "http://$IP:8000/session"); then
    echo "Could not reach the local session endpoint. Check that the server is running on port 8000." >&2
    exit 1
fi

status=${response##*$'\n'}
body=${response%$'\n'*}
if [[ ! "$status" =~ ^2[0-9][0-9]$ ]]; then
    message=$(jq -r 'if type == "object" then (.error // .message // empty) | select(type == "string") else empty end' <<< "$body" 2>/dev/null) || message=''
    printf 'Could not create a local session (HTTP %s).\n' "$status" >&2
    if [ -n "$message" ]; then printf '%s\n' "$message" >&2; fi
    exit 1
fi

if ! sessionId=$(jq -er '.sessionId | select(type == "string") | select(test("^[a-f0-9]{40}$"))' <<< "$body" 2>/dev/null); then
    echo "The server did not return a valid session ID. No browser was opened." >&2
    exit 1
fi

url="http://$IP:8000/?sessionId=$sessionId"
printf 'Navigate to the following URL to start playing: %s\n' "$url"
if command -v open >/dev/null 2>&1; then
    open "$url" || true
elif [ -x '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' ]; then
    '/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' "$url" || true
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" || true
fi
