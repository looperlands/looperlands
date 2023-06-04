#!/bin/bash

today=`date +"%s"`
export $(cat /home/looperlands/.env | xargs)

# Build #
cd looperlands
/usr/bin/git checkout .
/usr/bin/git pull
./config_manager.py configs/loopworms_config.json
/usr/bin/docker build . -t looperlands

# Deploy #

# Kill looperlands containers
/usr/bin/docker ps  | grep looperlands | cut -d " " -f 1 | xargs docker stop

# Run looperlands container
/usr/bin/docker run --name looperlands-$today -d -e LOOPWORMS_API_KEY=$LOOPWORMS_API_KEY -e LOOPWORMS_LOOPERLANDS_BASE_URL=$LOOPWORMS_LOOPERLANDS_BASE_URL \
 -e DISCORD_TOKEN=$DISCORD_TOKEN -v /etc/letsencrypt/live/loopworms.io:/certs -p 8000:8000 -t looperlands 
