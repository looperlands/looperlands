#!/bin/bash
if [ -z "$1" ]
  then
    echo "Missing map TMX file"
    exit 1
fi
export PROGRESS_NO_TRUNC=1
docker kill $(docker ps -q) 2> /dev/null
docker build --progress plain -f Dockerfile.map . -t mapbuild --build-arg "MAP_FILE=$1" || exit 1
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