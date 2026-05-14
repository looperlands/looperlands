#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
RUN_DIR="$ROOT_DIR/.local-run"

stop_pid() {
    local name=$1
    local pid_file=$2

    if [ ! -f "$pid_file" ]; then
        return
    fi

    local pid
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
        echo "Stopping $name ($pid)"
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

stop_pid "game server" "$RUN_DIR/game.pid"
stop_pid "mock platform" "$RUN_DIR/mock.pid"

echo "Local LooperLands services stopped."
