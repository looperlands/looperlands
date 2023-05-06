#!/bin/bash
echo $1
NFT_ID=NFT_$1
type=$2

if [ -z "$1" ]
  then
    echo "NFT ID minus the 0x missing"
    exit 1
fi

if [ -z "$2" ]
  then
    echo "Sprite type (armor or weapon) missing"
    exit 1
fi

id=`egrep -oh "\:.*([[:digit:]]+)*@lastid@" ../client/js/gametypes.js | cut -d " " -f 2`
echo id: $id
nextId=$((id+1))
echo Adding $NFT_ID, $type, $nextId

update_gametypes() {
    gameTypePath=$1
    echo "Game type path: $gameTypePath"
    # Add the NFT id
    newLine="        $NFT_ID: $nextId // @lastid@\n        //@nextIdLine@"
    sed -e "s! // @lastid@!,!g" -e "s!.*@nextIdLine@.*!$newLine!g" $gameTypePath > tmp.js
    # Add the NFT sprite
    newLine="    $NFT_ID: [Types.Entities.$NFT_ID, \"$type\"],\n    // @nextSpriteLine@"
    sed -e "s!.*@nextSpriteLine@.*!$newLine!g" tmp.js > tmp2.js
    mv tmp2.js $1
    rm tmp.js
}

update_gametypes "../client/js/gametypes.js"
update_gametypes "../shared/js/gametypes.js"

echo Add the NFT sprite
newLine="        'text!../sprites/$NFT_ID.json',\n        // @nextSpriteImport@"
sed -e "s#.*@nextSpriteImport@.*#$newLine#g" ../client/js/sprites.js > tmp.js
mv tmp.js ../client/js/sprites.js