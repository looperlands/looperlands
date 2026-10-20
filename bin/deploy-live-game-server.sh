#!/usr/bin/env bash
# Explicit HMR-only mode: a release requiring reboot is rejected.
set -euo pipefail
umask 077
[[ "${LIVE_UPDATE_SERVICE:-}" =~ ^[a-zA-Z0-9_-]+$ ]] || { echo 'Select LIVE_UPDATE_SERVICE for manual HMR.' >&2; exit 1; }
export DEPLOY_MODE=hmr
exec python3 "$(dirname -- "${BASH_SOURCE[0]}")/deploy-game-server.py"
