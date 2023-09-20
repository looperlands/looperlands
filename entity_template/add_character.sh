#!/bin/bash

function missingFile() {
  echo "missing file $1. not adding object"
  exit 1
}

if [ -z "$1" ]
  then
    echo "Missing IMG_DIR argument"
    exit 1
fi

if [ -z "$2" ]
  then
    echo "Missing new object id argument"
    echo "Object id examples: Hamster, ShopKeeper"
    exit 1
fi

if [ -z "$3" ]
  then
    echo "Missing new character type argument"
    echo "Must be mob or npc"
    exit 1
fi
IMAGE_DIR=$1
OBJECT_ID=${2^^}
type=$3

if [[ "$3" == "mob" || "$3" == "npc" ]]; then
    echo "Adding $OBJECT_ID, $type"
else
    echo "Argument but be mob or npc"
    exit 1
fi

stat $IMAGE_DIR/1.png 1> /dev/null ||  missingFile $IMAGE_DIR/1.png
stat $IMAGE_DIR/2.png 1> /dev/null ||  missingFile $IMAGE_DIR/2.png
stat $IMAGE_DIR/3.png 1> /dev/null ||  missingFile $IMAGE_DIR/3.png

grep -q "$OBJECT_ID:" ../shared/js/gametypes.js && echo "Error: Object id($OBJECT_ID) already exists in gametypes.js" && exit 1

if [ "$3" = "npc" ]; then
  jq ".id=\"${OBJECT_ID}\"" npcspritemap.json > ../client/sprites/$OBJECT_ID.json
else
  jq ".id=\"${OBJECT_ID}\"" mobspritemap.json > ../client/sprites/$OBJECT_ID.json
fi

for i in {1..3}; do
    cp $IMAGE_DIR/$i.png ../client/img/$i/$OBJECT_ID.png
done

id=`egrep -oh "\:.*([[:digit:]]+)*,.*@lastidCharacter@" ../shared/js/gametypes.js | cut -d " " -f 2 | cut -d "," -f 1`
echo id: $id
nextId=$((id+1))
echo Adding $OBJECT_ID, $nextId

# Add the objectid
newLine="        $OBJECT_ID: $nextId, // @lastidCharacter@\n        //@nextIdLineCharacter@"
sed -e "s! // @lastidCharacter@!!g" -e "s!.*@nextIdLineCharacter@.*!$newLine!g" ../shared/js/gametypes.js > tmp.js
# Add the object type
newLine="    $OBJECT_ID: [Types.Entities.$OBJECT_ID, \"$type\"],\n    // @nextCharacterLine@"
sed -e "s!.*@nextCharacterLine@.*!$newLine!g" tmp.js > tmp2.js
mv tmp2.js ../shared/js/gametypes.js
rm tmp.js

newLine="        'text!../sprites/$OBJECT_ID.json',\n        // @nextCharacterImport@"
sed -e "s#.*@nextCharacterImport@.*#$newLine#g" ../client/js/sprites.js > tmp.js
mv tmp.js ../client/js/sprites.js

newLine="                                \"$OBJECT_ID\",\n                                // @nextCharacterLine@"
sed -e "s#.*@nextCharacterLine@.*#$newLine#g" ../client/js/game.js > tmp2.js
mv tmp2.js ../client/js/game.js

if [ "$type" = "npc" ]; then
  newLine=`sed -e "s/ID/$OBJECT_ID/g" ./npc-template.js`
  sed -e "s#.*@nextNPCLine@.*#$newLine#g" ../client/js/npcs.js > tmp2.js
  mv tmp2.js ../client/js/npcs.js

  newLine="        \"$OBJECT_ID\": [\"Change me\"],\n        // @nextNPCLine@"
  sed -e "s#.*@nextNPCLine@.*#$newLine#g" ../client/js/npc.js > tmp2.js
  mv tmp2.js ../client/js/npc.js

  newLine=`sed -e "s/ID/$OBJECT_ID/g" ./npc-builder-template.js`
  sed -e "s#.*@nextNPCLine@.*#$newLine#g" ../client/js/entityfactory.js > tmp2.js
  mv tmp2.js ../client/js/entityfactory.js
else
  newLine=`sed -e "s/ID/$OBJECT_ID/g" ./mob-template.js`
  sed -e "s#.*@nextMobLine@.*#$newLine#g" ../client/js/mobs.js > tmp2.js
  mv tmp2.js ../client/js/mobs.js

  newLine=`sed -e "s/ID/$OBJECT_ID/g" ./mob-builder-template.js`
  sed -e "s#.*@nextMobLine@.*#$newLine#g" ../client/js/entityfactory.js > tmp2.js
  mv tmp2.js ../client/js/entityfactory.js
fi