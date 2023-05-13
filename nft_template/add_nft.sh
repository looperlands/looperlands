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
IMAGE_DIR=$1
MINUS_0X=`echo $2 | cut -c 3-`
NFT_ID=NFT_$MINUS_0X
type=$3
echo Adding NFT with id $NFT_ID, type $type
jq ".id=\"${NFT_ID}\"" spritemap.json > ../client/sprites/$NFT_ID.json
if [ "$3" = "weapon" ]; then
  jq ".id=\"item-${NFT_ID}\"" weaponpritemap.json > ../client/sprites/item-$NFT_ID.json
else
  jq ".id=\"item-${NFT_ID}\"" armorspritemap.json > ../client/sprites/item-$NFT_ID.json
fi

for i in {1..3}; do
    cp $IMAGE_DIR/$i.png ../client/img/$i/$NFT_ID.png
    if [ "$3" = "weapon" ]; then
      cp item-$i.png ../client/img/$i/item-$NFT_ID.png
    else
      cp armor$i.png ../client/img/$i/item-$NFT_ID.png
    fi
done
./add_nft_js.sh $MINUS_0X $3