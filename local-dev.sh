#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
RUN_DIR="$ROOT_DIR/.local-run"
MOCK_PORT=${MOCK_PORT:-3000}
GAME_PORT=${GAME_PORT:-8000}
HOST=${HOST:-localhost}
WALLET_ID=${1:-${LOCAL_WALLET:-0x1e8ab2cc09be581530bb9f3ac94353f6f7412239}}
NFT_ID=${2:-${LOCAL_NFT:-0x82cc76a59d06847148704f158b2ba51b5854c5ee3b2e9314fc36c093a919530a}}
MAP_ID=${3:-${LOCAL_MAP:-duckville}}
CHECKPOINT_ID=${4:-${LOCAL_CHECKPOINT:-1}}
XP=${5:-${LOCAL_XP:-10000}}
OPEN_BROWSER=${OPEN_BROWSER:-1}
BUILD_CLIENT=${BUILD_CLIENT:-0}
DETACH=${DETACH:-0}
LOCAL_MAPS=${LOCAL_MAPS:-all}

if [ -z "${CLIENT_STATIC_DIR:-}" ]; then
    if [ "$BUILD_CLIENT" = "1" ]; then
        CLIENT_STATIC_DIR="$ROOT_DIR/client-build"
    else
        CLIENT_STATIC_DIR="$ROOT_DIR/client"
    fi
fi

mkdir -p "$RUN_DIR"

pid_is_running() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local pid
        pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

stop_pid() {
    local pid_file=$1
    if pid_is_running "$pid_file"; then
        local pid
        pid=$(cat "$pid_file")
        echo "Stopping previous local process $pid"
        kill "$pid" 2>/dev/null || true
        for _ in 1 2 3 4 5; do
            if ! kill -0 "$pid" 2>/dev/null; then
                break
            fi
            sleep 1
        done
    fi
    rm -f "$pid_file"
}

port_is_open() {
    local port=$1
    curl --max-time 2 -fsS "http://$HOST:$port/health" >/dev/null 2>&1 || curl --max-time 2 -fsS "http://$HOST:$port/players" >/dev/null 2>&1
}

wait_for_url() {
    local name=$1
    local url=$2
    local log_file=$3

    for _ in $(seq 1 60); do
        if curl --max-time 2 -fsS "$url" >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done

    echo "$name did not become ready at $url"
    echo "Last $name log lines:"
    tail -n 80 "$log_file" || true
    exit 1
}

if [ ! -d "$ROOT_DIR/node_modules" ]; then
    echo "node_modules is missing. Run npm install once, then rerun ./local-dev.sh."
    exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
    echo "jq is required by local-session.sh. Install jq, then rerun ./local-dev.sh."
    exit 1
fi

cd "$ROOT_DIR"

stop_pid "$RUN_DIR/game.pid"
stop_pid "$RUN_DIR/mock.pid"

if port_is_open "$MOCK_PORT"; then
    echo "Port $MOCK_PORT is already serving something on $HOST."
    echo "Stop that service or rerun with MOCK_PORT=<free-port> ./local-dev.sh ..."
    exit 1
fi

if port_is_open "$GAME_PORT"; then
    echo "Port $GAME_PORT is already serving something on $HOST."
    echo "Stop that service or rerun with GAME_PORT=<free-port> ./local-dev.sh ..."
    exit 1
fi

if [ "$BUILD_CLIENT" != "0" ]; then
    echo "Building client bundle"
    (cd "$ROOT_DIR/bin" && ./build.sh)
else
    echo "Skipping client build because BUILD_CLIENT=0"
fi
echo "Serving client files from $CLIENT_STATIC_DIR"

CONFIG_PATH="$ROOT_DIR/server/config.json"
if [ "$LOCAL_MAPS" != "all" ]; then
    maps_json=$(printf "%s" "$LOCAL_MAPS" | tr "," "\n" | jq -R 'select(length > 0)' | jq -s 'reduce .[] as $map ([]; if index($map) then . else . + [$map] end)')
    CONFIG_PATH="$RUN_DIR/config.json"
    jq --argjson maps "$maps_json" '.maps = $maps' "$ROOT_DIR/server/config.json" > "$CONFIG_PATH"
    echo "Using local map set: $LOCAL_MAPS"
