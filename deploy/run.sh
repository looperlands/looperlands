#!/bin/bash
today=`date --iso-8601`
export $(cat /home/looperlands/.env | xargs)
docker run -e LOOPWORMS_API_KEY=$LOOPWORMS_API_KEY -e LOOPWORMS_LOOPERLANDS_BASE_URL=$LOOPWORMS_LOOPERLANDS_BASE_URL \
 -e DISCORD_TOKEN=$DISCORD_TOKEN -v /etc/letsencrypt/live/loopworms.io:/certs  -t -i -p 8000:8000 -t looperlands >> /home/looperlands/logs/$today 2>&1