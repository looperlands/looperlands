#!/bin/bash
IP=${LOCAL_IP:-localhost}
export APP_URL="http://$IP:8000"
export GAMESERVER_NAME="local-test"
docker-compose -f docker-compose-local.yml up --build
