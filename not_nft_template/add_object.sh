#!/bin/bash
if [ -z "$1" ]
  then
    echo "Missing IMG_DIR argument"
    exit 1
fi

if [ -z "$2" ]
  then
    echo "Missing new object id argument"
    echo "Object id examples: superpotion,key_55 where 55 is the id of the key stored in the DB and checked against a door"
    exit 1
fi
IMAGE_DIR=$1
OBJECT_ID=$2

jq ".id=\"${OBJECT_ID}\"" objectspritemap.json > ../client/sprites/$OBJECT_ID.json

for i in {1..3}; do
    cp $IMAGE_DIR/$i.png ../client/img/$i/$OBJECT_ID.png
done