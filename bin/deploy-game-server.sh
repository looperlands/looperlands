#!/usr/bin/env bash
# One verified game service; automatic HMR or an announced reboot.
set -euo pipefail
umask 077
exec python3 "$(dirname -- "${BASH_SOURCE[0]}")/deploy-game-server.py"
