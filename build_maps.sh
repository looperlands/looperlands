#!/bin/bash
docker kill $(docker ps -q)
docker build -f Dockerfile.map . -t mapbuild || exit 1
docker run -d -e LOOPWORMS_API_KEY=$LOOPWORMS_API_KEY -e LOOPWORMS_LOOPERLANDS_BASE_URL=$LOOPWORMS_LOOPERLANDS_BASE_URL -e DISCORD_TOKEN=$DISCORD_TOKEN -t mapbuild
containerId=`docker ps | grep mapbuild | cut -d " " -f 1`
echo $containerId
docker cp $containerId:/opt/app/maps.zip .
unzip maps.zip
cp -r opt/app/server .
cp -r opt/app/client .
rm maps.zip
rm -rf opt
docker kill $containerId