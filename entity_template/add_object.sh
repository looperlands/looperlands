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
OBJECT_ID=${2^^}
type=object

grep -q "$OBJECT_ID:" ../shared/js/gametypes.js && echo "Error: Object id($OBJECT_ID) already exists in gametypes.js" && exit 1

jq ".id=\"${OBJECT_ID}\"" objectspritemap.json > ../client/sprites/item-$OBJECT_ID.json

for i in {1..3}; do
    cp $IMAGE_DIR/$i.png ../client/img/$i/item-$OBJECT_ID.png
done

id=`egrep -oh "\:.*([[:digit:]]+)*,.*@lastidObject@" ../shared/js/gametypes.js | cut -d " " -f 2 | cut -d "," -f 1`
echo id: $id
nextId=$((id+1))
echo Adding $OBJECT_ID, $nextId

# Add the objectid
newLine="        $OBJECT_ID: $nextId, // @lastidObject@\n        //@nextIdLineObject@"
sed -e "s! // @lastidObject@!!g" -e "s!.*@nextIdLineObject@.*!$newLine!g" ../shared/js/gametypes.js > tmp.js
# Add the object type
newLine="    $OBJECT_ID: [Types.Entities.$OBJECT_ID, \"$type\"],\n    // @nextObjectLine@"
sed -e "s!.*@nextObjectLine@.*!$newLine!g" tmp.js > tmp2.js
mv tmp2.js ../shared/js/gametypes.js
rm tmp.js

newLine="        'text!../sprites/item-$OBJECT_ID.json',\n        // @nextObjectImport@"
sed -e "s#.*@nextObjectImport@.*#$newLine#g" ../client/js/sprites.js > tmp.js
mv tmp.js ../client/js/sprites.js

newLine="                                \"$OBJECT_ID\",\n                                // @nextObjectLine@"
sed -e "s#.*@nextObjectLine@.*#$newLine#g" ../client/js/game.js > tmp2.js
mv tmp2.js ../client/js/game.js

newLine=`sed -e "s/ID/$OBJECT_ID/g" ./item-template.js` 
echo $newLine
sed -e "s#.*@nextItemLine@.*#$newLine#g" ../client/js/items.js > tmp2.js
mv tmp2.js ../client/js/items.js
