#!/bin/bash
export DOCKER_DEFAULT_PLATFORM=linux/amd64
IP=${LOCAL_IP:-127.0.0.1}
export APP_URL="http://$IP:8000"
export GAMESERVER_NAME="local-test"
docker-compose -f docker-compose-local.yml up --build
