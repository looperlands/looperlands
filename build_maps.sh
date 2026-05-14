#!/bin/bash
if [ -z "$1" ]
  then
    echo "Missing map TMX file"
    exit 1
fi

if [ ! -f "tools/maps/tmx/$1" ]; then
  echo "File $1 does not exist"
  exit 1
fi
if [ ! -d "node_modules/underscore" ]; then
  echo "Missing map build dependencies. Run npm install first."
  exit 1
fi
#export DOCKER_DEFAULT_PLATFORM=linux/amd64
export PROGRESS_NO_TRUNC=1
buildContext=`mktemp -d /tmp/mapbuild-context.XXXXXX`
containerId=
cleanup() {
  if [ -n "$containerId" ]; then
    docker rm -f "$containerId" > /dev/null 2>&1
  fi
  rm -rf "$buildContext"
}
trap cleanup EXIT
mkdir -p "$buildContext/tools/maps/tmx" "$buildContext/client/maps" "$buildContext/server/maps" "$buildContext/node_modules"
cp -R tools/maps/export.py tools/maps/exportmap.js tools/maps/processmap.js tools/maps/tmx2json.py "$buildContext/tools/maps/"
cp "tools/maps/tmx/$1" "$buildContext/tools/maps/tmx/"
cp -R shared "$buildContext/"
cp -R node_modules/underscore "$buildContext/node_modules/"
docker build --progress plain -f Dockerfile.map "$buildContext" -t mapbuild --build-arg "MAP_FILE=$1" || exit 1
containerId=`docker create mapbuild`
echo $containerId
docker cp $containerId:/opt/app/server/maps ./server/
docker cp $containerId:/opt/app/client/maps ./client/
