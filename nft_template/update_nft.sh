#!/bin/bash
if [ -z "$1" ]
  then
    echo "Missing IMG_DIR argument"
    exit 1
fi

if [ -z "$2" ]
  then
    echo "Missing NFT ID argument"
    exit 1
fi

if [ -z "$3" ]
  then
    echo "Sprite type (armor or weapon) missing"
    exit 1
fi

function missingFile() {
  echo "missing file $1. not adding NFT"
  exit 1
}

IMAGE_DIR=$1
MINUS_0X=`echo $2 | cut -c 3-`
NFT_ID=NFT_$MINUS_0X
type=$3

stat $IMAGE_DIR/1.png 1> /dev/null ||  missingFile $IMAGE_DIR/1.png
stat $IMAGE_DIR/2.png 1> /dev/null ||  missingFile $IMAGE_DIR/2.png
stat $IMAGE_DIR/3.png 1> /dev/null ||  missingFile $IMAGE_DIR/3.png

echo Updating NFT with id $NFT_ID, type $type

cp $IMAGE_DIR/1.png ../client/img/1/$NFT_ID.png
cp $IMAGE_DIR/2.png ../client/img/2/$NFT_ID.png
cp $IMAGE_DIR/3.png ../client/img/3/$NFT_ID.png