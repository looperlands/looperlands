#!/bin/bash
today=`date --iso-8601`
export $(cat /home/looperlands/.env | xargs)

# Kill looperlands containers
docker ps  | grep looperlands | cut -d " " -f 1 | xargs docker kill

# Run looperlands container
docker run -e LOOPWORMS_API_KEY=$LOOPWORMS_API_KEY -e LOOPWORMS_LOOPERLANDS_BASE_URL=$LOOPWORMS_LOOPERLANDS_BASE_URL \
 -e DISCORD_TOKEN=$DISCORD_TOKEN -v /etc/letsencrypt/live/loopworms.io:/certs -p 8000:8000 -t looperlands