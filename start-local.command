#!/bin/bash
set -u

fail() {
    printf '\n%s\n' "$1" >&2
    if [ -t 0 ]; then read -r -p 'Press Enter to close this window.'; fi
    exit 1
}

cd -- "$(dirname "$0")" || fail 'Could not open the LooperLands folder.'

# Finder does not always inherit Docker Desktop's shell PATH.
if command -v docker >/dev/null 2>&1; then
    docker_bin=$(command -v docker)
elif [ -x /Applications/Docker.app/Contents/Resources/bin/docker ]; then
    docker_bin=/Applications/Docker.app/Contents/Resources/bin/docker
elif [ -x "$HOME/.docker/bin/docker" ]; then
    docker_bin="$HOME/.docker/bin/docker"
else
    fail 'Install Docker Desktop, start it, then double-click start-local.command again.'
fi

"$docker_bin" compose version >/dev/null 2>&1 || fail 'Update Docker Desktop to a version with Docker Compose, then try again.'
"$docker_bin" info >/dev/null 2>&1 || fail 'Start Docker Desktop and wait until its engine is running, then double-click start-local.command again.'

export DOCKER_DEFAULT_PLATFORM=linux/amd64
export LOCAL_IP=127.0.0.1
printf 'Starting LooperLands. The first build can take a few minutes.\n'
"$docker_bin" compose -f docker-compose-local.yml up --build -d || fail 'The local build failed. Check the Docker output above, fix the reported error, then try again.'

printf 'Waiting for the local game launcher...\n'
for ((attempt = 0; attempt < 60; attempt++)); do
    if curl --fail --silent --connect-timeout 1 --max-time 2 --output /dev/null http://127.0.0.1:8010/local/api/catalog; then
        printf '\nLooperLands is ready: http://127.0.0.1:8010/local/\n'
        printf 'Choose your map and avatar in the browser, then click Start game.\n'
        if ! open http://127.0.0.1:8010/local/; then
            printf 'Open the address above in your browser to continue.\n'
        fi
        exit 0
    fi
    sleep 2
done

"$docker_bin" compose -f docker-compose-local.yml logs --tail=40 gameserver
fail 'The local game did not become ready. Check the logs above and that ports 8000 and 8010 are available, then try again.'
