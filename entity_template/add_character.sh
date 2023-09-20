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

stat $IMAGE_DIR/1.png 1> /dev/null ||  missingFile $IMAGE_DIR/1.png
stat $IMAGE_DIR/2.png 1> /dev/null ||  missingFile $IMAGE_DIR/2.png
stat $IMAGE_DIR/3.png 1> /dev/null ||  missingFile $IMAGE_DIR/3.png


grep -q "$OBJECT_ID:" ../shared/js/gametypes.js && echo "Error: Object id($OBJECT_ID) already exists in gametypes.js" && exit 1

jq ".id=\"item-${OBJECT_ID}\"" objectspritemap.json > ../client/sprites/item-$OBJECT_ID.json

for i in {1..3}; do
    cp $IMAGE_DIR/$i.png ../client/img/$i/item-$OBJECT_ID.png
done

# id=`egrep -oh "\:.*([[:digit:]]+)*,.*@lastidObject@" ../shared/js/gametypes.js | cut -d " " -f 2 | cut -d "," -f 1`
# echo id: $id
# nextId=$((id+1))
# echo Adding $OBJECT_ID, $nextId

# # Add the objectid
# newLine="        $OBJECT_ID: $nextId, // @lastidObject@\n        //@nextIdLineObject@"
# sed -e "s! // @lastidObject@!!g" -e "s!.*@nextIdLineObject@.*!$newLine!g" ../shared/js/gametypes.js > tmp.js
# # Add the object type
# newLine="    $OBJECT_ID: [Types.Entities.$OBJECT_ID, \"$type\"],\n    // @nextObjectLine@"
# sed -e "s!.*@nextObjectLine@.*!$newLine!g" tmp.js > tmp2.js
# mv tmp2.js ../shared/js/gametypes.js
# rm tmp.js

# newLine="        'text!../sprites/item-$OBJECT_ID.json',\n        // @nextObjectImport@"
# sed -e "s#.*@nextObjectImport@.*#$newLine#g" ../client/js/sprites.js > tmp.js
# mv tmp.js ../client/js/sprites.js

# newLine="                                \"item-$OBJECT_ID\",\n                                // @nextObjectLine@"
# sed -e "s#.*@nextObjectLine@.*#$newLine#g" ../client/js/game.js > tmp2.js
# mv tmp2.js ../client/js/game.js

# newLine=`sed -e "s/ID/$OBJECT_ID/g" ./item-template.js`
# sed -e "s#.*@nextItemLine@.*#$newLine#g" ../client/js/items.js > tmp2.js
# mv tmp2.js ../client/js/items.js

# newLine=`sed -e "s/ID/$OBJECT_ID/g" ./builder-template.js`
# echo $newLine
# sed -e "s#.*@nextObjectLine@.*#$newLine#g" ../client/js/entityfactory.js > tmp2.js
# mv tmp2.js ../client/js/entityfactory.js