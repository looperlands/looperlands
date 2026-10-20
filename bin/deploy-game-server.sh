#!/usr/bin/env bash
# Verified game services; independent automatic HMR or announced reboots.
set -euo pipefail
umask 077
exec python3 "$(dirname -- "${BASH_SOURCE[0]}")/deploy-game-server.py"
