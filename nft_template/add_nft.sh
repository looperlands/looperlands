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
    echo "Sprite type (armor, weapon, fishingrod) missing"
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

if [ "$type" = "weapon" ] || [ "$type" = "fishingrod" ]; then
  stat $IMAGE_DIR/item-1.png 1> /dev/null ||  missingFile $IMAGE_DIR/item-1.png
  stat $IMAGE_DIR/item-2.png 1> /dev/null ||  missingFile $IMAGE_DIR/item-2.png
  stat $IMAGE_DIR/item-3.png 1> /dev/null ||  missingFile $IMAGE_DIR/item-3.png
fi

echo Adding NFT with id $NFT_ID, type $type
if [ "$3" = "weapon" ] || [ "$type" = "fishingrod" ]; then
  jq ".id=\"${NFT_ID}\"" weaponspritemap.json > ../client/sprites/$NFT_ID.json
elif [ "$3" = "ranged_weapon" ]; then
  jq ".id=\"${NFT_ID}\"" rangedspritemap.json > ../client/sprites/$NFT_ID.json
else
  jq ".id=\"${NFT_ID}\"" armorspritemap.json > ../client/sprites/$NFT_ID.json
fi
jq ".id=\"item-${NFT_ID}\"" itemspritemap.json > ../client/sprites/item-$NFT_ID.json

for i in {1..3}; do
    cp $IMAGE_DIR/$i.png ../client/img/$i/$NFT_ID.png
    if [ "$3" = "weapon" ] || [ "$type" = "fishingrod" ]; then
      cp $IMAGE_DIR/item-$i.png ../client/img/$i/item-$NFT_ID.png
    elif [ "$3" = "armor" ]; then
      cp armor$i.png ../client/img/$i/item-$NFT_ID.png
    fi
done

if [ "$type" = "ranged_weapon" ]; then
  for i in {1..3}; do 
    cp $IMAGE_DIR/short-$i.png ../client/img/$i/NFT_short_$NFT_ID.png
    cp $IMAGE_DIR/medium-$i.png ../client/img/$i/NFT_medium_$NFT_ID.png
    cp $IMAGE_DIR/long-$i.png ../client/img/$i/NFT_long_$NFT_ID.png
  done
fi

./add_nft_js.sh $MINUS_0X $3

function add_projectile() {
  echo "Adding projectile"
  jq ".id=\"$1\"" projectilespritemap.json > ../client/sprites/$1.json
  ./add_nft_js.sh "$1" "projectile"
}

if [ "$type" = "ranged_weapon" ]; then
  add_projectile "short_${MINUS_0X}"
  add_projectile "medium_${MINUS_0X}"
  add_projectile "long_${MINUS_0X}"
fi

exit 0