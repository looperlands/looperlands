#!/bin/bash

# Script to generate an optimized client build of LOOPERLANDS

BUILDDIR="../client-build"
PROJECTDIR="../client/js"
CURDIR=$(pwd)


echo "Deleting previous build directory"
rm -rf $BUILDDIR

echo "Building client with RequireJS"
cd $PROJECTDIR
node ../../bin/build-client.js || exit 1
cd $CURDIR

echo "Removing unnecessary js files from the build directory"
# Keep bundles, worker scripts, and globals loaded directly by index.html.
find $BUILDDIR/js -type f ! \( \
    -iname "game.js" -or -iname "home.js" -or -iname "log.js" -or \
    -iname "require-jquery.js" -or -iname "modernizr.js" -or \
    -iname "css3-mediaqueries.js" -or -iname "*worker.js" -or \
    -iname "detect.js" -or -iname "underscore.min.js" -or -iname "text.js" -or \
    -iname "axios.min.js" -or -iname "keyboardhandler.js" -or \
    -iname "settings.js" -or -iname "gamepad.js" -or \
    -iname "touchListener.js" -or -iname "minigame.js" -or \
    -iname "dynamicnft.js" -or -iname "pathfinder.js" -or \
    -iname "playermodifierstable.js" \) -delete

node "$CURDIR/check-client-assets.js" "$BUILDDIR" || exit 1

echo "Removing sprites directory"
rm -rf $BUILDDIR/sprites

echo "Removing config directory"
rm -rf $BUILDDIR/config

echo "Moving build.txt to current dir"
mv $BUILDDIR/build.txt $CURDIR

echo "Build complete"
