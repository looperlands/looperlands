#!/usr/bin/env bash

if [ -z "$LOOPWORMS_API_KEY" ]; then
    export LOOPWORMS_API_KEY=placeholder
fi

if [ $# -ne 5 ]; then
    echo "Usage: $0 <walletId> <nftId> <mapId> <checkpointId> <xp>"
    exit 1
fi

walletId=$1
nftId=$2
mapId=$3
checkpointId=$4
xp=$5
serverUrl=${SERVER_URL:-http://localhost:8000}

payload=$(jq -n \
    --arg walletId "$walletId" \
    --arg nftId "$nftId" \
    --arg mapId "$mapId" \
    --arg checkpointId "$checkpointId" \
    --argjson xp "$xp" \
    '{
        walletId: $walletId,
        nftId: $nftId,
        title: "Local Session",
        xp: $xp,
        mapId: $mapId,
        checkpointId: $checkpointId,
        f2p: false,
        trait: "rogue"
    }')

echo "Creating session for wallet=$walletId nft=$nftId map=$mapId checkpoint=$checkpointId xp=$xp"

responseFile=$(mktemp)
httpStatus=$(curl -sS -o "$responseFile" -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-api-key: $LOOPWORMS_API_KEY" \
    -d "$payload" \
    "$serverUrl/session")
curlStatus=$?
responseBody=$(cat "$responseFile")
rm "$responseFile"

if [ $curlStatus -ne 0 ]; then
    echo "Could not reach $serverUrl/session"
    exit $curlStatus
fi

sessionId=$(printf "%s" "$responseBody" | jq -r '.sessionId // empty' 2>/dev/null)
if [ -z "$sessionId" ]; then
    error=$(printf "%s" "$responseBody" | jq -r '.error // .message // empty' 2>/dev/null)
    echo "No sessionId was generated. HTTP status: $httpStatus"
    if [ -n "$error" ]; then
        echo "Server error: $error"
    else
        echo "Raw response: $responseBody"
    fi
    exit 1
fi

baseUrl=${PUBLIC_SERVER_URL:-$serverUrl}
url=${baseUrl%/}/?sessionId=$sessionId
echo "Session ID: $sessionId"
echo Navigate to the following URL to start playing: $url
if [ "${OPEN_BROWSER:-1}" != "0" ]; then
    open "$url" || "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" "$url"
fi