else
    echo "Using full map set from server/config.json"
fi

echo "Starting local platform mock on http://$HOST:$MOCK_PORT"
nohup env \
    HOST="$HOST" \
    PORT="$MOCK_PORT" \
    LOCAL_WALLET="$WALLET_ID" \
    LOCAL_NFT="$NFT_ID" \
    LOCAL_ALLOW_ALL_OWNERSHIP="${LOCAL_ALLOW_ALL_OWNERSHIP:-1}" \
    node "$ROOT_DIR/mock/server.js" >"$RUN_DIR/mock.log" 2>&1 &
mock_pid=$!
echo "$mock_pid" > "$RUN_DIR/mock.pid"
if [ "$DETACH" = "1" ]; then
    disown "$mock_pid" 2>/dev/null || true
fi
wait_for_url "mock platform" "http://$HOST:$MOCK_PORT/health" "$RUN_DIR/mock.log"

echo "Starting game server on http://$HOST:$GAME_PORT"
nohup env \
    APP_URL="http://$HOST:$GAME_PORT" \
    GAMESERVER_NAME="${GAMESERVER_NAME:-local-node}" \
    NODE_ENV="${NODE_ENV:-development}" \
    CLIENT_STATIC_DIR="$CLIENT_STATIC_DIR" \
    LOOPWORMS_API_KEY="${LOOPWORMS_API_KEY:-placeholder}" \
    LOOPWORMS_LOOPERLANDS_BASE_URL="http://$HOST:$MOCK_PORT" \
    LOOPERLANDS_BACKEND_BASE_URL="http://$HOST:$MOCK_PORT" \
    LOOPERLANDS_BACKEND_API_KEY="${LOOPERLANDS_BACKEND_API_KEY:-placeholder}" \
    LOOPERLANDS_LOCAL_MODE=1 \
    LOOPERLANDS_DISABLE_FARM_LEVEL_GATE="${LOOPERLANDS_DISABLE_FARM_LEVEL_GATE:-1}" \
    LOOPERLANDS_PLATFORM_BASE_URL="http://$HOST:$MOCK_PORT" \
    LOOPERLANDS_PLATFORM_API_KEY="${LOOPERLANDS_PLATFORM_API_KEY:-placeholder}" \
    LOOPERLANDS_PLATFORM_TIMEOUT_MS="${LOOPERLANDS_PLATFORM_TIMEOUT_MS:-2000}" \
    node "$ROOT_DIR/server/js/main.js" "$CONFIG_PATH" >"$RUN_DIR/game.log" 2>&1 &
game_pid=$!
echo "$game_pid" > "$RUN_DIR/game.pid"
if [ "$DETACH" = "1" ]; then
    disown "$game_pid" 2>/dev/null || true
fi
wait_for_url "game server" "http://$HOST:$GAME_PORT/players" "$RUN_DIR/game.log"

echo "Creating debug session"
SERVER_URL="http://$HOST:$GAME_PORT" \
PUBLIC_SERVER_URL="http://$HOST:$GAME_PORT" \
OPEN_BROWSER="$OPEN_BROWSER" \
LOOPWORMS_API_KEY="${LOOPWORMS_API_KEY:-placeholder}" \
"$ROOT_DIR/local-session.sh" "$WALLET_ID" "$NFT_ID" "$MAP_ID" "$CHECKPOINT_ID" "$XP"

echo
echo "Local services are running:"
echo "  mock platform: http://$HOST:$MOCK_PORT"
echo "  game server:   http://$HOST:$GAME_PORT"
echo "  logs:          $RUN_DIR/mock.log and $RUN_DIR/game.log"
echo "Stop them with: ./local-stop.sh"

if [ "$DETACH" != "1" ]; then
    echo
    echo "Keeping local services alive. Press Ctrl-C to stop them."
    trap '"$ROOT_DIR/local-stop.sh"; exit 0' INT TERM
    wait "$mock_pid" "$game_pid"
fi
