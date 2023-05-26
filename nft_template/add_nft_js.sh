#!/bin/bash
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
randNum=$(($RANDOM % 2))
echo Adding $NFT_ID, $type, $nextId, Random number: $randNum

update_gametypes() {
    gameTypePath=$1
    echo "Game type path: $gameTypePath"
    # Add the NFT id
    newLine="        $NFT_ID: $nextId // @lastid@\n        //@nextIdLine@"
    sed -e "s! // @lastid@!,!g" -e "s!.*@nextIdLine@.*!$newLine!g" $gameTypePath > tmp.js
    # Add the NFT sprite
    newLine="    $NFT_ID: [Types.Entities.$NFT_ID, \"$type\"],\n    // @nextSpriteLine@"
    sed -e "s!.*@nextSpriteLine@.*!$newLine!g" tmp.js > tmp2.js
    if [ "$type" = "armor" ]; then    
      # Add the armor rank
      newLine="        case Types.Entities.$NFT_ID:\n            return $randNum;\n        // @nextarmorrank@"
      sed -e "s!.*@nextarmorrank@.*!$newLine!g" tmp2.js > tmp3.js
    else
      echo "todo"
    fi
    mv tmp3.js $1
    rm tmp.js
    rm tmp2.js
}

update_gametypes "../client/js/gametypes.js"
update_gametypes "../shared/js/gametypes.js"

echo Add the NFT sprite
newLine="        'text!../sprites/$NFT_ID.json',\n        // @nextSpriteImport@"
sed -e "s#.*@nextSpriteImport@.*#$newLine#g" ../client/js/sprites.js > tmp.js
mv tmp.js ../client/js/sprites.js

newLine="                                \"$NFT_ID\",\n                                // @nextSpriteLine@"
sed -e "s#.*@nextSpriteLine@.*#$newLine#g" ../client/js/game.js > tmp2.js
mv tmp2.js ../client/js/game.js